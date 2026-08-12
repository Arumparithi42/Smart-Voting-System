import React from 'react'
import { Link } from 'react-router-dom'
import logo from './../../assets/images/logo.png'
import { RiLinkedinFill } from 'react-icons/ri'
import { AiFillGithub, AiOutlineInstagram } from 'react-icons/ai'

const socialLinks = [
  {
    path: "",
    icon: <AiFillGithub className='group-hover:text-white w-4 h-5' />
  },
  {
    path: "",
    icon: <AiOutlineInstagram className='group-hover:text-white w-4 h-5' />
  },
  {
    path: "",
    icon: <RiLinkedinFill className='group-hover:text-white w-4 h-5' />
  },
]

const quickLinks01 = [
  {
    path: '/home',
    display: 'Home'
  },
  {
    path: '/about',
    display: 'About Us'
  },
  {
    path: '/services',
    display: 'Our Services'
  },
  {
    path: '/blog',
    display: 'Blog'
  },
]

const quickLinks02 = [
  {
    path: '/find-distributor',
    display: 'Find a Distributor'
  },
  {
    path: '/book-cylinder',
    display: 'Book a Cylinder'
  },
  {
    path: '/locations',
    display: 'Service Locations'
  },
  {
    path: '/safety-tips',
    display: 'Safety Tips'
  },
]

const quickLinks03 = [
  {
    path: '/donate',
    display: 'Support Us'
  },
  {
    path: '/contact',
    display: 'Contact Us'
  }
]



const Footer = () => {
  const year = new Date().getFullYear();

  return (
    <footer className='pb-16 pt-10'>
      <div className="container">
        <div className="flex justify-between flex-col md:flex-row flex-wrap gap-[30px]">
          <div>
            <Link to='/' className="flex justify-center items-center gap-2 p-2  border-primary rounded-lg  text-white">
              <img src='/logo.png' alt="Logo" className="h-12 w-12 rounded-full shadow-md bg-gradient-to-r from-yellow-400 to-orange-400" />
              <span className="text-2xl font-extrabold tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-yellow-500">
                BookMyGas
              </span>
            </Link>



          </div>

          <div>
            <h2 className="text-[20px] leading-[30px] font-[700] mb-6 text-HeadingColor ">
              Quick Links
            </h2>

            <ul>
              {quickLinks01.map((item, index) => (
                <li key={index} className='mb-4'>
                  <Link to={item.path} className='text-[16px] leading-7 font-[400] text-TextColor'>
                    {item.display}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-[20px] leading-[30px] font-[700] mb-6 text-HeadingColor ">
              -
            </h2>

            <ul>
              {quickLinks02.map((item, index) => (
                <li key={index} className='mb-4'>
                  <Link to={item.path} className='text-[16px] leading-7 font-[400] text-TextColor'>
                    {item.display}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-[20px] leading-[30px] font-[700] mb-6 text-HeadingColor ">
              Support
            </h2>

            <ul>
              {quickLinks03.map((item, index) => (
                <li key={index} className='mb-4'>
                  <Link to={item.path} className='text-[16px] leading-7 font-[400] text-TextColor'>
                    {item.display}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

    </footer>
  )
}

export default Footer
