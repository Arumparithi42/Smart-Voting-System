import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import axiosInstance from '../../utils/axiosInstance';
import { PROPOSAL_STATUS_STYLES, humanize, toDateTimeLocal, formatDateTime } from '../../utils/labels';
import StatusBadge from '../../components/StatusBadge';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { ErrorState, LoadingState } from '../../components/ui/States';
import PageHeader from '../../components/ui/PageHeader';

const FILTERS = ['PENDING', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED', 'ALL'];

// Admin: review Election Officer proposals. "Approve & Create Election" is
// the only way a proposal becomes an official election.
export default function AdminProposals() {
  const confirm = useConfirm();
  const [filter, setFilter] = useState('PENDING');
  const [loadState, setLoadState] = useState('loading');
  const [proposals, setProposals] = useState([]);
  const [selected, setSelected] = useState(null);
  const [draft, setDraft] = useState(null); // editable approval details
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get(`/api/admin/proposals${filter === 'ALL' ? '' : `?status=${filter}`}`);
      setProposals(res.data);
      setLoadState('ready');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load proposals');
      setLoadState('error');
    }
  }, [filter]);

  useEffect(() => {
    load();
    setSelected(null);
  }, [load]);

  const open = (p) => {
    setSelected(p);
    setFeedback('');
    setDraft({
      title: p.title,
      description: p.description,
      startTime: toDateTimeLocal(p.proposedStartTime),
      endTime: toDateTimeLocal(p.proposedEndTime),
      candidates: (p.candidates || []).map((c) => ({ ...c })),
      createAsDraft: false,
    });
  };

  const act = async (request, successFallback) => {
    setBusy(true);
    try {
      const res = await request();
      toast.success(res.data.message || successFallback);
      setSelected(null);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    if (!(await confirm({
      title: 'Approve & create election?',
      message: `Approving creates the official election "${draft.title}"${draft.createAsDraft ? ' as a draft' : ' and schedules it'}.`,
      confirmLabel: 'Approve & Create Election',
    }))) return;
    act(() => axiosInstance.post(`/api/admin/proposals/${selected._id}/approve`, {
      title: draft.title,
      description: draft.description,
      startTime: new Date(draft.startTime).toISOString(),
      endTime: new Date(draft.endTime).toISOString(),
      candidates: draft.candidates.filter((c) => c.name?.trim()),
      createAsDraft: draft.createAsDraft,
      adminFeedback: feedback || undefined,
    }));
  };

  const reject = async () => {
    if (!feedback.trim()) return toast.error('Please give a reason for rejection.');
    if (!(await confirm({ title: 'Reject this proposal?', message: 'The officer will see your reason. Rejected proposals cannot be reopened.', confirmLabel: 'Reject', tone: 'danger' }))) return;
    act(() => axiosInstance.post(`/api/admin/proposals/${selected._id}/reject`, { reason: feedback }));
  };

  const requestRevision = () => {
    if (!feedback.trim()) return toast.error('Please describe what should be revised.');
    act(() => axiosInstance.post(`/api/admin/proposals/${selected._id}/request-revision`, { feedback }));
  };

  const setCandidate = (i, field, value) =>
    setDraft({ ...draft, candidates: draft.candidates.map((c, j) => (j === i ? { ...c, [field]: value } : c)) });

  const input = 'mt-1 px-3 py-2 w-full border border-gray-300 rounded-md';

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-8 lg:ml-64">
      <div className="max-w-6xl mx-auto">
        <PageHeader title="Election Proposals" subtitle="Review proposals from Election Officers. Only approval creates an official election." />

        <div className="flex flex-wrap gap-2 mb-6">
          {FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-lg font-semibold ${filter === s ? 'bg-[#1E3A8A] text-white' : 'bg-white text-gray-700 border'}`}
            >
              {humanize(s)}
            </button>
          ))}
        </div>

        {loadState === 'loading' ? <LoadingState /> : loadState === 'error' ? <ErrorState message="Unable to load this page." onRetry={load} /> : proposals.length === 0 ? (
          <div className="bg-white p-6 shadow rounded text-center text-gray-500">No proposals found.</div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col md:flex-row">
            <ul className={`w-full ${selected ? 'md:w-1/3 border-r' : ''}`}>
              {proposals.map((p) => (
                <li
                  key={p._id}
                  onClick={() => open(p)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-100 ${selected?._id === p._id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                >
                  <p className="font-bold text-gray-800">{p.title}</p>
                  <p className="text-sm text-gray-600">
                    by {p.proposedBy ? `${p.proposedBy.firstName} ${p.proposedBy.lastName || ''}` : 'Unknown officer'}
                  </p>
                  <div className="mt-2"><StatusBadge value={p.status} styles={PROPOSAL_STATUS_STYLES} /></div>
                </li>
              ))}
            </ul>

            {selected && draft && (
              <div className="w-full md:w-2/3 p-6 bg-gray-50 space-y-4">
                <div className="flex items-start justify-between">
                  <h2 className="text-2xl font-bold">{selected.title}</h2>
                  <StatusBadge value={selected.status} styles={PROPOSAL_STATUS_STYLES} />
                </div>

                <div className="bg-white p-4 rounded shadow-sm text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div><strong>Proposed by:</strong> {selected.proposedBy?.firstName} {selected.proposedBy?.lastName} ({selected.proposedBy?.email})</div>
                  <div><strong>Submitted:</strong> {formatDateTime(selected.createdAt)}</div>
                  <div><strong>Category:</strong> {selected.category || '—'}</div>
                  <div><strong>Revisions:</strong> {selected.revisionCount}</div>
                  <div className="md:col-span-2"><strong>Proposed dates:</strong> {formatDateTime(selected.proposedStartTime)} → {formatDateTime(selected.proposedEndTime)}</div>
                  <div className="md:col-span-2"><strong>Description:</strong> {selected.description}</div>
                  {selected.purpose && <div className="md:col-span-2"><strong>Purpose:</strong> {selected.purpose}</div>}
                  {selected.officerNotes && <div className="md:col-span-2"><strong>Officer notes:</strong> {selected.officerNotes}</div>}
                </div>

                {selected.status !== 'PENDING' ? (
                  <div className="bg-white p-4 rounded shadow-sm text-sm">
                    {selected.adminFeedback && <p><strong>Admin feedback:</strong> {selected.adminFeedback}</p>}
                    {selected.reviewedAt && <p>Reviewed {formatDateTime(selected.reviewedAt)}</p>}
                    {selected.createdElection && <p className="text-green-700">Created election: {selected.createdElection.title}</p>}
                    {selected.status === 'REVISION_REQUESTED' && <p className="text-orange-700">Waiting for the officer to revise and resubmit.</p>}
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded shadow-sm space-y-3">
                    <h3 className="font-semibold">Confirm official election details</h3>
                    <label className="block text-sm">Title<input className={input} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label>
                    <label className="block text-sm">Description<textarea className={input} rows={2} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} /></label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="block text-sm">Start<input type="datetime-local" className={input} value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} /></label>
                      <label className="block text-sm">End<input type="datetime-local" className={input} value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} /></label>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm">
                        <span>Candidates</span>
                        <button type="button" className="text-blue-600" onClick={() => setDraft({ ...draft, candidates: [...draft.candidates, { name: '', partyName: '' }] })}>+ Add</button>
                      </div>
                      {draft.candidates.map((c, i) => (
                        <div key={i} className="flex gap-2 mt-1">
                          <input className={input} placeholder="Name" value={c.name} onChange={(e) => setCandidate(i, 'name', e.target.value)} />
                          <input className={input} placeholder="Party" value={c.partyName || ''} onChange={(e) => setCandidate(i, 'partyName', e.target.value)} />
                          <button type="button" className="text-red-600 text-sm" onClick={() => setDraft({ ...draft, candidates: draft.candidates.filter((_, j) => j !== i) })}>✕</button>
                        </div>
                      ))}
                    </div>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={draft.createAsDraft} onChange={(e) => setDraft({ ...draft, createAsDraft: e.target.checked })} />
                      Create as draft (schedule it later from the Elections page)
                    </label>

                    <label className="block text-sm">
                      Feedback to officer (required for reject / revision)
                      <textarea className={input} rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} />
                    </label>

                    <div className="flex flex-wrap gap-2">
                      <button disabled={busy} onClick={approve} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400">Approve &amp; Create Election</button>
                      <button disabled={busy} onClick={requestRevision} className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:bg-gray-400">Request Revision</button>
                      <button disabled={busy} onClick={reject} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400">Reject</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
