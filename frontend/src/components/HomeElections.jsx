import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pause, Play } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';
import { serverNow } from '../utils/serverClock';
import { formatDateTime } from '../utils/electionStages';
import useUserRole from '../hooks/useUserRole';

const REFRESH_MS = 60_000;
const SCROLL_PX_PER_SECOND = 70;

const pad = (n) => String(n).padStart(2, '0');
const remaining = (ms) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86400);
  const time = `${pad(Math.floor((s % 86400) / 3600))}h ${pad(Math.floor((s % 3600) / 60))}m ${pad(s % 60)}s`;
  return d > 0 ? `${d}d ${time}` : time;
};

function usePrefersReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

// One headline: "Ongoing Election : Title - voting closes in 03h 01m 20s  Vote now"
function TickerItem({ election, now }) {
  const ongoing = election.lifecycleStage === 'ONGOING';
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <Link to={`/explore/${election._id}`} className="font-semibold text-blue-700 underline underline-offset-2 hover:text-blue-900">
        {ongoing ? 'Ongoing Election :' : 'Upcoming Election :'}
      </Link>
      {ongoing && <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" aria-hidden="true" />}
      <span className="font-medium text-slate-900">{election.title}</span>
      <span className="text-slate-700">
        {ongoing
          ? <>- voting open, closes in <span className="font-mono tabular-nums">{remaining(Date.parse(election.endTime) - now)}</span></>
          : <>- starts {formatDateTime(election.startTime)} (in <span className="font-mono tabular-nums">{remaining(Date.parse(election.startTime) - now)}</span>)</>}
      </span>
      {ongoing && (
        <Link to={`/vote/${election._id}`} className="rounded bg-green-600 px-2 py-0.5 text-xs font-semibold text-white hover:bg-green-700">Vote now</Link>
      )}
    </span>
  );
}

// Home page news ticker: elections the Admin chose to feature ("Show this
// election on the home page" = Yes), loaded live from the backend. Elections
// set to No are never returned by /api/home-elections. The headlines scroll
// right-to-left; they pause on hover, keyboard focus or the pause button,
// and don't move at all when the device asks for reduced motion.
export default function HomeElections() {
  const { role } = useUserRole();
  const reducedMotion = usePrefersReducedMotion();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(() => serverNow());
  const viewport = useRef(null);
  const track = useRef(null);
  const [duration, setDuration] = useState(30);

  const load = useCallback(() => {
    axiosInstance.get('/api/home-elections')
      .then((res) => { setData(res.data); setFailed(false); })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, REFRESH_MS);
    window.addEventListener('focus', load);
    return () => { clearInterval(timer); window.removeEventListener('focus', load); };
  }, [load]);

  const items = data ? [...data.ongoing, ...data.upcoming] : [];
  const itemKey = items.map((e) => e._id).join(',');
  const itemsRef = useRef(items);
  itemsRef.current = items;

  // One clock for every countdown; reload when an election starts or ends.
  useEffect(() => {
    if (!itemKey) return undefined;
    const timer = setInterval(() => {
      const t = serverNow();
      setNow(t);
      if (itemsRef.current.some((e) => Date.parse(e.lifecycleStage === 'ONGOING' ? e.endTime : e.startTime) <= t)) load();
    }, 1000);
    return () => clearInterval(timer);
  }, [itemKey, load]);

  // Constant reading speed whatever the number of headlines. The track's
  // left padding equals the strip width, so its width is the full distance.
  useLayoutEffect(() => {
    const measure = () => {
      if (track.current) setDuration(Math.max(12, track.current.scrollWidth / SCROLL_PX_PER_SECOND));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (viewport.current) ro.observe(viewport.current);
    return () => ro.disconnect();
  }, [itemKey, data]);

  const animate = items.length > 0 && !reducedMotion;

  let message = null;
  if (failed && !data) {
    message = (
      <span className="text-red-800">
        Election updates could not be loaded.{' '}
        <button type="button" onClick={load} className="font-semibold underline">Retry</button>
      </span>
    );
  } else if (data && !items.length) {
    message = (
      <span className="text-slate-700">
        No ongoing or upcoming elections are featured right now.
        {role === 'admin' && <> Choose <strong>Yes</strong> for &quot;Show this election on the home page&quot; or tick <strong>Show on home page</strong> in Manage Elections.</>}{' '}
        <Link to="/elections" className="font-semibold text-blue-700 underline">See all elections</Link>
      </span>
    );
  }

  return (
    <section className="flex items-stretch border-b border-slate-800 bg-amber-100 text-sm" aria-label="Featured elections">
      <div className="flex shrink-0 flex-col justify-center bg-[#1a9fb5] px-4 py-2 leading-tight text-white sm:px-6">
        <span className="font-semibold">Elections</span>
        <span className="hidden text-xs sm:block">Ongoing &amp; Upcoming</span>
      </div>

      <div
        ref={viewport}
        className={`svs-ticker relative flex min-w-0 flex-1 items-center py-2.5 ${animate ? 'overflow-hidden' : 'overflow-x-auto px-4'}`}
        data-paused={paused}
      >
        {message || (!data ? <span className="px-4 text-slate-600">Loading election updates…</span> : (
          <div
            ref={track}
            className={animate ? 'svs-ticker-track' : 'flex'}
            style={animate ? { '--ticker-duration': `${duration}s` } : undefined}
          >
            <ul className="flex items-center gap-8 pr-8" aria-label="Ongoing and upcoming elections">
              {items.map((e, i) => (
                <Fragment key={e._id}>
                  {i > 0 && <li className="text-slate-400" aria-hidden="true">|</li>}
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
          aria-label={paused ? 'Play election updates' : 'Pause election updates'}
          title={paused ? 'Play' : 'Pause'}
        >
          {paused ? <Play className="h-4 w-4" aria-hidden="true" /> : <Pause className="h-4 w-4" aria-hidden="true" />}
        </button>
      )}
    </section>
  );
}
