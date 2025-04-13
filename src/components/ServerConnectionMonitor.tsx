import React, { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, Server, WifiOff, Settings, Database } from "lucide-react";

// Add this constant at the top
const ENDPOINT_PRIORITY = [
  "/api/health-check", // Lightweight endpoint
  "/api/server-info", // Fallback 1
  "/health", // Fallback 2
  "/api/elections/status", // Last resort
];

// Add array of fallback ports to try
const FALLBACK_PORTS = [5000, 5001, 3000, 8080];

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
    dbStatus?: "connected" | "disconnected";
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

  const [activePort, setActivePort] = useState<number | null>(null);
  const [connectionDetails, setConnectionDetails] = useState<string>("");

  // Get base URL without port
  const getBaseUrl = useCallback(() => {
    const url = import.meta.env.VITE_API_URL || "http://localhost:5000";
    console.log("[CONNECTION] Processing API URL:", url);

    // Check if this is a hosted URL (like Render.com)
    const isHostedUrl =
      url.includes("render.com") || url.startsWith("https://");

    // Extract the protocol and hostname without port
    const match = url.match(/^(https?:\/\/[^:\/]+)(:\d+)?(\/.*)?$/);
    if (match) {
      const [, baseWithoutPort, port = "", path = ""] = match;
      return {
        base: baseWithoutPort,
        defaultPort: port ? parseInt(port.substring(1)) : 5000,
        path,
        isHosted: isHostedUrl,
      };
    }
    return {
      base: "http://localhost",
      defaultPort: 5000,
      path: "",
      isHosted: false,
    };
  }, []);

  // Get API URL with the active port - modified to support hosted URLs
  const getApiUrl = useCallback(() => {
    const { base, defaultPort, path, isHosted } = getBaseUrl();
    // For hosted URLs, don't append port
    if (isHosted) {
      return `${base}${path}`;
    }
    // For local development or custom setups, use port
    const port = activePort || defaultPort;
    return `${base}:${port}${path}`;
  }, [activePort, getBaseUrl]);

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

  // Add this utility function for retrying operations with backoff
  const withRetry = async (
    fn: () => Promise<any>,
    retries = 3,
    baseDelay = 1000
  ) => {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) throw error;
      const delay = baseDelay * (1 + 0.2 * Math.random()); // Add jitter
      await new Promise((resolve) => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, baseDelay * 2);
    }
  };

  // Try to connect using a specific port
  const tryConnect = useCallback(
    async (port: number): Promise<boolean> => {
      try {
        const { base, path, isHosted } = getBaseUrl();
        // For hosted URLs, don't append port
        const testUrl = isHosted
          ? `${base}${path}/api/health-check`
          : `${base}:${port}/api/health-check`;

        console.log(`[CONNECTION] Trying connection at ${testUrl}`);

        const response = await fetch(testUrl, {
          signal: AbortSignal.timeout(3000),
          cache: "no-store",
        });

        if (response.ok) {
          console.log(`[CONNECTION] Successfully connected to ${testUrl}`);
          setActivePort(isHosted ? null : port);
          setConnectionDetails(
            `Connected to server ${isHosted ? base : `on port ${port}`}`
          );
          return true;
        }
        return false;
      } catch (error: any) {
        console.warn(`[CONNECTION] Failed to connect: ${error.message}`);
        return false;
      }
    },
    [getBaseUrl]
  );

  // Discover available port - modified to handle hosted URLs
  const discoverPort = useCallback(async (): Promise<boolean> => {
    const { defaultPort, isHosted } = getBaseUrl();

    // For hosted URLs, just try connecting without a port
    if (isHosted) {
      if (await tryConnect(0)) {
        // 0 is a placeholder, won't be used
        return true;
      }
      return false;
    }

    // Try the default port first for non-hosted URLs
    if (await tryConnect(defaultPort)) {
      return true;
    }

    // Then try fallback ports for non-hosted URLs
    for (const port of FALLBACK_PORTS) {
      if (port !== defaultPort) {
        if (await tryConnect(port)) {
          return true;
        }
      }
    }

    return false;
  }, [getBaseUrl, tryConnect]);

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

      // If we don't have an active port yet, try to discover one
      if (activePort === null) {
        const portFound = await discoverPort();
        if (!portFound) {
          setServerStatus("disconnected");
          setRetryCount((prev) => prev + 1);
          reconnectionAttemptRef.current = false;
          const { isHosted } = getBaseUrl();
          setConnectionDetails(
            isHosted
              ? "Failed to connect to hosted server. Check URL configuration."
              : "Failed to find available server port. Tried: " +
                  FALLBACK_PORTS.join(", ")
          );
          return;
        }
      }

      const currentApiUrl = getApiUrl();

      // Try each endpoint in priority order
      let connected = false;
      for (const endpoint of ENDPOINT_PRIORITY) {
        try {
          console.log(
            `[CONNECTION] Trying endpoint: ${currentApiUrl}${endpoint}`
          );
          const response = await fetch(`${currentApiUrl}${endpoint}`, {
            signal: AbortSignal.timeout(3000),
            cache: "no-store",
          });

          if (response.ok) {
            console.log(`[CONNECTION] Successfully connected to ${endpoint}`);
            connected = true;
            break;
          }
        } catch (error: any) {
          console.warn(
            `[CONNECTION] Endpoint ${endpoint} failed:`,
            error.message
          );

          // Special handling for ECONNREFUSED errors
          if (
            error.message.includes("Failed to fetch") ||
            error.message.includes("NetworkError")
          ) {
            // This could be ECONNREFUSED - try another port
            const portDiscovered = await discoverPort();
            if (portDiscovered) {
              console.log(
                "[CONNECTION] Found alternative port, retrying connection"
              );
              connected = await fetch(`${getApiUrl()}${endpoint}`, {
                signal: AbortSignal.timeout(3000),
                cache: "no-store",
              })
                .then((r) => r.ok)
                .catch(() => false);

              if (connected) break;
            }
          }
        }
      }

      if (connected) {
        // Connection successful
        consecutiveFailsRef.current = 0;
        lastGoodConnectionRef.current = now;

        if (serverStatus !== "connected") {
          console.log("[CONNECTION] Server connection established");
        }

        setServerStatus("connected");
        setServerDetails({
          ...serverDetails,
          url: getApiUrl(),
          responseTime: Date.now() - now,
          lastSuccessful: new Date(),
          dbStatus: "connected", // Assume connected since we got a response
        });

        setRetryCount(0);
        shouldLog.current = false;

        // If we were disconnected before and now connected, reload the page
        if (serverStatus === "disconnected" && retryCount > 10) {
          window.location.reload();
        }
      } else {
        consecutiveFailsRef.current++;
        console.error("[CONNECTION] All connection attempts failed");

        // Check if we should fall back to local data and pretend to be connected
        if (shouldUseFallback()) {
          console.log(
            "[CONNECTION] Using fallback mode due to persistent connection issues"
          );
          // Don't show as disconnected if we're using fallback mode
          if (serverStatus === "connected") {
            reconnectionAttemptRef.current = false;
            return;
          }
        }

        setServerStatus("disconnected");
        setRetryCount((prev) => prev + 1);
        shouldLog.current = true;
      }

      reconnectionAttemptRef.current = false;
    },
    [
      serverStatus,
      retryCount,
      shouldUseFallback,
      serverDetails,
      discoverPort,
      getApiUrl,
      activePort,
      getBaseUrl,
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

  // Modify handleManualRetry to reset port discovery
  const handleManualRetry = () => {
    // Reset connection state to force rediscovery
    const { isHosted } = getBaseUrl();
    if (!isHosted) {
      setActivePort(null);
    }
    setConnectionDetails(
      isHosted
        ? "Trying to connect to hosted server..."
        : "Trying to discover server port..."
    );

    // For manual retry, attempt with shorter timeout and force refresh if successful
    const attemptReconnect = async () => {
      try {
        const portFound = await discoverPort();

        if (portFound) {
          const currentApiUrl = getApiUrl();
          const response = await fetch(`${currentApiUrl}/api/server-info`, {
            method: "HEAD",
            signal: AbortSignal.timeout(5000),
            cache: "no-store",
          });

          if (response.ok) {
            // Force reload to get fresh data
            window.location.reload();
            return;
          }
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

  // If disconnected, show the error screen with enhanced information
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
                <span className="font-medium">Connection refused</span> - The
                server port might be blocked or changed
              </p>
            </div>
          </div>

          <div className="mt-6 text-sm text-gray-500">
            <p>
              Last connection attempt:{" "}
              {lastChecked?.toLocaleTimeString() || "None"}
            </p>
            <p>Retry attempts: {retryCount}</p>
            <p>Server URL: {getApiUrl()}</p>
            {connectionDetails && (
              <p className="text-xs text-orange-600">{connectionDetails}</p>
            )}
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
                    serverUrl: getApiUrl(),
                    attempts: retryCount,
                    lastChecked: lastChecked?.toISOString(),
                    lastSuccessful: serverDetails.lastSuccessful?.toISOString(),
                    responseTime: serverDetails.responseTime,
                    activePort: activePort,
                    triedPorts: FALLBACK_PORTS.join(", "),
                    browserInfo: navigator.userAgent,
                    error:
                      "ECONNREFUSED - The server is not responding on the expected port",
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
                  Verify the server is running on port{" "}
                  {activePort || getBaseUrl().defaultPort}
                </li>
                <li>
                  If you're an administrator:
                  <ul className="list-disc ml-6 mt-1 text-sm">
                    <li>Check if the server process is running</li>
                    <li>
                      Verify port {activePort || getBaseUrl().defaultPort} is
                      not blocked by firewall
                    </li>
                    <li>Check server logs for errors</li>
                    <li>Try restarting the server</li>
                  </ul>
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
