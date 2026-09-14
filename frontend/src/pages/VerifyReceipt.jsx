import { useEffect, useState } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { ShieldCheck, ShieldX, Loader2 } from 'lucide-react';

export default function VerifyReceipt() {
  const [elections, setElections] = useState([]);
  const [electionId, setElectionId] = useState('');
  const [receiptId, setReceiptId] = useState('');
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState(null); // { valid, electionTitle, votedAt } | null
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchElections = async () => {
      try {
        const response = await axiosInstance.get('/api/elections');
        setElections(response.data || []);
      } catch (err) {
        console.error('Error fetching elections:', err);
      }
    };
    fetchElections();
  }, []);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!electionId || !receiptId.trim()) {
      setError('Please select an election and enter your receipt ID.');
      return;
    }

    setChecking(true);
    try {
      const response = await axiosInstance.post('/api/verify-receipt', {
        electionId,
        receiptId: receiptId.trim(),
      });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong while verifying the receipt.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-yellow-100 via-yellow-100 to-white text-gray-800">
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-2xl font-bold text-[#1e3a8a] mb-2 text-center">Verify Your Vote</h1>
          <p className="text-gray-600 text-sm mb-6 text-center">
            Enter your receipt ID to confirm your vote was recorded. This only confirms
            <span className="font-medium"> that</span> you voted - it never shows which candidate you chose.
          </p>

          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Election</label>
              <select
                value={electionId}
                onChange={(e) => setElectionId(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
              >
                <option value="">Select an election</option>
                {elections.map((election) => (
                  <option key={election._id} value={election._id}>
                    {election.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Receipt ID</label>
              <input
                type="text"
                value={receiptId}
                onChange={(e) => setReceiptId(e.target.value)}
                placeholder="VOTE-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
            </div>

            <button
              type="submit"
              disabled={checking}
              className="w-full py-3 rounded-full font-semibold bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90 transition-colors flex items-center justify-center disabled:opacity-60"
            >
              {checking ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verify Receipt'}
            </button>
          </form>

          {error && (
            <p className="mt-4 text-sm text-red-600 text-center">{error}</p>
          )}

          {result && result.valid && (
            <div className="mt-6 flex flex-col items-center text-center bg-green-50 border border-green-200 rounded-lg p-4">
              <ShieldCheck className="w-10 h-10 text-green-500 mb-2" />
              <p className="font-medium text-green-700">This receipt matches a recorded vote</p>
              <p className="text-sm text-gray-600 mt-1">{result.electionTitle}</p>
              <p className="text-xs text-gray-400 mt-1">
                Voted at {new Date(result.votedAt).toLocaleString()}
              </p>
            </div>
          )}

          {result && !result.valid && (
            <div className="mt-6 flex flex-col items-center text-center bg-red-50 border border-red-200 rounded-lg p-4">
              <ShieldX className="w-10 h-10 text-red-500 mb-2" />
              <p className="font-medium text-red-700">No matching vote found</p>
              <p className="text-sm text-gray-500 mt-1">
                Double-check the election and receipt ID and try again.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
