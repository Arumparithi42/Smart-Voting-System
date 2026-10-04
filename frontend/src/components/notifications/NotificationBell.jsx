import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import useNotifications from '../../hooks/useNotifications';
import NotificationItem from './NotificationItem';

export default function NotificationBell({ className = '' }) {
  const { notifications, unreadCount, loading, error, markRead, markAllRead } = useNotifications({ limit: 8 });
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openNotification = async (n) => {
    if (!n.isRead) await markRead(n._id).catch(() => {});
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full p-2 text-slate-600 hover:bg-slate-100 hover:text-[#1E3A8A] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
      >
        <Bell className="h-6 w-6" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-slate-200">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="font-semibold text-slate-900">Notifications</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-semibold text-blue-700 hover:underline">Mark all as read</button>
            )}
          </div>
          <div className="max-h-96 divide-y overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">Loading…</p>
            ) : error ? (
              <p className="px-4 py-6 text-center text-sm text-red-600">{error}</p>
            ) : notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">No notifications.</p>
            ) : (
              notifications.map((n) => <NotificationItem key={n._id} notification={n} onOpen={openNotification} />)
            )}
          </div>
          <Link to="/dashboard/notifications" onClick={() => setOpen(false)} className="block border-t px-4 py-3 text-center text-sm font-semibold text-blue-700 hover:bg-slate-50">
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}
