import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import axiosInstance from '../../utils/axiosInstance';
import { PROPOSAL_STATUS_STYLES, toDateTimeLocal, formatDateTime } from '../../utils/labels';
import StatusBadge from '../../components/StatusBadge';
import { ErrorState, LoadingState } from '../../components/ui/States';
import PageHeader from '../../components/ui/PageHeader';

const emptyForm = {
  title: '',
  description: '',
  purpose: '',
  category: '',
  proposedStartTime: '',
  proposedEndTime: '',
  officerNotes: '',
  candidates: [],
};

// Election Officer: "Propose New Election" + track/revise own proposals.
// Submitting only creates a proposal for the Admin - never an election.
export default function OfficerProposals() {
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loadState, setLoadState] = useState('loading');
  const [proposals, setProposals] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    try {
      const res = await axiosInstance.get('/api/officer/proposals');
      setProposals(res.data);
      setLoadState('ready');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load your proposals');
      setLoadState('error');
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setField = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const setCandidate = (index, field, value) => {
    const candidates = form.candidates.map((c, i) => (i === index ? { ...c, [field]: value } : c));
    setForm({ ...form, candidates });
  };

  const startEdit = (proposal) => {
    setEditingId(proposal._id);
    setForm({
      title: proposal.title,
      description: proposal.description,
      purpose: proposal.purpose || '',
      category: proposal.category || '',
      proposedStartTime: toDateTimeLocal(proposal.proposedStartTime),
      proposedEndTime: toDateTimeLocal(proposal.proposedEndTime),
      officerNotes: proposal.officerNotes || '',
      candidates: proposal.candidates || [],
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        // datetime-local is the officer's local time - send an unambiguous instant.
        proposedStartTime: new Date(form.proposedStartTime).toISOString(),
        proposedEndTime: new Date(form.proposedEndTime).toISOString(),
        candidates: form.candidates.filter((c) => c.name?.trim()),
      };
      const res = editingId
        ? await axiosInstance.put(`/api/officer/proposals/${editingId}`, payload)
        : await axiosInstance.post('/api/officer/proposals', payload);
      toast.success(res.data.message);
      cancelEdit();
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not submit proposal');
    } finally {
      setSubmitting(false);
    }
  };

  const input = 'mt-1 px-3 py-2 w-full border border-gray-300 rounded-md';

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-8 lg:ml-64">
      <div className="max-w-5xl mx-auto">
        <PageHeader title={<>{editingId ? 'Revise Election Proposal' : 'Propose New Election'}</>} subtitle={<>
            Proposals are reviewed by the Admin. Only the Admin can approve and create the official election.
          </>} />

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-gray-700 md:col-span-2">
              Election Name
              <input className={input} value={form.title} onChange={setField('title')} required maxLength={200} />
            </label>
            <label className="block text-sm font-medium text-gray-700 md:col-span-2">
              Description
              <textarea className={input} rows={3} value={form.description} onChange={setField('description')} required />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Purpose
              <input className={input} value={form.purpose} onChange={setField('purpose')} />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Category / Type
              <input className={input} value={form.category} onChange={setField('category')} placeholder="e.g. Student Council" />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Proposed Start
              <input type="datetime-local" className={input} value={form.proposedStartTime} onChange={setField('proposedStartTime')} required />
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Proposed End
              <input type="datetime-local" className={input} value={form.proposedEndTime} onChange={setField('proposedEndTime')} required />
            </label>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-700">Candidates (optional)</h2>
              <button
                type="button"
                onClick={() => setForm({ ...form, candidates: [...form.candidates, { name: '', partyName: '', about: '' }] })}
                className="text-sm text-blue-600 hover:underline"
              >
                + Add candidate
              </button>
            </div>
            {form.candidates.map((c, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_2fr_auto] gap-2 mt-2">
                <input className={input} placeholder="Name" value={c.name} onChange={(e) => setCandidate(i, 'name', e.target.value)} />
                <input className={input} placeholder="Party" value={c.partyName || ''} onChange={(e) => setCandidate(i, 'partyName', e.target.value)} />
                <input className={input} placeholder="About" value={c.about || ''} onChange={(e) => setCandidate(i, 'about', e.target.value)} />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, candidates: form.candidates.filter((_, j) => j !== i) })}
                  className="text-red-600 text-sm px-2"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <label className="block text-sm font-medium text-gray-700">
            Notes / Recommendations to Admin
            <textarea className={input} rows={2} value={form.officerNotes} onChange={setField('officerNotes')} />
          </label>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 disabled:bg-gray-400"
            >
              {editingId ? 'Resubmit Proposal' : 'Submit Proposal'}
            </button>
            {editingId && (
              <button type="button" onClick={cancelEdit} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
                Cancel
              </button>
            )}
          </div>
        </form>

        <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">My Proposals</h2>
        {loadState === 'loading' ? <LoadingState /> : loadState === 'error' ? <ErrorState message="Unable to load this page." onRetry={load} /> : proposals.length === 0 ? (
          <div className="bg-white p-6 rounded shadow text-center text-gray-500">No proposals yet.</div>
        ) : (
          <div className="space-y-4">
            {proposals.map((p) => (
              <div key={p._id} className="bg-white rounded-lg shadow p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold">{p.title}</h3>
                    <p className="text-sm text-gray-600">
                      {formatDateTime(p.proposedStartTime)} → {formatDateTime(p.proposedEndTime)}
                    </p>
                    <p className="text-xs text-gray-500">Submitted {formatDateTime(p.createdAt)}</p>
                  </div>
                  <StatusBadge value={p.status} styles={PROPOSAL_STATUS_STYLES} />
                </div>
                {p.adminFeedback && (
                  <p className="mt-3 text-sm bg-gray-50 border-l-4 border-blue-400 p-3">
                    <strong>Admin feedback:</strong> {p.adminFeedback}
                  </p>
                )}
                {p.createdElection && (
                  <p className="mt-2 text-sm text-green-700">
                    Official election created: <strong>{p.createdElection.title}</strong>
                  </p>
                )}
                {['PENDING', 'REVISION_REQUESTED'].includes(p.status) && (
                  <button onClick={() => startEdit(p)} className="mt-3 text-sm text-blue-600 hover:underline">
                    {p.status === 'REVISION_REQUESTED' ? 'Revise & resubmit' : 'Edit'}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
