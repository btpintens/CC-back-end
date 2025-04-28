import express from 'express';
import { getUserById } from '../controllers/userController.js';

const router = express.Router();

// Get user by ID
router.get('/:userId', getUserById);

export default router;
