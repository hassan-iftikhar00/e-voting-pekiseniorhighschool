import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  User,
  Plus,
  Edit,
  Trash2,
  Check,
  X,
  Shield,
  AlertCircle,
  Search,
  RefreshCw,
  Lock,
  Unlock,
} from "lucide-react";
import { useUser } from "../../context/UserContext";
import PermissionGuard from "../PermissionGuard";

interface UserType {
  id: string;
  _id?: string;
  name: string;
  username: string;
  email: string;
  role: string;
  active: boolean;
  lastLogin?: Date;
}

interface Role {
  id: string;
  _id?: string;
  name: string;
  description: string;
  active: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const UserManager: React.FC = () => {
  const { hasPermission } = useUser();
  const canViewUsers = hasPermission("user", "view");
  const canManageUsers = hasPermission("user", "edit");
  const [users, setUsers] = useState<UserType[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [filterRole, setFilterRole] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
    active: true,
  });

  // Check user permissions once instead of using PermissionGuard everywhere
  const canAddUser = hasPermission("users", "add");
  const canEditUser = hasPermission("users", "edit");
  const canDeleteUser = hasPermission("users", "delete");

  useEffect(() => {
    if (canViewUsers) {
      fetchData();
    }
  }, [canViewUsers]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

      // Get authentication token from localStorage
      const token = localStorage.getItem("token");

      // Create headers with authorization token
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      console.log(
        "Using auth token:",
        token ? `Bearer ${token.substring(0, 10)}...` : "None"
      );

      // Make API requests with auth headers
      const [usersResponse, rolesResponse] = await Promise.all([
        axios.get(`${apiUrl}/api/users`, { headers }),
        axios.get(`${apiUrl}/api/roles`, { headers }),
      ]);

      // Process the data to ensure consistent IDs
      const processedUsers = usersResponse.data.map((user: any) => ({
        ...user,
        id: user._id || user.id,
      }));

      const processedRoles = rolesResponse.data.map((role: any) => ({
        ...role,
        id: role._id || role.id,
      }));

      setUsers(processedUsers);
      setRoles(processedRoles.filter((role: Role) => role.active));
      setNotification({
        type: "success",
        message: "Users loaded successfully",
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error("Failed to fetch data:", error);
      setNotification({
        type: "error",
        message: "Failed to load users and roles",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const value =
      target.type === "checkbox"
        ? (target as HTMLInputElement).checked
        : target.value;
    const name = target.name;

    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const resetForm = () => {
    setFormData({
      name: "",
      username: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "",
      active: true,
    });
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      setNotification({
        type: "error",
        message: "Passwords do not match",
      });
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      const response = await axios.post(
        `${API_BASE_URL}/api/users`,
        {
          name: formData.name,
          username: formData.username,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          active: formData.active,
        },
        { headers }
      );

      // Add the new user to the list
      const newUser = response.data.user;
      setUsers([...users, { ...newUser, id: newUser._id || newUser.id }]);

      // Reset form and hide it
      resetForm();
      setShowAddForm(false);

      setNotification({
        type: "success",
        message: "User added successfully",
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      console.error("Error adding user:", err);
      setNotification({
        type: "error",
        message: err.response?.data?.message || "Failed to add user",
      });
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    // Validate passwords if changing
    if (formData.password && formData.password !== formData.confirmPassword) {
      setNotification({
        type: "error",
        message: "Passwords do not match",
      });
      return;
    }

    try {
      const updateData = {
        name: formData.name,
        username: formData.username,
        email: formData.email,
        role: formData.role,
        active: formData.active,
      };

      // Only include password if it's provided
      if (formData.password) {
        Object.assign(updateData, { password: formData.password });
      }

      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      const response = await axios.put(
        `${API_BASE_URL}/api/users/${editingUser.id}`,
        updateData,
        { headers }
      );

      // Update the user in the list
      const updatedUser = response.data.user;
      setUsers(
        users.map((user) =>
          user.id === editingUser.id
            ? { ...updatedUser, id: updatedUser._id || updatedUser.id }
            : user
        )
      );

      // Reset form and hide it
      resetForm();
      setEditingUser(null);

      setNotification({
        type: "success",
        message: "User updated successfully",
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      console.error("Error updating user:", err);
      setNotification({
        type: "error",
        message: err.response?.data?.message || "Failed to update user",
      });
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;

    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      await axios.delete(`${API_BASE_URL}/api/users/${id}`, { headers });
      setUsers(users.filter((user) => user.id !== id));

      setNotification({
        type: "success",
        message: "User deleted successfully",
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      console.error("Error deleting user:", err);
      setNotification({
        type: "error",
        message: err.response?.data?.message || "Failed to delete user",
      });
    }
  };

  const handleEditUser = (user: UserType) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      username: user.username,
      email: user.email,
      password: "",
      confirmPassword: "",
      role: user.role,
      active: user.active,
    });
  };

  const handleToggleUserActive = async (user: UserType) => {
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      const response = await axios.put(
        `${API_BASE_URL}/api/users/${user.id}/toggle-active`,
        {},
        { headers }
      );
      const updatedUser = response.data.user;
      setUsers(
        users.map((u) =>
          u.id === user.id
            ? { ...updatedUser, id: updatedUser._id || updatedUser.id }
            : u
        )
      );
      setNotification({
        type: "success",
        message: `User ${
          updatedUser.active ? "activated" : "deactivated"
        } successfully`,
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      console.error("Error toggling user active status:", err);
      setNotification({
        type: "error",
        message:
          err.response?.data?.message || "Failed to toggle user active status",
      });
    }
  };

  // Filter users
  const filteredUsers = users.filter(
    (user) =>
      (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
      (filterRole === "" || user.role === filterRole) &&
      (filterActive === null || user.active === filterActive)
  );

  if (!canViewUsers) {
    return (
      <div className="bg-yellow-50 p-6 rounded-lg text-center">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-yellow-800 mb-2">
          Access Restricted
        </h3>
        <p className="text-yellow-700">
          You don't have permission to view users.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-4 rounded-lg shadow-md">
        <div>
          <h2 className="text-xl font-bold">User Management</h2>
          <p className="text-indigo-100 text-sm font-sans font-light">
            Manage system users and their access rights
          </p>
        </div>
        <div className="flex space-x-2">
          {canAddUser && (
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingUser(null);
                resetForm();
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm rounded-md shadow-sm text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </button>
          )}
          <button
            onClick={fetchData}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm rounded-md shadow-sm text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            disabled={loading}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
            />
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-4 rounded-md ${
            notification.type === "success"
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          } flex justify-between items-start shadow-sm`}
        >
          <div className="flex">
            {notification.type === "success" ? (
              <Check className="h-5 w-5 text-green-500 mr-3" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            )}
            <p
              className={
                notification.type === "success"
                  ? "text-green-800"
                  : "text-red-800"
              }
            >
              {notification.message}
            </p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Error message */}
      {error && !notification && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 flex justify-between items-start shadow-sm">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <p className="text-red-800">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* User Form */}
      {(showAddForm || editingUser) && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">
            {editingUser ? "Edit User" : "Add New User"}
          </h3>
          <form onSubmit={editingUser ? handleUpdateUser : handleAddUser}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.name}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.username}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.email}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label
                  htmlFor="role"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.role}
                  onChange={handleInputChange}
                >
                  <option value="">Select a role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.name}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Password
                  {editingUser && " (Leave blank to keep current)"}
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required={!editingUser}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.password}
                  onChange={handleInputChange}
                />
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  required={!editingUser || !!formData.password}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                />
              </div>
              <div className="flex items-center mt-4">
                <input
                  type="checkbox"
                  id="active"
                  name="active"
                  checked={formData.active}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="active"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Active
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setEditingUser(null);
                  resetForm();
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {editingUser ? "Update User" : "Add User"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0">
          {/* Left side - Filter buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setFilterActive(null)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                filterActive === null
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
            >
              All Users
            </button>
            <button
              onClick={() => setFilterActive(true)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                filterActive === true
                  ? "bg-green-600 text-white"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setFilterActive(false)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                filterActive === false
                  ? "bg-red-600 text-white"
                  : "bg-gray-100 text-gray-800 hover:bg-gray-200"
              }`}
            >
              Inactive
            </button>
          </div>

          {/* Right side - Role filter */}
          <div className="md:ml-auto">
            <select
              className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
            >
              <option value="">All Roles</option>
              {roles.map((role) => (
                <option key={role.id} value={role.name}>
                  {role.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search users by name, username, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
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
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-indigo-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.username}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 text-indigo-500 mr-1" />
                      <span className="text-sm text-gray-900">{user.role}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        user.active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {user.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      {canEditUser && (
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Edit user"
                        >
                          <Edit className="h-5 w-5" />
                        </button>
                      )}

                      {canEditUser && (
                        <button
                          onClick={() => handleToggleUserActive(user)}
                          className={`${
                            user.active
                              ? "text-red-600 hover:text-red-900"
                              : "text-green-600 hover:text-green-900"
                          }`}
                          title={
                            user.active ? "Deactivate user" : "Activate user"
                          }
                          disabled={user.username === "admin"}
                        >
                          {user.active ? (
                            <Lock className="h-5 w-5" />
                          ) : (
                            <Unlock className="h-5 w-5" />
                          )}
                        </button>
                      )}

                      {canDeleteUser && (
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-600 hover:text-red-900"
                          title={
                            user.username === "admin"
                              ? "Cannot delete admin user"
                              : "Delete user"
                          }
                          disabled={user.username === "admin"}
                        >
                          <Trash2
                            className={`h-5 w-5 ${
                              user.username === "admin"
                                ? "opacity-50 cursor-not-allowed"
                                : ""
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            No users found matching your search criteria.
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManager;
