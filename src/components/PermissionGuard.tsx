import React from "react";
import { useUser } from "../context/UserContext";
import AccessDenied from "./AccessDenied";

interface PermissionGuardProps {
  children: React.ReactNode;
  page: string;
  action: "view" | "add" | "edit" | "delete";
}

// Apply React.memo to prevent unnecessary re-renders
const PermissionGuard: React.FC<PermissionGuardProps> = React.memo(
  ({ children, page, action }) => {
    const { user, isAuthenticated } = useUser();

    if (!isAuthenticated) {
      return null;
    }

    // Get user role in a reliable way, handling both string and object formats
    const userRole =
      typeof user?.role === "string"
        ? user?.role.toLowerCase()
        : user?.role?.name?.toLowerCase() || "";

    // Admin has access to everything
    if (userRole === "admin") {
      if (process.env.NODE_ENV === "development") {
        console.log("Admin access granted for", page, action);
      }
      return <>{children}</>;
    }

    // Viewer has access to view actions only
    if (userRole === "viewer" && action === "view") {
      if (process.env.NODE_ENV === "development") {
        console.log("Viewer access granted for", page, action);
      }
      return <>{children}</>;
    }

    // For other roles or non-view actions for viewers, check specific permissions
    // This is a simplified check, relying only on role name not specific permissions
    if (process.env.NODE_ENV === "development") {
      console.log(
        "Permission denied for",
        page,
        action,
        "User role:",
        userRole
      );
    }

    // For viewer trying non-view actions, or other roles without permissions
    return <AccessDenied />;
  }
);

// Add display name for debugging
PermissionGuard.displayName = "PermissionGuard";

export default PermissionGuard;
