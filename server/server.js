import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import apiRoutes from "./routes/api.js";
import "./models/ActivityLog.js";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Updated CORS middleware with better configuration for Render.com
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? [process.env.ALLOWED_ORIGIN, "https://evoting-frontend.onrender.com"]
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
    ],
    credentials: true,
    maxAge: 86400, // 24 hours in seconds
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "API is accessible" });
});

// Add health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: Date.now(),
    uptime: process.uptime(),
    mongodb:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Add improved error handling for the bulk import endpoint
app.use("/api/voters/bulk", (req, res, next) => {
  console.log("==== BULK IMPORT MIDDLEWARE ====");
  console.log("Request method:", req.method);
  console.log("Request headers:", JSON.stringify(req.headers, null, 2));

  // Print the raw body
  if (req.method === "POST") {
    try {
      const rawBody = JSON.stringify(req.body, null, 2);
      console.log("Raw request body size:", rawBody.length);
      console.log("Request body sample:", rawBody.substring(0, 500));

      // Check for proper format without rejecting immediately
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

// Add performance middleware before routes
app.use((req, res, next) => {
  // Add basic performance headers
  res.set("X-Response-Time", `${Date.now()}`);

  // Skip caching for dynamic API responses by default
  if (req.path.startsWith("/api/") && !req.path.includes("/static/")) {
    res.set("Cache-Control", "no-cache, no-store");
  }

  next();
});

// Add a global error handler middleware
app.use((err, req, res, next) => {
  console.error("Global error handler caught:", err);

  // Don't expose stack traces in production
  const error =
    process.env.NODE_ENV === "production"
      ? { message: "Internal server error" }
      : { message: err.message, stack: err.stack };

  res.status(err.statusCode || 500).json({
    success: false,
    error,
  });
});

// Connect to MongoDB with improved error handling
console.log("Connecting to MongoDB at:", process.env.MONGODB_URI);
mongoose
  .connect(
    process.env.MONGODB_URI || "mongodb://localhost:27017/eVotingSystem",
    {
      // Remove deprecated options
      retryWrites: true,
      // Add server timeout to prevent hanging connections
      serverSelectionTimeoutMS: 30000,
      // Add connection timeout
      connectTimeoutMS: 10000,
      // Add socket timeout
      socketTimeoutMS: 45000,
    }
  )
  .then(async () => {
    console.log("Connected to MongoDB");
    startServer();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    // Don't exit in production; let the app try to recover
    if (process.env.NODE_ENV !== "production") {
      process.exit(1);
    }
  });

// API Routes
app.use("/api", apiRoutes);

// Serve static files and handle SPA routing in production
if (process.env.NODE_ENV === "production") {
  // Serve any static files
  app.use(express.static("dist"));

  // Handle React routing, return all requests to React app
  app.get("*", function (req, res) {
    res.sendFile("dist/index.html", { root: "." });
  });
}

// Update the port configuration to work better with Render.com
const startServer = () => {
  const PORT = process.env.PORT || 5000;

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`
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
