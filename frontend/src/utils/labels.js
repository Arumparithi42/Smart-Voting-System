export const COMPLAINT_CATEGORIES = [
  { value: 'UNABLE_TO_VOTE', label: 'Unable to vote' },
  { value: 'AUTHENTICATION_PROBLEM', label: 'Authentication problem' },
  { value: 'TECHNICAL_PROBLEM', label: 'Technical problem' },
  { value: 'INCORRECT_CANDIDATE_INFO', label: 'Incorrect candidate information' },
  { value: 'ELECTION_TIMING_ISSUE', label: 'Election timing issue' },
  { value: 'SUSPECTED_IRREGULARITY', label: 'Suspected irregularity' },
  { value: 'DUPLICATE_VOTE_CONCERN', label: 'Duplicate vote concern' },
  { value: 'OTHER', label: 'Other' },
];

export const complaintCategoryLabel = (value) =>
  COMPLAINT_CATEGORIES.find((c) => c.value === value)?.label || value;

export const COMPLAINT_STATUS_STYLES = {
  OPEN: 'bg-blue-100 text-blue-800',
  UNDER_REVIEW: 'bg-yellow-100 text-yellow-800',
  RESOLVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
};

export const PROPOSAL_STATUS_STYLES = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  REVISION_REQUESTED: 'bg-orange-100 text-orange-800',
};

// "UNDER_REVIEW" -> "Under Review"
export const humanize = (value) =>
  String(value || '')
    .toLowerCase()
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

// <input type="datetime-local"> value for a Date/ISO string, in local time.
export const toDateTimeLocal = (value) => {
  if (!value) return '';
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const formatDateTime = (value) => (value ? new Date(value).toLocaleString() : '—');
