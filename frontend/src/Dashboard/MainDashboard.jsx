import VoterHome from '../pages/dashboards/VoterHome';
import OfficerDashboard from '../pages/dashboards/OfficerDashboard';
import AdminDashboard from '../pages/dashboards/AdminDashboard';
import { LoadingState } from '../components/ui/States';
import HomeElections from '../components/HomeElections';
import ElectionSpotlight from '../components/ElectionSpotlight';

// Role-specific home - the signed-in user's main page. The role only picks
// which dashboard to show; each dashboard's API calls are authorized
// server-side. The featured-elections ticker runs along the top and the
// election box sits bottom-right (above the "Need help?" button).
const MainDashBoard = ({ role, roleLoading }) => {
  if (roleLoading) return <div className=""><LoadingState label="Loading your dashboard…" /></div>;
  const dashboard = role === 'admin' ? <AdminDashboard /> : role === 'officer' ? <OfficerDashboard /> : <VoterHome />;
  return (
    <>
      <HomeElections hideWhenEmpty />
      {dashboard}
      <ElectionSpotlight aboveChatbot />
    </>
  );
};

export default MainDashBoard;
