import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CalendarDays, Lock, Trophy, Users, Vote } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';
import Header from '../components/Header/Header';
import ElectionStatusBadge from '../components/ui/ElectionStatusBadge';
import { ErrorState, LoadingState } from '../components/ui/States';
import { formatDateTime } from '../utils/electionStages';

// Official, aggregate-only results. The API refuses (403) until an Admin has
// published them; nothing here can identify a voter or a ballot.
export default function Result() {
  const { electionId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null); // { message, locked }

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get(`/api/elections/${electionId}/results`);
      setData(res.data);
      setError(null);
    } catch (err) {
      const status = err.response?.status;
      setError({
        message: err.response?.data?.message || 'Unable to load results.',
        locked: status === 403 || status === 400,
      });
    }
  }, [electionId]);

  useEffect(() => { load(); }, [load]);

  const tie = data?.isTie;
  const noVotes = data && data.totalVotes === 0;

  return (
    <div className="app-ui min-h-screen bg-gradient-to-b from-yellow-50 to-white">
      <Header />
      <main className="mx-auto max-w-4xl px-4 pb-16 pt-8 sm:px-6">
        <Link to="/elections" className="text-sm font-semibold text-blue-700 hover:underline">← All elections</Link>

        {error ? (
          error.locked ? (
            <div className="mt-6 flex flex-col items-center gap-3 rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-slate-200">
              <Lock className="h-10 w-10 text-slate-400" aria-hidden="true" />
              <h1 className="text-xl font-bold text-slate-900">Results unavailable</h1>
              <p className="max-w-md text-slate-600">{error.message}</p>
              <Link to={`/explore/${electionId}`} className="text-sm font-semibold text-blue-700 underline">View election details</Link>
            </div>
          ) : <ErrorState className="mt-6" message={error.message} onRetry={load} />
        ) : !data ? <LoadingState label="Loading results…" /> : (
          <div className="mt-4 space-y-6">
            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <h1 className="text-2xl font-bold text-[#1E3A8A] sm:text-3xl">{data.electionTitle}</h1>
                <ElectionStatusBadge stage="RESULTS_PUBLISHED" className="self-start" />
              </div>
              {data.description && <p className="mt-2 text-slate-700">{data.description}</p>}
              <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" aria-hidden="true" /> Election: {formatDateTime(data.startTime)} – {formatDateTime(data.endTime)}</p>
                <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-slate-400" aria-hidden="true" /> Published: {formatDateTime(data.resultsPublishedAt)}</p>
              </div>
            </section>

            <section className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="flex items-center gap-2 text-sm text-slate-500"><Vote className="h-4 w-4" aria-hidden="true" /> Total votes</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{data.totalVotes.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="flex items-center gap-2 text-sm text-slate-500"><Users className="h-4 w-4" aria-hidden="true" /> Turnout</p>
                <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{data.turnout ? `${data.turnout.percentage.toFixed(1)}%` : '—'}</p>
                {data.turnout && <p className="text-xs text-slate-500">{data.turnout.votesCast} of {data.turnout.eligibleVoters} eligible voters</p>}
              </div>
              <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <p className="flex items-center gap-2 text-sm text-slate-500"><Trophy className="h-4 w-4" aria-hidden="true" /> {tie ? 'Result' : 'Winner'}</p>
                <p className="mt-1 text-xl font-bold text-slate-900">
                  {noVotes ? 'No votes cast' : tie ? 'Tie' : data.winner?.candidates?.[0] || '—'}
                </p>
                {tie && <p className="text-xs text-slate-500">{data.winner.candidates.join(', ')} · {data.winner.votes} votes each</p>}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200" aria-labelledby="results-heading">
              <h2 id="results-heading" className="mb-4 text-lg font-bold text-slate-900">Final results</h2>
              <ul className="space-y-4">
                {data.results.map((r) => (
                  <li key={r.candidateId}>
                    <div className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold text-slate-900">
                        {r.name} {r.partyName && <span className="font-normal text-slate-500">({r.partyName})</span>}
                        {r.isWinner && !noVotes && (
                          <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200">
                            <Trophy className="h-3 w-3" aria-hidden="true" /> {tie ? 'Tied' : 'Winner'}
                          </span>
                        )}
                      </p>
                      <p className="text-sm tabular-nums text-slate-700"><span className="font-semibold">{r.votes.toLocaleString()}</span> votes · {r.percentage.toFixed(1)}%</p>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100" aria-hidden="true">
                      <div className="h-2.5 rounded-full bg-blue-600" style={{ width: `${r.percentage}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-xs text-slate-500">Aggregate totals only. Individual ballots are secret and are never displayed.</p>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
