import User from '../models/User.js'; 


export const checkAdminStatus = async (req, res) => {
  const { clerkId } = req.body;
  try {
    const user = await User.findOne({ clerkId });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(200).json({ isAdmin: true });
    } else {
      return res.status(200).json({ isAdmin: false });
    }
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ error: 'Server error' });
  }
};
