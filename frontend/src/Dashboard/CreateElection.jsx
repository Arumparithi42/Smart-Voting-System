import React, { useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import { useNavigate } from "react-router-dom";

const CreateElection = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const navigate = useNavigate();

  const handleCreateElection = async (e) => {
    e.preventDefault();

    try {
      const response = await axiosInstance.post("/api/admin/elections", {
        title,
        description,
        startTime,
        endTime
      });
      
      // After creating, redirect to the elections list page
      navigate("/dashboard/elections");
    } catch (error) {
      console.error("Error creating election:", error);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-blue-500 to-teal-400 text-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold">Create Election</h1>
          <p className="mt-2 text-blue-100">Fill in the details to create a new election</p>
        </div>

        <form onSubmit={handleCreateElection} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-600">Election Title</label>
            <input
              type="text"
              className="mt-1 px-4 py-2 w-full border border-gray-300 rounded-md"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">Election Description</label>
            <textarea
              className="mt-1 px-4 py-2 w-full border border-gray-300 rounded-md"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">Start Time</label>
            <input
              type="datetime-local"
              className="mt-1 px-4 py-2 w-full border border-gray-300 rounded-md"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600">End Time</label>
            <input
              type="datetime-local"
              className="mt-1 px-4 py-2 w-full border border-gray-300 rounded-md"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="mt-4 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded shadow-md hover:bg-green-700 transition duration-200"
          >
            Create Election
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateElection;
