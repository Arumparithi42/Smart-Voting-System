import express from 'express';
import User from "../models/User.js";

const router = express.Router();

// Route to add a new user if clerkId is unique
router.post('/register', async (req, res) => {
    const { clerkId, email, firstName, lastName, profileUrl } = req.body;

    // Basic validation
    if (!clerkId || !email) {
        return res.status(400).json({ message: 'ClerkId and email are required' });
    }

    try {
        const existingUser = await User.findOne({ clerkId });
        if (existingUser) {
            return res.status(200).json({ message: 'User already exists', user: existingUser });
        }

        const safeFirstName = firstName || 'User';
        const newUser = new User({
            clerkId,
            email,
            firstName: safeFirstName,
            lastName: lastName || '',
            profileUrl: profileUrl || '',
            role: 'user'
        });

        await newUser.save();
        res.status(201).json({ message: 'User added successfully', user: newUser });
    } catch (error) {
        console.error('Register user error:', error);
        res.status(500).json({ message: 'Error adding user', error: error.message });
    }
});

export default router;
