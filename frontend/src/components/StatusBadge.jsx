import { humanize } from '../utils/labels';

export default function StatusBadge({ value, styles }) {
  return (
    <span className={`inline-block px-2 py-1 text-xs font-semibold rounded-full ${styles[value] || 'bg-gray-100 text-gray-800'}`}>
      {humanize(value)}
    </span>
  );
}
