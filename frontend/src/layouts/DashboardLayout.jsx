import { useEffect, useState } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Menu } from 'lucide-react';
import SideBox from '../components/SideBox';
import NotificationBell from '../components/notifications/NotificationBell';
import useUserRole from '../hooks/useUserRole';

const ROLE_LABEL = { admin: 'Admin', officer: 'Election Officer', user: 'Voter' };

// Shared shell for every signed-in page: sidebar (drawer on mobile) + top
// bar with notifications and profile. Page content keeps the existing
// `lg:ml-64` convention so it sits beside the sidebar.
export default function DashboardLayout({ children }) {
  const { isSignedIn, user } = useUser();
  const { role } = useUserRole();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profile, setProfile] = useState(null);

  // Make sure the signed-in Clerk user has a User record (role always
  // 'user' server-side), then let role/profile consumers refresh.
  useEffect(() => {
    if (!isSignedIn || !user) return;
    axiosInstance.post('/api/auth/register', {
      clerkId: user.id,
      email: user.emailAddresses?.[0]?.emailAddress || '',
      firstName: user.firstName || 'User',
      lastName: user.lastName || '',
      profileUrl: user.imageUrl || '',
    })
      .then((res) => { if (res.status === 201) window.dispatchEvent(new Event('profile-updated')); })
      .catch((error) => console.error('Error saving user data:', error?.response?.data?.message || error.message));
  }, [isSignedIn, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Display name / photo from our own profile (editable on the Profile page).
  useEffect(() => {
    const load = () => axiosInstance.get('/api/profile').then((res) => setProfile(res.data)).catch(() => {});
    load();
    window.addEventListener('profile-updated', load);
    return () => window.removeEventListener('profile-updated', load);
  }, []);
  const photo = profile?.profileUrl || user?.imageUrl;
  const firstName = profile?.firstName || user?.firstName;

  return (
    <div className="app-ui min-h-screen bg-slate-50">
      <SideBox isAdmin={role === 'admin'} role={role} open={menuOpen} onClose={() => setMenuOpen(false)} />
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur lg:ml-64">
        <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-8">
          <div className="flex items-center gap-2">
            <button onClick={() => setMenuOpen(true)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu">
              <Menu className="h-6 w-6" />
            </button>
            {role && (
              <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 sm:inline">
                {ROLE_LABEL[role] || 'Voter'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Link to="/dashboard/profile" className="flex items-center gap-2 rounded-full p-1 pr-2 hover:bg-slate-100" aria-label="Profile">
              {photo
                ? <img src={photo} alt="" className="h-8 w-8 rounded-full object-cover" />
                : <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E3A8A] text-sm font-bold text-white">{(firstName || 'U')[0]}</span>}
              <span className="hidden text-sm font-medium text-slate-700 sm:inline">{firstName}</span>
            </Link>
          </div>
        </div>
      </header>
      {children}
      {/* Clearance so the floating assistant button never covers the last row. */}
      <div className="h-24" aria-hidden="true" />
    </div>
  );
}
