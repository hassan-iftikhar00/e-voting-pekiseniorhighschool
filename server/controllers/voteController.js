import Vote from "../models/Vote.js";
import Voter from "../models/Voter.js";
import Candidate from "../models/Candidate.js";

// Submit a vote - ensure this is properly exported
export const submitVote = async (req, res) => {
  try {
    const { voterId, selections } = req.body;

    // Validate required fields
    if (!voterId || !selections || !Object.keys(selections).length) {
      return res.status(400).json({
        success: false,
        message: "Voter ID and selections are required",
      });
    }

    // Find the voter
    const voter = await Voter.findOne({ voterId });
    if (!voter) {
      return res.status(404).json({
        success: false,
        message: "Voter not found",
      });
    }

    // Check if voter has already voted
    if (voter.hasVoted) {
      return res.status(400).json({
        success: false,
        message: "Voter has already cast a vote",
      });
    }

    // Process each vote
    const votePromises = Object.entries(selections).map(
      async ([positionId, candidateId]) => {
        // Create vote record
        const vote = new Vote({
          voter: voter._id,
          position: positionId,
          candidate: candidateId,
          timestamp: new Date(),
        });

        await vote.save();

        // Increment candidate vote count
        await Candidate.findByIdAndUpdate(candidateId, { $inc: { votes: 1 } });

        return vote;
      }
    );

    // Wait for all votes to be processed
    await Promise.all(votePromises);

    // Update voter status
    voter.hasVoted = true;
    voter.votedAt = new Date();
    await voter.save();

    res.status(200).json({
      success: true,
      message: "Vote submitted successfully",
    });
  } catch (error) {
    console.error("Error submitting vote:", error);
    res.status(500).json({
      success: false,
      message: "Error submitting vote",
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
