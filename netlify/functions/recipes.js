const fetch = require('node-fetch');

// Function to clean ingredients string
function cleanIngredientsString(ingredients) {
    try {
        const decodedIngredients = decodeURIComponent(ingredients);
        return decodedIngredients
            .split(',')
            .map(item => item.trim())
            .filter(item => item.length > 0)
            .join(',');
    } catch (error) {
        console.error('Error cleaning ingredients:', error);
        return null;
    }
}

// Function to fetch recipes from Spoonacular API
async function fetchRecipes(ingredients, dietaryRestrictions) {
    const API_KEY = process.env.SPOONACULAR_API_KEY;
    if (!API_KEY) {
        throw new Error('API key not found');
    }

    // First API call - search recipes
    const baseUrl = 'https://api.spoonacular.com/recipes/findByIngredients';
    const queryParams = new URLSearchParams({
        apiKey: API_KEY,
        ingredients: ingredients,
        number: '12'
    });

    const apiUrl = `${baseUrl}?${queryParams.toString()}`;
    const response = await fetch(apiUrl);
    const responseText = await response.text();

    if (!response.ok) {
        let errorMessage = 'Failed to fetch recipes';
        try {
            const errorData = JSON.parse(responseText);
            errorMessage = errorData.message || errorMessage;
        } catch (e) {
            console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
    }

    const recipes = JSON.parse(responseText);

    if (!recipes.length) {
        return {
            recipes: [],
            message: 'No recipes found with these ingredients.'
        };
    }

    // Second API call - get detailed information
    try {
        const detailedRecipes = await Promise.all(
            recipes.map(async (recipe) => {
                const detailUrl = new URL('https://api.spoonacular.com/recipes/' + recipe.id + '/information');
                detailUrl.searchParams.set('apiKey', API_KEY);
                
                const detailResponse = await fetch(detailUrl.toString());
                if (!detailResponse.ok) {
                    throw new Error(`Failed to fetch details for recipe ${recipe.id}`);
                }
                return detailResponse.json();
            })
        );

        // Filter recipes based on dietary restrictions
        const filteredRecipes = detailedRecipes.filter(recipe => {
            if (dietaryRestrictions.vegetarian && !recipe.vegetarian) return false;
            if (dietaryRestrictions.vegan && !recipe.vegan) return false;
            if (dietaryRestrictions.glutenFree && !recipe.glutenFree) return false;
            if (dietaryRestrictions.dairyFree && !recipe.dairyFree) return false;
            return true;
        });

        return {
            recipes: filteredRecipes,
            message: filteredRecipes.length ? null : 'No recipes match your dietary restrictions.'
        };

    } catch (detailError) {
        console.error('Error fetching recipe details:', detailError);
        throw new Error('Unable to fetch complete recipe information');
    }
}

// Main handler function
exports.handler = async function(event, context) {
    // Only allow GET requests
    if (event.httpMethod !== 'GET') {
        return { 
            statusCode: 405, 
            body: JSON.stringify({ 
                error: 'Method Not Allowed',
                userMessage: 'Only GET requests are allowed.'
            })
        };
    }

    try {
        // Get query parameters
        const ingredients = event.queryStringParameters.ingredients;
        const dietaryRestrictions = JSON.parse(event.queryStringParameters.dietaryRestrictions || '{}');

        // Validate ingredients
        if (!ingredients) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Missing ingredients parameter',
                    userMessage: 'Please provide ingredients to search for recipes.'
                })
            };
        }

        const cleanedIngredients = cleanIngredientsString(ingredients);
        if (!cleanedIngredients) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    error: 'Invalid ingredients format',
                    userMessage: 'Please provide valid ingredients separated by commas.'
                })
            };
        }

        // Fetch recipes
        const result = await fetchRecipes(cleanedIngredients, dietaryRestrictions);

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify(result)
        };

    } catch (error) {
        console.error('Server error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: error.message || 'Internal server error',
                userMessage: 'An error occurred while fetching recipes. Please try again later.'
            })
        };
    }
}; 