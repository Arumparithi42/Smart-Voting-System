// import { useEffect, useState } from 'react'
// import axiosInstance from '../utils/axiosInstance' 
// import { CheckCircle, ChevronRight } from 'lucide-react'
// import { useParams } from 'react-router-dom'
// import { useUser } from "@clerk/clerk-react";


// export default function Vote() {
//   const [selectedCandidate, setSelectedCandidate] = useState('')
//   const [candidates, setCandidates] = useState([])
//   const { electionId } = useParams() 
//   const {user} = useUser();
//   const clerkId = user?.id;

//   useEffect(() => {
//     const fetchElections = async () => {
//       try {
//         const response = await axiosInstance.get(`/api/elections/${electionId}`);
//         console.log('Fetched election data:', response.data);
//         const fetchedCandidates = response.data.candidates.map((candidate, index) => ({
//           ...candidate,
//           symbol: [
//             'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_hwE2DtYle0M11E0IgPGW1D9_XME9YDuLzA&s',
//             'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ8SwLk1MFck8vyMYnOs4uqokFT9r8FYzY3Sg&s',
//             'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSy3wnD7m1OqyBWojfPusX_nXGmuNbfHbtzKw&s'
//           ][index % 3], // Cycle through symbols
//           image: [
//             'https://t4.ftcdn.net/jpg/00/99/13/41/240_F_99134157_dFAWZmsNpZ0ghgnU3g1W5I9XcJEnDQGg.jpg',
//             'https://t4.ftcdn.net/jpg/07/68/70/13/240_F_768701333_FqwXnlVGtNRJ1Jg96meJoW279ADdfwff.jpg',
//             'https://t4.ftcdn.net/jpg/07/68/70/11/240_F_768701148_hybb6T10px46wW6gGkxboFWzp47xwUqT.jpg'
//           ][index % 3]  // Cycle through images
//         }))
//         setCandidates(fetchedCandidates)
//       } catch (error) {
//         console.error('Error fetching election data:', error)
//       }
//     }
//     fetchElections()
//   }, [electionId])


//   const handleSubmit = async () => {
//     const selectedCandidateData = candidates.find(candidate => candidate.name === selectedCandidate)
//     console.log('Selected Candidate ID:', selectedCandidateData?._id)
//     console.log('Election ID:', electionId)
//     try {
//       const response = await axiosInstance.post(`/api/elections/${electionId}/candidates/${selectedCandidateData?._id}/vote`, {clerkId});
//       console.log('Vote cast successfully:', response.data);
//     } catch (error) {
//       console.log('Error casting vote:', error);
//     }
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-r from-yellow-100 via-yellow-100 to-white text-gray-800">
    

//       <main className="container mx-auto px-4 py-8">
//         <h1 className="text-4xl font-bold text-[#1e3a8a] mb-4 text-center">2024 Presidential Election</h1>
//         <p className="text-lg text-gray-600 mb-8 text-center max-w-2xl mx-auto">
//           Cast your vote for the next president. Your participation is crucial in shaping our nation's future.
//           Voting is secure, confidential, and takes just a few minutes.
//         </p>

//         <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-6">
//           <h2 className="text-2xl font-semibold mb-4">Select Your Candidate</h2>
//           {candidates.map((candidate, index) => (
//             <label
//               key={index}
//               className={`flex items-center p-4 rounded-lg mb-4 cursor-pointer transition-all ${
//                 selectedCandidate === candidate.name
//                   ? 'bg-blue-50 border-2 border-blue-200'
//                   : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
//               }`}
//             >
//               <input
//                 type="radio"
//                 name="candidate"
//                 value={candidate.name}
//                 checked={selectedCandidate === candidate.name}
//                 onChange={() => setSelectedCandidate(candidate.name)}
//                 className="sr-only"
//               />
//               <div className={`w-6 h-6 rounded-full border-2 ${
//                 selectedCandidate === candidate.name ? 'bg-blue-500 border-blue-500' : 'border-gray-400'
//               } mr-4 flex items-center justify-center`}>
//                 {selectedCandidate === candidate.name && (
//                   <CheckCircle className="w-4 h-4 text-white" />
//                 )}
//               </div>
              
//               <div className="flex items-center flex-1">
//                 <img
//                   src={candidate.image}
//                   alt={candidate.name}
//                   className="w-20 h-20 rounded-full object-cover mr-4"
//                 />
                
//                 <div className="flex-1">
//                   <h3 className="text-lg font-medium">{candidate.name}</h3>
//                   <p className="text-gray-600">{candidate.description}</p>
                  
//                   <div className="flex items-center mt-2">
//                     <img
//                       src={candidate.symbol}
//                       alt={`${candidate.partyName} symbol`}
//                       className="w-8 h-8 mr-2"
//                     />
//                     <span className="text-blue-600 font-medium">{candidate.partyName}</span>
//                   </div>
//                 </div>
//               </div>
//             </label>
//           ))}
          
//           <button
//             onClick={handleSubmit}
//             className={`mt-6 w-full py-3 rounded-full font-semibold transition-colors flex items-center justify-center ${
//               selectedCandidate 
//                 ? 'bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90' 
//                 : 'bg-gray-200 text-gray-500 cursor-not-allowed'
//             }`}
//             disabled={!selectedCandidate}
//           >
//             Submit Your Vote
//             <ChevronRight className="ml-2 w-5 h-5" />
//           </button>
//         </div>
//       </main>
//     </div>
//   )
// }




import { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { CheckCircle, ChevronRight } from 'lucide-react';
import { useParams, useNavigate  } from 'react-router-dom';
import { useUser } from "@clerk/clerk-react";

export default function Vote() {
  const [selectedCandidate, setSelectedCandidate] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [title, setTitle] = useState(''); 
  const [description, setDescription] = useState('');
  const [isVoting, setIsVoting] = useState(false); // To handle the loading state
  const [voteStatus, setVoteStatus] = useState(null); // To hold success or error message
  const { electionId } = useParams();
  const { user } = useUser();
  const clerkId = user?.id;
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchElections = async () => {
      try {
        const response = await axiosInstance.get(`/api/elections/${electionId}`);
        console.log('Fetched election data:', response.data);
        setTitle(response.data.title); 
        setDescription(response.data.description);
        const fetchedCandidates = response.data.candidates.map((candidate, index) => ({
          ...candidate,
          symbol: [
            'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_hwE2DtYle0M11E0IgPGW1D9_XME9YDuLzA&s',
            'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ8SwLk1MFck8vyMYnOs4uqokFT9r8FYzY3Sg&s',
            'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSy3wnD7m1OqyBWojfPusX_nXGmuNbfHbtzKw&s'
          ][index % 3], // Cycle through symbols
          image: [
            'https://t4.ftcdn.net/jpg/00/99/13/41/240_F_99134157_dFAWZmsNpZ0ghgnU3g1W5I9XcJEnDQGg.jpg',
            'https://t4.ftcdn.net/jpg/07/68/70/13/240_F_768701333_FqwXnlVGtNRJ1Jg96meJoW279ADdfwff.jpg',
            'https://t4.ftcdn.net/jpg/07/68/70/11/240_F_768701148_hybb6T10px46wW6gGkxboFWzp47xwUqT.jpg'
          ][index % 3]  // Cycle through images
        }));
        setCandidates(fetchedCandidates);
      } catch (error) {
        console.error('Error fetching election data:', error);
      }
    };
    fetchElections();
  }, [electionId]);

  const handleSubmit = async () => {
    const selectedCandidateData = candidates.find(candidate => candidate.name === selectedCandidate);
    console.log('Selected Candidate ID:', selectedCandidateData?._id);
    console.log('Election ID:', electionId);
    setIsVoting(true); // Show loading spinner

    try {
      const response = await axiosInstance.post(`/api/elections/${electionId}/candidates/${selectedCandidateData?._id}/vote`, { clerkId });
      console.log('Vote cast successfully:', response.data);
      setVoteStatus('success'); // Update vote status to success
      setIsVoting(false); // Hide loading spinner

      // Redirect to a thank-you page or show message
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (error) {
      console.log('Error casting vote:', error);
      setVoteStatus('error'); // Update vote status to error
      setIsVoting(false); // Hide loading spinner
    }
  };
  if(user===null){
    navigate('/sign-in');
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-yellow-100 via-yellow-100 to-white text-gray-800">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-[#1e3a8a] mb-4 text-center">{title}</h1>
        <p className="text-lg text-gray-600 mb-8 text-center max-w-2xl mx-auto">
          {description}
        </p>

        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-6">
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
                  <h3 className="text-lg font-medium">{candidate.name}</h3>
                  <p className="text-gray-600">{candidate.description}</p>
                  <div className="flex items-center mt-2">
                    <img
                      src={candidate.symbol}
                      alt={`${candidate.partyName} symbol`}
                      className="w-8 h-8 mr-2"
                    />
                    <span className="text-blue-600 font-medium">{candidate.partyName}</span>
                  </div>
                </div>
              </div>
            </label>
          ))}
          
          {isVoting ? (
            <div className="text-center mt-6 text-blue-600">Submitting your vote...</div> // Loading state
          ) : (
            <button
              onClick={handleSubmit}
              className={`mt-6 w-full py-3 rounded-full font-semibold transition-colors flex items-center justify-center ${
                selectedCandidate 
                  ? 'bg-[#1e3a8a] text-white hover:bg-[#1e3a8a]/90' 
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
              disabled={!selectedCandidate || isVoting} // Disable button while submitting
            >
              Submit Your Vote
              <ChevronRight className="ml-2 w-5 h-5" />
            </button>
          )}

          {voteStatus === 'success' && (
            <div className="mt-4 text-center text-green-600">
              <p>Your vote has been submitted successfully! Thank you for participating.</p>
            </div>
          )}
          {voteStatus === 'error' && (
            <div className="mt-4 text-center text-red-600">
              <p>You have already voted in this election. Thank you for participating!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

