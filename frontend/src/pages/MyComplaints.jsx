import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import axiosInstance from '../utils/axiosInstance';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS_STYLES, complaintCategoryLabel, formatDateTime } from '../utils/labels';
import StatusBadge from '../components/StatusBadge';
import { ErrorState, LoadingState } from '../components/ui/States';
import PageHeader from '../components/ui/PageHeader';
import { AttachmentList, AttachmentPicker } from '../components/complaints/Attachments';
import Req, { RequiredNote } from '../components/ui/Req';

const emptyForm = { electionId: '', category: '', subject: '', description: '', supportingInfo: '' };

// Voter: raise a complaint (goes to the Admin) and track own complaints.
// The backend only ever returns the signed-in user's own complaints.
export default function MyComplaints() {
  const [form, setForm] = useState(emptyForm);
  const [elections, setElections] = useState([]);
  const [loadState, setLoadState] = useState('loading');
  const [complaints, setComplaints] = useState([]);
  const [submitted, setSubmitted] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState([]);

  const load = async () => {
    try {
      const res = await axiosInstance.get('/api/complaints/my');
      setComplaints(res.data);
      setLoadState('ready');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load your complaints');
      setLoadState('error');
    }
  };

  useEffect(() => {
    load();
    axiosInstance.get('/api/elections').then((res) => setElections(res.data)).catch(() => {});
  }, []);

  const setField = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      // Multipart so screenshots/PDFs travel with the complaint.
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => { if (value) body.append(key, value); });
      files.forEach((f) => body.append('attachments', f));
      const res = await axiosInstance.post('/api/complaints', body);
      setSubmitted(res.data.referenceId);
      toast.success(res.data.message);
      setForm(emptyForm);
      setFiles([]);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  const input = 'mt-1 px-3 py-2 w-full border border-gray-300 rounded-md';

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <PageHeader title={<>Raise Complaint</>} subtitle={<>Report a problem or compliance issue. Complaints are sent directly to the Admin.</>} />

        {submitted && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-6">
            Your complaint has been submitted to the Admin. Reference ID: <span className="font-mono font-bold">{submitted}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-4 mb-10">
          <RequiredNote />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block text-sm font-medium text-gray-700">
              Election
              <select className={input} value={form.electionId} onChange={setField('electionId')}>
                <option value="">General / not election-specific</option>
                {elections.map((el) => <option key={el._id} value={el._id}>{el.title}</option>)}
              </select>
            </label>
            <label className="block text-sm font-medium text-gray-700">
              Category<Req />
              <select className={input} value={form.category} onChange={setField('category')} required>
                <option value="" disabled>Choose a category</option>
                {COMPLAINT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium text-gray-700">
            Subject<Req />
            <input className={input} value={form.subject} onChange={setField('subject')} required maxLength={200} />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Description<Req />
            <textarea className={input} rows={4} value={form.description} onChange={setField('description')} required maxLength={5000} />
          </label>
          <label className="block text-sm font-medium text-gray-700">
            Supporting information (optional)
            <textarea className={input} rows={2} value={form.supportingInfo} onChange={setField('supportingInfo')} maxLength={2000} placeholder="e.g. time of the issue, device/browser, error message" />
          </label>
          <AttachmentPicker files={files} onChange={setFiles} />
          <p className="text-xs text-gray-500">Please don&apos;t include your Aadhaar number, passwords or OTPs (also not in screenshots).</p>
          <button type="submit" disabled={submitting} className="px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 disabled:bg-gray-400">
            Submit Complaint
          </button>
        </form>

        <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">My Complaints</h2>
        {loadState === 'loading' ? <LoadingState /> : loadState === 'error' ? <ErrorState message="Unable to load this page." onRetry={load} /> : complaints.length === 0 ? (
          <div className="bg-white p-6 rounded shadow text-center text-gray-500">You haven&apos;t raised any complaints.</div>
        ) : (
          <div className="space-y-4">
            {complaints.map((c) => (
              <div key={c.referenceId} className="bg-white rounded-lg shadow p-5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm text-gray-500">{c.referenceId}</p>
                    <h3 className="text-lg font-semibold">{c.subject}</h3>
                    <p className="text-sm text-gray-600">
                      Election: {c.election?.title || 'General'} · {complaintCategoryLabel(c.category)} · {formatDateTime(c.createdAt)}
                    </p>
                  </div>
                  <StatusBadge value={c.status} styles={COMPLAINT_STATUS_STYLES} />
                </div>
                <AttachmentList attachments={c.attachments} />
                {c.adminResponse && (
                  <p className="mt-3 text-sm bg-gray-50 border-l-4 border-blue-400 p-3">
                    <strong>Admin Response:</strong> {c.adminResponse}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
