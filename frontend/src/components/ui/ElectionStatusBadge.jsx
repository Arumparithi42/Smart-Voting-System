import { STAGE_META } from '../../utils/electionStages';

export default function ElectionStatusBadge({ stage, className = '' }) {
  const meta = STAGE_META[stage] || STAGE_META.UPCOMING;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset whitespace-nowrap ${meta.className} ${className}`}>
      {stage === 'ONGOING' && <span className="h-1.5 w-1.5 rounded-full bg-green-600 animate-pulse" aria-hidden="true" />}
      {meta.label}
    </span>
  );
}
