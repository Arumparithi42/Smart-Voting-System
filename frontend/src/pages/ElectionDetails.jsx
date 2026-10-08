import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { CalendarDays, CheckCircle2, FileText, Info, ShieldCheck, Trophy, UserRound, Vote, X } from 'lucide-react';
import { mediaUrl } from '../utils/media';
import axiosInstance from '../utils/axiosInstance';
import ElectionCountdown from '../components/ElectionCountdown';
import ElectionStatusBadge from '../components/ui/ElectionStatusBadge';
import { ErrorState, LoadingState } from '../components/ui/States';
import { formatDateTime, stageAt } from '../utils/electionStages';
import CandidateManifestoFiles from '../components/documents/CandidateManifestoFiles';
import { serverNow } from '../utils/serverClock';

function CandidateModal({ candidate, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-4 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-labelledby="cand-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="cand-title" className="text-xl font-bold text-slate-900">{candidate.name}</h2>
            <p className="text-sm text-slate-500">{candidate.partyName || 'Independent'}</p>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-500 hover:bg-slate-100" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>
        {candidate.qualification && <p className="mt-3 text-sm"><span className="font-semibold">Qualification:</span> {candidate.qualification}</p>}
        {candidate.occupation && <p className="mt-1 text-sm"><span className="font-semibold">Occupation:</span> {candidate.occupation}</p>}
        {candidate.about && <><h3 className="mt-4 font-semibold">About</h3><p className="whitespace-pre-wrap text-sm text-slate-700">{candidate.about}</p></>}
        {candidate.manifesto && <><h3 className="mt-4 font-semibold">Manifesto</h3><p className="whitespace-pre-wrap text-sm text-slate-700">{candidate.manifesto}</p></>}
        <CandidateManifestoFiles candidate={candidate} className="mt-4" />
        {candidate.promises?.length > 0 && (
          <><h3 className="mt-4 font-semibold">Key promises</h3><ul className="list-disc pl-5 text-sm text-slate-700">{candidate.promises.map((p, i) => <li key={i}>{p}</li>)}</ul></>
        )}
      </div>
    </div>
  );
}

// Public election details. Shows only public data plus, for a signed-in
// user, whether THEY voted. The Vote button is a convenience - the server
// re-checks timing, eligibility and duplicates on every vote.
export default function ElectionDetails() {
  const { electionId } = useParams();
  const { isSignedIn } = useUser();
  const [election, setElection] = useState(null);
  const [error, setError] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [verified, setVerified] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [stage, setStage] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get(`/api/elections/${electionId}`);
      setElection(res.data);
      setStage(stageAt(res.data, serverNow()));
      setError('');
    } catch (err) {
      setError(err.response?.status === 404 ? 'Election not found.' : 'Unable to load election details.');
    }
  }, [electionId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!isSignedIn) return;
    axiosInstance.get(`/api/elections/${electionId}/my-vote-status`).then((r) => setHasVoted(r.data.hasVoted)).catch(() => {});
    axiosInstance.get('/api/voter/status').then((r) => setVerified(!!r.data.otpVerified)).catch(() => {});
  }, [electionId, isSignedIn]);

  return (
    <div className="app-ui min-h-screen bg-gradient-to-b from-yellow-50 to-white">
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-8 sm:px-6">
        {error ? <ErrorState className="mt-6" message={error} onRetry={error.startsWith('Unable') ? load : undefined} />
          : !election ? <LoadingState label="Loading election…" /> : (
            <div className="mt-4 space-y-6">
              <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 sm:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    {election.category && <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{election.category}</p>}
                    <h1 className="text-2xl font-bold text-[#1E3A8A] sm:text-3xl">{election.title}</h1>
                  </div>
                  <ElectionStatusBadge stage={stage} className="self-start" />
                </div>
                {election.description && <p className="mt-3 text-slate-700">{election.description}</p>}
                {election.purpose && <p className="mt-2 text-sm text-slate-600"><span className="font-semibold">Purpose:</span> {election.purpose}</p>}
                {election.manifest?.fileId && (
                  <a href={mediaUrl(`/api/elections/${election._id}/manifest`)} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-[#1E3A8A] ring-1 ring-blue-200 hover:bg-blue-100">
                    <FileText className="h-4 w-4" aria-hidden="true" /> View election manifest
                  </a>
                )}
                <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <p className="flex items-center gap-2 text-slate-700"><CalendarDays className="h-4 w-4 text-slate-400" aria-hidden="true" /><span><span className="font-semibold">Starts:</span> {formatDateTime(election.startTime)}</span></p>
                  <p className="flex items-center gap-2 text-slate-700"><CalendarDays className="h-4 w-4 text-slate-400" aria-hidden="true" /><span><span className="font-semibold">Ends:</span> {formatDateTime(election.endTime)}</span></p>
                </div>
                <ElectionCountdown election={election} onStageChange={(s) => { setStage(s); load(); }} className="mt-5" />

                <div className="mt-6 flex flex-wrap gap-3">
                  {stage === 'ONGOING' && !hasVoted && (
                    <Link to={`/vote/${election._id}`} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 font-semibold text-white hover:bg-green-700">
                      <Vote className="h-5 w-5" aria-hidden="true" /> Vote Now
                    </Link>
                  )}
                  {hasVoted && (
                    <Link to={`/vote/${election._id}`} className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-5 py-2.5 font-semibold text-green-800 ring-1 ring-green-200">
                      <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> You voted · view receipt
                    </Link>
                  )}
                  {stage === 'RESULTS_PUBLISHED' && (
                    <Link to={`/result/${election._id}`} className="inline-flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-5 py-2.5 font-semibold text-white hover:bg-blue-800">
                      <Trophy className="h-5 w-5" aria-hidden="true" /> View Results
                    </Link>
                  )}
                  {stage === 'ENDED' && <p className="rounded-lg bg-slate-100 px-4 py-2.5 text-sm text-slate-700">Results have not been published yet.</p>}
                </div>
              </section>

              <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                <h2 className="mb-4 text-lg font-bold text-slate-900">Candidates ({election.candidates?.length || 0})</h2>
                {!election.candidates?.length ? <p className="text-sm text-slate-500">No candidates have been announced yet.</p> : (
                  <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {election.candidates.map((c) => (
                      <li key={c._id} className="flex min-w-0 items-center gap-3 rounded-xl p-3 ring-1 ring-slate-200">
                        {c.profilePhotoUrl
                          ? <img src={c.profilePhotoUrl} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
                          : <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400"><UserRound className="h-7 w-7" aria-hidden="true" /></span>}
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-slate-900">{c.name}</p>
                          <p className="truncate text-sm text-slate-500">{c.partyName || 'Independent'}{c.documents?.length ? ' · manifesto available' : ''}</p>
                        </div>
                        <button onClick={() => setViewing(c)} className="shrink-0 text-sm font-semibold text-blue-700 hover:underline">Details</button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div className="grid gap-6 md:grid-cols-2">
                <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900"><Info className="h-5 w-5 text-[#1E3A8A]" aria-hidden="true" /> How to vote</h2>
                  <ol className="list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
                    <li>Sign in and complete voter verification (Voter ID, email and OTP).</li>
                    <li>While voting is open, press <strong>Vote Now</strong>.</li>
                    <li>Select one candidate and confirm your choice.</li>
                    <li>Save your receipt ID - it proves your vote was counted without revealing your choice.</li>
                  </ol>
                </section>
                <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
                  <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900"><ShieldCheck className="h-5 w-5 text-[#1E3A8A]" aria-hidden="true" /> Eligibility</h2>
                  <p className="text-sm text-slate-700">Students listed in the college voter registry who have completed phone OTP verification can vote once in this election.</p>
                  {isSignedIn && verified !== null && (
                    <p className={`mt-3 rounded-lg px-3 py-2 text-sm font-medium ${verified ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'}`}>
                      {verified ? 'Your voter verification is complete.' : <>Your verification is pending. <Link to="/voter-login" className="underline">Verify now</Link></>}
                    </p>
                  )}
                  {!isSignedIn && <p className="mt-3 text-sm"><Link to="/sign-in" className="font-semibold text-blue-700 underline">Sign in</Link> to vote.</p>}
                </section>
              </div>
            </div>
          )}
      </main>
      {viewing && <CandidateModal candidate={viewing} onClose={() => setViewing(null)} />}
    </div>
  );
}
