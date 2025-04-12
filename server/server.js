import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import apiRoutes from "./routes/api.js";
import "./models/ActivityLog.js";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Simple in-memory cache for critical data
const cache = {
  electionStatus: null,
  electionStatusTime: null,
  settings: null,
  settingsTime: null,
};

// Cache duration in ms (5 minutes)
const CACHE_DURATION = 5 * 60 * 1000;

// Middleware to attach cache to request object
app.use((req, res, next) => {
  req.cache = cache;
  next();
});

// CORS middleware with proper configuration for Render.com
app.use(
  cors({
    origin: [
      "https://e-voting-frontend-5q4z.onrender.com",
      "http://localhost:3000",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      process.env.ALLOWED_ORIGIN, // Also keep this for flexibility
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "X-Requested-With",
      "Accept",
      "Pragma",
      "Origin",
      "If-None-Match",
      "ETag",
    ],
    credentials: true,
    maxAge: 86400,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Body parser middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Basic routes
app.get("/", (req, res) => {
  res.send("Server is running");
});

// Quick election status endpoint (with caching)
app.get("/api/election-status-quick", async (req, res) => {
  try {
    const now = Date.now();

    // Check if we have a cached valid election status
    if (
      cache.electionStatus &&
      now - cache.electionStatusTime < CACHE_DURATION
    ) {
      console.log("Serving election status from cache");
      return res.json(cache.electionStatus);
    }

    // If no cache, fetch from database with timeout protection
    const Election = mongoose.model("Election");
    const Setting = mongoose.model("Setting");

    // Create timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("Election status query timed out")),
        5000
      );
    });

    // Use faster query with lean() to get only what we need
    const electionQuery = Election.findOne({ isCurrent: true })
      .select(
        "title date startDate endDate startTime endTime isActive resultsPublished"
      )
      .lean();

    // Race against timeout
    let election;
    try {
      election = await Promise.race([electionQuery, timeoutPromise]);
    } catch (timeoutError) {
      console.warn("Election query timed out, using cached data if available");

      // If we have cached data, use it
      if (cache.electionStatus) {
        return res.json(cache.electionStatus);
      }

      // Create a minimal fallback
      return res.json({
        title: "Election",
        date: new Date().toISOString().split("T")[0],
        isActive: true,
        startTime: "08:00:00",
        endTime: "16:00:00",
      });
    }

    if (!election) {
      return res.status(404).json({ message: "No active election found" });
    }

    // Fetch settings only if we need to - with timeout
    let settings = null;
    try {
      const settingsQuery = Setting.findOne()
        .select("votingStartDate votingEndDate votingStartTime votingEndTime")
        .lean();

      settings = await Promise.race([
        settingsQuery,
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Settings query timeout")), 3000)
        ),
      ]);
    } catch (settingsError) {
      console.warn(
        "Settings query for election status timed out, proceeding with election data only"
      );
    }

    // Merge data and fill in gaps
    const response = {
      ...election,
      startDate:
        election.startDate ||
        (settings ? settings.votingStartDate : election.date),
      endDate:
        election.endDate || (settings ? settings.votingEndDate : election.date),
      startTime:
        election.startTime ||
        (settings ? settings.votingStartTime + ":00" : "08:00:00"),
      endTime:
        election.endTime ||
        (settings ? settings.votingEndTime + ":00" : "16:00:00"),
    };

    // Cache the result
    cache.electionStatus = response;
    cache.electionStatusTime = now;

    console.log("Sending election status with:", {
      startDate: response.startDate,
      endDate: response.endDate,
      date: response.date,
      isActive: response.isActive,
    });

    return res.json(response);
  } catch (error) {
    console.error("Error in quick election status:", error);

    // If we have a cache, use it even on error
    if (cache.electionStatus) {
      return res.json(cache.electionStatus);
    }

    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

// API Routes - Mount apiRoutes to /api
app.use("/api", apiRoutes);

// Add the server-info and health endpoints with /api prefix
// This duplicates them for backward compatibility
app.get("/api/server-info", (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.set("Access-Control-Max-Age", "600");
  res.json({
    status: "online",
    port: process.env.PORT || 5000,
    timestamp: Date.now(),
    serverTime: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: Date.now(),
    uptime: process.uptime(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Also keep the original routes for backward compatibility
app.get("/server-info", (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.set("Access-Control-Max-Age", "600");
  res.json({
    status: "online",
    port: process.env.PORT || 5000,
    timestamp: Date.now(),
    serverTime: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
  });
});

// Enhanced health check endpoint
app.get("/health", (req, res) => {
  // Get MongoDB connection state text
  const mongoStates = [
    "disconnected",
    "connected",
    "connecting",
    "disconnecting",
    "uninitialized",
  ];

  const mongoReadyState = mongoose.connection.readyState;
  const mongoStatus = mongoStates[mongoReadyState] || "unknown";

  // Check if we have a recent successful query
  const dbHealthy = mongoReadyState === 1;

  // Get memory usage
  const memoryUsage = process.memoryUsage();

  // Get cache status
  const cacheStatus = {
    electionStatus: !!cache.electionStatus,
    electionStatusTime: cache.electionStatusTime
      ? new Date(cache.electionStatusTime).toISOString()
      : null,
    settings: !!cache.settings,
    settingsTime: cache.settingsTime
      ? new Date(cache.settingsTime).toISOString()
      : null,
  };

  res.status(200).json({
    status: dbHealthy ? "ok" : "degraded",
    timestamp: Date.now(),
    uptime: process.uptime(),
    mongodb: {
      status: mongoStatus,
      connected: dbHealthy,
      connectionTime: mongoose.connection.openTime
        ? new Date(mongoose.connection.openTime).toISOString()
        : null,
    },
    memory: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + "MB",
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + "MB",
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + "MB",
    },
    cache: cacheStatus,
    version: process.env.npm_package_version || "1.0.0",
  });
});

// Debug middleware for bulk import
app.use("/api/voters/bulk", (req, res, next) => {
  console.log("==== BULK IMPORT MIDDLEWARE ====");
  console.log("Request method:", req.method);
  console.log("Request headers:", JSON.stringify(req.headers, null, 2));

  if (req.method === "POST") {
    try {
      const rawBody = JSON.stringify(req.body, null, 2);
      console.log("Raw request body size:", rawBody.length);
      console.log("Request body sample:", rawBody.substring(0, 500));

      if (!req.body || !req.body.voters) {
        console.log("⚠️ Warning: Missing voters array in request body");
      } else if (!Array.isArray(req.body.voters)) {
        console.log(
          "⚠️ Warning: Body.voters is not an array, it is:",
          typeof req.body.voters
        );
      } else {
        console.log(
          `✅ Valid voters array with ${req.body.voters.length} items`
        );
      }
    } catch (error) {
      console.error("Error parsing/logging request body:", error);
    }
  }

  next();
});

// Global error handler middleware
app.use((err, req, res, next) => {
  console.error("Global error handler caught:", err);

  const error =
    process.env.NODE_ENV === "production"
      ? { message: "Internal server error" }
      : { message: err.message, stack: err.stack };

  res.status(err.statusCode || 500).json({
    success: false,
    error,
  });
});

// Serve static files and handle SPA routing in production
if (process.env.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  // Check multiple possible build paths
  const possiblePaths = ["./dist", "../dist", "../../dist", "./server/dist"];

  let staticPath = null;
  for (const path of possiblePaths) {
    try {
      const fullPath = fs.realpathSync(path);
      if (fs.existsSync(fullPath)) {
        console.log(`Found static files in: ${fullPath}`);
        staticPath = fullPath;
        break;
      }
    } catch (error) {
      console.log(`Error checking path ${path}:`, error.message);
    }
  }

  if (staticPath) {
    // Serve static files
    app.use(express.static(staticPath));

    // Handle SPA routing - IMPORTANT: This needs to come AFTER API routes
    // This handler explicitly excludes /api and other backend-specific paths
    app.get("*", (req, res, next) => {
      // Skip API routes and other backend endpoints
      if (
        req.path.startsWith("/api/") ||
        req.path === "/health" ||
        req.path === "/server-info"
      ) {
        return next();
      }

      // Otherwise serve the SPA index.html
      res.sendFile(path.join(staticPath, "index.html"));
    });
  } else {
    console.warn("No static files found for production mode!");
  }
}

// Add MongoDB query debugging in development
if (process.env.NODE_ENV !== "production") {
  const SLOW_QUERY_THRESHOLD_MS = 1000; // 1 second

  mongoose.set("debug", (collectionName, methodName, ...methodArgs) => {
    const startTime = Date.now();

    // Return a custom function for the callback
    return () => {
      const endTime = Date.now();
      const elapsedTime = endTime - startTime;

      if (elapsedTime > SLOW_QUERY_THRESHOLD_MS) {
        console.warn(
          `[SLOW QUERY] ${collectionName}.${methodName} took ${elapsedTime}ms`
        );
      }
    };
  });
}

// MongoDB connection with improved error handling and optimized settings
console.log("Connecting to MongoDB at:", process.env.MONGODB_URI);
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/eVotingSystem",
    {
      retryWrites: true,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      // Add performance optimizations
      maxPoolSize: 20,
      minPoolSize: 5,
      maxIdleTimeMS: 60000,
      // Add read preference to prefer reading from secondaries if available
      readPreference: "primaryPreferred",
      // Add connection pool monitoring
      heartbeatFrequencyMS: 30000,
      // Enable driver level retries for reads
      retryReads: true,
    }
  )
  .then(() => {
    console.log("Connected to MongoDB");
    startServer();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    if (process.env.NODE_ENV !== "production") {
      process.exit(1);
    } else {
      // In production, try to start server anyway
      console.log(
        "Attempting to start server despite MongoDB connection issues"
      );
      startServer();
    }
  });

// Add connection event listeners for better monitoring
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected, attempting to reconnect...");
});

mongoose.connection.on("reconnected", () => {
  console.log("MongoDB reconnected successfully");
});

// Server startup function
const startServer = () => {
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Server running in ${
        process.env.NODE_ENV || "development"
      } mode on port ${PORT}`
    );
    if (process.env.NODE_ENV !== "production") {
      console.log(`Access server at http://localhost:${PORT}`);
    }
  });

  server.on("error", (e) => {
    if (e.code === "EADDRINUSE") {
      console.log(`Port ${PORT} is busy, trying ${PORT + 1}...`);
      setTimeout(() => {
        server.close();
        app.listen(PORT + 1, "0.0.0.0", () => {
          console.log(`Server running on port ${PORT + 1}`);
        });
      }, 1000);
    } else {
      console.error("Server error:", e);
    }
  });
};

export default app;
