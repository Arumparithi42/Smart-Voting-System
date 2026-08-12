import React, { useEffect, useState } from "react";
import axiosInstance from "../utils/axiosInstance";
import { useUser } from "@clerk/clerk-react";

const MyOrder = () => {
  const [bookings, setBookings] = useState([]);
  const { user } = useUser();
  const clerkId = user?.id;

  useEffect(() => {
    const fetchBookings = async () => {
      if (clerkId) {
        try {
          const response = await axiosInstance.get(
            `/api/booking/user/${clerkId}`
          );
          // Sort bookings by bookingDate in descending order
          const sortedBookings = Array.isArray(response.data)
            ? response.data.sort(
                (a, b) => new Date(b.bookingDate) - new Date(a.bookingDate)
              )
            : [];
          setBookings(sortedBookings);
        } catch (error) {
          console.error("Error fetching bookings:", error);
          setBookings([]);
        }
      }
    };

    fetchBookings();
  }, [clerkId]);

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case "pending":
        return "bg-yellow-300 text-yellow-800";
      case "delivered":
        return "bg-green-300 text-green-800";
      case "cancelled":
        return "bg-red-300 text-red-800";
      default:
        return "bg-blue-300 text-blue-800";
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen p-8 lg:ml-64">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-blue-500 to-teal-400 text-white rounded-lg shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold">Your Recent Bookings 👋</h1>
          <p className="mt-2 text-blue-100">
            Here's a summary of your gas cylinder orders
          </p>
        </div>

        {Array.isArray(bookings) && bookings.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookings.map((booking, index) => (
              <div
                key={index}
                className="bg-gradient-to-br from-blue-100 to-teal-100 rounded-lg shadow-md overflow-hidden border border-blue-200 hover:shadow-lg transition-shadow duration-300"
              >
                <div className="p-6 bg-white bg-opacity-60 backdrop-blur-sm">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm font-medium text-gray-500">
                      Booking ID: {booking._id.slice(-6)}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                        booking.status
                      )} shadow-sm`}
                    >
                      {booking.status}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Booked:</span>{" "}
                      {new Date(booking.bookingDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Delivery:</span>{" "}
                      {new Date(booking.deliveryDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Amount:</span>{" "}
                      {booking.amount}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Payment:</span>{" "}
                      {booking.paymentStatus}
                    </p>
                  </div>
                </div>
                <div className="bg-blue-200 shadow-xl bg-opacity-70 px-6 py-4 border-t border-blue-100">
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    Cylinder Details
                  </h3>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Brand:</span>{" "}
                    {booking.cylinder?.brand}
                  </p>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">Size:</span>{" "}
                    {booking.cylinder?.size} kg
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-md p-6 text-center border border-blue-200">
            <p className="text-blue-600">No bookings found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyOrder;
