// import { useEffect, useState } from "react";
// import Header from "../components/Header/Header";
// import { Link } from "react-router-dom";
// import axiosInstance from "../utils/axiosInstance";
// export default function Component() {
//   const [elections, setElections] = useState([]);

//   useEffect(() => {
//     const fetchElections = async () => {
//       try {
//         const response = await axiosInstance.get("/api/elections");
//         setElections(response.data); // Assuming response.data is an array of elections
//       } catch (error) {
//         console.error(error);
//       }
//     };
//     fetchElections();
//   }, []);

//   const liveElections = elections.filter((election) => election.status === "ongoing");
//   const upcomingElections = elections.filter((election) => election.status === "upcoming");
//   const endedElections = elections.filter((election) => election.status === "completed");

//   return (
//     <div className=" from-yellow-100 via-yellow-100 to-white">
//       <Header />
//       <div className="min-h-screen bg-gradient-to-r from-yellow-100 via-yellow-100 to-white p-6">
//         <div className="max-w-7xl mx-auto mt-20 ">
//           <h1 className="text-4xl font-bold text-[#1E3A8A] mb-8">
//             Total Elections
//           </h1>

//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//             {elections.map((election) => (
//               <div
//                 key={election.id}
//                 className="bg-white rounded-xl shadow-lg overflow-hidden"
//               >
//                 <div className={`h-3 ${election.status === "ongoing" ? "bg-green-500" : election.status === "upcoming" ? "bg-yellow-500" : "bg-gray-500"}`} aria-hidden="true" />
//                 <div className="p-6">
//                   <div className="flex justify-between items-start mb-4">
//                     <h3 className="text-xl font-bold text-[#1E3A8A]">
//                       {election.title}
//                     </h3>
//                     <span className={`px-3 py-1 rounded-full text-sm font-medium text-black ${election.status === "ongoing" ? "bg-green-300" : election.status === "upcoming" ? "bg-yellow-300" : "bg-gray-300"}`}>
//                       {election.status}
//                     </span>
//                   </div>
//                   <p className="text-gray-600 mb-6">{election.description}</p>
//                   {election.status === "upcoming" ? (

//                     <Link
//                       to={`/explore/${election._id}`}
//                       className=" bg-[#1E3A8A] text-white py-2 px-4 rounded-lg hover:bg-[#2B4BA8] transition-colors"
//                     >
//                       {election.status === "upcoming" ? "Explore" : "Vote"}
//                     </Link>

//                   ) : election.status === "ongoing" ? (

//                     <Link
//                       to={`/vote/${election._id}`}
//                       className=" bg-[#1E3A8A] text-white py-2 px-4 rounded-lg hover:bg-[#2B4BA8] transition-colors"
//                     >
//                       {election.status === "ongoing" ? "Vote" : "Explore"}
//                     </Link>
//                   ) : election.status === "completed" ? (

//                     <Link
//                       to={`/result/${election._id}`}
//                       className=" bg-[#1E3A8A] text-white py-2 px-4 rounded-lg hover:bg-[#2B4BA8] transition-colors"
//                     >
//                       {election.status === "completed" ? "Result" : "Explore"}
//                     </Link>
//                   ) : null}

//                 </div>
//               </div>
//             ))}

//             {/* Active Election */}

//             {/* Upcoming Election */}
//             {/* <div className="bg-white rounded-xl shadow-lg overflow-hidden">
//               <div className="h-3 bg-yellow-500" aria-hidden="true" />
//               <div className="p-6">
//                 <div className="flex justify-between items-start mb-4">
//                   <h3 className="text-xl font-bold text-[#1E3A8A]">
//                     Department Representatives
//                   </h3>
//                   <span className="px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
//                     Upcoming
//                   </span>
//                 </div>
//                 <p className="text-gray-600 mb-6">
//                   Select your department representatives for the academic year
//                   2024-25. Voting opens in 5 days.
//                 </p>
//                 <button className="w-full bg-[#1E3A8A] text-white py-2 px-4 rounded-lg hover:bg-[#2B4BA8] transition-colors">
//                   Explore
//                 </button>
//               </div>
//             </div> */}

//             {/* Ended Election */}
//             {/* <div className="bg-white rounded-xl shadow-lg overflow-hidden">
//               <div className="h-3 bg-gray-500" aria-hidden="true" />
//               <div className="p-6">
//                 <div className="flex justify-between items-start mb-4">
//                   <h3 className="text-xl font-bold text-[#1E3A8A]">
//                     Sports Committee Election
//                   </h3>
//                   <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
//                     Ended
//                   </span>
//                 </div>
//                 <p className="text-gray-600 mb-6">
//                   The sports committee election for 2024 has concluded. Thank
//                   you for your participation.
//                 </p>
//                 <Link
//                   to="/result"
//                   className="w-full border-2 border-[#1E3A8A] text-[#1E3A8A] py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
//                 >
//                   View Results
//                 </Link>
//               </div>
//             </div> */}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

import { useEffect, useState } from "react";
import Header from "../components/Header/Header";
import { Link } from "react-router-dom";
import axiosInstance from "../utils/axiosInstance";

export default function Component() {
  const [elections, setElections] = useState([]);

  useEffect(() => {
    const fetchElections = async () => {
      try {
        const response = await axiosInstance.get("/api/elections");
        setElections(response.data); // Assuming response.data is an array of elections
      } catch (error) {
        console.error(error);
      }
    };
    fetchElections();
  }, []);

  // Separate elections by status
  const liveElections = elections.filter((election) => election.status === "ongoing");
  const upcomingElections = elections.filter((election) => election.status === "upcoming");
  const endedElections = elections.filter((election) => election.status === "completed");

  return (
    <div className="from-yellow-100 via-yellow-100 to-white">
      <Header />
      <div className="min-h-screen bg-gradient-to-r from-yellow-100 via-yellow-100 to-white p-6">
        <div className="max-w-7xl mx-auto mt-20 flex flex-col gap-10">
          <div className="w-full flex justify-center items-center"><h1 className="text-4xl font-extrabold text-[#1E3A8A] mb-8 ">Total Elections</h1></div>

          {/* Live Elections */}
          {liveElections.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold text-green-800 mb-6">Live Elections</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {liveElections.map((election) => (
                  <div
                    key={election.id}
                    className="bg-white rounded-xl shadow-lg overflow-hidden"
                  >
                    <div
                      className={`h-3 ${election.status === "ongoing" ? "bg-green-500" : election.status === "upcoming" ? "bg-yellow-500" : "bg-gray-500"}`}
                      aria-hidden="true"
                    />
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-[#1E3A8A]">{election.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium text-black ${election.status === "ongoing" ? "bg-green-300" : election.status === "upcoming" ? "bg-yellow-300" : "bg-gray-300"}`}>
                          {election.status}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-6">{election.description}</p>
                      <Link
                        to={`/vote/${election._id}`}
                        className="bg-[#1E3A8A] text-white py-2 px-4 rounded-lg hover:bg-[#2B4BA8] transition-colors"
                      >
                        Vote
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming Elections */}
          {upcomingElections.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold text-yellow-800 mb-6">Upcoming Elections</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {upcomingElections.map((election) => (
                  <div
                    key={election.id}
                    className="bg-white rounded-xl shadow-lg overflow-hidden"
                  >
                    <div
                      className={`h-3 ${election.status === "upcoming" ? "bg-yellow-500" : "bg-gray-500"}`}
                      aria-hidden="true"
                    />
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-[#1E3A8A]">{election.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium text-black ${election.status === "upcoming" ? "bg-yellow-300" : "bg-gray-300"}`}>
                          {election.status}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-6">{election.description}</p>
                      <Link
                        to={`/explore/${election._id}`}
                        className="bg-[#1E3A8A] text-white py-2 px-4 rounded-lg hover:bg-[#2B4BA8] transition-colors"
                      >
                        Explore
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ended Elections */}
          {endedElections.length > 0 && (
            <div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-6">Ended Elections</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {endedElections.map((election) => (
                  <div
                    key={election.id}
                    className="bg-white rounded-xl shadow-lg overflow-hidden"
                  >
                    <div
                      className={`h-3 ${election.status === "completed" ? "bg-gray-500" : "bg-gray-500"}`}
                      aria-hidden="true"
                    />
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-bold text-[#1E3A8A]">{election.title}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium text-black ${election.status === "completed" ? "bg-gray-300" : "bg-gray-300"}`}>
                          {election.status}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-6">{election.description}</p>
                      <Link
                        to={`/result/${election._id}`}
                        className="bg-[#1E3A8A] text-white py-2 px-4 rounded-lg hover:bg-[#2B4BA8] transition-colors"
                      >
                        Result
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
