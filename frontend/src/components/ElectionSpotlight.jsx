import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, ChevronLeft, ChevronRight, Minus, Timer, Vote } from 'lucide-react';
import { formatDateTime } from '../utils/electionStages';
import useHomeElections, { formatRemaining, useNow } from '../hooks/useHomeElections';

const storageKey = (aboveChatbot) => `electionBoxMinimized:${aboveChatbot ? 'dashboard' : 'landing'}`;

const startsMinimized = (aboveChatbot) => {
  try {
    const saved = sessionStorage.getItem(storageKey(aboveChatbot));
    if (saved !== null) return saved === '1';
  } catch { /* storage unavailable */ }
  // The Dashboard already lists elections, and small screens have little
  // room: start as a small pill there so the box never covers content.
  return aboveChatbot || (typeof window !== 'undefined' && !!window.matchMedia?.('(max-width: 639px)').matches);
};

// Bottom-right election box: the same featured upcoming / ongoing elections
// as the top ticker (shared data), one at a time with Previous / Next.
// `aboveChatbot` lifts it above the signed-in "Need help?" button.
export default function ElectionSpotlight({ aboveChatbot = false }) {
  const { elections } = useHomeElections();
  const now = useNow(elections.length > 0);
  const [index, setIndex] = useState(0);
  const [minimized, setMinimized] = useState(() => startsMinimized(aboveChatbot));

  // Keep the index valid when the list changes.
  useEffect(() => {
    if (index >= elections.length) setIndex(0);
  }, [elections.length, index]);

  const setMin = (value) => {
    setMinimized(value);
    try { sessionStorage.setItem(storageKey(aboveChatbot), value ? '1' : '0'); } catch { /* storage unavailable */ }
  };

  if (!elections.length) return null;

  const position = aboveChatbot ? 'bottom-20 right-4 sm:right-5' : 'bottom-4 right-4 sm:bottom-5 sm:right-5';

  if (minimized) {
    return (
      <button
        type="button"
        onClick={() => setMin(false)}
        className={`fixed ${position} z-40 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#1E3A8A] shadow-lg ring-1 ring-slate-200 hover:bg-slate-50`}
        aria-label={`Show upcoming and ongoing elections (${elections.length})`}
      >
        <CalendarClock className="h-4 w-4" aria-hidden="true" />
        Elections
        <span className="rounded-full bg-[#1E3A8A] px-1.5 text-xs text-white">{elections.length}</span>
      </button>
    );
  }

  const current = elections[Math.min(index, elections.length - 1)];
  const ongoing = current.lifecycleStage === 'ONGOING';
  const many = elections.length > 1;
  const go = (step) => setIndex((i) => (i + step + elections.length) % elections.length);

  return (
    <aside
      className={`fixed ${position} z-40 w-[calc(100vw-2rem)] max-w-xs overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200`}
      aria-label="Upcoming and ongoing elections"
    >
      <div className="flex items-center justify-between bg-[#1E3A8A] px-4 py-2 text-white">
        <p className="text-sm font-semibold">Upcoming / Ongoing Elections</p>
        <button type="button" onClick={() => setMin(true)} className="rounded p-1 hover:bg-white/15" aria-label="Minimize elections box" title="Minimize">
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex items-center gap-1 px-2 py-3">
        <button
          type="button"
          onClick={() => go(-1)}
          disabled={!many}
          className="shrink-0 rounded-full p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
          aria-label="Previous election"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="min-w-0 flex-1 text-center" aria-live="polite">
          <p className="truncate font-bold text-slate-900" title={current.title}>{current.title}</p>
          <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${ongoing ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-amber-50 text-amber-800 ring-1 ring-amber-200'}`}>
            {ongoing ? <Vote className="h-3 w-3" aria-hidden="true" /> : <CalendarClock className="h-3 w-3" aria-hidden="true" />}
            {ongoing ? 'Ongoing' : 'Upcoming'}
          </span>
          <p className="mt-1.5 text-xs text-slate-600">
            {ongoing ? (
              <span className="inline-flex items-center gap-1"><Timer className="h-3.5 w-3.5" aria-hidden="true" /> Ends in <span className="font-mono font-semibold tabular-nums text-slate-900">{formatRemaining(Date.parse(current.endTime) - now)}</span></span>
            ) : (
              <>Starts: <span className="font-semibold text-slate-900">{formatDateTime(current.startTime)}</span></>
            )}
          </p>
          <Link to={`/explore/${current._id}`} className="mt-2 inline-block text-xs font-semibold text-blue-700 hover:underline">View details</Link>
        </div>

        <button
          type="button"
          onClick={() => go(1)}
          disabled={!many}
          className="shrink-0 rounded-full p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30"
          aria-label="Next election"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </div>

      {many && (
        <div className="flex justify-center gap-1.5 pb-3" role="tablist" aria-label="Choose election">
          {elections.map((e, i) => (
            <button
              key={e._id}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`${e.title} (${i + 1} of ${elections.length})`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${i === index ? 'w-5 bg-[#1E3A8A]' : 'w-2 bg-slate-300 hover:bg-slate-400'}`}
            />
          ))}
        </div>
      )}
    </aside>
  );
}
