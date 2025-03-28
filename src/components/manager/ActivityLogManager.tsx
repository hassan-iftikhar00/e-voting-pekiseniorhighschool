import React, { useState, useEffect } from "react";
import {
  Search,
  X,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  SlidersHorizontal,
  Clock,
  Calendar,
  User,
  Activity,
  Filter,
  Trash2,
  Info,
  ChevronDown,
} from "lucide-react";
import { useUser } from "../../context/UserContext";

// Define interfaces for our data
interface ActivityLog {
  _id: string;
  userId: string;
  user:
    | string
    | {
        _id: string;
        username: string;
        fullName?: string;
        role?:
          | string
          | {
              name: string;
            };
        isAdmin?: boolean;
      };
  action: string;
  entity: string;
  entityId: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

const ActivityLogManager: React.FC = () => {
  const { hasPermission } = useUser();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLog[]>([]);
  const [displayedLogs, setDisplayedLogs] = useState<ActivityLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const logsPerPage = 20; // Number of logs to load per batch

  // Filters
  const [filters, setFilters] = useState({
    user: "",
    action: "",
    entity: "",
    fromDate: "",
    toDate: "",
  });

  // Check user permissions once
  const canViewLogs = hasPermission("logs", "view");
  const canDeleteLogs = hasPermission("logs", "delete");

  // Fetch logs from the API with pagination
  const fetchLogs = async (reset = true) => {
    if (!canViewLogs) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get authentication token
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      // Add pagination parameters
      const pageToFetch = reset ? 1 : page;
      const limit = logsPerPage;
      const skip = reset ? 0 : (pageToFetch - 1) * logsPerPage;

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/logs?limit=${limit}&skip=${skip}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch logs: ${response.status}`);
      }

      const data = await response.json();

      // If we received fewer logs than requested, there are no more logs to load
      if (data.length < logsPerPage) {
        setHasMore(false);
      }

      if (reset) {
        setLogs(data);
        setFilteredLogs(data);
        setDisplayedLogs(data.slice(0, logsPerPage));
        setPage(1);
      } else {
        // Append new logs to existing logs
        setLogs((prevLogs) => [...prevLogs, ...data]);
        setFilteredLogs((prevFilteredLogs) => {
          // Apply current filters to the new logs
          const newFilteredLogs = applyFilters([...prevFilteredLogs, ...data]);
          return newFilteredLogs;
        });
        setPage((prevPage) => prevPage + 1);
      }
    } catch (error: any) {
      console.error("Error fetching activity logs:", error);
      setError(error.message || "Failed to load activity logs");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  // Function to handle loading more logs
  const handleLoadMore = async () => {
    if (isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);
    await fetchLogs(false);
  };

  // Helper function to apply filters to logs
  const applyFilters = (logsToFilter: ActivityLog[]) => {
    let filtered = [...logsToFilter];

    // Apply search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (log) =>
          (typeof log.user === "string" &&
            log.user.toLowerCase().includes(term)) ||
          (typeof log.user !== "string" &&
            ((log.user.username &&
              log.user.username.toLowerCase().includes(term)) ||
              (log.user.fullName &&
                log.user.fullName.toLowerCase().includes(term)))) ||
          log.action.toLowerCase().includes(term) ||
          log.entity.toLowerCase().includes(term) ||
          log.details.toLowerCase().includes(term)
      );
    }

    // Apply other filters (user, action, entity, date ranges)
    if (filters.user) {
      filtered = filtered.filter(
        (log) =>
          (typeof log.user === "string" && log.user === filters.user) ||
          (typeof log.user !== "string" &&
            (log.user.username === filters.user ||
              log.user.fullName === filters.user))
      );
    }

    if (filters.action) {
      filtered = filtered.filter((log) => log.action === filters.action);
    }

    if (filters.entity) {
      filtered = filtered.filter((log) => log.entity === filters.entity);
    }

    if (filters.fromDate) {
      const fromDate = new Date(filters.fromDate);
      filtered = filtered.filter((log) => new Date(log.timestamp) >= fromDate);
    }

    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      toDate.setHours(23, 59, 59); // End of the day
      filtered = filtered.filter((log) => new Date(log.timestamp) <= toDate);
    }

    return filtered;
  };

  // Load logs on component mount
  useEffect(() => {
    if (canViewLogs) {
      fetchLogs();
    }
  }, [canViewLogs]);

  // Update displayedLogs management to correctly handle pagination
  useEffect(() => {
    if (!logs.length) return;

    const filtered = applyFilters(logs);
    setFilteredLogs(filtered);

    // Always update displayed logs when filters change
    setDisplayedLogs(filtered.slice(0, page * logsPerPage));

    // Check if there are more logs to display
    setHasMore(filtered.length > page * logsPerPage);
  }, [logs, searchTerm, filters, page]);

  // Get unique values for filter selects
  const getUniqueUsers = () => {
    // Filter out null/undefined values first, then deduplicate
    const userNames = logs
      .map((log) =>
        typeof log.user === "string"
          ? log.user
          : log.user?.fullName || log.user?.username || null
      )
      .filter(Boolean); // Remove null/undefined values

    // Deduplicate
    return [...new Set(userNames)];
  };

  const getUniqueActions = () => {
    return [...new Set(logs.map((log) => log.action))];
  };

  const getUniqueEntities = () => {
    return [...new Set(logs.map((log) => log.entity))];
  };

  // Handle filter change
  const handleFilterChange = (name: string, value: string) => {
    setFilters({
      ...filters,
      [name]: value,
    });
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilters({
      user: "",
      action: "",
      entity: "",
      fromDate: "",
      toDate: "",
    });
    setSearchTerm("");
  };

  // Format timestamp to readable date/time
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return "Unknown date";

    try {
      return new Date(timestamp).toLocaleString();
    } catch (e) {
      console.error("Error formatting timestamp:", e);
      return "Invalid date";
    }
  };

  // Add a helper function to safely render user information
  const getUserDisplayName = (user: ActivityLog["user"]): string => {
    if (!user) return "Unknown";

    if (typeof user === "string") return user;

    return user.fullName || user.username || "Unknown user";
  };

  // Add a helper function to safely get role name
  const getUserRole = (user: ActivityLog["user"]): string => {
    if (!user) return "";

    if (typeof user === "string") return "";

    if (typeof user.role === "string") return user.role;

    return user.role?.name || "";
  };

  // Add a helper function to format the details field
  const formatDetails = (details: any, action: string): React.ReactNode => {
    // If details is a string, just return it
    if (typeof details === "string") {
      return details;
    }

    // If it's a login action, format it nicely
    if (action === "user:login" && details) {
      try {
        // Handle both string JSON and object format
        const loginInfo =
          typeof details === "string" ? JSON.parse(details) : details;
        return (
          <div>
            <p>
              <span className="font-medium">Username:</span>{" "}
              {loginInfo.username || "Unknown"}
            </p>
            <p>
              <span className="font-medium">Role:</span>{" "}
              {loginInfo.role || "None"}
            </p>
          </div>
        );
      } catch (e) {
        console.error("Error parsing login details:", e);
      }
    }

    // For other objects, stringify them properly
    try {
      return typeof details === "object"
        ? JSON.stringify(details, null, 2)
        : String(details);
    } catch (e) {
      return "Invalid details format";
    }
  };

  // Add a text-only version for printing and export
  const formatDetailsAsText = (details: any, action: string): string => {
    if (typeof details === "string") {
      return details;
    }

    if (action === "user:login" && details) {
      try {
        const loginInfo =
          typeof details === "string" ? JSON.parse(details) : details;
        return `Username: ${loginInfo.username || "Unknown"}, Role: ${
          loginInfo.role || "None"
        }`;
      } catch (e) {
        console.error("Error formatting login details:", e);
      }
    }

    return typeof details === "object"
      ? JSON.stringify(details)
      : String(details);
  };

  // Handle clear logs
  const handleClearLogs = async () => {
    if (!canDeleteLogs) return;

    if (
      !window.confirm(
        "Are you sure you want to clear all activity logs? This action cannot be undone."
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
        }/api/logs/clear`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to clear logs: ${response.status}`);
      }

      setLogs([]);
      setFilteredLogs([]);
      setDisplayedLogs([]);
      setNotification({
        type: "success",
        message: "All activity logs have been cleared successfully",
      });
    } catch (error: any) {
      console.error("Error clearing logs:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to clear activity logs",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Print logs
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
        .filter-info { text-align: center; margin-bottom: 20px; color: #6b7280; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background-color: #f3f4f6; color: #374151; font-weight: bold; text-align: left; padding: 10px; }
        td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #6b7280; }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Activity Logs - Peki Senior High School</title>
          ${styles}
        </head>
        <body>
          <h1>Peki Senior High School - Activity Logs</h1>
          
          <div class="filter-info">
            ${
              Object.entries(filters).some(([_, value]) => value)
                ? `<p>Filtered by: ${Object.entries(filters)
                    .filter(([_, value]) => value)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(" | ")}</p>`
                : ""
            }
            ${searchTerm ? `<p>Search term: "${searchTerm}"</p>` : ""}
            <p>Showing ${displayedLogs.length} of ${
      filteredLogs.length
    } logs</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
                <th>IP Address</th>
              </tr>
            </thead>
            <tbody>
              ${displayedLogs
                .map(
                  (log) => `
                <tr>
                  <td>${formatTimestamp(log.timestamp)}</td>
                  <td>${getUserDisplayName(log.user)} ${
                    getUserRole(log.user) ? `(${getUserRole(log.user)})` : ""
                  }</td>
                  <td>${log.action}</td>
                  <td>${log.entity}</td>
                  <td>${formatDetailsAsText(log.details, log.action)}</td>
                  <td>${log.ipAddress}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Printed on ${new Date().toLocaleString()}</p>
            <p>Peki Senior High School - Prefectorial Elections ${new Date().getFullYear()}</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  // Export logs to CSV
  const handleExport = () => {
    // Create CSV content
    let csvContent = "Time,User,Role,Action,Entity,Details,IP Address\n";

    displayedLogs.forEach((log) => {
      const user = getUserDisplayName(log.user);
      const role = getUserRole(log.user);

      // Format details as text and escape quotes
      const escapedDetails = formatDetailsAsText(
        log.details,
        log.action
      ).replace(/"/g, '""');

      csvContent += `"${formatTimestamp(log.timestamp)}","${user}","${role}","${
        log.action
      }","${log.entity}","${escapedDetails}","${log.ipAddress}"\n`;
    });

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `activity_logs_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If user doesn't have view permission
  if (!canViewLogs) {
    return (
      <div className="bg-yellow-50 p-6 rounded-lg text-center">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-yellow-800 mb-2">
          Access Restricted
        </h3>
        <p className="text-yellow-700">
          You don't have permission to view activity logs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-4 rounded-lg shadow-md">
        <div>
          <h2 className="text-xl font-bold">Activity Logs</h2>
          <p className="text-indigo-100 text-sm font-sans font-light">
            View and monitor system activity and user actions
          </p>
        </div>
        <div className="flex space-x-2">
          {canDeleteLogs && (
            <button
              onClick={handleClearLogs}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All Logs
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
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
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
            <p className="text-gray-500">Loading activity logs...</p>
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

      {/* Filters and Actions */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0">
          {/* Left side - Toggle filters button */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <SlidersHorizontal className="h-4 w-4 mr-1.5" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </button>

            <button
              onClick={handleClearFilters}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={!Object.values(filters).some(Boolean) && !searchTerm}
            >
              <Filter className="h-4 w-4 mr-1.5" />
              Clear Filters
            </button>
          </div>

          {/* Right side - Action buttons */}
          <div className="flex space-x-2 md:ml-auto">
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              title="Print logs"
            >
              <Printer className="h-4 w-4 mr-1.5" />
              Print
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              title="Export to CSV"
            >
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />
              Export
            </button>
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
              placeholder="Search logs by user, action, or details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={filters.user}
                onChange={(e) => handleFilterChange("user", e.target.value)}
              >
                <option key="all-users" value="">
                  All Users
                </option>
                {getUniqueUsers().map((user) => (
                  <option key={`user-${user}`} value={user || ""}>
                    {user}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={filters.action}
                onChange={(e) => handleFilterChange("action", e.target.value)}
              >
                <option key="all-actions" value="">
                  All Actions
                </option>
                {getUniqueActions().map((action) => (
                  <option key={`action-${action}`} value={action}>
                    {action}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Entity
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={filters.entity}
                onChange={(e) => handleFilterChange("entity", e.target.value)}
              >
                <option key="all-entities" value="">
                  All Entities
                </option>
                {getUniqueEntities().map((entity) => (
                  <option key={`entity-${entity}`} value={entity}>
                    {entity}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <input
                type="date"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={filters.fromDate}
                onChange={(e) => handleFilterChange("fromDate", e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <input
                type="date"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={filters.toDate}
                onChange={(e) => handleFilterChange("toDate", e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Active filters display */}
        {(Object.values(filters).some(Boolean) || searchTerm) && (
          <div className="mt-4 flex flex-wrap items-center text-sm text-gray-500">
            <span className="mr-2 flex items-center">
              <Filter className="h-4 w-4 mr-1 text-gray-400" />
              Active filters:
            </span>

            {searchTerm && (
              <span className="mr-2 bg-gray-100 px-2 py-1 rounded-md flex items-center">
                Search: {searchTerm}
                <button
                  className="ml-1 text-gray-400 hover:text-gray-600"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}

            {Object.entries(filters).map(([key, value]) => {
              if (!value) return null;
              return (
                <span
                  key={key}
                  className="mr-2 bg-gray-100 px-2 py-1 rounded-md flex items-center"
                >
                  {key}: {value}
                  <button
                    className="ml-1 text-gray-400 hover:text-gray-600"
                    onClick={() => handleFilterChange(key, "")}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Activity Log Table */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        {filteredLogs.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Time
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      User
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Action
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Entity
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Details
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      IP Address
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayedLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50">
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="flex items-center text-sm text-gray-900">
                          <Clock className="h-4 w-4 text-gray-500 mr-1" />
                          {formatTimestamp(log.timestamp)}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-500 mr-1" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {getUserDisplayName(log.user)}
                            </div>
                            {getUserRole(log.user) && (
                              <div className="text-xs text-gray-500">
                                {getUserRole(log.user)}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Activity className="h-4 w-4 text-gray-500 mr-1" />
                          <span className="text-sm text-gray-900">
                            {log.action}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {log.entity}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-sm text-gray-900 max-w-md break-words whitespace-pre-wrap">
                          {formatDetails(log.details, log.action)}
                        </div>
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        {log.ipAddress}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Load More Button - Make sure it's visible by ensuring the condition is correct */}
            {filteredLogs.length > displayedLogs.length && (
              <div className="flex justify-center p-4 border-t border-gray-200 bg-gray-50">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingMore || !hasMore}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {isLoadingMore ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Load More Logs
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="p-6 text-center">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <Activity className="h-full w-full" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No activity logs found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {logs.length > 0
                ? "Try adjusting your search or filters to see more results."
                : "There are no activity logs in the system yet."}
            </p>
          </div>
        )}

        {/* Status bar */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500 flex items-center justify-between">
          <div className="flex items-center">
            <Info className="h-4 w-4 mr-1.5 text-gray-400" />
            <span>
              Showing{" "}
              <span className="font-medium text-gray-900">
                {displayedLogs.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-900">
                {filteredLogs.length}
              </span>{" "}
              filtered logs
            </span>
          </div>
          {logs.length > 0 && (
            <div>
              <button
                onClick={handleClearFilters}
                className="text-indigo-600 hover:text-indigo-900 text-xs font-medium"
                disabled={!Object.values(filters).some(Boolean) && !searchTerm}
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityLogManager;
