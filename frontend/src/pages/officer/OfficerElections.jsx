import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import axiosInstance from '../../utils/axiosInstance';
import { LIFECYCLE_STYLES, formatDateTime } from '../../utils/labels';
import StatusBadge from '../../components/StatusBadge';

// Election Officer: monitor official (admin-approved) elections. Status and
// turnout only while voting is open; final aggregate results once it ends.
export default function OfficerElections() {
  const [elections, setElections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axiosInstance
      .get('/api/officer/elections')
      .then((res) => setElections(res.data))
      .catch((error) => toast.error(error.response?.data?.message || 'Could not load elections'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen p-8 lg:ml-64">
      <div className="max-w-6xl mx-auto">
        <div className="bg-gradient-to-r from-blue-500 to-teal-400 text-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold">Monitor Elections</h1>
          <p className="mt-2 text-blue-100">Status and turnout of official elections. Results can be reviewed once voting closes.</p>
        </div>

        {loading ? (
          <p>Loading…</p>
        ) : elections.length === 0 ? (
          <div className="bg-white p-6 rounded shadow text-center text-gray-500">No elections yet.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {elections.map((e) => (
              <div key={e._id} className="bg-white rounded-lg shadow p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold">{e.title}</h2>
                  <StatusBadge value={e.lifecycleStage} styles={LIFECYCLE_STYLES} />
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
        )}
      </div>
    </div>
  );
}
