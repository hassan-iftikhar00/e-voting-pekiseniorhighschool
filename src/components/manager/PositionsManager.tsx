import React, { useState, useEffect, useRef } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Check,
  AlertCircle,
  Download,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Columns,
  Info,
  Briefcase,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { useUser } from "../../context/UserContext";
import axios from "axios";

// Update interface to match the backend model
interface Position {
  _id: string;
  title: string;
  description: string;
  priority: number;
  isActive: boolean;
  maxCandidates: number;
  maxSelections: number;
  order?: number;
}

const PositionsManager: React.FC = () => {
  const { hasPermission } = useUser();
  const [positions, setPositions] = useState<Position[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPosition, setEditingPosition] = useState<Position | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [sortField, setSortField] = useState<"priority" | "title" | "order">(
    "order"
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Visible columns state
  const [visibleColumns, setVisibleColumns] = useState({
    priority: true,
    title: true,
    description: true,
    status: true,
    maxCandidates: true,
    maxSelections: true,
    actions: true,
    order: true,
  });

  // Form state
  const [newPosition, setNewPosition] = useState({
    title: "",
    description: "",
    priority: 1,
    isActive: true,
    maxCandidates: 5,
    maxSelections: 1,
    order: 1,
  });

  // Check user permissions once instead of using PermissionGuard everywhere
  const canAddPosition = hasPermission("positions", "add");
  const canEditPosition = hasPermission("positions", "edit");
  const canDeletePosition = hasPermission("positions", "delete");

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

  // Fetch positions from the API
  const fetchPositions = async () => {
    try {
      setIsLoading(true);

      // Get authentication token
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      const response = await axios.get(`${apiUrl}/api/positions`, { headers });
      setPositions(response.data);
    } catch (error) {
      console.error("Error fetching positions:", error);
      setNotification({
        type: "error",
        message: "Failed to load positions",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchPositions();
  }, []);

  // Filter and sort positions
  const filteredPositions = positions
    .filter(
      (position) =>
        position.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (filterActive === null || position.isActive === filterActive)
    )
    .sort((a, b) => {
      if (sortField === "priority") {
        return sortDirection === "asc"
          ? a.priority - b.priority
          : b.priority - a.priority;
      } else if (sortField === "title") {
        return sortDirection === "asc"
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      } else if (sortField === "order") {
        return sortDirection === "asc"
          ? (a.order || 0) - (b.order || 0)
          : (b.order || 0) - (a.order || 0);
      }
      return 0;
    });

  const handleAddPosition = async () => {
    if (!newPosition.title) {
      setNotification({
        type: "error",
        message: "Position title is required",
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

      // Automatically set the order to the last position
      const maxOrder = Math.max(...positions.map((p) => p.order || 0), 0);
      const positionToAdd = {
        ...newPosition,
        order: maxOrder + 1, // Set order to the last position
      };

      const response = await axios.post(
        `${apiUrl}/api/positions`,
        positionToAdd,
        { headers }
      );

      setPositions([...positions, response.data]);

      setNewPosition({
        title: "",
        description: "",
        priority: Math.max(...positions.map((p) => p.priority), 0) + 1,
        isActive: true,
        maxCandidates: 5,
        maxSelections: 1,
        order: maxOrder + 2, // Prepare for the next addition
      });

      setShowAddForm(false);
      setNotification({
        type: "success",
        message: "Position added successfully",
      });
    } catch (error) {
      console.error("Error adding position:", error);
      setNotification({
        type: "error",
        message: "Failed to add position",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleUpdatePosition = async () => {
    if (!editingPosition) return;

    if (!editingPosition.title) {
      setNotification({
        type: "error",
        message: "Position title is required",
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

      const response = await axios.put(
        `${apiUrl}/api/positions/${editingPosition._id}`,
        editingPosition,
        { headers }
      );

      setPositions(
        positions.map((position) =>
          position._id === response.data._id ? response.data : position
        )
      );

      setEditingPosition(null);
      setNotification({
        type: "success",
        message: "Position updated successfully",
      });
    } catch (error) {
      console.error("Error updating position:", error);
      setNotification({
        type: "error",
        message: "Failed to update position",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleDeletePosition = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this position?")) {
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

      await axios.delete(`${apiUrl}/api/positions/${id}`, { headers });

      setPositions(positions.filter((position) => position._id !== id));
      setNotification({
        type: "success",
        message: "Position deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting position:", error);
      setNotification({
        type: "error",
        message: "Failed to delete position",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleSort = (field: "priority" | "title" | "order") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const handleMovePosition = async (id: string, direction: "up" | "down") => {
    // First check if the move is valid
    const posIndex = positions.findIndex((p) => p._id === id);
    if (
      (direction === "up" && posIndex === 0) ||
      (direction === "down" && posIndex === positions.length - 1)
    ) {
      return; // Cannot move first position up or last position down
    }

    try {
      setIsLoading(true);

      // Get authentication token
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      // Call the API endpoint to update position order
      const response = await axios.put(
        `${apiUrl}/api/positions/${id}/order`,
        { direction },
        { headers }
      );

      // Update positions with the new ordered list
      if (response.data) {
        setPositions(response.data);

        // Ensure we're sorting by order after a move operation
        setSortField("order");
        setSortDirection("asc");
      }

      setNotification({
        type: "success",
        message: `Position moved ${direction} successfully`,
      });
    } catch (error) {
      console.error(`Error moving position ${direction}:`, error);
      setNotification({
        type: "error",
        message: `Failed to move position ${direction}`,
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Handle print function
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
        .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #6b7280; }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Positions List</title>
          ${styles}
        </head>
        <body>
          <h1>Positions List</h1>
          
          <table>
            <thead>
              <tr>
                <th>S/N</th>
                <th>Title</th>
                <th>Description</th>
                <th>Max Candidates</th>
                <th>Max Selections</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${positions
                .map(
                  (position, index) => `
                <tr>
                  <td>${index + 1}</td>
                  <td>${position.title}</td>
                  <td>${position.description || "-"}</td>
                  <td>${position.maxCandidates}</td>
                  <td>${position.maxSelections}</td>
                  <td class="${
                    position.isActive ? "status-active" : "status-inactive"
                  }">
                    ${position.isActive ? "Active" : "Inactive"}
                  </td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Printed on ${new Date().toLocaleString()}</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Handle export to Excel (CSV)
  const handleExportExcel = () => {
    // Create CSV content
    let csvContent =
      "S/N,Title,Description,Max Candidates,Max Selections,Status\n";

    positions.forEach((position, index) => {
      csvContent += `${index + 1},"${position.title}","${
        position.description || ""
      }",${position.maxCandidates},${position.maxSelections},"${
        position.isActive ? "Active" : "Inactive"
      }"\n`;
    });

    // Create a blob and download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `positions_list_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-4 rounded-lg shadow-md">
        <div>
          <h2 className="text-xl font-bold">Position Management</h2>
          <p className="text-indigo-100 text-sm font-sans font-light">
            Manage election positions and roles
          </p>
        </div>
        <div className="flex space-x-2">
          {canAddPosition && (
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm rounded-md shadow-sm text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Position
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

      {/* Add/Edit Form */}
      {(showAddForm || editingPosition) && canAddPosition && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingPosition ? "Edit Position" : "Add New Position"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Position Title
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={
                  editingPosition ? editingPosition.title : newPosition.title
                }
                onChange={(e) => {
                  if (editingPosition) {
                    setEditingPosition({
                      ...editingPosition,
                      title: e.target.value,
                    });
                  } else {
                    setNewPosition({ ...newPosition, title: e.target.value });
                  }
                }}
                placeholder="Enter position title"
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
                  editingPosition
                    ? editingPosition.description
                    : newPosition.description
                }
                onChange={(e) => {
                  if (editingPosition) {
                    setEditingPosition({
                      ...editingPosition,
                      description: e.target.value,
                    });
                  } else {
                    setNewPosition({
                      ...newPosition,
                      description: e.target.value,
                    });
                  }
                }}
                placeholder="Enter position description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Priority
              </label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={
                  editingPosition
                    ? editingPosition.priority
                    : newPosition.priority
                }
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  if (editingPosition) {
                    setEditingPosition({
                      ...editingPosition,
                      priority: value,
                    });
                  } else {
                    setNewPosition({ ...newPosition, priority: value });
                  }
                }}
                min="1"
              />
              <p className="mt-1 text-xs text-gray-500">
                Positions are displayed in priority order (lower numbers first)
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={
                  editingPosition
                    ? editingPosition.isActive
                      ? "active"
                      : "inactive"
                    : newPosition.isActive
                    ? "active"
                    : "inactive"
                }
                onChange={(e) => {
                  const isActive = e.target.value === "active";
                  if (editingPosition) {
                    setEditingPosition({
                      ...editingPosition,
                      isActive,
                    });
                  } else {
                    setNewPosition({ ...newPosition, isActive });
                  }
                }}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Candidates
              </label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={
                  editingPosition
                    ? editingPosition.maxCandidates
                    : newPosition.maxCandidates
                }
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  if (editingPosition) {
                    setEditingPosition({
                      ...editingPosition,
                      maxCandidates: value,
                    });
                  } else {
                    setNewPosition({ ...newPosition, maxCandidates: value });
                  }
                }}
                min="1"
              />
              <p className="mt-1 text-xs text-gray-500">
                Maximum number of candidates that can run for this position
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Selections
              </label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={
                  editingPosition
                    ? editingPosition.maxSelections
                    : newPosition.maxSelections
                }
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  if (editingPosition) {
                    setEditingPosition({
                      ...editingPosition,
                      maxSelections: value,
                    });
                  } else {
                    setNewPosition({ ...newPosition, maxSelections: value });
                  }
                }}
                min="1"
              />
              <p className="mt-1 text-xs text-gray-500">
                Number of candidates a voter can select for this position
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order
              </label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={
                  editingPosition ? editingPosition.order : newPosition.order
                }
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  if (editingPosition) {
                    setEditingPosition({
                      ...editingPosition,
                      order: value,
                    });
                  } else {
                    setNewPosition({ ...newPosition, order: value });
                  }
                }}
                min="1"
              />
              <p className="mt-1 text-xs text-gray-500">
                Order determines the display sequence of positions
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingPosition(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              onClick={
                editingPosition ? handleUpdatePosition : handleAddPosition
              }
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {editingPosition ? "Update" : "Add"} Position
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
              All Positions
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
            {canAddPosition && (
              <>
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  title="Print positions list"
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
              </>
            )}
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
                          checked={visibleColumns.priority}
                          onChange={() =>
                            setVisibleColumns({
                              ...visibleColumns,
                              priority: !visibleColumns.priority,
                            })
                          }
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Priority
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={visibleColumns.title}
                          onChange={() =>
                            setVisibleColumns({
                              ...visibleColumns,
                              title: !visibleColumns.title,
                            })
                          }
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Title
                        </span>
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
                          checked={visibleColumns.order}
                          onChange={() =>
                            setVisibleColumns({
                              ...visibleColumns,
                              order: !visibleColumns.order,
                            })
                          }
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Order
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={visibleColumns.maxCandidates}
                          onChange={() =>
                            setVisibleColumns({
                              ...visibleColumns,
                              maxCandidates: !visibleColumns.maxCandidates,
                            })
                          }
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Max Candidates
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={visibleColumns.maxSelections}
                          onChange={() =>
                            setVisibleColumns({
                              ...visibleColumns,
                              maxSelections: !visibleColumns.maxSelections,
                            })
                          }
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          Max Selections
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
              placeholder="Search positions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Positions Table */}
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
                {visibleColumns.order && (
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer w-24"
                    onClick={() => handleSort("order")}
                  >
                    <div className="flex items-center">
                      Order
                      {sortField === "order" &&
                        (sortDirection === "asc" ? (
                          <ArrowUp className="h-4 w-4 ml-1 text-indigo-500" />
                        ) : (
                          <ArrowDown className="h-4 w-4 ml-1 text-indigo-500" />
                        ))}
                    </div>
                  </th>
                )}
                {visibleColumns.title && (
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => handleSort("title")}
                  >
                    <div className="flex items-center">
                      Title
                      {sortField === "title" &&
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
                {visibleColumns.maxCandidates && (
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Max Candidates
                  </th>
                )}
                {visibleColumns.maxSelections && (
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Max Selections
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
                {visibleColumns.actions &&
                  (canEditPosition || canDeletePosition) && (
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
              {filteredPositions.map((position, index) => (
                <tr
                  key={position._id}
                  className="hover:bg-indigo-50 transition-colors duration-150"
                >
                  <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                    {index + 1}
                  </td>
                  {visibleColumns.order && (
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {position.order}
                    </td>
                  )}
                  {visibleColumns.title && (
                    <td className="px-3 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Briefcase className="h-5 w-5 text-indigo-500 mr-2" />
                        <div className="text-sm font-medium text-gray-900">
                          {position.title}
                        </div>
                      </div>
                    </td>
                  )}
                  {visibleColumns.description && (
                    <td className="px-3 py-4">
                      <div className="text-sm text-gray-500 max-w-md">
                        {position.description || "-"}
                      </div>
                    </td>
                  )}
                  {visibleColumns.maxCandidates && (
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {position.maxCandidates}
                    </td>
                  )}
                  {visibleColumns.maxSelections && (
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {position.maxSelections}
                    </td>
                  )}
                  {visibleColumns.status && (
                    <td className="px-3 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          position.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {position.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  )}
                  {visibleColumns.actions &&
                    (canEditPosition || canDeletePosition) && (
                      <td className="px-3 py-4 whitespace-nowrap text-right text-sm">
                        <div className="flex justify-end space-x-2">
                          {canEditPosition && (
                            <>
                              <button
                                onClick={() =>
                                  handleMovePosition(position._id, "up")
                                }
                                disabled={index === 0}
                                className={`p-1.5 rounded-md ${
                                  index === 0
                                    ? "text-gray-300 cursor-not-allowed"
                                    : "text-indigo-600 hover:text-indigo-900 hover:bg-indigo-100"
                                } transition-colors duration-200`}
                                title="Move up"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() =>
                                  handleMovePosition(position._id, "down")
                                }
                                disabled={
                                  index === filteredPositions.length - 1
                                }
                                className={`p-1.5 rounded-md ${
                                  index === filteredPositions.length - 1
                                    ? "text-gray-300 cursor-not-allowed"
                                    : "text-indigo-600 hover:text-indigo-900 hover:bg-indigo-100"
                                } transition-colors duration-200`}
                                title="Move down"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setEditingPosition(position)}
                                className="p-1.5 rounded-md text-indigo-600 hover:text-indigo-900 hover:bg-indigo-100 transition-colors duration-200"
                                title="Edit position"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {canDeletePosition && (
                            <button
                              onClick={() => handleDeletePosition(position._id)}
                              className="p-1.5 rounded-md text-red-600 hover:text-red-900 hover:bg-red-100 transition-colors duration-200"
                              title="Delete position"
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

        {filteredPositions.length === 0 && (
          <div className="px-6 py-4 text-center text-gray-500">
            No positions found matching your search criteria.
          </div>
        )}

        {/* Status bar with table information */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500 flex items-center justify-between">
          <div className="flex items-center">
            <Info className="h-4 w-4 mr-1.5 text-gray-400" />
            <span>
              Showing{" "}
              <span className="font-medium text-gray-900">
                {filteredPositions.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-900">
                {positions.length}
              </span>{" "}
              positions
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

export default PositionsManager;
