import React, { useState, useEffect } from "react";
import { AlertCircle, RefreshCw, Server } from "lucide-react";

interface ServerConnectionHandlerProps {
  children: React.ReactNode;
}

const ServerConnectionHandler: React.FC<ServerConnectionHandlerProps> = ({
  children,
}) => {
  const [serverConnected, setServerConnected] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [retrying, setRetrying] = useState(false);
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const checkServerConnection = async () => {
    try {
      setRetrying(true);
      const response = await fetch(`${apiUrl}/api/test`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        // Short timeout to quickly detect connection issues
        signal: AbortSignal.timeout(3000),
      });

      if (response.ok) {
        setServerConnected(true);
      } else {
        setServerConnected(false);
      }
    } catch (error) {
      console.error("Server connection error:", error);
      setServerConnected(false);
    } finally {
      setRetrying(false);
    }
  };

  // Check server connection on mount and when retryCount changes
  useEffect(() => {
    checkServerConnection();

    // Set up periodic connection checks if disconnected
    let interval: NodeJS.Timeout | undefined;
    if (!serverConnected) {
      interval = setInterval(() => {
        checkServerConnection();
      }, 5000); // Check every 5 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [retryCount]);

  const handleRetry = () => {
    setRetryCount((prev) => prev + 1);
  };

  if (!serverConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
          <div className="flex items-center justify-center mb-4 text-red-500">
            <Server size={48} />
          </div>
          <h2 className="text-2xl font-bold text-center text-gray-800 mb-2">
            Server Connection Error
          </h2>
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">
                  Unable to connect to the server. The server might be down or
                  experiencing issues.
                </p>
              </div>
            </div>
          </div>
          <p className="text-gray-600 mb-6 text-center">
            Please check if the server is running and try again.
          </p>
          <div className="flex justify-center">
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-6 rounded-lg flex items-center justify-center transition-colors duration-300 disabled:opacity-70"
            >
              {retrying ? (
                <>
                  <RefreshCw className="animate-spin h-4 w-4 mr-2" />
                  Connecting...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Connection
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ServerConnectionHandler;
