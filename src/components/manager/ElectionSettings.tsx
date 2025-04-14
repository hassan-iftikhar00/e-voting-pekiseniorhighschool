import React, { useState, useEffect, useRef } from "react";
import {
  Save,
  AlertCircle,
  Check,
  Calendar,
  Users,
  Clock,
  Info,
  Settings,
  Mail,
  BarChart,
  Bell,
  Globe,
  ToggleRight,
  ToggleLeft,
  XCircle,
  School,
  Database,
  CheckCircle,
  Upload,
  Download,
  RefreshCw,
  Image as ImageIcon,
  Building,
  Cog,
  HardDrive,
  Vote,
  Play,
  RotateCw,
  Trash2,
  Settings as SettingsIcon,
  X,
  Edit,
  Plus,
  Loader, // Add this import for the loading spinner
} from "lucide-react";
import { useSettings } from "../../context/SettingsContext";
import { useUser } from "../../context/UserContext";

interface ElectionSettings {
  isActive: boolean;
  votingStartDate: string;
  votingEndDate: string;
  votingStartTime: string;
  votingEndTime: string;
  resultsPublished: boolean;
  allowVoterRegistration: boolean;
  requireEmailVerification: boolean;
  maxVotesPerVoter: number;
  systemName: string;
  systemLogo?: string;
  electionTitle?: string;
  schoolName?: string;
  companyLogo?: string;
  schoolLogo?: string;
}

const ElectionSettingsManager: React.FC = () => {
  const { hasPermission } = useUser();
  const [settings, setSettings] = useState<ElectionSettings>({
    isActive: false,
    votingStartDate: "",
    votingEndDate: "",
    votingStartTime: "08:00",
    votingEndTime: "16:00",
    resultsPublished: false,
    allowVoterRegistration: false,
    requireEmailVerification: true,
    maxVotesPerVoter: 1,
    systemName: "Peki Senior High School Elections",
    systemLogo: "",
    electionTitle: "Student Council Election 2025",
    schoolName: "Peki Senior High School",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [voterStats, setVoterStats] = useState({
    totalVoters: 0,
    activeVoters: 0,
    votedVoters: 0,
    votingPercentage: 0,
  });
  const [activeTab, setActiveTab] = useState<
    "organization" | "backup" | "election"
  >("organization");
  const [elections, setElections] = useState<any[]>([]);

  // Check user permissions once
  const canViewSettings = hasPermission("settings", "view");
  const canEditSettings = hasPermission("settings", "edit");

  // Add a helper function for date format conversions
  const convertDateFormat = (dateStr: string) => {
    if (!dateStr) return "";

    // Check if date is in MM/DD/YYYY format
    if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      if (parts.length === 3) {
        // Convert to YYYY-MM-DD for input[type="date"]
        return `${parts[2]}-${parts[0].padStart(2, "0")}-${parts[1].padStart(
          2,
          "0"
        )}`;
      }
    }
    // If already in YYYY-MM-DD format, return as is
    return dateStr;
  };

  // Add a function to format time for display in 12-hour format with AM/PM
  const formatTimeForDisplay = (timeString: string) => {
    if (!timeString) return "";

    try {
      // Create a date object with the time
      const [hours, minutes] = timeString.split(":").map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0);

      // Format to 12-hour clock with AM/PM
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch (e) {
      console.error("Error formatting time:", e);
      return timeString;
    }
  };

  // Fetch election settings
  const fetchSettings = async () => {
    if (!canViewSettings) return;
    try {
      setIsLoading(true);
      setError(null);

      // Get authentication token
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      // Add a cache-busting parameter to avoid browser caching
      const timestamp = new Date().getTime();
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/settings?t=${timestamp}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status}`);
      }

      const data = await response.json();

      // Store dates in YYYY-MM-DD format for HTML input elements
      // Don't convert format here - just use the format received from server
      setSettings({
        isActive: data.isActive || false,
        votingStartDate: data.votingStartDate || "",
        votingEndDate: data.votingEndDate || "",
        votingStartTime: data.votingStartTime?.substring(0, 5) || "08:00",
        votingEndTime: data.votingEndTime?.substring(0, 5) || "16:00",
        resultsPublished: data.resultsPublished || false,
        allowVoterRegistration: data.allowVoterRegistration || false,
        requireEmailVerification: data.requireEmailVerification !== false, // true by default
        maxVotesPerVoter: data.maxVotesPerVoter || 1,
        systemName: data.systemName || "Peki Senior High School Elections",
        systemLogo: data.systemLogo || "",
        electionTitle: data.electionTitle || "Student Council Election 2025",
        schoolName: data.schoolName || "Peki Senior High School",
      });
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      setError(error.message || "Failed to load election settings");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch voter statistics
  const fetchVoterStats = async () => {
    if (!canViewSettings) return;
    try {
      // Get authentication token
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/voters/stats`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch voter stats: ${response.status}`);
      }

      const data = await response.json();
      setVoterStats(data);
    } catch (error: any) {
      console.error("Error fetching voter stats:", error);
    }
  };

  // Fetch elections
  const fetchElections = async () => {
    if (!canViewSettings) return;
    try {
      // Get authentication token
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/elections`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch elections: ${response.status}`);
      }

      const data = await response.json();
      setElections(data);
    } catch (error: any) {
      console.error("Error fetching elections:", error);
      setError(error.message || "Failed to load elections");
    }
  };

  // Load data on component mount
  useEffect(() => {
    if (canViewSettings) {
      fetchSettings();
      fetchVoterStats();
      fetchElections();
    }
  }, [canViewSettings]);

  // Update election settings
  const updateSettings = async () => {
    if (!canEditSettings) return;

    try {
      setIsLoading(true);

      // Get authentication token
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      // Ensure times include seconds for consistency
      const settingsForApi = {
        ...settings,
        // Ensure times include seconds for consistency
        votingStartTime: settings.votingStartTime.includes(":")
          ? settings.votingStartTime.length === 5
            ? settings.votingStartTime + ":00"
            : settings.votingStartTime
          : settings.votingStartTime + ":00",
        votingEndTime: settings.votingEndTime.includes(":")
          ? settings.votingEndTime.length === 5
            ? settings.votingEndTime + ":00"
            : settings.votingEndTime
          : settings.votingEndTime + ":00",
        companyName: settings.systemName, // Map systemName to companyName
        schoolName: settings.schoolName, // Send schoolName separately
        companyLogo: settings.companyLogo, // Send companyLogo separately
        schoolLogo: settings.schoolLogo, // Send schoolLogo separately
      };

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/settings`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(settingsForApi),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update settings");
      }

      setNotification({
        type: "success",
        message: "Election settings updated successfully",
      });

      // After successful update, refresh the data
      fetchSettings();

      setIsEditing(false);
    } catch (error: any) {
      console.error("Error updating settings:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to update election settings",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Handle form input changes
  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setSettings({
        ...settings,
        [name]: checked,
      });
    } else if (type === "number") {
      setSettings({
        ...settings,
        [name]: parseInt(value, 10),
      });
    } else {
      setSettings({
        ...settings,
        [name]: value,
      });
    }
  };

  // Toggle election status
  const toggleElectionStatus = async () => {
    if (!canEditSettings) return;

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
        }/api/election/toggle`,
        {
          method: "POST",
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to toggle election status"
        );
      }

      const data = await response.json();
      setSettings({
        ...settings,
        isActive: data.isActive,
      });

      setNotification({
        type: "success",
        message: `Election ${
          data.isActive ? "activated" : "deactivated"
        } successfully!`,
      });
    } catch (error: any) {
      console.error("Error toggling election status:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to toggle election status",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";

    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Handle file upload
  const handleFileUpload = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "company" | "school"
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const logoString = reader.result as string;
        if (type === "company") {
          setSettings({ ...settings, companyLogo: logoString });
        } else if (type === "school") {
          setSettings({ ...settings, schoolLogo: logoString });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Tab definitions with their properties for navigation - exactly matching original
  const tabs = [
    {
      id: "organization",
      name: "Organization",
      icon: Building,
      description: "Company and school settings",
      gradient: "from-blue-500/20 to-indigo-500/20",
      activeGradient: "from-blue-500 to-indigo-600",
    },
    {
      id: "backup",
      name: "Backup & Restore",
      icon: HardDrive,
      description: "Data backup and recovery",
      gradient: "from-amber-500/20 to-yellow-500/20",
      activeGradient: "from-amber-500 to-yellow-600",
    },
    {
      id: "election",
      name: "Election",
      icon: Vote,
      description: "Election parameters",
      gradient: "from-purple-500/20 to-pink-500/20",
      activeGradient: "from-purple-500 to-pink-600",
    },
  ] as const;

  // Various handler functions for different actions
  const handleSave = () => {
    updateSettings();
  };

  const handleSetElectionDate = () => {
    setNotification({
      type: "success",
      message: "Election date set successfully",
    });

    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const handleBackup = () => {
    setNotification({
      type: "success",
      message: "Manual backup completed successfully",
    });

    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const handleRestore = () => {
    setNotification({
      type: "success",
      message: "System restored successfully",
    });

    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const handleSetCurrentElection = async (electionId: string) => {
    if (!canEditSettings) return;

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
        }/api/elections/${electionId}/set-current`,
        {
          method: "POST",
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to set current election");
      }

      const data = await response.json();
      fetchElections();
      fetchSettings();

      setNotification({
        type: "success",
        message: "Election set as current successfully",
      });
    } catch (error: any) {
      console.error("Error setting current election:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to set current election",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleDeleteElection = async (electionId: string) => {
    if (!canEditSettings) return;

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
        }/api/elections/${electionId}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete election");
      }

      fetchElections();

      setNotification({
        type: "success",
        message: "Election deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting election:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to delete election",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleCreateNewElection = async () => {
    if (!canEditSettings) return;

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
        }/api/elections`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            title: "New Election " + new Date().getFullYear(),
            date: new Date().toISOString().split("T")[0],
            startTime: "08:00:00",
            endTime: "16:00:00",
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create election");
      }

      setNotification({
        type: "success",
        message: "New election created successfully",
      });

      // Refresh the list of elections
      fetchElections();
    } catch (error: any) {
      console.error("Error creating election:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to create election",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // If user doesn't have view permission
  if (!canViewSettings) {
    return (
      <div className="bg-yellow-50 p-6 rounded-lg text-center">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-yellow-800 mb-2">
          Access Restricted
        </h3>
        <p className="text-yellow-700">
          You don't have permission to view election settings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-4 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-bold">Settings</h2>
            <p className="text-indigo-100 text-sm font-sans font-light">
              Configure system and election parameters
            </p>
          </div>

          {canEditSettings && (
            <div className="mt-4 md:mt-0">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm rounded-md shadow-sm text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Settings
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                    disabled={isLoading}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    {isLoading ? (
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {isLoading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}
            </div>
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
          }`}
        >
          <div className="flex">
            {notification.type === "success" ? (
              <Check className="h-5 w-5 text-green-400" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-400" />
            )}
            <div className="ml-3">
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
          </div>
        </div>
      )}

      {/* Settings Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`group relative overflow-hidden py-2 px-3 rounded-xl transition-all duration-300 ${
              activeTab === tab.id
                ? `bg-gradient-to-r ${tab.activeGradient} shadow-lg scale-[1.02]`
                : `bg-gradient-to-r ${tab.gradient} hover:scale-[1.02]`
            }`}
          >
            <div
              className={`absolute inset-0 bg-gradient-to-r ${
                tab.gradient
              } group-hover:opacity-100 transition-opacity duration-300 ${
                activeTab === tab.id ? "opacity-0" : "opacity-100"
              }`}
            />
            <div className="relative flex items-center space-x-3">
              <div
                className={`flex-shrink-0 p-2 rounded-lg transition-colors duration-300 ${
                  activeTab === tab.id
                    ? "bg-white/20"
                    : "bg-white group-hover:bg-white/80"
                }`}
              >
                <tab.icon
                  className={`h-5 w-5 transition-colors duration-300 ${
                    activeTab === tab.id
                      ? "text-white"
                      : "text-gray-700 group-hover:text-gray-900"
                  }`}
                />
              </div>
              <div className="text-left min-w-0">
                <h3
                  className={`text-sm font-medium truncate transition-colors duration-300 ${
                    activeTab === tab.id
                      ? "text-white"
                      : "text-gray-900 group-hover:text-gray-900"
                  }`}
                >
                  {tab.name}
                </h3>
                <p
                  className={`text-xs truncate transition-colors duration-300 ${
                    activeTab === tab.id
                      ? "text-white/80"
                      : "text-gray-500 group-hover:text-gray-700"
                  }`}
                >
                  {tab.description}
                </p>
              </div>
            </div>
            <div
              className={`absolute bottom-0 left-0 h-0.5 bg-white/30 transition-all duration-300 ${
                activeTab === tab.id ? "w-full" : "w-0 group-hover:w-full"
              }`}
            />
          </button>
        ))}
      </div>

      {/* Settings Content */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Organization Settings */}
        {activeTab === "organization" && (
          <div className="p-6 space-y-6">
            {/* Prominent Edit Settings Banner */}
            {!isEditing && (
              <div className="p-6 bg-yellow-100 border-2 border-yellow-400 rounded-md mb-6">
                <div className="flex items-center">
                  <AlertCircle className="h-6 w-6 text-yellow-600 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-lg font-semibold text-yellow-800">
                      To make changes to the settings, click the "Edit Settings"
                      button located in the top right corner.
                    </p>
                    <p className="text-sm text-yellow-700">
                      Ensure you save your changes after editing to apply them
                      successfully.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="border-b pb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <School className="h-5 w-5 text-indigo-500 mr-2" />
                Organization Details
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={settings.systemName}
                  onChange={(e) =>
                    setSettings({ ...settings, systemName: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  School Name
                </label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={settings.schoolName}
                  onChange={(e) =>
                    setSettings({ ...settings, schoolName: e.target.value })
                  }
                  disabled={!isEditing}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Logo
                </label>
                <div className="flex items-center space-x-4">
                  <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                    {settings.systemLogo ? (
                      <img
                        src={settings.systemLogo}
                        alt="Company Logo"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                  <div className="flex flex-col space-y-2">
                    <label className="relative cursor-pointer">
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "company")}
                        disabled={!isEditing}
                      />
                      <div className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        Browse...
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  School Logo
                </label>
                <div className="flex items-center space-x-4">
                  <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                    {settings.schoolLogo ? (
                      <img
                        src={settings.schoolLogo}
                        alt="School Logo"
                        className="max-w-full max-h-full object-contain"
                      />
                    ) : (
                      <ImageIcon className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                  <div className="flex flex-col space-y-2">
                    <label className="relative cursor-pointer">
                      <input
                        type="file"
                        className="sr-only"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, "school")}
                        disabled={!isEditing}
                      />
                      <div className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                        Browse...
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Backup & Restore Settings */}
        {activeTab === "backup" && (
          <div className="p-6 space-y-6">
            {/* Prominent Edit Settings Banner */}
            {!isEditing && (
              <div className="p-6 bg-yellow-100 border-2 border-yellow-400 rounded-md mb-6">
                <div className="flex items-center">
                  <AlertCircle className="h-6 w-6 text-yellow-600 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-lg font-semibold text-yellow-800">
                      To make changes to the settings, click the "Edit Settings"
                      button located in the top right corner.
                    </p>
                    <p className="text-sm text-yellow-700">
                      Ensure you save your changes after editing to apply them
                      successfully.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="border-b pb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Database className="h-5 w-5 text-indigo-500 mr-2" />
                Backup & Data Management
              </h3>
            </div>

            <div className="bg-blue-50 p-4 rounded-md">
              <div className="flex">
                <Info className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800 mb-1">
                    Data Management Information
                  </h4>
                  <p className="text-sm text-blue-700">
                    Regularly backup your election data to prevent data loss.
                    You can also restore from previous backups if needed.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Download className="h-4 w-4 text-indigo-500 mr-2" />
                  Backup Data
                </h4>
                <p className="text-sm text-gray-500 mb-4">
                  Create a backup of all election data including users, voters,
                  candidates, and votes.
                </p>
                <button
                  onClick={handleBackup}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  disabled={!canEditSettings}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Backup Now
                </button>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                  <Upload className="h-4 w-4 text-indigo-500 mr-2" />
                  Restore From Backup
                </h4>
                <p className="text-sm text-gray-500 mb-4">
                  Restore system data from a previous backup file. This will
                  replace current data.
                </p>
                <label className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 text-sm rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  Select Backup File
                  <input
                    type="file"
                    className="hidden"
                    accept=".json"
                    disabled={!canEditSettings}
                  />
                </label>
              </div>
            </div>

            <div className="border-t pt-4 mt-2">
              <h4 className="font-medium text-gray-700 mb-3">
                Auto-Backup Settings
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoBackup"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={true}
                    disabled={!isEditing}
                  />
                  <label
                    htmlFor="autoBackup"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Enable automatic backups
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Backup Interval (hours)
                  </label>
                  <select
                    className={`w-full p-2 border border-gray-300 rounded-md ${
                      !isEditing ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                    }`}
                    disabled={!isEditing}
                    defaultValue="24"
                  >
                    <option value="12">Every 12 hours</option>
                    <option value="24">Every 24 hours</option>
                    <option value="48">Every 48 hours</option>
                    <option value="72">Every 72 hours</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Election Settings */}
        {activeTab === "election" && (
          <div className="p-6 space-y-6">
            {/* Prominent Edit Settings Banner */}
            {!isEditing && (
              <div className="p-6 bg-yellow-100 border-2 border-yellow-400 rounded-md mb-6">
                <div className="flex items-center">
                  <AlertCircle className="h-6 w-6 text-yellow-600 mr-3 flex-shrink-0" />
                  <div>
                    <p className="text-lg font-semibold text-yellow-800">
                      To make changes to the settings, click the "Edit Settings"
                      button located in the top right corner.
                    </p>
                    <p className="text-sm text-yellow-700">
                      Ensure you save your changes after editing to apply them
                      successfully.
                    </p>
                  </div>
                </div>
              </div>
            )}
            <div className="border-b pb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Vote className="h-5 w-5 text-indigo-500 mr-2" />
                Election Parameters
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Election Title
                </label>
                <input
                  type="text"
                  name="electionTitle"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={
                    settings.electionTitle || "Student Council Election 2025"
                  }
                  onChange={(e) =>
                    setSettings({ ...settings, electionTitle: e.target.value })
                  }
                  disabled={!isEditing}
                  placeholder="e.g., Student Council Election 2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Election Start Date
                </label>
                <input
                  type="date"
                  name="votingStartDate"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={settings.votingStartDate}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
                {settings.votingStartDate && (
                  <p className="mt-1 text-xs text-gray-500">
                    {formatDate(settings.votingStartDate)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Election End Date
                </label>
                <input
                  type="date"
                  name="votingEndDate"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={settings.votingEndDate}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
                {settings.votingEndDate && (
                  <p className="mt-1 text-xs text-gray-500">
                    {formatDate(settings.votingEndDate)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  name="votingStartTime"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={settings.votingStartTime}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
                {settings.votingStartTime && (
                  <p className="mt-1 text-xs text-gray-500">
                    {formatTimeForDisplay(settings.votingStartTime)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  name="votingEndTime"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={settings.votingEndTime}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
                {settings.votingEndTime && (
                  <p className="mt-1 text-xs text-gray-500">
                    {formatTimeForDisplay(settings.votingEndTime)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Votes Per Voter
                </label>
                <input
                  type="number"
                  name="maxVotesPerVoter"
                  min="1"
                  max="100"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={settings.maxVotesPerVoter}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
                <p className="mt-1 text-xs text-gray-500">
                  Maximum number of votes a voter can cast per position
                </p>
              </div>
            </div>

            <div
              className={`p-4 rounded-lg ${
                settings.isActive ? "bg-green-50" : "bg-red-50"
              }`}
            >
              <div className="flex items-center">
                {settings.isActive ? (
                  <>
                    <ToggleRight className="h-6 w-6 text-green-500 mr-2" />
                    <div>
                      <p className="font-medium text-green-800">
                        Election is Active
                      </p>
                      <p className="text-sm text-green-700">
                        Voters can currently cast votes
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <ToggleLeft className="h-6 w-6 text-red-500 mr-2" />
                    <div>
                      <p className="font-medium text-red-800">
                        Election is Inactive
                      </p>
                      <p className="text-sm text-red-700">
                        Voting is currently disabled
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <h4 className="font-medium text-gray-700 mb-3">
                Election Actions
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {canEditSettings && (
                  <button
                    onClick={toggleElectionStatus}
                    disabled={isLoading}
                    className={`inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                      settings.isActive
                        ? "bg-red-600 hover:bg-red-700"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                  >
                    {settings.isActive ? (
                      <>
                        <XCircle className="h-4 w-4 mr-2" />
                        Deactivate Election
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Activate Election
                      </>
                    )}
                  </button>
                )}

                {isEditing && canEditSettings && (
                  <button
                    onClick={handleSave}
                    disabled={isLoading}
                    className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    {isLoading ? (
                      <Loader className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {isLoading ? "Saving..." : "Save Changes"}
                  </button>
                )}
              </div>
            </div>

            <div className="mt-8 border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 flex items-center mb-4">
                <Calendar className="h-5 w-5 text-indigo-500 mr-2" />
                Current and Previous Elections
              </h3>
              <div className="overflow-hidden border border-gray-200 rounded-lg shadow">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Election Title
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Date
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Time
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Progress
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {elections.length > 0 ? (
                      elections.map((election) => (
                        <tr
                          key={election._id}
                          className={election.isCurrent ? "bg-blue-50" : ""}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="text-sm font-medium text-gray-900">
                                {election.title}
                                {election.isCurrent && (
                                  <span className="ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                                    Current
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {formatDate(election.date)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">
                              {election.startTime.substring(0, 5)} -{" "}
                              {election.endTime.substring(0, 5)}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                election.isActive
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {election.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {election.votedCount} / {election.totalVoters}{" "}
                              voted
                            </div>
                            <div className="w-24 bg-gray-200 rounded-full h-2.5 mt-1">
                              <div
                                className="bg-indigo-600 h-2.5 rounded-full"
                                style={{
                                  width: `${
                                    election.totalVoters > 0
                                      ? Math.round(
                                          (election.votedCount /
                                            election.totalVoters) *
                                            100
                                        )
                                      : 0
                                  }%`,
                                }}
                              ></div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            {canEditSettings && (
                              <div className="flex justify-end space-x-2">
                                {!election.isCurrent && (
                                  <button
                                    onClick={() =>
                                      handleSetCurrentElection(election._id)
                                    }
                                    className="text-indigo-600 hover:text-indigo-900"
                                    title="Set as current election"
                                  >
                                    <Check className="h-5 w-5" />
                                  </button>
                                )}
                                <button
                                  onClick={() =>
                                    handleDeleteElection(election._id)
                                  }
                                  className="text-red-600 hover:text-red-900"
                                  title="Delete election"
                                  disabled={election.isCurrent}
                                >
                                  <Trash2
                                    className={`h-5 w-5 ${
                                      election.isCurrent
                                        ? "opacity-50 cursor-not-allowed"
                                        : ""
                                    }`}
                                  />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-4 text-center text-sm text-gray-500"
                        >
                          No elections found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {canEditSettings && (
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={handleCreateNewElection}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create New Election
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ElectionSettingsManager;
