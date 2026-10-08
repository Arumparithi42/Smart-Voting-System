import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Activity, RefreshCw, Users, Vote } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';
import PageHeader from '../components/ui/PageHeader';
import ElectionStatusBadge from '../components/ui/ElectionStatusBadge';
import ElectionCountdown from '../components/ElectionCountdown';
import { ErrorState, LoadingState } from '../components/ui/States';

const REFRESH_MS = 10_000;

// Live (running) tallies for staff - admins and Election Officers. Aggregate
// counts only. The public results page stays locked until an admin
// publishes the official results.
export default function LiveResults({ mode = 'admin' }) {
  const { electionId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const base = mode === 'officer' ? '/api/officer' : '/api/admin';

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await axiosInstance.get(`${base}/elections/${electionId}/live-results`);
      setData(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load live results.');
    } finally {
      setRefreshing(false);
    }
  }, [base, electionId]);

  const ongoing = data?.lifecycleStage === 'ONGOING';

  useEffect(() => { load(); }, [load]);

  // Auto-refresh only while voting is open.
  useEffect(() => {
    if (!ongoing) return undefined;
    const timer = setInterval(load, REFRESH_MS);
    return () => clearInterval(timer);
  }, [ongoing, load]);

  if (error && !data) return <div className="p-4 sm:p-8"><ErrorState message={error} onRetry={load} /></div>;
  if (!data) return <LoadingState label="Loading live results…" />;

  const leader = data.results[0];
  const tie = data.results.length > 1 && leader?.votes > 0 && data.results[1].votes === leader.votes;

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          title={data.electionTitle}
          subtitle={ongoing ? 'Live results - refreshing every 10 seconds while voting is open.' : 'Voting is not open - these are the current totals.'}
          actions={(
            <button onClick={load} className="inline-flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-semibold text-white ring-1 ring-white/40 hover:bg-white/25">
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden="true" /> Refresh
            </button>
          )}
        />

        <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <ElectionStatusBadge stage={data.lifecycleStage} />
            {ongoing && <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-700"><Activity className="h-3.5 w-3.5" aria-hidden="true" /> LIVE</span>}
            <span className="text-xs text-slate-500">Updated {new Date(data.updatedAt).toLocaleTimeString()}</span>
          </div>
          <ElectionCountdown election={data} compact onStageChange={load} />
        </div>

        <section className="mb-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="flex items-center gap-2 text-sm text-slate-500"><Vote className="h-4 w-4" aria-hidden="true" /> Total votes</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{data.totalVotes}</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="flex items-center gap-2 text-sm text-slate-500"><Users className="h-4 w-4" aria-hidden="true" /> Turnout</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{data.turnoutPercentage}%</p>
            <p className="text-xs text-slate-500">{data.totalVotes} of {data.eligibleVoters} eligible voters</p>
          </div>
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <p className="text-sm text-slate-500">Currently leading</p>
            <p className="mt-1 text-xl font-bold text-slate-900">{!leader || leader.votes === 0 ? 'No votes yet' : tie ? 'Tie' : leader.name}</p>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200" aria-labelledby="live-heading">
          <h2 id="live-heading" className="mb-4 text-lg font-bold text-slate-900">Candidates</h2>
          {data.results.length === 0 ? <p className="text-sm text-slate-500">No candidates in this election.</p> : (
            <ul className="space-y-4">
              {data.results.map((r) => (
                <li key={r.candidateId}>
                  <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold text-slate-900">{r.name} {r.partyName && <span className="font-normal text-slate-500">({r.partyName})</span>}</p>
                    <p className="text-sm tabular-nums text-slate-700"><span className="font-semibold">{r.votes}</span> {r.votes === 1 ? 'vote' : 'votes'} · {r.percentage.toFixed(1)}%</p>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-slate-100" aria-hidden="true">
                    <div className="h-2.5 rounded-full bg-blue-600 transition-all duration-500" style={{ width: `${r.percentage}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-6 text-xs text-slate-500">
            Visible to Admins and Election Officers only, to avoid influencing voters. Totals are aggregate - individual ballots are never shown.
            Official results become public once the Admin publishes them.
          </p>
        </section>
      </div>
    </div>
  );
}
