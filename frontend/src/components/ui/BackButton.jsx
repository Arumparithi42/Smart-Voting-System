import { ArrowLeft } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';

// Global "Back": returns to the previous in-app page, or - when the page was
// opened directly (no history) - to its logical parent.
const parentOf = (pathname) => {
  if (pathname.startsWith('/dashboard/') || ['/createElection', '/voter-registry', '/admin/candidate-applications', '/apply-candidate'].includes(pathname)) return '/dashboard';
  if (/^\/(vote|explore|result)\//.test(pathname)) return '/elections';
  if (pathname.startsWith('/elections/')) return '/dashboard/elections';
  return '/';
};

export default function BackButton({ className = '' }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  if (pathname === '/') return null;
  const goBack = () => {
    if ((window.history.state?.idx ?? 0) > 0) navigate(-1);
    else navigate(parentOf(pathname));
  };
  return (
    <button
      onClick={goBack}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 hover:text-[#1E3A8A] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${className}`}
      aria-label="Go back"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" /> <span className="hidden sm:inline">Back</span>
    </button>
  );
}
