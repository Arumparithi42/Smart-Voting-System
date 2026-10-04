import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Lock, ShieldAlert, ShieldCheck } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';
import PageHeader from '../components/ui/PageHeader';
import { ErrorState, LoadingState } from '../components/ui/States';

const ROLE_LABEL = { admin: 'Admin', officer: 'Election Officer', user: 'Voter' };

// Only display name, bio and photo URL are editable. Voter ID, registered
// email and phone come from the trusted registry and are read-only; the
// API never returns Aadhaar data, OTPs or passwords.
export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', bio: '', profileUrl: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get('/api/profile');
      setProfile(res.data);
      setForm({ firstName: res.data.firstName, lastName: res.data.lastName, bio: res.data.bio, profileUrl: res.data.profileUrl });
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load your profile.');
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await axiosInstance.patch('/api/profile', {
        firstName: form.firstName, lastName: form.lastName, bio: form.bio, profileUrl: form.profileUrl,
      });
      setProfile(res.data.profile);
      setSaveMessage({ ok: true, text: res.data.message });
      toast.success(res.data.message);
      window.dispatchEvent(new Event('profile-updated'));
    } catch (err) {
      const text = err.response?.data?.message || 'Could not update profile.';
      setSaveMessage({ ok: false, text });
      toast.error(text);
    } finally {
      setSaving(false);
    }
  };

  if (error) return <div className="p-4 sm:p-8 lg:ml-64"><ErrorState message={error} onRetry={load} /></div>;
  if (!profile) return <div className="lg:ml-64"><LoadingState label="Loading profile…" /></div>;

  const input = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';
  const vi = profile.voterIdentity;
  const ReadOnly = ({ label, value }) => (
    <div>
      <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500"><Lock className="h-3 w-3" aria-hidden="true" /> {label}</p>
      <p className="mt-1 break-all text-sm font-medium text-slate-900">{value || '—'}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8 lg:ml-64">
      <div className="mx-auto max-w-4xl">
        <PageHeader title="My Profile" subtitle="Update how you appear in the Smart Voting System." />
        <div className="grid gap-6 lg:grid-cols-5">
          <form onSubmit={save} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-3">
            <div className="flex items-center gap-4">
              {form.profileUrl
                ? <img src={form.profileUrl} alt="Profile preview" className="h-16 w-16 rounded-full object-cover ring-2 ring-slate-200" />
                : <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1E3A8A] text-2xl font-bold text-white">{(form.firstName || 'U')[0]}</span>}
              <div>
                <p className="font-semibold text-slate-900">{profile.firstName} {profile.lastName}</p>
                <p className="text-sm text-slate-500">{ROLE_LABEL[profile.role] || 'Voter'}</p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">First name
                <input className={input} value={form.firstName} maxLength={50} required onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </label>
              <label className="block text-sm font-medium text-slate-700">Last name
                <input className={input} value={form.lastName} maxLength={50} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </label>
            </div>
            <label className="block text-sm font-medium text-slate-700">Profile image URL
              <input className={input} type="url" placeholder="https://…" value={form.profileUrl} maxLength={500} onChange={(e) => setForm({ ...form, profileUrl: e.target.value })} />
              <span className="mt-1 block text-xs text-slate-500">Must be an https:// link to an image.</span>
            </label>
            <label className="block text-sm font-medium text-slate-700">Bio
              <textarea className={input} rows={3} maxLength={300} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
              <span className="mt-1 block text-right text-xs text-slate-400">{form.bio.length}/300</span>
            </label>
            {saveMessage && (
              <p role="status" className={`rounded-lg px-3 py-2 text-sm ${saveMessage.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>{saveMessage.text}</p>
            )}
            <button disabled={saving} className="rounded-lg bg-[#1E3A8A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:bg-slate-400">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>

          <aside className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-2">
            <h2 className="font-bold text-slate-900">Account &amp; voter identity</h2>
            <ReadOnly label="Account email" value={profile.email} />
            {vi ? (
              <>
                <ReadOnly label="Voter ID / Register No." value={vi.voterId} />
                <ReadOnly label="Registered email" value={vi.registeredEmail} />
                <ReadOnly label="Registered phone" value={vi.maskedPhone} />
                <p className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${vi.otpVerified ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
                  {vi.otpVerified ? <ShieldCheck className="h-4 w-4" aria-hidden="true" /> : <ShieldAlert className="h-4 w-4" aria-hidden="true" />}
                  {vi.otpVerified ? 'Voter verification complete' : 'Voter verification pending'}
                </p>
              </>
            ) : (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                No voter record linked yet. <Link to="/voter-login" className="font-semibold underline">Complete voter verification</Link>
              </p>
            )}
            <p className="text-xs text-slate-500">
              Identity details come from the verified college voter registry and can&apos;t be changed here. Your Aadhaar number is never stored or shown. If something is wrong, <Link to="/dashboard/complaints" className="text-blue-700 underline">raise a complaint</Link>.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
