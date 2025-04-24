import { Item } from '../models/closet.js';

export const createItem = async (req, res) => {
  try {
    console.log("recieved", req.body);
    const item = await Item.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    console.log("error creating", err.message);
    res.status(400).json({ error: err.message });
  }
};

export const getItems = async (req, res) => {
    try {
      const items = await Item.find();
      res.json(items);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };