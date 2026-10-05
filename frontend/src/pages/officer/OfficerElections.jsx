import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../utils/axiosInstance';
import { formatDateTime } from '../../utils/labels';
import ElectionStatusBadge from '../../components/ui/ElectionStatusBadge';
import PageHeader from '../../components/ui/PageHeader';
import StageTabs, { useStageFilter } from '../../components/ui/StageTabs';
import { EMPTY_MESSAGES, filterByStage } from '../../utils/stageFilters';

const TABS = ['all', 'upcoming', 'ongoing', 'past', 'pending', 'published'];

// Election Officer: monitor official (admin-approved) elections. Status and
// turnout only while voting is open; final aggregate results once it ends.
export default function OfficerElections() {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stage, setStage] = useStageFilter(TABS);

  useEffect(() => {
    axiosInstance
      .get('/api/officer/elections')
      .then((res) => setElections(res.data))
      .catch((error) => toast.error(error.response?.data?.message || 'Could not load elections'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        <PageHeader title={<>Monitor Elections</>} subtitle={<>Status and turnout of official elections. Results can be reviewed once voting closes.</>} />

        {loading ? (
          <p className="py-10 text-center text-slate-500">Loading…</p>
        ) : elections.length === 0 ? (
          <div className="bg-white p-6 rounded shadow text-center text-gray-500">No elections yet.</div>
        ) : (
          <>
          <StageTabs elections={elections} allowed={TABS} value={stage} onChange={setStage} />
          {filterByStage(elections, stage).length === 0 && <div className="bg-white p-6 rounded-xl shadow-sm text-center text-slate-500">{EMPTY_MESSAGES[stage]}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filterByStage(elections, stage).map((e) => (
              <div key={e._id} className="bg-white rounded-lg shadow p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold">{e.title}</h2>
                  <ElectionStatusBadge stage={e.lifecycleStage} />
                </div>
                <p className="text-sm text-gray-600 mt-1">{formatDateTime(e.startTime)} → {formatDateTime(e.endTime)}</p>
                <div className="mt-3 text-sm text-gray-700">
                  <p>Candidates: {e.candidateCount}</p>
                  <p>
                    Turnout: {e.votesCast} / {e.eligibleVoters}
                    {e.eligibleVoters > 0 && ` (${((e.votesCast / e.eligibleVoters) * 100).toFixed(1)}%)`}
                  </p>
                  {e.publicationRecommended && !e.resultsPublished && (
                    <p className="text-blue-700">Publication recommended - awaiting Admin.</p>
                  )}
                </div>
                {e.effectiveStatus === 'completed' && (
                  <Link
                    to={`/dashboard/officer/results/${e._id}`}
                    className="inline-block mt-4 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-sm"
                  >
                    {e.resultsPublished ? 'View Final Results' : 'Review Results'}
                  </Link>
                )}
              </div>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
}
