import mongoose from 'mongoose';
import 'dotenv/config';
import db from './db/connection.js';
import { Item } from './models/closet.js';
import outfitController from './controllers/outfitController.js';
import subCategoryWeatherTypes from './defaultWeather/defaultWeather.js';

// Sample weather data (similar to what would come from the frontend)
const sampleWeatherData = {
  "location": {
    "name": "New York",
    "region": "New York",
    "country": "United States of America",
    "lat": 40.7142,
    "lon": -74.0064,
    "tz_id": "America/New_York",
    "localtime_epoch": 1745350941,
    "localtime": "2025-04-22 15:42"
  },
  "current": {
    "last_updated_epoch": 1745350200,
    "last_updated": "2025-04-22 15:30",
    "temp_c": 18.3, // Nice spring day
    "temp_f": 65.0, // Pleasant temperate day
    "is_day": 1,
    "condition": {
      "text": "Sunny",
      "icon": "//cdn.weatherapi.com/weather/64x64/day/113.png",
      "code": 1000
    },
    "wind_mph": 5.6,
    "wind_kph": 9.0,
    "wind_degree": 270,
    "wind_dir": "W",
    "pressure_mb": 1018.0,
    "pressure_in": 30.06,
    "precip_mm": 0.0, // No precipitation
    "precip_in": 0.0,
    "humidity": 45, // Dry comfortable day
    "cloud": 5,
    "feelslike_c": 18.3,
    "feelslike_f": 65.0,
    "windchill_c": 18.3,
    "windchill_f": 65.0,
    "heatindex_c": 18.3,
    "heatindex_f": 65.0,
    "dewpoint_c": 6.4,
    "dewpoint_f": 43.5,
    "vis_km": 16.0, // Good visibility
    "vis_miles": 10.0,
    "uv": 6.0, // Moderate to high UV index for a sunny day
    "gust_mph": 8.5,
    "gust_kph": 13.7
  }
};

// Sample user ID (replace with a real user ID from your database)
const sampleUserId = "65fb942d45c5b0b3e21cb6a0";

// Helper function to display weather parameters in a readable format
const formatWeatherParamsForDisplay = (weatherParams) => {
  if (!weatherParams) return "None";
  
  return `Temperature: ${weatherParams.minTemp || 'N/A'}°F - ${weatherParams.maxTemp || 'N/A'}°F, ` +
         `Humidity: ${weatherParams.minHumidity || 'N/A'}% - ${weatherParams.maxHumidity || 'N/A'}%, ` +
         `UV: ${weatherParams.minUvIndex || 'N/A'} - ${weatherParams.maxUvIndex || 'N/A'}, ` +
         `Wind: ≤ ${weatherParams.maxWind || 'N/A'} mph, ` +
         `Precip: ${weatherParams.precipType || 'N/A'} (${weatherParams.precipIntensity || 'N/A'})`;
};

// Function to test the recommendations logic
const testRecommendations = async () => {
  try {
    console.log("===================================================");
    console.log("STARTING WEATHER-BASED CLOTHING RECOMMENDATION TEST");
    console.log("===================================================");
    console.log("\nWeather conditions:", {
      temperature: sampleWeatherData.current.temp_f + "°F",
      humidity: sampleWeatherData.current.humidity + "%",
      wind: sampleWeatherData.current.wind_mph + " mph",
      uv: sampleWeatherData.current.uv,
      precipitation: sampleWeatherData.current.precip_mm + " mm (sunny, no precipitation)"
    });
    
    console.log("\nFetching recommendations...");
    console.log("---------------------------------------------------");
    
    // Add debug version of the formatting function to see what's happening
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
    
    // Show the formatted weather data that will be used for filtering
    const formattedWeather = formatWeatherData(sampleWeatherData);
    console.log("Formatted weather data for filtering:", formattedWeather);
    
    // Get suitable subcategories
    console.log("\nChecking which subcategories are suitable for this weather:");
    const suitableSubcats = [];
    Object.keys(subCategoryWeatherTypes).forEach(subcat => {
      const isMatch = isSubCategoryWeatherMatch(subcat, formattedWeather);
      console.log(`${subcat}: ${isMatch ? '✓' : '✗'}`);
      if (isMatch) suitableSubcats.push(subcat);
    });
    
    console.log(`\nTotal suitable subcategories: ${suitableSubcats.length}/${Object.keys(subCategoryWeatherTypes).length}`);
    console.log("---------------------------------------------------");

    // Helper function to check if a subcategory is suitable for current weather
    function isSubCategoryWeatherMatch(subCategory, currentWeather) {
      const defaultParams = subCategoryWeatherTypes[subCategory];
      
      if (!defaultParams) return false;
      
      // Temperature check
      if (defaultParams.maxTemp && currentWeather.temp_f > defaultParams.maxTemp) return false;
      if (defaultParams.minTemp && currentWeather.temp_f < defaultParams.minTemp) return false;
      
      // Humidity check
      if (defaultParams.maxHumidity && currentWeather.humidity > defaultParams.maxHumidity) return false;
      if (defaultParams.minHumidity && currentWeather.humidity < defaultParams.minHumidity) return false;
      
      // UV check
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
    }

    // Get the recommendations
    const recommendations = await outfitController.getWeatherBasedRecommendations({
      body: {
        weatherData: sampleWeatherData,
        userId: sampleUserId
      }
    }, {
      status: (code) => ({
        json: (data) => {
          // Mock response object
          console.log(`Response status: ${code}`);
          return data;
        }
      })
    });

    // Log the number of items in each category
    if (recommendations.success) {
      console.log("\nRecommendation summary:");
      Object.entries(recommendations.recommendations).forEach(([category, items]) => {
        console.log(`${category}: ${items.length} items`);
      });

      // Log a sample of items for each category (limit to 3 per category)
      console.log("\nSample items from each category:");
      Object.entries(recommendations.recommendations).forEach(([category, items]) => {
        if (items.length > 0) {
          console.log(`\n${category} samples:`);
          items.slice(0, 3).forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.name} (${item.subCategory}) - Color: ${item.color}`);
            
            // Check if item has custom weather parameters or using default
            if (item.weatherType && item.weatherType.length > 0) {
              console.log(`     Custom Weather Parameters:`);
              item.weatherType.forEach((params, pIndex) => {
                const isMatchTemp = (!params.maxTemp || params.maxTemp >= formattedWeather.temp_f) && 
                                   (!params.minTemp || params.minTemp <= formattedWeather.temp_f);
                const isMatchPrecip = params.precipType === "any" || 
                                     (params.precipType === formattedWeather.precipType) ||
                                     (formattedWeather.precipType === "none");
                console.log(`     - Set ${pIndex + 1}: ${formatWeatherParamsForDisplay(params)}`);
                console.log(`       Temperature match: ${isMatchTemp ? '✓' : '✗'} (Current: ${formattedWeather.temp_f}°F)`);
                console.log(`       Precipitation match: ${isMatchPrecip ? '✓' : '✗'} (Current: ${formattedWeather.precipType} - ${formattedWeather.precipIntensity})`);
              });
            } else {
              // If no custom params, show the default parameters for this subcategory
              const defaultParams = subCategoryWeatherTypes[item.subCategory];
              const isMatchTemp = (!defaultParams.maxTemp || defaultParams.maxTemp >= formattedWeather.temp_f) && 
                                 (!defaultParams.minTemp || defaultParams.minTemp <= formattedWeather.temp_f);
              const isMatchPrecip = defaultParams.precipType === "any" || 
                                   (defaultParams.precipType === formattedWeather.precipType) ||
                                   (formattedWeather.precipType === "none");
              console.log(`     Using Default Weather Parameters:`);
              console.log(`     - ${formatWeatherParamsForDisplay(defaultParams)}`);
              console.log(`       Temperature match: ${isMatchTemp ? '✓' : '✗'} (Current: ${formattedWeather.temp_f}°F)`);
              console.log(`       Precipitation match: ${isMatchPrecip ? '✓' : '✗'} (Current: ${formattedWeather.precipType} - ${formattedWeather.precipIntensity})`);
            }
            console.log(''); // Add blank line for readability
          });
        }
      });
    } else {
      console.error("Error:", recommendations.error);
    }

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
  console.log('Connected to MongoDB. Running test...');
  testRecommendations();
});

// Handle connection errors
db.on('error', (error) => {
  console.error('MongoDB connection error:', error.message);
  process.exit(1);
}); 