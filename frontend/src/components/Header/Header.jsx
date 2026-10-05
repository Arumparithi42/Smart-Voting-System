import { useState } from 'react';
import { Menu, Vote, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import AvatarCom from '../AvatarCom';
import NotificationBell from '../notifications/NotificationBell';
import BackButton from '../ui/BackButton';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/elections', label: 'Elections' },
  { to: '/verify-receipt', label: 'Verify Receipt' },
  { to: '/contact', label: 'Contact' },
];

const Header = () => {
  const { user } = useUser();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const links = user ? [...LINKS.slice(0, 2), { to: '/dashboard', label: 'Dashboard' }, ...LINKS.slice(2)] : LINKS;
  const linkClass = (to) => `rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
    location.pathname === to ? 'text-orange-600' : 'text-blue-900 hover:text-amber-600'
  }`;

  return (
    <header className="sticky top-0 z-40 w-full border-b border-yellow-200/60 bg-gradient-to-r from-yellow-100 via-yellow-50 to-white/95 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6" aria-label="Main">
        <div className="flex items-center gap-1">
          <BackButton className="text-blue-900 hover:bg-yellow-200/60" />
          <Link to="/" className="flex items-center gap-2">
            <Vote className="h-8 w-8 text-blue-900" aria-hidden="true" />
            <span className="text-2xl font-bold text-blue-900">eVote</span>
          </Link>
        </div>
        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => <Link key={l.to} to={l.to} className={linkClass(l.to)}>{l.label}</Link>)}
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <NotificationBell />
              <AvatarCom />
            </>
          ) : (
            <div className="hidden gap-2 sm:flex">
              <Link to="/sign-in" className="rounded-full bg-amber-500 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600">Login</Link>
              <Link to="/sign-up" className="rounded-full bg-blue-900 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-800">Signup</Link>
            </div>
          )}
          <button onClick={() => setOpen((o) => !o)} className="rounded-md p-2 text-blue-900 hover:bg-yellow-200/60 md:hidden" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
            {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </nav>
      {open && (
        <div className="border-t border-yellow-200 bg-white px-4 py-2 md:hidden">
          {links.map((l) => <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className={`block ${linkClass(l.to)}`}>{l.label}</Link>)}
          {!user && (
            <div className="flex gap-2 py-2">
              <Link to="/sign-in" className="flex-1 rounded-full bg-amber-500 px-4 py-2 text-center text-sm font-semibold text-white">Login</Link>
              <Link to="/sign-up" className="flex-1 rounded-full bg-blue-900 px-4 py-2 text-center text-sm font-semibold text-white">Signup</Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
