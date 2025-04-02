import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Routes,
  Route,
  useNavigate,
  Link,
  useLocation,
  Navigate,
} from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  Briefcase,
  GraduationCap,
  Home,
  ClipboardList,
  School,
  Shield,
  Eye,
  BarChart2,
  Clock,
} from "lucide-react";
import { useUser } from "../context/UserContext";
import { useSettings } from "../context/SettingsContext";
import { useElection } from "../context/ElectionContext";
import Dashboard from "./manager/Dashboard";
import CandidatesManager from "./manager/CandidatesManager";
import VotersManager from "./manager/VotersManager";
import ElectionSettingsVoterPanel from "./ElectionSettingsVoterPanel";
import Results from "./manager/Results";
import DetailedVoteAnalysis from "./manager/DetailedVoteAnalysis";
import PositionsManager from "./manager/PositionsManager";
import YearManager from "./manager/YearManager";
import ClassManager from "./manager/ClassManager";
import HouseManager from "./manager/HouseManager";
import ActivityLogManager from "./manager/ActivityLogManager";
import RolePermissionsManager from "./manager/RolePermissionsManager";
import UserManager from "./manager/UserManager";
import AccessDenied from "./AccessDenied";

// Define the hasPermission function
const hasPermission = (page: string, action: string): boolean => {
  // Replace this logic with actual permission-checking logic
  // For now, allow all permissions
  return true;
};

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission: {
    page: string;
    action: "view" | "edit" | "add" | "delete";
  };
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
}) => {
  const { user, isAuthenticated, loading } = useUser();
  const location = useLocation();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const userRole =
    typeof user?.role === "string"
      ? user?.role.toLowerCase()
      : user?.role?.name?.toLowerCase() || "";

  if (userRole === "admin") {
    return <>{children}</>;
  }

  if (userRole === "viewer" && requiredPermission.action === "view") {
    return <>{children}</>;
  }

  if (hasPermission(requiredPermission.page, requiredPermission.action)) {
    return <>{children}</>;
  }

  return <AccessDenied />;
};

const ElectionManager: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isAuthenticated } = useUser();
  const { settings } = useSettings();
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [currentElection, setCurrentElection] = useState<{
    title: string;
    date: string;
    startDate?: string;
    endDate?: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
  } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [electionStatus, setElectionStatus] = useState<
    "not-started" | "active" | "ended"
  >("not-started");

  const fetchCurrentElection = async () => {
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/election/status`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch election status: ${response.status}`);
      }

      const data = await response.json();
      setCurrentElection(data);
    } catch (error) {
      console.error("Error fetching election data:", error);
    }
  };

  const formatElectionDate = (dateString?: string) => {
    if (!dateString) return "Unknown date";

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return dateString;
    }
  };

  const updateTimeRemaining = useCallback(() => {
    if (!currentElection) {
      setTimeRemaining("Loading...");
      return;
    }

    const now = new Date();
    let targetDate;

    try {
      if (currentElection.isActive) {
        // If election is active, calculate time until it ends
        const dateStr = currentElection.endDate || currentElection.date;
        const [year, month, day] = dateStr.split("-").map(Number);
        const [hours, minutes] = (currentElection.endTime || "17:00")
          .split(":")
          .map(Number);
        targetDate = new Date(year, month - 1, day, hours, minutes);

        if (targetDate <= now) {
          setTimeRemaining("Election has ended");
          setElectionStatus("ended");
          return;
        }
      } else {
        // If election is not active, calculate time until it starts
        const dateStr = currentElection.startDate || currentElection.date;
        const [year, month, day] = dateStr.split("-").map(Number);
        const [hours, minutes] = (currentElection.startTime || "08:00")
          .split(":")
          .map(Number);
        targetDate = new Date(year, month - 1, day, hours, minutes);

        if (targetDate <= now) {
          setTimeRemaining("Election start time has passed");
          return;
        }
      }

      // Calculate time difference in milliseconds
      const difference = targetDate.getTime() - now.getTime();

      if (difference <= 0) {
        if (currentElection.isActive) {
          setTimeRemaining("Election has ended");
          setElectionStatus("ended");
        } else {
          setTimeRemaining("Election start time has passed");
        }
        return;
      }

      // Convert milliseconds to days, hours, minutes, seconds
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      // Format time string
      let timeString = "";
      if (days > 0) timeString += `${days}d `;
      if (hours > 0) timeString += `${hours}h `;
      if (minutes > 0) timeString += `${minutes}m `;
      timeString += `${seconds}s`;

      setElectionStatus(currentElection.isActive ? "active" : "not-started");
      setTimeRemaining(timeString); // Make sure we're setting the time
    } catch (error) {
      console.error("Error calculating time remaining:", error);
      setTimeRemaining("Time calculation error");
    }
  }, [currentElection]);

  useEffect(() => {
    fetchCurrentElection();

    // Call immediately to avoid delay in displaying the time
    if (currentElection) {
      updateTimeRemaining();
    }

    const timer = setInterval(() => {
      updateTimeRemaining();
    }, 1000);

    return () => clearInterval(timer);
  }, [currentElection, updateTimeRemaining]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login");
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const isActive = (path: string) => {
    return location.pathname === `/election-manager${path}`
      ? "bg-indigo-800 text-white"
      : "text-indigo-100 hover:bg-indigo-700 hover:text-white";
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      <div
        className={`fixed inset-y-0 left-0 flex flex-col z-50 w-64 bg-indigo-900 transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto md:h-full ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between h-14 px-4 bg-indigo-950">
          <div className="flex items-center">
            <School className="h-7 w-7 text-white" />
            <span className="ml-2 text-lg font-semibold text-white">
              {settings.companyName}
            </span>
          </div>
          <button
            className="md:hidden text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="flex-1 flex flex-col overflow-y-auto">
          <nav className="flex-1 px-2 py-4 space-y-1">
            <Link
              to="/election-manager"
              className={`flex items-center px-2 py-2 text-sm rounded-md ${isActive(
                ""
              )}`}
            >
              <LayoutDashboard className="mr-3 h-5 w-5" />
              Dashboard
            </Link>
            <Link
              to="/election-manager/positions"
              className={`flex items-center px-2 py-2 text-sm rounded-md ${isActive(
                "/positions"
              )}`}
            >
              <Briefcase className="mr-3 h-5 w-5" />
              Positions
            </Link>
            <Link
              to="/election-manager/candidates"
              className={`flex items-center px-2 py-2 text-sm rounded-md ${isActive(
                "/candidates"
              )}`}
            >
              <Users className="mr-3 h-5 w-5" />
              Candidates
            </Link>
            <Link
              to="/election-manager/voters"
              className={`flex items-center px-2 py-2 text-sm rounded-md ${isActive(
                "/voters"
              )}`}
            >
              <Users className="mr-3 h-5 w-5" />
              Voters
            </Link>
            <Link
              to="/election-manager/year"
              className={`flex items-center px-2 py-2 text-sm rounded-md ${isActive(
                "/year"
              )}`}
            >
              <Calendar className="mr-3 h-5 w-5" />
              Year/Level
            </Link>
            <Link
              to="/election-manager/class"
              className={`flex items-center px-2 py-2 text-sm rounded-md ${isActive(
                "/class"
              )}`}
            >
              <GraduationCap className="mr-3 h-5 w-5" />
              Programme/Class
            </Link>
            <Link
              to="/election-manager/house"
              className={`flex items-center px-2 py-2 text-sm rounded-md ${isActive(
                "/house"
              )}`}
            >
              <Home className="mr-3 h-5 w-5" />
              Hall/House
            </Link>
            <Link
              to="/election-manager/results"
              className={`flex items-center px-2 py-2 text-sm rounded-md ${isActive(
                "/results"
              )}`}
            >
              <BarChart2 className="mr-3 h-5 w-5" />
              Results
            </Link>
            <Link
              to="/election-manager/dva"
              className={`flex items-center px-2 py-2 text-sm rounded-md ${isActive(
                "/dva"
              )}`}
            >
              <Eye className="mr-3 h-5 w-5" />
              DVA
            </Link>
            <Link
              to="/election-manager/log"
              className={`flex items-center px-2 py-2 text-sm rounded-md ${isActive(
                "/log"
              )}`}
            >
              <ClipboardList className="mr-3 h-5 w-5" />
              Log
            </Link>
            <Link
              to="/election-manager/roles"
              className={`flex items-center px-2 py-2 text-sm rounded-md ${isActive(
                "/roles"
              )}`}
            >
              <Shield className="mr-3 h-5 w-5" />
              Roles & Permissions
            </Link>
            <Link
              to="/election-manager/users"
              className={`flex items-center px-2 py-2 text-sm rounded-md ${isActive(
                "/users"
              )}`}
            >
              <UserIcon className="mr-3 h-5 w-5" />
              Users
            </Link>
            <Link
              to="/election-manager/settings"
              className={`flex items-center px-2 py-2 text-sm rounded-md ${isActive(
                "/settings"
              )}`}
            >
              <Settings className="mr-3 h-5 w-5" />
              Settings
            </Link>
          </nav>
        </div>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="bg-white shadow-sm z-10">
          <div className="px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
            <button
              className="md:hidden -ml-0.5 -mt-0.5 h-10 w-10 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none"
              onClick={() => setSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex-1 flex justify-between items-center">
              <div className="flex items-center">
                {settings.schoolLogo ? (
                  <img
                    src={settings.schoolLogo}
                    alt="School Logo"
                    className="h-8 w-8 object-contain"
                  />
                ) : (
                  <School className="h-8 w-8 text-indigo-600" />
                )}
                <h1 className="text-lg text-gray-900 ml-3">
                  {settings.schoolName}
                </h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 bg-indigo-50 px-3 py-1.5 rounded-lg text-sm">
                  <Calendar className="h-4 w-4 text-indigo-600" />
                  <span className="text-indigo-700 font-bold">
                    Election Date:{" "}
                    {currentElection
                      ? formatElectionDate(
                          currentElection.endDate || currentElection.date
                        )
                      : "Loading..."}
                  </span>
                </div>
                <div
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    currentElection?.isActive
                      ? "bg-green-500 text-white"
                      : "bg-yellow-300 text-black"
                  }`}
                >
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    {currentElection?.isActive ? (
                      <span>
                        Election in progress • Ends in: {timeRemaining}
                      </span>
                    ) : (
                      <span>Election starts in: {timeRemaining}</span>
                    )}
                  </div>
                </div>
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                  >
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md">
                      {user?.username?.charAt(0).toUpperCase() || ""}
                    </div>
                    <span className="text-sm text-gray-700 hidden md:block">
                      {user?.username || "Guest"}
                    </span>
                  </button>
                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">
                          {user?.username || "Guest"}
                        </p>
                        <p className="text-xs text-gray-500">Administrator</p>
                      </div>
                      <Link
                        to="/election-manager/settings"
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center"
                        onClick={() => setShowProfileMenu(false)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 relative overflow-y-auto focus:outline-none">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              <Routes>
                <Route
                  path="/"
                  element={
                    <ProtectedRoute
                      requiredPermission={{ page: "dashboard", action: "view" }}
                    >
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/positions"
                  element={
                    <ProtectedRoute
                      requiredPermission={{ page: "positions", action: "view" }}
                    >
                      <PositionsManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/candidates"
                  element={
                    <ProtectedRoute
                      requiredPermission={{
                        page: "candidates",
                        action: "view",
                      }}
                    >
                      <CandidatesManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/voters"
                  element={
                    <ProtectedRoute
                      requiredPermission={{ page: "voters", action: "view" }}
                    >
                      <VotersManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/year"
                  element={
                    <ProtectedRoute
                      requiredPermission={{ page: "year", action: "view" }}
                    >
                      <YearManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/class"
                  element={
                    <ProtectedRoute
                      requiredPermission={{ page: "class", action: "view" }}
                    >
                      <ClassManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/house"
                  element={
                    <ProtectedRoute
                      requiredPermission={{ page: "house", action: "view" }}
                    >
                      <HouseManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/results"
                  element={
                    <ProtectedRoute
                      requiredPermission={{ page: "results", action: "view" }}
                    >
                      <Results />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dva"
                  element={
                    <ProtectedRoute
                      requiredPermission={{ page: "dva", action: "view" }}
                    >
                      <DetailedVoteAnalysis />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/log"
                  element={
                    <ProtectedRoute
                      requiredPermission={{ page: "log", action: "view" }}
                    >
                      <ActivityLogManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/roles"
                  element={
                    <ProtectedRoute
                      requiredPermission={{ page: "roles", action: "view" }}
                    >
                      <RolePermissionsManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute
                      requiredPermission={{ page: "users", action: "view" }}
                    >
                      <UserManager />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute
                      requiredPermission={{ page: "settings", action: "view" }}
                    >
                      <ElectionSettingsVoterPanel />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="*"
                  element={<Navigate to="/election-manager" replace />}
                />
              </Routes>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default ElectionManager;
