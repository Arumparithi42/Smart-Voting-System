import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { MessageSquareHeart } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import PageHeader from '../../components/ui/PageHeader';
import StatusBadge from '../../components/StatusBadge';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { FEEDBACK_CATEGORIES, FEEDBACK_STATUS_STYLES, feedbackCategoryLabel, formatDateTime, humanize } from '../../utils/labels';

const STATUSES = ['SUBMITTED', 'UNDER_REVIEW', 'ACKNOWLEDGED', 'CLOSED'];

// Admin: read user feedback, reply, and set its status (the user is notified).
export default function AdminFeedback() {
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ status: '', category: '' });
  const [selected, setSelected] = useState(null);
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
      const res = await axiosInstance.get(`/api/admin/feedback?${params}`);
      setList(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load feedback.');
    }
  }, [filters]);
  useEffect(() => { load(); }, [load]);

  const open = (f) => {
    setSelected(f);
    setReply(f.adminReply || '');
    setStatus(f.status);
  };

  const save = async () => {
    setBusy(true);
    try {
      const res = await axiosInstance.put(`/api/admin/feedback/${selected._id}`, { status, adminReply: reply.trim() || undefined });
      toast.success(res.data.message);
      setSelected({ ...selected, ...res.data.feedback });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not update feedback');
    } finally {
      setBusy(false);
    }
  };

  const select = 'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader title="User Feedback" subtitle="Feedback sent by voters and Election Officers. Replying or changing the status notifies the sender." />
        <div className="mb-6 flex flex-wrap gap-3">
          <select className={select} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
          </select>
          <select className={select} value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} aria-label="Filter by type">
            <option value="">All types</option>
            {FEEDBACK_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {error ? <ErrorState message={error} onRetry={load} /> : !list ? <LoadingState /> : list.length === 0 ? (
          <EmptyState icon={MessageSquareHeart} title="No feedback found." />
        ) : (
          <div className="flex flex-col overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200 md:flex-row">
            <ul className={`w-full ${selected ? 'md:w-1/3 md:border-r' : ''}`}>
              {list.map((f) => (
                <li key={f._id}>
                  <button onClick={() => open(f)} className={`w-full border-b p-4 text-left hover:bg-slate-50 ${selected?._id === f._id ? 'border-l-4 border-l-blue-600 bg-blue-50' : ''}`}>
                    <p className="font-mono text-xs text-slate-500">{f.referenceId}</p>
                    <p className="font-semibold text-slate-900">{f.subject}</p>
                    <p className="text-xs text-slate-500">{feedbackCategoryLabel(f.category)} · {f.from?.name || 'Unknown'}</p>
                    <div className="mt-2"><StatusBadge value={f.status} styles={FEEDBACK_STATUS_STYLES} /></div>
                  </button>
                </li>
              ))}
            </ul>
            {selected && (
              <div className="w-full space-y-4 bg-slate-50 p-6 md:w-2/3">
                <div>
                  <p className="font-mono text-sm text-slate-500">{selected.referenceId}</p>
                  <h2 className="text-xl font-bold text-slate-900">{selected.subject}</h2>
                  <p className="text-sm text-slate-500">
                    {feedbackCategoryLabel(selected.category)} · from {selected.from ? `${selected.from.name} (${selected.from.email}, ${selected.from.role === 'officer' ? 'Election Officer' : 'voter'})` : 'unknown user'} · {formatDateTime(selected.createdAt)}
                    {selected.rating ? ` · ${'★'.repeat(selected.rating)}${'☆'.repeat(5 - selected.rating)}` : ''}
                  </p>
                </div>
                <p className="whitespace-pre-wrap rounded-lg bg-white p-4 text-sm text-slate-700 ring-1 ring-slate-200">{selected.message}</p>
                <div className="space-y-3 rounded-lg bg-white p-4 ring-1 ring-slate-200">
                  <label className="block text-sm font-semibold text-slate-700">Reply to the user
                    <textarea className="mt-1 w-full rounded-lg border border-slate-300 p-2 text-sm" rows={3} value={reply} onChange={(e) => setReply(e.target.value)} maxLength={3000} />
                  </label>
                  <label className="block text-sm font-semibold text-slate-700">Status
                    <select className={`${select} mt-1 block`} value={status} onChange={(e) => setStatus(e.target.value)}>
                      {STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
                    </select>
                  </label>
                  <button disabled={busy} onClick={save} className="rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-400">Save &amp; notify user</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
