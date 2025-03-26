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
} from "lucide-react";
import { useSettings } from "../../context/SettingsContext";
import PermissionGuard from "../PermissionGuard";
import axios from "axios";
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

  // Check user permissions once
  const canViewSettings = hasPermission("settings", "view");
  const canEditSettings = hasPermission("settings", "edit");

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

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/settings`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status}`);
      }

      const data = await response.json();
      setSettings(data);
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

  // Load data on component mount
  useEffect(() => {
    if (canViewSettings) {
      fetchSettings();
      fetchVoterStats();
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

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/settings`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(settings),
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
        } successfully`,
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

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";

    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-4 rounded-lg shadow-md">
        <div>
          <h2 className="text-xl font-bold">Election Settings</h2>
          <p className="text-indigo-100 text-sm font-sans font-light">
            Configure and manage election parameters
          </p>
        </div>
        {canEditSettings && (
          <div className="flex space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm rounded-md shadow-sm text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Settings
              </button>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel
                </button>
                <button
                  onClick={updateSettings}
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm rounded-md shadow-sm text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </button>
              </>
            )}
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
              <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
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
            <XCircle className="h-5 w-5" />
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

      {/* Election Status and Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Election Status Card */}
        <div className="md:col-span-1 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2 flex items-center">
            <Settings className="h-5 w-5 text-indigo-500 mr-2" />
            Election Status
          </h3>

          <div
            className={`mt-2 ${
              settings.isActive ? "text-green-600" : "text-red-600"
            } text-center p-3 rounded-lg ${
              settings.isActive ? "bg-green-50" : "bg-red-50"
            }`}
          >
            {settings.isActive ? (
              <div className="flex items-center justify-center">
                <ToggleRight className="h-6 w-6 mr-2" />
                <span className="text-lg font-semibold">Active</span>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <ToggleLeft className="h-6 w-6 mr-2" />
                <span className="text-lg font-semibold">Inactive</span>
              </div>
            )}
          </div>

          {canEditSettings && (
            <button
              onClick={toggleElectionStatus}
              disabled={isLoading}
              className={`mt-4 w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                settings.isActive
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-green-600 hover:bg-green-700"
              } focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                settings.isActive
                  ? "focus:ring-red-500"
                  : "focus:ring-green-500"
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
        </div>

        {/* Quick Stats Cards */}
        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                <Users className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Total Voters
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {voterStats.totalVoters}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-600">
                <Vote className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Votes Cast</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {voterStats.votedVoters}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">
                  Voter Turnout
                </p>
                <p className="text-2xl font-semibold text-gray-900">
                  {voterStats.votingPercentage.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2">
            Election Configuration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Voting Period Settings */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 text-indigo-500 mr-2" />
                Voting Period
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    name="votingStartDate"
                    className={`w-full p-2 border border-gray-300 rounded-md ${
                      !isEditing ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                    }`}
                    value={settings.votingStartDate}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    name="votingStartTime"
                    className={`w-full p-2 border border-gray-300 rounded-md ${
                      !isEditing ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                    }`}
                    value={settings.votingStartTime}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    name="votingEndDate"
                    className={`w-full p-2 border border-gray-300 rounded-md ${
                      !isEditing ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                    }`}
                    value={settings.votingEndDate}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    name="votingEndTime"
                    className={`w-full p-2 border border-gray-300 rounded-md ${
                      !isEditing ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                    }`}
                    value={settings.votingEndTime}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            {/* System Settings */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                <Settings className="h-5 w-5 text-indigo-500 mr-2" />
                System Settings
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    System Name
                  </label>
                  <input
                    type="text"
                    name="systemName"
                    className={`w-full p-2 border border-gray-300 rounded-md ${
                      !isEditing ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                    }`}
                    value={settings.systemName}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                    placeholder="e.g., Peki Senior High School Elections"
                  />
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
                    className={`w-full p-2 border border-gray-300 rounded-md ${
                      !isEditing ? "bg-gray-100 cursor-not-allowed" : "bg-white"
                    }`}
                    value={settings.maxVotesPerVoter}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Maximum number of votes a voter can cast per position
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="resultsPublished"
                    name="resultsPublished"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={settings.resultsPublished}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                  <label
                    htmlFor="resultsPublished"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Publish results to voters
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="allowVoterRegistration"
                    name="allowVoterRegistration"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={settings.allowVoterRegistration}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                  <label
                    htmlFor="allowVoterRegistration"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Allow voter self-registration
                  </label>
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="requireEmailVerification"
                    name="requireEmailVerification"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={settings.requireEmailVerification}
                    onChange={handleInputChange}
                    disabled={!isEditing}
                  />
                  <label
                    htmlFor="requireEmailVerification"
                    className="ml-2 block text-sm text-gray-900"
                  >
                    Require email verification for voters
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Information box */}
        <div className="bg-blue-50 p-4 m-6 rounded-md">
          <div className="flex">
            <Info className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800 mb-1">
                Important Information
              </h4>
              <p className="text-sm text-blue-700">
                When the election is active, voters will be able to cast their
                votes. Make sure all candidates and positions are set up
                correctly before activating the election.
              </p>
              {settings.isActive && (
                <p className="text-sm text-blue-700 mt-2">
                  Election is currently active. Voting period:{" "}
                  {formatDate(settings.votingStartDate)}{" "}
                  {settings.votingStartTime} to{" "}
                  {formatDate(settings.votingEndDate)} {settings.votingEndTime}.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ElectionSettingsManager;
