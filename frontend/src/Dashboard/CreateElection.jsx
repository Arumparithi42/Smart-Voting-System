import { useState } from "react";
import { toast } from "react-toastify";
import PageHeader from "../components/ui/PageHeader";
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
      // datetime-local values are the admin's LOCAL time; send unambiguous
      // UTC instants so the server stores the intended moment.
      await axiosInstance.post("/api/admin/elections", {
        title,
        description,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
      });
      toast.success("Election created");
      
      // After creating, redirect to the elections list page
      navigate("/dashboard/elections");
    } catch (error) {
      console.error("Error creating election:", error);
      toast.error(error.response?.data?.message || "Could not create election");
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <PageHeader title="Create Election" subtitle="Fill in the details to create a new election" />

        <form onSubmit={handleCreateElection} className="space-y-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
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
