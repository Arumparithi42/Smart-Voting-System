import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Camera, Lock, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react';
import { mediaUrl } from '../utils/media';
import { useConfirm } from '../components/ui/ConfirmDialog';

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
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
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef(null);
  const confirm = useConfirm();

  const uploadPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpeg|gif|webp)$/.test(file.type)) return toast.error('Please choose a PNG, JPEG, GIF or WebP image.');
    if (file.size > MAX_PHOTO_BYTES) return toast.error('Profile photo must be at most 2 MB.');
    const body = new FormData();
    body.append('photo', file);
    setUploading(true);
    try {
      const res = await axiosInstance.post('/api/profile/photo', body);
      setProfile(res.data.profile);
      toast.success(res.data.message);
      window.dispatchEvent(new Event('profile-updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not upload photo.');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async () => {
    if (!(await confirm({ title: 'Remove profile photo?', message: 'Your initial will be shown instead.', confirmLabel: 'Remove', tone: 'danger' }))) return;
    try {
      const res = await axiosInstance.delete('/api/profile/photo');
      setProfile(res.data.profile);
      toast.success(res.data.message);
      window.dispatchEvent(new Event('profile-updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not remove photo.');
    }
  };

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
        firstName: form.firstName, lastName: form.lastName, bio: form.bio,
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

  if (error) return <div className="p-4 sm:p-8"><ErrorState message={error} onRetry={load} /></div>;
  if (!profile) return <div className=""><LoadingState label="Loading profile…" /></div>;

  const input = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200';
  const vi = profile.voterIdentity;
  const photoSrc = mediaUrl(profile.photoPath) || profile.profileUrl || null;
  const ReadOnly = ({ label, value }) => (
    <div>
      <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-500"><Lock className="h-3 w-3" aria-hidden="true" /> {label}</p>
      <p className="mt-1 break-all text-sm font-medium text-slate-900">{value || '—'}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <PageHeader title="My Profile" subtitle="Update how you appear in the Smart Voting System." />
        <div className="grid gap-6 lg:grid-cols-5">
          <form onSubmit={save} className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 lg:col-span-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative h-24 w-24 shrink-0">
                {photoSrc
                  ? <img src={photoSrc} alt="Your profile photo" className="h-24 w-24 rounded-full object-cover ring-4 ring-slate-100" />
                  : <span className="flex h-24 w-24 items-center justify-center rounded-full bg-[#1E3A8A] text-3xl font-bold text-white">{(form.firstName || 'U')[0]}</span>}
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                  className="absolute -bottom-1 -right-1 rounded-full bg-white p-2 text-[#1E3A8A] shadow ring-1 ring-slate-200 hover:bg-blue-50"
                  aria-label="Change profile photo"
                >
                  <Camera className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{profile.firstName} {profile.lastName}</p>
                <p className="text-sm text-slate-500">{ROLE_LABEL[profile.role] || 'Voter'}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => fileInput.current?.click()} disabled={uploading} className="rounded-lg bg-[#1E3A8A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 disabled:bg-slate-400">
                    {uploading ? 'Uploading…' : profile.photoPath ? 'Change photo' : 'Upload photo'}
                  </button>
                  {profile.photoPath && (
                    <button type="button" onClick={removePhoto} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove
                    </button>
                  )}
                </div>
                <p className="mt-1 text-xs text-slate-500">PNG, JPEG, GIF or WebP, up to 2 MB.</p>
                <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={uploadPhoto} />
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
