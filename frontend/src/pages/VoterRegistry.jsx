import { useState } from 'react';
import { Database, CheckCircle, Loader2 } from 'lucide-react';
import axiosInstance from '../utils/axiosInstance';

// Simulates the college's own, separately-maintained voter database - NOT
// the main voting system's login. In a real deployment this data would
// arrive as a feed from an external, already-trusted system; this page
// exists purely so the simulation has somewhere to create that data.
// Admin-gated (see Routers.jsx) - the backend independently enforces this
// via requireAdmin on POST /api/voter/registry/register regardless of
// what this page does.
export default function VoterRegistry() {
  const [voterId, setVoterId] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(null);

    if (!voterId.trim() || !email.trim() || !phoneNumber.trim() || !aadhaarNumber.trim()) {
      setError('All fields are required.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await axiosInstance.post('/api/voter/registry/register', {
        voterId: voterId.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        aadhaarNumber: aadhaarNumber.trim(),
      });
      setSuccess(response.data.voter);
      setVoterId('');
      setEmail('');
      setPhoneNumber('');
      setAadhaarNumber(''); // never kept in memory/state after submit
    } catch (err) {
      setError(err.response?.data?.message || 'Error registering voter.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-lg mx-auto bg-white rounded-lg shadow-md p-8 border border-gray-200">
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-6 h-6 text-[#1e3a8a]" />
          <h1 className="text-2xl font-bold text-[#1e3a8a]">Voter Registry - Simulation</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          This represents the college's pre-existing, trusted voter database - not real Aadhaar
          verification. Records added here become eligible to log in through the voter login flow.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Voter ID / Register Number</label>
            <input
              type="text"
              value={voterId}
              onChange={(e) => setVoterId(e.target.value)}
              placeholder="MIT23CS001"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="student@example.com"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+91XXXXXXXXXX"
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Aadhaar Number</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={12}
              value={aadhaarNumber}
              onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, ''))}
              placeholder="12-digit number"
              className="w-full border border-gray-300 rounded-md px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-blue-200"
            />
            <p className="text-xs text-gray-400 mt-1">
              Stored only as a one-way hash - never saved, shown, or logged as plain text.
            </p>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-full font-semibold bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90 transition-colors flex items-center justify-center disabled:opacity-60"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Register Voter'}
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-red-600 text-center">{error}</p>}

        {success && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-green-700">Voter registered successfully.</p>
              <p className="text-gray-600 mt-1">
                {success.voterId} - {success.email} - verified: {String(success.isVerified)}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
