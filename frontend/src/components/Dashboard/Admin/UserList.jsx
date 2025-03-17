import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { usersAPI } from "../../../api";
import Button from "../../common/Button";
import Alert from "../../common/Alert";
import Loader from "../../common/Loader";
import Modal from "../../common/Modal";

const UserList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // State for delete confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await usersAPI.getUsersWithAssignments();
      setUsers(res.data.users);
    } catch (err) {
      setError("Failed to load users");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Open the delete confirmation modal
  const confirmDelete = (user) => {
    setUserToDelete(user);
    setDeleteModalOpen(true);
  };

  // Handle the actual deletion
  const handleDeleteUser = async () => {
    try {
      await usersAPI.deleteUser(userToDelete.userId);
      setSuccessMessage(`User ${userToDelete.name} deleted successfully`);
      setDeleteModalOpen(false);
      setUserToDelete(null);
      fetchUsers(); // Refresh the list
    } catch (err) {
      setError("Failed to delete user");
      console.error(err);
    }
  };

  if (loading) return <Loader size="large" />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">User Management</h1>
        <Link to="/users/create">
          <Button color="green">Create User</Button>
        </Link>
      </div>

      {error && <Alert message={error} type="error" />}
      {successMessage && (
        <Alert
          message={successMessage}
          type="success"
          onClose={() => setSuccessMessage("")}
        />
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Username
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Assignments
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.userId}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {user.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.username}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${
                      user.role === "doctor"
                        ? "bg-green-100 text-green-800"
                        : user.role === "nurse"
                        ? "bg-purple-100 text-purple-800"
                        : "bg-blue-100 text-blue-800"
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div>
                    <span>
                      {user.containerAssignments?.length || 0} containers
                    </span>
                    <br />
                    <span>{user.folderAssignments?.length || 0} folders</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <Link to={`/users/edit/${user.userId}`}>
                      <Button color="blue" className="text-xs py-1 px-2">
                        Edit
                      </Button>
                    </Link>
                    <Link to={`/users/assign/${user.userId}`}>
                      <Button color="green" className="text-xs py-1 px-2">
                        Assign
                      </Button>
                    </Link>
                    <Button
                      color="red"
                      className="text-xs py-1 px-2"
                      onClick={() => confirmDelete(user)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Deletion"
        footer={
          <>
            <Button
              color="red"
              className="w-full sm:w-auto sm:ml-3"
              onClick={handleDeleteUser}
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
          Are you sure you want to delete user{" "}
          <span className="font-bold">{userToDelete?.name}</span>? This action
          cannot be undone.
        </p>
        {userToDelete &&
          (userToDelete.containerAssignments?.length > 0 ||
            userToDelete.folderAssignments?.length > 0) && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-100 rounded-md">
              <p className="text-sm text-yellow-700">
                <span className="font-semibold">Warning:</span> This user has
                assigned resources that will be unassigned:
              </p>
              <ul className="mt-1 text-sm text-yellow-700 list-disc list-inside">
                {userToDelete.containerAssignments?.length > 0 && (
                  <li>
                    {userToDelete.containerAssignments.length} container(s)
                  </li>
                )}
                {userToDelete.folderAssignments?.length > 0 && (
                  <li>{userToDelete.folderAssignments.length} folder(s)</li>
                )}
              </ul>
            </div>
          )}
      </Modal>
    </div>
  );
};

export default UserList;
