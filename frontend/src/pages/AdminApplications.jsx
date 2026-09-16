import React, { useState, useEffect } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { toast } from 'react-toastify';

const AdminApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [selectedApp, setSelectedApp] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const fetchApplications = async () => {
    setLoading(true);
    try {
      // Fetch based on filter state
      const endpoint = filter === 'all' 
         ? '/api/admin/candidate-applications'
         : `/api/admin/candidate-applications?status=${filter}`;
      const res = await axiosInstance.get(endpoint);
      setApplications(res.data);
    } catch (error) {
      toast.error('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
    setSelectedApp(null);
  }, [filter]);

  const handleApprove = async (id) => {
    if (!window.confirm("Approve this candidate? This will immediately place them in the official election.")) return;
    try {
      await axiosInstance.post(`/api/admin/candidate-applications/${id}/approve`);
      toast.success("Application approved and candidate instantiated!");
      fetchApplications();
      setSelectedApp(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error approving application.');
    }
  };

  const handleReject = async (id) => {
    if (!rejectionReason.trim()) return toast.error("Please provide a rejection reason.");
    try {
      await axiosInstance.post(`/api/admin/candidate-applications/${id}/reject`, { rejectionReason });
      toast.success("Application rejected.");
      setRejectionReason('');
      fetchApplications();
      setSelectedApp(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error rejecting application.');
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen p-8 lg:ml-64">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-[#1E3A8A] mb-8">Candidate Applications Review</h1>
        
        {/* Filters */}
        <div className="flex space-x-4 mb-6">
          {['pending', 'approved', 'rejected', 'all'].map(status => (
            <button 
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-semibold capitalize ${filter === status ? 'bg-[#1E3A8A] text-white' : 'bg-white text-gray-700 border'}`}
            >
              {status}
            </button>
          ))}
        </div>

        {loading ? (
          <p>Loading applications...</p>
        ) : applications.length === 0 ? (
          <div className="bg-white p-6 shadow rounded text-center text-gray-500">No applications found.</div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden flex flex-col md:flex-row">
            
            {/* List side */}
            <div className={`w-full ${selectedApp ? 'md:w-1/3 border-r' : ''} border-gray-200`}>
              <ul>
                {applications.map(app => (
                   <li 
                     key={app._id} 
                     onClick={() => { setSelectedApp(app); setRejectionReason(''); }}
                     className={`p-4 border-b cursor-pointer hover:bg-gray-100 ${selectedApp?._id === app._id ? 'bg-blue-50 border-blue-500 border-l-4' : ''}`}
                   >
                     <p className="font-bold text-gray-800">{app.fullName}</p>
                     <p className="text-sm text-gray-600">{app.electionId?.title}</p>
                     <span className={`inline-block mt-2 px-2 py-1 text-xs font-semibold rounded-full ${app.status === 'pending' ? 'bg-yellow-200 text-yellow-800' : app.status === 'approved' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                       {app.status}
                     </span>
                   </li>
                ))}
              </ul>
            </div>

            {/* Details side */}
            {selectedApp && (
              <div className="w-full md:w-2/3 p-6 bg-gray-50 overflow-y-auto">
                 <h2 className="text-2xl font-bold text-gray-800 mb-2">{selectedApp.fullName}</h2>
                 <p className="text-gray-600 text-sm mb-6">Submitted: {new Date(selectedApp.createdAt).toLocaleString()}</p>
                 
                 <div className="grid grid-cols-2 gap-4 text-sm bg-white p-4 rounded shadow-sm mb-6">
                    <div><strong>Email:</strong> {selectedApp.email}</div>
                    <div><strong>Phone:</strong> {selectedApp.phone || 'N/A'}</div>
                    <div><strong>Party:</strong> {selectedApp.partyName}</div>
                    <div><strong>Occupation:</strong> {selectedApp.occupation || 'N/A'}</div>
                    <div className="col-span-2"><strong>Election target:</strong> {selectedApp.electionId?.title}</div>
                 </div>

                 <div className="bg-white p-4 rounded shadow-sm mb-6">
                   <h3 className="font-bold text-lg mb-2">Manifesto</h3>
                   <p className="text-gray-700 whitespace-pre-wrap">{selectedApp.manifesto}</p>
                 </div>

                 <div className="bg-white p-4 rounded shadow-sm mb-6">
                   <h3 className="font-bold text-lg mb-2">Promises</h3>
                   <ul className="list-disc pl-5">
                     {selectedApp.promises?.map((promise, i) => (
                       <li key={i} className="text-gray-700">{promise}</li>
                     ))}
                   </ul>
                 </div>
                 
                 {selectedApp.status === 'pending' ? (
                   <div className="bg-white p-4 rounded shadow-sm border border-gray-200 flex flex-col gap-4">
                      
                     <button onClick={() => handleApprove(selectedApp._id)} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 rounded">
                       Approve as Official Candidate
                     </button>
                     
                     <hr />
                     
                     <div>
                       <label className="block text-sm font-semibold mb-1 text-gray-700">Rejection Reason</label>
                       <input 
                         type="text" 
                         value={rejectionReason} 
                         onChange={e => setRejectionReason(e.target.value)} 
                         placeholder="Enter reason if rejecting..."
                         className="w-full p-2 border rounded"
                       />
                       <button onClick={() => handleReject(selectedApp._id)} className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 rounded">
                         Reject Application
                       </button>
                     </div>
                   </div>
                 ) : (
                   <div className={`p-4 rounded ${selectedApp.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                     This application was <strong>{selectedApp.status}</strong> on {new Date(selectedApp.reviewedAt).toLocaleString()}.
                     {selectedApp.rejectionReason && <p className="mt-2 text-sm italic">Reason: {selectedApp.rejectionReason}</p>}
                   </div>
                 )}
              </div>
            )}
            
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminApplications;
