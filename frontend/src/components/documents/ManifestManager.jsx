import { useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { FileText, Trash2, Upload } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import { mediaUrl, openAuthedFile } from '../../utils/media';
import { useConfirm } from '../ui/ConfirmDialog';

const MAX_BYTES = 10 * 1024 * 1024;

// Staff tool for an election's manifest (rules / notice / manifesto) -
// one PDF or image per election, public on the election page.
export default function ManifestManager({ apiBase, electionId, manifest, onChange }) {
  const confirm = useConfirm();
  const input = useRef(null);
  const [busy, setBusy] = useState(false);

  const upload = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > MAX_BYTES) return toast.error('The manifest must be at most 10 MB.');
    const body = new FormData();
    body.append('manifest', file);
    setBusy(true);
    try {
      const res = await axiosInstance.post(`${apiBase}/elections/${electionId}/manifest`, body);
      toast.success(res.data.message);
      onChange?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!(await confirm({ title: 'Remove manifest?', message: 'Voters will no longer see it on the election page.', confirmLabel: 'Remove', tone: 'danger' }))) return;
    try {
      await axiosInstance.delete(`${apiBase}/elections/${electionId}/manifest`);
      toast.success('Manifest removed.');
      onChange?.();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove manifest');
    }
  };

  const open = () => openAuthedFile(`/api/elections/${electionId}/manifest`).catch(() => window.open(mediaUrl(`/api/elections/${electionId}/manifest`), '_blank', 'noopener'));

  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-sm font-semibold text-slate-900">Election manifest</p>
      <p className="mb-3 text-xs text-slate-500">Rules, notice or manifesto for voters - PDF or image, up to 10 MB. Shown on the public election page.</p>
      <div className="flex flex-wrap items-center gap-2">
        {manifest?.fileId ? (
          <>
            <button type="button" onClick={open} className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-700 hover:underline">
              <FileText className="h-4 w-4" aria-hidden="true" /> {manifest.filename}
            </button>
            <button type="button" disabled={busy} onClick={() => input.current?.click()} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[#1E3A8A] ring-1 ring-slate-300 hover:bg-slate-50">Replace</button>
            <button type="button" onClick={remove} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50"><Trash2 className="h-4 w-4" aria-hidden="true" /> Remove</button>
          </>
        ) : (
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#1E3A8A] px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-400">
            <Upload className="h-4 w-4" aria-hidden="true" /> {busy ? 'Uploading…' : 'Upload manifest'}
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="application/pdf,image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={upload} />
    </div>
  );
}
