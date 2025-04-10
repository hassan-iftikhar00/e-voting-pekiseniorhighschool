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

// CORS middleware with proper configuration for Render.com
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? [
            process.env.ALLOWED_ORIGIN,
            "https://evoting-frontend.onrender.com",
            "https://e-voting-frontend-5q4z.onrender.com",
          ]
        : [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
          ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Cache-Control",
      "X-Requested-With",
      "Accept",
      "Pragma", // Add this header
      "Origin", // Add this header
      "If-None-Match", // Add this header
      "ETag", // Add this header
    ],
    credentials: true,
    maxAge: 86400, // 24 hours in seconds
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

app.get("/api/test", (req, res) => {
  res.json({ message: "API is accessible" });
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: Date.now(),
    uptime: process.uptime(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
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

  console.log("============================");
  next();
});

// Performance middleware
app.use((req, res, next) => {
  res.set("X-Response-Time", `${Date.now()}`);

  if (req.path.startsWith("/api/") && !req.path.includes("/static/")) {
    res.set("Cache-Control", "no-cache, no-store");
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

// API Routes - These must come BEFORE the SPA handling
app.use("/api", apiRoutes);

// Server info endpoint - Add a standalone endpoint for health checks
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

// Health check - Keep this outside of API routes for better monitoring
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: Date.now(),
    uptime: process.uptime(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Serve static files and handle SPA routing in production
if (process.env.NODE_ENV === "production") {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));

  // Check multiple possible build paths
  const possiblePaths = ["./dist", "../dist", "../../dist"];

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

// MongoDB connection with improved error handling
console.log("Connecting to MongoDB at:", process.env.MONGODB_URI);
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/eVotingSystem",
    {
      retryWrites: true,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 45000,
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
    }
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
