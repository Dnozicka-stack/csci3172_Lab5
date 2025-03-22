document.getElementById('searchButton').addEventListener('click', searchRecipes);
document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchRecipes();
    }
});

// Show error message to user
function showError(message) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = `
        <div class="error-message" role="alert" aria-live="assertive">
            <p>Error: ${message}</p>
        </div>
    `;
}

// Function to format ingredients for API
function formatIngredients(ingredients) {
    return ingredients
        .split(',')
        .map(item => item.trim())
        .filter(item => item.length > 0)
        .join(',');
}

// Function to search for recipes
async function searchRecipes() {
    const ingredients = document.getElementById('searchInput').value.trim();
    
    // Input validation
    if (!ingredients) {
        showError('Please enter ingredients before searching.');
        return;
    }

    // Format ingredients for API
    const formattedIngredients = formatIngredients(ingredients);
    if (!formattedIngredients) {
        showError('Please enter valid ingredients.');
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
        // Show loading state
        const resultsContainer = document.getElementById('results');
        resultsContainer.innerHTML = '<div class="loading">Searching for recipes...</div>';

        // Construct URL with parameters
        const searchParams = new URLSearchParams();
        searchParams.append('ingredients', formattedIngredients);
        searchParams.append('dietaryRestrictions', JSON.stringify(dietaryRestrictions));

        // Call the Netlify Function
        const response = await fetch(`/.netlify/functions/recipes?${searchParams.toString()}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.userMessage || 'Failed to fetch recipes');
        }

        displayRecipes(data.recipes, data.message);
    } catch (error) {
        console.error('Error:', error);
        showError(error.message || 'An error occurred while fetching recipes. Please try again.');
    }
}

// Function to display recipes
function displayRecipes(recipes, message) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    if (!recipes || recipes.length === 0) {
        showError(message || 'No recipes found. Try different ingredients or dietary restrictions.');
        return;
    }

    // Add summary of results
    const resultsSummary = document.createElement('h2');
    resultsSummary.className = 'results-summary';
    resultsSummary.setAttribute('tabindex', '-1');
    resultsSummary.textContent = `Found ${recipes.length} recipe${recipes.length === 1 ? '' : 's'}`;
    resultsContainer.appendChild(resultsSummary);
    resultsSummary.focus();

    recipes.forEach((recipe, index) => {
        try {
            const dietaryTags = [];
            if (recipe.vegetarian) dietaryTags.push('Vegetarian');
            if (recipe.vegan) dietaryTags.push('Vegan');
            if (recipe.glutenFree) dietaryTags.push('Gluten-Free');
            if (recipe.dairyFree) dietaryTags.push('Dairy-Free');

            const recipeCard = document.createElement('article');
            recipeCard.className = 'recipe-card';
            recipeCard.setAttribute('aria-labelledby', `recipe-title-${index}`);

            const dietaryInfo = dietaryTags.length 
                ? `Suitable for: ${dietaryTags.join(', ')}` 
                : 'No specific dietary information available';

            recipeCard.innerHTML = `
                <img src="${recipe.image || 'placeholder-image.jpg'}" 
                     alt="${recipe.title} - Recipe image"
                     onerror="this.src='placeholder-image.jpg'; this.alt='Recipe image not available'"
                     loading="lazy">
                <h3 id="recipe-title-${index}">${recipe.title}</h3>
                <p>Ready in ${recipe.readyInMinutes || 'N/A'} minutes</p>
                <div class="dietary-tags" role="list" aria-label="Dietary information">
                    ${dietaryTags.map(tag => `
                        <span class="dietary-tag" role="listitem">${tag}</span>
                    `).join('')}
                </div>
                <p class="sr-only">${dietaryInfo}</p>
            `;
            resultsContainer.appendChild(recipeCard);
        } catch (error) {
            console.error('Error displaying recipe:', error);
        }
    });
} 