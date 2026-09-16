import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import axiosInstance from '../utils/axiosInstance';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const ApplyCandidate = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  
  const [elections, setElections] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [formData, setFormData] = useState({
    electionId: '',
    fullName: user?.fullName || '',
    email: user?.primaryEmailAddress?.emailAddress || '',
    phone: '',
    dateOfBirth: '',
    address: '',
    profilePhotoUrl: user?.imageUrl || '',
    partyName: 'Independent',
    partySymbolUrl: '',
    qualification: '',
    occupation: '',
    about: '',
    manifesto: '',
    promises: [''] // Array with 1 empty string by default
  });

  const fetchAppData = async () => {
    try {
      const elecRes = await axiosInstance.get('/api/elections');
      setElections(elecRes.data.filter(e => e.effectiveStatus === 'upcoming'));
      const appRes = await axiosInstance.get('/api/applications/my');
      setMyApplications(appRes.data);
    } catch (error) {
       console.error("Error fetching dependencies:", error);
    }
  };

  useEffect(() => {
    fetchAppData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePromiseChange = (index, value) => {
    const updatedPromises = [...formData.promises];
    updatedPromises[index] = value;
    setFormData({ ...formData, promises: updatedPromises });
  };

  const addPromise = () => setFormData({ ...formData, promises: [...formData.promises, ''] });
  const removePromise = (index) => {
    const arr = [...formData.promises];
    arr.splice(index, 1);
    setFormData({ ...formData, promises: arr });
  };

  const submitApplication = async (e) => {
    e.preventDefault();
    if (!formData.electionId) return toast.error("Please select an election.");
    try {
      await axiosInstance.post('/api/applications', formData);
      toast.success("Application submitted successfully!");
      fetchAppData();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to submit application.");
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen p-8 lg:ml-64">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[#1E3A8A] mb-8">Candidate Applications</h1>

        {myApplications.length > 0 && (
          <div className="mb-10 bg-white p-6 shadow rounded-md">
            <h2 className="text-xl font-semibold mb-4 text-[#1E3A8A]">My Applications</h2>
            {myApplications.map(app => (
              <div key={app._id} className="border-b py-4">
                <p><strong>Election:</strong> {app.electionId?.title}</p>
                <p><strong>Party:</strong> {app.partyName}</p>
                <p>
                  <strong>Status:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-sm text-white ${app.status === 'pending' ? 'bg-yellow-500' : app.status === 'approved' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {app.status.toUpperCase()}
                  </span>
                </p>
                {app.status === 'rejected' && (
                  <p className="mt-2 text-red-600"><strong>Rejection Reason:</strong> {app.rejectionReason}</p>
                )}
              </div>
            ))}
          </div>
        )}

        <form onSubmit={submitApplication} className="bg-white p-6 shadow rounded-md space-y-6">
          <h2 className="text-2xl font-bold text-[#1E3A8A] mb-4">Apply for a New Election</h2>
          
          <div>
            <label className="block text-sm font-medium">Select Upcoming Election</label>
            <select name="electionId" value={formData.electionId} onChange={handleChange} className="w-full border p-2 rounded mt-1" required>
              <option value="">-- Choose Election --</option>
              {elections.map(e => <option key={e._id} value={e._id}>{e.title}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium">Full Name</label>
              <input type="text" name="fullName" value={formData.fullName} onChange={handleChange} className="w-full border p-2 rounded mt-1" required />
            </div>
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border p-2 rounded mt-1" required />
            </div>
            <div>
              <label className="block text-sm font-medium">Phone</label>
              <input type="text" name="phone" value={formData.phone} onChange={handleChange} className="w-full border p-2 rounded mt-1" />
            </div>
            <div>
              <label className="block text-sm font-medium">Date of Birth</label>
              <input type="date" name="dateOfBirth" value={formData.dateOfBirth} onChange={handleChange} className="w-full border p-2 rounded mt-1" />
            </div>
          </div>

          <div>
             <label className="block text-sm font-medium">Profile Photo URL</label>
             <input type="url" name="profilePhotoUrl" value={formData.profilePhotoUrl} onChange={handleChange} className="w-full border p-2 rounded mt-1" />
          </div>

          <h3 className="text-xl font-semibold text-[#1E3A8A] mt-6">Political Profile</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
               <label className="block text-sm font-medium">Party Name</label>
               <input type="text" name="partyName" value={formData.partyName} onChange={handleChange} className="w-full border p-2 rounded mt-1" required />
            </div>
            <div>
               <label className="block text-sm font-medium">Party Symbol URL</label>
               <input type="url" name="partySymbolUrl" value={formData.partySymbolUrl} onChange={handleChange} className="w-full border p-2 rounded mt-1" />
            </div>
            <div>
               <label className="block text-sm font-medium">Qualification</label>
               <input type="text" name="qualification" value={formData.qualification} onChange={handleChange} className="w-full border p-2 rounded mt-1" />
            </div>
            <div>
               <label className="block text-sm font-medium">Occupation</label>
               <input type="text" name="occupation" value={formData.occupation} onChange={handleChange} className="w-full border p-2 rounded mt-1" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">About You</label>
            <textarea name="about" value={formData.about} onChange={handleChange} className="w-full border p-2 rounded mt-1" rows="3" />
          </div>

          <div>
            <label className="block text-sm font-medium">Manifesto</label>
            <textarea name="manifesto" value={formData.manifesto} onChange={handleChange} className="w-full border p-2 rounded mt-1" rows="4" required />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Promises</label>
            {formData.promises.map((promise, i) => (
              <div key={i} className="flex mb-2">
                <input type="text" value={promise} onChange={(e) => handlePromiseChange(i, e.target.value)} className="w-full border p-2 rounded mr-2" placeholder="e.g. Improve infrastructure" required />
                {formData.promises.length > 1 && (
                  <button type="button" onClick={() => removePromise(i)} className="bg-red-500 text-white px-3 py-2 rounded">Remove</button>
                )}
              </div>
            ))}
            <button type="button" onClick={addPromise} className="mt-2 bg-blue-100 text-blue-700 px-4 py-2 rounded font-semibold">+ Add Promise</button>
          </div>

          <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 mt-6 transition duration-200">
            Submit Application
          </button>
        </form>
      </div>
    </div>
  );
};

export default ApplyCandidate;
