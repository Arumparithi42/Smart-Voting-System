import React, { useEffect } from 'react';
import { Route, Routes, useNavigate } from "react-router-dom";
import { useUser } from '@clerk/clerk-react';
import axiosInstance from '../utils/axiosInstance';

import MainDashBoard from './MainDashboard';
import SideBox from '../components/SideBox';
import MyOrder from './MyOrder';
import HelpSupportPage from './Help';


import Header from '../components/Header/Header';
import CreateElection from './ElectionList';
import ElectionList from './ElectionList';
import LiveResults from '../pages/LiveResults';
import RequireAdmin from '../routes/RequireAdmin';
import RequireRole from '../routes/RequireRole';
import useUserRole from '../hooks/useUserRole';
import MyComplaints from '../pages/MyComplaints';
import OfficerProposals from '../pages/officer/OfficerProposals';
import OfficerElections from '../pages/officer/OfficerElections';
import ElectionResultsReview from '../pages/ElectionResultsReview';
import AdminProposals from '../pages/admin/AdminProposals';
import AdminComplaints from '../pages/admin/AdminComplaints';
import AdminUsers from '../pages/admin/AdminUsers';

const UserDashboard = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const navigate = useNavigate();
  // Role is display-only here; every API route re-checks it server-side.
  const { role } = useUserRole();
  const isAdmin = role === 'admin';

  useEffect(() => {
    const storeUserData = async () => {
      if (isSignedIn && user) {
        try {
          console.log('User data:', user);

          const userData = {
            clerkId: user.id,
            email: user.emailAddresses?.[0]?.emailAddress || '',
            firstName: user.firstName || 'User',
            lastName: user.lastName || '',
            profileUrl: user.imageUrl || '',
          };

          const response = await axiosInstance.post('/api/auth/register', userData);
          console.log('User data saved to the database.', response.data);
        } catch (error) {
          console.error('Error saving user data:', error?.response?.data || error.message);
        }
      }
    };

    storeUserData();
  }, [isSignedIn, user]);
  
  return (
    <div className="min-h-screen">
      {/* <Header className=' relative -top-6'/> */}
      <SideBox isAdmin={isAdmin} role={role} />

      <Routes>
        <Route path="/" element={<MainDashBoard isAdmin={isAdmin} role={role} />} />
        <Route path="/complaints" element={<MyComplaints />} />

        {/* Election Officer */}
        <Route path="/officer/proposals" element={<RequireRole roles={['officer']}><OfficerProposals /></RequireRole>} />
        <Route path="/officer/elections" element={<RequireRole roles={['officer']}><OfficerElections /></RequireRole>} />
        <Route path="/officer/results/:electionId" element={<RequireRole roles={['officer']}><ElectionResultsReview mode="officer" /></RequireRole>} />

        {/* Admin */}
        <Route path="/admin/proposals" element={<RequireAdmin><AdminProposals /></RequireAdmin>} />
        <Route path="/admin/complaints" element={<RequireAdmin><AdminComplaints /></RequireAdmin>} />
        <Route path="/admin/users" element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
        <Route path="/admin/results/:electionId" element={<RequireAdmin><ElectionResultsReview mode="admin" /></RequireAdmin>} />

        <Route path="/elections" element={<ElectionList isAdmin={isAdmin} />} />
        <Route path="/help" element={<HelpSupportPage />} />
        <Route
          path="/live-results/:electionId"
          element={
            <RequireAdmin>
              <LiveResults />
            </RequireAdmin>
          }
        />
      </Routes>
    </div>
  );
}

export default UserDashboard;
