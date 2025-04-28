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
    const { username, password, firstName, lastName, age, gender, location } = req.body;

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

    // hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // create user with all provided profile fields
    const userData = {
      username,
      hashedPassword,
    };
    
    // Add optional fields if provided
    if (firstName) userData.firstName = firstName;
    if (lastName) userData.lastName = lastName;
    if (age !== undefined) userData.age = age;
    if (gender) userData.gender = gender;
    if (location) userData.location = location;
    
    const user = await User.create(userData);

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
    const { username, firstName, lastName, name, age, gender, password, location } = req.body;
    
    // Prepare update object with only the fields that were provided
    const updateData = {};
    if (username) updateData.username = username;
    
    // Handle name field - could be sent as firstName/lastName or as a single "name" field
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    
    // If frontend sends a single "name" field instead of firstName/lastName
    if (name) {
      // If name contains a space, split it into firstName and lastName
      const nameParts = name.split(' ');
      if (nameParts.length > 1) {
        updateData.firstName = nameParts[0];
        updateData.lastName = nameParts.slice(1).join(' ');
      } else {
        // If no space, assume it's just firstName
        updateData.firstName = name;
      }
    }
    
    if (age !== undefined) updateData.age = age;
    if (gender) updateData.gender = gender;
    if (location) updateData.location = location;
    
    // Handle password update separately since it needs to be hashed
    if (password) {
      updateData.hashedPassword = await bcrypt.hash(password, 10);
    }
    
    console.log('Updating user with data:', updateData); // Debugging
    
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
