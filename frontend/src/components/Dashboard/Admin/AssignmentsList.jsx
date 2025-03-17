import React, { useState, useEffect } from "react";
import { usersAPI, assignmentsAPI } from "../../../api";
import Loader from "../../common/Loader";
import Alert from "../../common/Alert";

const AssignmentsList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);

        // Get all users first
        const usersResponse = await usersAPI.getAllUsers();
        const userData = usersResponse.data.users;

        // Then get assignments for each user
        const usersWithAssignments = await Promise.all(
          userData.map(async (user) => {
            try {
              const assignmentsResponse =
                await assignmentsAPI.getUserAssignments(user.userId);
              return {
                ...user,
                containerAssignments:
                  assignmentsResponse.data.containerAssignments || [],
                folderAssignments:
                  assignmentsResponse.data.folderAssignments || [],
              };
            } catch (err) {
              console.error(
                `Failed to load assignments for user ${user.userId}`,
                err
              );
              return {
                ...user,
                containerAssignments: [],
                folderAssignments: [],
              };
            }
          })
        );

        setUsers(usersWithAssignments);
      } catch (err) {
        setError("Failed to load assignments");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  if (loading) return <Loader size="large" />;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-6">
        Resource Assignments
      </h1>

      {error && <Alert message={error} type="error" />}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Containers
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Folders
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.userId}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {user.username}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
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
                  {user.containerAssignments?.length > 0 ? (
                    <ul className="list-disc list-inside">
                      {user.containerAssignments.map((c) => (
                        <li key={c.id}>{c.containerName}</li>
                      ))}
                    </ul>
                  ) : (
                    "No containers assigned"
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.folderAssignments?.length || 0} folders
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AssignmentsList;
