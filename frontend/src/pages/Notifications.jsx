import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BellOff, CheckCheck } from 'lucide-react';
import { toast } from 'react-toastify';
import useNotifications from '../hooks/useNotifications';
import NotificationItem from '../components/notifications/NotificationItem';
import PageHeader from '../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';

export default function Notifications() {
  const { notifications, unreadCount, loading, error, refresh, markRead, markAllRead } = useNotifications({ limit: 100 });
  const navigate = useNavigate();
  const [view, setView] = useState('all');
  const shown = view === 'unread' ? notifications.filter((n) => !n.isRead) : notifications;

  const open = async (n) => {
    if (!n.isRead) await markRead(n._id).catch(() => toast.error('Could not update notification'));
    if (n.link) navigate(n.link);
  };

  const readAll = async () => {
    try {
      await markAllRead();
      toast.success('All notifications marked as read.');
    } catch {
      toast.error('Could not update notifications');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <PageHeader
          title="Notifications"
          subtitle={unreadCount ? `${unreadCount} unread` : 'You are all caught up'}
          actions={unreadCount > 0 && (
            <button onClick={readAll} className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/40 hover:bg-white/25">
              <CheckCheck className="h-4 w-4" aria-hidden="true" /> Mark all as read
            </button>
          )}
        />
        {loading ? (
          <LoadingState label="Loading notifications…" />
        ) : error ? (
          <ErrorState message={error} onRetry={refresh} />
        ) : (
          <>
            <div className="mb-4 flex gap-2" role="tablist" aria-label="Filter notifications">
              {[['all', 'All', notifications.length], ['unread', 'Unread', unreadCount]].map(([key, label, count]) => (
                <button
                  key={key}
                  role="tab"
                  aria-selected={view === key}
                  onClick={() => setView(key)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${view === key ? 'bg-[#1E3A8A] text-white' : 'bg-white text-slate-700 ring-1 ring-slate-300'}`}
                >
                  {label}
                  <span className={`rounded-full px-1.5 text-xs ${view === key ? 'bg-white/20' : key === 'unread' && count ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>{count}</span>
                </button>
              ))}
            </div>
            {shown.length === 0 ? (
              <EmptyState icon={BellOff} title={view === 'unread' ? 'No unread notifications.' : 'No notifications.'} message="Election reminders, results, requests and updates will appear here." />
            ) : (
              <div className="divide-y overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                {shown.map((n) => <NotificationItem key={n._id} notification={n} onOpen={open} />)}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
