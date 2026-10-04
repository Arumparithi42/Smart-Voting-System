import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";
import { useUser } from "@clerk/clerk-react";
import { toast } from "react-toastify";

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
  const handleStartElection = async (electionId, candidateCount) => {
    if (!candidateCount || candidateCount === 0) {
      toast.error("Add at least one candidate before starting the election");
      return;
    }
    try {
      await axiosInstance.put(`/api/admin/elections/${electionId}/start`);
      toast.success("Election started");
      setRefresh(!refresh);
    } catch (error) {
      console.error("Error starting election:", error);
      toast.error(error?.response?.data?.message || "Error starting election");
    }
  };

  // DRAFT -> UPCOMING (admin only; enforced by the backend)
  const handleScheduleElection = async (electionId) => {
    try {
      await axiosInstance.put(`/api/admin/elections/${electionId}/schedule`);
      toast.success("Election scheduled");
      setRefresh(!refresh);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Error scheduling election");
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
       election.voters?.some((voter) => voter.clerkId === user?.id)
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
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-xl font-bold">{election.title}</h2>
                    {election.lifecycleStage && (
                      <span className="text-xs font-semibold bg-white rounded-full px-2 py-1 whitespace-nowrap">
                        {election.lifecycleStage.replace('_', ' ')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{election.description}</p>
                  <div className="mt-4 flex justify-between">
                    {election.effectiveStatus === "draft" && isAdmin && (
                      <>
                        <Link
                          to={`/elections/${election._id}`}
                          className="text-white bg-orange-400 flex justify-center items-center rounded-md p-2"
                        >
                          Edit Candidates
                        </Link>
                        <button
                          onClick={() => handleScheduleElection(election._id)}
                          className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700"
                        >
                          Schedule
                        </button>
                      </>
                    )}

                    {election.effectiveStatus === "upcoming" && isAdmin && (
                      <>
                        <Link
                          to={`/elections/${election._id}`}
                          className="text-white bg-orange-400 flex justify-center items-center rounded-md p-2"
                        >
                          Add Candidate
                        </Link>
                        <button
                          onClick={() =>
                            handleStartElection(election._id, election.candidates?.length)
                          }
                          disabled={!election.candidates || election.candidates.length === 0}
                          title={
                            !election.candidates || election.candidates.length === 0
                              ? "Add at least one candidate before starting"
                              : "Start election"
                          }
                          className="bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:hover:bg-gray-400"
                        >
                          Start
                        </button>
                      </>
                    )}

                    {election.effectiveStatus === "ongoing" && isAdmin && (
                      <div className="flex gap-2">
                        <Link
                          to={`/dashboard/live-results/${election._id}`}
                          className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                        >
                          Live Results
                        </Link>
                        <button
                          onClick={() => handleStopElection(election._id)}
                          className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
                        >
                          Stop
                        </button>
                      </div>
                    )}

                    {election.effectiveStatus === "completed" && isAdmin && (
                      <Link
                        to={`/dashboard/admin/results/${election._id}`}
                        className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                      >
                        {election.resultsPublished ? "Results & Emails" : "Review & Publish Results"}
                      </Link>
                    )}

                    {election.effectiveStatus === "completed" && !isAdmin && (
                      election.resultsPublished ? (
                        <Link
                          to={`/result/${election._id}`}
                          className="bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                        >
                          View Results
                        </Link>
                      ) : (
                        <span className="text-gray-500 py-2">Results not yet published</span>
                      )
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
