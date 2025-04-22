import mongoose from 'mongoose';
import 'dotenv/config';
import db from './db/connection.js';
import { Item } from './models/closet.js';
import subCategoryWeatherTypes from './defaultWeather/defaultWeather.js';

// Sample weather data (similar to what would come from the frontend)
const sampleWeatherData = {
  "current": {
    "temp_f": 80.1,
    "humidity": 26,
    "uv": 4.9,
    "wind_mph": 12.1,
    "precip_mm": 0.0
  }
};

// Sample user ID (replace with a real user ID from your database)
const sampleUserId = "65fb942d45c5b0b3e21cb6a0";

// Format weather data for comparison
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

// Generate MongoDB query for custom weather parameters
const generateWeatherQuery = (currentWeather) => {
  // Build query for items with custom weatherType parameters
  const customWeatherQuery = {
    $or: [
      // Items with weather parameters that match current conditions
      { 
        'weatherType': {
          $elemMatch: {
            // Temperature range match
            $and: [
              { $or: [{ maxTemp: { $gte: currentWeather.temp_f } }, { maxTemp: { $exists: false } }] },
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
      },
      // Items with no weatherType parameters will be handled separately
      { 'weatherType': { $size: 0 } },
      { 'weatherType': { $exists: false } }
    ]
  };

  return customWeatherQuery;
};

// Check if a subcategory's default weather parameters match current weather
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

// Test function
const testQueries = async () => {
  try {
    console.log("Starting query test...");
    console.log("Weather conditions:", sampleWeatherData.current);
    
    // Format weather data
    const formattedWeather = formatWeatherData(sampleWeatherData);
    console.log("\nFormatted weather data:", formattedWeather);
    
    // Generate MongoDB query
    const weatherQuery = generateWeatherQuery(formattedWeather);
    console.log("\nMongoDB query for custom weather parameters:");
    console.log(JSON.stringify(weatherQuery, null, 2));
    
    // Find suitable subcategories
    const suitableSubCategories = [];
    Object.keys(subCategoryWeatherTypes).forEach(subCategory => {
      if (isSubCategoryWeatherMatch(subCategory, formattedWeather)) {
        suitableSubCategories.push(subCategory);
      }
    });
    
    console.log("\nSuitable subcategories based on default parameters:");
    console.log(suitableSubCategories);
    
    // Get count of items in database
    const totalItemCount = await Item.countDocuments({ userId: sampleUserId });
    console.log(`\nTotal items for user: ${totalItemCount}`);
    
    // Get count of items with custom weather parameters
    const customWeatherItemsCount = await Item.countDocuments({
      userId: sampleUserId,
      ...weatherQuery
    });
    console.log(`Items with matching custom weather parameters: ${customWeatherItemsCount}`);
    
    // Get count of items with default weather parameters
    const defaultWeatherItemsCount = await Item.countDocuments({
      userId: sampleUserId,
      subCategory: { $in: suitableSubCategories },
      $or: [
        { 'weatherType': { $size: 0 } },
        { 'weatherType': { $exists: false } }
      ]
    });
    console.log(`Items with matching default weather parameters: ${defaultWeatherItemsCount}`);
    
    // Get count of combined items
    console.log(`Total suitable items: ${customWeatherItemsCount + defaultWeatherItemsCount}`);
    
    // Close the database connection
    console.log("\nTest completed. Closing database connection...");
    await mongoose.connection.close();
  } catch (error) {
    console.error("Test error:", error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Connect to the database and run the test when connected
db.on('connected', () => {
  console.log('Connected to MongoDB. Running query test...');
  testQueries();
});

// Handle connection errors
db.on('error', (error) => {
  console.error('MongoDB connection error:', error.message);
  process.exit(1);
}); 