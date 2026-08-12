import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';

// Initialize dotenv to access environment variables
dotenv.config();

const app = express();

// Define allowed origins for CORS
const allowedOrigins = [
  'https://e-vote-flax.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

// Middleware for CORS with conditional origin handling
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true); // Allow the origin
    } else {
      callback(null, true); // Allow all origins during development for easier local testing
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));



// Middleware for parsing JSON
app.use(express.json());

// Import routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import votingRoutes from './routes/voting.js';

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api',votingRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((error) => console.log("MongoDB connection error:", error));

// Base route
app.get('/', (req, res) => {
  res.send("Welcome to the Online Gas Booking System API!");
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
