import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";

interface Settings {
  companyName: string;
  schoolName: string;
  companyLogo: string;
  schoolLogo: string;
  electionTitle: string;
  electionDate: string;
  electionStartTime: string;
  electionEndTime: string;
  autoBackupEnabled: boolean;
  autoBackupInterval: string;
  systemTimeZone: string;
  [key: string]: any; // Allow for dynamic properties
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  loading: boolean;
  error: string | null;
  refreshSettings: () => Promise<void>; // Make this return a Promise for better control
  lastFetchTime: number | null;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

const initialSettings: Settings = {
  companyName: "",
  schoolName: "",
  companyLogo: "",
  schoolLogo: "",
  electionTitle: "Student Council Election",
  electionDate: "2025-05-15",
  electionStartTime: "08:00",
  electionEndTime: "17:00",
  autoBackupEnabled: true,
  autoBackupInterval: "24",
  systemTimeZone: "Africa/Accra",
};

// Replace API_BASE_URL with this (to support proxy)
const getApiUrl = () => {
  // Use relative URL to leverage proxy in development
  const useProxy = true; // Set to true to use Vite proxy
  if (useProxy) {
    return "";
  }
  return import.meta.env.VITE_API_URL || "http://localhost:5000";
};

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);

  // Increase cache duration to reduce API calls
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

  // Use a ref to track ongoing fetch to prevent duplicate requests
  const fetchingRef = useRef<boolean>(false);
  // Add a timeout ref to prevent rapid successive calls
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Semaphore to track fetch attempts during throttling
  const pendingFetchRef = useRef<boolean>(false);

  // Load settings from localStorage (faster than sessionStorage) first for instant loading
  useEffect(() => {
    const storedSettings = localStorage.getItem("appSettings");
    const storedTimestamp = localStorage.getItem("settingsTimestamp");

    if (storedSettings && storedTimestamp) {
      try {
        const timestamp = parseInt(storedTimestamp, 10);
        const parsedSettings = JSON.parse(storedSettings);

        // Always use stored settings immediately for a better UX
        setSettings(parsedSettings);
        setLastFetchTime(timestamp);

        // Check if we need to refresh in the background
        const now = Date.now();
        if (now - timestamp > CACHE_DURATION) {
          // Schedule a background refresh with slight delay to avoid blocking render
          setTimeout(() => fetchSettings(), 200);
        }
      } catch (err) {
        console.error("Error parsing stored settings:", err);
        fetchSettings();
      }
    } else {
      // No cached settings, fetch from API
      fetchSettings();
    }
  }, []);

  // Fetch settings from API with optimized fetching and error handling
  const fetchSettings = async (): Promise<void> => {
    // Prevent duplicate fetches that happen simultaneously
    if (fetchingRef.current) {
      console.log("Settings fetch already in progress, skipping");
      pendingFetchRef.current = true;
      return;
    }

    // Apply throttling to prevent rapid successive calls
    if (fetchTimeoutRef.current) {
      console.log("Settings fetch throttled, will retry shortly");
      pendingFetchRef.current = true;
      return;
    }

    // Set the fetching flag to prevent duplicates
    fetchingRef.current = true;
    pendingFetchRef.current = false;

    try {
      // Check if we have fresh cached data and can skip the fetch
      const now = Date.now();
      if (
        lastFetchTime &&
        now - lastFetchTime < CACHE_DURATION &&
        !pendingFetchRef.current
      ) {
        console.log(
          "Using cached settings data, last fetch at",
          new Date(lastFetchTime).toLocaleTimeString()
        );
        fetchingRef.current = false;
        return;
      }

      setLoading(true);

      // Use relative URL to leverage proxy
      const fetchUrl = `/api/settings?_=${now}`;

      // Add performance metrics
      console.log(
        `[PERF] Settings fetch starting at ${new Date().toLocaleTimeString()}`
      );
      const fetchStartTime = performance.now();

      try {
        // First make a quick HEAD request to check server connectivity
        console.log(`[PERF] Testing server connection with HEAD request`);
        const connectTest = await fetch(`/api/server-info`, {
          method: "HEAD",
          signal: AbortSignal.timeout(3000), // Quick 3 second timeout for connectivity test
        });

        console.log(
          `[PERF] Server connection test: ${
            connectTest.ok ? "OK" : "Failed"
          } - ${Math.round(performance.now() - fetchStartTime)}ms`
        );
      } catch (connErr) {
        console.warn(`[PERF] Server connection test failed: ${connErr}`);
        // Continue with main request even if connection test fails
      }

      console.log(`[PERF] Fetching settings from ${fetchUrl}`);

      // Increase timeout value from 15s to 30s for better reliability
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.warn(`[PERF] Settings fetch timeout after 30s`);
        controller.abort();
      }, 30000); // 30 second timeout

      const response = await fetch(fetchUrl, {
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
          Expires: "0",
        },
        signal: controller.signal,
      });

      // Clear the manual timeout
      clearTimeout(timeoutId);

      const fetchEndTime = performance.now();
      console.log(
        `[PERF] Settings fetch completed in ${Math.round(
          fetchEndTime - fetchStartTime
        )}ms`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch settings: ${response.status}`);
      }

      const parseStartTime = performance.now();
      const data = await response.json();
      console.log(
        `[PERF] Settings JSON parsing took ${Math.round(
          performance.now() - parseStartTime
        )}ms`
      );

      // Map data from server to our settings format, ensuring all required fields exist
      const processedSettings = {
        ...initialSettings,
        ...data,
        // Map server fields to our expected format if needed
        electionDate:
          data.votingEndDate ||
          data.electionDate ||
          initialSettings.electionDate,
        electionStartTime:
          data.votingStartTime ||
          data.electionStartTime ||
          initialSettings.electionStartTime,
        electionEndTime:
          data.votingEndTime ||
          data.electionEndTime ||
          initialSettings.electionEndTime,
      };

      // Update state
      setSettings(processedSettings);
      setLastFetchTime(now);
      setError(null);

      // Store in local storage for faster future loading
      localStorage.setItem("appSettings", JSON.stringify(processedSettings));
      localStorage.setItem("settingsTimestamp", now.toString());

      console.log(
        `[PERF] Settings fetch and processing total time: ${Math.round(
          performance.now() - fetchStartTime
        )}ms`
      );
      console.log("Settings fetched successfully:", processedSettings);
    } catch (err: any) {
      console.error("Error fetching settings:", err);

      if (err.name === "TimeoutError" || err.name === "AbortError") {
        console.warn(
          `[PERF] Settings request timed out or was aborted. Network conditions may be poor.`
        );
        // Attempt to fetch a simplified version of settings with lower timeout
        try {
          console.log(`[PERF] Attempting fallback request with basic settings`);
          const basicResponse = await fetch(`/api/server-info`, {
            signal: AbortSignal.timeout(5000), // 5 second timeout for basic info
          });
          console.log(
            `[PERF] Fallback request status: ${basicResponse.status}`
          );
        } catch (fallbackErr) {
          console.error(`[PERF] Fallback request also failed:`, fallbackErr);
        }
      }

      setError(err.message || "Failed to load settings");

      // If we have no settings at all, try to use localStorage one more time
      if (!lastFetchTime) {
        const storedSettings = localStorage.getItem("appSettings");
        if (storedSettings) {
          try {
            console.log(
              `[PERF] Using localStorage fallback due to fetch error`
            );
            setSettings(JSON.parse(storedSettings));
          } catch (e) {
            // If parsing fails, at least we have initial settings
          }
        }
      }
    } finally {
      setLoading(false);
      fetchingRef.current = false;

      // Set a throttle timeout to prevent rapid successive calls
      fetchTimeoutRef.current = setTimeout(() => {
        fetchTimeoutRef.current = null;
        // If there was a pending fetch request while we were throttled, do it now
        if (pendingFetchRef.current) {
          fetchSettings();
        }
      }, 2000); // 2 second throttle
    }
  };

  // Force refresh function that returns a Promise
  const refreshSettings = async (): Promise<void> => {
    // Clear local cache
    localStorage.removeItem("appSettings");
    localStorage.removeItem("settingsTimestamp");
    setLastFetchTime(null);

    // Return the fetch promise so caller can await if needed
    return fetchSettings();
  };

  const updateSettings = (updates: Partial<Settings>): void => {
    const updatedSettings = { ...settings, ...updates };
    setSettings(updatedSettings);

    // Update local storage with the new settings
    localStorage.setItem("appSettings", JSON.stringify(updatedSettings));
    localStorage.setItem("settingsTimestamp", Date.now().toString());
  };

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        loading,
        error,
        refreshSettings,
        lastFetchTime,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
