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
