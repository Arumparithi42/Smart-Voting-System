import React, { useEffect,useState } from 'react';
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

const UserDashboard = () => {
  const { isSignedIn, user } = useUser();
  const navigate = useNavigate();
  const clerkId= user?.id;
  const [isAdmin, setIsAdmin] = useState(false);

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
  
  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const response = await axiosInstance.post('/api/check-admin', { clerkId });
        setIsAdmin(response.data.isAdmin);
      } catch (error) {
        console.error('Error checking admin status:', error);
      }
    };

    checkAdminStatus();
  }, [clerkId]);

  return (
    <div className="min-h-screen">
      {/* <Header className=' relative -top-6'/> */}
      <SideBox isAdmin={isAdmin} />

      <Routes>
        <Route path="/" element={<MainDashBoard isAdmin={isAdmin} />} />
        <Route path="/elections" element={<ElectionList isAdmin={isAdmin} />} />
        <Route path="/help" element={<HelpSupportPage />} />
      </Routes>
    </div>
  );
}

export default UserDashboard;
