import { AlertTriangle, Inbox, Loader2 } from 'lucide-react';

// Shared loading / empty / error blocks so every page reports state the same way.
export function LoadingState({ label = 'Loading…', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 py-16 text-slate-500 ${className}`} role="status" aria-live="polite">
      <Loader2 className="h-8 w-8 animate-spin text-[#1E3A8A]" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </div>
  );
}

export function EmptyState({ title, message, action, icon: Icon = Inbox, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center ${className}`}>
      <Icon className="h-10 w-10 text-slate-400" aria-hidden="true" />
      <p className="font-semibold text-slate-700">{title}</p>
      {message && <p className="max-w-md text-sm text-slate-500">{message}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center ${className}`} role="alert">
      <AlertTriangle className="h-9 w-9 text-red-500" aria-hidden="true" />
      <p className="font-semibold text-red-800">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-300 hover:bg-red-100">
          Try again
        </button>
      )}
    </div>
  );
}
