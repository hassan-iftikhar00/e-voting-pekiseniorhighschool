import express from "express";
import * as electionController from "../controllers/electionController.js";
import * as settingController from "../controllers/settingController.js";
import * as voterController from "../controllers/voterController.js";
import * as adminController from "../controllers/adminController.js";
import * as positionController from "../controllers/positionController.js";
import * as candidateController from "../controllers/candidateController.js";
import * as yearController from "../controllers/yearController.js";
import * as classController from "../controllers/classController.js";
import * as houseController from "../controllers/houseController.js";
import * as logController from "../controllers/logController.js";
import * as roleController from "../controllers/roleController.js";
import * as authController from "../controllers/authController.js";
import * as analyticsController from "../controllers/analyticsController.js";
import { authenticateToken, checkPermission } from "../middleware/auth.js";
import { getCandidatesByPosition } from "../controllers/candidateController.js";
import {
  getRecentVoters,
  validateVoter,
} from "../controllers/voterController.js";
import { submitVote } from "../controllers/voteController.js";
import User from "../models/User.js"; // Add this import for the User model
import Setting from "../models/Setting.js"; // Add this import for the Setting model
import Election from "../models/Election.js"; // Add this import for the Election model
import { getCandidatesForVoter } from "../controllers/candidateController.js";

const router = express.Router();

// Election routes
router.get("/elections/stats", electionController.getElectionStats);
router.get("/elections/status", electionController.getElectionStatus);
router.get("/elections", electionController.getAllElections);
router.post(
  "/elections",
  authenticateToken,
  checkPermission({ page: "elections", action: "add" }),
  electionController.createElection
);
router.post(
  "/elections/default",
  authenticateToken,
  checkPermission({ page: "elections", action: "add" }),
  electionController.createDefaultElection
);
router.put(
  "/elections/:id/current",
  authenticateToken,
  checkPermission({ page: "elections", action: "edit" }),
  electionController.setCurrentElection
);
router.delete(
  "/elections/:id",
  authenticateToken,
  checkPermission({ page: "elections", action: "delete" }),
  electionController.deleteElection
);
router.get("/elections/results", electionController.getElectionResults); // Current election results
router.get(
  "/elections/:electionId/results",
  electionController.getElectionResults
); // Specific election results
router.get(
  "/elections/detailed-vote-analysis",
  electionController.getDetailedVoteAnalysis
); // Add this new route

// Add this new route for toggling election status
router.post(
  "/election/toggle",
  authenticateToken,
  electionController.toggleElectionStatus
);

// Results endpoints
router.get("/results", electionController.getResults);
router.get("/election/status", electionController.getElectionStatus);
router.post(
  "/election/toggle-results",
  authenticateToken,
  checkPermission({ page: "results", action: "edit" }),
  electionController.toggleResultsPublication
);

// Settings routes
router.get("/settings", settingController.getSettings);
router.put(
  "/settings",
  authenticateToken,
  checkPermission({ page: "settings", action: "edit" }),
  settingController.updateSettings
);
router.post(
  "/settings/backup",
  authenticateToken,
  checkPermission({ page: "settings", action: "add" }),
  settingController.createBackup
);
router.post(
  "/settings/restore",
  authenticateToken,
  checkPermission({ page: "settings", action: "add" }),
  settingController.restoreSystem
);

// Add this route

// Settings existence check - Fix by using imported Setting model
router.get("/settings/check-exists", async (req, res) => {
  try {
    const settings = await Setting.findOne();
    res.status(200).json({ exists: !!settings });
  } catch (error) {
    console.error("Error checking settings existence:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Voter routes
router.get("/voters", voterController.getAllVoters);
router.post(
  "/voters",
  authenticateToken,
  checkPermission({ page: "voters", action: "add" }),
  voterController.createVoter
);

// Add debug middleware to log requests for bulk voter import
router.post(
  "/voters/bulk",
  (req, res, next) => {
    console.log("==== BULK IMPORT DEBUG ====");
    console.log("Request body received:", JSON.stringify(req.body, null, 2));
    console.log("Voters array length:", req.body.voters?.length || 0);

    if (req.body.voters && req.body.voters.length > 0) {
      console.log(
        "First voter sample:",
        JSON.stringify(req.body.voters[0], null, 2)
      );
    } else {
      console.log("No voter data found in request body");
    }

    // Continue to the actual controller
    next();
  },
  authenticateToken,
  checkPermission({ page: "voters", action: "add" }),
  voterController.bulkAddVoters
);

// Debug the bulk voters endpoint by adding a test route
router.get("/voters/bulk-test", async (req, res) => {
  try {
    const currentElection = await Election.findOne({ isCurrent: true });
    if (!currentElection) {
      return res.status(400).json({
        message: "No active election found",
        hint: "Run the diagnostics.js script to create a test election",
      });
    }

    return res.status(200).json({
      message: "Endpoint is working, active election exists",
      electionId: currentElection._id,
      electionTitle: currentElection.title,
    });
  } catch (error) {
    console.error("Bulk test error:", error);
    return res
      .status(500)
      .json({ message: "Test route error", error: error.message });
  }
});

router.put(
  "/voters/:id",
  authenticateToken,
  checkPermission({ page: "voters", action: "edit" }),
  voterController.updateVoter
); // Add this missing route
router.put(
  "/voters/:id/vote",
  authenticateToken,
  checkPermission({ page: "voters", action: "edit" }),
  voterController.markVoterAsVoted
);
router.delete(
  "/voters/:id",
  authenticateToken,
  checkPermission({ page: "voters", action: "delete" }),
  voterController.deleteVoter
);

// Add this new route for voter statistics
router.get("/voters/stats", authenticateToken, voterController.getVoterStats);

// Admin routes
router.post("/admin/seed", adminController.seedTestData);

// Position routes
router.get("/positions", positionController.getAllPositions);
router.post(
  "/positions",
  authenticateToken,
  checkPermission({ page: "positions", action: "add" }),
  positionController.createPosition
);
router.post("/positions/seed", positionController.seedDefaultPositions);
router.put(
  "/positions/:id",
  authenticateToken,
  checkPermission({ page: "positions", action: "edit" }),
  positionController.updatePosition
);
router.put(
  "/positions/:id/order",
  authenticateToken,
  checkPermission({ page: "positions", action: "edit" }),
  positionController.updatePositionOrder
);
router.delete(
  "/positions/:id",
  authenticateToken,
  checkPermission({ page: "positions", action: "delete" }),
  positionController.deletePosition
);

// Candidate routes
router.get("/candidates", candidateController.getAllCandidates);
router.post(
  "/candidates",
  authenticateToken,
  checkPermission({ page: "candidates", action: "add" }),
  candidateController.createCandidate
);
router.put(
  "/candidates/:id",
  authenticateToken,
  checkPermission({ page: "candidates", action: "edit" }),
  candidateController.updateCandidate
);
router.delete(
  "/candidates/:id",
  authenticateToken,
  checkPermission({ page: "candidates", action: "delete" }),
  candidateController.deleteCandidate
);
router.get("/candidates/for-voter", getCandidatesForVoter);

// Year routes
router.get("/years", yearController.getAllYears);
router.post(
  "/years",
  authenticateToken,
  checkPermission({ page: "years", action: "add" }),
  yearController.createYear
);
router.put(
  "/years/:id",
  authenticateToken,
  checkPermission({ page: "years", action: "edit" }),
  yearController.updateYear
);
router.put(
  "/years/:id/active",
  authenticateToken,
  checkPermission({ page: "years", action: "edit" }),
  yearController.setActiveYear
);
router.delete(
  "/years/:id",
  authenticateToken,
  checkPermission({ page: "years", action: "delete" }),
  yearController.deleteYear
);

// Class routes
router.get("/classes", classController.getAllClasses);
router.post(
  "/classes",
  authenticateToken,
  checkPermission({ page: "classes", action: "add" }),
  classController.createClass
);
router.put(
  "/classes/:id",
  authenticateToken,
  checkPermission({ page: "classes", action: "edit" }),
  classController.updateClass
);
router.put(
  "/classes/:id/toggle-status",
  authenticateToken,
  checkPermission({ page: "classes", action: "edit" }),
  classController.toggleClassStatus
);
router.delete(
  "/classes/:id",
  authenticateToken,
  checkPermission({ page: "classes", action: "delete" }),
  classController.deleteClass
);

// House routes
router.get("/houses", houseController.getAllHouses);
router.post(
  "/houses",
  authenticateToken,
  checkPermission({ page: "houses", action: "add" }),
  houseController.createHouse
);
router.put(
  "/houses/:id",
  authenticateToken,
  checkPermission({ page: "houses", action: "edit" }),
  houseController.updateHouse
);
router.put(
  "/houses/:id/toggle-status",
  authenticateToken,
  checkPermission({ page: "houses", action: "edit" }),
  houseController.toggleHouseStatus
);
router.delete(
  "/houses/:id",
  authenticateToken,
  checkPermission({ page: "houses", action: "delete" }),
  houseController.deleteHouse
);

// Log routes
router.get("/logs", logController.getAllLogs);
router.post(
  "/logs",
  authenticateToken,
  checkPermission({ page: "logs", action: "add" }),
  logController.createLog
);
router.post(
  "/logs/clear",
  authenticateToken,
  checkPermission({ page: "logs", action: "delete" }),
  logController.clearLogs
);

// Role routes
router.get("/roles", roleController.getAllRoles);
router.post(
  "/roles",
  authenticateToken,
  checkPermission({ page: "roles", action: "add" }),
  roleController.createRole
);
router.put(
  "/roles/:id",
  authenticateToken,
  checkPermission({ page: "roles", action: "edit" }),
  roleController.updateRole
);
router.delete(
  "/roles/:id",
  authenticateToken,
  checkPermission({ page: "roles", action: "delete" }),
  roleController.deleteRole
);
router.put(
  "/roles/:id/toggle-status",
  authenticateToken,
  checkPermission({ page: "roles", action: "edit" }),
  roleController.toggleRoleStatus
);
router.post("/roles/seed", roleController.seedDefaultRoles);

// Auth routes - add debug endpoint
router.post("/auth/login", authController.login);
router.get("/auth/me", authenticateToken, authController.getCurrentUser);
router.post("/auth/seed-admin", authController.seedAdminUser);
router.get("/auth/debug-admin", authController.debugAdmin); // Add this debug route

// Public routes that don't require authentication
router.post("/auth/login", authController.login);
router.post("/auth/register", authController.register);
// router.post("/auth/forgot-password", authController.forgotPassword);
// router.post("/auth/reset-password", authController.resetPassword);

// Public API endpoints needed for the voting system
router.get("/candidates/byPosition", getCandidatesByPosition);
router.get("/voters/recent", getRecentVoters);
router.post("/voters/validate", validateVoter);

// Define submitVote route with a direct function reference, not by variable name
router.post("/votes/submit", submitVote);

// Analytics routes
router.get(
  "/analytics/voting-patterns",
  authenticateToken,
  checkPermission({ page: "analytics", action: "view" }),
  analyticsController.getVotingPatterns
);

router.get(
  "/analytics/position/:positionId/results",
  authenticateToken,
  checkPermission({ page: "analytics", action: "view" }),
  analyticsController.getPositionResults
);

// Simple test endpoint to check which port is active - NO AUTH REQUIRED
router.get("/server-info", (req, res) => {
  res.json({
    status: "online",
    port: process.env.PORT || 5000,
    version: "1.0",
    timestamp: new Date().toISOString(),
  });
});

// Add a simplified version of the bulk import endpoint
router.post("/voters/bulk-simple", async (req, res) => {
  try {
    console.log("==== BULK SIMPLE IMPORT ENDPOINT ====");

    // Validate request structure
    if (!req.body.voters || !Array.isArray(req.body.voters)) {
      return res.status(400).json({
        message: "Invalid request format - missing voters array",
        success: 0,
        failed: 0,
        errors: ["Request must include a voters array"],
      });
    }

    const { voters } = req.body;
    console.log(`Processing ${voters.length} voters in simplified endpoint`);

    // Find current election
    const election = await mongoose
      .model("Election")
      .findOne({ isCurrent: true });
    if (!election) {
      return res.status(400).json({
        message: "No active election found",
        success: 0,
        failed: voters.length,
        errors: ["No active election found"],
      });
    }

    // Simple counter for results
    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // Create voters with minimal processing
    const Voter = mongoose.model("Voter");

    for (const voterData of voters) {
      try {
        // Basic validation
        if (
          !voterData.name ||
          !voterData.gender ||
          !voterData.class ||
          !voterData.year ||
          !voterData.house
        ) {
          results.failed++;
          results.errors.push(
            `Missing required fields for voter: ${JSON.stringify(voterData)}`
          );
          continue;
        }

        // Normalize gender
        const normalizedGender = voterData.gender.toLowerCase().includes("f")
          ? "Female"
          : "Male";

        // Create voter
        const newVoter = new Voter({
          name: voterData.name,
          gender: normalizedGender,
          class: voterData.class,
          year: voterData.year,
          house: voterData.house,
          hasVoted: false,
          votedAt: null,
          electionId: election._id,
        });

        await newVoter.save();
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push(error.message);
      }
    }

    // Update election counter
    election.totalVoters += results.success;
    await election.save();

    return res.status(200).json({
      message: `Imported ${results.success} voters successfully with ${results.failed} failures`,
      success: results.success,
      failed: results.failed,
      errors: results.errors,
    });
  } catch (error) {
    console.error("Bulk simple import error:", error);
    return res.status(500).json({
      message: "Server error during import",
      error: error.message,
      success: 0,
      failed: req.body?.voters?.length || 0,
      errors: [error.message],
    });
  }
});

// Protected Routes - all routes below this middleware require authentication
router.use(authenticateToken);

// User routes
router.get(
  "/users",
  checkPermission("users", "view"),
  authController.getAllUsers
);
router.post(
  "/users",
  checkPermission("users", "add"),
  authController.createUser
);
router.put(
  "/users/:id",
  checkPermission("users", "edit"),
  authController.updateUser
);
router.delete(
  "/users/:id",
  checkPermission("users", "delete"),
  authController.deleteUser
);

// Users by role endpoint (after authentication middleware)
router.get(
  "/users-by-role",
  checkPermission("roles", "view"),
  async (req, res) => {
    try {
      const users = await User.find().select("username email role");

      // Group users by role
      const usersByRole = {};

      for (const user of users) {
        const roleName =
          typeof user.role === "object" ? user.role.name : user.role;

        if (!usersByRole[roleName]) {
          usersByRole[roleName] = [];
        }

        usersByRole[roleName].push({
          id: user._id,
          username: user.username,
          email: user.email,
        });
      }

      res.status(200).json(usersByRole);
    } catch (error) {
      console.error("Error fetching users by role:", error);
      res.status(500).json({
        message: "Error fetching users by role",
        error: error.message,
      });
    }
  }
);

// Users by role endpoint - Add special admin check
router.get("/users-by-role", async (req, res) => {
  try {
    // Double-check admin role for extra security
    const isAdmin =
      req.user?.role?.name?.toLowerCase() === "admin" ||
      (typeof req.user?.role === "string" &&
        req.user?.role.toLowerCase() === "admin");

    if (!isAdmin) {
      console.log("Non-admin tried to access users-by-role", req.user);
      return res.status(403).json({ message: "Admin access required" });
    }

    // Get all users with their roles
    const users = await User.find().select("username email role");

    // Group users by role
    const usersByRole = {};

    for (const user of users) {
      const roleName =
        typeof user.role === "object" ? user.role.name : user.role;

      if (!usersByRole[roleName]) {
        usersByRole[roleName] = [];
      }

      usersByRole[roleName].push({
        id: user._id,
        username: user.username,
        email: user.email,
      });
    }

    res.status(200).json(usersByRole);
  } catch (error) {
    console.error("Error fetching users by role:", error);
    res
      .status(500)
      .json({ message: "Error fetching users by role", error: error.message });
  }
});

// Vote submission
router.post("/votes/submit", submitVote);

export default router;
