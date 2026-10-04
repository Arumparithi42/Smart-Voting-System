import { Link } from 'react-router-dom';

// KPI tile: a single headline number, not a chart. Icon + label carry the
// meaning; the number stays in text ink.
export default function StatCard({ label, value, icon: Icon, to, hint, loading }) {
  const body = (
    <div className="flex h-full items-start justify-between gap-3 rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200 transition hover:shadow-md">
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-3xl font-bold tabular-nums text-slate-900">{loading ? '–' : value}</p>
        {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      </div>
      {Icon && (
        <span className="rounded-lg bg-blue-50 p-2.5 text-[#1E3A8A]">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
    </div>
  );
  return to ? <Link to={to} className="block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{body}</Link> : body;
}
