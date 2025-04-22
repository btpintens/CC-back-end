import { Item } from '../models/closet.js';
import subCategoryWeatherTypes from '../defaultWeather/defaultWeather.js';

/**
 * Converts weather API data to a format usable for comparison with clothing parameters
 * @param {Object} weatherData - Weather data from the weather API
 * @returns {Object} Formatted weather data for comparison
 */
const formatWeatherData = (weatherData) => {
  // Extract relevant weather information
  const temp_f = weatherData.current.temp_f;
  const humidity = weatherData.current.humidity;
  const uv = weatherData.current.uv;
  const wind_mph = weatherData.current.wind_mph;
  
  // Determine precipitation type and intensity based on current conditions
  let precipType = "none";
  let precipIntensity = "none";
  
  if (weatherData.current.precip_mm > 0) {
    precipIntensity = weatherData.current.precip_mm < 2.5 ? "light" : 
                     weatherData.current.precip_mm < 7.6 ? "moderate" : "heavy";
    
    // Determine if it's rain or snow based on temperature
    precipType = temp_f > 32 ? "rain" : "snow";
  }

  return {
    temp_f,
    humidity,
    uv,
    wind_mph,
    precipType,
    precipIntensity
  };
};

/**
 * Generates MongoDB query parameters based on current weather conditions
 * @param {Object} currentWeather - Formatted current weather data
 * @returns {Object} MongoDB query parameters
 */
const generateWeatherQuery = (currentWeather) => {
  // Build query for items with custom weatherType parameters
  const customWeatherQuery = {
    $or: [
      // Items with weather parameters that match current conditions
      { 
        'weatherType': {
          $elemMatch: {
            // Temperature range match - FIXED query logic
            // Current temperature should be BETWEEN the item's minTemp and maxTemp
            $and: [
              // Current temp should be LESS than or equal to the item's maxTemp
              { $or: [{ maxTemp: { $gte: currentWeather.temp_f } }, { maxTemp: { $exists: false } }] },
              // Current temp should be GREATER than or equal to the item's minTemp
              { $or: [{ minTemp: { $lte: currentWeather.temp_f } }, { minTemp: { $exists: false } }] },
              
              // Humidity range match
              { $or: [{ maxHumidity: { $gte: currentWeather.humidity } }, { maxHumidity: { $exists: false } }] },
              { $or: [{ minHumidity: { $lte: currentWeather.humidity } }, { minHumidity: { $exists: false } }] },
              
              // UV range match
              { $or: [{ maxUvIndex: { $gte: currentWeather.uv } }, { maxUvIndex: { $exists: false } }] },
              { $or: [{ minUvIndex: { $lte: currentWeather.uv } }, { minUvIndex: { $exists: false } }] },
              
              // Wind speed match
              { $or: [{ maxWind: { $gte: currentWeather.wind_mph } }, { maxWind: { $exists: false } }] },
              
              // Precipitation type match
              { $or: [
                  { precipType: "any" },
                  { precipType: currentWeather.precipType },
                  { precipType: { $exists: false } }
              ]}
            ]
          }
        }
      }
      // REMOVING THE OPTION TO INCLUDE ITEMS WITH NO WEATHERTYPE PARAMETERS 
      // These will be handled separately with the defaultWeather logic
    ]
  };

  return customWeatherQuery;
};

/**
 * Checks if a subcategory's default weather parameters match current weather
 * @param {string} subCategory - The clothing subcategory
 * @param {Object} currentWeather - Current weather conditions
 * @returns {boolean} Whether the subcategory is suitable for current weather
 */
const isSubCategoryWeatherMatch = (subCategory, currentWeather) => {
  const defaultParams = subCategoryWeatherTypes[subCategory];
  
  if (!defaultParams) return false;
  
  // Temperature check
  if (defaultParams.maxTemp && currentWeather.temp_f > defaultParams.maxTemp) return false;
  if (defaultParams.minTemp && currentWeather.temp_f < defaultParams.minTemp) return false;
  
  // Humidity check
  if (defaultParams.maxHumidity && currentWeather.humidity > defaultParams.maxHumidity) return false;
  if (defaultParams.minHumidity && currentWeather.humidity < defaultParams.minHumidity) return false;
  
  // UV index check
  if (defaultParams.maxUvIndex && currentWeather.uv > defaultParams.maxUvIndex) return false;
  if (defaultParams.minUvIndex && currentWeather.uv < defaultParams.minUvIndex) return false;
  
  // Wind check
  if (defaultParams.maxWind && currentWeather.wind_mph > defaultParams.maxWind) return false;
  
  // Precipitation check
  if (defaultParams.precipType && defaultParams.precipType !== "any") {
    if (currentWeather.precipType !== "none" && currentWeather.precipType !== defaultParams.precipType) {
      return false;
    }
    
    // If we need no precipitation but there is some
    if (defaultParams.precipType === "none" && currentWeather.precipType !== "none") {
      return false;
    }
  }
  
  // Precipitation intensity check
  const intensityLevels = { "none": 0, "light": 1, "moderate": 2, "heavy": 3 };
  if (defaultParams.precipIntensity && 
      intensityLevels[currentWeather.precipIntensity] > intensityLevels[defaultParams.precipIntensity]) {
    return false;
  }
  
  return true;
};

/**
 * Gets clothing recommendations based on weather data
 * @param {Object} weatherData - Weather forecast data from frontend
 * @param {String} userId - User ID to filter clothing items
 * @returns {Promise<Object>} Object containing recommended clothing items by category
 */
const getClothingRecommendations = async (weatherData, userId) => {
  try {
    // Format weather data for comparison
    const formattedWeather = formatWeatherData(weatherData);
    
    // For debugging
    console.log("Formatted weather for filtering:", formattedWeather);
    
    // Generate MongoDB query parameters
    const weatherQuery = generateWeatherQuery(formattedWeather);
    
    // Get suitable clothing items with custom weather parameters
    const clothingItemsWithCustomWeather = await Item.find({
      userId,
      ...weatherQuery
    });
    
    console.log(`Found ${clothingItemsWithCustomWeather.length} items with matching custom weather parameters`);
    
    // Determine subcategories that match default weather parameters
    const suitableSubCategories = [];
    
    // Check each subcategory against the current weather
    Object.keys(subCategoryWeatherTypes).forEach(subCategory => {
      if (isSubCategoryWeatherMatch(subCategory, formattedWeather)) {
        suitableSubCategories.push(subCategory);
      }
    });
    
    console.log("Suitable subcategories:", suitableSubCategories);
    
    // Get items without custom weather parameters but with suitable subcategories
    const clothingItemsWithDefaultWeather = await Item.find({
      userId,
      subCategory: { $in: suitableSubCategories },
      $or: [
        { 'weatherType': { $size: 0 } },
        { 'weatherType': { $exists: false } }
      ]
    });
    
    console.log(`Found ${clothingItemsWithDefaultWeather.length} items with suitable default weather parameters`);
    
    // Combine both sets of items
    const allSuitableItems = [
      ...clothingItemsWithCustomWeather,
      ...clothingItemsWithDefaultWeather
    ];
    
    // Deduplicate items (in case some appear in both queries)
    const uniqueItemIds = new Set();
    const uniqueItems = allSuitableItems.filter(item => {
      const itemId = item._id.toString();
      if (uniqueItemIds.has(itemId)) {
        return false;
      }
      uniqueItemIds.add(itemId);
      return true;
    });
    
    // Perform a double-check to verify temperature filtering for each item
    const verifiedItems = uniqueItems.filter(item => {
      // For items with custom weather parameters
      if (item.weatherType && item.weatherType.length > 0) {
        // Check if any of the item's weatherType entries match the current weather
        for (const params of item.weatherType) {
          // Temperature check
          if (params.maxTemp && formattedWeather.temp_f > params.maxTemp) continue;
          if (params.minTemp && formattedWeather.temp_f < params.minTemp) continue;
          
          // If we get here, the temperature conditions are met for this weatherType entry
          return true;
        }
        // No matching weatherType entries found
        return false;
      } 
      
      // For items using default parameters from their subcategory
      const defaultParams = subCategoryWeatherTypes[item.subCategory];
      if (!defaultParams) return false;
      
      // Temperature check
      if (defaultParams.maxTemp && formattedWeather.temp_f > defaultParams.maxTemp) return false;
      if (defaultParams.minTemp && formattedWeather.temp_f < defaultParams.minTemp) return false;
      
      // If we get here, the temperature conditions are met for this item
      return true;
    });
    
    console.log(`After verification: ${verifiedItems.length} of ${uniqueItems.length} items passed temperature checks`);
    
    // Group items by category
    const outfitOptions = {
      Shirt: [],
      Pants: [],
      Sweater: [],
      Skirt: [],
      Dress: [],
      Shoes: [],
      Jacket: []
    };
    
    verifiedItems.forEach(item => {
      if (outfitOptions[item.category]) {
        outfitOptions[item.category].push(item);
      }
    });
    
    return outfitOptions;
  } catch (error) {
    console.error('Error getting clothing recommendations:', error.message);
    throw error;
  }
};

/**
 * API endpoint to get clothing recommendations
 * @param {Object} req - Express request object with weatherData in body
 * @param {Object} res - Express response object
 * @returns {Object} Recommended clothing items
 */
export const getWeatherBasedRecommendations = async (req, res) => {
  try {
    const { weatherData, userId } = req.body;
    
    if (!weatherData || !userId) {
      return res.status(400).json({ 
        error: "Weather data and userId are required"
      });
    }
    
    const recommendations = await getClothingRecommendations(weatherData, userId);
    
    return res.status(200).json({
      success: true,
      recommendations
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
};

export default {
  getWeatherBasedRecommendations
};