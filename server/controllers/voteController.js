import Voter from "../models/Voter.js";
import Vote from "../models/Vote.js";
import Election from "../models/Election.js";
import Position from "../models/Position.js";
import Candidate from "../models/Candidate.js";
import mongoose from "mongoose";
import crypto from "crypto";

// Submit a vote
export const submitVote = async (req, res) => {
  try {
    const { voterId, selections, abstentions } = req.body;

    // Validate request
    if (!voterId) {
      return res.status(400).json({ message: "Voter ID is required" });
    }

    // Find the voter
    const voter = await Voter.findOne({ voterId });
    if (!voter) {
      return res.status(404).json({ message: "Voter not found" });
    }

    // Check if voter has already voted
    if (voter.hasVoted) {
      return res
        .status(400)
        .json({ message: "Voter has already cast their vote" });
    }

    // Get the current election
    const currentElection = await Election.findOne({ isCurrent: true });
    if (!currentElection) {
      return res.status(404).json({ message: "No active election found" });
    }

    // Generate a vote token as a receipt
    const voteToken = crypto.randomBytes(3).toString("hex").toUpperCase();

    // Get current timestamp for the vote
    const voteTimestamp = new Date();

    // Process selections
    if (selections && selections.length > 0) {
      const votes = selections.map((selection) => ({
        electionId: currentElection._id,
        position: selection.positionId,
        candidate: selection.candidateId,
        voterId: voter._id,
      }));

      await Vote.insertMany(votes);
    }

    // Mark voter as having voted
    voter.hasVoted = true;
    voter.votedAt = voteTimestamp;
    voter.voteToken = voteToken;
    await voter.save();

    // Return success response with token AND timestamp
    res.status(200).json({
      success: true,
      message: "Vote submitted successfully",
      voteToken,
      votedAt: voteTimestamp.toISOString(), // Include ISO formatted timestamp
    });
  } catch (error) {
    console.error("Vote submission error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all votes
export const getVotes = async (req, res) => {
  try {
    const votes = await Vote.find().populate("voter").populate("candidate");
    res.status(200).json(votes);
  } catch (error) {
    console.error("Error getting votes:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving votes",
      error: error.message,
    });
  }
};
