import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, ClipboardCheck, FilePlus2, Hourglass, Vote } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import ElectionStatusBadge from '../../components/ui/ElectionStatusBadge';
import StatusBadge from '../../components/StatusBadge';
import { PROPOSAL_STATUS_STYLES } from '../../utils/labels';
import { formatDateTime } from '../../utils/electionStages';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';

function ElectionRow({ election, action }) {
  const pct = election.eligibleVoters ? (election.votesCast / election.eligibleVoters) * 100 : 0;
  return (
    <li className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link to={`/dashboard/officer/elections/${election._id}`} className="font-semibold text-slate-900 hover:text-[#1E3A8A] hover:underline">{election.title}</Link>
          <ElectionStatusBadge stage={election.lifecycleStage} />
        </div>
        <p className="text-xs text-slate-500">{formatDateTime(election.startTime)} – {formatDateTime(election.endTime)}</p>
        {election.lifecycleStage !== 'UPCOMING' && election.lifecycleStage !== 'DRAFT' && (
          <p className="text-xs text-slate-600">Turnout {election.votesCast}/{election.eligibleVoters} ({pct.toFixed(1)}%)</p>
        )}
      </div>
      {action}
    </li>
  );
}

export default function OfficerDashboard() {
  const [proposals, setProposals] = useState([]);
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [p, e] = await Promise.all([axiosInstance.get('/api/officer/proposals'), axiosInstance.get('/api/officer/elections')]);
      setProposals(p.data);
      setElections(e.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load your dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const byStage = (...stages) => elections.filter((e) => stages.includes(e.lifecycleStage));
  const awaitingRecommendation = byStage('ENDED').filter((e) => !e.publicationRecommended);

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="Election Officer Dashboard"
          subtitle="Propose elections to the Admin and monitor the ones they approve."
          actions={<Link to="/dashboard/officer/proposals" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#1E3A8A] hover:bg-blue-50"><FilePlus2 className="h-4 w-4" aria-hidden="true" /> Propose Election</Link>}
        />
        {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={load} /> : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Pending Proposals" value={proposals.filter((p) => p.status === 'PENDING').length} icon={Hourglass} to="/dashboard/officer/proposals" hint={`${proposals.filter((p) => p.status === 'REVISION_REQUESTED').length} need revision`} />
              <StatCard label="Approved Elections" value={proposals.filter((p) => p.status === 'APPROVED').length} icon={CheckCircle2} to="/dashboard/officer/proposals" />
              <StatCard label="Ongoing Elections" value={byStage('ONGOING').length} icon={Vote} to="/dashboard/officer/elections?stage=ongoing" />
              <StatCard label="Completed Elections" value={byStage('ENDED', 'RESULTS_PUBLISHED').length} icon={ClipboardCheck} to="/dashboard/officer/elections?stage=past" />
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">My Proposals</h2>
                  <Link to="/dashboard/officer/proposals" className="text-sm font-semibold text-blue-700 hover:underline">View all</Link>
                </div>
                {proposals.length === 0 ? <EmptyState title="No election proposals found." message="Use “Propose Election” to send one to the Admin." /> : (
                  <ul className="divide-y overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                    {proposals.slice(0, 5).map((p) => (
                      <li key={p._id} className="flex items-center justify-between gap-3 p-4">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-900">{p.title}</p>
                          <p className="text-xs text-slate-500">Submitted {formatDateTime(p.createdAt)}</p>
                        </div>
                        <StatusBadge value={p.status} styles={PROPOSAL_STATUS_STYLES} />
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h2 className="mb-3 text-lg font-bold text-slate-900">Results Awaiting Your Recommendation</h2>
                {awaitingRecommendation.length === 0 ? <EmptyState icon={ClipboardCheck} title="Nothing awaiting review." message="Ended elections appear here until you recommend publication." /> : (
                  <ul className="divide-y overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                    {awaitingRecommendation.map((e) => (
                      <ElectionRow key={e._id} election={e} action={<Link to={`/dashboard/officer/results/${e._id}`} className="shrink-0 rounded-lg bg-[#1E3A8A] px-3 py-2 text-sm font-semibold text-white hover:bg-blue-800">Review Results</Link>} />
                    ))}
                  </ul>
                )}
              </section>
            </div>

            {[
              ['Ongoing Elections', byStage('ONGOING')],
              ['Approved & Upcoming Elections', byStage('UPCOMING', 'DRAFT')],
              ['Completed Elections', byStage('ENDED', 'RESULTS_PUBLISHED')],
            ].map(([title, list]) => (
              <section key={title} className="mt-8">
                <h2 className="mb-3 text-lg font-bold text-slate-900">{title}</h2>
                {list.length === 0 ? <p className="rounded-xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">None right now.</p> : (
                  <ul className="divide-y overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
                    {list.map((e) => (
                      <ElectionRow
                        key={e._id}
                        election={e}
                        action={(
                          <div className="flex shrink-0 gap-2">
                            {e.lifecycleStage === 'ONGOING' && (
                              <Link to={`/dashboard/officer/live-results/${e._id}`} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700">Live Results</Link>
                            )}
                            <Link to={`/dashboard/officer/elections/${e._id}`} className="rounded-lg px-3 py-2 text-sm font-semibold text-[#1E3A8A] ring-1 ring-slate-300 hover:bg-slate-50">Analytics &amp; details</Link>
                          </div>
                        )}
                      />
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
