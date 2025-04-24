import { Router } from 'express';
import outfitController from '../controllers/outfitController.js';

const router = Router();

// Route for getting clothing recommendations based on weather
router.post('/recommendations', outfitController.getWeatherBasedRecommendations);

// GET route for weather-based clothing recommendations
router.get('/recommendations/:userId', outfitController.getWeatherBasedRecommendations);

export default router; 