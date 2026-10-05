import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { MailCheck, RefreshCw } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import PageHeader from '../../components/ui/PageHeader';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { formatDateTime } from '../../utils/electionStages';

// Every result email that couldn't be delivered, grouped by election, with
// a per-election retry. Retrying only re-sends FAILED deliveries.
export default function FailedResultEmails() {
  const confirm = useConfirm();
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/api/admin/result-emails/failed');
      setGroups(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load failed emails.');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const retry = async (group) => {
    if (!(await confirm({
      title: 'Retry failed emails?',
      message: `Re-send the result email to the ${group.failures.length} voter(s) whose delivery failed for "${group.title}". Voters who already received it will not get it again.`,
      confirmLabel: 'Retry now',
    }))) return;
    setBusy(group.electionId);
    try {
      const res = await axiosInstance.post(`/api/admin/elections/${group.electionId}/result-emails/retry`);
      toast.success(res.data.message);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Retry failed');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-5xl">
        <PageHeader title="Failed Result Emails" subtitle="Result emails that could not be delivered to voters who voted. Fix the email settings or the address, then retry." />
        {error ? <ErrorState message={error} onRetry={load} /> : !groups ? <LoadingState label="Loading failed deliveries…" /> : groups.length === 0 ? (
          <EmptyState icon={MailCheck} title="No failed result emails." message="Every result email has been delivered." />
        ) : (
          <div className="space-y-6">
            {groups.map((g) => (
              <section key={g.electionId} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">{g.title}</h2>
                    <p className="text-sm text-slate-500">
                      {g.failures.length} failed · {g.sentCount} delivered{g.resultsPublishedAt && ` · published ${formatDateTime(g.resultsPublishedAt)}`}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link to={`/dashboard/admin/results/${g.electionId}`} className="rounded-lg px-3 py-2 text-sm font-semibold text-[#1E3A8A] ring-1 ring-slate-300 hover:bg-slate-50">Results &amp; emails</Link>
                    <button disabled={busy === g.electionId} onClick={() => retry(g)} className="inline-flex items-center gap-2 rounded-lg bg-orange-500 px-3 py-2 text-sm font-semibold text-white hover:bg-orange-600 disabled:bg-slate-400">
                      <RefreshCw className={`h-4 w-4 ${busy === g.electionId ? 'animate-spin' : ''}`} aria-hidden="true" /> Retry failed
                    </button>
                  </div>
                </div>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-slate-500">
                      <tr><th className="py-2 pr-3">Recipient</th><th className="py-2 pr-3">Attempts</th><th className="py-2 pr-3">Last error</th><th className="py-2">Last attempt</th></tr>
                    </thead>
                    <tbody>
                      {g.failures.map((f) => (
                        <tr key={f._id} className="border-t align-top">
                          <td className="py-2 pr-3"><span className="font-medium text-slate-900">{f.recipientName || 'Voter'}</span><br /><span className="text-slate-500">{f.email || '(no email on record)'}</span></td>
                          <td className="py-2 pr-3 tabular-nums">{f.attempts}</td>
                          <td className="py-2 pr-3 text-red-700">{f.lastError}</td>
                          <td className="py-2 text-slate-500">{formatDateTime(f.lastAttemptAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
