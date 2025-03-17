import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

const Navbar = ({ onMenuClick }) => {
  const { currentUser, logout } = useAuth();

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-100% px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo positioned at the start */}
            <Link to="/" className="flex items-center">
              <img
                src="/image2.png"
                alt="Compass Point Health Logo"
                className="h-10 w-auto"
              />
            </Link>

            {/* Mobile menu button after logo */}
            <button
              className="inline-flex items-center justify-center p-2 ml-3 text-gray-600 lg:hidden"
              onClick={onMenuClick}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>

            {/* Application name with increased left margin */}
            <span className="text-xl font-bold text-teal-700 hidden md:inline ml-8 mr-4">
              Patient Records Management System
            </span>
          </div>

          {currentUser && (
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="text-gray-700 font-medium truncate max-w-[120px] sm:max-w-none">
                {currentUser.name}
                <span className="hidden sm:inline text-sm text-gray-500 ml-1">
                  ({currentUser.role})
                </span>
              </span>
              <button
                onClick={logout}
                className="text-gray-700 hover:text-teal-600 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;