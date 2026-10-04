import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CheckCircle2 } from 'lucide-react';
import ElectionCountdown from './ElectionCountdown';
import ElectionStatusBadge from './ui/ElectionStatusBadge';
import { formatDateTime } from '../utils/electionStages';

// Voter-facing election card. The badge flips stage live with the
// countdown (display only); the action buttons lead to pages whose
// backend calls enforce the real rules.
export default function ElectionCard({ election, hasVoted, onStageChange }) {
  const [stage, setStage] = useState(election.lifecycleStage);

  const handleStage = (next) => {
    setStage(next);
    onStageChange?.(next);
  };

  const primary = {
    UPCOMING: { to: `/explore/${election._id}`, label: 'View Election' },
    ONGOING: hasVoted
      ? { to: `/vote/${election._id}`, label: 'View Receipt' }
      : { to: `/vote/${election._id}`, label: 'Vote Now' },
    ENDED: { to: `/explore/${election._id}`, label: 'View Details' },
    RESULTS_PUBLISHED: { to: `/result/${election._id}`, label: 'View Results' },
  }[stage] || { to: `/explore/${election._id}`, label: 'View Election' };

  return (
    <article className="flex flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold leading-snug text-slate-900">{election.title}</h3>
        <ElectionStatusBadge stage={stage} />
      </div>
      {election.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{election.description}</p>}
      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
        <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
        {formatDateTime(election.startTime)} – {formatDateTime(election.endTime)}
      </p>
      <ElectionCountdown election={election} onStageChange={handleStage} compact className="mt-3" />
      {hasVoted && (
        <p className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-green-700">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> You have voted
        </p>
      )}
      <div className="mt-auto flex flex-wrap gap-2 pt-4">
        <Link
          to={primary.to}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${stage === 'ONGOING' && !hasVoted ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-[#1E3A8A] text-white hover:bg-blue-800'}`}
        >
          {primary.label}
        </Link>
        {stage === 'ONGOING' && (
          <Link to={`/explore/${election._id}`} className="rounded-lg px-4 py-2 text-sm font-semibold text-[#1E3A8A] ring-1 ring-slate-300 hover:bg-slate-50">
            Details
          </Link>
        )}
      </div>
    </article>
  );
}
