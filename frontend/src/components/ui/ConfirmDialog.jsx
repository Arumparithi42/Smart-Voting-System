import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

// App-wide confirmation dialog for sensitive actions:
//   const confirm = useConfirm();
//   if (!(await confirm({ title, message, confirmLabel, tone: 'danger' }))) return;
const ConfirmContext = createContext(async () => true);

export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);
  const confirmButton = useRef(null);

  const confirm = useCallback((options) => new Promise((resolve) => {
    setRequest({ ...options, resolve });
  }), []);

  const close = (result) => {
    request?.resolve(result);
    setRequest(null);
  };

  useEffect(() => {
    if (!request) return undefined;
    confirmButton.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') close(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request]);

  const danger = request?.tone === 'danger';

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center" onClick={() => close(false)}>
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-message"
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className={`rounded-full p-2 ${danger ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-[#1E3A8A]'}`}>
                <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h2 id="confirm-title" className="text-lg font-semibold text-slate-900">{request.title}</h2>
                <p id="confirm-message" className="mt-1 text-sm text-slate-600 whitespace-pre-line">{request.message}</p>
              </div>
            </div>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={() => close(false)} className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50">
                {request.cancelLabel || 'Cancel'}
              </button>
              <button
                ref={confirmButton}
                onClick={() => close(true)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#1E3A8A] hover:bg-blue-800'}`}
              >
                {request.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);
