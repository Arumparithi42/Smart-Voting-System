import React from 'react'
import Hero from '../components/Hero'
import Header from '../components/Header/Header'
import Footer from '../components/Footer/Footer'
import { useNavigate } from 'react-router-dom'

const Home = () => {
  const navigate=useNavigate();
  return (
    <div className=' max-h-screen overflow-hidden'>
      {/* <Header /> */}
      {/* Hero Section Start */}
      {/* <section className='heroSection pt-[40px] 2xl:h-[800px]'>
        <div className="container">
          <div className="flex flex-col lg:flex-row gap-[90px] items-center justify-between px-[4%]">
            <div>
              <div className="lg:w-[570px]">
                <h1 className="text-[30px] leading-[46px] text-headingColor font-[800] md:text-[50px] md:leading-[65px]">
                  Streamlining LPG Gas Booking with Ease.
                </h1>
                <p className="paragraph">
                  We're dedicated to making gas booking simple and efficient. With reliable service and timely deliveries, we ensure that every household receives the fuel they need without hassle. Join us in delivering convenience and safety to every home.
                </p>
                <button className="btn"  onClick={() => navigate('/gass')}>Book Your Cylinder</button>
              </div>

              <div className="mt-[20px] lg:mt-[25px] flex flex-col lg:flex-row lg:items-center gap-5 lg:gap-[30px]">
                <div>
                  <h2 className="text-[30px] lg:text-[35px] font-[700] text-HeadingColor">
                    30+
                  </h2>
                  <span className="w-[100px] h-2 bg-Yellow rounded-full block mt-[-14px]"></span>
                  <p className="paragraph">Years of Service</p>
                </div>
                <div>
                  <h2 className="text-[30px] lg:text-[35px] font-[700] text-HeadingColor">
                    50+
                  </h2>
                  <span className="w-[100px] h-2 bg-Purple rounded-full block mt-[-14px]"></span>
                  <p className="paragraph">Service Locations</p>
                </div>
                <div>
                  <h2 className="text-[30px] lg:text-[35px] font-[700] text-HeadingColor">
                    100%
                  </h2>
                  <span className="w-[100px] h-2 bg-SkyBlue rounded-full block mt-[-14px]"></span>
                  <p className="paragraph">Customer Satisfaction</p>
                </div>
              </div>
            </div>

            <div className="flex gap-[30px] justify-end">
              <div className="flex justify-center items-center rounded-xl">
                <img src="/gass1.png" alt="" className="w-full bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-600 rounded-xl" />
              </div>
              <div className="mt-[30px]">
                <img src="/gass1.png" alt="" className="w-full mb-[30px] bg-gradient-to-b from-purple-300 via-purple-500 to-purple-700 rounded-xl" />
                <img src="/gass1.png" alt="" className="w-full bg-gradient-to-b from-sky-200 via-sky-400 to-sky-600 rounded-xl" />
              </div>
            </div>
          </div>
        </div>

      </section> */}
      <Hero/>
      {/* Hero Section End  */}

      {/* <section>
        <div className="container">
          <div className="mx-auto lg:w-[470px]">
            <h2 className='heading text-center'>
              Providing the Best Service in the Town
            </h2>
            <p className="paragraph text-center">
              World-Class care for everyone. Our health System offers are unmatched.
              Expert Healthcare.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-[30px] mt-[30px] lg:mt-[55px]">
            <div className="px-5 py-[30px]">
              <div className="flex items-center justify-center">
                <img src={icon01} alt="" />
              </div>

              <div className='mt-[30px]'>
                <h2 className='text-[26px] leading-9 text-HeadingColor font-[700] text-center'>
                  Find a Doctor
                </h2>
                <p className='text-[16px] leading-7 text-TextColor font-[400] mt-4 text-center'>
                  World-Class Care for everyone. Our health System Offers Unmateched. Expert HealCare. From the lab to the clinic.
                </p>

                <Link to='/doctors' className='w-[44px] h-[44px] rounded-full border border-solid border-[#181A1E] mt-[30px] mx-auto flex items-center justify-center group hover:bg-Color hover:border-none'>
                  <BsArrowRight className='group-hover:text-white w-6 h-5' />
                </Link>
              </div>
            </div>

            <div className="px-5 py-[30px]">
              <div className="flex items-center justify-center">
                <img src={icon02} alt="" />
              </div>

              <div className='mt-[30px]'>
                <h2 className='text-[26px] leading-9 text-HeadingColor font-[700] text-center'>
                  Find a Location
                </h2>
                <p className='text-[16px] leading-7 text-TextColor font-[400] mt-4 text-center'>
                  World-Class Care for everyone. Our health System Offers Unmateched. Expert HealCare. From the lab to the clinic.
                </p>

                <Link to='/doctors' className='w-[44px] h-[44px] rounded-full border border-solid border-[#181A1E] mt-[30px] mx-auto flex items-center justify-center group hover:bg-Color hover:border-none'>
                  <BsArrowRight className='group-hover:text-white w-6 h-5' />
                </Link>
              </div>
            </div>
            <div className="px-5 py-[30px]">
              <div className="flex items-center justify-center">
                <img src={icon03} alt="" />
              </div>

              <div className='mt-[30px]'>
                <h2 className='text-[26px] leading-9 text-HeadingColor font-[700] text-center'>
                  Book an Appointment
                </h2>
                <p className='text-[16px] leading-7 text-TextColor font-[400] mt-4 text-center'>
                  World-Class Care for everyone. Our health System Offers Unmateched. Expert HealCare. From the lab to the clinic.
                </p>

                <Link to='/doctors' className='w-[44px] h-[44px] rounded-full border border-solid border-[#181A1E] mt-[30px] mx-auto flex items-center justify-center group hover:bg-Color hover:border-none'>
                  <BsArrowRight className='group-hover:text-white w-6 h-5' />
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section> */}

      {/* <About /> */}
      {/* 
      <section>
        <div className="container ">
          <div className="mx-auto xl:w-[470px]">
            <h2 className='heading text-center'>Our Medical Services</h2>
            <p className="paragraph">World-Class care for everyone. Our health system offers unmatched,
              expert health care.</p>
          </div>

          <ServicesList />
        </div>
      </section> */}

      {/* <section>
        <div className="container">
          <div className="flex items-center justify-between flex-col lg:flex-row">
            <div className="xl:w-[670px]">
              <h2 className="heading">Get Virtual Treatment <br />anytime.</h2>

              <ul className="pl-4">
                <li className="paragraph">
                  1. Schedule the appointment directly.
                </li>
                <li className="paragraph">
                  2. Search for your physician here, and contact their office.
                </li>
                <li className="paragraph">
                  3. View our hysicians who are accepting new patients, use the online scheduling .
                </li>
              </ul>
              <Link to='/'>
                <button className="btn">Learn More</button>
              </Link>
            </div>

            <div className="relative z-10 xl:w-[770px] flex justify-end mt-[50px] lg:mt-0">
              <img src={featureImg} alt="" className='w-3/4' />

              <div className="w-[150px] lg:w-[248px] bg-white absolute bottom-[50px] left-0 md:bottom-[100px] md:left-5 z-20 p-2 pb-3 lg:pt-4 lg:pb-[26px] rounded-[10px]">
                <div className="flex items-center justify-between gap-[6px] lg:gap-3">
                  <p className="text-[10px] leading-[10px] lg:text-[14px] lg:leading-5 text-HeadingColor font-[600]">Wed, 15</p>
                  <p className="text-[10px] leading-[10px] lg:text-[14px] lg:leading-5 text-Text font-[600]">02:00AM</p>
                  <span className="w-5 h-5 lg:w-[34px] lg:h-[34px] flex items-center justify-center bg-Yellow rounded py-1 px-[6px] lg:py-3 lg:px-[9px]">
                    <img src={videoIcon} alt="" />
                  </span>
                </div>

                <div className="w-[65px] lg:w-[96px] bg-[#CCF0F3] py-1 px-2 lg:py-[6px] lg:px-[10px] text-[8px] leading-[8px] lg:text-[12px] lg:leading-4 text-SkyBlue font-[500] mt-2 lg:mt-4 rounded-full">
                  Consultation
                </div>

                <div className="flex items-center gap-[6px] lg:gap-[10px] mt-2 lg:mt-[18px]">
                  <img src={avatarIcon} alt="" />
                  <h4 className="text-[10px] leading-3 lg:text-[16px] lg:leading-[22px] font-[700] text-HeadingColor">
                    Shane Bahadur
                  </h4>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section> */}
      {/* 
      <section>
        <div className="container">
          <div className="mx-auto xl:w-[470px]">
            <h2 className='heading text-center'>Our Expert Doctors</h2>
            <p className="paragraph text-center">World-Class care for everyone. Our health system offers unmatched,
              expert health care.</p>
          </div>
          <DoctorsList />
        </div>
      </section> */}

      {/* FAQ Section Start */}
      {/* <section>
        <div className="container">
          <div className="flex justify-between gap-[50px] lg:gap-0">
            <div className="w-1/2 hidden md:block">
              <img src={faqImg} alt="" />
            </div>

            <div className="w-full md:w-1/2">
              <h2 className="heading ">Most questions by our beloved patients</h2>

              <FaqList />
            </div>
          </div>
        </div>
      </section> */}
      {/* FAQ Section End */}


      {/* Testimonials */}
      {/* <section>
        <div className="container">
          <div className="mx-auto xl:w-[470px]">
            <h2 className='heading text-center'>What Our Patients Say</h2>
            <p className="paragraph text-center">World-Class care for everyone. Our health system offers unmatched,
              expert health care.</p>
          </div>
          <Testimonial />
        </div>
      </section> */}
      {/* Testimonials */}
      {/* <Footer /> */}
    </div>
  )
}

export default Home
