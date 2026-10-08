import { timeAgo } from '../../utils/timeAgo';
import { Bell, CalendarClock, CheckCircle2, FilePen, FilePlus2, FileText, FileX2, MessageSquareHeart, MessageSquareWarning, Timer, Trophy, UserPlus, Vote } from 'lucide-react';

const ICONS = {
  ELECTION_STARTING: CalendarClock,
  ELECTION_STARTED: Vote,
  ELECTION_ENDING: Timer,
  ELECTION_ENDED: CheckCircle2,
  RESULTS_PUBLISHED: Trophy,
  COMPLAINT_UPDATED: FileText,
  PROPOSAL_SUBMITTED: FilePlus2,
  PROPOSAL_REVISION_REQUESTED: FilePen,
  PROPOSAL_APPROVED: CheckCircle2,
  PROPOSAL_REJECTED: FileX2,
  COMPLAINT_SUBMITTED: MessageSquareWarning,
  FEEDBACK_SUBMITTED: MessageSquareHeart,
  CANDIDATE_APPLICATION_SUBMITTED: UserPlus,
  FEEDBACK_UPDATED: MessageSquareHeart,
};


export default function NotificationItem({ notification, onOpen }) {
  const Icon = ICONS[notification.type] || Bell;
  return (
    <button
      onClick={() => onOpen(notification)}
      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 border-l-4 ${notification.isRead ? 'border-transparent' : 'border-blue-600 bg-blue-50/70'}`}
    >
      <span className={`mt-0.5 rounded-full p-2 ${notification.isRead ? 'bg-slate-100 text-slate-500' : 'bg-blue-100 text-[#1E3A8A]'}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className={`truncate text-sm ${notification.isRead ? 'font-medium text-slate-700' : 'font-semibold text-slate-900'}`}>{notification.title}</span>
          {!notification.isRead && <span className="shrink-0 rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">New<span className="sr-only"> (unread)</span></span>}
        </span>
        <span className="mt-0.5 block text-sm text-slate-600">{notification.message}</span>
        <span className="mt-1 block text-xs text-slate-400">{timeAgo(notification.createdAt)}</span>
      </span>
    </button>
  );
}
