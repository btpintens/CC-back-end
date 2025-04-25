import { Router } from 'express';
import outfitController from '../controllers/outfitController.js';

const router = Router();


// GET route for weather-based clothing recommendations
router.get('/recommendations/:userId', outfitController.getWeatherRecommendationsGet);

// GET route for fetching all wardrobe items
router.get('/wardrobe/:userId', outfitController.getAllWardrobeItems);

// POST route for adding a new wardrobe item
router.post('/wardrobe/:userId', outfitController.addWardrobeItem);

export default router; 