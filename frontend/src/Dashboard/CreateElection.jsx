import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { FileText, PlusCircle, Trash2, Upload, X } from "lucide-react";
import PageHeader from "../components/ui/PageHeader";
import Req, { RequiredNote } from "../components/ui/Req";
import axiosInstance from "../utils/axiosInstance";
import ManifestoFileInput, { uploadCandidateManifesto } from "../components/documents/ManifestoFileInput";

const emptyCandidate = () => ({ name: "", partyName: "", about: "", manifestoFile: null });
const MAX_MANIFEST = 10 * 1024 * 1024;

// Admin: create an official election, optionally with its candidates, a
// manifest file and the "Show on home page" choice, in one form.
const CreateElection = () => {
  const navigate = useNavigate();
  const fileInput = useRef(null);
  const [form, setForm] = useState({ title: "", description: "", purpose: "", category: "", startTime: "", endTime: "" });
  const [showOnHomePage, setShowOnHomePage] = useState("no");
  const [candidates, setCandidates] = useState([emptyCandidate()]);
  const [manifest, setManifest] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const setField = (field) => (e) => setForm({ ...form, [field]: e.target.value });
  const setCandidate = (i, field, value) => setCandidates(candidates.map((c, j) => (j === i ? { ...c, [field]: value } : c)));

  const chooseManifest = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!["application/pdf", "image/png", "image/jpeg", "image/gif", "image/webp"].includes(file.type)) return toast.error("Manifest must be a PDF or an image.");
    if (file.size > MAX_MANIFEST) return toast.error("Manifest must be at most 10 MB.");
    setManifest(file);
  };

  const handleCreateElection = async (e) => {
    e.preventDefault();
    if (new Date(form.endTime) <= new Date(form.startTime)) return toast.error("End time must be after the start time.");
    const submitted = candidates.filter((c) => c.name.trim());
    setSubmitting(true);
    try {
      // datetime-local values are the admin's LOCAL time; send unambiguous
      // UTC instants so the server stores the intended moment.
      const res = await axiosInstance.post("/api/admin/elections", {
        ...form,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        showOnHomePage: showOnHomePage === "yes",
        candidates: submitted.map(({ name, partyName, about }) => ({ name, partyName, about })),
      });
      const electionId = res.data.election._id;
      // Each candidate's optional manifesto, matched to the created candidates
      // (returned in the order sent).
      const created = res.data.candidates || [];
      const uploads = submitted.map((c, i) => {
        const target = created.length === submitted.length ? created[i] : created.find((x) => x.name === c.name.trim());
        return c.manifestoFile && target ? uploadCandidateManifesto("/api/admin", electionId, target._id, c.manifestoFile) : null;
      }).filter(Boolean);
      const failed = (await Promise.allSettled(uploads)).filter((r) => r.status === "rejected").length;
      if (failed) toast.warn(`Election created, but ${failed} candidate manifesto upload(s) failed. You can add candidates again from the manage page.`);
      if (manifest) {
        const body = new FormData();
        body.append("manifest", manifest);
        await axiosInstance.post(`/api/admin/elections/${electionId}/manifest`, body)
          .catch((err) => toast.warn(`Election created, but the manifest upload failed: ${err.response?.data?.message || err.message}`));
      }
      toast.success("Election created");
      navigate(`/elections/${electionId}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not create election");
    } finally {
      setSubmitting(false);
    }
  };

  const input = "mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200";
  const label = "block text-sm font-medium text-slate-700";

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <PageHeader title="Create Election" subtitle="Enter the election details, its candidates and how it appears to voters." />

        <form onSubmit={handleCreateElection} className="space-y-6">
          <section className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Election details</h2>
            <label className={label}>Election title<Req />
              <input className={input} value={form.title} onChange={setField("title")} required maxLength={200} />
            </label>
            <label className={label}>Description<Req />
              <textarea className={input} rows={3} value={form.description} onChange={setField("description")} required />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={label}>Purpose
                <input className={input} value={form.purpose} onChange={setField("purpose")} />
              </label>
              <label className={label}>Category / type
                <input className={input} value={form.category} onChange={setField("category")} placeholder="e.g. Student Council" />
              </label>
              <label className={label}>Start date &amp; time<Req />
                <input type="datetime-local" className={input} value={form.startTime} onChange={setField("startTime")} required />
              </label>
              <label className={label}>End date &amp; time<Req />
                <input type="datetime-local" className={input} value={form.endTime} onChange={setField("endTime")} required />
              </label>
            </div>

            <fieldset>
              <legend className={label}>Show this election on the home page?<Req /></legend>
              <div className="mt-2 flex gap-3">
                {[["yes", "Yes"], ["no", "No"]].map(([value, text]) => (
                  <label key={value} className={`flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold ring-1 ${showOnHomePage === value ? "bg-blue-50 text-[#1E3A8A] ring-blue-400" : "bg-white text-slate-700 ring-slate-300"}`}>
                    <input type="radio" name="showOnHomePage" value={value} checked={showOnHomePage === value} onChange={() => setShowOnHomePage(value)} required />
                    {text}
                  </label>
                ))}
              </div>
              <p className="mt-1 text-xs text-slate-500">If Yes, it appears on the home page under Upcoming Elections before it starts and Ongoing Elections while voting is open.</p>
            </fieldset>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Candidates</h2>
              <button type="button" onClick={() => setCandidates([...candidates, emptyCandidate()])} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-[#1E3A8A] ring-1 ring-slate-300 hover:bg-slate-50">
                <PlusCircle className="h-4 w-4" aria-hidden="true" /> Add candidate
              </button>
            </div>
            <p className="mb-3 text-xs text-slate-500">Add as many candidates as needed, each with an optional manifesto (PDF or image). Leave a row&apos;s name empty to skip it. You can also add candidates later, before voting starts.</p>
            <div className="space-y-3">
              {candidates.map((c, i) => (
                <div key={i} className="grid gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200 sm:grid-cols-[1fr_1fr_2fr_auto_auto] sm:items-end">
                  <label className="block text-xs font-medium text-slate-600">Name{c.partyName || c.about || c.manifestoFile ? <Req /> : null}
                    <input className={input} value={c.name} onChange={(e) => setCandidate(i, "name", e.target.value)} required={!!(c.partyName || c.about || c.manifestoFile)} maxLength={200} aria-label={`Candidate ${i + 1} name`} />
                  </label>
                  <label className="block text-xs font-medium text-slate-600">Party
                    <input className={input} value={c.partyName} onChange={(e) => setCandidate(i, "partyName", e.target.value)} maxLength={200} />
                  </label>
                  <label className="block text-xs font-medium text-slate-600">About
                    <input className={input} value={c.about} onChange={(e) => setCandidate(i, "about", e.target.value)} maxLength={2000} />
                  </label>
                  <ManifestoFileInput file={c.manifestoFile} onChange={(f) => setCandidate(i, "manifestoFile", f)} label={`Candidate ${i + 1} manifesto (optional)`} compact />
                  <button type="button" onClick={() => setCandidates(candidates.filter((_, j) => j !== i))} className="rounded-md p-2 text-red-600 hover:bg-red-50" aria-label={`Remove candidate ${i + 1}`}>
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-lg font-bold text-slate-900">Election manifest (optional)</h2>
            <p className="mb-3 text-xs text-slate-500">Rules, notice or manifesto for voters. PDF or image, up to 10 MB. Shown on the election page.</p>
            {manifest ? (
              <div className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4 text-slate-500" aria-hidden="true" /> <span className="font-medium">{manifest.name}</span>
                <button type="button" onClick={() => setManifest(null)} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Remove manifest"><X className="h-4 w-4" /></button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold text-[#1E3A8A] ring-1 ring-slate-300 hover:bg-slate-50">
                <Upload className="h-4 w-4" aria-hidden="true" /> Choose file
              </button>
            )}
            <input ref={fileInput} type="file" accept="application/pdf,image/png,image/jpeg,image/gif,image/webp" className="hidden" onChange={chooseManifest} />
          </section>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <RequiredNote />
            <button type="submit" disabled={submitting} className="rounded-lg bg-green-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-green-700 disabled:bg-slate-400">
              {submitting ? "Creating…" : "Create Election"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateElection;
