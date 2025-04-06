import Voter from "../models/Voter.js";
import Vote from "../models/Vote.js";
import Election from "../models/Election.js";
import Position from "../models/Position.js";
import Candidate from "../models/Candidate.js";
import mongoose from "mongoose";
import crypto from "crypto";
// Add proper import for ActivityLog
import ActivityLog from "../models/ActivityLog.js";

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

    // Get all positions for proper reference
    const positions = await Position.find({
      electionId: currentElection._id,
    }).lean();

    // Create position maps
    const positionIdMap = {};
    const positionNameMap = {};

    positions.forEach((position) => {
      // ID -> Name mapping
      if (position._id) {
        positionIdMap[position._id.toString()] = position.title;

        // Also add without quotes if it might be stored that way
        if (typeof position._id === "string") {
          const cleanId = position._id.replace(/"/g, "");
          positionIdMap[cleanId] = position.title;
        }
      }

      // Name -> ID mapping for lookups (NEW)
      if (position.title) {
        positionNameMap[position.title] = position._id.toString();
      }
    });

    console.log("Position name map:", positionNameMap);

    // Generate a vote token as a receipt
    const voteToken = crypto.randomBytes(3).toString("hex").toUpperCase();

    // Get current timestamp for the vote
    const voteTimestamp = new Date();

    // First delete any existing votes for this voter in the current election
    // This helps avoid the duplicate key error
    await Vote.deleteMany({
      voter: voter._id,
      election: currentElection._id,
    });
    console.log(`Cleared any existing votes for voter ${voter._id}`);

    // Track positions already voted for to avoid duplicates
    const positionsVotedFor = new Set();

    // Process selections
    const votes = [];
    if (selections && selections.length > 0) {
      for (const selection of selections) {
        // Find the position to get both ID and name
        const position = await Position.findById(selection.positionId).lean();

        if (!position) {
          console.warn(
            `Position not found for ID: ${selection.positionId}. Skipping.`
          );
          continue;
        }

        // Skip if we've already voted for this position
        const positionKey = position.title;
        if (positionsVotedFor.has(positionKey)) {
          console.warn(
            `Duplicate vote for position: ${positionKey}. Skipping.`
          );
          continue;
        }

        // Mark this position as voted for
        positionsVotedFor.add(positionKey);

        votes.push({
          election: currentElection._id,
          position: position.title, // Store position name
          positionId: position._id, // Also store position ID
          candidate: selection.candidateId,
          voter: voter._id,
          timestamp: voteTimestamp,
          isAbstention: false,
        });
      }
    }

    // Process abstentions separately
    if (abstentions && abstentions.length > 0) {
      for (const positionIdOrName of abstentions) {
        let positionId = null;
        let positionTitle = null;

        // Check if this is a position name rather than an ID
        if (positionNameMap[positionIdOrName]) {
          // If this is a position name/title, get the ID
          positionId = positionNameMap[positionIdOrName];
          positionTitle = positionIdOrName;
          console.log(
            `Converted position name "${positionIdOrName}" to ID "${positionId}"`
          );
        } else if (positionIdMap[positionIdOrName]) {
          // If this is a position ID, get the title
          positionId = positionIdOrName;
          positionTitle = positionIdMap[positionIdOrName];
        } else {
          console.warn(
            `Unknown position identifier: ${positionIdOrName}. Skipping abstention.`
          );
          continue; // Skip this abstention if we can't identify the position
        }

        // Skip if we've already voted for this position through selections
        if (positionsVotedFor.has(positionTitle)) {
          console.warn(
            `Already voted for position "${positionTitle}". Skipping abstention.`
          );
          continue;
        }

        // Mark this position as voted for
        positionsVotedFor.add(positionTitle);

        votes.push({
          election: currentElection._id,
          position: positionTitle,
          positionId: positionId,
          voter: voter._id,
          isAbstention: true,
          timestamp: voteTimestamp,
        });
      }
    }

    // Insert all votes at once (if any)
    if (votes.length > 0) {
      // Use insertMany with ordered:false to continue even if some insertions fail
      const result = await Vote.insertMany(votes, { ordered: false });
      console.log(`Successfully inserted ${result.length} votes`);

      // Create an activity log for the vote submission - fixed implementation
      try {
        await ActivityLog.create({
          action: "vote:submit",
          userId: voter._id,
          user: voter._id,
          entity: "voter",
          entityId: voter._id,
          details: {
            voterId: voter.voterId,
            name: voter.name,
            selections: selections?.length || 0,
            positions: votes.length,
            timestamp: voteTimestamp,
          },
          ipAddress: req.ip || "",
          timestamp: voteTimestamp,
        });

        console.log("Created activity log for vote submission");
      } catch (logError) {
        console.error("Error creating activity log:", logError);
        // Continue execution even if logging fails
      }
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
      votedAt: voteTimestamp.toISOString(),
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
