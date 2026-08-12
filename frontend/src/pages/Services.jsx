import React, { useState } from 'react';
import axiosInstance from '../utils/axiosInstance';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../components/Header/Header';
import Footer from '../components/Footer/Footer';
import { useUser } from '@clerk/clerk-react';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const Services = () => {
  const location = useLocation();
  const { gassName: stateGassName, company: stateCompany, quantity: stateQuantity, currentPrice: statePrice } = location.state || {};
  const { user } = useUser();
  const clerkId = user?.id;
  const email = user?.emailAddresses[0]?.emailAddress;
  const navigate= useNavigate();

  const [step, setStep] = useState(1);
  const [personalDetails, setPersonalDetails] = useState({
    name: '',
    address: '',
    pinCode: ''
  });
  
  const [gassName, setGassName] = useState(stateGassName || '');
  const [company, setCompany] = useState(stateCompany || '');
  const [quantity, setQuantity] = useState(stateQuantity || '');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [price, setPrice] = useState(statePrice || '');

  const handleNext = () => setStep(step + 1);
  const handlePrevious = () => setStep(step - 1);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPersonalDetails((prevDetails) => ({
      ...prevDetails,
      [name]: value
    }));
  };

  const handleFinalSubmit = async (e) => {
    e.preventDefault();

    const deliveryDate = new Date();
    deliveryDate.setDate(deliveryDate.getDate() + 5);

    const bookingData = {
      clerkId: clerkId,
      deliveryDate: deliveryDate.toISOString(), 
      amount: price, 
      cylinder: {
        brand: company,
        size: quantity
      },
      email: email
    };
    
    try {
      const response = await axiosInstance.post('/api/booking/new', bookingData);
      console.log('Booking created successfully:', response.data);
      toast.success('Payment done successfully');
      setPaymentSuccess(true);
      navigate('/dashboard/myorders');
    } catch (error) {
      console.error('Error creating booking:', error.response?.data || error.message);
      toast.error('Error creating booking');
    }
  };

  const handleMakeMoreBooking = () => {
    setStep(1);
    setPersonalDetails({ name: '', address: '', pinCode: '' });
    setGassName('');
    setCompany('');
    setQuantity('');
    setPrice('');
    setPaymentSuccess(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header/>
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="md:w-1/2 p-6 bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex flex-col justify-center items-center">
              <img src="/gass1.png" alt="Gas Cylinder" className="w-64 h-64 object-contain mb-6" />
              <h2 className="text-3xl font-bold mb-4">Gas Booking Service</h2>
              <p className="text-lg text-center">Quick, easy, and reliable gas cylinder delivery at your doorstep.</p>
            </div>

            <div className="md:w-1/2 p-8">
              <div className="mb-8">
                <div className="flex justify-between items-center">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className={`w-8 h-8 rounded-full flex items-center justify-center ${step >= i ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                      {i}
                    </div>
                  ))}
                </div>
                <div className="mt-2 h-2 bg-gray-200 rounded-full">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-300 ease-in-out" 
                    style={{width: `${(step - 1) * 50}%`}}
                  ></div>
                </div>
              </div>

              {step === 1 && (
                <form className="space-y-6">
                  <h3 className="text-2xl font-semibold mb-6 text-center text-gray-800">Gas Details</h3>
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Gas Name</label>
                    <input
                      type="text"
                      value={gassName}
                      onChange={(e) => setGassName(e.target.value)}
                      placeholder="Enter gas name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Company Name</label>
                    <input
                      type="text"
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                      placeholder="Enter company name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Gas Size (in kg)</label>
                    <input
                      type="number"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="Enter quantity"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Price (in ₹)</label>
                    <input
                      type="number"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="Price"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    type="button"
                    className="w-full py-2 px-4 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-300"
                    onClick={handleNext}
                  >
                    Next
                  </button>
                </form>
              )}

              {step === 2 && (
                <form className="space-y-6">
                  <h3 className="text-2xl font-semibold mb-6 text-center text-gray-800">Personal Details</h3>
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Full Name</label>
                    <input
                      type="text"
                      name="name"
                      // value={personalDetails.name}
                      value={user.fullName}
                      onChange={handleInputChange}
                      placeholder="Enter your name"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Address</label>
                    <input
                      type="text"
                      name="address"
                      value={personalDetails.address}
                      onChange={handleInputChange}
                      placeholder="Enter your address"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-medium mb-2">Pin Code</label>
                    <input
                      type="text"
                      name="pinCode"
                      value={personalDetails.pinCode}
                      onChange={handleInputChange}
                      placeholder="Enter your pin code"
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex justify-between">
                    <button
                      type="button"
                      className="py-2 px-4 bg-gray-300 text-gray-700 font-semibold rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-300"
                      onClick={handlePrevious}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="py-2 px-4 bg-blue-500 text-white font-semibold rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-300"
                      onClick={handleNext}
                    >
                      Next
                    </button>
                  </div>
                </form>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  <h3 className="text-2xl font-semibold mb-6 text-center text-gray-800">Order Summary</h3>
                  <div className="bg-gray-100 p-6 rounded-lg">
                    <p className="mb-2"><span className="font-semibold">Gas Name:</span> {gassName}</p>
                    <p className="mb-2"><span className="font-semibold">Company:</span> {company}</p>
                    <p className="mb-2"><span className="font-semibold">Size:</span> {quantity} kg</p>
                    <p className="mb-2"><span className="font-semibold">Price:</span> ₹ {price}</p>
                    <p className="mb-2"><span className="font-semibold">Name:</span> {personalDetails.name}</p>
                    <p className="mb-2"><span className="font-semibold">Address:</span> {personalDetails.address}</p>
                    <p className="mb-2"><span className="font-semibold">Pin Code:</span> {personalDetails.pinCode}</p>
                  </div>
                  {paymentSuccess ? (
                    <button
                      type="button"
                      className="w-full py-2 px-4 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-300"
                      onClick={handleMakeMoreBooking}
                    >
                      Make More Booking
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="w-full py-2 px-4 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-300"
                      onClick={handleFinalSubmit}
                    >
                      Pay Now
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
      <ToastContainer />
    </div>
  );
};

export default Services;