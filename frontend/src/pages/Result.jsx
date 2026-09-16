import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams } from 'react-router-dom';
import { Bar } from 'react-chartjs-2';
import axiosInstance from '../utils/axiosInstance';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Component() {
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 0)
  const[title, setTitle] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [turnout, setTurnout] = useState(null);
  const [winnerData, setWinnerData] = useState(null);
  const [isTie, setIsTie] = useState(false);
  const { electionId } = useParams()

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const fetchElections = async () => {
      try {
        const response = await axiosInstance.get(`/api/elections/${electionId}/results`);
        // console.log('Fetched election data:', response.data);
        setTitle(response.data.electionTitle);
        if (response.data.turnout) setTurnout(response.data.turnout);
        if (response.data.winner) setWinnerData(response.data.winner);
        setIsTie(response.data.isTie || false);
        
        const fetchedCandidates = response.data.results.map((candidate) => ({
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
  const totalVotes = candidates.reduce((sum, candidate) => sum + candidate.votes, 0);

  const chartData = {
    labels: candidates.map(candidate => candidate.name),
    datasets: [
      {
        label: 'Votes',
        data: candidates.map(candidate => candidate.votes),
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1
      }
    ]
  };

  const chartOptions = {
    indexAxis: 'y',
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true }
    }
  };

  function getBarColor(votes, totalVotes) {
    const percentage = (votes / totalVotes) * 100;
    if (percentage >= 75) {
      return "bg-green-500"; // For example, green for 75% and above
    } else if (percentage >= 50) {
      return "bg-blue-500"; // Blue for 50% to 74%
    } else if (percentage >= 25) {
      return "bg-yellow-500"; // Yellow for 25% to 49%
    } else {
      return "bg-red-500"; // Red for less than 25%
    }
  }

    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 from-yellow-100 via-yellow-100 to-white">
          <div className="text-center space-y-4 mb-12">
            <h1 className="text-4xl sm:text-5xl font-bold text-blue-900"> {title}</h1>
            <div className="flex flex-col sm:flex-row justify-center gap-6 mt-4">
              <p className="text-xl text-gray-600">Total Votes: <span className="font-semibold text-blue-700">{totalVotes.toLocaleString()}</span></p>
              {turnout && (
                <>
                  <p className="text-xl text-gray-600">Eligible Voters: <span className="font-semibold text-blue-700">{turnout.eligibleVoters.toLocaleString()}</span></p>
                  <p className="text-xl text-gray-600">Turnout: <span className="font-semibold text-blue-700">{turnout.percentage.toFixed(2)}%</span></p>
                </>
              )}
            </div>
          </div>

          <div className={`grid ${windowWidth > 768 ? 'md:grid-cols-2' : ''} gap-8`}>
            <div className="space-y-6">
              {candidates.map((candidate, index) => (
                <motion.div
                  key={candidate.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200 hover:shadow-xl transition-shadow duration-300"
                >
                  <div className="flex items-center gap-6 p-6">
                    <img
                      src={candidate.image}
                      alt={candidate.name}
                      className="h-24 w-24 rounded-full object-cover border-4 border-blue-500 shadow-md"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-xl text-blue-900">{candidate.name}</h3>
                        <span className={`${getBarColor(candidate.votes, totalVotes)} text-white  text-lg p-3 rounded-full font-semibold shadow`}>
                          {(candidate.votes.toLocaleString() / totalVotes.toLocaleString() * 100)}%
                        </span>
                      </div>
                      <p className="text-gray-600 font-medium">{candidate.party}</p>
                      <p className="font-mono text-blue-700 text-lg">{candidate.votes.toLocaleString()} votes</p>
                    </div>
                  </div>
                  <div className={`h-2 ${getBarColor(candidate.votes, totalVotes)}`} style={{ width: `${(candidate.votes.toLocaleString() / totalVotes.toLocaleString() * 100)}%` }}></div>
                </motion.div>
              ))}
            </div>

            <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6 text-blue-900">Vote Distribution</h2>
                <Bar data={chartData} options={chartOptions} className="mb-4" />
                <div className="text-center mt-4">
                  {isTie && (
                     <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded mb-4">
                        <h3 className="text-xl font-bold">TIE!</h3>
                        <p className="font-medium text-lg mt-2">Multiple candidates tied with {winnerData?.votes} votes:</p>
                        <ul className="text-blue-900 font-bold mt-2">
                          {winnerData?.candidates.map((c, i) => <li key={i}>{c}</li>)}
                        </ul>
                     </div>
                  )}
                  {!isTie && winnerData && winnerData.votes > 0 && (
                     <h3 className="text-xl font-semibold text-green-600">Winner: {winnerData.candidates[0]} <span className="text-sm font-normal text-gray-600">({winnerData.votes} votes)</span></h3>
                  )}
                  {winnerData && winnerData.votes === 0 && (
                     <h3 className="text-lg font-semibold text-red-600">No votes cast</h3>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
