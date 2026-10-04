import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { simpleRateLimit } from '../middleware/rateLimit.js';
import { answerChat, MAX_MESSAGE_LENGTH, DEFAULT_SUGGESTIONS } from '../services/chatbotService.js';

const router = express.Router();

// Read-only assistant for signed-in users. Answers are scoped to the
// caller's verified session (req.clerkId) - see services/chatbotService.js.
router.post(
  '/message',
  requireAuth,
  simpleRateLimit({
    windowMs: 60_000,
    max: Number(process.env.CHATBOT_RATE_LIMIT_PER_MIN || 20),
    keyPrefix: 'chatbot',
    keyBy: (req) => req.clerkId,
  }),
  async (req, res) => {
    try {
      const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
      if (!message) return res.status(400).json({ message: 'Please type a question.' });
      if (message.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({ message: `Questions can be at most ${MAX_MESSAGE_LENGTH} characters.` });
      }
      const result = await answerChat({ clerkId: req.clerkId, message, history: req.body.history });
      res.status(200).json(result);
    } catch (error) {
      console.error('Chatbot error:', error.message);
      res.status(500).json({ message: 'The assistant is unavailable right now. Please try again.' });
    }
  }
);

router.get('/suggestions', requireAuth, (req, res) => {
  res.status(200).json({ suggestions: DEFAULT_SUGGESTIONS });
});

export default router;
