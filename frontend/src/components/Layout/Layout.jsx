import React, { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import Footer from "./Footer";

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1">
        {/* Mobile sidebar backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Sidebar */}
        <div
          className={`
          fixed inset-y-0 left-0 z-30 w-64 transform bg-white shadow-md transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} 
          lg:relative lg:translate-x-0 lg:z-0
        `}
        >
          <Sidebar closeSidebar={() => setSidebarOpen(false)} />
        </div>

        {/* Main content */}
        <main className="flex-1 p-4 w-full lg:p-6 overflow-x-hidden">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* Footer positioned at the bottom */}
      <Footer />
    </div>
  );
};

export default Layout;
