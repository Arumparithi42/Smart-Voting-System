import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { CheckCircle2, ClipboardList, Download, PlusCircle } from "lucide-react";
import { downloadReceiptPdf } from "../utils/downloadReceipt";
import axiosInstance from "../utils/axiosInstance";
import PageHeader from "../components/ui/PageHeader";
import ElectionStatusBadge from "../components/ui/ElectionStatusBadge";
import ElectionCountdown from "../components/ElectionCountdown";
import { useConfirm } from "../components/ui/ConfirmDialog";
import { EmptyState, ErrorState, LoadingState } from "../components/ui/States";
import { formatDateTime } from "../utils/electionStages";
import StageTabs, { useStageFilter } from "../components/ui/StageTabs";
import { EMPTY_MESSAGES, filterByStage } from "../utils/stageFilters";

const ADMIN_TABS = ["all", "draft", "upcoming", "ongoing", "past", "pending", "published"];
const VOTER_TABS = ["all", "ongoing", "past"];

// Admins: manage every election (incl. drafts). Voters: their voting
// history - elections they took part in (never which candidate).
const ElectionList = ({ isAdmin }) => {
  const confirm = useConfirm();
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const tabs = isAdmin ? ADMIN_TABS : VOTER_TABS;
  const [stage, setStage] = useStageFilter(tabs);

  // The role arrives after the first render, so a slow voter-mode request
  // can finish after the admin one; only the latest request may update state.
  const latestRequest = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++latestRequest.current;
    try {
      const response = await axiosInstance.get("/api/elections");
      let list = response.data;
      if (!isAdmin) {
        const started = list.filter((e) => ["ONGOING", "ENDED", "RESULTS_PUBLISHED"].includes(e.lifecycleStage));
        const statuses = await Promise.all(started.map((e) => axiosInstance
          .get(`/api/elections/${e._id}/my-vote-status`)
          .then((r) => (r.data.hasVoted ? { ...e, votedAt: r.data.votedAt } : null))
          .catch(() => null)));
        list = statuses.filter(Boolean).sort((a, b) => new Date(b.votedAt) - new Date(a.votedAt));
      }
      if (requestId !== latestRequest.current) return;
      setElections(list);
      setError("");
    } catch (err) {
      if (requestId !== latestRequest.current) return;
      setError(err.response?.data?.message || "Unable to load elections.");
    } finally {
      if (requestId === latestRequest.current) setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { load(); }, [load]);

  const act = async (election, { title, message, confirmLabel, tone, request, success }) => {
    if (!(await confirm({ title, message, confirmLabel, tone }))) return;
    setBusyId(election._id);
    try {
      await request();
      toast.success(success);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Action failed");
    } finally {
      setBusyId(null);
    }
  };

  // "Show this election on the home page" Yes/No (admin only, server-enforced).
  const toggleHomePage = async (election, value) => {
    setBusyId(election._id);
    try {
      const res = await axiosInstance.put(`/api/admin/elections/${election._id}/home-visibility`, { showOnHomePage: value });
      toast.success(res.data.message);
      setElections((list) => list.map((x) => (x._id === election._id ? { ...x, showOnHomePage: value } : x)));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not update home page visibility");
    } finally {
      setBusyId(null);
    }
  };

  const startElection = (e) => {
    if (!e.candidates?.length) return toast.error("Add at least one candidate before starting the election");
    return act(e, {
      title: "Start this election now?",
      message: `Voting for "${e.title}" opens immediately and candidates can no longer be changed.`,
      confirmLabel: "Start election",
      request: () => axiosInstance.put(`/api/admin/elections/${e._id}/start`),
      success: "Election started",
    });
  };
  const endElection = (e) => act(e, {
    title: "End this election?",
    message: `Are you sure you want to end "${e.title}"? Voting closes immediately for everyone. This cannot be undone.`,
    confirmLabel: "End election",
    tone: "danger",
    request: () => axiosInstance.put(`/api/admin/elections/${e._id}/end`),
    success: "Election ended",
  });
  const scheduleElection = (e) => act(e, {
    title: "Schedule this election?",
    message: `"${e.title}" becomes visible to voters and opens automatically at ${formatDateTime(e.startTime)}.`,
    confirmLabel: "Schedule",
    request: () => axiosInstance.put(`/api/admin/elections/${e._id}/schedule`),
    success: "Election scheduled",
  });

  const btn = "rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50";

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-8">
      <div className="mx-auto max-w-7xl">
        <PageHeader
          title={isAdmin ? "Manage Elections" : "Voting History"}
          subtitle={isAdmin ? "Official elections, from draft to published results." : "Elections you have voted in. Your choices are never stored with your account."}
          actions={isAdmin && (
            <Link to="/createElection" className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#1E3A8A] hover:bg-blue-50">
              <PlusCircle className="h-4 w-4" aria-hidden="true" /> Create New Election
            </Link>
          )}
        />

        {!loading && !error && elections.length > 0 && (
          <StageTabs elections={elections} allowed={tabs} value={stage} onChange={setStage} />
        )}

        {loading ? <LoadingState label="Loading elections…" /> : error ? <ErrorState message={error} onRetry={load} /> : filterByStage(elections, stage).length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={elections.length === 0 && !isAdmin ? "You haven't voted in any election yet." : EMPTY_MESSAGES[stage]}
            action={!isAdmin && <Link to="/elections" className="rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-semibold text-white">Browse elections</Link>}
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {filterByStage(elections, stage).map((election) => {
              const stage = election.lifecycleStage;
              const busy = busyId === election._id;
              return (
                <article key={election._id} className="flex flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{election.title}</h2>
                    <ElectionStatusBadge stage={stage} />
                  </div>
                  {election.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{election.description}</p>}
                  <p className="mt-2 text-xs text-slate-500">{formatDateTime(election.startTime)} – {formatDateTime(election.endTime)}</p>
                  {isAdmin && <p className="text-xs text-slate-500">{election.candidates?.length || 0} candidate(s)</p>}
                  {isAdmin && ["DRAFT", "UPCOMING", "ONGOING"].includes(stage) && (
                    <label className="mt-2 inline-flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#1E3A8A]"
                        checked={!!election.showOnHomePage}
                        disabled={busyId === election._id}
                        onChange={(e) => toggleHomePage(election, e.target.checked)}
                      />
                      Show on home page
                    </label>
                  )}
                  {!isAdmin && election.votedAt && (
                    <p className="mt-2 inline-flex items-center gap-1 text-sm text-green-700"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Voted {formatDateTime(election.votedAt)}</p>
                  )}
                  <ElectionCountdown election={election} onStageChange={load} compact className="mt-3" />

                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    {isAdmin && stage === "DRAFT" && (
                      <>
                        <Link to={`/elections/${election._id}`} className={`${btn} text-[#1E3A8A] ring-1 ring-slate-300 hover:bg-slate-50`}>Edit Candidates</Link>
                        <button disabled={busy} onClick={() => scheduleElection(election)} className={`${btn} bg-green-600 text-white hover:bg-green-700`}>Schedule</button>
                      </>
                    )}
                    {isAdmin && stage === "UPCOMING" && (
                      <>
                        <Link to={`/elections/${election._id}`} className={`${btn} text-[#1E3A8A] ring-1 ring-slate-300 hover:bg-slate-50`}>Manage Candidates</Link>
                        <button
                          disabled={busy || !election.candidates?.length}
                          title={!election.candidates?.length ? "Add at least one candidate before starting" : "Start election now"}
                          onClick={() => startElection(election)}
                          className={`${btn} bg-green-600 text-white hover:bg-green-700 disabled:cursor-not-allowed`}
                        >
                          Start Now
                        </button>
                      </>
                    )}
                    {isAdmin && stage === "ONGOING" && (
                      <>
                        <Link to={`/dashboard/live-results/${election._id}`} className={`${btn} bg-[#1E3A8A] text-white hover:bg-blue-800`}>Live Results</Link>
                        <button disabled={busy} onClick={() => endElection(election)} className={`${btn} bg-red-600 text-white hover:bg-red-700`}>End Election</button>
                      </>
                    )}
                    {isAdmin && (stage === "ENDED" || stage === "RESULTS_PUBLISHED") && (
                      <Link to={`/dashboard/admin/results/${election._id}`} className={`${btn} bg-[#1E3A8A] text-white hover:bg-blue-800`}>
                        {stage === "RESULTS_PUBLISHED" ? "Results & Emails" : "Review & Publish Results"}
                      </Link>
                    )}
                    {!isAdmin && stage === "RESULTS_PUBLISHED" && (
                      <Link to={`/result/${election._id}`} className={`${btn} bg-[#1E3A8A] text-white hover:bg-blue-800`}>View Results</Link>
                    )}
                    {!isAdmin && (
                      <button
                        onClick={() => downloadReceiptPdf(election._id, election.title).catch(() => toast.error("Could not download the receipt."))}
                        className={`${btn} inline-flex items-center gap-1.5 text-green-700 ring-1 ring-green-300 hover:bg-green-50`}
                      >
                        <Download className="h-4 w-4" aria-hidden="true" /> Receipt PDF
                      </button>
                    )}
                    {!isAdmin && stage !== "RESULTS_PUBLISHED" && (
                      <Link to={`/vote/${election._id}`} className={`${btn} text-[#1E3A8A] ring-1 ring-slate-300 hover:bg-slate-50`}>View Receipt</Link>
                    )}
                    {!isAdmin && stage === "ENDED" && <span className="py-2 text-sm text-slate-500">Results have not been published yet.</span>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ElectionList;
