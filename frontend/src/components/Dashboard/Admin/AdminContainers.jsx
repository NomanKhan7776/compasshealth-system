import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAdmin} from "../../../hooks/useAdmin.js"; 
import Loader from "../../common/Loader";
import Alert from "../../common/Alert";

const AdminContainers = () => {
  const { containers, loading, error, fetchContainers, lastFetched } =
    useAdmin();

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredContainers, setFilteredContainers] = useState([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12; // Fixed items per page
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchContainers();
  }, [fetchContainers]);

  // Update filtered containers when containers or search term changes
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredContainers(containers);
    } else {
      const filtered = containers.filter((container) =>
        container.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredContainers(filtered);
    }

    setTotalPages(
      Math.ceil(
        (searchTerm.trim() === ""
          ? containers.length
          : filteredContainers.length) / itemsPerPage
      )
    );
  }, [containers, searchTerm]);

  // Handle search input changes
  const handleSearch = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    // Reset to first page when search changes
    setCurrentPage(1);
  };

  const handleRefresh = () => {
    fetchContainers(true); // Force refresh
  };

  // Get current page items
  const getCurrentItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredContainers.slice(startIndex, endIndex);
  };

  if (loading.containers && containers.length === 0)
    return <Loader size="large" />;
  if (error.containers)
    return <Alert message={error.containers} type="error" />;

  return (
    <div className="container mx-auto px-2 sm:px-0">
      <div className="flex justify-between items-center mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">
          Container Management (Admin)
        </h1>

        <div className="flex items-center">
          {lastFetched.containers && (
            <span className="text-xs text-gray-500 mr-2">
              Last updated:{" "}
              {new Date(lastFetched.containers).toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={handleRefresh}
            className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 py-1 px-3 rounded flex items-center"
            disabled={loading.containers}
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-4 sm:mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search containers..."
            value={searchTerm}
            onChange={handleSearch}
            className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">
          All Storage Containers
        </h2>

        {filteredContainers.length === 0 ? (
          <p className="text-gray-600">No containers match your search.</p>
        ) : (
          <>
            <div className="space-y-2">
              {getCurrentItems().map((containerName) => (
                <div
                  key={containerName}
                  className="border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow"
                >
                  <h3 className="text-base sm:text-lg font-medium text-gray-800 mb-1 sm:mb-2">
                    {containerName}
                  </h3>
                  <Link
                    to={`/admin/containers/${containerName}`}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm sm:text-base"
                  >
                    View Patient Folders →
                  </Link>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <nav className="inline-flex">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(prev - 1, 1))
                    }
                    disabled={currentPage === 1}
                    className="px-3 sm:px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-l hover:bg-gray-300 disabled:opacity-50"
                  >
                    Previous
                  </button>

                  {[1, 2, 3].map(
                    (page) =>
                      page <= totalPages && (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-2 text-sm ${
                            currentPage === page
                              ? "bg-blue-500 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          }`}
                        >
                          {page}
                        </button>
                      )
                  )}

                  {totalPages > 3 && (
                    <span className="px-2 py-2 text-sm text-gray-500">...</span>
                  )}

                  {totalPages > 3 && (
                    <button
                      onClick={() => setCurrentPage(totalPages)}
                      className={`px-3 py-2 text-sm ${
                        currentPage === totalPages
                          ? "bg-blue-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {totalPages}
                    </button>
                  )}

                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                    }
                    disabled={currentPage === totalPages}
                    className="px-3 sm:px-4 py-2 text-sm bg-gray-200 text-gray-800 rounded-r hover:bg-gray-300 disabled:opacity-50"
                  >
                    Next
                  </button>
                </nav>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminContainers;
