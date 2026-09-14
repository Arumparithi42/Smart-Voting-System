import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import axiosInstance from '../utils/axiosInstance';
import { RefreshCw, ShieldAlert } from 'lucide-react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Admin-only view of running vote tallies for an election that hasn't
// closed yet. Deliberately separate from the public /result page, which
// only unlocks once an election status is 'completed' - showing live
// counts to the public mid-election can bias turnout (bandwagon effect),
// so this stays behind requireAdmin on the backend (GET
// /api/admin/elections/:electionId/live-results).
export default function LiveResults() {
  const { electionId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchLiveResults = async () => {
    try {
      const response = await axiosInstance.get(`/api/admin/elections/${electionId}/live-results`);
      setData(response.data);
      setLastUpdated(new Date());
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load live results.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveResults();
    // Poll every 10s so the dashboard reflects new votes without a manual
    // refresh - simple and effective for a running demo.
    const interval = setInterval(fetchLiveResults, 10000);
    return () => clearInterval(interval);
  }, [electionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500">Loading live results...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <ShieldAlert className="w-10 h-10 text-red-500 mx-auto mb-2" />
          <p className="text-red-600">{error}</p>
          <Link to="/dashboard/elections" className="text-blue-600 underline mt-4 inline-block">
            Back to elections
          </Link>
        </div>
      </div>
    );
  }

  const chartData = {
    labels: data.results.map((c) => c.name),
    datasets: [
      {
        label: 'Votes',
        data: data.results.map((c) => c.votes),
        backgroundColor: 'rgba(30, 58, 138, 0.7)',
        borderColor: 'rgba(30, 58, 138, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 lg:ml-64">
      <div className="max-w-4xl mx-auto">
        <div className="bg-gradient-to-r from-blue-900 to-blue-700 text-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{data.electionTitle}</h1>
              <p className="mt-1 text-blue-200 capitalize">Status: {data.status} - Admin-only live view</p>
            </div>
            <button
              onClick={fetchLiveResults}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 transition-colors rounded-md px-3 py-2 text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </button>
          </div>
          <p className="mt-4 text-lg">
            Total votes so far: <span className="font-semibold">{data.totalVotes}</span>
          </p>
          {lastUpdated && (
            <p className="text-xs text-blue-200 mt-1">
              Last updated {lastUpdated.toLocaleTimeString()} - auto-refreshes every 10s
            </p>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
          <h2 className="text-xl font-semibold mb-4 text-blue-900">Vote Distribution</h2>
          <Bar data={chartData} options={chartOptions} />
        </div>

        <div className="mt-6 text-xs text-gray-400 text-center">
          This view is restricted to administrators while the election is in progress
          to avoid influencing turnout. It becomes public on the results page once the
          election is completed.
        </div>
      </div>
    </div>
  );
}
