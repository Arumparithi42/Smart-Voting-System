import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Archive, MessageSquareHeart, CalendarClock, FileCheck2, FilePlus2, IdCard, MailWarning, MessageSquareWarning, PlusCircle, Trophy, Users, Vote } from 'lucide-react';
import axiosInstance from '../../utils/axiosInstance';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import { ErrorState } from '../../components/ui/States';

export default function AdminDashboard() {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    axiosInstance.get('/api/admin/dashboard-summary')
      .then((res) => { setSummary(res.data); setError(''); })
      .catch((err) => setError(err.response?.data?.message || 'Unable to load dashboard.'));
  }, []);
  useEffect(() => { load(); }, [load]);

  const loading = !summary && !error;
  const s = summary || { elections: {} };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="Admin Dashboard"
          subtitle="Proposals, elections, result publication and complaints at a glance."
          actions={<Link to="/createElection" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#1E3A8A] hover:bg-blue-50"><PlusCircle className="h-4 w-4" aria-hidden="true" /> Create Election</Link>}
        />
        {error ? <ErrorState message={error} onRetry={load} /> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard loading={loading} label="Pending Proposals" value={s.pendingProposals} icon={FilePlus2} to="/dashboard/admin/proposals" hint="From Election Officers" />
            <StatCard loading={loading} label="Upcoming Elections" value={s.elections.UPCOMING} icon={CalendarClock} to="/dashboard/elections?stage=upcoming" hint="Scheduled, not started yet" />
            <StatCard loading={loading} label="Ongoing Elections" value={s.elections.ONGOING} icon={Vote} to="/dashboard/elections?stage=ongoing" hint="Voting open now" />
            <StatCard loading={loading} label="Past Elections" value={(s.elections.ENDED || 0) + (s.elections.RESULTS_PUBLISHED || 0)} icon={Archive} to="/dashboard/elections?stage=past" hint="Closed and published" />
            <div className="flex flex-col gap-2">
              <StatCard loading={loading} label="Results Pending" value={s.resultsPending} icon={Trophy} to="/dashboard/elections?stage=pending" hint="Ended, awaiting publication" />
              <Link to="/dashboard/elections?stage=published" className="rounded-lg px-3 py-1.5 text-center text-sm font-semibold text-blue-700 ring-1 ring-slate-200 hover:bg-white">
                View published results ({s.elections.RESULTS_PUBLISHED ?? 0})
              </Link>
            </div>
            <StatCard loading={loading} label="New Feedback" value={s.newFeedback} icon={MessageSquareHeart} to="/dashboard/admin/feedback" hint="Submitted or under review" />
            <StatCard loading={loading} label="Open Complaints" value={s.openComplaints} icon={MessageSquareWarning} to="/dashboard/admin/complaints" hint="Open or under review" />
            <StatCard loading={loading} label="Failed Result Emails" value={s.failedResultEmails} icon={MailWarning} to="/dashboard/admin/result-emails" hint="Review and retry deliveries" />
            {s.elections.DRAFT > 0 && (
              <StatCard loading={loading} label="Draft Elections" value={s.elections.DRAFT} icon={FilePlus2} to="/dashboard/elections?stage=draft" hint="Approved, waiting to be scheduled" />
            )}
          </div>
        )}

        <h2 className="mb-3 mt-8 text-lg font-bold text-slate-900">Manage</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { to: '/dashboard/elections', label: 'Official Elections', icon: Vote },
            { to: '/admin/candidate-applications', label: 'Candidate Applications', icon: FileCheck2 },
            { to: '/dashboard/admin/users', label: 'Officers & Users', icon: Users },
            { to: '/voter-registry', label: 'Voter Registry', icon: IdCard },
          ].map((l) => (
            <Link key={l.to} to={l.to} className="flex items-center gap-3 rounded-xl bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:text-[#1E3A8A] hover:ring-blue-300">
              <l.icon className="h-5 w-5 text-[#1E3A8A]" aria-hidden="true" /> {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
