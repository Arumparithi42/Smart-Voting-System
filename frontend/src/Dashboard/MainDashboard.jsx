import { useUser } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import { Avatar } from "@mui/material";
import { useNavigate } from "react-router-dom";

const MainDashBoard = ({isAdmin}) => {
  const { user } = useUser();
  const navigate = useNavigate();
  if (!user) {
    return null; // Or handle the case when user is null
  }
  console.log(user);

  const quickActions = [
    { title: isAdmin ? "Create Elections" : "Vote Now", icon: "M13 10V3L4 14h7v7l9-11h-7z", route: isAdmin ? "/dashboard/elections" : "/elections", },
    { title: "Voting History", icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", route: "/dashboard/elections" },
    { title: "Upcoming Elections", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z", route: "/elections" },
    { title: isAdmin ? "Live Elections" : "My Profile", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z", route: isAdmin ? "/elections" : "/elctions" }
  ];

  return (
    <div className="bg-white text-black items-center pt-28 min-h-screen lg:ml-64 flex flex-col gap-4 justify-between p-8 -mt-14" style={{ height: '500px', width: "83%" }}>

      <div className="min-h-screen bg-transparent w-full">
        {/* Header */}
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Online Voting Dashboard</h1>
          <Link to="/" className="text-blue-500 hover:underline">Back to Home</Link>
        </header>

        {/* Welcome Card */}
        <div className="mb-8 bg-gradient-to-r from-blue-500 to-teal-400 rounded-lg p-6 text-white shadow-lg">
          <h2 className="text-2xl font-bold mb-2">
            Welcome back, {user.fullName}!
          </h2>
          <p className="text-blue-100">
            Your last vote was on 15th October 2024.
          </p>
          <p className="mt-4">
            Current Election Status: Voting for the upcoming election is open.
          </p>
        </div>

        {/* Quick Actions */}
        <h2 className="mb-4 text-xl font-semibold text-gray-700">Quick Actions</h2>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-8">
          {quickActions.map((action, index) => (
            <div key={index} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">{action.title}</h3>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={action.icon} />
                </svg>
              </div>
              <button
                onClick={() => navigate(action.route)}
                className="w-full py-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {action.primary ? "Vote Now" : "View"}
              </button>
            </div>
          ))}
        </div>

        {/* User Profile Summary */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Your Profile</h2>
          <div className="flex items-center space-x-4">
            <Avatar src={user.imageUrl} alt={user.fullName} sx={{ width: 100, height: 100 }} />
            <div>
              <h3 className="text-lg font-semibold">{user.fullName}</h3>
              <p className="text-sm text-gray-500">
                Voter ID: V0T3${user.id}
              </p>
              <p className="text-sm text-gray-500">{user.primaryEmailAddress.emailAddress}</p>
              <p className="text-sm text-gray-500">Phone: +1 (555) 123-4567</p>
            </div>
          </div>
        </div>

        {/* Voting History */}
   

      </div>
    </div>
  );
}

export default MainDashBoard;
