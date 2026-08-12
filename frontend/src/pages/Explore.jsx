import { useEffect, useState } from 'react'
import axiosInstance from '../utils/axiosInstance' 
import { CheckCircle, ChevronRight } from 'lucide-react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser } from "@clerk/clerk-react";

export default function Explore() {
  const [candidates, setCandidates] = useState([])
  const [election, setElection] = useState(null);
  const [loading, setLoading] = useState(true); // State to track loading
  const { electionId } = useParams()
  const { user } = useUser();
  const clerkId = user?.id;
  const navigate = useNavigate(); // Initialize useNavigate hook

  useEffect(() => {
    const fetchElections = async () => {
      try {
        const response = await axiosInstance.get(`/api/elections/${electionId}`);
        console.log('Fetched election data:', response.data);
        setElection(response.data);
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
        }))
        setCandidates(fetchedCandidates)
      } catch (error) {
        console.error('Error fetching election data:', error)
      } finally {
        setLoading(false); // Set loading to false once data is fetched
      }
    }
    fetchElections()
  }, [electionId])

  // Handle the "Back" button click to navigate to the /elections page
  const handleBack = () => {
    navigate('/elections');
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-yellow-100 via-yellow-100 to-white text-gray-800">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-[#1e3a8a] mb-4 text-center">{election?.title}</h1>
        <p className="text-lg text-gray-600 mb-8 text-center max-w-2xl mx-auto">
          {election?.description}
        </p>

        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Candidates</h2>

          {loading ? (
            <div className="flex justify-center items-center">
              <div className="w-16 h-16 border-4 border-t-4 border-blue-600 rounded-full animate-spin"></div>
            </div>
          ) : candidates.length === 0 ? (
            <p className="text-center text-gray-500">No candidates available.</p>
          ) : (
            candidates.map((candidate, index) => (
              <div key={index} className="flex items-center p-4 rounded-lg mb-4 bg-gray-50 hover:bg-gray-100 border border-gray-200">
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
            ))
          )}
        </div>

        {/* Back Button (Centered) */}
        <div className="flex justify-center mt-6">
          <button
            onClick={handleBack}
            className="px-6 py-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Back to Elections
          </button>
        </div>
      </main>
    </div>
  )
}
