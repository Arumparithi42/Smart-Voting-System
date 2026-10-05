import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import useUserRole from '../hooks/useUserRole';

// UX guard only (like RequireAdmin): keeps users off pages whose API calls
// would just 403. The real authorization is enforced by the backend.
export default function RequireRole({ roles, children }) {
  const { role, loading } = useUserRole();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#1e3a8a] animate-spin" />
      </div>
    );
  }

  if (!role || !roles.includes(role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
