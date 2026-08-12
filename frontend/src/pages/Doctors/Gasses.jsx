// import React from 'react';
// import { useNavigate } from 'react-router-dom';
// import Testimonial from '../../components/Testimonials/Testimonial';
// import Header from '../../components/Header/Header';
// import Footer from '../../components/Footer/Footer';

// const Gass = () => {
//   const navigate = useNavigate();

//   const gass = [
//     { id: 1, gassName: "LPG", company: "HP", quantity: "14", currentPrice: "950", imgurl: '/gass1.png' },
//     { id: 2, gassName: "LPG", company: "Indian", quantity: "14", currentPrice: "940", imgurl: '/gass1.png' },
//     { id: 3, gassName: "LPG", company: "HP", quantity: "19", currentPrice: "945", imgurl: '/gass1.png' },
//     { id: 4, gassName: "LPG", company: "Indian", quantity: "19", currentPrice: "930", imgurl: '/gass1.png' },
//     { id: 5, gassName: "LPG", company: "HP", quantity: "5", currentPrice: "1600", imgurl: '/gass1.png' },
//     { id: 6, gassName: "LPG", company: "Indian", quantity: "5", currentPrice: "1580", imgurl: '/gass1.png' },
//     { id: 7, gassName: "LPG", company: "Bharat Gas", quantity: "19 (Commercial)", currentPrice: "1590", imgurl: '/gass1.png' },
//     { id: 8, gassName: "LPG", company: "Reliance Gas", quantity: "19 (Commercial)", currentPrice: "1575", imgurl: '/gass1.png' },
//   ];


//   const handleBookNow = (item) => {
//     navigate('/service', { state: { ...item, currentPrice: item.currentPrice } });
//   };
  
//   return (
//     <>
//       <Header />
//       <section className='bg-[#fff9ea]'>
//         <div className="container text-center">
//           <h2 className="heading">Find a Gas</h2>
//           <div className="max-w-[570px] mt-[30px] mx-auto bg-[#0066ff2c] rounded-md flex items-center justify-between">
//             <input type="search" className='py-4 pl-4 bg-transparent w-full focus:outline-none placeholder:text-TextColor' placeholder='Search Gas' />
//             <button className="btn mt-0 rounded-[0px] rounded-r-md">Search</button>
//           </div>
//         </div>
//       </section>

//       <section>
//         <div className="container">
//           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 lg:gap-[30px] lg:grid-cols-4 mt-[30px] lg:mt-[55px]">
//             {gass.map((item) => (
//               <div key={item.id} className="bg-white p-4 rounded-lg shadow-md text-center">
//                 <img src={item.imgurl} alt="" />
//                 <h3 className="text-xl font-semibold mb-2">{item.gassName}</h3>
//                 <p className="text-gray-600">{item.company}</p>
//                 <p className="text-gray-600">Quantity: {item.quantity} kg</p>
//                 <p className="text-gray-700 font-semibold">Price: ₹{item.currentPrice}</p>
//                 <button onClick={() => handleBookNow(item)} className="btn mt-4 w-full bg-blue-500 text-white rounded-md hover:bg-blue-600">
//                   Book Now
//                 </button>
//               </div>
//             ))}
//           </div>
//         </div>
//       </section>

//       <section>
//         <div className="container">
//           <div className="mx-auto xl:w-[470px]">
//             <h2 className='heading text-center'>What Our Customers Say</h2>
//             <p className="paragraph text-center">Reliable gas supply for all needs. Our company ensures top-quality service and products.</p>
//           </div>
//           <Testimonial />
//         </div>
//       </section>
//       <Footer />
//     </>
//   );
// }

// export default Gass;

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Testimonial from '../../components/Testimonials/Testimonial';
import Header from '../../components/Header/Header';
import Footer from '../../components/Footer/Footer';

const Gass = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const gass = [
    { id: 1, gassName: "LPG", company: "HP", quantity: "14", currentPrice: "950", imgurl: '/gass1.png' },
    { id: 2, gassName: "LPG", company: "Indian", quantity: "14", currentPrice: "940", imgurl: '/gass1.png' },
    { id: 3, gassName: "LPG", company: "HP", quantity: "19", currentPrice: "945", imgurl: '/gass1.png' },
    { id: 4, gassName: "LPG", company: "Indian", quantity: "19", currentPrice: "930", imgurl: '/gass1.png' },
    { id: 5, gassName: "LPG", company: "HP", quantity: "5", currentPrice: "1600", imgurl: '/gass1.png' },
    { id: 6, gassName: "LPG", company: "Indian", quantity: "5", currentPrice: "1580", imgurl: '/gass1.png' },
    { id: 7, gassName: "LPG", company: "Bharat Gas", quantity: "19 (Commercial)", currentPrice: "1590", imgurl: '/gass1.png' },
    { id: 8, gassName: "LPG", company: "Reliance Gas", quantity: "19 (Commercial)", currentPrice: "1575", imgurl: '/gass1.png' },
  ];

  const handleBookNow = (item) => {
    navigate('/service', { state: { ...item, currentPrice: item.currentPrice } });
  };

  const filteredGass = gass.filter(
    (item) =>
      item.gassName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.company.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <Header />
      <section className='bg-[#fff9ea]'>
        <div className="container text-center">
          <h2 className="heading">Find a Gas</h2>
          <div className="max-w-[570px] mt-[30px] mx-auto bg-[#0066ff2c] rounded-md flex items-center justify-between">
            <input
              type="search"
              className='py-4 pl-4 bg-transparent w-full focus:outline-none placeholder:text-TextColor'
              placeholder='Search Gas'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button className="btn mt-0 rounded-[0px] rounded-r-md" onClick={() => setSearchQuery('')}>Clear</button>
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 lg:gap-[30px] lg:grid-cols-4 mt-[30px] lg:mt-[55px]">
            {filteredGass.length > 0 ? (
              filteredGass.map((item) => (
                <div key={item.id} className="bg-white p-4 rounded-lg shadow-md text-center">
                  <img src={item.imgurl} alt={item.gassName} />
                  <h3 className="text-xl font-semibold mb-2">{item.gassName}</h3>
                  <p className="text-gray-600">{item.company}</p>
                  <p className="text-gray-600">Quantity: {item.quantity} kg</p>
                  <p className="text-gray-700 font-semibold">Price: ₹{item.currentPrice}</p>
                  <button onClick={() => handleBookNow(item)} className="btn mt-4 w-full bg-blue-500 text-white rounded-md hover:bg-blue-600">
                    Book Now
                  </button>
                </div>
              ))
            ) : (
              <p className="text-center text-gray-600">No results found for "{searchQuery}".</p>
            )}
          </div>
        </div>
      </section>

      <section>
        <div className="container">
          <div className="mx-auto xl:w-[470px]">
            <h2 className='heading text-center'>What Our Customers Say</h2>
            <p className="paragraph text-center">Reliable gas supply for all needs. Our company ensures top-quality service and products.</p>
          </div>
          <Testimonial />
        </div>
      </section>
      <Footer />
    </>
  );
};

export default Gass;

