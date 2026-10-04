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
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 lg:ml-64">
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
        ) : notifications.length === 0 ? (
          <EmptyState icon={BellOff} title="No notifications." message="Election reminders, results and complaint updates will appear here." />
        ) : (
          <div className="divide-y overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
            {notifications.map((n) => <NotificationItem key={n._id} notification={n} onOpen={open} />)}
          </div>
        )}
      </div>
    </div>
  );
}
