import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import axiosInstance from '../../utils/axiosInstance';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUS_STYLES, complaintCategoryLabel, humanize, formatDateTime } from '../../utils/labels';
import StatusBadge from '../../components/StatusBadge';

const STATUSES = ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED'];
const FINAL = ['RESOLVED', 'REJECTED'];

// Admin: Complaints / Compliance. Complaints go only to admins.
export default function AdminComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [elections, setElections] = useState([]);
  const [filters, setFilters] = useState({ status: '', electionId: '', category: '', search: '' });
  const [selected, setSelected] = useState(null);
  const [response, setResponse] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams(Object.entries(filters).filter(([, v]) => v));
      const res = await axiosInstance.get(`/api/admin/complaints?${params}`);
      setComplaints(res.data);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load complaints');
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    axiosInstance.get('/api/elections').then((res) => setElections(res.data)).catch(() => {});
  }, []);

  const open = (c) => {
    setSelected(c);
    setResponse(c.adminResponse || '');
  };

  const update = async (status) => {
    if (status && FINAL.includes(status) && !response.trim()) {
      return toast.error('Please write a response to the voter first.');
    }
    setBusy(true);
    try {
      const body = { adminResponse: response.trim() || undefined };
      if (status) body.status = status;
      const res = await axiosInstance.put(`/api/admin/complaints/${selected._id}`, body);
      toast.success(res.data.message);
      setSelected(res.data.complaint);
      load();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Update failed');
    } finally {
      setBusy(false);
    }
  };

  const setFilter = (field) => (e) => setFilters({ ...filters, [field]: e.target.value });
  const select = 'px-3 py-2 border rounded bg-white';

  return (
    <div className="bg-gray-50 min-h-screen p-8 lg:ml-64">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-[#1E3A8A] mb-6">Complaints / Compliance</h1>

        <div className="flex flex-wrap gap-3 mb-6">
          <input className={select} placeholder="Search complaint ID or subject" value={filters.search} onChange={setFilter('search')} />
          <select className={select} value={filters.status} onChange={setFilter('status')}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{humanize(s)}</option>)}
          </select>
          <select className={select} value={filters.electionId} onChange={setFilter('electionId')}>
            <option value="">All elections</option>
            {elections.map((e) => <option key={e._id} value={e._id}>{e.title}</option>)}
          </select>
          <select className={select} value={filters.category} onChange={setFilter('category')}>
            <option value="">All categories</option>
            {COMPLAINT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {complaints.length === 0 ? (
          <div className="bg-white p-6 shadow rounded text-center text-gray-500">No complaints found.</div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col md:flex-row">
            <ul className={`w-full ${selected ? 'md:w-1/3 border-r' : ''}`}>
              {complaints.map((c) => (
                <li
                  key={c._id}
                  onClick={() => open(c)}
                  className={`p-4 border-b cursor-pointer hover:bg-gray-100 ${selected?._id === c._id ? 'bg-blue-50 border-l-4 border-blue-500' : ''}`}
                >
                  <p className="font-mono text-sm text-gray-500">{c.referenceId}</p>
                  <p className="font-bold text-gray-800">{c.subject}</p>
                  <p className="text-sm text-gray-600">{c.election?.title || 'General'} · {complaintCategoryLabel(c.category)}</p>
                  <div className="mt-2"><StatusBadge value={c.status} styles={COMPLAINT_STATUS_STYLES} /></div>
                </li>
              ))}
            </ul>

            {selected && (
              <div className="w-full md:w-2/3 p-6 bg-gray-50 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-mono text-gray-500">{selected.referenceId}</p>
                    <h2 className="text-2xl font-bold">{selected.subject}</h2>
                  </div>
                  <StatusBadge value={selected.status} styles={COMPLAINT_STATUS_STYLES} />
                </div>

                <div className="bg-white p-4 rounded shadow-sm text-sm grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div><strong>Election:</strong> {selected.election?.title || 'General'}</div>
                  <div><strong>Category:</strong> {complaintCategoryLabel(selected.category)}</div>
                  <div><strong>From:</strong> {selected.complainant ? `${selected.complainant.name} (${selected.complainant.email})` : 'Unknown user'}</div>
                  <div><strong>Submitted:</strong> {formatDateTime(selected.createdAt)}</div>
                </div>

                <div className="bg-white p-4 rounded shadow-sm">
                  <h3 className="font-semibold mb-1">Description</h3>
                  <p className="whitespace-pre-wrap text-gray-700">{selected.description}</p>
                  {selected.supportingInfo && (
                    <>
                      <h3 className="font-semibold mt-3 mb-1">Supporting information</h3>
                      <p className="whitespace-pre-wrap text-gray-700">{selected.supportingInfo}</p>
                    </>
                  )}
                </div>

                {FINAL.includes(selected.status) ? (
                  <div className="bg-white p-4 rounded shadow-sm text-sm">
                    <p><strong>Response:</strong> {selected.adminResponse}</p>
                    <p className="text-gray-500 mt-1">Closed {formatDateTime(selected.closedAt)}</p>
                  </div>
                ) : (
                  <div className="bg-white p-4 rounded shadow-sm space-y-3">
                    <label className="block text-sm font-semibold">
                      Response to voter
                      <textarea className="mt-1 w-full border rounded p-2" rows={3} value={response} onChange={(e) => setResponse(e.target.value)} />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <button disabled={busy} onClick={() => update(selected.status === 'OPEN' ? 'UNDER_REVIEW' : undefined)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400">
                        {selected.status === 'OPEN' ? 'Respond & Mark Under Review' : 'Save Response'}
                      </button>
                      <button disabled={busy} onClick={() => update('RESOLVED')} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400">Resolve Complaint</button>
                      <button disabled={busy} onClick={() => update('REJECTED')} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400">Reject Complaint</button>
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
