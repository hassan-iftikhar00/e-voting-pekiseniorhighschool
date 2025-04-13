import React, { useState, useEffect } from "react";
import { useSettings } from "../context/SettingsContext";
import {
  Loader,
  AlertCircle,
  RefreshCw,
  Server,
  WifiOff,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Database,
  Globe,
  Network,
} from "lucide-react";

// Add interface for diagnostic info
interface DiagnosticInfo {
  browserInfo: string;
  networkStatus: string;
  timestamp: string;
  viteApiUrl: string;
  connectionMode: string;
  checkAttempt?: number; // Added missing property
  lastCheck?: string; // Added missing property
  proxyStatus?: string;
  proxyStatusCode?: number;
  proxyError?: string;
  directStatus?: string;
  directStatusCode?: number;
  directError?: string;
  healthStatus?: string;
  healthStatusCode?: number;
  healthData?: any;
  healthError?: string;
  unhandledError?: string;
}

interface SettingsPreloaderProps {
  children: React.ReactNode;
}

const SettingsPreloader: React.FC<SettingsPreloaderProps> = ({ children }) => {
  const { loading, error, refreshSettings, updateSettings } = useSettings();
  const [retryCount, setRetryCount] = useState(0);
  const [showLoader, setShowLoader] = useState(true);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [lastRetryTime, setLastRetryTime] = useState<Date>(new Date());
  const [serverStatus, setServerStatus] = useState<
    "unknown" | "online" | "offline"
  >("unknown");
  // Add missing state variables
  const [connectionMethod, setConnectionMethod] = useState<
    "none" | "proxy" | "direct"
  >("none");
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [networkConnected, setNetworkConnected] = useState<boolean>(
    navigator.onLine
  );
  const [diagnosticInfo, setDiagnosticInfo] = useState<DiagnosticInfo>({
    browserInfo: "",
    networkStatus: "",
    timestamp: "",
    viteApiUrl: "",
    connectionMode: "",
    checkAttempt: 0,
  });

  // API base URL - using relative path for proxy support
  const apiPath = "/api";
  // Fallback direct URL for diagnostic purposes
  const directApiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Monitor network connectivity
  useEffect(() => {
    const handleOnline = () => setNetworkConnected(true);
    const handleOffline = () => setNetworkConnected(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Only show loader after a brief delay to avoid flashing
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(loading);
    }, 300);
    return () => clearTimeout(timer);
  }, [loading]);

  // Check server status when component mounts or retry is attempted
  useEffect(() => {
    const checkServerStatus = async () => {
      const PROXY_URL = "/api/server-info";
      const DIRECT_URL = `${
        import.meta.env.VITE_API_URL || "http://localhost:5000"
      }/api/server-info`;

      setDiagnosticInfo((prev) => ({
        ...prev,
        lastCheck: new Date().toISOString(),
        checkAttempt: (prev.checkAttempt || 0) + 1,
      }));

      try {
        // Try proxy first with short timeout
        console.log("[SERVER CHECK] Trying proxy endpoint:", PROXY_URL);
        let response = await fetch(PROXY_URL, {
          method: "HEAD",
          signal: AbortSignal.timeout(2000),
        });

        if (!response.ok)
          throw new Error(`Proxy responded with ${response.status}`);

        console.log("[SERVER CHECK] Server connected via proxy");
        setServerStatus("online");
        setConnectionMethod("proxy");
        return true;
      } catch (error) {
        // Fix typing of error
        const proxyError = error as Error;
        console.warn("[SERVER CHECK] Proxy failed:", proxyError.message);

        try {
          // Fallback to direct connection
          console.log("[SERVER CHECK] Trying direct connection:", DIRECT_URL);
          const response = await fetch(DIRECT_URL, {
            method: "HEAD",
            signal: AbortSignal.timeout(3000),
          });

          if (response.ok) {
            console.log("[SERVER CHECK] Server connected directly");
            setServerStatus("online");
            setConnectionMethod("direct");
            return true;
          }

          console.warn(
            "[SERVER CHECK] Direct connection failed with status:",
            response.status
          );
          return false;
        } catch (error) {
          // Fix typing of error
          const directError = error as Error;
          console.error(
            "[SERVER CHECK] Both proxy and direct connection failed"
          );
          setServerStatus("offline");
          setConnectionMethod("none");
          return false;
        }
      }
    };

    checkServerStatus();
  }, [retryCount]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    setLastRetryTime(new Date());
    refreshSettings();
  };

  // Enhanced fetch settings function with better fallback handling
  const fetchSettings = async () => {
    if (serverStatus !== "online") {
      console.log("[SETTINGS] Server offline, using cached settings");
      return false;
    }

    setLoadingSettings(true);

    try {
      const endpoint =
        connectionMethod === "direct"
          ? `${
              import.meta.env.VITE_API_URL || "http://localhost:5000"
            }/api/settings`
          : "/api/settings";

      console.log(`[SETTINGS] Fetching settings from ${endpoint}`);
      const response = await fetch(endpoint, {
        signal: AbortSignal.timeout(5000),
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Settings fetch failed with status: ${response.status}`
        );
      }

      const data = await response.json();
      console.log("[SETTINGS] Successfully loaded settings from server");

      // Use updateSettings from context instead of setSettings
      updateSettings(data);
      localStorage.setItem(
        "settings",
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );

      setLoadingSettings(false);
      return true;
    } catch (error) {
      const err = error as Error;
      console.error("[SETTINGS] Failed to fetch settings:", err.message);

      // Try to load from localStorage as fallback
      const cachedSettings = localStorage.getItem("settings");
      if (cachedSettings) {
        try {
          const { data, timestamp } = JSON.parse(cachedSettings);
          const cacheAge = Date.now() - timestamp;

          if (cacheAge < 3600000) {
            // Less than 1 hour old
            console.log("[SETTINGS] Using cached settings from localStorage");
            updateSettings(data);
          } else {
            console.warn("[SETTINGS] Cached settings too old, not using");
          }
        } catch (cacheError) {
          console.error(
            "[SETTINGS] Error parsing cached settings:",
            cacheError
          );
        }
      }

      setLoadingSettings(false);
      return false;
    }
  };

  // If we're loading settings for the first time, show the loader
  if (showLoader && loading && retryCount === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md w-full">
          <div className="flex justify-center">
            <Loader className="h-12 w-12 text-indigo-600 animate-spin" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Loading Application
          </h2>
          <p className="mt-2 text-gray-600">
            Please wait while we load the application settings...
          </p>
        </div>
      </div>
    );
  }

  // If there's an error and we've tried multiple times
  if (error && retryCount >= 2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-xl w-full">
          <div className="flex justify-center text-red-500">
            <Server className="h-12 w-12" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Server Connection Error
          </h2>
          <p className="mt-2 text-red-600">
            We're having trouble connecting to the server. This could be due to:
          </p>

          <ul className="mt-4 text-left text-gray-700 pl-4 space-y-2">
            <li className="flex items-start">
              <WifiOff className="h-5 w-5 mr-2 text-gray-500 mt-0.5 flex-shrink-0" />
              <span>
                Network issues - Check your internet connection{" "}
                {!networkConnected && (
                  <span className="text-red-600 font-bold">
                    (You appear to be offline)
                  </span>
                )}
              </span>
            </li>
            <li className="flex items-start">
              <Server className="h-5 w-5 mr-2 text-gray-500 mt-0.5 flex-shrink-0" />
              <span>
                Server unavailable - The server might be down or restarting
              </span>
            </li>
            <li className="flex items-start">
              <Globe className="h-5 w-5 mr-2 text-gray-500 mt-0.5 flex-shrink-0" />
              <span>CORS/Proxy issues - API requests may be blocked</span>
            </li>
            <li className="flex items-start">
              <Database className="h-5 w-5 mr-2 text-gray-500 mt-0.5 flex-shrink-0" />
              <span>
                Database maintenance - System maintenance may be in progress
              </span>
            </li>
          </ul>

          <div className="mt-6 text-gray-600 text-sm">
            <p>Last connection attempt: {lastRetryTime.toLocaleTimeString()}</p>
            <p>Retry attempts: {retryCount}</p>
            <p>Server URL: {directApiUrl}</p>
            <p>
              Server status:{" "}
              <span
                className={
                  serverStatus === "online"
                    ? "text-green-600 font-medium"
                    : "text-red-600 font-medium"
                }
              >
                {serverStatus === "online" ? "Reachable" : "Unreachable"}
              </span>
            </p>
            <p>
              Network status:{" "}
              <span
                className={
                  networkConnected
                    ? "text-green-600 font-medium"
                    : "text-red-600 font-medium"
                }
              >
                {networkConnected ? "Connected" : "Disconnected"}
              </span>
            </p>
          </div>

          <div className="mt-6">
            <button
              onClick={handleRetry}
              className="inline-flex items-center px-4 py-2 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              disabled={!networkConnected}
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Retry Connection
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => setShowTechDetails(!showTechDetails)}
              className="text-sm text-gray-500 flex items-center mx-auto"
            >
              {showTechDetails ? (
                <ChevronUp className="h-4 w-4 mr-1" />
              ) : (
                <ChevronDown className="h-4 w-4 mr-1" />
              )}
              {showTechDetails
                ? "Hide Technical Details"
                : "Show Technical Details"}
            </button>

            {showTechDetails && (
              <div className="mt-4 bg-gray-50 p-4 rounded-md text-left">
                <h3 className="text-sm font-medium text-gray-700 mb-2">
                  Technical Error Details
                </h3>
                <pre className="text-xs bg-gray-100 p-3 rounded overflow-auto max-h-40 whitespace-pre-wrap">
                  {JSON.stringify(
                    {
                      error: error?.toString() || "Unknown error",
                      serverUrl: directApiUrl,
                      attempts: retryCount,
                      lastChecked: new Date().toISOString(),
                      serverStatus,
                      networkStatus: networkConnected
                        ? "Connected"
                        : "Disconnected",
                      diagnostics: diagnosticInfo,
                    },
                    null,
                    2
                  )}
                </pre>

                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Steps to resolve:
                  </h3>
                  <ul className="text-xs text-gray-600 list-disc pl-5 space-y-1">
                    <li>
                      Try direct API access:{" "}
                      <a
                        href={`${directApiUrl}/api/test`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline inline-flex items-center"
                      >
                        API Test <ExternalLink className="h-3 w-3 ml-0.5" />
                      </a>
                    </li>
                    <li>
                      Try health check:{" "}
                      <a
                        href={`${directApiUrl}/health`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline inline-flex items-center"
                      >
                        Health Check <ExternalLink className="h-3 w-3 ml-0.5" />
                      </a>
                    </li>
                    <li>Try clearing browser cache and cookies</li>
                    <li>
                      If using a VPN or proxy, try disabling it temporarily
                    </li>
                    <li>Make sure you're using the correct server URL</li>
                    <li>
                      Check if your browser is blocking cross-origin requests
                    </li>
                    <li>
                      <strong>If you are the administrator:</strong>
                      <ul className="ml-4 mt-1 space-y-1">
                        <li>
                          Verify that the server is running at {directApiUrl}
                        </li>
                        <li>Check server logs for any errors</li>
                        <li>
                          Restart the server using command:{" "}
                          <code className="bg-gray-200 px-1 rounded">
                            npm run dev:server
                          </code>
                        </li>
                        <li>Make sure MongoDB is connected properly</li>
                        <li>
                          Check firewall settings that might block connections
                        </li>
                      </ul>
                    </li>
                  </ul>
                </div>

                <div className="mt-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">
                    Server Console Commands:
                  </h3>
                  <div className="bg-black text-green-400 p-2 rounded font-mono text-xs overflow-x-auto">
                    <p>$ npm run dev:server</p>
                    <p>$ nodemon ./server/server.js</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Otherwise, render children
  return <>{children}</>;
};

export default SettingsPreloader;
