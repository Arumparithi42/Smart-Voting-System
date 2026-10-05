import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../utils/axiosInstance';
import { formatDateTime } from '../utils/labels';
import ElectionStatusBadge from '../components/ui/ElectionStatusBadge';
import { useConfirm } from '../components/ui/ConfirmDialog';
import { LoadingState } from '../components/ui/States';

// Final-results review after voting closes.
//   mode="officer": review + "Recommend publication" (advice only)
//   mode="admin":   review + "Publish Results" (official) + result email
//                   delivery status / retry failed deliveries
export default function ElectionResultsReview({ mode }) {
  const confirm = useConfirm();
  const { electionId } = useParams();
  const isAdmin = mode === 'admin';
  const base = isAdmin ? '/api/admin' : '/api/officer';

  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');
  const [emailStatus, setEmailStatus] = useState(null);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get(`${base}/elections/${electionId}/final-results`);
      setSummary(res.data);
      setError('');
      if (isAdmin && res.data.resultsPublished) {
        const status = await axiosInstance.get(`/api/admin/elections/${electionId}/result-emails`);
        setEmailStatus(status.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load results');
    }
  }, [base, electionId, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const recommend = async () => {
    setBusy(true);
    try {
      const res = await axiosInstance.post(`/api/officer/elections/${electionId}/recommend-publication`, { notes });
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send recommendation');
    } finally {
      setBusy(false);
    }
  };

  const publish = async () => {
    if (!(await confirm({
      title: 'Publish final results?',
      message: 'Are you sure you want to publish the final results? They become public immediately and every voter who voted receives a result email. This cannot be undone.',
      confirmLabel: 'Publish Results',
    }))) return;
    setBusy(true);
    try {
      const res = await axiosInstance.post(`/api/admin/elections/${electionId}/publish-results`);
      toast.success(res.data.message);
      // Give the background sender a moment before showing delivery counts.
      setTimeout(load, 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not publish results');
    } finally {
      setBusy(false);
    }
  };

  const retry = async () => {
    setBusy(true);
    try {
      const res = await axiosInstance.post(`/api/admin/elections/${electionId}/result-emails/retry`);
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Retry failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">

        {error && <div className="mt-4 bg-white p-6 rounded shadow text-gray-700">{error}</div>}

        {!summary && !error && <LoadingState label="Loading final results…" />}
        {summary && (
          <>
            <div className="bg-gradient-to-r from-blue-500 to-teal-400 text-white rounded-lg shadow-lg p-8 my-6">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h1 className="text-3xl font-bold">{summary.electionTitle}</h1>
                <ElectionStatusBadge stage={summary.lifecycleStage} />
              </div>
              <p className="mt-2 text-blue-100">
                Final aggregate results · {summary.totalVotes} votes cast
                {summary.turnout && ` · Turnout ${summary.turnout.percentage.toFixed(1)}% of ${summary.turnout.eligibleVoters} eligible`}
              </p>
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
              <table className="w-full text-left">
                <thead className="bg-gray-100 text-sm text-gray-600">
                  <tr>
                    <th className="p-3">Candidate</th>
                    <th className="p-3 text-right">Votes</th>
                    <th className="p-3 text-right">Share</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.results.map((r) => (
                    <tr key={r.candidateId} className={`border-t ${r.isWinner ? 'bg-green-50 font-semibold' : ''}`}>
                      <td className="p-3">
                        {r.name} {r.partyName && <span className="text-gray-500 font-normal">({r.partyName})</span>}
                        {r.isWinner && <span className="ml-2 text-green-700 text-xs">{summary.isTie ? 'TIED' : 'WINNER'}</span>}
                      </td>
                      <td className="p-3 text-right">{r.votes}</td>
                      <td className="p-3 text-right">{r.percentage.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {summary.publicationRecommendation && (
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded mb-6 text-sm">
                <strong>Officer recommended publication</strong> on {formatDateTime(summary.publicationRecommendation.recommendedAt)}
                {summary.publicationRecommendation.recommendedBy?.firstName && (
                  <> by {summary.publicationRecommendation.recommendedBy.firstName} {summary.publicationRecommendation.recommendedBy.lastName}</>
                )}
                {summary.publicationRecommendation.notes && <p className="mt-1 italic">“{summary.publicationRecommendation.notes}”</p>}
              </div>
            )}

            {summary.resultsPublished ? (
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-6">
                Results were officially published on {formatDateTime(summary.resultsPublishedAt)}.{' '}
                <Link to={`/result/${electionId}`} className="text-blue-600 hover:underline">View public results</Link>
              </div>
            ) : isAdmin ? (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold mb-2">Publish official results</h2>
                <p className="text-sm text-gray-600 mb-4">
                  Publishing makes these results public and emails them to voters who actually voted in this election.
                  Emails contain only the aggregate results above - never how anyone voted.
                </p>
                <button onClick={publish} disabled={busy} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400">
                  Publish Results
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold mb-2">Recommend publication to Admin</h2>
                <p className="text-sm text-gray-600 mb-3">Only the Admin can publish official results.</p>
                <textarea
                  className="w-full border rounded p-2 mb-3"
                  rows={2}
                  placeholder="Notes for the Admin (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <button onClick={recommend} disabled={busy} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400">
                  {summary.publicationRecommendation ? 'Update Recommendation' : 'Recommend Publication'}
                </button>
              </div>
            )}

            {isAdmin && emailStatus && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-3">Result email delivery</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center mb-4">
                  {['SENT', 'PENDING', 'SENDING', 'FAILED'].map((k) => (
                    <div key={k} className="bg-gray-50 rounded p-3">
                      <div className="text-2xl font-bold">{emailStatus.counts[k]}</div>
                      <div className="text-xs text-gray-600">{k}</div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-600 mb-3">
                  {emailStatus.counts.total} recipient(s) - only voters who cast a vote in this election.
                </p>
                {emailStatus.failed.length > 0 && (
                  <>
                    <ul className="text-sm mb-3 divide-y">
                      {emailStatus.failed.map((f) => (
                        <li key={f._id} className="py-2">
                          {f.email || '(no email on record)'} · {f.attempts} attempt(s) · <span className="text-red-600">{f.lastError}</span>
                        </li>
                      ))}
                    </ul>
                    <button onClick={retry} disabled={busy} className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-400">
                      Retry failed emails
                    </button>
                  </>
                )}
                <button onClick={load} className="ml-3 text-sm text-blue-600 hover:underline">Refresh</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
