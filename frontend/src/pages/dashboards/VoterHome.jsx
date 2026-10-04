import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { Bell, Bot, CalendarClock, MessageSquareWarning, ShieldAlert, ShieldCheck, UserCircle2, Vote } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import ElectionCard from '../../components/ElectionCard';
import NotificationItem from '../../components/notifications/NotificationItem';
import useNotifications from '../../hooks/useNotifications';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';

export default function VoterHome() {
  const { user } = useUser();
  const [elections, setElections] = useState([]);
  const [voted, setVoted] = useState({});
  const [voterStatus, setVoterStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { notifications, loading: notesLoading, markRead } = useNotifications({ poll: false, limit: 3 });
  const navigate = useNavigate();
  const openNotification = async (n) => {
    if (!n.isRead) await markRead(n._id).catch(() => {});
    navigate(n.link || '/dashboard/notifications');
  };

  const load = useCallback(async () => {
    try {
      const [electionsRes, statusRes] = await Promise.all([
        axiosInstance.get('/api/elections'),
        axiosInstance.get('/api/voter/status').catch(() => ({ data: null })),
      ]);
      setElections(electionsRes.data);
      setVoterStatus(statusRes.data);
      setError('');
      // Own participation for open elections (never which candidate).
      const open = electionsRes.data.filter((e) => e.lifecycleStage === 'ONGOING');
      const statuses = await Promise.all(open.map((e) => axiosInstance
        .get(`/api/elections/${e._id}/my-vote-status`).then((r) => [e._id, r.data.hasVoted]).catch(() => [e._id, false])));
      setVoted(Object.fromEntries(statuses));
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load elections.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const ongoing = elections.filter((e) => e.lifecycleStage === 'ONGOING');
  const upcoming = elections.filter((e) => e.lifecycleStage === 'UPCOMING')
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime));
  const published = elections.filter((e) => e.lifecycleStage === 'RESULTS_PUBLISHED')
    .sort((a, b) => new Date(b.resultsPublishedAt || b.endTime) - new Date(a.resultsPublishedAt || a.endTime)).slice(0, 3);
  const verified = voterStatus?.otpVerified;

  const quickActions = [
    { label: 'View Elections', to: '/elections', icon: Vote },
    { label: 'Notifications', to: '/dashboard/notifications', icon: Bell },
    { label: 'Profile', to: '/dashboard/profile', icon: UserCircle2 },
    { label: 'My Complaints', to: '/dashboard/complaints', icon: MessageSquareWarning },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 lg:ml-64">
      <div className="mx-auto max-w-6xl space-y-8">
        <section className="rounded-2xl bg-gradient-to-r from-[#1E3A8A] via-blue-600 to-teal-500 p-6 text-white shadow-md sm:p-8">
          <h1 className="text-2xl font-bold sm:text-3xl">Welcome, {user?.firstName || 'Voter'}</h1>
          <p className="mt-1 text-blue-100">Here&apos;s what&apos;s happening in your elections.</p>
          {voterStatus && (
            <div className={`mt-4 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${verified ? 'bg-white/15' : 'bg-amber-400 text-amber-950'}`}>
              {verified
                ? <><ShieldCheck className="h-4 w-4" aria-hidden="true" /> Voter verification complete</>
                : <><ShieldAlert className="h-4 w-4" aria-hidden="true" /> Voter verification required before voting · <Link to="/voter-login" className="underline">Verify now</Link></>}
            </div>
          )}
        </section>

        {loading ? <LoadingState label="Loading your elections…" /> : error ? <ErrorState message={error} onRetry={load} /> : (
          <>
            <section aria-labelledby="active-heading">
              <h2 id="active-heading" className="mb-3 text-lg font-bold text-slate-900">Active Elections</h2>
              {ongoing.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {ongoing.map((e) => <ElectionCard key={e._id} election={e} hasVoted={voted[e._id]} onStageChange={load} />)}
                </div>
              ) : <EmptyState icon={Vote} title="No elections are open for voting right now." />}
            </section>

            <section aria-labelledby="upcoming-heading">
              <h2 id="upcoming-heading" className="mb-3 text-lg font-bold text-slate-900">Upcoming Elections</h2>
              {upcoming.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {upcoming.map((e) => <ElectionCard key={e._id} election={e} onStageChange={load} />)}
                </div>
              ) : <EmptyState icon={CalendarClock} title="No upcoming elections." />}
            </section>

            {published.length > 0 && (
              <section aria-labelledby="results-heading">
                <h2 id="results-heading" className="mb-3 text-lg font-bold text-slate-900">Recently Published Results</h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {published.map((e) => <ElectionCard key={e._id} election={e} />)}
                </div>
              </section>
            )}
          </>
        )}

        <div className="grid gap-6 lg:grid-cols-5">
          <section className="lg:col-span-3" aria-labelledby="notes-heading">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="notes-heading" className="text-lg font-bold text-slate-900">Notifications</h2>
              <Link to="/dashboard/notifications" className="text-sm font-semibold text-blue-700 hover:underline">View all</Link>
            </div>
            <div className="divide-y overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
              {notesLoading ? <p className="p-4 text-sm text-slate-500">Loading…</p>
                : notifications.length === 0 ? <p className="p-4 text-sm text-slate-500">No notifications.</p>
                  : notifications.map((n) => <NotificationItem key={n._id} notification={n} onOpen={openNotification} />)}
            </div>
          </section>

          <section className="lg:col-span-2" aria-labelledby="qa-heading">
            <h2 id="qa-heading" className="mb-3 text-lg font-bold text-slate-900">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((a) => (
                <Link key={a.label} to={a.to} className="flex flex-col items-center gap-2 rounded-xl bg-white p-4 text-center text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:text-[#1E3A8A] hover:ring-blue-300">
                  <a.icon className="h-6 w-6 text-[#1E3A8A]" aria-hidden="true" /> {a.label}
                </Link>
              ))}
              <button
                onClick={() => window.dispatchEvent(new Event('open-chatbot'))}
                className="col-span-2 flex items-center justify-center gap-2 rounded-xl bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:text-[#1E3A8A] hover:ring-blue-300"
              >
                <Bot className="h-6 w-6 text-[#1E3A8A]" aria-hidden="true" /> Help / Chatbot
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
