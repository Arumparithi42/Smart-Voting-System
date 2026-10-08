import { toast } from 'react-toastify';
import { FileText, Lock, Trash2 } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { mediaUrl, openAuthedFile } from '../../utils/media';
import { useConfirm } from '../ui/ConfirmDialog';

const kb = (n) => (n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`);

// Open a candidate document: manifestos are public (plain link); other
// documents need the staff member's auth, so they're fetched as a blob.
export const openCandidateDocument = (doc) => {
  const path = `/api/candidates/documents/${doc.fileId}`;
  if (doc.docType === 'MANIFESTO') window.open(mediaUrl(path), '_blank', 'noopener');
  else openAuthedFile(path).catch(() => toast.error('Could not open the document.'));
};

// Staff view of a candidate's documents: open or remove them. Manifestos
// are added when the candidate is created - by the admin in the Add
// candidate form, or by the candidate in their application.
// apiBase is '/api/admin' or '/api/officer'.
export default function CandidateDocuments({ apiBase, electionId, candidate, onChange, canRemove = true }) {
  const confirm = useConfirm();
  const docs = candidate.documents || [];
  const base = `${apiBase}/elections/${electionId}/candidates/${candidate._id}/documents`;

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

  if (docs.length === 0) return <p className="mt-2 text-xs text-slate-500">No manifesto uploaded.</p>;

  return (
    <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
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
            {canRemove && <button type="button" onClick={() => remove(d)} className="rounded p-1 text-red-600 hover:bg-red-50" aria-label={`Remove ${d.filename}`}><Trash2 className="h-4 w-4" /></button>}
          </span>
        </li>
      ))}
    </ul>
  );
}
