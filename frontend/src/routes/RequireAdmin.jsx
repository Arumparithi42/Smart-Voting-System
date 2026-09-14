import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Navigate } from 'react-router-dom';
import axiosInstance from '../utils/axiosInstance';
import { Loader2 } from 'lucide-react';

// This is a UX convenience, not a security boundary: it stops a non-admin
// from landing on a form that will just 403 on submit. The actual
// authorization check lives server-side in middleware/auth.js's
// requireAdmin, which runs regardless of what this component does.
export default function RequireAdmin({ children }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const [status, setStatus] = useState('checking'); // 'checking' | 'admin' | 'not-admin'

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn) {
      setStatus('not-admin');
      return;
    }

    const checkAdmin = async () => {
      try {
        const response = await axiosInstance.post('/api/check-admin', { clerkId: user?.id });
        setStatus(response.data.isAdmin ? 'admin' : 'not-admin');
      } catch (error) {
        console.error('Error checking admin status:', error);
        setStatus('not-admin');
      }
    };

    checkAdmin();
  }, [isLoaded, isSignedIn, user]);

  if (status === 'checking') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-yellow-50">
        <Loader2 className="w-8 h-8 text-[#1e3a8a] animate-spin" />
      </div>
    );
  }

  if (status === 'not-admin') {
    return <Navigate to="/" replace />;
  }

  return children;
}
