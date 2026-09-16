import { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { CheckCircle, ChevronRight, Copy, ShieldCheck, Loader2 } from 'lucide-react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUser } from "@clerk/clerk-react";

export default function Vote() {
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [viewingCandidate, setViewingCandidate] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [title, setTitle] = useState(''); 
  const [description, setDescription] = useState('');
  const [effectiveStatus, setEffectiveStatus] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isVoting, setIsVoting] = useState(false); // To handle the loading state
  const [checkingStatus, setCheckingStatus] = useState(true); // "have they already voted?" check, before showing the ballot
  const [voteStatus, setVoteStatus] = useState(null); // 'success' | 'already-voted' | 'error' | null
  const [errorMessage, setErrorMessage] = useState('');
  const [needsVoterVerification, setNeedsVoterVerification] = useState(false);
  const [receipt, setReceipt] = useState(null); // { receiptId, electionTitle, votedAt }
  const [copied, setCopied] = useState(false);
  const { electionId } = useParams();
  const { isLoaded, isSignedIn, user } = useUser();
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchElections = async () => {
      try {
        const response = await axiosInstance.get(`/api/elections/${electionId}`);
        setTitle(response.data.title); 
        setDescription(response.data.description);
        setEffectiveStatus(response.data.effectiveStatus);
        setStartTime(response.data.startTime);
        setEndTime(response.data.endTime);
        const fetchedCandidates = response.data.candidates.map((candidate) => ({
          ...candidate,
          symbol: candidate.partySymbolUrl || 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_hwE2DtYle0M11E0IgPGW1D9_XME9YDuLzA&s',
          image: candidate.profilePhotoUrl || 'https://t4.ftcdn.net/jpg/00/99/13/41/240_F_99134157_dFAWZmsNpZ0ghgnU3g1W5I9XcJEnDQGg.jpg'
        }));
        setCandidates(fetchedCandidates);
      } catch (error) {
        console.error('Error fetching election data:', error);
      }
    };
    fetchElections();
  }, [electionId]);

  // Checks BEFORE rendering the ballot whether this user already voted in
  // this election, so revisiting the page shows their receipt straight
  // away instead of letting them go through the ballot again and only
  // finding out on submit.
  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setCheckingStatus(false);
      return;
    }

    const checkVoteStatus = async () => {
      try {
        const response = await axiosInstance.get(`/api/elections/${electionId}/my-vote-status`);
        if (response.data.hasVoted) {
          setReceipt({
            receiptId: response.data.receiptId,
            electionTitle: response.data.electionTitle,
            votedAt: response.data.votedAt,
          });
          setVoteStatus('already-voted');
        }
      } catch (error) {
        console.error('Error checking vote status:', error);
      } finally {
        setCheckingStatus(false);
      }
    };
    checkVoteStatus();
  }, [isLoaded, isSignedIn, electionId]);

  const handleSubmit = async () => {
    const selectedCandidateData = candidates.find(candidate => candidate.name === selectedCandidate);
    setIsVoting(true);
    setErrorMessage('');
    setNeedsVoterVerification(false);

    try {
      // clerkId is no longer sent here - the backend now identifies the
      // voter from the verified Clerk session token (attached automatically
      // by axiosInstance), not from a value the client could tamper with.
      const response = await axiosInstance.post(`/api/elections/${electionId}/candidates/${selectedCandidateData?._id}/vote`, {});
      setReceipt(response.data.receipt);
      setVoteStatus('success');
    } catch (error) {
      // Surface the backend's actual message ("already voted", "election
      // not open", etc.) instead of a single hardcoded string that used to
      // claim every failure was a duplicate vote.
      const message = error.response?.data?.message || 'Something went wrong while casting your vote.';
      if (error.response?.status === 403 && message.toLowerCase().includes('voter verification')) {
        setNeedsVoterVerification(true);
      }
      setErrorMessage(message);
      setVoteStatus('error');
    } finally {
      setIsVoting(false);
    }
  };

  const handleCopyReceipt = () => {
    if (!receipt?.receiptId) return;
    navigator.clipboard.writeText(receipt.receiptId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoaded && user === null) {
    navigate('/sign-in');
  }

  if (checkingStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-yellow-100 via-yellow-100 to-white text-gray-800 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#1e3a8a] animate-spin" />
      </div>
    );
  }

  // Confirmation / receipt screen - shown instead of the ballot both right
  // after casting a vote AND when revisiting an election already voted in.
  // Deliberately does not show which candidate was picked anywhere on this
  // screen or in the receipt itself.
  if ((voteStatus === 'success' || voteStatus === 'already-voted') && receipt) {
    const alreadyVoted = voteStatus === 'already-voted';
    return (
      <div className="min-h-screen bg-gradient-to-r from-yellow-100 via-yellow-100 to-white text-gray-800">
        <main className="container mx-auto px-4 py-12">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-[#1e3a8a] mb-2">
              {alreadyVoted ? 'You have already voted' : 'Your vote has been recorded'}
            </h1>
            <p className="text-gray-600 mb-6">
              {alreadyVoted
                ? <>You already voted in <span className="font-medium">{receipt.electionTitle}</span>. Here's your receipt again for reference.</>
                : <>Thank you for participating in <span className="font-medium">{receipt.electionTitle}</span>. Keep the receipt below - you can use it later to confirm your vote was counted.</>
              }
            </p>

            {receipt.receiptId ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-left">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <ShieldCheck className="w-4 h-4" />
                  Receipt ID
                </div>
                <div className="flex items-center justify-between gap-2">
                  <code className="text-lg font-mono font-semibold text-[#1e3a8a] break-all">{receipt.receiptId}</code>
                  <button
                    onClick={handleCopyReceipt}
                    className="shrink-0 p-2 rounded-md hover:bg-gray-200 transition-colors"
                    title="Copy receipt ID"
                  >
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
                {copied && <p className="text-xs text-green-600 mt-1">Copied!</p>}
                <p className="text-xs text-gray-400 mt-3">
                  Voted at {new Date(receipt.votedAt).toLocaleString()}
                </p>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 text-left">
                <p className="text-sm text-gray-500">
                  No receipt is available for this vote (it was cast before receipts were introduced).
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Voted at {new Date(receipt.votedAt).toLocaleString()}
                </p>
              </div>
            )}

            <p className="text-xs text-gray-400 mb-6">
              This receipt proves that a vote was cast - it never reveals which candidate you chose.
            </p>

            <div className="flex flex-col gap-3">
              {receipt.receiptId && (
                <Link
                  to="/verify-receipt"
                  className="w-full py-3 rounded-full font-semibold bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90 transition-colors"
                >
                  Verify this receipt
                </Link>
              )}
              <button
                onClick={() => navigate('/')}
                className="w-full py-3 rounded-full font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
              >
                Back to home
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-yellow-100 via-yellow-100 to-white text-gray-800">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-[#1e3a8a] mb-4 text-center">{title}</h1>
        <p className="text-lg text-gray-600 mb-8 text-center max-w-2xl mx-auto">
          {description}
        </p>

        {effectiveStatus === 'upcoming' && (
          <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 max-w-3xl mx-auto mb-6 text-center text-lg font-semibold">
            Voting has not started yet. <br /> Starts at: {startTime ? new Date(startTime).toLocaleString() : 'TBD'}
          </div>
        )}
        
        {effectiveStatus === 'ongoing' && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 max-w-3xl mx-auto mb-6 text-center text-lg font-semibold">
            Voting is currently open. Ends at: {endTime ? new Date(endTime).toLocaleString() : 'TBD'}
          </div>
        )}

        {effectiveStatus === 'completed' && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 max-w-3xl mx-auto mb-6 text-center text-lg font-semibold">
            Voting has ended.
          </div>
        )}

        <div className={`max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-6 ${effectiveStatus !== 'ongoing' ? 'opacity-50 pointer-events-none' : ''}`}>
          <h2 className="text-2xl font-semibold mb-4">Select Your Candidate</h2>
          {candidates.map((candidate, index) => (
            <label
              key={index}
              className={`flex items-center p-4 rounded-lg mb-4 cursor-pointer transition-all ${
                selectedCandidate === candidate.name
                  ? 'bg-blue-50 border-2 border-blue-200'
                  : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
              }`}
            >
              <input
                type="radio"
                name="candidate"
                value={candidate.name}
                checked={selectedCandidate === candidate.name}
                onChange={() => setSelectedCandidate(candidate.name)}
                className="sr-only"
              />
              <div className={`w-6 h-6 rounded-full border-2 ${
                selectedCandidate === candidate.name ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
              } mr-4 flex items-center justify-center`}>
                {selectedCandidate === candidate.name && (
                  <CheckCircle className="w-4 h-4 text-white" />
                )}
              </div>
              <div className="flex items-center flex-1">
                <img
                  src={candidate.image}
                  alt={candidate.name}
                  className="w-20 h-20 rounded-full object-cover mr-4"
                />
                <div className="flex-1">
                  <h3 className="text-lg font-medium">{candidate.name} {candidate.qualification ? `(${candidate.qualification})` : ''}</h3>
                  <p className="text-gray-600">{candidate.description || candidate.about}</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setViewingCandidate(candidate);
                    }}
                    className="mt-3 text-sm font-semibold text-blue-600 hover:text-blue-800 underline block"
                  >
                    View Candidate Details
                  </button>

                  <div className="flex items-center mt-3 bg-blue-50 p-2 rounded-lg w-max">
                    <img
                      src={candidate.symbol}
                      alt={`${candidate.partyName} symbol`}
                      className="w-8 h-8 mr-2"
                    />
                    <span className="text-blue-600 font-bold">{candidate.partyName}</span>
                  </div>
                </div>
              </div>
            </label>
          ))}
          
          {isVoting ? (
            <div className="text-center mt-6 text-blue-600">Submitting your vote...</div>
          ) : (
            <button
              onClick={handleSubmit}
              className={`mt-6 w-full py-3 rounded-full font-semibold transition-colors flex items-center justify-center ${
                selectedCandidate 
                  ? 'bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90' 
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!selectedCandidate || isVoting}
            >
              Submit Your Vote
              <ChevronRight className="ml-2 w-5 h-5" />
            </button>
          )}

          {voteStatus === 'error' && (
            <div className="mt-4 text-center text-red-600">
              <p>{errorMessage}</p>
              {needsVoterVerification && (
                <Link
                  to="/voter-login"
                  className="inline-block mt-3 text-sm font-medium text-[#1e3a8a] underline"
                >
                  Complete voter verification
                </Link>
              )}
            </div>
          )}
        </div>
      </main>

      {viewingCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative p-6 cursor-default" onClick={e => e.stopPropagation()}>
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewingCandidate(null); }}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 font-bold text-2xl h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
            >
              &times;
            </button>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-[#1e3a8a] border-b pb-2">Candidate Details</h2>
            </div>
            
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 mb-6">
              {viewingCandidate.image ? (
                <img 
                   src={viewingCandidate.image} 
                   alt={viewingCandidate.name} 
                   className="w-32 h-32 rounded-full object-cover shadow-md shrink-0"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 shadow-md shrink-0 text-center text-sm">
                  No profile photo available
                </div>
              )}
              <div className="text-center md:text-left flex-1">
                <h3 className="text-2xl font-bold text-gray-800">{viewingCandidate.name}</h3>
                
                <div className="flex items-center justify-center md:justify-start mt-2 gap-2">
                  <span className="font-semibold text-gray-700">Party: {viewingCandidate.partyName || "Independent"}</span>
                  {viewingCandidate.symbol && (
                    <img src={viewingCandidate.symbol} alt="Party Symbol" className="w-6 h-6 object-contain" />
                  )}
                </div>
                {viewingCandidate.qualification && (
                  <p className="mt-2 text-gray-600"><span className="font-semibold">Qualification:</span> {viewingCandidate.qualification}</p>
                )}
                {viewingCandidate.occupation && (
                  <p className="mt-1 text-gray-600"><span className="font-semibold">Occupation:</span> {viewingCandidate.occupation}</p>
                )}
              </div>
            </div>

            {viewingCandidate.about && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-800 text-lg border-b mb-2">About</h4>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{viewingCandidate.about}</p>
              </div>
            )}

            {viewingCandidate.manifesto && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-800 text-lg border-b mb-2">Manifesto</h4>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{viewingCandidate.manifesto}</p>
              </div>
            )}

            {viewingCandidate.promises && viewingCandidate.promises.length > 0 && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-800 text-lg border-b mb-2">Key Promises</h4>
                <ul className="list-disc pl-5 text-gray-700 space-y-1">
                  {viewingCandidate.promises.map((promise, i) => (
                    <li key={i}>{promise}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-8 text-center">
              <button 
                 onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewingCandidate(null); }}
                 className="px-6 py-2 bg-gray-200 text-gray-800 rounded-full font-semibold hover:bg-gray-300 transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
