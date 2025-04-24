import { Router } from 'express';
import outfitController from '../controllers/outfitController.js';

const router = Router();


// GET route for weather-based clothing recommendations
router.get('/recommendations/:userId', outfitController.getWeatherBasedRecommendations);

export default router; 