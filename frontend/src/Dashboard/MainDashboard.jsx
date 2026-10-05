import VoterHome from '../pages/dashboards/VoterHome';
import OfficerDashboard from '../pages/dashboards/OfficerDashboard';
import AdminDashboard from '../pages/dashboards/AdminDashboard';
import { LoadingState } from '../components/ui/States';

// Role-specific home. The role only picks which dashboard to show; each
// dashboard's API calls are authorized server-side.
const MainDashBoard = ({ role, roleLoading }) => {
  if (roleLoading) return <div className=""><LoadingState label="Loading your dashboard…" /></div>;
  if (role === 'admin') return <AdminDashboard />;
  if (role === 'officer') return <OfficerDashboard />;
  return <VoterHome />;
};

export default MainDashBoard;
