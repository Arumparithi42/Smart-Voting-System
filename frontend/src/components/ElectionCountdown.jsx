import { useEffect, useRef, useState } from 'react';
import { serverNow } from '../utils/serverClock';
import { stageAt } from '../utils/electionStages';

// Live election countdown - DISPLAY ONLY.
//   UPCOMING          -> "Election starts in"  DD Days : HH Hours : MM Minutes : SS Seconds
//   ONGOING           -> "Election ends in"
//   ENDED             -> "Election Ended"
//   RESULTS_PUBLISHED -> "Results Published"
// It derives everything from the election's stored (UTC) start/end times
// and the server-corrected clock, so it survives refreshes and wrong
// device clocks without polling the API. It never decides whether voting
// is allowed; the backend validates every vote.
//
// Pass `election` (preferred) or, for older call sites, just `endTime`.

const pad = (n) => String(n).padStart(2, '0');

const split = (ms) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
};

export default function ElectionCountdown({ election, endTime, onStageChange, compact = false, className = '' }) {
  const target = election || (endTime ? { startTime: new Date(0).toISOString(), endTime } : null);
  const [now, setNow] = useState(() => serverNow());
  const stage = stageAt(target, now);
  const previousStage = useRef(stage);

  const ticking = stage === 'UPCOMING' || stage === 'ONGOING';

  useEffect(() => {
    if (!ticking) return undefined;
    const timer = setInterval(() => setNow(serverNow()), 1000);
    return () => clearInterval(timer);
  }, [ticking]);

  useEffect(() => {
    if (previousStage.current !== stage) {
      previousStage.current = stage;
      onStageChange?.(stage);
    }
  }, [stage, onStageChange]);

  if (!target) return null;
  const start = Date.parse(target.startTime);
  const end = Date.parse(target.endTime);
  if ((stage === 'UPCOMING' && Number.isNaN(start)) || (stage === 'ONGOING' && Number.isNaN(end))) {
    return <p className={`text-sm text-slate-500 ${className}`}>Schedule not available</p>;
  }

  if (stage === 'DRAFT') return null;
  if (stage === 'ENDED' || stage === 'RESULTS_PUBLISHED') {
    const published = stage === 'RESULTS_PUBLISHED';
    return (
      <p className={`inline-flex items-center gap-2 text-sm font-semibold ${published ? 'text-blue-700' : 'text-slate-600'} ${className}`} role="status">
        {published ? 'Results Published' : 'Election Ended'}
      </p>
    );
  }

  const remaining = split((stage === 'UPCOMING' ? start : end) - now);
  const label = stage === 'UPCOMING' ? 'Election starts in' : 'Election ends in';
  const units = [
    ['days', remaining.days === 1 ? 'Day' : 'Days'],
    ['hours', 'Hours'],
    ['minutes', 'Minutes'],
    ['seconds', 'Seconds'],
  ];

  if (compact) {
    return (
      <p className={`text-sm ${className}`} role="timer" aria-label={`${label} ${remaining.days} days ${remaining.hours} hours ${remaining.minutes} minutes`}>
        <span className="text-slate-500">{label} </span>
        <span className="whitespace-nowrap font-mono font-semibold tabular-nums text-slate-900">
          {remaining.days > 0 && `${pad(remaining.days)}d : `}{pad(remaining.hours)}h : {pad(remaining.minutes)}m : {pad(remaining.seconds)}s
        </span>
      </p>
    );
  }

  return (
    <div className={className} role="timer" aria-label={`${label} ${remaining.days} days ${remaining.hours} hours ${remaining.minutes} minutes`}>
      <p className={`mb-2 text-xs font-semibold uppercase tracking-wide ${stage === 'ONGOING' ? 'text-green-700' : 'text-amber-700'}`}>{label}</p>
      <div className="flex items-stretch gap-1.5 sm:gap-2" aria-hidden="true">
        {units.map(([key, unit], i) => (
          <div key={key} className="flex items-center gap-1.5 sm:gap-2">
            <div className="min-w-[3.25rem] rounded-lg bg-slate-900 px-2 py-1.5 text-center text-white sm:min-w-[4rem]">
              <div className="font-mono text-lg font-bold tabular-nums sm:text-2xl">{pad(remaining[key])}</div>
              <div className="text-[10px] uppercase tracking-wide text-slate-300">{unit}</div>
            </div>
            {i < units.length - 1 && <span className="font-bold text-slate-400">:</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
