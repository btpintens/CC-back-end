import express from 'express';
import { createItem, getItems, getItemById } from '../controllers/closetController.js';

const router = express.Router();

router.post('/', createItem);
router.get('/', getItems);
router.get('/:id', getItemById);

export default router;
