import { Item } from '../models/closet.js';

export const createItem = async (req, res) => {
  try {
    // Check if userId is provided in the request body
    if (!req.body.userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const item = await Item.create(req.body);
    res.status(201).json(item);
  } catch (err) {
    console.error('Error creating item:', err);
    res.status(400).json({ error: err.message });
  }
};

export const getItems = async (req, res) => {
  try {
    const { userId } = req.query;
    
    // If userId is provided, filter items by that user
    let query = {};
    if (userId) {
      query.userId = userId;
    }
    
    const items = await Item.find(query);
    
    if (items.length === 0) {
      return res.status(200).json({ message: 'No items found', items: [] });
    }
    
    res.status(200).json({ items });
  } catch (err) {
    console.error('Error fetching items:', err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
};

export const getItemById = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Item ID is required' });
    }
    
    const item = await Item.findById(id);
    
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.status(200).json(item);
  } catch (err) {
    console.error('Error fetching item:', err);
    res.status(500).json({ error: 'Failed to fetch item' });
  }
};

export const updateItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (!id) {
      return res.status(400).json({ error: 'Item ID is required' });
    }
    
    // Find the item and update it
    const updatedItem = await Item.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true } // returns the updated document & runs schema validators
    );
    
    if (!updatedItem) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.status(200).json(updatedItem);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Failed to update item' });
  }
};

export const deleteItem = async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!id) {
      return res.status(400).json({ error: 'Item ID is required' });
    }
    
    const deletedItem = await Item.findByIdAndDelete(id);
    
    if (!deletedItem) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    res.status(200).json({ message: 'Item deleted successfully', item: deletedItem });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ error: 'Failed to delete item' });
  }
};