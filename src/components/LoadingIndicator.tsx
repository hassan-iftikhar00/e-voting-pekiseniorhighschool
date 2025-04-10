import React from "react";
import { Loader } from "lucide-react";

interface LoadingIndicatorProps {
  size?: "small" | "medium" | "large";
  message?: string;
  fullscreen?: boolean;
  transparent?: boolean;
}

const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = "medium",
  message = "Loading...",
  fullscreen = false,
  transparent = false,
}) => {
  const sizeClasses = {
    small: "h-4 w-4",
    medium: "h-6 w-6",
    large: "h-10 w-10",
  };

  if (fullscreen) {
    return (
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center ${
          !transparent ? "bg-white/80" : ""
        }`}
      >
        <div className="text-center">
          <Loader
            className={`${sizeClasses[size]} text-indigo-600 animate-spin mx-auto mb-2`}
          />
          <p className="text-sm font-medium text-gray-700">{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      <Loader
        className={`${sizeClasses[size]} text-indigo-600 animate-spin mr-3`}
      />
      <p className="text-sm font-medium text-gray-700">{message}</p>
    </div>
  );
};

export default LoadingIndicator;
