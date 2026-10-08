import { ExternalLink, FileText } from 'lucide-react';
import { mediaUrl } from '../../utils/media';

// Voter-facing view of a candidate's public manifesto files (uploaded by the
// candidate with their application, or by the admin when adding them).
// Images are shown inline; PDFs open in a new tab. Only MANIFESTO documents
// are public - staff-only documents are never linked here.
export default function CandidateManifestoFiles({ candidate, className = '' }) {
  const files = (candidate?.documents || []).filter((d) => d.docType === 'MANIFESTO');
  if (!files.length) return null;
  return (
    <div className={className}>
      <h4 className="mb-2 border-b text-lg font-semibold text-gray-800">Manifesto {files.length > 1 ? 'files' : 'file'}</h4>
      <ul className="space-y-3">
        {files.map((d) => {
          const url = mediaUrl(`/api/candidates/documents/${d.fileId}`);
          const isImage = d.contentType?.startsWith('image/');
          return (
            <li key={d.fileId}>
              {isImage && (
                <a href={url} target="_blank" rel="noopener noreferrer" className="mb-1 block">
                  <img src={url} alt={`${candidate.name}'s manifesto`} className="max-h-72 w-full rounded-lg object-contain ring-1 ring-slate-200" loading="lazy" />
                </a>
              )}
              <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800 ring-1 ring-blue-200 hover:bg-blue-100">
                <FileText className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{isImage ? 'Open full size' : `View manifesto (${d.title && d.title !== 'Manifesto' ? d.title : d.filename})`}</span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
