import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { PlusCircle, Trash2, ChevronRight } from "lucide-react";
import axiosInstance from "../utils/axiosInstance";

export default function ElectionDetail() {
  const [candidates, setCandidates] = useState(null);
  const [election, setElection] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    name: "",
    party: "",
    description: ""
  });
  const navigate = useNavigate();
  const { id } = useParams();
  const [refresh, setRefresh] = useState(false);
  const [electionId, setElectionId] = useState('');
  const [loading, setLoading] = useState(true);

 
  const candidateImages = [
    'https://t4.ftcdn.net/jpg/00/99/13/41/240_F_99134157_dFAWZmsNpZ0ghgnU3g1W5I9XcJEnDQGg.jpg',
    'https://t4.ftcdn.net/jpg/07/68/70/13/240_F_768701333_FqwXnlVGtNRJ1Jg96meJoW279ADdfwff.jpg',
    'https://t4.ftcdn.net/jpg/07/68/70/11/240_F_768701148_hybb6T10px46wW6gGkxboFWzp47xwUqT.jpg'
  ];
  
  const partySymbols = [
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcR_hwE2DtYle0M11E0IgPGW1D9_XME9YDuLzA&s',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQ8SwLk1MFck8vyMYnOs4uqokFT9r8FYzY3Sg&s',
    'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSy3wnD7m1OqyBWojfPusX_nXGmuNbfHbtzKw&s'
  ];

  useEffect(() => {
    const fetchElection = async () => {
      try {
        setLoading(true);
        const response = await axiosInstance.get(`api/elections/${id}`);
        setElection(response.data);
        setCandidates(response.data.candidates);
        setElectionId(response.data._id);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };
    fetchElection();
  }, [id, refresh]);

  const handleAddCandidate = () => {
    setShowModal(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewCandidate({ ...newCandidate, [name]: value });
  };

  const handleSaveCandidate = async () => {
    try {
      const candidateToSave = {
        name: newCandidate.name,
        partyName: newCandidate.party,
        description: newCandidate.description
      };

      await axiosInstance.post(
        `api/admin/elections/${electionId}/candidates`,
        candidateToSave
      );
      
      setNewCandidate({
        name: "",
        party: "",
        description: ""
      });
      setShowModal(false);
      setRefresh(!refresh);
    } catch (e) {
      console.log(e);
    }
  };

  const handleDeleteCandidate = async (candidateId) => {
    try {
      await axiosInstance.delete(
        `api/admin/elections/${electionId}/candidates/${candidateId}`
      );
      setRefresh(!refresh);
    } catch (e) {
      console.log(e);
    }
  };

  const handleRedirectToElections = () => {
    navigate("/dashboard/elections");
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-yellow-100 via-yellow-100 to-white text-gray-800">
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-[#1e3a8a] mb-4 text-center">{election?.title}</h1>
        <p className="text-lg text-gray-600 mb-8 text-center max-w-2xl mx-auto">
          {election?.description}
        </p>

        <div className="max-w-3xl mx-auto bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Candidates</h2>

          <button
            onClick={handleAddCandidate}
            className="flex items-center mb-6 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            <PlusCircle className="mr-2" /> Add Candidate
          </button>

          {candidates?.length === 0 ? (
            <p className="text-center text-gray-500">No candidates present</p>
          ) : (
            candidates?.map((candidate, index) => (
              <div
                key={index}
                className="flex items-center p-4 rounded-lg mb-4 bg-gray-50 hover:bg-gray-100 border border-gray-200"
              >
                <img
                  src={candidateImages[index % candidateImages.length]}
                  alt={candidate.name}
                  className="w-20 h-20 rounded-full object-cover mr-4"
                />

                <div className="flex-1">
                  <h3 className="text-lg font-medium">{candidate.name}</h3>
                  <p className="text-gray-600">{candidate.description}</p>

                  <div className="flex items-center mt-2">
                    <img
                      src={partySymbols[index % partySymbols.length]}
                      alt={`${candidate.partyName} symbol`}
                      className="w-8 h-8 mr-2"
                    />
                    <span className="text-blue-600 font-medium">{candidate.partyName}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteCandidate(candidate._id)}
                  className="text-red-500 hover:text-red-700 ml-4"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))
          )}
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
              <h3 className="text-2xl font-semibold mb-4">Add New Candidate</h3>

              <input
                type="text"
                name="name"
                value={newCandidate.name}
                onChange={handleInputChange}
                placeholder="Candidate Name"
                className="w-full p-2 mb-4 border border-gray-300 rounded"
              />
              <input
                type="text"
                name="party"
                value={newCandidate.party}
                onChange={handleInputChange}
                placeholder="Party"
                className="w-full p-2 mb-4 border border-gray-300 rounded"
              />
              <input
                type="text"
                name="description"
                value={newCandidate.description}
                onChange={handleInputChange}
                placeholder="Candidate Description"
                className="w-full p-2 mb-4 border border-gray-300 rounded"
              />

              <div className="flex justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 mr-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCandidate}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Save Candidate
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={handleRedirectToElections}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back
            
          </button>
        </div>
      </main>
    </div>
  );
}
