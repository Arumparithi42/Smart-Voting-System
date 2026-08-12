import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import { useUser } from "@clerk/clerk-react";

const ElectionList = ({ isAdmin }) => {
  const [elections, setElections] = useState([]);
  const [refresh, setRefresh] = useState(false);
  const {user} =useUser();
  const clerkId = user?.id;

  useEffect(() => {
    const fetchElections = async () => {
      try {
        const response = await axiosInstance.get("/api/elections");
        setElections(response.data);
        console.log(response.data);
      } catch (error) {
        console.error("Error fetching elections:", error);
      }
    };

    fetchElections();
  }, [refresh]);

  

  // Function to handle starting the election
  const handleStartElection = async (electionId) => {
    try {
      const response = await axiosInstance.put(`/api/admin/elections/${electionId}/start`);
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error starting election:", error);
    }
  };

  // Function to handle stopping the election
  const handleStopElection = async (electionId) => {
    try {
      const response = await axiosInstance.put(`/api/admin/elections/${electionId}/end`);
    
    } catch (error) {
      console.error("Error stopping election:", error);
    }finally{
      setRefresh(!refresh);
    }
  };

   // Filter elections if isAdmin is false
   const filteredElections = isAdmin
   ? elections
   : elections.filter((election) =>
       election.voters.some((voter) => voter.clerkId === user?.id)
     );

  return (
    <div className="bg-gray-50 min-h-screen p-8 lg:ml-64">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-blue-500 to-teal-400 text-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold">Elections</h1>
          <p className="mt-2 text-blue-100">List of all elections</p>
        </div>

        {filteredElections.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredElections.map((election) => (
              <div
                key={election._id}
                className="bg-gradient-to-br from-blue-100 to-teal-100 rounded-lg shadow-md overflow-hidden border border-blue-200 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="p-6 bg-white bg-opacity-60 backdrop-blur-sm">
                  <h2 className="text-xl font-bold">{election.title}</h2>
                  <p className="text-sm text-gray-600">{election.description}</p>
                  <div className="mt-4 flex justify-between">
                    {election.status === "upcoming" && isAdmin && (
                      <>
                        <Link
                          to={`/elections/${election._id}`}
                          className="text-white bg-orange-400 flex justify-center items-center rounded-md p-2"
                        >
                          Add Candidate
                        </Link>
                        <button
                          onClick={() => handleStartElection(election._id)}
                          className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
                        >
                          Start
                        </button>
                      </>
                    )}

                    {election.status === "ongoing" && isAdmin && (
                      <button
                        onClick={() => handleStopElection(election._id)}
                        className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
                      >
                        Stop
                      </button>
                    )}

                    {election.status === "completed" && (
                      <Link
                        to={`/result/${election._id}`}
                        className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                      >
                        View Results
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center border border-blue-200">
            <p className="text-blue-600">No elections found.</p>
          </div>
        )}

        {isAdmin && (
          <Link
            to="/createElection"
            className="mt-8 inline-block bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
          >
            Create New Election
          </Link>
        )}
      </div>
    </div>
  );
};

export default ElectionList;
