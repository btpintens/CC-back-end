import { Router } from 'express';
import outfitController from '../controllers/outfitController.js';

const router = Router();

// Route for getting clothing recommendations based on weather
router.post('/recommendations', outfitController.getWeatherBasedRecommendations);

export default router; 