import { useCallback, useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-react';
import { Search } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';
import Header from '../components/Header/Header';
import ElectionCard from '../components/ElectionCard';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';

const SECTIONS = [
  { key: 'ONGOING', title: 'Voting Open', empty: 'No elections are open for voting right now.' },
  { key: 'UPCOMING', title: 'Upcoming Elections', empty: 'No upcoming elections.' },
  { key: 'RESULTS_PUBLISHED', title: 'Results Available', empty: 'No published results yet.' },
  { key: 'ENDED', title: 'Voting Closed', empty: null },
];

export default function Elections() {
  const { isSignedIn } = useUser();
  const [elections, setElections] = useState([]);
  const [voted, setVoted] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/api/elections');
      setElections(res.data);
      setError('');
    } catch {
      setError('Unable to load elections.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // The signed-in user's own participation in open elections.
  useEffect(() => {
    if (!isSignedIn) return;
    const open = elections.filter((e) => e.lifecycleStage === 'ONGOING');
    Promise.all(open.map((e) => axiosInstance.get(`/api/elections/${e._id}/my-vote-status`)
      .then((r) => [e._id, r.data.hasVoted]).catch(() => [e._id, false])))
      .then((pairs) => setVoted(Object.fromEntries(pairs)));
  }, [elections, isSignedIn]);

  const q = query.trim().toLowerCase();
  const visible = elections.filter((e) => !q || `${e.title} ${e.description || ''}`.toLowerCase().includes(q));

  return (
    <div className="app-ui min-h-screen bg-gradient-to-b from-yellow-50 to-white">
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-[#1E3A8A] sm:text-4xl">Elections</h1>
            <p className="mt-1 text-slate-600">Times shown in your local time zone. Voting is controlled by the server.</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} type="search" placeholder="Search elections" aria-label="Search elections"
              className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200" />
          </div>
        </div>

        {loading ? <LoadingState label="Loading elections…" /> : error ? <ErrorState message={error} onRetry={load} /> : elections.length === 0 ? (
          <EmptyState title="No elections yet." message="Elections appear here once the Admin schedules them." />
        ) : (
          <div className="space-y-10">
            {SECTIONS.map((section) => {
              const list = visible.filter((e) => e.lifecycleStage === section.key);
              if (!list.length && !section.empty) return null;
              return (
                <section key={section.key} aria-labelledby={`sec-${section.key}`}>
                  <h2 id={`sec-${section.key}`} className="mb-4 text-xl font-bold text-slate-900">{section.title} <span className="text-base font-medium text-slate-400">({list.length})</span></h2>
                  {list.length ? (
                    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                      {list.map((e) => <ElectionCard key={e._id} election={e} hasVoted={voted[e._id]} onStageChange={load} />)}
                    </div>
                  ) : <p className="rounded-xl bg-white/70 p-4 text-sm text-slate-500 ring-1 ring-slate-200">{q ? 'No matching elections.' : section.empty}</p>}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
