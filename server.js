// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

// Import dependencies
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import logger from 'morgan';
import chalk from 'chalk';

// Import routes
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/index.js';

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(logger('dev'));

// Routes
app.use('/auth', authRoutes);
app.use('/api', apiRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => {
    console.clear();
    console.log(chalk.blue('✅ Connected to MongoDB'));
  })
  .catch((err) => {
    console.error(chalk.red('❌ MongoDB connection error:'), err);
  });

// Test route
app.get('/', (req, res) => {
  res.send('🌤️ Cloud Closet API is running');
});

// Start server
app.listen(PORT, () => {
  console.log(chalk.green(`🚀 Server running on port ${PORT}`));
});
