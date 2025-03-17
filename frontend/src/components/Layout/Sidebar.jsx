// src/components/Layout/Sidebar.jsx
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth.js";

const Sidebar = ({ closeSidebar }) => {
  const { currentUser } = useAuth();
  const location = useLocation();

  const isAdmin = currentUser?.role === "admin";

  const NavItem = ({ to, children }) => {
    const isActive =
      location.pathname === to || location.pathname.startsWith(`${to}/`);
    return (
      <Link
        to={to}
        className={`flex items-center px-4 py-2 rounded-md ${
          isActive
            ? "bg-blue-500 text-white"
            : "text-gray-700 hover:bg-blue-100 hover:text-blue-600"
        }`}
        onClick={closeSidebar}
      >
        {children}
      </Link>
    );
  };

  return (
    <div className="h-full flex flex-col overflow-y-auto pt-5 pb-4 px-3">
      <div className="flex items-center justify-between mb-6 px-1 lg:hidden">
        <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
        <button
          onClick={closeSidebar}
          className="p-1 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100"
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
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      <div className="hidden lg:block mb-6 px-1">
        <h2 className="text-xl font-bold text-gray-800">Dashboard</h2>
      </div>

      <ul className="space-y-2">
        <li>
          <NavItem to="/dashboard">Home</NavItem>
        </li>

        {isAdmin && (
          <>
            <li>
              <NavItem to="/users">Users</NavItem>
            </li>
            <li>
              <NavItem to="/assignments">Assignments</NavItem>
            </li>
            <li>
              <NavItem to="/audit-logs">Audit Logs</NavItem>
            </li>
            <li>
              <NavItem to="/admin/containers">Storage Management</NavItem>
            </li>
          </>
        )}

        {!isAdmin && (
          <li>
            <NavItem to="/my-assignments">My Assignments</NavItem>
          </li>
        )}
      </ul>
    </div>
  );
};

export default Sidebar;
