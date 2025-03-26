import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Role from "../models/Role.js"; // Add missing Role import

export const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    console.log("Verifying token:", token.substring(0, 10) + "..."); // Log token prefix for debugging
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find user by ID
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(403).json({ message: "Invalid or expired token" });
    }

    // Populate role differently based on the type
    if (user.role) {
      if (typeof user.role === "string") {
        // Handle string role (like "admin")
        console.log(`User ${user.username} has string role: ${user.role}`);
        try {
          // Try to find role by name
          const role = await Role.findOne({ name: user.role });
          if (role) {
            user.role = role;
          } else {
            // If no role found, create a basic permissions object
            if (user.role.toLowerCase() === "admin") {
              // Special case for admin - grant all permissions
              user.role = {
                name: "admin",
                permissions: {
                  // Grant all permissions to admin
                  dashboard: ["view", "edit"],
                  voters: ["view", "add", "edit", "delete"],
                  candidates: ["view", "add", "edit", "delete"],
                  positions: ["view", "add", "edit", "delete"],
                  class: ["view", "add", "edit", "delete"],
                  year: ["view", "add", "edit", "delete"],
                  house: ["view", "add", "edit", "delete"],
                  results: ["view"],
                  logs: ["view", "add", "edit", "delete"],
                  settings: ["view", "edit"],
                  roles: ["view", "add", "edit", "delete"],
                  users: ["view", "add", "edit", "delete"],
                  dva: ["view"],
                  elections: ["view", "add", "edit", "delete"],
                },
              };
            } else {
              // For other string roles, provide basic permissions
              user.role = {
                name: user.role,
                permissions: {
                  dashboard: ["view"],
                  settings: ["view"],
                },
              };
            }
          }
        } catch (error) {
          console.error("Error resolving role by name:", error);
          // Fallback to basic role
          user.role = {
            name: user.role,
            permissions: { dashboard: ["view"] },
          };
        }
      } else if (typeof user.role === "object" && user.role._id) {
        // Role is already an object or populated, nothing to do
        console.log(`User ${user.username} has object role:`, user.role.name);
      }
    } else {
      // No role assigned
      console.log(`User ${user.username} has no role assigned`);
      user.role = { name: "guest", permissions: {} };
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("JWT verification error:", error);
    return res
      .status(403)
      .json({ message: "Invalid or expired token", error: error.message });
  }
};

// Helper function to get standardized role name
const getUserRoleName = (roleData) => {
  if (!roleData) return "";

  if (typeof roleData === "string") {
    return roleData.toLowerCase();
  }

  if (typeof roleData === "object" && roleData.name) {
    return roleData.name.toLowerCase();
  }

  return "";
};

export const checkPermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      const roleName = getUserRoleName(req.user?.role);

      // Special case for admin users - they can do everything
      if (roleName === "admin") {
        console.log("Admin user detected - bypassing permission check");
        return next();
      }

      // Special case for viewer role - they can view everything
      if (roleName === "viewer" && action === "view") {
        console.log("Viewer role detected - allowing view access");
        return next();
      }

      // For other roles or actions, perform normal permission check
      let userRole;

      // Get the user's role object
      if (typeof req.user.role === "string") {
        userRole = await Role.findOne({ name: req.user.role });
        console.log(
          `User ${req.user.username} has string role: ${req.user.role}`
        );
      } else {
        userRole = req.user.role;
      }

      if (!userRole) {
        return res.status(403).json({ message: "Invalid role" });
      }

      // Correctly check permissions from the Map structure
      const hasPermission =
        userRole.permissions &&
        userRole.permissions.get(resource) &&
        userRole.permissions.get(resource)[action];

      if (hasPermission) {
        return next();
      } else {
        return res.status(403).json({
          message: "Access denied",
          details: `You don't have permission to ${action} ${resource}`,
        });
      }
    } catch (error) {
      console.error("Permission check error:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};
