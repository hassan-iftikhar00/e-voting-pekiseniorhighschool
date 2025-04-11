import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import axios from "axios";
import { initializeAfterLogin } from "../utils/dbInitializer";

// Define the Permission type
interface Permission {
  page: string;
  actions: string[];
}

interface Voter {
  id: string;
  name: string;
  voterId: string;
  hasVoted: boolean;
  votedAt?: Date;
}

// Update the User interface to include the 'name' property
interface User {
  _id: string;
  id?: string; // Add id property which is sometimes used instead of _id
  username: string;
  email?: string;
  role: string | { name: string; permissions: Permission[] };
  name?: string; // Add the name property as optional
  isAdmin?: boolean;
  permissions?: Permission[];
}

interface Role {
  id?: string;
  name: string;
  permissions?: Record<string, string[]>;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
  isAuthenticated: boolean;
  authToken: string | null;
  login: (
    username: string,
    password: string
  ) => Promise<{
    success: boolean;
    user?: any;
    message?: string;
  }>;
  logout: () => void;
  setUserData: (userData: User) => void;
  setAuthToken: (token: string | null) => void;
  refreshUserData: () => Promise<void>;
  checkAuth: () => boolean;
  getMockVoter: (voterId: string) => Voter | null;
  hasPermission: (page: string, action: string) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

// Mock voter data for testing
const mockVoters: Voter[] = [
  { id: "1", name: "John Doe", voterId: "V001", hasVoted: false },
  {
    id: "2",
    name: "Jane Smith",
    voterId: "V002",
    hasVoted: true,
    votedAt: new Date(),
  },
  // Add more mock voters as needed
];

const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const UserProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userData = localStorage.getItem("user");

    if (token && userData) {
      try {
        setAuthToken(token);
        setUser(JSON.parse(userData));
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Error parsing user data from localStorage:", error);
        localStorage.removeItem("authToken");
        localStorage.removeItem("user");
      }
    }
  }, []);

  // Fix the VotingAuth component issue by properly handling the conversion between _id and id
  const setUserData = (userData: User) => {
    // Ensure both _id and id are set for compatibility
    const normalizedUser = {
      ...userData,
      id: userData.id || userData._id, // Make sure id is set
    };

    setUser(normalizedUser);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
  };

  const checkAuth = () => {
    return !!authToken && !!user;
  };

  // Helper function to check if a user is admin based on role
  const isUserAdmin = (role: any): boolean => {
    if (!role) return false;

    if (typeof role === "string") {
      return role.toLowerCase() === "admin";
    }

    if (typeof role === "object" && role !== null) {
      return role.name?.toLowerCase() === "admin";
    }

    return false;
  };

  // Helper function to check if a user is viewer based on role
  const isUserViewer = (role: any): boolean => {
    if (!role) return false;

    if (typeof role === "string") {
      return role.toLowerCase() === "viewer";
    }

    if (typeof role === "object" && role !== null) {
      return role.name?.toLowerCase() === "viewer";
    }

    return false;
  };

  // Function to standardize role comparison
  const getUserRole = (roleData: any): string => {
    if (!roleData) return "";

    if (typeof roleData === "string") {
      return roleData.toLowerCase();
    }

    if (typeof roleData === "object" && roleData.name) {
      return roleData.name.toLowerCase();
    }

    return "";
  };

  // Add a more robust hasPermission function
  const hasPermission = (resource: string, action: string): boolean => {
    if (!user) return false;

    const role = getUserRole(user.role);

    // Admin has permission for everything
    if (role === "admin") {
      return true;
    }

    // Viewer has permission for view actions only
    if (role === "viewer" && action === "view") {
      return true;
    }

    // Check user permissions
    const userPermissions =
      user.permissions ||
      (typeof user.role === "object" ? user.role.permissions : []);

    if (!userPermissions) return false;

    const pagePermission = userPermissions.find((p) => p.page === resource);
    if (!pagePermission) return false;

    return pagePermission.actions.includes(action);
  };

  const refreshUserData = async () => {
    if (!authToken || !user) return;

    try {
      const response = await axios.get(`${apiUrl}/api/users/${user._id}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      setUserData(response.data);
    } catch (error) {
      console.error("Error refreshing user data:", error);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      setError("");

      // Get API base URL
      const API_BASE_URL =
        import.meta.env.VITE_API_URL || "http://localhost:5000";

      // First check if server is reachable
      try {
        console.log("[LOGIN] Testing server connection before login attempt");
        await fetch(`${API_BASE_URL}/api/server-info`, {
          method: "HEAD",
          signal: AbortSignal.timeout(3000), // Quick 3 second timeout
        });
      } catch (connErr) {
        console.warn("[LOGIN] Server connection test failed:", connErr);
        throw new Error(
          "Server connection failed. Please check your connection and try again."
        );
      }

      console.log(
        "[LOGIN] Server connection test passed, proceeding with login"
      );
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
        signal: AbortSignal.timeout(30000), // 15 second timeout
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // Save auth data
      localStorage.setItem("token", data.token);
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        setUser(data.user);
      }
      setIsAuthenticated(true);
      setLoading(false);

      // Return success to allow login component to navigate
      return { success: true, user: data.user };
    } catch (err: any) {
      console.error("Login error:", err);

      // Provide more descriptive error messages based on error type
      let errorMessage = "Failed to login. Please try again.";
      if (err.name === "TimeoutError" || err.name === "AbortError") {
        errorMessage =
          "Connection to server timed out. Please check your network connection and try again.";
      } else if (err.message.includes("Server connection failed")) {
        errorMessage = err.message;
      } else if (err.message.includes("Failed to fetch")) {
        errorMessage =
          "Cannot connect to the authentication server. Please check your connection.";
      }

      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    setAuthToken(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  const getMockVoter = (voterId: string): Voter | null => {
    return mockVoters.find((voter) => voter.voterId === voterId) || null;
  };

  const value = {
    user,
    setUser,
    loading,
    isAuthenticated,
    authToken,
    login,
    logout,
    setUserData,
    setAuthToken,
    refreshUserData,
    checkAuth,
    getMockVoter,
    hasPermission,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
