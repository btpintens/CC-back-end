import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Item } from '../models/closet.js';
import '../db/connection.js';

dotenv.config();

const NEW_USER_ID = '680a7f147caaa278b0a0a336';

async function updateAllItemUserIds() {
  try {
    console.log('Starting userId update script...');
    
    // Find all items
    const items = await Item.find({});
    console.log(`Found ${items.length} items to update`);
    
    // Update all items with the new userId
    const result = await Item.updateMany(
      {}, // empty filter means all documents
      { userId: NEW_USER_ID }
    );
    
    console.log(`Successfully updated ${result.modifiedCount} items with new userId: ${NEW_USER_ID}`);
    
    // Verify the update
    const verifyCount = await Item.countDocuments({ userId: NEW_USER_ID });
    console.log(`Verification: ${verifyCount} items now have the new userId`);
    
    console.log('Update completed successfully!');
  } catch (error) {
    console.error('Error updating userIds:', error);
  } finally {
    // Close the database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}

// Run the update function
updateAllItemUserIds(); 