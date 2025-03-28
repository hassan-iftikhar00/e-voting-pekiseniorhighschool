import Vote from "../models/Vote.js";
import Voter from "../models/Voter.js";
import Position from "../models/Position.js";
import Candidate from "../models/Candidate.js";
import Class from "../models/Class.js";
import House from "../models/House.js";
import Year from "../models/Year.js";

// Get detailed voting patterns for analytics
export const getVotingPatterns = async (req, res) => {
  try {
    const { position, from, to } = req.query;

    // Build filter for votes
    const filter = {};

    // Filter by date range if provided
    if (from || to) {
      filter.timestamp = {};
      if (from) {
        filter.timestamp.$gte = new Date(from);
      }
      if (to) {
        // Set time to end of day for the 'to' date
        const endDate = new Date(to);
        endDate.setHours(23, 59, 59, 999);
        filter.timestamp.$lte = endDate;
      }
    }

    // Filter by position if provided
    if (position && position !== "all") {
      filter.position = position;
    }

    // Get total eligible voters
    const totalEligibleVoters = await Voter.countDocuments();

    // Get votes based on filter
    const votes = await Vote.find(filter)
      .populate({
        path: "voter",
        populate: [{ path: "class" }, { path: "house" }, { path: "year" }],
      })
      .populate("position")
      .populate("candidate");

    // Calculate total votes
    const totalVotes = votes.length;

    // Get turnout percentage
    const turnoutPercentage =
      totalEligibleVoters > 0 ? (totalVotes / totalEligibleVoters) * 100 : 0;

    // Get votes per position
    const uniquePositions = new Set(
      votes.map((vote) => vote.position?._id.toString())
    );
    const averageVotesPerPosition =
      uniquePositions.size > 0 ? totalVotes / uniquePositions.size : 0;

    // Generate voting timeline (hourly distribution)
    const votingTimeline = generateVotingTimeline(votes);

    // Generate class distribution
    const byClass = generateDistributionByProperty(votes, "class");

    // Generate house distribution
    const byHouse = generateDistributionByProperty(votes, "house");

    // Generate year distribution
    const byYear = generateDistributionByProperty(votes, "year");

    // Return analytics data
    res.status(200).json({
      totalVotes,
      totalEligibleVoters,
      turnoutPercentage,
      averageVotesPerPosition,
      votingTimeline,
      byClass,
      byHouse,
      byYear,
    });
  } catch (error) {
    console.error("Error generating voting patterns:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Helper function to generate hourly voting timeline
const generateVotingTimeline = (votes) => {
  const hourCounts = Array(24).fill(0);

  votes.forEach((vote) => {
    if (vote.timestamp) {
      const hour = new Date(vote.timestamp).getHours();
      hourCounts[hour]++;
    }
  });

  return hourCounts.map((count, hour) => ({ hour, count }));
};

// Helper function to generate distribution by a property (class, house, year)
const generateDistributionByProperty = (votes, property) => {
  const distribution = {};
  let total = 0;

  // Count votes by property
  votes.forEach((vote) => {
    if (vote.voter && vote.voter[property]) {
      const propName = vote.voter[property].name || "Unknown";
      distribution[propName] = (distribution[propName] || 0) + 1;
      total++;
    } else {
      distribution["Unknown"] = (distribution["Unknown"] || 0) + 1;
      total++;
    }
  });

  // Convert to array with percentages
  const result = Object.entries(distribution).map(([name, count]) => ({
    [property]: name,
    count,
    percentage: total > 0 ? (count / total) * 100 : 0,
  }));

  // Sort by count descending
  return result.sort((a, b) => b.count - a.count);
};

// Get results for a specific position
export const getPositionResults = async (req, res) => {
  try {
    const { positionId } = req.params;

    // Get the position
    const position = await Position.findById(positionId);
    if (!position) {
      return res.status(404).json({ message: "Position not found" });
    }

    // Get candidates for this position
    const candidates = await Candidate.find({ position: positionId });

    // Get vote counts for each candidate
    const candidateResults = await Promise.all(
      candidates.map(async (candidate) => {
        const voteCount = await Vote.countDocuments({
          candidate: candidate._id,
        });
        return {
          _id: candidate._id,
          name: candidate.name,
          image: candidate.image,
          voteCount,
          percentage: 0, // Will calculate after getting total
        };
      })
    );

    // Calculate total votes for this position
    const totalPositionVotes = candidateResults.reduce(
      (sum, c) => sum + c.voteCount,
      0
    );

    // Calculate percentages
    candidateResults.forEach((result) => {
      result.percentage =
        totalPositionVotes > 0
          ? (result.voteCount / totalPositionVotes) * 100
          : 0;
    });

    // Sort by vote count (descending)
    candidateResults.sort((a, b) => b.voteCount - a.voteCount);

    // Return the results
    res.status(200).json({
      position,
      candidates: candidateResults,
      totalVotes: totalPositionVotes,
    });
  } catch (error) {
    console.error("Error getting position results:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
