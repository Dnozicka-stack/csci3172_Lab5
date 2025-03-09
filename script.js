// API Key and Base URL
const API_KEY = '92f6ac35d26a499888bf360d3ae67c74';
const BASE_URL = 'https://api.spoonacular.com/recipes';

document.getElementById('searchButton').addEventListener('click', searchRecipes);

async function searchRecipes() {
    const ingredients = document.getElementById('searchInput').value.trim();
    if (!ingredients) {
        alert('Please enter ingredients');
        return;
    }

    // Get dietary restrictions
    const dietaryRestrictions = {
        vegetarian: document.getElementById('vegetarian').checked,
        vegan: document.getElementById('vegan').checked,
        glutenFree: document.getElementById('glutenFree').checked,
        dairyFree: document.getElementById('dairyFree').checked
    };

    try {
        // First, search for recipes by ingredients
        const response = await fetch(
            `${BASE_URL}/findByIngredients?apiKey=${API_KEY}&ingredients=${ingredients}&number=12`
        );
        const recipes = await response.json();

        // Then, get detailed information for each recipe to check dietary restrictions
        const detailedRecipes = await Promise.all(
            recipes.map(async (recipe) => {
                const detailResponse = await fetch(
                    `${BASE_URL}/${recipe.id}/information?apiKey=${API_KEY}`
                );
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

        displayRecipes(filteredRecipes);
    } catch (error) {
        console.error('Error fetching recipes:', error);
        alert('Error fetching recipes. Please try again.');
    }
}

// Function to display recipes
function displayRecipes(recipes) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    if (recipes.length === 0) {
        resultsContainer.innerHTML = '<p>No recipes found matching your criteria. Try adjusting your dietary restrictions.</p>';
        return;
    }

    recipes.forEach(recipe => {
        const dietaryTags = [];
        if (recipe.vegetarian) dietaryTags.push('Vegetarian');
        if (recipe.vegan) dietaryTags.push('Vegan');
        if (recipe.glutenFree) dietaryTags.push('Gluten-Free');
        if (recipe.dairyFree) dietaryTags.push('Dairy-Free');

        const recipeCard = document.createElement('div');
        recipeCard.className = 'recipe-card';
        recipeCard.innerHTML = `
            <img src="${recipe.image}" alt="${recipe.title}">
            <h3>${recipe.title}</h3>
            <p>Ready in ${recipe.readyInMinutes} minutes</p>
            <div class="dietary-tags">
                ${dietaryTags.map(tag => `<span class="dietary-tag">${tag}</span>`).join('')}
            </div>
        `;
        resultsContainer.appendChild(recipeCard);
    });
} 