import { Link, useLocation } from 'react-router-dom';
import { SignOutButton } from "@clerk/clerk-react";
import { useState, useEffect, useCallback } from 'react';
import {
   Bell, ClipboardList, FileCheck2, FilePlus2, Gauge, HelpCircle, Home, LayoutDashboard, LogOut,
   MessageSquareWarning, MailWarning, MessageSquareHeart, PanelLeftClose, PanelLeftOpen, ShieldCheck, UserCircle2, UserPlus, Users, Vote, X, BarChart3, IdCard,
} from 'lucide-react';

// Home / Elections / Dashboard are always the first three entries for every
// role (rendered below), then the role's own sections. UX only - every
// permission is enforced by the backend.
const NAV = {
   user: [
      { section: 'Voting' },
      { to: '/dashboard/elections', label: 'Voting History', icon: ClipboardList },
      { to: '/verify-receipt', label: 'Verify Receipt', icon: ShieldCheck },
      { to: '/apply-candidate', label: 'Apply as Candidate', icon: UserPlus },
      { section: 'Account' },
      { to: '/dashboard/notifications', label: 'Notifications', icon: Bell },
      { to: '/dashboard/complaints', label: 'My Complaints', icon: MessageSquareWarning },
      { to: '/dashboard/feedback', label: 'Feedback', icon: MessageSquareHeart },
      { to: '/dashboard/profile', label: 'Profile', icon: UserCircle2 },
      { to: '/dashboard/help', label: 'Help & Support', icon: HelpCircle },
   ],
   officer: [
      { section: 'Election Officer' },
      { to: '/dashboard/officer/proposals', label: 'Election Proposals', icon: FilePlus2 },
      { to: '/dashboard/officer/elections', label: 'Monitor Elections', icon: BarChart3 },
      { section: 'Account' },
      { to: '/dashboard/notifications', label: 'Notifications', icon: Bell },
      { to: '/dashboard/complaints', label: 'My Complaints', icon: MessageSquareWarning },
      { to: '/dashboard/feedback', label: 'Feedback', icon: MessageSquareHeart },
      { to: '/dashboard/profile', label: 'Profile', icon: UserCircle2 },
      { to: '/dashboard/help', label: 'Help & Support', icon: HelpCircle },
   ],
   admin: [
      { section: 'Elections' },
      { to: '/dashboard/elections', label: 'Manage Elections', icon: Gauge },
      { to: '/dashboard/admin/proposals', label: 'Election Proposals', icon: FilePlus2 },
      { to: '/admin/candidate-applications', label: 'Candidate Applications', icon: FileCheck2 },
      { to: '/dashboard/admin/result-emails', label: 'Result Emails', icon: MailWarning },
      { section: 'People' },
      { to: '/dashboard/admin/complaints', label: 'Complaints / Compliance', icon: MessageSquareWarning },
      { to: '/dashboard/admin/feedback', label: 'User Feedback', icon: MessageSquareHeart },
      { to: '/dashboard/admin/users', label: 'Officers & Users', icon: Users },
      { to: '/voter-registry', label: 'Voter Registry – Simulation', icon: IdCard },
      { section: 'Account' },
      { to: '/dashboard/notifications', label: 'Notifications', icon: Bell },
      { to: '/dashboard/profile', label: 'Profile', icon: UserCircle2 },
   ],
};

const isActive = (pathname, to) => (to === '/dashboard' ? pathname === '/dashboard' : pathname === to || pathname.startsWith(`${to}/`));

const TOP_LINKS = [
   { to: '/', label: 'Home', icon: Home, exact: true },
   { to: '/elections', label: 'Elections', icon: Vote, exact: true },
   { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
];

export const COLLAPSED_WIDTH = 76;

// `collapsed` (desktop only) shows an icon rail; on mobile the sidebar is a
// slide-in drawer opened from the top bar and is always full width.
const SideBox = ({ isAdmin, role, open = false, onClose = () => {}, collapsed = false, onToggleCollapsed = () => {} }) => {
   const location = useLocation();
   const items = [...TOP_LINKS, ...(NAV[role || (isAdmin ? 'admin' : 'user')] || NAV.user)];

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
      collapsed ? 'lg:justify-center lg:px-0' : ''
   } ${active ? 'bg-[#1E3A8A] text-white shadow-sm' : 'text-slate-700 hover:bg-slate-200/70 hover:text-[#1E3A8A]'}`;
   const hideWhenCollapsed = collapsed ? 'lg:hidden' : '';
   const width = collapsed ? COLLAPSED_WIDTH : sidebarWidth;

   return (
      <>
      <style>
         {`
            @media (min-width: 1024px) {
               #logo-sidebar { width: ${width}px !important; }
               .lg\\:ml-64 { margin-left: ${width}px !important; }
            }
         `}
      </style>

      {open && <div className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden" onClick={onClose} aria-hidden="true" />}

      <aside
         id="logo-sidebar"
         className={`fixed left-0 top-0 z-40 flex h-screen w-72 flex-col border-r border-slate-200 bg-slate-50 transition-[transform,width] duration-200 lg:w-64 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
         aria-label="Sidebar"
      >
         {!collapsed && (
            <div onMouseDown={startResizing} className="absolute right-0 top-0 z-50 hidden h-full w-1.5 cursor-col-resize hover:bg-blue-400/30 active:bg-blue-400/50 lg:block" />
         )}

         <div className={`flex items-center justify-between px-4 py-5 ${collapsed ? 'lg:flex-col lg:gap-3 lg:px-2' : ''}`}>
            <Link to="/" className="flex items-center gap-2 text-xl font-extrabold text-[#1E3A8A]" title="eVote home">
               <Vote className="h-7 w-7 shrink-0" aria-hidden="true" /> <span className={hideWhenCollapsed}>eVote</span>
            </Link>
            <button onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-200 lg:hidden" aria-label="Close menu">
               <X className="h-5 w-5" />
            </button>
            <button
               onClick={onToggleCollapsed}
               className="hidden rounded-md p-1.5 text-slate-500 hover:bg-slate-200 hover:text-[#1E3A8A] lg:block"
               aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
               aria-expanded={!collapsed}
               title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
               {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
         </div>

         <nav className={`flex-1 overflow-y-auto pb-4 ${collapsed ? 'px-3 lg:px-2' : 'px-3'}`}>
            <ul className="space-y-1">
               {items.map((item, i) => (item.section ? (
                  <li key={`s-${i}`} className="px-3 pb-1 pt-4 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                     <span className={hideWhenCollapsed}>{item.section}</span>
                     {collapsed && <span className="hidden border-t border-slate-200 lg:block" aria-hidden="true" />}
                  </li>
               ) : (
                  <li key={item.to}>
                     <Link
                        to={item.to}
                        className={linkClass(item.exact ? location.pathname === item.to : isActive(location.pathname, item.to))}
                        title={collapsed ? item.label : undefined}
                        aria-label={collapsed ? item.label : undefined}
                     >
                        <item.icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                        <span className={`truncate ${hideWhenCollapsed}`}>{item.label}</span>
                     </Link>
                  </li>
               )))}
            </ul>
         </nav>

         <div className="border-t border-slate-200 p-3">
            <SignOutButton>
               <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#1E3A8A] px-3 py-2.5 text-sm font-semibold text-white hover:bg-blue-800" title="Log out">
                  <LogOut className="h-4 w-4" aria-hidden="true" /> <span className={hideWhenCollapsed}>Log out</span>
               </button>
            </SignOutButton>
         </div>
      </aside>
      </>
   );
}

export default SideBox;
