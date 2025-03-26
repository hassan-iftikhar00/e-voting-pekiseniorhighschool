import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Role from "../models/Role.js";
import { logActivity } from "./logController.js";

// User registration
export const register = async (req, res) => {
  try {
    const { username, password, email, roleName } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    // Handle role assignment
    let role;
    if (roleName) {
      // Find role by name
      role = await Role.findOne({ name: roleName });
      if (!role) {
        // If specified role doesn't exist, create a default user with voter role
        const voterRole = await Role.findOne({ name: "voter" });
        role = voterRole?._id;
      } else {
        role = role._id; // Store the ObjectId reference
      }
    } else {
      // Default to voter role if none specified
      const defaultRole = await Role.findOne({ name: "voter" });
      role = defaultRole?._id;
    }

    // Create new user
    const newUser = new User({
      username,
      password, // will be hashed in the pre-save hook
      email,
      role,
    });

    await newUser.save();

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser._id,
        username: newUser.username,
        email: newUser.email,
        role: roleName || "voter",
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(500).json({
      message: "Error registering user",
      error: error.message,
    });
  }
};

// User login
export const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log(
      `Login attempt for username: ${username} password: ${"*".repeat(3)}`
    );

    // Find user by username or email
    const user = await User.findOne({
      $or: [{ username }, { email: username }],
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log(`User found: ${user.username} (${user._id})`);
    console.log(`Comparing passwords for user: ${user.username}`);

    // Compare password
    const passwordMatch = await bcrypt.compare(password, user.password);
    console.log(`Password match result: ${passwordMatch}`);

    if (!passwordMatch) {
      console.log(`Password comparison result: false`);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    console.log(`Password comparison result: true`);

    // Create JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: "24h" }
    );

    console.log(
      `Created JWT token for user ${user.username} with ID ${user._id}`
    );

    // Create a clean user object without password
    const userResponse = {
      _id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
    };

    console.log(
      `Login successful for: ${user.username} with role: ${
        typeof user.role === "object" ? user.role.name : user.role
      }`
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get current user info
export const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get role permissions
    const role = await Role.findOne({ name: user.role });
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Convert MongoDB Map to plain object for JSON response
    const permissions = {};
    if (role.permissions instanceof Map) {
      for (const [pageId, permission] of role.permissions.entries()) {
        permissions[pageId] = permission;
      }
    } else if (typeof role.permissions === "object") {
      Object.assign(permissions, role.permissions);
    }

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      username: user.username || user.email,
      role: user.role,
      permissions,
    });
  } catch (error) {
    console.error("Error getting current user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create or update admin user
export const seedAdminUser = async (req, res) => {
  try {
    console.log("Starting admin user seed process");

    // Check if admin role exists, create it if not
    let adminRole = await Role.findOne({ name: "Admin" });
    console.log("Found Admin role:", !!adminRole);

    if (!adminRole) {
      console.log("Creating Admin role");
      // Create admin role with all permissions
      const pagePermissions = {};

      // Create permissions for each page
      [
        "dashboard",
        "positions",
        "candidates",
        "voters",
        "year",
        "class",
        "house",
        "results",
        "dva",
        "log",
        "settings",
        "roles",
        "users",
      ].forEach((page) => {
        pagePermissions[page] = {
          view: true,
          edit: true,
          delete: true,
          add: true,
        };
      });

      adminRole = new Role({
        name: "Admin",
        description: "Full system access",
        active: true,
        permissions: pagePermissions,
      });

      await adminRole.save();
      console.log("Admin role created successfully");
    } else {
      console.log("Admin role already exists");
    }

    // Check if admin user exists
    const adminUser = await User.findOne({ username: "admin" });
    console.log("Found Admin user:", !!adminUser);

    if (!adminUser) {
      console.log(
        "Creating Admin user with username 'admin' and password 'admin123'"
      );
      // Create default admin user with all required fields
      const newAdmin = new User({
        name: "Administrator",
        username: "admin", // Make sure username is set
        email: "admin@example.com",
        password: "admin123", // Will be hashed by pre-save hook
        role: "Admin",
        active: true,
      });

      await newAdmin.save();
      console.log("Admin user created with ID:", newAdmin._id);

      try {
        await logActivity(
          "Default admin user created",
          "System",
          "Initial setup"
        );
      } catch (logError) {
        console.warn("Error logging activity:", logError);
      }

      // Only attempt to send a response if we have a proper response object
      if (res && typeof res.status === "function") {
        return res
          .status(201)
          .json({ message: "Admin user created successfully" });
      }
      return true;
    }

    console.log("Admin user already exists");

    // Only attempt to send a response if we have a proper response object
    if (res && typeof res.status === "function") {
      return res.status(200).json({ message: "Admin user already exists" });
    }
    return true;
  } catch (error) {
    console.error("Error creating admin user:", error);

    // Only attempt to send a response if we have a proper response object
    if (res && typeof res.status === "function") {
      res.status(500).json({ message: "Server error", error: error.message });
    }
    return false;
  }
};

// Create a new user
export const createUser = async (req, res) => {
  try {
    const { name, username, email, password, role } = req.body;

    // Validate input
    if (!name || !username || !email || !password || !role) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Username or email already exists" });
    }

    // Check if role exists
    const roleExists = await Role.findOne({ name: role });
    if (!roleExists) {
      return res.status(400).json({ message: "Role does not exist" });
    }

    // Create user
    const user = new User({
      name,
      username,
      email,
      password,
      role,
      active: true,
    });

    await user.save();

    // Log activity
    await logActivity(
      "User created",
      req.user.name || "System",
      `Created user: ${username} with role: ${role}`
    );

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        active: user.active,
      },
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update a user
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, username, email, role, active, password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check for username or email conflicts
    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      user.username = username;
    }

    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      user.email = email;
    }

    // Update fields
    if (name) user.name = name;
    if (role) {
      // Verify role exists
      const roleExists = await Role.findOne({ name: role });
      if (!roleExists) {
        return res.status(400).json({ message: "Role does not exist" });
      }
      user.role = role;
    }
    if (active !== undefined) user.active = active;
    if (password) user.password = password; // Will be hashed by pre-save hook

    await user.save();

    // Log activity
    await logActivity(
      "User updated",
      req.user.name || "System",
      `Updated user: ${user.username}`
    );

    res.json({
      message: "User updated successfully",
      user: {
        id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        active: user.active,
      },
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a user
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Prevent deletion of admin user
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "Admin" && user.username === "admin") {
      return res
        .status(403)
        .json({ message: "Cannot delete default admin user" });
    }

    await User.findByIdAndDelete(id);

    // Log activity
    await logActivity(
      "User deleted",
      req.user.name || "System",
      `Deleted user: ${user.username}`
    );

    res.json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json(users);
  } catch (error) {
    console.error("Error getting users:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Debug endpoint to check admin
export const checkAdminUser = async (req, res) => {
  try {
    const adminUser = await User.findOne({ username: "admin" });
    if (adminUser) {
      res.json({
        exists: true,
        name: adminUser.name,
        username: adminUser.username || adminUser.email,
        email: adminUser.email,
        role: adminUser.role,
        active: adminUser.active,
        lastLogin: adminUser.lastLogin,
        hasPassword: !!adminUser.password,
      });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Add a debug endpoint to manually create/verify admin user
export const debugAdmin = async (req, res) => {
  try {
    const adminUser = await User.findOne({
      username: { $regex: /^admin$/i },
    });

    if (adminUser) {
      // Update admin user's password but maintain other fields
      console.log("Updating admin password to 'admin123'");

      // Only update the password field, keep other fields intact
      adminUser.password = "admin123";

      // Ensure all required fields are present
      if (!adminUser.email) adminUser.email = "admin@example.com";
      if (!adminUser.name) adminUser.name = "Administrator";
      if (!adminUser.username) adminUser.username = "admin";
      if (!adminUser.role) adminUser.role = "Admin";

      await adminUser.save();

      // Test the password comparison
      const testResult = await adminUser.comparePassword("admin123");

      return res.json({
        message: "Admin user verified and password reset",
        exists: true,
        id: adminUser._id,
        username: adminUser.username,
        name: adminUser.name,
        email: adminUser.email,
        passwordTest: testResult,
      });
    } else {
      // Create a new admin user
      console.log("Creating new admin user");

      const adminRole = await Role.findOne({ name: { $regex: /^admin$/i } });

      if (!adminRole) {
        return res.status(404).json({
          message: "Admin role not found. Please seed roles first.",
        });
      }

      // Ensure all required fields are provided for new user
      const newAdmin = new User({
        name: "Administrator",
        username: "admin",
        email: "admin@example.com",
        password: "admin123",
        role: adminRole.name,
        active: true,
      });

      await newAdmin.save();

      return res.json({
        message: "New admin user created",
        exists: false,
        id: newAdmin._id,
        username: newAdmin.username,
        name: newAdmin.name,
        email: newAdmin.email,
      });
    }
  } catch (error) {
    console.error("Debug admin error:", error);
    return res.status(500).json({ error: error.message });
  }
};
