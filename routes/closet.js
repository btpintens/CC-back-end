import express from 'express';
import { createItem, getItems } from '../controllers/closetController.js';

const router = express.Router();

router.get('/ping', (req, res) => {
  res.send('Closet route is working');
});

router.post('/', createItem);
router.get('/', getItems);

export default router;
