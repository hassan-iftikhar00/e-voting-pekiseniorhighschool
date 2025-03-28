import React, { useState, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  Lock,
  Shield,
  Save,
  UserCog,
  Info,
} from "lucide-react";
import { useUser } from "../../context/UserContext";

// Define interfaces for the data
interface Permission {
  view?: boolean;
  add?: boolean;
  edit?: boolean;
  delete?: boolean;
  [key: string]: boolean | undefined; // Allow any string keys for other permission types
}

// Interface for the array-based permission format used for new role creation
interface PermissionItem {
  resource: string;
  actions: string[];
}

interface Role {
  _id: string;
  name: string;
  description: string;
  permissions: Map<string, Permission> | Record<string, Permission>; // Can be Map or plain object
  isDefault?: boolean;
  isSystem?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

// Available resources and their possible actions
const availableResources = [
  {
    name: "user",
    label: "Users",
    actions: ["view", "add", "edit", "delete"],
  },
  {
    name: "role",
    label: "Roles & Permissions",
    actions: ["view", "add", "edit", "delete"],
  },
  {
    name: "class",
    label: "Classes",
    actions: ["view", "add", "edit", "delete"],
  },
  {
    name: "house",
    label: "Houses",
    actions: ["view", "add", "edit", "delete"],
  },
  {
    name: "position",
    label: "Positions",
    actions: ["view", "add", "edit", "delete"],
  },
  {
    name: "candidate",
    label: "Candidates",
    actions: ["view", "add", "edit", "delete"],
  },
  {
    name: "voter",
    label: "Voters",
    actions: ["view", "add", "edit", "delete", "import"],
  },
  {
    name: "vote",
    label: "Votes",
    actions: ["view", "add", "delete"],
  },
  {
    name: "results",
    label: "Results",
    actions: ["view", "edit"],
  },
  {
    name: "analytics",
    label: "Analytics",
    actions: ["view", "export"],
  },
  {
    name: "logs",
    label: "Activity Logs",
    actions: ["view", "delete"],
  },
  {
    name: "settings",
    label: "System Settings",
    actions: ["view", "edit"],
  },
];

const RolePermissionsManager: React.FC = () => {
  const { hasPermission } = useUser(); // Get permission check function
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [newRole, setNewRole] = useState<{
    name: string;
    description: string;
    permissions: PermissionItem[]; // Use array format for new roles
  }>({
    name: "",
    description: "",
    permissions: [],
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Check user permissions once
  const canViewRoles = hasPermission("role", "view");
  const canManageRoles = hasPermission("role", "edit");

  // Fetch roles from the API
  const fetchRoles = async () => {
    if (!canViewRoles) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get authentication token
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/roles`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch roles: ${response.status}`);
      }

      const data = await response.json();
      setRoles(data);

      // Select the first role by default if none is selected
      if (data.length > 0 && !selectedRole) {
        setSelectedRole(data[0]);
      }
    } catch (error: any) {
      console.error("Error fetching roles:", error);
      setError(error.message || "Failed to load roles");
    } finally {
      setIsLoading(false);
    }
  };

  // Load roles on component mount
  useEffect(() => {
    if (canViewRoles) {
      fetchRoles();
    }
  }, [canViewRoles]);

  // Create a new role
  const handleCreateRole = async () => {
    if (!canManageRoles) return;
    if (!newRole.name.trim()) {
      setNotification({
        type: "error",
        message: "Role name is required",
      });
      return;
    }

    try {
      setIsLoading(true);

      // Convert array-based permissions to object format for API
      const permissionsObj: Record<string, Permission> = {};
      newRole.permissions.forEach((p) => {
        permissionsObj[p.resource] = p.actions.reduce((acc, action) => {
          acc[action] = true;
          return acc;
        }, {} as Permission);
      });

      // Get authentication token
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/roles`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            name: newRole.name,
            description: newRole.description,
            permissions: permissionsObj,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create role");
      }

      const createdRole = await response.json();
      setRoles([...roles, createdRole]);
      setSelectedRole(createdRole);
      setIsCreatingRole(false);
      setNewRole({
        name: "",
        description: "",
        permissions: [],
      });

      setNotification({
        type: "success",
        message: "Role created successfully",
      });
    } catch (error: any) {
      console.error("Error creating role:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to create role",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Update an existing role
  const handleUpdateRole = async () => {
    if (!canManageRoles || !editingRole) return;
    if (!editingRole.name.trim()) {
      setNotification({
        type: "error",
        message: "Role name is required",
      });
      return;
    }

    try {
      setIsLoading(true);

      // Get authentication token
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/roles/${
          editingRole._id
        }`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(editingRole),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update role");
      }

      const updatedRole = await response.json();

      // Update the roles list and selected role
      setRoles(
        roles.map((role) => (role._id === updatedRole._id ? updatedRole : role))
      );
      if (selectedRole && selectedRole._id === updatedRole._id) {
        setSelectedRole(updatedRole);
      }

      setEditingRole(null);
      setNotification({
        type: "success",
        message: "Role updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating role:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to update role",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Delete a role
  const handleDeleteRole = async (roleId: string) => {
    if (!canManageRoles) return;

    // Find the role to check if it's a system role
    const roleToDelete = roles.find((role) => role._id === roleId);
    if (roleToDelete?.isSystem) {
      setNotification({
        type: "error",
        message: "System roles cannot be deleted",
      });
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to delete this role? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setIsLoading(true);

      // Get authentication token
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/roles/${roleId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete role");
      }

      // Update the roles list and selected role
      const updatedRoles = roles.filter((role) => role._id !== roleId);
      setRoles(updatedRoles);

      if (selectedRole && selectedRole._id === roleId) {
        setSelectedRole(updatedRoles.length > 0 ? updatedRoles[0] : null);
      }

      setNotification({
        type: "success",
        message: "Role deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting role:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to delete role",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Handle permission toggles
  const handlePermissionToggle = (
    resource: string,
    action: string,
    isChecked: boolean
  ) => {
    if (editingRole) {
      // Clone the permissions (regardless of being a Map or object)
      let updatedPermissions:
        | Map<string, Permission>
        | Record<string, Permission>;

      if (editingRole.permissions instanceof Map) {
        updatedPermissions = new Map(editingRole.permissions);

        // Get or create the resource permissions
        const resourcePerms = updatedPermissions.get(resource) || {};

        // Update the specific action
        updatedPermissions.set(resource, {
          ...resourcePerms,
          [action]: isChecked,
        });
      } else {
        // Handle as object
        updatedPermissions = { ...editingRole.permissions };
        updatedPermissions[resource] = {
          ...(updatedPermissions[resource] || {}),
          [action]: isChecked,
        };
      }

      setEditingRole({
        ...editingRole,
        permissions: updatedPermissions,
      });
    } else if (isCreatingRole) {
      // Continue to use the array structure for new role creation
      const updatedPermissions = [...newRole.permissions];
      const resourceIndex = updatedPermissions.findIndex(
        (p) => p.resource === resource
      );

      if (resourceIndex >= 0) {
        if (isChecked) {
          if (!updatedPermissions[resourceIndex].actions.includes(action)) {
            updatedPermissions[resourceIndex] = {
              ...updatedPermissions[resourceIndex],
              actions: [...updatedPermissions[resourceIndex].actions, action],
            };
          }
        } else {
          updatedPermissions[resourceIndex] = {
            ...updatedPermissions[resourceIndex],
            actions: updatedPermissions[resourceIndex].actions.filter(
              (a) => a !== action
            ),
          };

          if (updatedPermissions[resourceIndex].actions.length === 0) {
            updatedPermissions.splice(resourceIndex, 1);
          }
        }
      } else if (isChecked) {
        updatedPermissions.push({
          resource,
          actions: [action],
        });
      }

      setNewRole({
        ...newRole,
        permissions: updatedPermissions,
      });
    }
  };

  // Check if a permission is active for the current role
  const isPermissionActive = (resource: string, action: string): boolean => {
    if (editingRole) {
      const permissions = editingRole.permissions;
      if (permissions instanceof Map) {
        const resourcePermissions = permissions.get(resource);
        return resourcePermissions ? !!resourcePermissions[action] : false;
      } else {
        const resourcePermissions = permissions[resource];
        return resourcePermissions ? !!resourcePermissions[action] : false;
      }
    }

    if (isCreatingRole) {
      const resourcePermission = newRole.permissions.find(
        (p) => p.resource === resource
      );
      return resourcePermission
        ? resourcePermission.actions.includes(action)
        : false;
    }

    if (!selectedRole) return false;

    const permissions = selectedRole.permissions;
    if (permissions instanceof Map) {
      const resourcePermissions = permissions.get(resource);
      return resourcePermissions ? !!resourcePermissions[action] : false;
    } else {
      const resourcePermissions = permissions[resource];
      return resourcePermissions ? !!resourcePermissions[action] : false;
    }
  };

  // Filter roles based on search term
  const filteredRoles = roles.filter(
    (role) =>
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // If user doesn't have view permission
  if (!canViewRoles) {
    return (
      <div className="bg-yellow-50 p-6 rounded-lg text-center">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-yellow-800 mb-2">
          Access Restricted
        </h3>
        <p className="text-yellow-700">
          You don't have permission to view roles and permissions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-4 rounded-lg shadow-md">
        <div>
          <h2 className="text-xl font-bold">Roles & Permissions</h2>
          <p className="text-indigo-100 text-sm font-sans font-light">
            Manage user roles and their access levels in the system
          </p>
        </div>
        {canManageRoles && (
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setIsCreatingRole(true);
                setEditingRole(null);
                setSelectedRole(null);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm rounded-md shadow-sm text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
              disabled={isCreatingRole}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Role
            </button>
          </div>
        )}
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

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center">
            <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mb-2" />
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && !isLoading && (
        <div className="bg-red-50 p-4 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left sidebar: Roles list */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <UserCog className="h-5 w-5 text-indigo-500 mr-2" />
              Roles
            </h3>

            {/* Search roles */}
            <div className="mt-3 relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Search roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Roles list */}
          <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
            {filteredRoles.length > 0 ? (
              filteredRoles.map((role) => (
                <div
                  key={role._id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedRole?._id === role._id ? "bg-indigo-50" : ""
                  }`}
                  onClick={() => {
                    if (!isCreatingRole && !editingRole) {
                      setSelectedRole(role);
                    }
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 flex items-center">
                        {role.isSystem && (
                          <Lock className="h-3 w-3 text-indigo-500 mr-1" />
                        )}
                        {role.name}
                        {role.isDefault && (
                          <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-800">
                            Default
                          </span>
                        )}
                      </h4>
                      <p className="mt-1 text-xs text-gray-500">
                        {role.description}
                      </p>
                    </div>

                    {canManageRoles && (
                      <div className="flex space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingRole(role);
                            setIsCreatingRole(false);
                            setSelectedRole(null);
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100"
                          title="Edit role"
                          disabled={isCreatingRole || !!editingRole}
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        {!role.isSystem && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRole(role._id);
                            }}
                            className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-100"
                            title="Delete role"
                            disabled={isCreatingRole || !!editingRole}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                No roles found {searchTerm ? `matching "${searchTerm}"` : ""}
              </div>
            )}
          </div>
        </div>

        {/* Right side: Permissions */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-md">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Shield className="h-5 w-5 text-indigo-500 mr-2" />
              {isCreatingRole
                ? "Create New Role"
                : editingRole
                ? `Edit Role: ${editingRole.name}`
                : selectedRole
                ? `Permissions: ${selectedRole.name}`
                : "Select a role to view permissions"}
            </h3>

            {(isCreatingRole || editingRole) && (
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setIsCreatingRole(false);
                    setEditingRole(null);
                    setSelectedRole(roles.length > 0 ? roles[0] : null);
                  }}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Cancel
                </button>

                <button
                  onClick={isCreatingRole ? handleCreateRole : handleUpdateRole}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Save className="h-4 w-4 mr-1.5" />
                  {isCreatingRole ? "Create Role" : "Save Changes"}
                </button>
              </div>
            )}
          </div>

          {/* Role details form (for creating/editing) */}
          {(isCreatingRole || editingRole) && (
            <div className="p-4 border-b border-gray-200">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role Name
                  </label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    value={
                      isCreatingRole ? newRole.name : editingRole?.name || ""
                    }
                    onChange={(e) => {
                      if (isCreatingRole) {
                        setNewRole({ ...newRole, name: e.target.value });
                      } else if (editingRole) {
                        setEditingRole({
                          ...editingRole,
                          name: e.target.value,
                        });
                      }
                    }}
                    placeholder="Enter role name"
                    disabled={editingRole?.isSystem}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                    value={
                      isCreatingRole
                        ? newRole.description
                        : editingRole?.description || ""
                    }
                    onChange={(e) => {
                      if (isCreatingRole) {
                        setNewRole({ ...newRole, description: e.target.value });
                      } else if (editingRole) {
                        setEditingRole({
                          ...editingRole,
                          description: e.target.value,
                        });
                      }
                    }}
                    placeholder="Enter role description"
                    rows={2}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Permissions grid */}
          {selectedRole || isCreatingRole || editingRole ? (
            <div className="p-4">
              <div className="bg-gray-50 p-2 rounded-md mb-4">
                <p className="text-sm text-gray-500">
                  <span className="flex items-center text-gray-800 font-medium mb-1">
                    <Info className="h-4 w-4 mr-1 text-blue-500" />
                    Permissions Matrix
                  </span>
                  Configure what actions are allowed for each resource. Changes
                  will only be saved when you click the Save button.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Resource
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        View
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Add
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Edit
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Delete
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Other
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {availableResources.map((resource) => (
                      <tr key={resource.name} className="hover:bg-gray-50">
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {resource.label}
                          </div>
                        </td>

                        {/* View permission */}
                        <td className="px-3 py-4 whitespace-nowrap">
                          {resource.actions.includes("view") && (
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                checked={isPermissionActive(
                                  resource.name,
                                  "view"
                                )}
                                onChange={(e) =>
                                  handlePermissionToggle(
                                    resource.name,
                                    "view",
                                    e.target.checked
                                  )
                                }
                                disabled={
                                  !(isCreatingRole || editingRole) ||
                                  (editingRole?.isSystem &&
                                    resource.name === "role")
                                }
                              />
                            </div>
                          )}
                        </td>

                        {/* Add permission */}
                        <td className="px-3 py-4 whitespace-nowrap">
                          {resource.actions.includes("add") && (
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                checked={isPermissionActive(
                                  resource.name,
                                  "add"
                                )}
                                onChange={(e) =>
                                  handlePermissionToggle(
                                    resource.name,
                                    "add",
                                    e.target.checked
                                  )
                                }
                                disabled={
                                  !(isCreatingRole || editingRole) ||
                                  (editingRole?.isSystem &&
                                    resource.name === "role")
                                }
                              />
                            </div>
                          )}
                        </td>

                        {/* Edit permission */}
                        <td className="px-3 py-4 whitespace-nowrap">
                          {resource.actions.includes("edit") && (
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                checked={isPermissionActive(
                                  resource.name,
                                  "edit"
                                )}
                                onChange={(e) =>
                                  handlePermissionToggle(
                                    resource.name,
                                    "edit",
                                    e.target.checked
                                  )
                                }
                                disabled={
                                  !(isCreatingRole || editingRole) ||
                                  (editingRole?.isSystem &&
                                    resource.name === "role")
                                }
                              />
                            </div>
                          )}
                        </td>

                        {/* Delete permission */}
                        <td className="px-3 py-4 whitespace-nowrap">
                          {resource.actions.includes("delete") && (
                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                checked={isPermissionActive(
                                  resource.name,
                                  "delete"
                                )}
                                onChange={(e) =>
                                  handlePermissionToggle(
                                    resource.name,
                                    "delete",
                                    e.target.checked
                                  )
                                }
                                disabled={
                                  !(isCreatingRole || editingRole) ||
                                  (editingRole?.isSystem &&
                                    resource.name === "role")
                                }
                              />
                            </div>
                          )}
                        </td>

                        {/* Other permissions */}
                        <td className="px-3 py-4 whitespace-nowrap">
                          {resource.actions
                            .filter(
                              (action) =>
                                !["view", "add", "edit", "delete"].includes(
                                  action
                                )
                            )
                            .map((action) => (
                              <div
                                key={action}
                                className="flex items-center mb-1 last:mb-0"
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                  checked={isPermissionActive(
                                    resource.name,
                                    action
                                  )}
                                  onChange={(e) =>
                                    handlePermissionToggle(
                                      resource.name,
                                      action,
                                      e.target.checked
                                    )
                                  }
                                  disabled={!(isCreatingRole || editingRole)}
                                />
                                <span className="ml-2 text-xs text-gray-600 capitalize">
                                  {action}
                                </span>
                              </div>
                            ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Note about system roles */}
              {editingRole?.isSystem && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-700 flex items-start">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0" />
                    Some permissions for system roles cannot be modified to
                    ensure system stability.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-6 text-center">
              <Shield className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                No role selected
              </h3>
              <p className="text-sm text-gray-500">
                {roles.length === 0
                  ? "No roles found in the system. Create a new role to get started."
                  : "Select a role from the list to view and manage its permissions."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RolePermissionsManager;
