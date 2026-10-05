import Home from "../pages/Home";
import Contact from "../pages/Contact";
import Services from "../pages/Services";
// import DoctorDetails from "../pages/Doctors/DoctorDetails";
import Doctors from "../pages/Doctors/Gasses";
import { Routes, Route } from "react-router-dom";
import MyAccount from "../Dashboard/UserAccount/MyAccount";
import Dashboard from "../Dashboard/DoctorAccount/Dashboard";
import ProtectedRoute from "./ProtectedRoute";
import Signin from "../sign-in/[[...index]]";
import Signup from "../sign-up/[[...index]]";
import UserDashboard from "../Dashboard/UserDashboard.jsx";
import Elections from "../pages/Elections";
import CreateElection from "../Dashboard/CreateElection.jsx";
import ElectionDetail from "../pages/ElectionDetail.jsx";
import Vote from "../pages/Vote.jsx";
import Result from '../pages/Result.jsx';
import ElectionDetails from "../pages/ElectionDetails.jsx";
import AppShell from "../layouts/AppShell.jsx";
import VerifyReceipt from "../pages/VerifyReceipt.jsx";
import RequireAdmin from "./RequireAdmin.jsx";
import VoterLogin from "../pages/VoterLogin.jsx";
import VoterRegistry from "../pages/VoterRegistry.jsx";
import ApplyCandidate from "../pages/ApplyCandidate.jsx";
import AdminApplications from "../pages/AdminApplications.jsx";

const Routers = () => {
  return (
    <Routes>
      <Route path="/sign-in/*" element={<Signin />} />
      <Route path="/sign-up/*" element={<Signup />} />
      {/* Every other page shares one layout (navigation never moves). */}
      <Route element={<AppShell />}>
      <Route path="/" element={<Home />} />
      <Route path="/elections" element={<Elections/>} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/gases" element={<Doctors />} />
      <Route path="/voter-login" element={<VoterLogin />} />
      <Route
        path="/voter-registry"
        element={
          <RequireAdmin>
            <VoterRegistry />
          </RequireAdmin>
        }
      />
      <Route
        path="/createElection"
        element={
          <RequireAdmin>
            <CreateElection />
          </RequireAdmin>
        }
      />
      <Route
        path="/createELection"
        element={
          <RequireAdmin>
            <CreateElection />
          </RequireAdmin>
        }
      />
      <Route
        path="/elections/:id"
        element={
          <RequireAdmin>
            <ElectionDetail />
          </RequireAdmin>
        }
      />
      <Route path='/dashboard/*' element={< UserDashboard/>}></Route>
      <Route path="/vote/:electionId" element={<Vote />} />
      <Route path="/explore/:electionId" element={<ElectionDetails />} />
      <Route path="/result/:electionId" element={<Result/>} />
      <Route path="/verify-receipt" element={<VerifyReceipt/>} />
      <Route
        path="/apply-candidate"
        element={<ApplyCandidate />}
       />
      <Route
        path="/admin/candidate-applications"
        element={
          <RequireAdmin>
            <AdminApplications />
          </RequireAdmin>
        }
      />
      <Route
        path="/doctors/profile/me"
        element={
          <ProtectedRoute allowedRoles={["doctor"]}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/users/profile/me"
        element={
          <ProtectedRoute allowedRoles={["patient"]}>
            <MyAccount />
          </ProtectedRoute>
        }
      />
      {/* <Route path="/doctors/:id" element={<DoctorDetails />} /> */}
      </Route>
    </Routes>
  );
};

export default Routers;