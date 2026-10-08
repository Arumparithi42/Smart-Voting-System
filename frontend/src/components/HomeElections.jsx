import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Pause, Play } from 'lucide-react';
import { formatDateTime } from '../utils/electionStages';
import useUserRole from '../hooks/useUserRole';
import useHomeElections, { formatRemaining, useNow } from '../hooks/useHomeElections';

const SCROLL_PX_PER_SECOND = 70;

function usePrefersReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  return reduced;
}

// One headline: [ONGOING] Title - closes in 03h 01m 20s
function TickerItem({ election, now }) {
  const ongoing = election.lifecycleStage === 'ONGOING';
  return (
    <Link to={`/explore/${election._id}`} className="group inline-flex items-center gap-2 whitespace-nowrap" title="View election details">
      <span className={`rounded px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${ongoing ? 'bg-red-600 text-white' : 'bg-blue-800 text-white'}`}>
        {ongoing ? 'Ongoing' : 'Upcoming'}
      </span>
      <span className="font-semibold text-blue-800 underline underline-offset-2 group-hover:text-blue-950">{election.title}</span>
      <span className="text-slate-700">
        {ongoing
          ? <>- closes in <span className="font-mono tabular-nums">{formatRemaining(Date.parse(election.endTime) - now)}</span></>
          : <>- starts {formatDateTime(election.startTime)}</>}
      </span>
    </Link>
  );
}

// Running election ticker (top of the landing page and the dashboard):
// featured upcoming / ongoing elections scroll right-to-left; each one links
// to its details page. Pauses on hover, keyboard focus or the pause button,
// and stays still when the device asks for reduced motion.
// `hideWhenEmpty` hides the bar when nothing is featured (dashboard).
export default function HomeElections({ hideWhenEmpty = false }) {
  const { role } = useUserRole();
  const reducedMotion = usePrefersReducedMotion();
  const { data, failed, elections, reload } = useHomeElections();
  const now = useNow(elections.length > 0);
  const [paused, setPaused] = useState(false);
  const track = useRef(null);
  const [duration, setDuration] = useState(30);
  const itemKey = elections.map((e) => e._id).join(',');

  // Constant reading speed whatever the number of headlines. The track's
  // left padding equals the strip width, so its width is the full distance.
  useLayoutEffect(() => {
    const measure = () => {
      if (track.current) setDuration(Math.max(12, track.current.scrollWidth / SCROLL_PX_PER_SECOND));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (track.current) ro.observe(track.current);
    return () => ro.disconnect();
  }, [itemKey]);

  const animate = elections.length > 0 && !reducedMotion;

  let message = null;
  if (failed && !data) {
    message = (
      <span className="text-red-800">
        Election updates could not be loaded.{' '}
        <button type="button" onClick={reload} className="font-semibold underline">Retry</button>
      </span>
    );
  } else if (data && !elections.length) {
    if (hideWhenEmpty && role !== 'admin') return null;
    message = (
      <span className="text-slate-700">
        No ongoing or upcoming elections are featured right now.
        {role === 'admin' && <> Choose <strong>Yes</strong> for &quot;Show this election on the home page&quot; or tick <strong>Show on home page</strong> in Manage Elections.</>}{' '}
        <Link to="/elections" className="font-semibold text-blue-700 underline">See all elections</Link>
      </span>
    );
  } else if (!data && hideWhenEmpty) {
    return null;
  }

  return (
    <section className="flex items-stretch border-b border-slate-800 bg-amber-100 text-sm" aria-label="Upcoming and ongoing elections">
      <div className="flex shrink-0 flex-col justify-center bg-[#1a9fb5] px-3 py-2 leading-tight text-white sm:px-5">
        <span className="text-xs font-bold uppercase tracking-wide sm:text-sm">Elections</span>
        <span className="hidden text-xs sm:block">Upcoming / Ongoing</span>
      </div>

      <div
        className={`svs-ticker relative flex min-w-0 flex-1 items-center py-2.5 ${animate ? 'overflow-hidden' : 'overflow-x-auto px-4'}`}
        data-paused={paused}
      >
        {message || (!data ? <span className="px-4 text-slate-600">Loading election updates…</span> : (
          <div
            ref={track}
            className={animate ? 'svs-ticker-track' : 'flex'}
            style={animate ? { '--ticker-duration': `${duration}s` } : undefined}
          >
            <ul className="flex items-center gap-4 pr-8" aria-label="Upcoming and ongoing elections">
              {elections.map((e, i) => (
                <Fragment key={e._id}>
                  {i > 0 && <li aria-hidden="true"><ArrowRight className="h-4 w-4 text-slate-500" /></li>}
                  <li><TickerItem election={e} now={now} /></li>
                </Fragment>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {animate && (
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="flex shrink-0 items-center border-l border-amber-300 px-3 text-slate-700 hover:bg-amber-200"
          aria-label={paused ? 'Play election ticker' : 'Pause election ticker'}
          title={paused ? 'Play' : 'Pause'}
        >
          {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
        </button>
      )}
    </section>
  );
}
