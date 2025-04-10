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
  const { loading, error, refreshSettings } = useSettings();
  const [retryCount, setRetryCount] = useState(0);
  const [showLoader, setShowLoader] = useState(true);
  const [showTechDetails, setShowTechDetails] = useState(false);
  const [lastRetryTime, setLastRetryTime] = useState<Date>(new Date());
  const [serverStatus, setServerStatus] = useState<
    "unknown" | "online" | "offline"
  >("unknown");
  const [networkConnected, setNetworkConnected] = useState<boolean>(
    navigator.onLine
  );
  const [diagnosticInfo, setDiagnosticInfo] = useState<DiagnosticInfo>({
    browserInfo: "",
    networkStatus: "",
    timestamp: "",
    viteApiUrl: "",
    connectionMode: "",
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
      // Collect diagnostic info
      const diagInfo: DiagnosticInfo = {
        browserInfo: navigator.userAgent,
        networkStatus: navigator.onLine ? "Connected" : "Disconnected",
        timestamp: new Date().toISOString(),
        viteApiUrl: import.meta.env.VITE_API_URL || "Not defined",
        connectionMode: "unknown",
      };

      try {
        console.log("[SERVER CHECK] Attempting server connection check");

        // First try the proxied path (should work if proxy is properly configured)
        try {
          diagInfo.connectionMode = "proxy";
          console.log(
            `[SERVER CHECK] Trying proxied path: ${apiPath}/server-info`
          );

          const proxyResponse = await fetch(`${apiPath}/server-info`, {
            method: "HEAD",
            signal: AbortSignal.timeout(3000),
            headers: {
              "Cache-Control": "no-cache, no-store",
              Pragma: "no-cache",
            },
          });

          if (proxyResponse.ok) {
            console.log("[SERVER CHECK] Proxy connection successful");
            setServerStatus("online");
            diagInfo.proxyStatus = "success";
            diagInfo.proxyStatusCode = proxyResponse.status;
            setDiagnosticInfo(diagInfo);
            return;
          }

          diagInfo.proxyStatus = "failed";
          diagInfo.proxyStatusCode = proxyResponse.status;
          console.log(
            `[SERVER CHECK] Proxy response not ok: ${proxyResponse.status}`
          );
        } catch (proxyError: any) {
          console.warn(
            "[SERVER CHECK] Proxy connection failed:",
            proxyError.message
          );
          diagInfo.proxyStatus = "error";
          diagInfo.proxyError = proxyError.message;
        }

        // Fall back to direct URL if proxy fails
        try {
          diagInfo.connectionMode = "direct";
          console.log(
            `[SERVER CHECK] Trying direct URL: ${directApiUrl}/api/server-info`
          );

          const directResponse = await fetch(
            `${directApiUrl}/api/server-info`,
            {
              method: "HEAD",
              signal: AbortSignal.timeout(3000),
              headers: {
                "Cache-Control": "no-cache, no-store",
                Pragma: "no-cache",
              },
            }
          );

          if (directResponse.ok) {
            console.log("[SERVER CHECK] Direct connection successful");
            setServerStatus("online");
            diagInfo.directStatus = "success";
            diagInfo.directStatusCode = directResponse.status;
            setDiagnosticInfo(diagInfo);
            return;
          }

          diagInfo.directStatus = "failed";
          diagInfo.directStatusCode = directResponse.status;
          console.log(
            `[SERVER CHECK] Direct response not ok: ${directResponse.status}`
          );
        } catch (directError: any) {
          console.warn(
            "[SERVER CHECK] Direct connection failed:",
            directError.message
          );
          diagInfo.directStatus = "error";
          diagInfo.directError = directError.message;
        }

        // If all previous attempts fail, try the /health endpoint as last resort
        try {
          diagInfo.connectionMode = "health";
          console.log(
            `[SERVER CHECK] Trying health endpoint: ${directApiUrl}/health`
          );

          const healthResponse = await fetch(`${directApiUrl}/health`, {
            method: "GET",
            signal: AbortSignal.timeout(5000),
          });

          if (healthResponse.ok) {
            console.log("[SERVER CHECK] Health check successful");
            const healthData = await healthResponse.json();
            diagInfo.healthData = healthData;
            setServerStatus("online");
            setDiagnosticInfo(diagInfo);
            return;
          }

          diagInfo.healthStatus = "failed";
          diagInfo.healthStatusCode = healthResponse.status;
          console.log(
            `[SERVER CHECK] Health check failed: ${healthResponse.status}`
          );
        } catch (healthError: any) {
          console.error(
            "[SERVER CHECK] Health check error:",
            healthError.message
          );
          diagInfo.healthStatus = "error";
          diagInfo.healthError = healthError.message;
        }

        // If we get here, all connection attempts failed
        console.error("[SERVER CHECK] All connection attempts failed");
        setServerStatus("offline");
      } catch (error: any) {
        console.error(
          "[SERVER CHECK] Unhandled error during status check:",
          error
        );
        diagInfo.unhandledError = error.message;
        setServerStatus("offline");
      } finally {
        setDiagnosticInfo(diagInfo);
      }
    };

    checkServerStatus();
  }, [retryCount]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
    setLastRetryTime(new Date());
    refreshSettings();
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
