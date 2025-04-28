import express from 'express';
import { signup, login, getProfile, updateProfile } from '../controllers/authController.js';
import auth from '../middleware/authMiddleware.js';

const router = express.Router();

// Authentication routes
router.post('/signup', signup);
router.post('/login', login);

// Profile routes (protected)
router.get('/profile', auth, getProfile);
router.put('/profile', auth, updateProfile);

export default router;
