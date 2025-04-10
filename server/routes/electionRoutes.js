import express from "express";
import Election from "../models/Election.js";

const router = express.Router();

// Modify the route for getting election status to implement caching and reduce logging
router.get("/status", async (req, res) => {
  try {
    // Get cache timestamp query parameter (if provided by client)
    const timestamp = req.query.timestamp;

    // Implement cache response headers
    res.set("Cache-Control", "private, max-age=15"); // Allow client caching for 15 seconds

    // Find current election
    const election = await Election.findOne({ isCurrent: true });

    // If no election exists, create a default response
    if (!election) {
      return res.status(404).json({
        message: "No active election found",
        isActive: false,
        date: new Date().toISOString().split("T")[0],
      });
    }

    // Only log on server once per minute using a simple timestamp check
    const currentMinute = Math.floor(Date.now() / 60000);
    if (
      !global.lastElectionStatusLogMinute ||
      global.lastElectionStatusLogMinute !== currentMinute
    ) {
      console.log("Sending election status with:", {
        startDate: election.startDate,
        endDate: election.endDate,
        date: election.date,
        isActive: election.isActive,
      });
      global.lastElectionStatusLogMinute = currentMinute;
    }

    // Send response with election data
    res.json({
      _id: election._id,
      title: election.title,
      date: election.date,
      startDate: election.startDate || election.date,
      endDate: election.endDate || election.date,
      startTime: election.startTime || "08:00",
      endTime: election.endTime || "16:00",
      isActive: election.isActive,
      resultsPublished: election.resultsPublished,
    });
  } catch (error) {
    console.error("Error fetching election status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
