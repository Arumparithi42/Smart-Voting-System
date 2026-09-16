import React from 'react';
import { Vote } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import AvatarCom from '../AvatarCom';
import { useUser } from '@clerk/clerk-react';

const Header = () => {
  const { user } = useUser();
  const location = useLocation(); // Get current route

  return (
    <nav className="container mx-auto px-6 py-4 h-10 bg-gradient-to-r from-yellow-100 via-yellow-100 to-white w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Vote className="h-8 w-8 text-blue-900" />
          <span className="text-2xl font-bold text-blue-900">eVote</span>
        </div>
        <div className="hidden md:flex items-center space-x-8">
          <Link
            to="/"
            className={`${
              location.pathname === '/' ? 'text-orange-500' : 'text-blue-900'
            } hover:text-amber-500`}
          >
            Home
          </Link>
          <Link
            to="/elections"
            className={`${
              location.pathname === '/elections' ? 'text-orange-500' : 'text-blue-900'
            } hover:text-amber-500`}
          >
            All Election
          </Link>
          {user && (
            <Link
              to="/dashboard"
              className={`${
                location.pathname === '/dashboard' ? 'text-orange-500' : 'text-blue-900'
              } hover:text-amber-500`}
            >
              Dashboard
            </Link>
          )}
          <Link
            to="/contact"
            className={`${
              location.pathname === '/contact' ? 'text-orange-500' : 'text-blue-900'
            } hover:text-amber-500`}
          >
            Contact
          </Link>
        </div>
        {user ? (
          <AvatarCom />
        ) : (
          <div className="flex gap-2">
            <Link
              to="/sign-in"
              className="bg-amber-500 text-white px-6 py-2 rounded-full hover:bg-amber-600 transition-colors"
            >
              Login
            </Link>
            <Link
              to="/sign-up"
              className="bg-blue-900 text-white px-6 py-2 rounded-full hover:bg-blue-800 transition-colors"
            >
              Signup
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Header;
