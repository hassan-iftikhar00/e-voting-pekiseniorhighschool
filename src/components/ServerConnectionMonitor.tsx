import React, { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, Server, WifiOff, Settings, Database } from "lucide-react";

interface ServerConnectionMonitorProps {
  children: React.ReactNode;
}

const ServerConnectionMonitor: React.FC<ServerConnectionMonitorProps> = ({
  children,
}) => {
  const [serverStatus, setServerStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("connecting");
  const [retryCount, setRetryCount] = useState(0);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [serverDetails, setServerDetails] = useState<{
    url?: string;
    responseTime?: number;
    lastSuccessful?: Date | null;
  }>({});

  // Use refs for logging control and interval management
  const shouldLog = useRef<boolean>(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckTimeRef = useRef<number>(0);
  const consecutiveFailsRef = useRef<number>(0);

  // Track if a reconnection is pending
  const reconnectionAttemptRef = useRef<boolean>(false);

  // Store last known good connection time to prevent flapping
  const lastGoodConnectionRef = useRef<number>(0);

  // Connection check throttling (5 minutes when connected)
  const CONNECTED_CHECK_INTERVAL = 300000; // 5 minutes
  const QUICK_RETRY_INTERVAL = 10000; // 10 seconds for first few retries
  const DISCONNECT_THRESHOLD = 5; // Consider disconnected after 5 consecutive fails
  const STABLE_CONNECTION_TIME = 30000; // 30 seconds of stability to reset counters
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Get exponential backoff delay based on retry count, but with more reasonable limits
  const getBackoffDelay = useCallback(() => {
    if (retryCount < 3) return QUICK_RETRY_INTERVAL;

    const baseDelay = 5000;
    const maxDelay = 60000; // Cap at 1 minute
    const calculatedDelay = baseDelay * Math.pow(1.5, Math.min(retryCount, 8));
    return Math.min(calculatedDelay, maxDelay);
  }, [retryCount]);

  // Check if we should fall back to local data
  const shouldUseFallback = useCallback(() => {
    const now = Date.now();
    // Use fallback if:
    // 1. We have a good connection recently (within 10 minutes) but are currently failing
    // 2. We've had excessive retries (more than 20)
    return (
      (lastGoodConnectionRef.current > 0 &&
        now - lastGoodConnectionRef.current < 600000 &&
        consecutiveFailsRef.current > DISCONNECT_THRESHOLD) ||
      retryCount > 20
    );
  }, [retryCount]);

  // Try alternate endpoints if primary fails
  const tryAlternateEndpoints = useCallback(async () => {
    try {
      // Try the health endpoint first
      const healthResponse = await fetch(`${apiUrl}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
        cache: "no-store",
      });

      if (healthResponse.ok) return true;

      // Then try the root endpoint
      const rootResponse = await fetch(`${apiUrl}`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
        cache: "no-store",
      });

      return rootResponse.ok;
    } catch (error) {
      return false;
    }
  }, [apiUrl]);

  // Check server connection status with improved error handling
  const checkServerConnection = useCallback(
    async (forceLog = false) => {
      const now = Date.now();

      // Don't check too frequently when connected unless forced
      if (
        serverStatus === "connected" &&
        now - lastCheckTimeRef.current < CONNECTED_CHECK_INTERVAL &&
        !forceLog
      ) {
        return;
      }

      // Avoid multiple concurrent checks
      if (reconnectionAttemptRef.current) {
        return;
      }

      reconnectionAttemptRef.current = true;
      lastCheckTimeRef.current = now;
      setLastChecked(new Date());

      try {
        // Use a shorter timeout for better user experience
        const startTime = performance.now();
        const response = await fetch(`${apiUrl}/api/server-info`, {
          method: "HEAD",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(3000),
          cache: "no-store",
        });

        const responseTime = Math.round(performance.now() - startTime);

        if (response.ok) {
          // Connection successful
          consecutiveFailsRef.current = 0;
          lastGoodConnectionRef.current = now;

          if (serverStatus !== "connected") {
            console.log("[CONNECTION] Server connection established");
          }

          setServerStatus("connected");
          setServerDetails({
            ...serverDetails,
            url: apiUrl,
            responseTime,
            lastSuccessful: new Date(),
          });
          setRetryCount(0);
          shouldLog.current = false;

          // If we were disconnected before, force a page reload to get fresh data
          if (serverStatus === "disconnected" && retryCount > 10) {
            window.location.reload();
          }
        } else {
          // Try alternate endpoints before marking as disconnected
          const alternateAvailable = await tryAlternateEndpoints();

          if (alternateAvailable) {
            // Server is responding to other endpoints, just not the main one
            // Consider it still connected but log the issue
            console.log(
              "[CONNECTION] Main endpoint error, but server is available"
            );
            lastGoodConnectionRef.current = now;

            // Only increment fails but don't disconnect yet
            consecutiveFailsRef.current++;

            if (consecutiveFailsRef.current <= DISCONNECT_THRESHOLD) {
              // Keep showing as connected if below threshold
              setServerStatus("connected");
              setServerDetails({
                ...serverDetails,
                url: apiUrl,
                responseTime: responseTime,
                lastSuccessful: new Date(),
              });
              return;
            }
          }

          // Failed beyond threshold, mark as disconnected
          consecutiveFailsRef.current++;
          console.error(
            `[CONNECTION] Server responded with status ${response.status}`
          );
          setServerStatus("disconnected");
          setRetryCount((prev) => prev + 1);
          shouldLog.current = true;
        }
      } catch (error) {
        consecutiveFailsRef.current++;
        console.error("[CONNECTION] Server connection error:", error);

        // Check if we should fall back to local data and pretend to be connected
        if (shouldUseFallback()) {
          console.log(
            "[CONNECTION] Using fallback mode due to persistent connection issues"
          );
          // Don't show as disconnected if we're using fallback mode
          // This prevents disruption for transient network issues
          if (serverStatus === "connected") {
            return;
          }
        }

        setServerStatus("disconnected");
        setRetryCount((prev) => prev + 1);
        shouldLog.current = true;
      } finally {
        reconnectionAttemptRef.current = false;
      }
    },
    [
      apiUrl,
      serverDetails,
      serverStatus,
      retryCount,
      shouldUseFallback,
      tryAlternateEndpoints,
    ]
  );

  // Setup connection monitoring
  useEffect(() => {
    // Clean up any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // First check - without logging
    checkServerConnection(false);

    // Set up the correct interval based on connection state
    if (serverStatus === "disconnected") {
      // For disconnected state, use exponential backoff
      intervalRef.current = setInterval(() => {
        checkServerConnection(false);
      }, getBackoffDelay());
    } else {
      // For connected state, use long interval
      shouldLog.current = false;
      intervalRef.current = setInterval(() => {
        checkServerConnection(false);
      }, CONNECTED_CHECK_INTERVAL);
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [checkServerConnection, serverStatus, retryCount, getBackoffDelay]);

  // Add automatic recovery after certain time
  useEffect(() => {
    // If disconnected for more than 5 minutes, try a page reload
    if (serverStatus === "disconnected" && retryCount > 30) {
      const reloadTimer = setTimeout(() => {
        window.location.reload();
      }, 300000); // 5 minutes

      return () => clearTimeout(reloadTimer);
    }
  }, [serverStatus, retryCount]);

  const handleManualRetry = () => {
    // For manual retry, attempt with shorter timeout and force refresh if successful
    const attemptReconnect = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/server-info`, {
          method: "HEAD",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(5000),
          cache: "no-store",
        });

        if (response.ok) {
          // Force reload to get fresh data
          window.location.reload();
          return;
        }

        // Regular retry if the fast attempt fails
        checkServerConnection(true);
      } catch (error) {
        checkServerConnection(true);
      }
    };

    attemptReconnect();
  };

  const toggleDialog = () => {
    setIsDialogOpen(!isDialogOpen);
  };

  // If connected or the first check hasn't completed, render children
  if (serverStatus === "connected" || serverStatus === "connecting") {
    return <>{children}</>;
  }

  // If disconnected, show the error screen
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-xl w-full">
        <div className="flex flex-col items-center text-center">
          <div className="bg-red-100 p-4 rounded-full">
            <Server className="h-12 w-12 text-red-600" />
          </div>
          <h2 className="mt-5 text-2xl font-bold text-gray-900">
            Server Connection Error
          </h2>
          <p className="mt-3 text-gray-500">
            We're having trouble connecting to the server. This could be due to:
          </p>

          <div className="mt-4 bg-gray-50 p-4 rounded-lg w-full text-left">
            <div className="flex items-start mb-2">
              <WifiOff className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
              <p className="text-gray-700">
                <span className="font-medium">Network issues</span> - Try to
                reload the page and Check your internet connection
              </p>
            </div>
            <div className="flex items-start mb-2">
              <Server className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
              <p className="text-gray-700">
                <span className="font-medium">Server unavailable</span> - The
                server might be down or restarting
              </p>
            </div>
            <div className="flex items-start">
              <Database className="h-5 w-5 text-red-500 mt-0.5 mr-2" />
              <p className="text-gray-700">
                <span className="font-medium">Database maintenance</span> -
                System maintenance may be in progress
              </p>
            </div>
          </div>

          <div className="mt-6 text-sm text-gray-500">
            <p>
              Last connection attempt:{" "}
              {lastChecked?.toLocaleTimeString() || "None"}
            </p>
            <p>Retry attempts: {retryCount}</p>
            <p>Server URL: {apiUrl}</p>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleManualRetry}
              className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Retry Connection
            </button>

            <button
              onClick={toggleDialog}
              className="inline-flex items-center justify-center px-5 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50"
            >
              <Settings className="h-5 w-5 mr-2" />
              Connection Details
            </button>
          </div>
        </div>

        {isDialogOpen && (
          <div className="mt-6 border-t border-gray-200 pt-4">
            <div className="bg-gray-100 rounded-lg p-4">
              <h3 className="font-medium text-gray-900">
                Troubleshooting Information
              </h3>
              <pre className="mt-2 text-xs overflow-auto bg-gray-50 p-2 rounded border border-gray-200">
                {JSON.stringify(
                  {
                    serverUrl: apiUrl,
                    attempts: retryCount,
                    lastChecked: lastChecked?.toISOString(),
                    lastSuccessful: serverDetails.lastSuccessful?.toISOString(),
                    responseTime: serverDetails.responseTime,
                    browserInfo: navigator.userAgent,
                  },
                  null,
                  2
                )}
              </pre>
            </div>

            <div className="mt-4">
              <h3 className="font-medium text-gray-900 mb-2">
                Steps to resolve:
              </h3>
              <ol className="list-decimal list-inside text-gray-700 space-y-2">
                <li>Refresh the page and try again</li>
                <li>Check if your internet connection is working</li>
                <li>Try clearing browser cache and cookies</li>
                <li>
                  Contact your system administrator and provide the above
                  information
                </li>
                <li>
                  If you are the administrator, verify that the server is
                  running at{" "}
                  <span className="font-mono text-xs bg-gray-100 px-1 py-0.5 rounded">
                    {apiUrl}
                  </span>
                </li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServerConnectionMonitor;
