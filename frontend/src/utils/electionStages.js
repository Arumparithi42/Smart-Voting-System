// Display labels for the backend's lifecycle stages.
export const STAGE_META = {
  DRAFT: { label: 'Draft', className: 'bg-slate-100 text-slate-700 ring-slate-300' },
  UPCOMING: { label: 'Scheduled', className: 'bg-amber-50 text-amber-800 ring-amber-300' },
  ONGOING: { label: 'Voting Open', className: 'bg-green-50 text-green-800 ring-green-300' },
  ENDED: { label: 'Voting Closed', className: 'bg-slate-100 text-slate-700 ring-slate-300' },
  RESULTS_PUBLISHED: { label: 'Results Available', className: 'bg-blue-50 text-blue-800 ring-blue-300' },
};

// Mirrors the backend's lifecycle for DISPLAY (e.g. flipping a card from
// "Scheduled" to "Voting Open" when its countdown reaches zero). Never
// used to allow or block voting - the server validates every vote.
export function stageAt(election, nowMs) {
  if (!election) return 'UPCOMING';
  if (election.status === 'draft' || election.lifecycleStage === 'DRAFT') return 'DRAFT';
  const start = Date.parse(election.startTime);
  const end = Date.parse(election.endTime);
  if (Number.isNaN(start) || Number.isNaN(end)) return election.lifecycleStage || 'UPCOMING';
  if (nowMs < start) return 'UPCOMING';
  if (nowMs < end) return 'ONGOING';
  return election.resultsPublished ? 'RESULTS_PUBLISHED' : 'ENDED';
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}
