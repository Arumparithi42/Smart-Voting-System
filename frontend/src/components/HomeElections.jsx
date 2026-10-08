import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, CalendarDays, Pause, Play, Vote } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';
import ElectionCountdown from './ElectionCountdown';
import { formatDateTime } from '../utils/electionStages';
import useUserRole from '../hooks/useUserRole';

const SECONDS_PER_CARD = 7;

function usePrefersReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return reduced;
}

function TickerCard({ election, onStageChange, hidden = false }) {
  const ongoing = election.lifecycleStage === 'ONGOING';
  // The duplicate copy that makes the loop seamless is hidden from screen
  // readers and keyboard focus, so every election is announced only once.
  const linkProps = hidden ? { tabIndex: -1 } : {};
  return (
    <article className="flex w-72 shrink-0 snap-start flex-col rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200 sm:w-80">
      <div className="flex items-center gap-2">
        {ongoing ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-red-700 ring-1 ring-red-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-600" aria-hidden="true" /> Live
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">Upcoming</span>
        )}
        {election.candidateCount > 0 && <span className="text-xs text-slate-500">{election.candidateCount} {election.candidateCount === 1 ? "candidate" : "candidates"}</span>}
      </div>
      <h3 className="mt-2 truncate text-base font-bold text-slate-900" title={election.title}>{election.title}</h3>
      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
        {ongoing ? <>Closes <span className="font-semibold text-slate-800">{formatDateTime(election.endTime)}</span></>
          : <>Starts <span className="font-semibold text-slate-800">{formatDateTime(election.startTime)}</span></>}
      </p>
      <ElectionCountdown election={election} onStageChange={onStageChange} compact className="mt-2" />
      <div className="mt-3 flex gap-2">
        {ongoing && (
          <Link {...linkProps} to={`/vote/${election._id}`} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700">Vote Now</Link>
        )}
        <Link {...linkProps} to={`/explore/${election._id}`} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[#1E3A8A] ring-1 ring-slate-300 hover:bg-slate-50">View details</Link>
      </div>
    </article>
  );
}

// One ticker row: cards scroll right-to-left in a continuous loop. It
// pauses on hover / keyboard focus and with the pause button, and only
// moves when the cards don't fit on screen. With "reduce motion" turned on
// it is a normal swipeable / scrollable row instead.
function TickerRow({ title, icon, accent, elections, empty, onStageChange }) {
  const reducedMotion = usePrefersReducedMotion();
  const viewport = useRef(null);
  const firstCopy = useRef(null);
  const [overflowing, setOverflowing] = useState(false);
  const [paused, setPaused] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      if (viewport.current && firstCopy.current) {
        setOverflowing(firstCopy.current.scrollWidth > viewport.current.clientWidth);
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (viewport.current) ro.observe(viewport.current);
    return () => ro.disconnect();
  }, [elections]);

  const animate = overflowing && !reducedMotion;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className={`flex items-center gap-2 text-xl font-bold sm:text-2xl ${accent}`}>{icon}{title}</h2>
        {animate && (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-300 hover:bg-white"
            aria-label={paused ? `Play ${title} ticker` : `Pause ${title} ticker`}
          >
            {paused ? <Play className="h-3.5 w-3.5" aria-hidden="true" /> : <Pause className="h-3.5 w-3.5" aria-hidden="true" />}
            {paused ? 'Play' : 'Pause'}
          </button>
        )}
      </div>
      {elections.length === 0 ? (
        <p className="rounded-xl bg-white/70 p-4 text-sm text-slate-500 ring-1 ring-slate-200">{empty}</p>
      ) : (
        <div
          ref={viewport}
          className={`svs-ticker relative rounded-2xl bg-slate-100/70 py-3 ring-1 ring-slate-200 ${animate ? 'overflow-hidden' : 'snap-x overflow-x-auto'}`}
          data-paused={paused}
        >
          {animate && (
            <>
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-slate-100 to-transparent" aria-hidden="true" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-slate-100 to-transparent" aria-hidden="true" />
            </>
          )}
          <div
            className={`flex w-max ${animate ? 'svs-ticker-track' : ''}`}
            style={animate ? { '--ticker-duration': `${Math.max(20, elections.length * SECONDS_PER_CARD)}s` } : undefined}
          >
            {/* Each copy has equal right padding, so shifting by exactly
                half the track (-50%) loops without a jump. */}
            <ul ref={firstCopy} className="flex gap-4 pl-4" aria-label={title}>
              {elections.map((e) => <li key={e._id} className="flex"><TickerCard election={e} onStageChange={onStageChange} /></li>)}
              <li className="w-0 shrink-0" aria-hidden="true" />
            </ul>
            {animate && (
              <ul className="flex gap-4 pl-4" aria-hidden="true">
                {elections.map((e) => <li key={e._id} className="flex"><TickerCard election={e} onStageChange={onStageChange} hidden /></li>)}
                <li className="w-0 shrink-0" />
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const REFRESH_MS = 60_000;

// Home page: elections the Admin chose to feature ("Show this election on
// the home page" = Yes), loaded live from the backend. Elections set to No
// are never returned by /api/home-elections. Shown at the top of the home
// page and refreshed every minute (and when the tab regains focus), so a
// newly featured election appears without a manual reload.
export default function HomeElections() {
  const { role } = useUserRole();
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

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

  const nothingFeatured = data && !data.ongoing.length && !data.upcoming.length;

  return (
    <section className="border-b border-slate-200 bg-white/70 py-8" aria-label="Featured elections">
      <div className="mx-auto max-w-7xl space-y-6 px-4 sm:px-6">
        {failed && !data ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200" role="alert">
            <span>Featured elections could not be loaded. Please check that the server is running and up to date.</span>
            <button type="button" onClick={load} className="rounded-lg bg-white px-3 py-1.5 font-semibold ring-1 ring-red-200 hover:bg-red-100">Retry</button>
          </div>
        ) : !data ? (
          <p className="text-sm text-slate-500" role="status">Loading featured elections…</p>
        ) : nothingFeatured ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-4 text-sm text-slate-600 ring-1 ring-slate-200">
            <span>
              No ongoing or upcoming elections are featured on the home page right now.
              {role === 'admin' && <> Choose <strong>Yes</strong> for &quot;Show this election on the home page&quot; when creating an election, or tick <strong>Show on home page</strong> in Manage Elections.</>}
            </span>
            <Link to="/elections" className="font-semibold text-blue-800 hover:underline">See all elections</Link>
          </div>
        ) : (
          <>
            <TickerRow
              title="Ongoing Elections"
              icon={<Vote className="h-6 w-6" aria-hidden="true" />}
              accent="text-green-800"
              elections={data.ongoing}
              empty="No featured elections are open for voting right now."
              onStageChange={load}
            />
            <TickerRow
              title="Upcoming Elections"
              icon={<CalendarClock className="h-6 w-6" aria-hidden="true" />}
              accent="text-blue-900"
              elections={data.upcoming}
              empty="No featured upcoming elections."
              onStageChange={load}
            />
            <div className="text-center">
              <Link to="/elections" className="inline-block rounded-full border-2 border-blue-900 px-6 py-2 font-semibold text-blue-900 hover:bg-blue-50">See all elections</Link>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
