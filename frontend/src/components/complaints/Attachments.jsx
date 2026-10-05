import { useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import { FileText, Paperclip, X } from 'lucide-react';
import { openAuthedFile, useAuthedFileUrl } from '../../utils/media';

export const MAX_ATTACHMENTS = 3;
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = 'image/png,image/jpeg,image/gif,image/webp,application/pdf';

const formatSize = (bytes) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

// Choose up to 3 screenshots/PDFs (5 MB each) with local previews. The
// server re-checks type and size by file content.
export function AttachmentPicker({ files, onChange }) {
  const input = useRef(null);
  const previews = useMemo(() => files.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : null)), [files]);
  useEffect(() => () => previews.forEach((u) => u && URL.revokeObjectURL(u)), [previews]);

  const add = (e) => {
    const chosen = [...(e.target.files || [])];
    e.target.value = '';
    const ok = [];
    for (const f of chosen) {
      if (!ACCEPT.split(',').includes(f.type)) { toast.error(`${f.name}: only images (PNG, JPEG, GIF, WebP) or PDF.`); continue; }
      if (f.size > MAX_BYTES) { toast.error(`${f.name} is larger than 5 MB.`); continue; }
      ok.push(f);
    }
    const next = [...files, ...ok];
    if (next.length > MAX_ATTACHMENTS) toast.error(`You can attach at most ${MAX_ATTACHMENTS} files.`);
    onChange(next.slice(0, MAX_ATTACHMENTS));
  };

  return (
    <div>
      <p className="text-sm font-medium text-gray-700">Screenshots or files (optional)</p>
      <div className="mt-2 flex flex-wrap gap-3">
        {files.map((f, i) => (
          <div key={`${f.name}-${i}`} className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
            {previews[i]
              ? <img src={previews[i]} alt={f.name} className="h-full w-full object-cover" />
              : <div className="flex flex-col items-center gap-1 p-2 text-center text-xs text-slate-600"><FileText className="h-6 w-6" aria-hidden="true" /><span className="line-clamp-2 break-all">{f.name}</span></div>}
            <button type="button" onClick={() => onChange(files.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-white/90 p-0.5 text-slate-700 shadow hover:text-red-600" aria-label={`Remove ${f.name}`}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {files.length < MAX_ATTACHMENTS && (
          <button type="button" onClick={() => input.current?.click()} className="flex h-24 w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-slate-300 text-xs font-medium text-slate-600 hover:border-blue-400 hover:text-blue-700">
            <Paperclip className="h-5 w-5" aria-hidden="true" /> Add file
          </button>
        )}
      </div>
      <p className="mt-1 text-xs text-gray-500">Up to {MAX_ATTACHMENTS} files · PNG, JPEG, GIF, WebP or PDF · 5 MB each. Only you and the Admin can see them.</p>
      <input ref={input} type="file" multiple accept={ACCEPT} className="hidden" onChange={add} />
    </div>
  );
}

function AttachmentThumb({ attachment }) {
  const path = `/api/complaints/attachments/${attachment.fileId}`;
  const isImage = attachment.contentType?.startsWith('image/');
  const url = useAuthedFileUrl(isImage ? path : null);
  const open = () => openAuthedFile(path).catch(() => toast.error('Could not open the file.'));
  return (
    <button type="button" onClick={open} className="group flex w-28 flex-col overflow-hidden rounded-lg bg-white text-left ring-1 ring-slate-200 hover:ring-blue-400" title={`Open ${attachment.filename}`}>
      <span className="flex h-20 items-center justify-center bg-slate-100">
        {isImage && url
          ? <img src={url} alt={attachment.filename} className="h-full w-full object-cover" />
          : <FileText className="h-7 w-7 text-slate-500" aria-hidden="true" />}
      </span>
      <span className="truncate px-2 py-1 text-xs text-slate-700 group-hover:text-blue-700">{attachment.filename}</span>
      <span className="px-2 pb-1 text-[10px] text-slate-400">{formatSize(attachment.size)}</span>
    </button>
  );
}

// Thumbnails of a complaint's attachments (fetched with the user's auth).
export function AttachmentList({ attachments }) {
  if (!attachments?.length) return null;
  return (
    <div className="mt-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Attachments</p>
      <div className="flex flex-wrap gap-3">
        {attachments.map((a) => <AttachmentThumb key={a.fileId} attachment={a} />)}
      </div>
    </div>
  );
}
