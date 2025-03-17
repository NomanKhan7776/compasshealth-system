import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { usersAPI, assignmentsAPI } from "../../../api";
import Button from "../../common/Button";
import Alert from "../../common/Alert";
import Loader from "../../common/Loader";

const AssignResources = () => {
  const { userId } = useParams();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [containers, setContainers] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState("");
  const [folders, setFolders] = useState([]);
  const [selectedFolders, setSelectedFolders] = useState([]);

  const [loading, setLoading] = useState(true);
  const [folderLoading, setFolderLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
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
              <span
                className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                ${user.role === 'doctor' ? 'bg-green-100 text-green-800' : 
                user.role === 'nurse' ? 'bg-purple-100 text-purple-800' : 
                'bg-blue-100 text-blue-800'}"
              >
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
                    <p className="font-medium">{assignment.containerName}</p>
                    <div className="mt-2 text-sm">
                      <p className="text-gray-600">
                        {user.folderAssignments?.filter(
                          (f) => f.containerName === assignment.containerName
                        ).length || 0}{" "}
                        folders assigned
                      </p>
                    </div>
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
    </div>
  );
};

export default AssignResources;
