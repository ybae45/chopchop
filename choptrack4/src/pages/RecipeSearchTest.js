import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import '../styles/RecipeSearchTest.css'


const FilterGroup = ({ title, options, expanded, onToggle, selectedOptions, onOptionChange }) => {
  useEffect(() => {
    // change the title dynamically
    document.title = 'ChopTrack';
  }, []); // runs only once after the component mounts
 
  const [showAll, setShowAll] = useState(false);
  const displayOptions = showAll ? options : options.slice(0, 6);
  const hasMore = options.length > 6;
  const remainingOptions = options.length - 6;

  const getGroupClassName = (title) => {
    // Convert title to kebab case for CSS class
    const baseClass = 'filter-group-button';
    const titleClass = title.toLowerCase().replace(/\s+/g, '-');
    return `${baseClass} ${titleClass}`;
  };

  return (
    <div className="filter-group">
      <button
        onClick={onToggle}
        className={getGroupClassName(title)}
        aria-expanded={expanded}
      >
        <span>{title}</span>
        {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </button>

      {expanded && (
        <div className="filter-content">
          <div className="filter-grid">
            {displayOptions.map((option) => (
              <label key={option} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedOptions.includes(option)}
                  onChange={() => onOptionChange(option)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm">{formatLabel(option)}</span>
              </label>
            ))}
          </div>

          {hasMore && (
            <div className="button-container">
              <button
                onClick={() => setShowAll(!showAll)}
                className="see-more-button"
              >
                {showAll ? 'Show less' : `See ${remainingOptions}+ options`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const formatLabel = (label) => {
  if (label === 'DASH') return 'DASH';
  return label
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

function RecipeSearch() {
  const [expandedGroups, setExpandedGroups] = useState({});
  const [selectedFilters, setSelectedFilters] = useState({
    diet: [],
    health: [],
    cuisine: [],
    meal: [],
    dish: []
  });
  const [calorieRange, setCalorieRange] = useState({
    min: '',
    max: ''
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isValidRange, setIsValidRange] = useState(true);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isFiltersVisible, setIsFiltersVisible] = useState(false); 

  // Replace with your Edamam API credentials
  const APP_ID = '1f4699db';
  const APP_KEY = 'b8c5e770c87bc300e6e1a90a2c7372a6';

  console.log('APP_ID available:', !!process.env.EDAMAM_RECIPE_ID);
  console.log('APP_KEY available:', !!process.env.EDAMAM_RECIPE_KEY);

  if (!APP_ID || !APP_KEY) {
    return (
      <div className="p-4 text-center">
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">
          <h3 className="font-bold">Configuration Error</h3>
          <p>API credentials are not configured. Please check your environment variables.</p>
        </div>
      </div>
    );
  }


  // Keep your existing filter groups and helper functions
  const filterGroups = {
    diet: {
      title: "Diet Type",
      options: [
        "balanced",
        "high-fiber",
        "high-protein",
        "low-carb",
        "low-fat",
        "low-sodium"
      ]
    },
    health: {
      title: "Health Labels",
      options: [
        "alcohol-cocktail",
        "alcohol-free",
        "celery-free",
        "crustacean-free",
        "dairy-free",
        "DASH",
        "egg-free",
        "fish-free",
        "fodmap-free",
        "gluten-free",
        "immuno-supportive",
        "keto-friendly",
        "kidney-friendly",
        "kosher",
        "low-fat-abs",
        "low-potassium",
        "low-sugar",
        "lupine-free",
        "Mediterranean",
        "mollusk-free",
        "mustard-free",
        "no-oil-added",
        "paleo",
        "peanut-free",
        "pescatarian",
        "pork-free",
        "red-meat-free",
        "sesame-free",
        "shellfish-free",
        "soy-free",
        "sugar-conscious",
        "sulfite-free",
        "tree-nut-free",
        "vegan",
        "vegetarian",
        "wheat-free"
      ]
    },
    cuisine: {
      title: "Cuisine Type",
      options: [
        "American",
        "Asian",
        "British",
        "Caribbean",
        "Central Europe",
        "Chinese",
        "Eastern Europe",
        "French",
        "Indian",
        "Italian",
        "Japanese",
        "Kosher",
        "Mediterranean",
        "Mexican",
        "Middle Eastern",
        "South American",
        "South East Asian"
      ]
    },
    meal: {
      title: "Meal Type",
      options: [
        "Breakfast",
        "Dinner",
        "Lunch",
        "Snack",
        "Teatime"
      ]
    },
    dish: {
      title: "Dish Type",
      options: [
        "Biscuits and cookies",
        "Bread",
        "Cereals",
        "Condiments and sauces",
        "Desserts",
        "Drinks",
        "Main course",
        "Pancake",
        "Preps",
        "Preserve",
        "Salad",
        "Sandwiches",
        "Side dish",
        "Soup",
        "Starter",
        "Sweets"
      ]
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      let url = `https://api.edamam.com/api/recipes/v2?type=public&q=${encodeURIComponent(searchQuery)}&app_id=${APP_ID}&app_key=${APP_KEY}`;

      // Add filters to URL
      if (selectedFilters.diet.length) {
        selectedFilters.diet.forEach(diet => {
          url += `&diet=${diet}`;
        });
      }

      if (selectedFilters.health.length) {
        selectedFilters.health.forEach(health => {
          url += `&health=${health}`;
        });
      }

      if (selectedFilters.cuisine.length) {
        selectedFilters.cuisine.forEach(cuisine => {
          url += `&cuisineType=${cuisine}`;
        });
      }

      if (selectedFilters.meal.length) {
        selectedFilters.meal.forEach(meal => {
          url += `&mealType=${meal}`;
        });
      }

      if (selectedFilters.dish.length) {
        selectedFilters.dish.forEach(dish => {
          url += `&dishType=${dish}`;
        });
      }

      if (calorieRange.min !== '' || calorieRange.max !== '') {
        let calorieFilter = '';
        if (calorieRange.min !== '' && calorieRange.max !== '') {
          calorieFilter = `${calorieRange.min}-${calorieRange.max}`;
        } else if (calorieRange.min !== '') {
          calorieFilter = `${calorieRange.min}+`;
        } else if (calorieRange.max !== '') {
          calorieFilter = `${calorieRange.max}`;
        }
        url += `&calories=${calorieFilter}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch recipes');
      }

      const data = await response.json();
      setRecipes(data.hits || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching recipes:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const handleOptionChange = (group, option) => {
    setSelectedFilters(prev => {
      const currentOptions = prev[group];
      const newOptions = currentOptions.includes(option)
        ? currentOptions.filter(item => item !== option)
        : [...currentOptions, option];
      return {
        ...prev,
        [group]: newOptions
      };
    });
  };

  const handleCalorieChange = (type, value) => {
    const newValue = value === '' ? '' : Math.max(0, Number(value));
    setCalorieRange(prev => ({
      ...prev,
      [type]: newValue
    }));

    if (type === 'max' && calorieRange.min !== '' && newValue !== '') {
      setIsValidRange(Number(calorieRange.min) <= Number(newValue));
    }
    if (type === 'min' && calorieRange.max !== '' && newValue !== '') {
      setIsValidRange(Number(newValue) <= Number(calorieRange.max));
    }
  };

  return (
    <div className="recipe-search-container max-w-7xl mx-auto px-4 py-8">
      <h2 className="text-3xl font-bold mb-8" style={{paddingTop: "20px"}}>Recipe Search</h2>
      <div className="search-container">
      <Search className="search-icon" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search recipes (e.g., 'chicken curry', 'vegetarian pasta')..."
          className="search-input"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch();  // Call handleSearch when Enter is pressed
            }
          }
        }
        />
      </div>

      <div className="calorie-section">
        <h3 className="calorie-title">Calorie Range</h3>
        <div className="calorie-inputs">
          <div>
            <label htmlFor="minCalories">Min</label>
            <input
              type="number"
              id="minCalories"
              value={calorieRange.min}
              onChange={(e) => handleCalorieChange('min', e.target.value)}
              placeholder="0"
              className="calorie-input"
            />
          </div>
          <span>-</span>
          <div>
            <label htmlFor="maxCalories">Max</label>
            <input
              type="number"
              id="maxCalories"
              value={calorieRange.max}
              onChange={(e) => handleCalorieChange('max', e.target.value)}
              placeholder="∞"
              className="calorie-input"
            />
          </div>
        </div>
      </div>
      <div class="button-container">
        <button
        onClick={() => setIsFiltersVisible(!isFiltersVisible)}
        className="filter-toggle-button mb-4 p-2 bg-blue-500 text-white">
          {isFiltersVisible ? 'Hide filters' : 'See filters...'}
        </button>
      </div>

        {/* Conditionally render the filter groups with animation */}
      <div
        className={`filter-toggle ${isFiltersVisible ? 'filter-toggle-visible' : ''} mb-6`}>
        {isFiltersVisible && (
          Object.entries(filterGroups).map(([key, group]) => (
            <FilterGroup
              key={key}
              title={group.title}
              options={group.options}
              expanded={expandedGroups[key]}
              onToggle={() => toggleGroup(key)}
              selectedOptions={selectedFilters[key]}
              onOptionChange={(option) => handleOptionChange(key, option)}
            />
          ))
        )}
      </div>
    

      <div className="button-container">
        <button
          onClick={handleSearch}
          disabled={loading || !isValidRange}
          className="search-button"
        >
          {loading ? 'Searching...' : 'Search Recipes'}
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {recipes.length > 0 && (
        <div className="recipe-results">
          <h3 className="text-2xl font-semibold mb-6">Search Results</h3>
          <div className="recipe-grid">
            {recipes.map(({ recipe }) => (
              <div key={recipe.uri} className="recipe-card">
                <img
                  src={recipe.image}
                  alt={recipe.label}
                  className="recipe-image"
                />
                <div className="recipe-content">
                  <h4 className="recipe-title">{recipe.label}</h4>
                  <div className="recipe-stats">
                    <span>{Math.round(recipe.calories)} calories</span>
                    <span>{recipe.ingredients.length} ingredients</span>
                  </div>
                  <div className="recipe-labels">
                    {recipe.dietLabels.map(label => (
                      <span key={label} className="recipe-label">
                        {label}
                      </span>
                    ))}
                    {recipe.healthLabels.slice(0, 3).map(label => (
                      <span key={label} className="recipe-label">
                        {label}
                      </span>
                    ))}
                  </div>
                  <a
                    href={recipe.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="view-recipe-button"
                  >
                    View Recipe
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default RecipeSearch;