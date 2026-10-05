import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Lock, PlusCircle, Trash2 } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import ElectionStatusBadge from '../../components/ui/ElectionStatusBadge';
import ElectionCountdown from '../../components/ElectionCountdown';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { ErrorState, LoadingState } from '../../components/ui/States';
import { formatDateTime } from '../../utils/electionStages';

const hourLabel = (iso) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric' });

// Single-series bar list: votes cast per hour (participation only - no
// candidate split). One hue, rounded data-ends, per-bar tooltip, values in
// text ink, and a table view below for screen readers / exact values.
function ParticipationChart({ timeline }) {
  const max = Math.max(...timeline.map((b) => b.votes), 1);
  return (
    <figure>
      <figcaption className="mb-3 text-sm font-semibold text-slate-700">Votes cast per hour</figcaption>
      <div className="flex h-40 items-end gap-0.5 border-b border-slate-200" role="img" aria-label="Votes cast per hour, see table below">
        {timeline.map((b) => (
          <div key={b.hour} className="group relative flex h-full max-w-[3rem] flex-1 items-end">
            <div className="w-full rounded-t bg-blue-600 transition-opacity group-hover:opacity-80" style={{ height: `${Math.max(4, (b.votes / max) * 100)}%` }} />
            <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-xs text-white group-hover:block">
              {hourLabel(b.hour)}: <span className="font-semibold">{b.votes}</span> vote{b.votes === 1 ? '' : 's'}
            </div>
          </div>
        ))}
      </div>
      <details className="mt-3 text-sm">
        <summary className="cursor-pointer font-medium text-blue-700">Show as table</summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-slate-500"><tr><th className="py-1">Hour</th><th className="py-1 text-right">Votes</th></tr></thead>
          <tbody>{timeline.map((b) => <tr key={b.hour} className="border-t"><td className="py-1">{hourLabel(b.hour)}</td><td className="py-1 text-right tabular-nums">{b.votes}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}

export default function OfficerElectionDetail() {
  const { electionId } = useParams();
  const confirm = useConfirm();
  const [election, setElection] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', partyName: '', about: '' });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [e, a] = await Promise.all([
        axiosInstance.get(`/api/officer/elections/${electionId}`),
        axiosInstance.get(`/api/officer/elections/${electionId}/analytics`),
      ]);
      setElection(e.data);
      setAnalytics(a.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load election details.');
    }
  }, [electionId]);
  useEffect(() => { load(); }, [load]);

  const addCandidate = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await axiosInstance.post(`/api/officer/elections/${electionId}/candidates`, form);
      toast.success('Candidate added.');
      setForm({ name: '', partyName: '', about: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not add candidate');
    } finally {
      setBusy(false);
    }
  };

  const removeCandidate = async (c) => {
    if (!(await confirm({ title: 'Remove candidate?', message: `Remove ${c.name} from this election?`, confirmLabel: 'Remove', tone: 'danger' }))) return;
    try {
      await axiosInstance.delete(`/api/officer/elections/${electionId}/candidates/${c._id}`);
      toast.success('Candidate removed.');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove candidate');
    }
  };

  if (error) return <div className="p-4 sm:p-8"><ErrorState message={error} onRetry={load} /></div>;
  if (!election || !analytics) return <div className=""><LoadingState label="Loading election…" /></div>;

  const input = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl space-y-6">

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{election.title}</h1>
              <p className="mt-1 text-sm text-slate-500">{formatDateTime(election.startTime)} – {formatDateTime(election.endTime)}</p>
            </div>
            <ElectionStatusBadge stage={election.lifecycleStage} />
          </div>
          {election.description && <p className="mt-3 text-slate-700">{election.description}</p>}
          {election.purpose && <p className="mt-1 text-sm text-slate-600"><span className="font-semibold">Purpose:</span> {election.purpose}</p>}
          <ElectionCountdown election={election} onStageChange={load} className="mt-4" />
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            ['Votes cast', analytics.votesCast],
            ['Eligible voters', analytics.eligibleVoters],
            ['Turnout', `${analytics.turnoutPercentage}%`],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-4 text-lg font-bold text-slate-900">Participation</h2>
          {analytics.timeline.length === 0
            ? <p className="text-sm text-slate-500">No votes have been cast yet.</p>
            : <ParticipationChart timeline={analytics.timeline} />}
          <p className="mt-3 text-xs text-slate-500">Analytics show participation only. Candidate totals are available after voting closes, from the results review.</p>
          {analytics.finalResultsAvailable && (
            <Link to={`/dashboard/officer/results/${election._id}`} className="mt-4 inline-block rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800">
              {election.resultsPublished ? 'View final results' : 'Review final results'}
            </Link>
          )}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Candidates ({election.candidates.length})</h2>
            {election.candidatesLocked && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500"><Lock className="h-3.5 w-3.5" aria-hidden="true" /> Locked - voting has started</span>
            )}
          </div>
          {election.candidates.length === 0 ? <p className="text-sm text-slate-500">No candidates yet.</p> : (
            <ul className="divide-y">
              {election.candidates.map((c) => (
                <li key={c._id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold text-slate-900">{c.name}</p>
                    <p className="text-sm text-slate-500">{c.partyName || 'Independent'}</p>
                  </div>
                  {!election.candidatesLocked && (
                    <button onClick={() => removeCandidate(c)} className="rounded-md p-2 text-red-600 hover:bg-red-50" aria-label={`Remove ${c.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {!election.candidatesLocked && (
            <form onSubmit={addCandidate} className="mt-4 grid gap-2 border-t pt-4 sm:grid-cols-[1fr_1fr_2fr_auto]">
              <input className={input} placeholder="Candidate name" aria-label="Candidate name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              <input className={input} placeholder="Party" aria-label="Party" value={form.partyName} onChange={(e) => setForm({ ...form, partyName: e.target.value })} />
              <input className={input} placeholder="About (optional)" aria-label="About" value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} />
              <button disabled={busy} className="inline-flex items-center justify-center gap-1 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-slate-400">
                <PlusCircle className="h-4 w-4" aria-hidden="true" /> Add
              </button>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
