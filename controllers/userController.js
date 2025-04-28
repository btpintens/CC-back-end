import User from '../models/user.js';

/**
 * Retrieves a user profile by ID
 * @param {Object} req - Express request object with userId in params
 * @param {Object} res - Express response object
 * @returns {Object} User profile information
 */
export const getUserById = async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return user profile (password is already excluded by the model's toJSON configuration)
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
}; 