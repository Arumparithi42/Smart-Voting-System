import { useCallback, useEffect, useState } from 'react';
import axiosInstance from '../utils/axiosInstance';

const POLL_MS = 60_000;

// The signed-in user's own notifications (the API only ever returns theirs).
export default function useNotifications({ poll = true, limit = 30 } = {}) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const res = await axiosInstance.get(`/api/notifications?limit=${limit}`);
      setNotifications(res.data.notifications);
      setUnreadCount(res.data.unreadCount);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load notifications.');
    } finally {
      setLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    refresh();
    if (!poll) return undefined;
    const timer = setInterval(refresh, POLL_MS);
    return () => clearInterval(timer);
  }, [refresh, poll]);

  const markRead = useCallback(async (id) => {
    const res = await axiosInstance.patch(`/api/notifications/${id}/read`);
    setNotifications((list) => list.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
    setUnreadCount(res.data.unreadCount);
  }, []);

  const markAllRead = useCallback(async () => {
    await axiosInstance.patch('/api/notifications/read-all');
    setNotifications((list) => list.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }, []);

  return { notifications, unreadCount, loading, error, refresh, markRead, markAllRead };
}
