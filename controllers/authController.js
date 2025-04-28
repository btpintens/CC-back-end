// controllers/authController.js
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import User from '../models/user.js';
import dotenv from 'dotenv';
dotenv.config();

const createToken = (user) => {
  return jwt.sign(
    { _id: user._id, username: user.username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

export const signup = async (req, res) => {
  try {
    const { username, password } = req.body;

    // require both fields
    if (!username || !password) {
      return res
        .status(400)
        .json({ error: 'Username and password are required' });
    }

    // check for existing user
    const existing = await User.findOne({ username });
    if (existing) {
      return res
        .status(400)
        .json({ error: 'Username already in use' });
    }

    // hash & create
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ username, hashedPassword });

    // issue token
    const token = createToken(user);
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || 'Sign-up failed' });
  }
};

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // find user
    const user = await User.findOne({ username });
    if (
      !user ||
      !(await bcrypt.compare(password, user.hashedPassword))
    ) {
      return res
        .status(401)
        .json({ error: 'Invalid credentials' });
    }

    // issue token
    const token = createToken(user);
    res.json({ token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
};

export const getProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const { username, firstName, lastName, age, gender, password } = req.body;
    
    // Prepare update object with only the fields that were provided
    const updateData = {};
    if (username) updateData.username = username;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (age !== undefined) updateData.age = age;
    if (gender) updateData.gender = gender;
    
    // Handle password update separately since it needs to be hashed
    if (password) {
      updateData.hashedPassword = await bcrypt.hash(password, 10);
    }
    
    // Find user and update
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    
    // Handle duplicate username error
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    res.status(500).json({ error: 'Failed to update profile' });
  }
};
