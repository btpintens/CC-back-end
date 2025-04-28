// Load environment variables
import dotenv from 'dotenv';
dotenv.config();
// Import dependencies
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import logger from 'morgan';
import chalk from 'chalk';
import './db/connection.js'
// Import routes
import authRoutes from './routes/authRoutes.js';
import apiRoutes from './routes/index.js';
import closetRoutes from './routes/closet.js';
import userRoutes from './routes/userRoutes.js';

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(logger('dev'));

// Routes
app.use('/auth', authRoutes);
app.use('/api/items', closetRoutes);
app.use('/api/users', userRoutes);
app.use('/api', apiRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('🌤️ Cloud Closet API is running');
});

// Start server
app.listen(PORT, () => {
  console.log(chalk.green(`🚀 Server running on port ${PORT}`));
});
