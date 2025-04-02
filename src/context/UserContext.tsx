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

  // Fix login function to properly handle admin role
  const login = async (username: string, password: string) => {
    setLoading(true);
    try {
      console.log("Attempting login for:", username);
      const response = await axios.post(`${apiUrl}/api/auth/login`, {
        username,
        password,
      });

      const { token, user: userData } = response.data;

      // Normalize user data to include both _id and id
      const normalizedUser = {
        ...userData,
        id: userData.id || userData._id, // Make sure id is set
        isAdmin: isUserAdmin(userData.role),
      };

      // Store token and user in localStorage
      localStorage.setItem("authToken", token);
      localStorage.setItem("user", JSON.stringify(normalizedUser));

      // Store token correctly (ensure it's stored with Bearer prefix)
      localStorage.setItem("token", token);
      setAuthToken(token);

      setAuthToken(token);
      setUser(normalizedUser);
      setIsAuthenticated(true);

      // Check if this is an admin user
      const isAdmin = normalizedUser.isAdmin;

      // Call initializer with the token
      initializeAfterLogin(token, isAdmin);

      // Log login action
      (async () => {
        try {
          await axios.post(
            `${apiUrl}/api/logs`,
            {
              action: "user:login",
              details: {
                username: normalizedUser.username,
                userId: normalizedUser._id,
                role:
                  typeof normalizedUser.role === "object"
                    ? normalizedUser.role?.name
                    : normalizedUser.role,
                isAdmin,
              },
              resourceType: "user",
              resourceId: normalizedUser._id,
            },
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
        } catch (logError) {
          console.log(
            "Could not create login log, continuing anyway:",
            logError
          );
        }
      })();

      return { success: true, user: normalizedUser };
    } catch (error) {
      console.log("Login error:", error);

      // Clear any partial authentication data
      localStorage.removeItem("authToken");
      localStorage.removeItem("user");
      setAuthToken(null);
      setUser(null);
      setIsAuthenticated(false);

      let errorMessage = "An error occurred during login.";
      if (axios.isAxiosError(error) && error.response) {
        // Get the error message from the response if possible
        if (error.response.data && error.response.data.message) {
          errorMessage = error.response.data.message;
        } else {
          errorMessage = `Server error: ${error.response.status}`;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
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
