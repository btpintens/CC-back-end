import mongoose from 'mongoose';
import 'dotenv/config';
import db from './db/connection.js';
import outfitController from './controllers/outfitController.js';

// Sample user ID 
const sampleUserId = "65fb942d45c5b0b3e21cb6a0";

// Function to get the recommendations output
const getOutput = async () => {
  try {
    // Create sample weather data
    const sampleWeatherData = {
      "location": {
        "name": "New York",
        "region": "New York",
        "country": "United States of America",
        "lat": 40.7142,
        "lon": -74.0064,
        "tz_id": "America/New_York",
        "localtime": "2025-04-22 15:42"
      },
      "current": {
        "temp_c": 7.8,
        "temp_f": 22.0,
        "is_day": 1,
        "condition": {
          "text": "Light Rain",
          "icon": "//cdn.weatherapi.com/weather/64x64/day/296.png",
          "code": 1183
        },
        "wind_mph": 12.5,
        "wind_kph": 20.1,
        "wind_dir": "W",
        "pressure_mb": 1010.0,
        "precip_mm": 1.5,
        "precip_in": 0.06,
        "humidity": 75,
        "cloud": 70,
        "feelslike_f": 42.0,
        "uv": 3.0
      }
    };

    // Get raw recommendations using the controller function
    const response = await new Promise(resolve => {
      outfitController.getWeatherBasedRecommendations({
        body: {
          weatherData: sampleWeatherData,
          userId: sampleUserId
        }
      }, {
        status: (code) => ({
          json: (data) => {
            resolve(data);
            return { status: code };
          }
        })
      });
    });

    // Output only the raw response data
    console.log(JSON.stringify(response, null, 2));

    // Close the database connection
    await mongoose.connection.close();
  } catch (error) {
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Connect to the database and run
db.on('connected', () => {
  getOutput();
});

db.on('error', (error) => {
  console.error('MongoDB connection error:', error);
  process.exit(1);
}); 