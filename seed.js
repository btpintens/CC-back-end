import { faker } from '@faker-js/faker';
import fs from 'fs';

// Define categories/subcategories
const categories = {
  Shirt: ["T-Shirt", "Tank Top", "Long Sleeve", "Turtleneck", "Button-up", "Polo", "Blouse"],
  Pants: ["Jeans", "Khakis", "Trousers", "Leggings", "Shorts"],
  Sweater: ["Cardigan", "Lightweight", "Turtleneck"],
  Skirt: ["Mini", "Midi", "Maxi"],
  Dress: ["Mini", "Midi", "Maxi", "Sleeveless"],
  Shoes: ["Tennis Shoes", "Loafer", "Sandal", "Boot"],
  Jacket: ["Winter", "Rain", "Blazer"]
};

const userId = "65fb942d45c5b0b3e21cb6a0"; // example userId

const generateWeatherType = (type) => {
  if (type === 'full') {
    return [{
      maxTemp: faker.number.int({ min: 60, max: 100 }),
      minTemp: faker.number.int({ min: 30, max: 59 }),
      maxHumidity: faker.number.int({ min: 60, max: 100 }),
      minHumidity: faker.number.int({ min: 10, max: 59 }),
      maxUvIndex: faker.number.int({ min: 5, max: 11 }),
      minUvIndex: faker.number.int({ min: 0, max: 4 }),
      maxWind: faker.number.int({ min: 5, max: 30 }),
      precipType: faker.helpers.arrayElement(["none", "rain", "snow"]),
      precipIntensity: faker.helpers.arrayElement(["none", "light", "moderate", "heavy"]),
    }];
  } else if (type === 'tempOnly') {
    return [{
      maxTemp: faker.number.int({ min: 60, max: 100 }),
      minTemp: faker.number.int({ min: 30, max: 59 })
    }];
  } else {
    return [];
  }
};

const seedData = [];

for (const [category, subCategories] of Object.entries(categories)) {
  subCategories.forEach(subCategory => {
    for (let i = 0; i < 30; i++) {
      const weatherRand = Math.random();
      let weatherType = [];

      if (weatherRand < 0.50) {
        weatherType = generateWeatherType('full');
      } else if (weatherRand < 0.75) {
        weatherType = generateWeatherType('tempOnly');
      }

      seedData.push({
        userId,
        brand: faker.company.name(),
        name: `${faker.commerce.productAdjective()} ${subCategory}`,
        category,
        subCategory,
        color: faker.color.human(),
        imageUrl: faker.image.urlLoremFlickr({ category: 'fashion' }),
        image: {
          data: null,
          contentType: "image/jpeg"
        },
        weatherType,
        lastWorn: faker.date.past({ years: 1 }).toISOString()
      });
    }
  });
}

// Write seed data to JSON file
fs.writeFileSync('clothingSeedData.json', JSON.stringify(seedData, null, 2));
console.log("✅ clothingSeedData.json has been created.");
