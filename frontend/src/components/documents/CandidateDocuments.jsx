import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { FileText, Lock, Trash2, Upload } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { mediaUrl, openAuthedFile } from '../../utils/media';
import { useConfirm } from '../ui/ConfirmDialog';

const ACCEPT = 'application/pdf,image/png,image/jpeg,image/gif,image/webp';
const MAX_BYTES = 5 * 1024 * 1024;
const kb = (n) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

// Open a candidate document: manifestos are public (plain link); other
// documents need the staff member's auth, so they're fetched as a blob.
export const openCandidateDocument = (doc) => {
  const path = `/api/candidates/documents/${doc.fileId}`;
  if (doc.docType === 'MANIFESTO') window.open(mediaUrl(path), '_blank', 'noopener');
  else openAuthedFile(path).catch(() => toast.error('Could not open the document.'));
};

// Staff tool: list / upload / remove a candidate's documents.
// apiBase is '/api/admin' or '/api/officer'.
export default function CandidateDocuments({ apiBase, electionId, candidate, onChange }) {
  const confirm = useConfirm();
  const input = useRef(null);
  const [docType, setDocType] = useState('MANIFESTO');
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const docs = candidate.documents || [];
  const base = `${apiBase}/elections/${electionId}/candidates/${candidate._id}/documents`;

  const upload = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    const tooBig = files.find((f) => f.size > MAX_BYTES);
    if (tooBig) return toast.error(`${tooBig.name} is larger than 5 MB.`);
    const body = new FormData();
    body.append('docType', docType);
    if (title.trim()) body.append('title', title.trim());
    files.slice(0, 5).forEach((f) => body.append('documents', f));
    setBusy(true);
    try {
      const res = await axiosInstance.post(base, body);
      toast.success(res.data.message);
      setTitle('');
      onChange?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (doc) => {
    if (!(await confirm({ title: 'Remove document?', message: `Remove "${doc.title || doc.filename}" from ${candidate.name}?`, confirmLabel: 'Remove', tone: 'danger' }))) return;
    try {
      await axiosInstance.delete(`${base}/${doc.fileId}`);
      toast.success('Document removed.');
      onChange?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove document');
    }
  };

  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Documents</p>
      {docs.length === 0 ? <p className="text-sm text-slate-500">No documents uploaded.</p> : (
        <ul className="mb-3 space-y-1.5">
          {docs.map((d) => (
            <li key={d.fileId} className="flex items-center justify-between gap-2 text-sm">
              <button type="button" onClick={() => openCandidateDocument(d)} className="flex min-w-0 items-center gap-2 text-left text-blue-700 hover:underline">
                <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{d.title || d.filename}</span>
              </button>
              <span className="flex shrink-0 items-center gap-2">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${d.docType === 'MANIFESTO' ? 'bg-green-50 text-green-800' : 'bg-slate-200 text-slate-700'}`}>
                  {d.docType === 'MANIFESTO' ? 'Manifesto · public' : <span className="inline-flex items-center gap-1"><Lock className="h-3 w-3" aria-hidden="true" />Staff only</span>}
                </span>
                <span className="text-xs text-slate-400">{kb(d.size)}</span>
                <button type="button" onClick={() => remove(d)} className="rounded p-1 text-red-600 hover:bg-red-50" aria-label={`Remove ${d.filename}`}><Trash2 className="h-4 w-4" /></button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <select value={docType} onChange={(e) => setDocType(e.target.value)} aria-label="Document type" className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
          <option value="MANIFESTO">Manifesto (public)</option>
          <option value="DOCUMENT">Other document (staff only)</option>
        </select>
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Title (optional)" aria-label="Document title" className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        <button type="button" disabled={busy} onClick={() => input.current?.click()} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#1E3A8A] px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-400">
          <Upload className="h-4 w-4" aria-hidden="true" /> {busy ? 'Uploading…' : 'Upload'}
        </button>
        <input ref={input} type="file" multiple accept={ACCEPT} className="hidden" onChange={upload} />
      </div>
      <p className="mt-1 text-xs text-slate-500">PDF or images (PNG, JPEG, GIF, WebP), up to 5 MB each.</p>
    </div>
  );
}
