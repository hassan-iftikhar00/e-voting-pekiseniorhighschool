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
  const shouldLog = useRef<boolean>(false); // Set to false by default
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCheckTimeRef = useRef<number>(0);

  // Disable all console logs in production
  const enableLogs = false; // Set this to false to disable all logs

  // Connection check throttling (5 minutes when connected)
  const CONNECTED_CHECK_INTERVAL = 300000;
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Get exponential backoff delay based on retry count
  const getBackoffDelay = useCallback(() => {
    const baseDelay = 2000;
    const maxDelay = 30000;
    const calculatedDelay = baseDelay * Math.pow(1.5, Math.min(retryCount, 10));
    return Math.min(calculatedDelay, maxDelay);
  }, [retryCount]);

  // Check server connection status
  const checkServerConnection = useCallback(
    async (forceLog = false) => {
      const now = Date.now();

      // Throttle checks when connected (one check per interval)
      if (
        serverStatus === "connected" &&
        now - lastCheckTimeRef.current < CONNECTED_CHECK_INTERVAL &&
        !forceLog
      ) {
        return;
      }

      lastCheckTimeRef.current = now;
      setLastChecked(new Date());

      // Only log if logging is enabled AND (forceLog is true OR shouldLog.current is true)
      const log = enableLogs && (forceLog || shouldLog.current);

      try {
        const startTime = performance.now();

        const response = await fetch(`${apiUrl}/api/server-info`, {
          method: "HEAD",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(5000),
          cache: "no-store",
        });

        const responseTime = Math.round(performance.now() - startTime);

        if (response.ok) {
          if (serverStatus !== "connected" && log) {
            console.log("[CONNECTION] Server connection established");
          }

          setServerStatus("connected");
          setServerDetails({
            ...serverDetails,
            url: apiUrl,
            responseTime,
            lastSuccessful: new Date(),
          });
          setRetryCount(0); // Reset retry count on success
          shouldLog.current = false;
        } else {
          if (log) {
            console.error(
              `[CONNECTION] Server responded with status ${response.status}`
            );
          }
          setServerStatus("disconnected");
          setRetryCount((prev) => prev + 1);
          shouldLog.current = true;
        }
      } catch (error) {
        if (log) {
          console.error("[CONNECTION] Server connection error:", error);
        }
        setServerStatus("disconnected");
        setRetryCount((prev) => prev + 1);
        shouldLog.current = true;
      }
    },
    [apiUrl, serverDetails, serverStatus]
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
      // For connected state, use long interval and no logging
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

  const handleManualRetry = () => {
    // Only log during manual retries if logging is enabled
    checkServerConnection(enableLogs);
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
                <span className="font-medium">Network issues</span> -Try to
                realod the page and Check your internet connection
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
