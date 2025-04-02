import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import apiRoutes from "./routes/api.js";
import { dropVoteUniqueIndex } from "./models/Vote.js";

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

// Connect to MongoDB
console.log("Connecting to MongoDB at:", process.env.MONGODB_URI);
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/eVotingSystem")
  .then(async () => {
    console.log("Connected to MongoDB");

    // Drop the problematic index on server startup
    await dropVoteUniqueIndex();

    // Start the server
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
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

export default app;
