import Voter from "../models/Voter.js";
import Vote from "../models/Vote.js";
import Election from "../models/Election.js";
import Position from "../models/Position.js";
import Candidate from "../models/Candidate.js";
import mongoose from "mongoose";

// Submit a vote
export const submitVote = async (req, res) => {
  try {
    console.log("Vote submission request received:", req.body);

    const { voterId, selections, abstentions } = req.body;

    if (!voterId) {
      return res
        .status(400)
        .json({ success: false, message: "Voter ID is required" });
    }

    // Verify the voter exists and hasn't voted yet
    const voter = await Voter.findOne({ voterId: voterId });

    if (!voter) {
      return res
        .status(404)
        .json({ success: false, message: "Voter not found" });
    }

    if (voter.hasVoted) {
      return res
        .status(400)
        .json({ success: false, message: "Voter has already cast a vote" });
    }

    // Get the current election
    const currentElection = await Election.findOne({ isCurrent: true });
    if (!currentElection) {
      return res
        .status(404)
        .json({ success: false, message: "No active election found" });
    }

    // Validate the vote data
    if (!selections || !Array.isArray(selections)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vote data: selections must be an array",
      });
    }

    // Create individual vote records for each selection
    const votePromises = selections.map(async (selection) => {
      // Make sure position is not undefined
      const positionName =
        selection.position === "undefined"
          ? "Unknown Position"
          : selection.position;

      // Create candidate ObjectId only if candidateId exists and is valid
      let candidateId = null;
      if (
        selection.candidateId &&
        String(selection.candidateId).match(/^[0-9a-fA-F]{24}$/)
      ) {
        candidateId = new mongoose.Types.ObjectId(selection.candidateId);
      }

      // Create a new vote document with direct properties (not nested)
      const vote = new Vote({
        voter: voter._id,
        election: currentElection._id,
        position: positionName,
        candidate: candidateId,
        timestamp: new Date(),
        isAbstention: false,
      });

      return vote.save();
    });

    // Add abstention votes
    if (abstentions && Array.isArray(abstentions)) {
      abstentions.forEach((ab) => {
        const positionName =
          ab.position === "undefined" ? "Unknown Position" : ab.position;

        const vote = new Vote({
          voter: voter._id,
          election: currentElection._id,
          position: positionName,
          timestamp: new Date(),
          isAbstention: true,
        });

        votePromises.push(vote.save());
      });
    }

    // Wait for all votes to be saved
    await Promise.all(votePromises);

    // Mark the voter as having voted
    voter.hasVoted = true;
    voter.votedAt = new Date();
    await voter.save();

    // Return success
    return res.status(200).json({
      success: true,
      message: "Vote submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting vote:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to submit vote",
      error: error.message,
    });
  }
};

// Add a simple vote model retrieval function
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
