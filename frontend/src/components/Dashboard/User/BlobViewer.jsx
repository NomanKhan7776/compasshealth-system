import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { blobsAPI } from "../../../api";
import { useAuth } from "../../../hooks/useAuth.js";
import Button from "../../common/Button";
import Alert from "../../common/Alert";
import Loader from "../../common/Loader";
import Modal from "../../common/Modal";

const BlobViewer = () => {
  const { containerName, folderName } = useParams();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [blobs, setBlobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [file, setFile] = useState(null);
  
  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [blobToDelete, setBlobToDelete] = useState(null);

  // Determine user permissions
  const isAdmin = currentUser?.role === "admin";
  const canUpload = isAdmin || currentUser?.role === "doctor" || currentUser?.role === "nurse";
  const canDelete = isAdmin;
  
  // Handle back navigation based on user role
  const handleBack = () => {
    if (isAdmin) {
      navigate(`/admin/containers/${containerName}`);
    } else {
      navigate(`/containers/${containerName}`);
    }
  };

  // Fetch blobs from the specified container and folder
  const fetchBlobs = async () => {
    try {
      setLoading(true);
      const res = await blobsAPI.getBlobs(containerName, folderName);
      setBlobs(res.data.blobs);
    } catch (err) {
      setError("Failed to load patient data");
      console.error("Error fetching blobs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlobs();
  }, [containerName, folderName]);

  // Handle file selection
  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  // Upload file to the current folder
  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!file) {
      setError("Please select a file to upload");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    try {
      setUploadLoading(true);
      setError("");
      
      await blobsAPI.uploadBlob(containerName, folderName, formData);
      setSuccessMessage("File uploaded successfully");
      setFile(null);
      
      // Reset the file input
      document.getElementById("file-upload").value = "";
      
      // Refresh the blob list
      fetchBlobs();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to upload file");
      console.error("Upload error:", err);
    } finally {
      setUploadLoading(false);
    }
  };

  // Open delete confirmation modal
  const confirmDelete = (blob) => {
    setBlobToDelete(blob);
    setDeleteModalOpen(true);
  };

  // Delete the selected blob
  const handleDelete = async () => {
    try {
      await blobsAPI.deleteBlob(containerName, folderName, blobToDelete.name);
      setSuccessMessage("File deleted successfully");
      setDeleteModalOpen(false);
      setBlobToDelete(null);
      fetchBlobs();
    } catch (err) {
      setError("Failed to delete file");
      console.error("Delete error:", err);
    }
  };

  // Download a blob
  const handleDownload = async (blobName) => {
    try {
      const res = await blobsAPI.getBlobUrl(containerName, folderName, blobName);
      // Open the file in a new tab
      window.open(res.data.sasUrl, "_blank");
    } catch (err) {
      setError("Failed to download file");
      console.error("Download error:", err);
    }
  };

  if (loading) return <Loader size="large" />;

  return (
    <div>
      <div className="flex items-center mb-6">
        <button 
          onClick={handleBack}
          className="text-blue-600 hover:text-blue-800 mr-2"
        >
          ← Back
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {folderName}
        </h1>
      </div>

      {error && <Alert message={error} type="error" />}
      {successMessage && (
        <Alert
          message={successMessage}
          type="success"
          onClose={() => setSuccessMessage("")}
        />
      )}

      {canUpload && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload New File</h2>
          
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select File
              </label>
              <input
                id="file-upload"
                type="file"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex justify-end">
              <Button
                type="submit"
                color="blue"
                disabled={!file || uploadLoading}
              >
                {uploadLoading ? "Uploading..." : "Upload"}
              </Button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Patient Files</h2>
        
        {blobs.length === 0 ? (
          <p className="text-gray-600">No files found in this folder.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    File Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Modified
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {blobs.map((blob) => (
                  <tr key={blob.name}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {blob.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {blob.contentType || "Unknown"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatFileSize(blob.contentLength)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(blob.lastModified).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button
                          color="blue"
                          className="text-xs py-1 px-2"
                          onClick={() => handleDownload(blob.name)}
                        >
                          Download
                        </Button>
                        
                        {canDelete && (
                          <Button
                            color="red"
                            className="text-xs py-1 px-2"
                            onClick={() => confirmDelete(blob)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm File Deletion"
        footer={
          <>
            <Button
              color="red"
              className="w-full sm:w-auto sm:ml-3"
              onClick={handleDelete}
            >
              Delete
            </Button>
            <Button
              color="gray"
              className="mt-3 w-full sm:mt-0 sm:w-auto"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </Button>
          </>
        }
      >
        <p className="text-sm text-gray-500">
          Are you sure you want to delete the file <span className="font-bold">{blobToDelete?.name}</span>?
          This action cannot be undone and the file will be permanently removed from storage.
        </p>
      </Modal>
    </div>
  );
};

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export default BlobViewer;