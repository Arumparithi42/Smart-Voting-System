import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Lock, PlusCircle, Trash2, UserRound } from "lucide-react";
import axiosInstance from "../utils/axiosInstance";
import PageHeader from "../components/ui/PageHeader";
import ElectionStatusBadge from "../components/ui/ElectionStatusBadge";
import Req, { RequiredNote } from "../components/ui/Req";
import { useConfirm } from "../components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "../components/ui/States";
import CandidateDocuments from "../components/documents/CandidateDocuments";
import ManifestManager from "../components/documents/ManifestManager";
import ManifestoFileInput, { uploadCandidateManifesto } from "../components/documents/ManifestoFileInput";
import { formatDateTime } from "../utils/electionStages";

const emptyCandidate = { name: "", partyName: "", about: "" };

// Admin: manage an election's candidates (before voting starts), their
// documents/manifestos, and the election manifest.
export default function ElectionDetail() {
  const { id } = useParams();
  const confirm = useConfirm();
  const [election, setElection] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyCandidate);
  const [manifestoFile, setManifestoFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await axiosInstance.get(`/api/elections/${id}`);
      setElection(res.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load election details.");
    }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const addCandidate = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await axiosInstance.post(`/api/admin/elections/${id}/candidates`, form);
      if (manifestoFile) {
        await uploadCandidateManifesto("/api/admin", id, res.data.candidate._id, manifestoFile)
          .catch((err) => toast.warn(`Candidate added, but the manifesto upload failed: ${err.response?.data?.message || err.message}`));
      }
      toast.success("Candidate added.");
      setForm(emptyCandidate);
      setManifestoFile(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not add candidate");
    } finally {
      setBusy(false);
    }
  };

  const removeCandidate = async (c) => {
    if (!(await confirm({ title: "Remove candidate?", message: `Remove ${c.name} from this election?`, confirmLabel: "Remove", tone: "danger" }))) return;
    try {
      await axiosInstance.delete(`/api/admin/elections/${id}/candidates/${c._id}`);
      toast.success("Candidate removed.");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not remove candidate");
    }
  };

  if (error) return <div className="p-4 sm:p-8"><ErrorState message={error} onRetry={load} /></div>;
  if (!election) return <LoadingState label="Loading election…" />;

  const locked = !["draft", "upcoming"].includes(election.effectiveStatus);
  const input = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <PageHeader title={election.title} subtitle={`${formatDateTime(election.startTime)} – ${formatDateTime(election.endTime)}`} actions={<ElectionStatusBadge stage={election.lifecycleStage} />} />

        <ManifestManager apiBase="/api/admin" electionId={election._id} manifest={election.manifest} onChange={load} />

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">Candidates ({election.candidates?.length || 0})</h2>
            {locked && <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500"><Lock className="h-3.5 w-3.5" aria-hidden="true" /> Locked - voting has started</span>}
          </div>

          {!election.candidates?.length ? <p className="text-sm text-slate-500">No candidates yet.</p> : (
            <ul className="space-y-4">
              {election.candidates.map((c) => (
                <li key={c._id} className="rounded-xl p-4 ring-1 ring-slate-200">
                  <div className="flex items-start gap-3">
                    {c.profilePhotoUrl
                      ? <img src={c.profilePhotoUrl} alt="" className="h-12 w-12 rounded-full object-cover" />
                      : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400"><UserRound className="h-6 w-6" aria-hidden="true" /></span>}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900">{c.name} {c.qualification && <span className="font-normal text-slate-500">({c.qualification})</span>}</p>
                      <p className="text-sm text-slate-500">{c.partyName || "Independent"}</p>
                      {c.about && <p className="mt-1 text-sm text-slate-600">{c.about}</p>}
                    </div>
                    {!locked && (
                      <button onClick={() => removeCandidate(c)} className="rounded-md p-2 text-red-600 hover:bg-red-50" aria-label={`Remove ${c.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <CandidateDocuments apiBase="/api/admin" electionId={election._id} candidate={c} onChange={load} />
                </li>
              ))}
            </ul>
          )}

          {!locked && (
            <form onSubmit={addCandidate} className="mt-6 space-y-3 border-t pt-4">
              <h3 className="font-semibold text-slate-900">Add candidate</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">Name<Req />
                  <input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={200} />
                </label>
                <label className="block text-sm font-medium text-slate-700">Party
                  <input className={input} value={form.partyName} onChange={(e) => setForm({ ...form, partyName: e.target.value })} maxLength={200} />
                </label>
              </div>
              <label className="block text-sm font-medium text-slate-700">About
                <textarea className={input} rows={2} value={form.about} onChange={(e) => setForm({ ...form, about: e.target.value })} maxLength={2000} />
              </label>
              <ManifestoFileInput file={manifestoFile} onChange={setManifestoFile} />
              <div className="flex items-center justify-between gap-3">
                <RequiredNote />
                <button disabled={busy} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:bg-slate-400">
                  <PlusCircle className="h-4 w-4" aria-hidden="true" /> Add Candidate
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
