import { Route, Routes } from "react-router-dom";

import MainDashBoard from './MainDashboard';
import HelpSupportPage from './Help';
import ElectionList from './ElectionList';
import LiveResults from '../pages/LiveResults';
import RequireAdmin from '../routes/RequireAdmin';
import RequireRole from '../routes/RequireRole';
import useUserRole from '../hooks/useUserRole';
import DashboardLayout from '../layouts/DashboardLayout';
import MyComplaints from '../pages/MyComplaints';
import Notifications from '../pages/Notifications';
import ProfilePage from '../pages/ProfilePage';
import OfficerProposals from '../pages/officer/OfficerProposals';
import OfficerElections from '../pages/officer/OfficerElections';
import OfficerElectionDetail from '../pages/officer/OfficerElectionDetail';
import ElectionResultsReview from '../pages/ElectionResultsReview';
import AdminProposals from '../pages/admin/AdminProposals';
import AdminComplaints from '../pages/admin/AdminComplaints';
import AdminUsers from '../pages/admin/AdminUsers';
import Error from '../error/Error';

const UserDashboard = () => {
  // Role is display-only here; every API route re-checks it server-side.
  const { role, loading } = useUserRole();
  const isAdmin = role === 'admin';

  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<MainDashBoard isAdmin={isAdmin} role={role} roleLoading={loading} />} />
        <Route path="/elections" element={<ElectionList isAdmin={isAdmin} />} />
        <Route path="/help" element={<HelpSupportPage />} />
        <Route path="/complaints" element={<MyComplaints />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route
          path="/live-results/:electionId"
          element={
            <RequireAdmin>
              <LiveResults />
            </RequireAdmin>
          }
        />

        {/* Election Officer */}
        <Route path="/officer/proposals" element={<RequireRole roles={['officer']}><OfficerProposals /></RequireRole>} />
        <Route path="/officer/elections" element={<RequireRole roles={['officer']}><OfficerElections /></RequireRole>} />
        <Route path="/officer/elections/:electionId" element={<RequireRole roles={['officer']}><OfficerElectionDetail /></RequireRole>} />
        <Route path="/officer/results/:electionId" element={<RequireRole roles={['officer']}><ElectionResultsReview mode="officer" /></RequireRole>} />

        {/* Admin */}
        <Route path="/admin/proposals" element={<RequireAdmin><AdminProposals /></RequireAdmin>} />
        <Route path="/admin/complaints" element={<RequireAdmin><AdminComplaints /></RequireAdmin>} />
        <Route path="/admin/users" element={<RequireAdmin><AdminUsers /></RequireAdmin>} />
        <Route path="/admin/results/:electionId" element={<RequireAdmin><ElectionResultsReview mode="admin" /></RequireAdmin>} />
        <Route path="*" element={<div className="p-8 lg:ml-64"><Error errMsg="Page not found." /></div>} />
      </Routes>
    </DashboardLayout>
  );
}

export default UserDashboard;
