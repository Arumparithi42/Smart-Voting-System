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
  const { electionId } = useParams()

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    const fetchElections = async () => {
      try {
        const response = await axiosInstance.get(`/api/elections/${electionId}`);
        // console.log('Fetched election data:', response.data);
        setTitle(response.data.title);
        const fetchedCandidates = response.data.candidates.map((candidate, index) => ({
          ...candidate,
          symbol: [
            'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_hwE2DtYle0M11E0IgPGW1D9_XME9YDuLzA&s',
            'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ8SwLk1MFck8vyMYnOs4uqokFT9r8FYzY3Sg&s',
            'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSy3wnD7m1OqyBWojfPusX_nXGmuNbfHbtzKw&s'
          ][index % 3],
          image: [
            'https://t4.ftcdn.net/jpg/00/99/13/41/240_F_99134157_dFAWZmsNpZ0ghgnU3g1W5I9XcJEnDQGg.jpg',
            'https://t4.ftcdn.net/jpg/07/68/70/13/240_F_768701333_FqwXnlVGtNRJ1Jg96meJoW279ADdfwff.jpg',
            'https://t4.ftcdn.net/jpg/07/68/70/11/240_F_768701148_hybb6T10px46wW6gGkxboFWzp47xwUqT.jpg'
          ][index % 3]
        }));
        setCandidates(fetchedCandidates);
      } catch (error) {
        console.error('Error fetching election data:', error);
      }
    };
    fetchElections();
  }, [electionId]);

  const totalVotes = candidates.reduce((sum, candidate) => sum + candidate.votes, 0);
  const winner = candidates.reduce((prev, current) => (prev.votes > current.votes ? prev : current), candidates[0]);

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
            <p className="text-xl text-gray-600">Total Votes Cast: <span className="font-semibold text-blue-700">{totalVotes.toLocaleString()}</span></p>
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
                  <h3 className="text-lg font-semibold text-green-600">Winner: {winner?.name}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
