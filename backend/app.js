import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import { clerkMiddleware } from '@clerk/express';
import { pathToFileURL } from 'url';
import { sanitizeInput } from './middleware/sanitize.js';

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
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
  // Lets the frontend read the server clock for countdown display.
  exposedHeaders: ['X-Server-Time']
}));

// Middleware for parsing JSON (bounded, so huge bodies are rejected early)
app.use(express.json({ limit: '100kb' }));

// Strip "$operator" / dotted keys from all client input (NoSQL injection).
app.use(sanitizeInput);

// The server/database clock is the source of truth for election timing;
// the frontend uses this only to correct its countdown display.
app.use((req, res, next) => {
  res.setHeader('X-Server-Time', new Date().toISOString());
  next();
});

// Attaches Clerk auth info (if a valid session token is present) to every
// request as req.auth / usable via getAuth(req). Individual routes still
// decide whether auth is required via requireAuth/requireAdmin.
app.use(clerkMiddleware());

// Import routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import votingRoutes from './routes/voting.js';
import voterRoutes from './routes/voter.js';
import applicationRoutes from './routes/applications.js';
import officerRoutes from './routes/officer.js';
import complaintRoutes from './routes/complaints.js';
import notificationRoutes from './routes/notifications.js';
import profileRoutes from './routes/profile.js';
import chatbotRoutes from './routes/chatbot.js';
import mediaRoutes from './routes/media.js';
import feedbackRoutes from './routes/feedback.js';
import { startNotificationScheduler } from './services/notificationService.js';
import { verifyEmailSetup } from './services/emailService.js';

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api',votingRoutes);
app.use('/api/voter', voterRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/officer', officerRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/media', mediaRoutes);
app.use('/api/feedback', feedbackRoutes);

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

export default app;

// Connect + listen only when run directly (`node app.js` / `npm start`), so
// tests can import the configured app without starting a server.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // MongoDB connection
  mongoose.connect(process.env.MONGO_URI)
    .then(() => {
      console.log("MongoDB connected");
      // Election reminders run server-side, independent of any browser.
      startNotificationScheduler();
    })
    .catch((error) => console.log("MongoDB connection error:", error));

  // Start the server
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    verifyEmailSetup().then((status) => console.log(status));
  });
}
