import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { MessageSquareHeart, Star } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';
import PageHeader from '../components/ui/PageHeader';
import StatusBadge from '../components/StatusBadge';
import Req, { RequiredNote } from '../components/ui/Req';
import { EmptyState, ErrorState, LoadingState } from '../components/ui/States';
import { FEEDBACK_CATEGORIES, FEEDBACK_STATUS_STYLES, feedbackCategoryLabel, formatDateTime } from '../utils/labels';

const emptyForm = { category: '', subject: '', message: '', rating: 0 };

// Any signed-in user: send feedback to the Admin and follow its status.
export default function FeedbackPage() {
  const [form, setForm] = useState(emptyForm);
  const [list, setList] = useState(null);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [sentRef, setSentRef] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/api/feedback/my');
      setList(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load your feedback.');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await axiosInstance.post('/api/feedback', { ...form, rating: form.rating || undefined });
      toast.success(res.data.message);
      setSentRef(res.data.feedback.referenceId);
      setForm(emptyForm);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not send feedback');
    } finally {
      setSending(false);
    }
  };

  const input = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Feedback" subtitle="Tell the Admin what works, what doesn't, and what you'd like to see. Your feedback goes directly to the Admin." />

        {sentRef && (
          <div className="mb-6 rounded-lg border-l-4 border-green-500 bg-green-50 p-4 text-sm" role="status">
            Thank you! Your feedback <span className="font-mono font-bold">{sentRef}</span> has been sent to the Admin.
          </div>
        )}

        <form onSubmit={submit} className="mb-10 space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <RequiredNote />
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-slate-700">Type<Req />
              <select className={input} value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required>
                <option value="" disabled>Choose a type</option>
                {FEEDBACK_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
            <fieldset>
              <legend className="block text-sm font-medium text-slate-700">Rating (optional)</legend>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setForm({ ...form, rating: form.rating === n ? 0 : n })}
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    aria-pressed={form.rating >= n}
                    className="rounded p-0.5"
                  >
                    <Star className={`h-6 w-6 ${form.rating >= n ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
          <label className="block text-sm font-medium text-slate-700">Subject<Req />
            <input className={input} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} required maxLength={200} />
          </label>
          <label className="block text-sm font-medium text-slate-700">Message<Req />
            <textarea className={input} rows={4} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} required maxLength={3000} />
          </label>
          <button disabled={sending} className="rounded-lg bg-[#1E3A8A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-400">
            {sending ? 'Sending…' : 'Send Feedback'}
          </button>
        </form>

        <h2 className="mb-4 text-xl font-bold text-slate-900">My Feedback</h2>
        {error ? <ErrorState message={error} onRetry={load} /> : !list ? <LoadingState /> : list.length === 0 ? (
          <EmptyState icon={MessageSquareHeart} title="You haven't sent any feedback yet." />
        ) : (
          <div className="space-y-4">
            {list.map((f) => (
              <article key={f.referenceId} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm text-slate-500">{f.referenceId}</p>
                    <h3 className="text-lg font-semibold text-slate-900">{f.subject}</h3>
                    <p className="text-sm text-slate-500">{feedbackCategoryLabel(f.category)} · {formatDateTime(f.createdAt)}{f.rating ? ` · ${'★'.repeat(f.rating)}` : ''}</p>
                  </div>
                  <StatusBadge value={f.status} styles={FEEDBACK_STATUS_STYLES} />
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{f.message}</p>
                {f.adminReply && (
                  <p className="mt-3 border-l-4 border-blue-400 bg-slate-50 p-3 text-sm"><strong>Admin reply:</strong> {f.adminReply}</p>
                )}
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
