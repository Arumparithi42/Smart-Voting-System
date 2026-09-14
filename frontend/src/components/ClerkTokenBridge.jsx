import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { setTokenGetter } from '../utils/clerkToken';

// Renders nothing - just keeps axiosInstance's token source pointed at
// Clerk's current getToken() once Clerk has actually finished loading.
// useAuth()'s isLoaded flag is Clerk's own readiness signal, so this is
// reliable in a way that reading window.Clerk directly was not.
export default function ClerkTokenBridge() {
  const { isLoaded, getToken } = useAuth();

  useEffect(() => {
    if (isLoaded) {
      setTokenGetter(getToken);
    }
  }, [isLoaded, getToken]);

  return null;
}
