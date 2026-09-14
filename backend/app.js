import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';

// Initialize dotenv to access environment variables
dotenv.config();

if (!process.env.CLERK_SECRET_KEY) {
  console.error('Missing CLERK_SECRET_KEY in environment - admin routes and voting will not work. See .env.example.');
}

const app = express();

// Define allowed origins for CORS. In dev, VITE_DEV_ORIGIN (or the defaults
// below) let you run the frontend locally; in production only the deployed
// frontend origin(s) should be listed here.
const allowedOrigins = [
  'https://e-vote-flax.vercel.app',
  'http://localhost:5173',
  'http://127.0.0.1:5173'
];

// Middleware for CORS - only origins on the allow-list (or same-origin/
// server-to-server requests with no Origin header) are permitted.
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      const corsError = new Error(`Origin ${origin} is not allowed by CORS`);
      corsError.status = 403;
      callback(corsError);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware for parsing JSON
app.use(express.json());

// Attaches Clerk auth info (if a valid session token is present) to every
// request as req.auth / usable via getAuth(req). Individual routes still
// decide whether auth is required via requireAuth/requireAdmin.
app.use(clerkMiddleware());

// Import routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import votingRoutes from './routes/voting.js';
import voterRoutes from './routes/voter.js';

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api',votingRoutes);
app.use('/api/voter', voterRoutes);

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((error) => console.log("MongoDB connection error:", error));

// Base route
app.get('/', (req, res) => {
  res.send("Welcome to the Smart Voting System API!");
});

// Central error handler - e.g. turns CORS rejections into clean JSON
// instead of an HTML 500 page.
app.use((err, req, res, next) => {
  console.error(err.message);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
