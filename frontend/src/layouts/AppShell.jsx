import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Menu } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';
import { mediaUrl } from '../utils/media';
import SideBox from '../components/SideBox';
import Header from '../components/Header/Header';
import NotificationBell from '../components/notifications/NotificationBell';
import BackButton from '../components/ui/BackButton';
import useUserRole from '../hooks/useUserRole';
import { LoadingState } from '../components/ui/States';

const ROLE_LABEL = { admin: 'Admin', officer: 'Election Officer', user: 'Voter' };

// ONE layout for every page, so navigation never moves around:
//  - signed in:  the same sidebar (Home / Elections / Dashboard + role
//                links) and top bar (Back, notifications, profile) on
//                every page - Home and public pages included;
//  - signed out: the public header (with Back) on every page.
export default function AppShell() {
  const { isLoaded, isSignedIn, user } = useUser();
  const { role } = useUserRole();
  const [menuOpen, setMenuOpen] = useState(false);
  // Desktop sidebar collapsed to an icon rail (remembered per browser).
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebarCollapsed') === '1'; } catch { return false; }
  });
  const toggleCollapsed = () => setCollapsed((c) => {
    try { localStorage.setItem('sidebarCollapsed', c ? '0' : '1'); } catch { /* storage unavailable */ }
    return !c;
  });
  const [profile, setProfile] = useState(null);

  // Ensure the signed-in Clerk user has a User record (role always 'user'
  // server-side), then let role/profile consumers refresh.
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

  useEffect(() => {
    if (!isSignedIn) { setProfile(null); return undefined; }
    const load = () => axiosInstance.get('/api/profile').then((res) => setProfile(res.data)).catch(() => {});
    load();
    window.addEventListener('profile-updated', load);
    return () => window.removeEventListener('profile-updated', load);
  }, [isSignedIn]);

  // Until Clerk knows who this is, show neither navigation (no flash of
  // the wrong one).
  if (!isLoaded) {
    return <div className="app-ui min-h-screen bg-slate-50"><LoadingState label="Loading…" /></div>;
  }

  if (!isSignedIn) {
    return (
      <div className="app-ui min-h-screen">
        <Header />
        <Outlet />
      </div>
    );
  }

  const photo = mediaUrl(profile?.photoPath) || profile?.profileUrl || user?.imageUrl;
  const firstName = profile?.firstName || user?.firstName;

  return (
    <div className="app-ui min-h-screen bg-slate-50">
      <SideBox
        isAdmin={role === 'admin'}
        role={role}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
      />
      <div className="lg:ml-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="flex h-14 items-center justify-between gap-3 px-3 sm:px-6">
            <div className="flex items-center gap-1">
              <button onClick={() => setMenuOpen(true)} className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu" aria-expanded={menuOpen}>
                <Menu className="h-6 w-6" />
              </button>
              <BackButton />
              {role && (
                <span className="ml-1 hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 sm:inline">
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
        <main>
          <Outlet />
        </main>
        {/* Clearance so the floating assistant button never covers the last row. */}
        <div className="h-24" aria-hidden="true" />
      </div>
    </div>
  );
}
