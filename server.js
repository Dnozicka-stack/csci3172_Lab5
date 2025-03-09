const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for error handling
app.use(express.static('public'));

// Validate API key middleware
const validateApiKey = (req, res, next) => {
    if (!process.env.SPOONACULAR_API_KEY) {
        return res.status(500).json({
            error: 'Server configuration error: API key not found',
            userMessage: 'The server is not properly configured. Please contact the administrator.'
        });
    }
    next();
};

// Function to clean ingredients string
function cleanIngredientsString(ingredients) {
    return ingredients
        .replace(/\+/g, ',')  
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .join(',');
}

// API Route
app.get('/api/recipes', validateApiKey, async (req, res) => {
    try {
        // Validate input parameters
        const ingredients = req.query.ingredients;
        if (!ingredients) {
            return res.status(400).json({
                error: 'Missing ingredients parameter',
                userMessage: 'Please provide ingredients to search for recipes.'
            });
        }

        const cleanedIngredients = cleanIngredientsString(ingredients);
        const dietaryRestrictions = JSON.parse(req.query.dietaryRestrictions || '{}');
        const API_KEY = process.env.SPOONACULAR_API_KEY;
        
        // First API call - search recipes
        const response = await fetch(
            `https://api.spoonacular.com/recipes/findByIngredients?apiKey=${API_KEY}&ingredients=${cleanedIngredients}&number=12`
        );

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Spoonacular API Error:', errorData);
            throw new Error('Failed to fetch recipes');
        }

        const recipes = await response.json();

        if (!recipes.length) {
            return res.json({ 
                recipes: [],
                message: 'No recipes found with these ingredients.'
            });
        }

        // Second API call - get detailed information
        try {
            const detailedRecipes = await Promise.all(
                recipes.map(async (recipe) => {
                    const detailResponse = await fetch(
                        `https://api.spoonacular.com/recipes/${recipe.id}/information?apiKey=${API_KEY}`
                    );
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

            res.json({
                recipes: filteredRecipes,
                message: filteredRecipes.length ? null : 'No recipes match your dietary restrictions.'
            });

        } catch (detailError) {
            console.error('Error fetching recipe details:', detailError);
            res.status(500).json({
                error: 'Error fetching recipe details',
                userMessage: 'Unable to fetch complete recipe information. Please try again.'
            });
        }

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({
            error: error.message || 'Internal server error',
            userMessage: 'An error occurred while fetching recipes. Please try again later.'
        });
    }
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        userMessage: 'The requested resource was not found.'
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        userMessage: 'An unexpected error occurred. Please try again later.'
    });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 