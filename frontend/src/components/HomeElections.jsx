import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, CalendarDays, Vote } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';
import ElectionCountdown from './ElectionCountdown';
import ElectionStatusBadge from './ui/ElectionStatusBadge';
import { formatDateTime } from '../utils/electionStages';

function HomeElectionCard({ election, onStageChange }) {
  const ongoing = election.lifecycleStage === 'ONGOING';
  return (
    <article className="flex flex-col rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold leading-snug text-slate-900">{election.title}</h3>
        <ElectionStatusBadge stage={election.lifecycleStage} />
      </div>
      {election.description && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{election.description}</p>}
      <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-600">
        <CalendarDays className="h-4 w-4 text-slate-400" aria-hidden="true" />
        {ongoing ? <>Voting closes <span className="font-semibold text-slate-800">{formatDateTime(election.endTime)}</span></>
          : <>Starts <span className="font-semibold text-slate-800">{formatDateTime(election.startTime)}</span></>}
      </p>
      <ElectionCountdown election={election} onStageChange={onStageChange} className="mt-4" />
      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        {ongoing ? (
          <Link to={`/vote/${election._id}`} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700">Vote Now</Link>
        ) : null}
        <Link to={`/explore/${election._id}`} className="rounded-lg px-4 py-2 text-sm font-semibold text-[#1E3A8A] ring-1 ring-slate-300 hover:bg-slate-50">View details</Link>
      </div>
    </article>
  );
}

// Home page: elections the Admin chose to feature ("Show this election on
// the home page" = Yes), loaded live from the backend.
export default function HomeElections() {
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    axiosInstance.get('/api/home-elections').then((res) => setData(res.data)).catch(() => setData({ ongoing: [], upcoming: [] }));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (!data) return null;
  if (!data.ongoing.length && !data.upcoming.length) return null;

  const section = (title, icon, list, empty) => (
    <div>
      <h2 className="mb-4 flex items-center gap-2 text-2xl font-bold text-blue-900">{icon}{title}</h2>
      {list.length ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((e) => <HomeElectionCard key={e._id} election={e} onStageChange={load} />)}
        </div>
      ) : <p className="rounded-xl bg-white/70 p-4 text-sm text-slate-500 ring-1 ring-slate-200">{empty}</p>}
    </div>
  );

  return (
    <section className="bg-white/60 py-12" aria-label="Featured elections">
      <div className="mx-auto max-w-7xl space-y-10 px-4 sm:px-6">
        {section('Ongoing Elections', <Vote className="h-6 w-6" aria-hidden="true" />, data.ongoing, 'No featured elections are open for voting right now.')}
        {section('Upcoming Elections', <CalendarClock className="h-6 w-6" aria-hidden="true" />, data.upcoming, 'No featured upcoming elections.')}
        <div className="text-center">
          <Link to="/elections" className="inline-block rounded-full border-2 border-blue-900 px-6 py-2.5 font-semibold text-blue-900 hover:bg-blue-50">See all elections</Link>
        </div>
      </div>
    </section>
  );
}
