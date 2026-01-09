import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Search } from 'lucide-react';
import '../styles/RecipeSearch.css';

// FilterGroup Component
const FilterGroup = ({ title, options, expanded, onToggle, selectedOptions, onOptionChange }) => {
  useEffect(() => {
    document.title = 'ChopGuide';
  }, []);

  const [showAll, setShowAll] = useState(false);
  const displayOptions = showAll ? options : options.slice(0, 6);
  const hasMore = options.length > 6;
  const remainingOptions = options.length - 6;

  const getGroupClassName = (title) => {
    const baseClass = 'filter-group-button';
    const titleToClass = {
      "Diet Type": "diet-type",
      "Health Labels": "health-labels",
      "Cuisine Type": "cuisine-type",
      "Meal Type": "meal-type",
      "Dish Type": "dish-type"
    };
    return `${baseClass} ${titleToClass[title]}`;
  };

  return (
    <div className="filter-group">
      <button
        onClick={onToggle}
        className={getGroupClassName(title)}
        aria-expanded={expanded}
      >
        <span>{title}</span>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {expanded && (
        <div className="filter-content">
          <div className="filter-grid">
            {displayOptions.map((option) => (
              <label key={option} className="filter-option">
                <input
                  type="checkbox"
                  checked={selectedOptions.includes(option)}
                  onChange={() => onOptionChange(option)}
                  className="filter-checkbox"
                />
                <span className="filter-label">{formatLabel(option)}</span>
              </label>
            ))}
          </div>

          {hasMore && (
            <div className="see-more-container">
              <button
                onClick={() => setShowAll(!showAll)}
                className="see-more-button"
              >
                {showAll ? 'Show less' : `See ${remainingOptions} more options`}
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
// RecipeCard Component
const RecipeCard = ({ recipe }) => {
  return (
    <div className="recipe-card">
      <div className="recipe-content">
        {/* Recipe Image */}
        <div className="recipe-image-container">
          <img
            src={recipe.image}
            alt={recipe.title}
            className="recipe-image"
          />
        </div>

        {/* Recipe Title */}
        <h3 className="recipe-title">{recipe.title}</h3>

        {/* Recipe Tags */}
        <div className="recipe-tags">
          {recipe.tags?.map((tag, index) => (
            <span
              key={index}
              className="recipe-tag"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Recipe Details */}
        <div className="recipe-details">
          <p>Calories: {recipe.calories} kcal</p>
          <p>Time: {recipe.cookTime} mins</p>
        </div>
      </div>

      <button className="view-recipe-button">
        View Recipe
      </button>
    </div>
  );
};

// Main RecipeSearch Component
function RecipeSearch() {
  // State declarations
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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
  // Calorie range handler
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

  // Filter groups definition
  const filterGroups = {
    diet: {
      title: "Diet Type",
      options: [
        "balanced", "high-fiber", "high-protein",
        "low-carb", "low-fat", "low-sodium"
      ]
    },
    health: {
      title: "Health Labels",
      options: [
        "alcohol-cocktail", "alcohol-free", "celery-free",
        "crustacean-free", "dairy-free", "DASH",
        "egg-free", "fish-free", "fodmap-free",
        "gluten-free", "immuno-supportive", "keto-friendly",
        "kidney-friendly", "kosher", "low-fat-abs",
        "low-potassium", "low-sugar", "lupine-free",
        "Mediterranean", "mollusk-free", "mustard-free",
        "no-oil-added", "paleo", "peanut-free",
        "pescatarian", "pork-free", "red-meat-free",
        "sesame-free", "shellfish-free", "soy-free",
        "sugar-conscious", "sulfite-free", "tree-nut-free",
        "vegan", "vegetarian", "wheat-free"
      ]
    },
    cuisine: {
      title: "Cuisine Type",
      options: [
        "American", "Asian", "British", "Caribbean",
        "Central Europe", "Chinese", "Eastern Europe",
        "French", "Indian", "Italian", "Japanese",
        "Kosher", "Mediterranean", "Mexican",
        "Middle Eastern", "South American", "South East Asian"
      ]
    },
    meal: {
      title: "Meal Type",
      options: [
        "Breakfast", "Dinner", "Lunch", "Snack", "Teatime"
      ]
    },
    dish: {
      title: "Dish Type",
      options: [
        "Biscuits and cookies", "Bread", "Cereals",
        "Condiments and sauces", "Desserts", "Drinks",
        "Main course", "Pancake", "Preps", "Preserve",
        "Salad", "Sandwiches", "Side dish", "Soup",
        "Starter", "Sweets"
      ]
    }
  };

  // Group toggle handler
  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  // Option change handler
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

  // Search handler with API integration
  const handleSearch = async () => {
    if (!isValidRange) return;

    setLoading(true);
    setError(null);

    try {
      // Base params
      const params = new URLSearchParams({
        type: 'public',
        app_id: 'YOUR_APP_ID',
        app_key: 'YOUR_APP_KEY',
        q: searchQuery || ''
      });

      // Add calorie range if specified
      if (calorieRange.min || calorieRange.max) {
        const calorieString = `${calorieRange.min || '0'}-${calorieRange.max || ''}`;
        params.append('calories', calorieString);
      }

      // Add all filters
      selectedFilters.diet.forEach(diet => params.append('diet', diet));
      selectedFilters.health.forEach(health => params.append('health', health));
      selectedFilters.cuisine.forEach(cuisine => params.append('cuisineType', cuisine));
      selectedFilters.meal.forEach(meal => params.append('mealType', meal));
      selectedFilters.dish.forEach(dish => params.append('dishType', dish));

      const response = await fetch(`https://api.edamam.com/api/recipes/v2?${params}`);

      if (!response.ok) {
        throw new Error('Failed to fetch recipes');
      }

      const data = await response.json();

      const transformedRecipes = data.hits.map(hit => ({
        id: hit.recipe.uri.split('#')[1],
        image: hit.recipe.image,
        title: hit.recipe.label,
        tags: [
          ...hit.recipe.dietLabels,
          ...hit.recipe.healthLabels.slice(0, 2),
          ...(hit.recipe.cuisineType || []).slice(0, 1)
        ].filter(Boolean),
        calories: Math.round(hit.recipe.calories),
        cookTime: hit.recipe.totalTime || 'N/A'
      }));

      setRecipes(transformedRecipes);

    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to fetch recipes. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="recipe-search-container">
      <h2 className="recipe-search-title">Recipe Search</h2>

      {/* Search Input */}
      <div className="search-container">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search recipes (e.g., 'chicken curry', 'vegetarian pasta')..."
          className="search-input"
        />
        <Search className="search-icon" />
      </div>

      {/* Calorie Filter */}
      <div className="calorie-filter">
        <h3 className="calorie-title">Calorie Range</h3>
        <div className="calorie-inputs">
          <div className="calorie-input-group">
            <label htmlFor="minCalories">Min</label>
            <input
              type="number"
              id="minCalories"
              value={calorieRange.min}
              onChange={(e) => handleCalorieChange('min', e.target.value)}
              placeholder="0"
              min="0"
              className="calorie-input"
            />
          </div>
          <span className="calorie-separator">-</span>
          <div className="calorie-input-group">
            <label htmlFor="maxCalories">Max</label>
            <input
              type="number"
              id="maxCalories"
              value={calorieRange.max}
              onChange={(e) => handleCalorieChange('max', e.target.value)}
              placeholder="∞"
              min="0"
              className="calorie-input"
            />
          </div>
        </div>
        {!isValidRange && (
          <p className="calorie-error">Minimum calories should be less than maximum calories</p>
        )}
      </div>

      {/* Filter Groups */}
      <div className="filters-container">
        {Object.entries(filterGroups).map(([key, group]) => (
          <FilterGroup
            key={key}
            title={group.title}
            options={group.options}
            expanded={expandedGroups[key]}
            onToggle={() => toggleGroup(key)}
            selectedOptions={selectedFilters[key]}
            onOptionChange={(option) => handleOptionChange(key, option)}
          />
        ))}
      </div>

      {/* Search Button */}
      <div className="search-button-container">
        <button
          onClick={handleSearch}
          className="search-button"
        >
          Search Recipes
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Loading and Results */}
      {loading ? (
        <div className="loading-message">
          Loading recipes...
        </div>
      ) : (
        <div className="recipe-grid">
          {recipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default RecipeSearch;