import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usersAPI, assignmentsAPI } from "../../../api";
import Button from "../../common/Button";
import Alert from "../../common/Alert";
import Loader from "../../common/Loader";
import Modal from "../../common/Modal";

const AssignResources = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [containers, setContainers] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState("");
  const [folders, setFolders] = useState([]);
  const [selectedFolders, setSelectedFolders] = useState([]);

  // For unassignment functionality
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [itemToUnassign, setItemToUnassign] = useState(null);
  const [unassignType, setUnassignType] = useState(null); // 'container' or 'folder'

  const [loading, setLoading] = useState(true);
  const [folderLoading, setFolderLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [unassigning, setUnassigning] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch user details
        const userRes = await usersAPI.getUserById(userId);
        setUser(userRes.data.user);

        // Fetch all containers
        const containersRes = await assignmentsAPI.getAllContainers();
        setContainers(containersRes.data.containers);
      } catch (err) {
        setError("Failed to load data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const fetchFolders = async (containerName) => {
    try {
      setFolderLoading(true);
      setSelectedFolders([]);

      const res = await assignmentsAPI.getFolders(containerName);
      setFolders(res.data.folders);
    } catch (err) {
      setError(`Failed to load folders for ${containerName}`);
      console.error(err);
    } finally {
      setFolderLoading(false);
    }
  };

  const handleContainerChange = (e) => {
    const containerName = e.target.value;
    setSelectedContainer(containerName);

    if (containerName) {
      fetchFolders(containerName);
    } else {
      setFolders([]);
      setSelectedFolders([]);
    }
  };

  const handleFolderChange = (e) => {
    const options = e.target.options;
    const values = [];

    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        values.push(options[i].value);
      }
    }

    setSelectedFolders(values);
  };

  const handleAssign = async () => {
    if (!selectedContainer) {
      setError("Please select a container");
      return;
    }

    try {
      setAssigning(true);
      setError("");

      // First assign the container
      await assignmentsAPI.assignContainer(selectedContainer, userId);

      // Then assign folders if selected
      if (selectedFolders.length > 0) {
        await assignmentsAPI.assignFolders(
          selectedContainer,
          userId,
          selectedFolders
        );
      }

      setSuccess("Resources assigned successfully");

      // Refresh user data
      const userRes = await usersAPI.getUserById(userId);
      setUser(userRes.data.user);

      // Reset form
      setSelectedContainer("");
      setFolders([]);
      setSelectedFolders([]);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to assign resources");
    } finally {
      setAssigning(false);
    }
  };

  // New function to handle unassignment
  const confirmUnassign = (id, type) => {
    setItemToUnassign(id);
    setUnassignType(type);
    setConfirmModalOpen(true);
  };

  // New function to execute unassignment
  const handleUnassign = async () => {
    try {
      setUnassigning(true);
      setError("");

      await assignmentsAPI.revokeAssignment(itemToUnassign, unassignType);

      setSuccess(
        `${
          unassignType === "container" ? "Container" : "Folder"
        } unassigned successfully`
      );

      // Refresh user data
      const userRes = await usersAPI.getUserById(userId);
      setUser(userRes.data.user);

      // Close modal
      setConfirmModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to unassign resource");
    } finally {
      setUnassigning(false);
    }
  };

  if (loading) return <Loader size="large" />;
  if (!user) return <Alert message="User not found" type="error" />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Assign Resources to {user.name}
        </h1>
        <Button color="gray" onClick={() => navigate("/users")}>
          Back to Users
        </Button>
      </div>

      {error && <Alert message={error} type="error" />}
      {success && <Alert message={success} type="success" />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Information */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            User Details
          </h2>

          <div className="space-y-3">
            <div>
              <span className="text-gray-600 font-medium">Name:</span>
              <span className="ml-2">{user.name}</span>
            </div>
            <div>
              <span className="text-gray-600 font-medium">Username:</span>
              <span className="ml-2">{user.username}</span>
            </div>
            <div>
              <span className="text-gray-600 font-medium">Role:</span>
              <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full">
                {user.role}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-md font-semibold text-gray-800 mb-2">
              Current Assignments
            </h3>

            {user.containerAssignments &&
            user.containerAssignments.length > 0 ? (
              <div className="space-y-3">
                {user.containerAssignments.map((assignment) => (
                  <div key={assignment.id} className="bg-gray-50 p-3 rounded">
                    <div className="flex justify-between items-center">
                      <p className="font-medium">{assignment.containerName}</p>
                      <Button
                        color="red"
                        className="text-xs py-1 px-2"
                        onClick={() =>
                          confirmUnassign(assignment.id, "container")
                        }
                      >
                        Unassign
                      </Button>
                    </div>
                    <div className="mt-2 text-sm">
                      <p className="text-gray-600">
                        {user.folderAssignments?.filter(
                          (f) => f.containerName === assignment.containerName
                        ).length || 0}{" "}
                        folders assigned
                      </p>
                    </div>

                    {/* Show folder assignments for this container */}
                    {user.folderAssignments?.filter(
                      (f) => f.containerName === assignment.containerName
                    ).length > 0 && (
                      <div className="mt-2 pl-4 border-l-2 border-gray-300">
                        <p className="text-xs text-gray-500 mb-1">
                          Assigned folders:
                        </p>
                        <div className="space-y-1">
                          {user.folderAssignments
                            .filter(
                              (f) =>
                                f.containerName === assignment.containerName
                            )
                            .map((folder) => (
                              <div
                                key={folder.id}
                                className="flex justify-between items-center bg-white p-2 rounded shadow-sm"
                              >
                                <span className="text-xs">
                                  {folder.folderName}
                                </span>
                                <Button
                                  color="red"
                                  className="text-xs py-0 px-1"
                                  onClick={() =>
                                    confirmUnassign(folder.id, "folder")
                                  }
                                >
                                  Unassign
                                </Button>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No containers assigned yet</p>
            )}
          </div>
        </div>

        {/* Assignment Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Assign New Resources
          </h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Container
              </label>
              <select
                value={selectedContainer}
                onChange={handleContainerChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Select a Container --</option>
                {containers.map((container) => (
                  <option key={container} value={container}>
                    {container}
                  </option>
                ))}
              </select>
            </div>

            {selectedContainer && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Folders (hold Ctrl/Cmd to select multiple)
                </label>

                {folderLoading ? (
                  <Loader size="small" />
                ) : (
                  <select
                    multiple
                    value={selectedFolders}
                    onChange={handleFolderChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 h-60"
                  >
                    {folders.map((folder) => (
                      <option key={folder} value={folder}>
                        {folder}
                      </option>
                    ))}
                  </select>
                )}

                <p className="mt-1 text-sm text-gray-500">
                  {selectedFolders.length} folders selected
                </p>
              </div>
            )}

            <div className="pt-4">
              <Button
                color="blue"
                onClick={handleAssign}
                disabled={!selectedContainer || assigning}
                className="w-full"
              >
                {assigning ? "Assigning..." : "Assign Resources"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title={`Confirm Unassignment`}
        footer={
          <>
            <Button
              type="button"
              color="red"
              onClick={handleUnassign}
              disabled={unassigning}
              className="ml-3"
            >
              {unassigning ? "Unassigning..." : "Unassign"}
            </Button>
            <Button
              type="button"
              color="gray"
              onClick={() => setConfirmModalOpen(false)}
              className="ml-3"
            >
              Cancel
            </Button>
          </>
        }
      >
        <p>
          Are you sure you want to unassign this {unassignType}? This action
          cannot be undone.
        </p>
      </Modal>
    </div>
  );
};

export default AssignResources;
