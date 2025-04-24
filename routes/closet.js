import express from 'express';
import { createItem, getItems } from '../controllers/closetController.js';

const router = express.Router();

router.post('/', createItem);
router.get('/', getItems);

export default router;
