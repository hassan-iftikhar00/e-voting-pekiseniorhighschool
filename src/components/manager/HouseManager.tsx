import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Columns,
  Info,
  ArrowUp,
  ArrowDown,
  Home,
} from "lucide-react";
import { useUser } from "../../context/UserContext"; // Replace PermissionGuard import

// House interface to match backend model
interface House {
  _id: string;
  name: string;
  description: string;
  color: string;
  active: boolean;
  createdAt?: string;
}

const colorOptions = [
  { name: "Red", value: "#ef4444" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Green", value: "#10b981" },
  { name: "Yellow", value: "#f59e0b" },
  { name: "Purple", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Orange", value: "#f97316" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Custom", value: "custom" },
];

const HouseManager: React.FC = () => {
  const { hasPermission } = useUser(); // Get permission check function
  const [houses, setHouses] = useState<House[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [sortField, setSortField] = useState<"name">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check user permissions once instead of using PermissionGuard everywhere
  const canAddHouse = hasPermission("house", "add");
  const canEditHouse = hasPermission("house", "edit");
  const canDeleteHouse = hasPermission("house", "delete");

  // Visible columns state
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    description: true,
    color: true,
    status: true,
    actions: true,
  });

  // Form state
  const [newHouse, setNewHouse] = useState({
    name: "",
    description: "",
    color: "#ef4444",
    active: true,
  });

  // Close column selector when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        columnSelectorRef.current &&
        !columnSelectorRef.current.contains(event.target as Node)
      ) {
        setShowColumnSelector(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch houses from the API
  const fetchHouses = async () => {
    try {
      setIsLoading(true);

      // Get authentication token
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/houses`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch houses: ${response.status}`);
      }

      const data = await response.json();
      setHouses(data);
    } catch (error) {
      console.error("Error fetching houses:", error);
      setNotification({
        type: "error",
        message: "Failed to load houses",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchHouses();
  }, []);

  // Filter and sort houses
  const filteredHouses = houses
    .filter(
      (house) =>
        house.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (filterActive === null || house.active === filterActive)
    )
    .sort((a, b) => {
      if (sortField === "name") {
        return sortDirection === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      }
      return 0;
    });

  const handleSort = (field: "name") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleAddHouse = async () => {
    if (!newHouse.name) {
      setNotification({
        type: "error",
        message: "House name is required",
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
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/houses`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(newHouse),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add house");
      }

      const addedHouse = await response.json();
      setHouses([...houses, addedHouse]);

      setNewHouse({
        name: "",
        description: "",
        color: "#ef4444",
        active: true,
      });

      setShowAddForm(false);
      setNotification({
        type: "success",
        message: "House added successfully",
      });
    } catch (error: any) {
      setNotification({
        type: "error",
        message: error.message || "Failed to add house",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleUpdateHouse = async () => {
    if (!editingHouse) return;

    if (!editingHouse.name) {
      setNotification({
        type: "error",
        message: "House name is required",
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
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/houses/${editingHouse._id}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(editingHouse),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update house");
      }

      const updatedHouse = await response.json();

      setHouses(
        houses.map((house) =>
          house._id === updatedHouse._id ? updatedHouse : house
        )
      );

      setEditingHouse(null);
      setNotification({
        type: "success",
        message: "House updated successfully",
      });
    } catch (error: any) {
      setNotification({
        type: "error",
        message: error.message || "Failed to update house",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleDeleteHouse = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this house?")) {
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
        }/api/houses/${id}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete house");
      }

      setHouses(houses.filter((house) => house._id !== id));
      setNotification({
        type: "success",
        message: "House deleted successfully",
      });
    } catch (error: any) {
      setNotification({
        type: "error",
        message: error.message || "Failed to delete house",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      setIsLoading(true);

      // Get authentication token
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      const house = houses.find((h) => h._id === id);
      if (!house) return;

      const updatedHouse = { ...house, active: !house.active };

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/houses/${id}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(updatedHouse),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update house status");
      }

      const result = await response.json();
      setHouses(houses.map((h) => (h._id === id ? result : h)));

      setNotification({
        type: "success",
        message: `House ${
          result.active ? "activated" : "deactivated"
        } successfully`,
      });
    } catch (error: any) {
      setNotification({
        type: "error",
        message: error.message || "Failed to update house status",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Get color name from value
  const getColorName = (colorValue: string) => {
    // Exact match with predefined colors
    const exactMatch = colorOptions.find((c) => c.value === colorValue);
    if (exactMatch && exactMatch.value !== "custom") {
      return exactMatch.name;
    }

    // If not an exact match, it's a custom color
    return "Custom";
  };

  // Handle print
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print");
      return;
    }

    const styles = `
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        h1 { text-align: center; color: #4338ca; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background-color: #f3f4f6; color: #374151; font-weight: bold; text-align: left; padding: 12px; }
        td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .status-active { color: #047857; font-weight: bold; }
        .status-inactive { color: #b91c1c; font-weight: bold; }
        .color-box { display: inline-block; width: 16px; height: 16px; border-radius: 4px; vertical-align: middle; margin-right: 6px; }
        .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #6b7280; }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Houses - Peki Senior High School</title>
          ${styles}
        </head>
        <body>
          <h1>Peki Senior High School - Houses</h1>
          
          <table>
            <thead>
              <tr>
                <th>S/N</th>
                ${visibleColumns.name ? "<th>House Name</th>" : ""}
                ${visibleColumns.description ? "<th>Description</th>" : ""}
                ${visibleColumns.color ? "<th>Color</th>" : ""}
                ${visibleColumns.status ? "<th>Status</th>" : ""}
              </tr>
            </thead>
            <tbody>
              ${filteredHouses
                .map(
                  (house, index) => `
                <tr>
                  <td>${index + 1}</td>
                  ${visibleColumns.name ? `<td>${house.name}</td>` : ""}
                  ${
                    visibleColumns.description
                      ? `<td>${house.description}</td>`
                      : ""
                  }
                  ${
                    visibleColumns.color
                      ? `<td><span class="color-box" style="background-color: ${
                          house.color
                        }"></span> ${getColorName(house.color)}</td>`
                      : ""
                  }
                  ${
                    visibleColumns.status
                      ? `<td class="${
                          house.active ? "status-active" : "status-inactive"
                        }">${house.active ? "Active" : "Inactive"}</td>`
                      : ""
                  }
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Printed on ${new Date().toLocaleString()}</p>
            <p>Peki Senior High School - Prefectorial Elections 2025</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    // Wait for content to load before printing
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Handle export to Excel
  const handleExportExcel = () => {
    // Create CSV content
    let csvContent = "S/N,House Name,Description,Color,Status\n";

    filteredHouses.forEach((house, index) => {
      csvContent += `${index + 1},"${house.name}","${
        house.description
      }","${getColorName(house.color)}","${
        house.active ? "Active" : "Inactive"
      }"\n`;
    });

    // Create a blob and download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `houses_list_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Title and Add Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-4 rounded-lg shadow-md">
        <div>
          <h2 className="text-xl font-bold">House Management</h2>
          <p className="text-indigo-100 text-sm font-sans font-light">
            Manage school houses for elections
          </p>
        </div>
        <div className="flex space-x-2">
          {canAddHouse && (
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingHouse(null);
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm rounded-md shadow-sm text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add House
            </button>
          )}
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

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center">
            <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mb-2" />
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      )}

      {/* Empty state for no houses */}
      {!isLoading && houses.length === 0 && (
        <div className="bg-white rounded-lg p-8 text-center">
          <Home className="h-12 w-12 text-indigo-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No houses found
          </h3>
          <p className="text-gray-500 mb-6">
            Get started by adding houses using the "Add House" button above
          </p>
        </div>
      )}

      {/* Add/Edit Form */}
      {(showAddForm || editingHouse) && (canAddHouse || canEditHouse) && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2 flex items-center">
            {editingHouse ? (
              <>
                <Edit className="h-5 w-5 text-indigo-500 mr-2" />
                Edit House
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 text-indigo-500 mr-2" />
                Add New House
              </>
            )}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                House Name
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={editingHouse ? editingHouse.name : newHouse.name}
                onChange={(e) => {
                  if (editingHouse) {
                    setEditingHouse({ ...editingHouse, name: e.target.value });
                  } else {
                    setNewHouse({ ...newHouse, name: e.target.value });
                  }
                }}
                placeholder="Enter house name (e.g., Red House)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={
                  editingHouse ? editingHouse.description : newHouse.description
                }
                onChange={(e) => {
                  if (editingHouse) {
                    setEditingHouse({
                      ...editingHouse,
                      description: e.target.value,
                    });
                  } else {
                    setNewHouse({ ...newHouse, description: e.target.value });
                  }
                }}
                placeholder="Enter description"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="flex items-center space-x-2">
                <select
                  className="p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={
                    colorOptions.some(
                      (c) =>
                        c.value ===
                        (editingHouse ? editingHouse.color : newHouse.color)
                    )
                      ? editingHouse
                        ? editingHouse.color
                        : newHouse.color
                      : "custom"
                  }
                  onChange={(e) => {
                    const value = e.target.value;
                    if (editingHouse) {
                      setEditingHouse({
                        ...editingHouse,
                        color: value,
                      });
                    } else {
                      setNewHouse({
                        ...newHouse,
                        color: value,
                      });
                    }
                  }}
                >
                  {colorOptions.map((color) => (
                    <option key={color.value} value={color.value}>
                      {color.name}
                    </option>
                  ))}
                </select>
                <input
                  type="color"
                  className="p-1 border border-gray-300 rounded-md h-10 w-12 cursor-pointer"
                  value={editingHouse ? editingHouse.color : newHouse.color}
                  onChange={(e) => {
                    if (editingHouse) {
                      setEditingHouse({
                        ...editingHouse,
                        color: e.target.value,
                      });
                    } else {
                      setNewHouse({
                        ...newHouse,
                        color: e.target.value,
                      });
                    }
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center h-10">
                <input
                  type="checkbox"
                  id="active-status"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  checked={editingHouse ? editingHouse.active : newHouse.active}
                  onChange={(e) => {
                    if (editingHouse) {
                      setEditingHouse({
                        ...editingHouse,
                        active: e.target.checked,
                      });
                    } else {
                      setNewHouse({ ...newHouse, active: e.target.checked });
                    }
                  }}
                />
                <label
                  htmlFor="active-status"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Active
                </label>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingHouse(null);
                setNewHouse({
                  name: "",
                  description: "",
                  color: "#ef4444",
                  active: true,
                });
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              onClick={editingHouse ? handleUpdateHouse : handleAddHouse}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {editingHouse ? "Update House" : "Add House"}
            </button>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
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
              All Houses
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

          {/* Right side - Action buttons */}
          <div className="flex space-x-2 md:ml-auto">
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              title="Print house list"
            >
              <Printer className="h-4 w-4 mr-1.5" />
              Print
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              title="Export to Excel"
            >
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />
              Export
            </button>
            <div className="relative" ref={columnSelectorRef}>
              <button
                onClick={() => setShowColumnSelector(!showColumnSelector)}
                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                title="Select columns"
              >
                <Columns className="h-4 w-4 mr-1.5" />
                Columns
              </button>

              {showColumnSelector && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                  <div className="p-2">
                    <div className="text-sm font-medium text-gray-700 mb-2 border-b pb-1">
                      Show/Hide Columns
                    </div>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={visibleColumns.name}
                          onChange={() =>
                            setVisibleColumns({
                              ...visibleColumns,
                              name: !visibleColumns.name,
                            })
                          }
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Name</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={visibleColumns.description}
                          onChange={() =>
                            setVisibleColumns({
                              ...visibleColumns,
                              description: !visibleColumns.description,
                            })
                          }
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Description
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={visibleColumns.color}
                          onChange={() =>
                            setVisibleColumns({
                              ...visibleColumns,
                              color: !visibleColumns.color,
                            })
                          }
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Color
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={visibleColumns.status}
                          onChange={() =>
                            setVisibleColumns({
                              ...visibleColumns,
                              status: !visibleColumns.status,
                            })
                          }
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Status
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={visibleColumns.actions}
                          onChange={() =>
                            setVisibleColumns({
                              ...visibleColumns,
                              actions: !visibleColumns.actions,
                            })
                          }
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Actions
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
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
              placeholder="Search houses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Houses Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"
                >
                  S/N
                </th>
                {visibleColumns.name && (
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("name")}
                  >
                    <div className="flex items-center">
                      House Name
                      {sortField === "name" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="h-4 w-4 ml-1 text-indigo-500" />
                        ) : (
                          <ArrowDown className="h-4 w-4 ml-1 text-indigo-500" />
                        ))}
                    </div>
                  </th>
                )}
                {visibleColumns.description && (
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Description
                  </th>
                )}
                {visibleColumns.color && (
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Color
                  </th>
                )}
                {visibleColumns.status && (
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Status
                  </th>
                )}
                {visibleColumns.actions && (canEditHouse || canDeleteHouse) && (
                  <th
                    scope="col"
                    className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {filteredHouses.map((house, index) => (
                <tr
                  key={house._id}
                  className="hover:bg-indigo-50 transition-colors duration-150"
                >
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                    {index + 1}
                  </td>
                  {visibleColumns.name && (
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="h-5 w-5 rounded-full mr-2"
                          style={{ backgroundColor: house.color }}
                        ></div>
                        <div className="text-sm font-medium text-gray-900">
                          {house.name}
                        </div>
                      </div>
                    </td>
                  )}
                  {visibleColumns.description && (
                    <td className="px-3 py-4">
                      <div className="text-sm text-gray-500">
                        {house.description}
                      </div>
                    </td>
                  )}
                  {visibleColumns.color && (
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div
                          className="h-4 w-4 rounded mr-2 border border-gray-300"
                          style={{ backgroundColor: house.color }}
                        ></div>
                        <span className="text-sm text-gray-500">
                          {getColorName(house.color)}
                        </span>
                      </div>
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          house.active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {house.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                  )}
                  {visibleColumns.actions &&
                    (canEditHouse || canDeleteHouse) && (
                      <td className="px-3 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex justify-end space-x-2">
                          {canEditHouse && (
                            <>
                              <button
                                onClick={() => handleToggleActive(house._id)}
                                className={`p-1.5 rounded-md ${
                                  house.active
                                    ? "text-red-600 hover:text-red-900 hover:bg-red-100"
                                    : "text-green-600 hover:text-green-900 hover:bg-green-100"
                                } transition-colors duration-200`}
                                title={house.active ? "Deactivate" : "Activate"}
                              >
                                {house.active ? (
                                  <X className="h-4 w-4" />
                                ) : (
                                  <Check className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() => setEditingHouse(house)}
                                className="p-1.5 rounded-md text-indigo-600 hover:text-indigo-900 hover:bg-indigo-100 transition-colors duration-200"
                                title="Edit house"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {canDeleteHouse && (
                            <button
                              onClick={() => handleDeleteHouse(house._id)}
                              className="p-1.5 rounded-md text-red-600 hover:text-red-900 hover:bg-red-100 transition-colors duration-200"
                              title="Delete house"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredHouses.length === 0 && (
          <div className="px-6 py-4 text-center text-gray-500">
            No houses found matching your search criteria.
          </div>
        )}

        {/* Status bar with table information */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500 flex items-center justify-between">
          <div className="flex items-center">
            <Info className="h-4 w-4 mr-1.5 text-gray-400" />
            <span>
              Showing{" "}
              <span className="font-medium text-gray-900">
                {filteredHouses.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-900">{houses.length}</span>{" "}
              houses
              {filterActive !== null && (
                <span>
                  {" "}
                  • {filterActive ? "Active" : "Inactive"} filter applied
                </span>
              )}
              {searchTerm && <span> • Search: "{searchTerm}"</span>}
            </span>
          </div>
          <div>
            <button
              onClick={() => {
                setSearchTerm("");
                setFilterActive(null);
              }}
              className="text-indigo-600 hover:text-indigo-900 text-xs font-medium"
            >
              Clear all filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HouseManager;
