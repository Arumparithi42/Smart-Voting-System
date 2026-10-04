import { timeAgo } from '../../utils/timeAgo';
import { Bell, CalendarClock, CheckCircle2, FileText, Timer, Trophy, Vote } from 'lucide-react';

const ICONS = {
  ELECTION_STARTING: CalendarClock,
  ELECTION_STARTED: Vote,
  ELECTION_ENDING: Timer,
  ELECTION_ENDED: CheckCircle2,
  RESULTS_PUBLISHED: Trophy,
  COMPLAINT_UPDATED: FileText,
};


export default function NotificationItem({ notification, onOpen }) {
  const Icon = ICONS[notification.type] || Bell;
  return (
    <button
      onClick={() => onOpen(notification)}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${notification.isRead ? '' : 'bg-blue-50/60'}`}
    >
      <span className={`mt-0.5 rounded-full p-2 ${notification.isRead ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-[#1E3A8A]'}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`truncate text-sm ${notification.isRead ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>{notification.title}</span>
          {!notification.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-blue-600" aria-label="unread" />}
        </span>
        <span className="mt-0.5 block text-sm text-slate-600">{notification.message}</span>
        <span className="mt-1 block text-xs text-slate-400">{timeAgo(notification.createdAt)}</span>
      </span>
    </button>
  );
}
