import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import apiRoutes from "./routes/api.js";
import { dropVoteUniqueIndex } from "./models/Vote.js";
import "./models/ActivityLog.js";

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

app.get("/", (req, res) => {
  res.send("Server is running");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "API is accessible" });
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

// Connect to MongoDB
console.log("Connecting to MongoDB at:", process.env.MONGODB_URI);
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/eVotingSystem")
  .then(async () => {
    console.log("Connected to MongoDB");

    // Drop the problematic index on server startup
    await dropVoteUniqueIndex();

    // Start the server
    startServer();
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// API Routes
app.use("/api", apiRoutes);

// Log all registered routes
console.log("Registered routes:");
app._router.stack.forEach((middleware) => {
  if (middleware.route) {
    // Routes registered directly
    console.log(
      `${Object.keys(middleware.route.methods).join(", ").toUpperCase()} ${
        middleware.route.path
      }`
    );
  } else if (middleware.name === "router") {
    // Routes added via router
    middleware.handle.stack.forEach((handler) => {
      if (handler.route) {
        console.log(
          `${Object.keys(handler.route.methods).join(", ").toUpperCase()} /api${
            handler.route.path
          }`
        );
      }
    });
  }
});

// Update the port configuration to use a fallback if 5000 is in use
const startServer = () => {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  server.on("error", (e) => {
    if (e.code === "EADDRINUSE") {
      console.log(`Port ${PORT} is busy, trying ${PORT + 1}...`);
      setTimeout(() => {
        server.close();
        app.listen(PORT + 1, () => {
          console.log(`Server running on port ${PORT + 1}`);
        });
      }, 1000);
    } else {
      console.error("Server error:", e);
    }
  });
};

export default app;
