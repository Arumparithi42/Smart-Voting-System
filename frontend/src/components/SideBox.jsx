import { Link, useLocation } from 'react-router-dom';
import { SignOutButton } from "@clerk/clerk-react";
import { useState, useEffect, useCallback } from 'react';
import {
   Bell, ClipboardList, FileCheck2, FilePlus2, Gauge, HelpCircle, Home, LayoutDashboard, LogOut,
   MessageSquareWarning, ShieldCheck, UserCircle2, UserPlus, Users, Vote, X, BarChart3, IdCard,
} from 'lucide-react';

// Navigation per role. UX only - every permission is enforced by the backend.
const NAV = {
   user: [
      { section: 'Voting' },
      { to: '/elections', label: 'Elections', icon: Vote },
      { to: '/dashboard/elections', label: 'Voting History', icon: ClipboardList },
      { to: '/verify-receipt', label: 'Verify Receipt', icon: ShieldCheck },
      { to: '/apply-candidate', label: 'Apply as Candidate', icon: UserPlus },
      { section: 'Account' },
      { to: '/dashboard/notifications', label: 'Notifications', icon: Bell },
      { to: '/dashboard/complaints', label: 'My Complaints', icon: MessageSquareWarning },
      { to: '/dashboard/profile', label: 'Profile', icon: UserCircle2 },
      { to: '/dashboard/help', label: 'Help & Support', icon: HelpCircle },
   ],
   officer: [
      { section: 'Election Officer' },
      { to: '/dashboard/officer/proposals', label: 'Election Proposals', icon: FilePlus2 },
      { to: '/dashboard/officer/elections', label: 'Monitor Elections', icon: BarChart3 },
      { to: '/elections', label: 'Public Elections', icon: Vote },
      { section: 'Account' },
      { to: '/dashboard/notifications', label: 'Notifications', icon: Bell },
      { to: '/dashboard/complaints', label: 'My Complaints', icon: MessageSquareWarning },
      { to: '/dashboard/profile', label: 'Profile', icon: UserCircle2 },
      { to: '/dashboard/help', label: 'Help & Support', icon: HelpCircle },
   ],
   admin: [
      { section: 'Elections' },
      { to: '/dashboard/elections', label: 'Manage Elections', icon: Gauge },
      { to: '/dashboard/admin/proposals', label: 'Election Proposals', icon: FilePlus2 },
      { to: '/admin/candidate-applications', label: 'Candidate Applications', icon: FileCheck2 },
      { section: 'People' },
      { to: '/dashboard/admin/complaints', label: 'Complaints / Compliance', icon: MessageSquareWarning },
      { to: '/dashboard/admin/users', label: 'Officers & Users', icon: Users },
      { to: '/voter-registry', label: 'Voter Registry – Simulation', icon: IdCard },
      { section: 'Account' },
      { to: '/dashboard/notifications', label: 'Notifications', icon: Bell },
      { to: '/dashboard/profile', label: 'Profile', icon: UserCircle2 },
   ],
};

const isActive = (pathname, to) => (to === '/dashboard' ? pathname === '/dashboard' : pathname === to || pathname.startsWith(`${to}/`));

const SideBox = ({ isAdmin, role, open = false, onClose = () => {} }) => {
   const location = useLocation();
   const items = NAV[role || (isAdmin ? 'admin' : 'user')] || NAV.user;

   const [sidebarWidth, setSidebarWidth] = useState(() => {
      try {
         const parsed = parseInt(localStorage.getItem('sidebarWidth'), 10);
         if (!isNaN(parsed) && parsed >= 200 && parsed <= 360) return parsed;
      } catch { /* storage unavailable */ }
      return 256;
   });
   const [isResizing, setIsResizing] = useState(false);

   const startResizing = useCallback((e) => {
      e.preventDefault();
      setIsResizing(true);
   }, []);

   const stopResizing = useCallback(() => {
      setIsResizing(false);
      try { localStorage.setItem('sidebarWidth', sidebarWidth.toString()); } catch { /* ignore */ }
   }, [sidebarWidth]);

   const resize = useCallback((e) => {
      if (isResizing) setSidebarWidth(Math.min(360, Math.max(200, e.clientX)));
   }, [isResizing]);

   useEffect(() => {
      if (!isResizing) return undefined;
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', resize);
      window.addEventListener('mouseup', stopResizing);
      return () => {
         document.body.style.userSelect = '';
         window.removeEventListener('mousemove', resize);
         window.removeEventListener('mouseup', stopResizing);
      };
   }, [isResizing, resize, stopResizing]);

   // Close the mobile drawer on navigation.
   useEffect(() => { onClose(); }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

   const linkClass = (active) => `group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
      active ? 'bg-[#1E3A8A] text-white shadow-sm' : 'text-slate-700 hover:bg-slate-200/70 hover:text-[#1E3A8A]'
   }`;

   return (
      <>
      <style>
         {`
            @media (min-width: 1024px) {
               #logo-sidebar { width: ${sidebarWidth}px !important; }
               .lg\\:ml-64 { margin-left: ${sidebarWidth}px !important; }
            }
         `}
      </style>

      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={onClose} aria-hidden="true" />}

      <aside
         id="logo-sidebar"
         className={`fixed left-0 top-0 z-40 flex h-screen w-72 flex-col border-r border-slate-200 bg-slate-50 transition-transform lg:w-64 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
         aria-label="Sidebar"
      >
         <div onMouseDown={startResizing} className="absolute right-0 top-0 z-50 hidden h-full w-1.5 cursor-col-resize hover:bg-blue-400/30 active:bg-blue-400/50 lg:block" />

         <div className="flex items-center justify-between px-4 py-5">
            <Link to="/" className="flex items-center gap-2 text-xl font-extrabold text-[#1E3A8A]">
               <Vote className="h-7 w-7" aria-hidden="true" /> eVote
            </Link>
            <button onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-200 lg:hidden" aria-label="Close menu">
               <X className="h-5 w-5" />
            </button>
         </div>

         <nav className="flex-1 overflow-y-auto px-3 pb-4">
            <ul className="space-y-1">
               <li>
                  <Link to="/" className={linkClass(location.pathname === '/')}>
                     <Home className="h-5 w-5 shrink-0" aria-hidden="true" /> Home
                  </Link>
               </li>
               <li>
                  <Link to="/dashboard" className={linkClass(isActive(location.pathname, '/dashboard'))}>
                     <LayoutDashboard className="h-5 w-5 shrink-0" aria-hidden="true" /> Dashboard
                  </Link>
               </li>
               {items.map((item, i) => (item.section ? (
                  <li key={`s-${i}`} className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">{item.section}</li>
               ) : (
                  <li key={item.to}>
                     <Link to={item.to} className={linkClass(isActive(location.pathname, item.to))}>
                        <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.label}</span>
                     </Link>
                  </li>
               )))}
            </ul>
         </nav>

         <div className="border-t border-slate-200 p-3">
            <SignOutButton>
               <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1E3A8A] px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-800">
                  <LogOut className="h-4 w-4" aria-hidden="true" /> Log out
               </button>
            </SignOutButton>
         </div>
      </aside>
      </>
   );
}

export default SideBox;
