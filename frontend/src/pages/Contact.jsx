import React from 'react'
import Header from '../components/Header/Header'
import Footer from '../components/Footer/Footer'

const Contact = () => {
  return (
    <div className="min-h-screen bg-gradient-to-r from-yellow-100 via-yellow-100 to-white">
      <Header />
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-3xl font-bold text-[#1E3A8A] text-center mb-4">Contact Us</h2>
          <p className="mb-8 text-gray-600 text-center">
            Got any issue? Want to reach us? Let us know.
          </p>

          <form action="#" className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Your Email</label>
              <input 
                type="email" 
                id="email" 
                placeholder="example@email.com" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input 
                type="text" 
                id="subject" 
                placeholder="Let us know how we can help you" 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Your Message</label>
              <textarea 
                id="message"  
                rows={6} 
                placeholder="Leave a message..." 
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1E3A8A] focus:border-transparent"
              ></textarea>
            </div>

            <button className="w-full bg-[#1E3A8A] text-white py-2 px-4 rounded-lg hover:bg-[#2B4BA8] transition-colors">
              Submit
            </button>
          </form>
        </div>
      </section>
      {/* <Footer/> */}
    </div>
  )
}

export default Contact