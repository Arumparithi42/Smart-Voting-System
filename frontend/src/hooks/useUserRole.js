import { useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import axiosInstance from '../utils/axiosInstance';

// Returns { role, loading } for the signed-in user: 'user' | 'officer' |
// 'admin' (or null when signed out). UX only - every protected API route
// re-checks the role server-side, so a tampered value here only changes
// which buttons are shown, never what the backend allows.
export default function useUserRole() {
  const { isLoaded, isSignedIn } = useUser();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setRole(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = () => axiosInstance
      .post('/api/check-admin')
      .then((res) => {
        if (!cancelled) setRole(res.data.role || (res.data.isAdmin ? 'admin' : 'user'));
      })
      .catch(() => {
        if (!cancelled) setRole('user');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    load();
    // Re-check after first-login registration (see DashboardLayout).
    window.addEventListener('profile-updated', load);
    return () => {
      cancelled = true;
      window.removeEventListener('profile-updated', load);
    };
  }, [isLoaded, isSignedIn]);

  return { role, loading };
}
