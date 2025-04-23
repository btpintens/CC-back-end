import { Item } from '../models/closet.js';
import subCategoryWeatherTypes from '../defaultWeather/defaultWeather.js';

/**
 * Checks if the current precipitation is acceptable for the item
 * @param {String} itemPrecipType - Item's precipitation type
 * @param {String} itemPrecipIntensity - Item's precipitation intensity
 * @param {String} currentPrecipType - Current precipitation type
 * @param {String} currentPrecipIntensity - Current precipitation intensity
 * @returns {Boolean} Whether the item can be worn in the current conditions
 */
const isPrecipitationAcceptable = (itemPrecipType, itemPrecipIntensity, currentPrecipType, currentPrecipIntensity) => {
  // Log for debugging
  console.log(`Checking precip: item=${itemPrecipType}/${itemPrecipIntensity}, current=${currentPrecipType}/${currentPrecipIntensity}`);
  
  // For clothing items that don't specify precipitation requirements
  if (!itemPrecipType || !itemPrecipIntensity) {
    console.log("Item has no precip requirements, accepting");
    return true;
  }
  
  // SPECIAL CASE: 'none' intensity has special meaning depending on the type
  if (itemPrecipIntensity === 'none') {
    // 'none' means "only acceptable when there's NO precipitation of this type"
    // So if current type matches item type, it's only acceptable if current intensity is also 'none'
    if (itemPrecipType === currentPrecipType) {
      const result = currentPrecipIntensity === 'none';
      console.log(`SPECIAL CASE: Item with '${itemPrecipType}/none' matches current type.`);
      console.log(`Item can ONLY be worn when there's NO ${itemPrecipType}. Result: ${result}`);
      return result;
    } else {
      // If types don't match, then it's acceptable (since 'none' just means "no rain" or "no snow")
      console.log(`Item can be worn in any conditions EXCEPT ${itemPrecipType}`);
      return true;
    }
  }
  
  // Standard hierarchy-based check for other cases
  const precipHierarchy = ['none', 'light', 'moderate', 'heavy'];
  
  // Determine indices in the hierarchy
  const itemIntensityIndex = precipHierarchy.indexOf(itemPrecipIntensity);
  const currentIntensityIndex = precipHierarchy.indexOf(currentPrecipIntensity);
  
  // If we can't find either in the hierarchy, log and return true as a fallback
  if (itemIntensityIndex === -1 || currentIntensityIndex === -1) {
    console.log("Could not find one or both intensities in hierarchy, accepting as fallback");
    return true;
  }
  
  // Special case for 'any' type - it means this item works for any precipitation type
  // In this case, we only check the intensity
  if (itemPrecipType === 'any') {
    const result = currentIntensityIndex <= itemIntensityIndex;
    console.log(`Item works with ANY precipitation type. Intensity check: ${result}`);
    return result;
  }
  
  // Normal case - check if types match AND current intensity is <= item's max intensity
  if (itemPrecipType === currentPrecipType) {
    const result = currentIntensityIndex <= itemIntensityIndex;
    console.log(`Same precip type. Intensity check: ${result}`);
    return result;
  }
  
  // If current is 'none', any item is fine with that
  if (currentPrecipIntensity === 'none') {
    console.log("No current precipitation, item is acceptable");
    return true;
  }
  
  // If types don't match and there is some precipitation, item is not suitable
  console.log(`Types don't match and there is precipitation. Not suitable.`);
  return false;
};

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
  // Handle the special case for 'none' precipitation type differently
  const precipTypeQuery = currentWeather.precipType === "none" 
    ? { $or: [{ precipType: "any" }, { precipType: "none" }, { precipType: { $exists: false } }] }
    : { $or: [{ precipType: "any" }, { precipType: currentWeather.precipType }, { precipType: { $exists: false } }] };
  
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
              
              // We'll handle precipitation checking in post-processing since we need to apply the hierarchy
              // For MongoDB query, we'll be more permissive and filter more precisely later
              precipTypeQuery
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
  
  if (!defaultParams) {
    console.log(`No default parameters for subcategory: ${subCategory}`);
    return false;
  }
  
  // Temperature check
  if (defaultParams.maxTemp && currentWeather.temp_f > defaultParams.maxTemp) {
    console.log(`${subCategory} temperature too high: ${currentWeather.temp_f} > ${defaultParams.maxTemp}`);
    return false;
  }
  if (defaultParams.minTemp && currentWeather.temp_f < defaultParams.minTemp) {
    console.log(`${subCategory} temperature too low: ${currentWeather.temp_f} < ${defaultParams.minTemp}`);
    return false;
  }
  
  // Humidity check
  if (defaultParams.maxHumidity && currentWeather.humidity > defaultParams.maxHumidity) {
    console.log(`${subCategory} humidity too high: ${currentWeather.humidity} > ${defaultParams.maxHumidity}`);
    return false;
  }
  if (defaultParams.minHumidity && currentWeather.humidity < defaultParams.minHumidity) {
    console.log(`${subCategory} humidity too low: ${currentWeather.humidity} < ${defaultParams.minHumidity}`);
    return false;
  }
  
  // UV index check
  if (defaultParams.maxUvIndex && currentWeather.uv > defaultParams.maxUvIndex) {
    console.log(`${subCategory} UV index too high: ${currentWeather.uv} > ${defaultParams.maxUvIndex}`);
    return false;
  }
  if (defaultParams.minUvIndex && currentWeather.uv < defaultParams.minUvIndex) {
    console.log(`${subCategory} UV index too low: ${currentWeather.uv} < ${defaultParams.minUvIndex}`);
    return false;
  }
  
  // Wind check
  if (defaultParams.maxWind && currentWeather.wind_mph > defaultParams.maxWind) {
    console.log(`${subCategory} wind too high: ${currentWeather.wind_mph} > ${defaultParams.maxWind}`);
    return false;
  }
  
  // Precipitation check using the hierarchy
  const precipResult = isPrecipitationAcceptable(
    defaultParams.precipType, 
    defaultParams.precipIntensity,
    currentWeather.precipType,
    currentWeather.precipIntensity
  );
  
  if (!precipResult) {
    console.log(`${subCategory} precipitation mismatch`);
    return false;
  }
  
  // All checks passed
  console.log(`${subCategory} is suitable for current weather`);
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
    
    // STEP 1: First, get ALL items for this user - we'll filter them ourselves
    // This avoids the MongoDB query limitations for complex weather logic
    const allUserItems = await Item.find({ userId });
    console.log(`Found ${allUserItems.length} total items for user`);
    
    // Look for our example item
    const yellowGreenCardigan = allUserItems.find(item => 
      item.name === "YellowGreen Cardigan" && item.brand === "Tran-Jones"
    );
    
    if (yellowGreenCardigan) {
      console.log("🔍 FOUND YellowGreen Cardigan in database!");
      console.log("YellowGreen Cardigan details:", JSON.stringify({
        name: yellowGreenCardigan.name,
        category: yellowGreenCardigan.category,
        subCategory: yellowGreenCardigan.subCategory,
        weatherType: yellowGreenCardigan.weatherType
      }, null, 2));
    } else {
      console.log("⚠️ YellowGreen Cardigan NOT found in database");
    }
    
    // STEP 2: Filter items based on their weather conditions
    const filteredItems = allUserItems.filter(item => {
      // Special debug for YellowGreen Cardigan
      const isTargetItem = item.name === "YellowGreen Cardigan" && item.brand === "Tran-Jones";
      if (isTargetItem) {
        console.log("🔍 Evaluating YellowGreen Cardigan weather compatibility:");
      }
      
      // For items with custom weather parameters, use those exclusively
      if (item.weatherType && item.weatherType.length > 0) {
        if (isTargetItem) console.log("YellowGreen Cardigan has custom weather parameters");
        
        // Check if any of the item's weatherType entries match the current weather
        for (const params of item.weatherType) {
          if (isTargetItem) {
            console.log("Checking YellowGreen Cardigan weather params:", JSON.stringify(params));
          }
          
          // Temperature check
          if (params.maxTemp && formattedWeather.temp_f > params.maxTemp) {
            if (isTargetItem) console.log(`❌ Temperature too high: ${formattedWeather.temp_f} > ${params.maxTemp}`);
            continue;
          }
          if (params.minTemp && formattedWeather.temp_f < params.minTemp) {
            if (isTargetItem) console.log(`❌ Temperature too low: ${formattedWeather.temp_f} < ${params.minTemp}`);
            continue;
          }
          
          // Humidity check
          if (params.maxHumidity && formattedWeather.humidity > params.maxHumidity) {
            if (isTargetItem) console.log(`❌ Humidity too high: ${formattedWeather.humidity} > ${params.maxHumidity}`);
            continue;
          }
          if (params.minHumidity && formattedWeather.humidity < params.minHumidity) {
            if (isTargetItem) console.log(`❌ Humidity too low: ${formattedWeather.humidity} < ${params.minHumidity}`);
            continue;
          }
          
          // UV check - IGNORING UV PARAMETERS AS REQUESTED
          // if (params.maxUvIndex && formattedWeather.uv > params.maxUvIndex) continue;
          // if (params.minUvIndex && formattedWeather.uv < params.minUvIndex) continue;
          
          // Wind check
          if (params.maxWind && formattedWeather.wind_mph > params.maxWind) {
            if (isTargetItem) console.log(`❌ Wind too high: ${formattedWeather.wind_mph} > ${params.maxWind}`);
            continue;
          }
          
          // Apply precipitation hierarchy check
          const precipResult = isPrecipitationAcceptable(
            params.precipType,
            params.precipIntensity,
            formattedWeather.precipType,
            formattedWeather.precipIntensity
          );
          
          if (!precipResult) {
            if (isTargetItem) console.log(`❌ Precipitation mismatch`);
            continue;
          }
          
          // If we get here, all conditions are met for this weatherType entry
          if (isTargetItem) console.log(`✅ YellowGreen Cardigan PASSED all weather checks!`);
          return true;
        }
        
        // No matching weatherType entries found - This item fails the check
        if (isTargetItem) console.log(`❌ YellowGreen Cardigan FAILED weather checks - no matching weather type entries`);
        return false;
      } 
      
      // For items WITHOUT custom weather parameters, use the default for their subcategory
      if (isTargetItem) console.log("YellowGreen Cardigan has no custom weather parameters, using defaults");
      
      const defaultParams = subCategoryWeatherTypes[item.subCategory];
      if (!defaultParams) {
        if (isTargetItem) console.log(`❌ No default parameters for subcategory: ${item.subCategory}`);
        return false;
      }
      
      // Temperature check
      if (defaultParams.maxTemp && formattedWeather.temp_f > defaultParams.maxTemp) {
        if (isTargetItem) console.log(`❌ Temperature too high: ${formattedWeather.temp_f} > ${defaultParams.maxTemp}`);
        return false;
      }
      if (defaultParams.minTemp && formattedWeather.temp_f < defaultParams.minTemp) {
        if (isTargetItem) console.log(`❌ Temperature too low: ${formattedWeather.temp_f} < ${defaultParams.minTemp}`);
        return false;
      }
      
      // Humidity check
      if (defaultParams.maxHumidity && formattedWeather.humidity > defaultParams.maxHumidity) {
        if (isTargetItem) console.log(`❌ Humidity too high: ${formattedWeather.humidity} > ${defaultParams.maxHumidity}`);
        return false;
      }
      if (defaultParams.minHumidity && formattedWeather.humidity < defaultParams.minHumidity) {
        if (isTargetItem) console.log(`❌ Humidity too low: ${formattedWeather.humidity} < ${defaultParams.minHumidity}`);
        return false;
      }
      
      // UV index check - IGNORING UV PARAMETERS AS REQUESTED
      // if (defaultParams.maxUvIndex && formattedWeather.uv > defaultParams.maxUvIndex) {
      //   console.log(`❌ UV index too high: ${formattedWeather.uv} > ${defaultParams.maxUvIndex}`);
      //   return false;
      // }
      // if (defaultParams.minUvIndex && formattedWeather.uv < defaultParams.minUvIndex) {
      //   console.log(`❌ UV index too low: ${formattedWeather.uv} < ${defaultParams.minUvIndex}`);
      //   return false;
      // }
      
      // Wind check
      if (defaultParams.maxWind && formattedWeather.wind_mph > defaultParams.maxWind) {
        if (isTargetItem) console.log(`❌ Wind too high: ${formattedWeather.wind_mph} > ${defaultParams.maxWind}`);
        return false;
      }
      
      // Precipitation check using the hierarchy
      const precipResult = isPrecipitationAcceptable(
        defaultParams.precipType,
        defaultParams.precipIntensity,
        formattedWeather.precipType,
        formattedWeather.precipIntensity
      );
      
      if (!precipResult) {
        if (isTargetItem) console.log(`❌ Precipitation mismatch`);
        return false;
      }
      
      // All checks passed for default weather params
      if (isTargetItem) console.log(`✅ YellowGreen Cardigan PASSED all default weather checks!`);
      return true;
    });
    
    console.log(`After filtering: ${filteredItems.length} of ${allUserItems.length} items passed all checks`);
    
    // Check if YellowGreen Cardigan made it through filtering
    const yellowGreenCardiganFiltered = filteredItems.find(item => 
      item.name === "YellowGreen Cardigan" && item.brand === "Tran-Jones"
    );
    
    if (yellowGreenCardiganFiltered) {
      console.log("🎉 YellowGreen Cardigan PASSED filtering and is in final results!");
    } else {
      console.log("⚠️ YellowGreen Cardigan did NOT pass filtering");
    }
    
    // Check for specific categories
    const sweaters = filteredItems.filter(item => item.category === "Sweater");
    console.log(`Found ${sweaters.length} sweaters after filtering`);
    if (sweaters.length > 0) {
      console.log("Sweater examples:", sweaters.map(item => `${item.name} (${item.subCategory})`).join(", "));
    }
    
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
    
    filteredItems.forEach(item => {
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