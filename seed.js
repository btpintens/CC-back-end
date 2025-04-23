import fs from 'fs';
import mongoose from 'mongoose';
import db from './db/connection.js';
import { Item } from './models/closet.js';
import 'dotenv/config';

// Use existing seed data from file
let seedData = [];
try {
  const fileData = fs.readFileSync('clothingSeedData.json', 'utf8');
  seedData = JSON.parse(fileData);
  console.log(`✅ Loaded ${seedData.length} items from clothingSeedData.json`);
} catch (error) {
  console.error('Error reading clothingSeedData.json:', error.message);
  process.exit(1);
}

// Import data to MongoDB
const seedDB = async () => {
  try {
    // Clear existing data
    await Item.deleteMany({});
    console.log('✅ Cleared existing items from database');
    
    // Insert new data
    const insertedData = await Item.insertMany(seedData);
    console.log(`✅ Successfully seeded ${insertedData.length} items to database`);
    
    // Close database connection
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  } catch (error) {
    console.error('Error seeding database:', error.message);
  }
};

// Connect to the database, then seed data
db.on('open', () => {
  console.log('MongoDB connected, beginning seed operation...');
  seedDB();
});

// Handle connection errors
db.on('error', (error) => {
  console.error('MongoDB connection error:', error.message);
  process.exit(1);
});
