import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Check if default data has been initialized already
let hasInitialized = false;

/**
 * Initialize default election data if needed.
 * This should be called after authentication is complete.
 */
export const initializeElectionData = async (authToken?: string) => {
  // Skip if already initialized or no auth token available
  if (hasInitialized || !authToken) {
    return;
  }

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  try {
    console.log("Initializing default election data...");

    // Include the auth token in the request headers
    const response = await axios.post(
      `${apiUrl}/api/elections/default`,
      {},
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    console.log("Default election data initialized:", response.data);
    hasInitialized = true;
  } catch (error: any) {
    // Don't treat this as a critical error - the app can still function
    console.log(
      "Failed to initialize election data:",
      error.response?.data || error.message
    );

    // For viewer roles, this is expected and not an error
    if (error.response?.status === 403) {
      console.log(
        "User does not have permission to initialize election data - this is normal for viewer roles"
      );
      // Still mark as initialized to avoid further attempts
      hasInitialized = true;
    }
  }
};

// Add a function to call from UserContext after successful login
export const initializeAfterLogin = (token: string, isAdmin = false) => {
  try {
    // Add small delay to ensure everything is ready
    setTimeout(() => {
      if (isAdmin) {
        console.log("Admin user detected, initializing with admin privileges");
      }

      initializeElectionData(token).catch((err) => {
        console.log(
          "Election initialization failed but continuing:",
          err.message
        );
      });
    }, 1000);
  } catch (error) {
    console.log("Error in initializeAfterLogin:", error);
    // Don't throw - we don't want this to break the login flow
  }
};

export const initializeDatabase = async (): Promise<void> => {
  console.log("Initializing database with default data...");

  try {
    // Create default admin user
    const adminResponse = await fetch(`${API_BASE_URL}/api/auth/seed-admin`, {
      method: "POST",
    });

    if (adminResponse.ok) {
      const adminData = await adminResponse.json();
      console.log("Admin user initialization result:", adminData);
    } else {
      console.warn(
        "Failed to initialize admin user:",
        await adminResponse.text()
      );
    }

    // Create default election
    const electionResponse = await fetch(
      `${API_BASE_URL}/api/elections/default`,
      {
        method: "POST",
      }
    );

    if (electionResponse.ok) {
      const electionData = await electionResponse.json();
      console.log("Election initialization result:", electionData);
    } else {
      console.warn(
        "Failed to initialize election data:",
        await electionResponse.text()
      );
    }

    // Create default roles
    const rolesResponse = await fetch(`${API_BASE_URL}/api/roles/seed`, {
      method: "POST",
    });

    if (rolesResponse.ok) {
      const rolesData = await rolesResponse.json();
      console.log("Roles initialization result:", rolesData);
    } else {
      console.warn("Failed to initialize roles:", await rolesResponse.text());
    }
  } catch (error) {
    console.error("Database initialization failed:", error);
  }
};
