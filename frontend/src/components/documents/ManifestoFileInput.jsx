import { useRef } from 'react';
import { toast } from 'react-toastify';
import { FileText, Paperclip, X } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';

export const MANIFESTO_ACCEPT = 'application/pdf,image/png,image/jpeg,image/gif,image/webp';
const MAX_BYTES = 5 * 1024 * 1024;

// Optional manifesto file picker (PDF / image, 5 MB). The server checks the
// real file type again; this only gives quick feedback.
export default function ManifestoFileInput({ file, onChange, label = 'Manifesto file (optional)', compact = false }) {
  const input = useRef(null);
  const choose = (e) => {
    const picked = e.target.files?.[0];
    e.target.value = '';
    if (!picked) return;
    if (!MANIFESTO_ACCEPT.split(',').includes(picked.type)) return toast.error('The manifesto must be a PDF or an image (PNG, JPEG, GIF, WebP).');
    if (picked.size > MAX_BYTES) return toast.error('The manifesto must be at most 5 MB.');
    onChange(picked);
  };
  return (
    <div className={compact ? '' : 'block'}>
      {!compact && <span className="block text-sm font-medium text-slate-700">{label}</span>}
      <div className={`flex min-h-[2.5rem] items-center gap-2 ${compact ? '' : 'mt-1'}`}>
        {file ? (
          <span className="inline-flex min-w-0 items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1.5 text-sm text-slate-800">
            <FileText className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
            <span className="truncate">{file.name}</span>
            <button type="button" onClick={() => onChange(null)} className="rounded p-0.5 text-slate-500 hover:bg-slate-200" aria-label="Remove manifesto file"><X className="h-3.5 w-3.5" /></button>
          </span>
        ) : (
          <button type="button" onClick={() => input.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-[#1E3A8A] ring-1 ring-slate-300 hover:bg-slate-50" aria-label={compact ? label : undefined}>
            <Paperclip className="h-4 w-4" aria-hidden="true" /> {compact ? 'Manifesto' : 'Attach manifesto'}
          </button>
        )}
      </div>
      {!compact && <p className="mt-1 text-xs text-slate-500">PDF or image (PNG, JPEG, GIF, WebP), up to 5 MB. Shown publicly on the election page.</p>}
      <input ref={input} type="file" accept={MANIFESTO_ACCEPT} className="hidden" onChange={choose} />
    </div>
  );
}

// Attach a manifesto file to a newly created candidate.
// apiBase is '/api/admin' or '/api/officer'.
export const uploadCandidateManifesto = (apiBase, electionId, candidateId, file) => {
  const body = new FormData();
  body.append('docType', 'MANIFESTO');
  body.append('title', 'Manifesto');
  body.append('documents', file);
  return axiosInstance.post(`${apiBase}/elections/${electionId}/candidates/${candidateId}/documents`, body);
};
