import Election from "../models/Election.js";
import Setting from "../models/Setting.js";
import Voter from "../models/Voter.js";
import Vote from "../models/Vote.js";
import Candidate from "../models/Candidate.js";
import Position from "../models/Position.js";

// Get election statistics
export const getElectionStats = async (req, res) => {
  try {
    // Find current election
    const currentElection = await Election.findOne({ isCurrent: true });

    if (!currentElection) {
      // Return empty stats structure instead of 404 error
      return res.status(200).json({
        totalVoters: 0,
        votedCount: 0,
        remainingVoters: 0,
        completionPercentage: 0,
        recentVoters: [],
        votingActivity: {
          year: { labels: [], data: [] },
          class: { labels: [], data: [] },
          house: { labels: [], data: [] },
        },
        message: "No active election found",
      });
    }

    // Get voter statistics
    const totalVoters = await Voter.countDocuments({
      electionId: currentElection._id,
    });
    const votedCount = await Voter.countDocuments({
      electionId: currentElection._id,
      hasVoted: true,
    });
    const remainingVoters = totalVoters - votedCount;
    const completionPercentage =
      totalVoters > 0 ? Math.round((votedCount / totalVoters) * 100) : 0;

    // Get recent voters
    const recentVoters = await Voter.find({
      electionId: currentElection._id,
      hasVoted: true,
      votedAt: { $exists: true },
    })
      .sort({ votedAt: -1 })
      .limit(3)
      .select("name voterId votedAt");

    // Get voting activity by year, class, house
    const yearGroups = await Voter.aggregate([
      { $match: { electionId: currentElection._id, hasVoted: true } },
      { $group: { _id: "$year", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const classGroups = await Voter.aggregate([
      { $match: { electionId: currentElection._id, hasVoted: true } },
      { $group: { _id: "$class", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const houseGroups = await Voter.aggregate([
      { $match: { electionId: currentElection._id, hasVoted: true } },
      { $group: { _id: "$house", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    const stats = {
      totalVoters,
      votedCount,
      remainingVoters,
      completionPercentage,
      recentVoters: recentVoters.map((voter) => ({
        id: voter._id,
        name: voter.name,
        voterId: voter.voterId,
        votedAt: voter.votedAt,
      })),
      votingActivity: {
        year: {
          labels: yearGroups.map((group) => group._id),
          data: yearGroups.map((group) => group.count),
        },
        class: {
          labels: classGroups.map((group) => group._id),
          data: classGroups.map((group) => group.count),
        },
        house: {
          labels: houseGroups.map((group) => group._id),
          data: houseGroups.map((group) => group.count),
        },
      },
    };

    res.status(200).json(stats);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get election status
export const getElectionStatus = async (req, res) => {
  try {
    // Add rate limiting by IP at the controller level
    const clientIP = req.ip || req.connection.remoteAddress;

    // Get current election
    const currentElection = await Election.findOne({ isCurrent: true });
    if (!currentElection) {
      return res.status(404).json({ message: "No active election found" });
    }

    // Get settings to check if election is active by date
    const settings = await Setting.findOne();

    // Helper function to properly parse dates in different formats
    const parseDate = (dateString) => {
      if (dateString && dateString.includes("/")) {
        const parts = dateString.split("/");
        if (parts.length === 3) {
          const [month, day, year] = parts;
          return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        }
      }
      return dateString;
    };

    const now = new Date();
    const startDate = settings?.startDate
      ? new Date(settings.startDate)
      : new Date(currentElection.startDate);
    const endDate = settings?.endDate
      ? new Date(settings.endDate)
      : new Date(currentElection.endDate);

    // Set the time components
    startDate.setHours(
      parseInt(settings?.startTime?.split(":")[0] || "8"),
      parseInt(settings?.startTime?.split(":")[1] || "0"),
      0
    );

    endDate.setHours(
      parseInt(settings?.endTime?.split(":")[0] || "17"),
      parseInt(settings?.endTime?.split(":")[1] || "0"),
      0
    );

    // Use the parseDate function for formatting dates from different sources
    const formattedStartDate = parseDate(
      currentElection.startDate ||
        settings?.votingStartDate ||
        currentElection.date
    );

    const formattedEndDate = parseDate(
      settings?.votingEndDate || currentElection.endDate || currentElection.date
    );

    console.log("Sending election status data:", {
      isActive: currentElection.isActive,
      status: currentElection.status,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      date: currentElection.date,
      startTime: currentElection.startTime,
      endTime: currentElection.endTime,
      settingsStartDate: settings?.votingStartDate,
      settingsEndDate: settings?.votingEndDate,
    });

    res.status(200).json({
      isActive: currentElection.isActive,
      status: currentElection.status,
      resultsPublished: currentElection.resultsPublished || false,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      date: currentElection.date,
      startTime: currentElection.startTime,
      endTime: currentElection.endTime,
    });
  } catch (error) {
    console.error("Error getting election status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all elections
export const getAllElections = async (req, res) => {
  try {
    const elections = await Election.find().sort({ createdAt: -1 });
    res.status(200).json(elections);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new election
export const createElection = async (req, res) => {
  try {
    const { title, date, startTime, endTime } = req.body;

    if (!title || !date || !startTime || !endTime) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields" });
    }

    // Format the date consistently - this helps with standardization
    let formattedDate = date;
    if (date.includes("-")) {
      // Try to standardize the date format if it's in a date-like format
      try {
        const dateObj = new Date(date);
        if (!isNaN(dateObj.getTime())) {
          // Format as YYYY-MM-DD for database storage
          formattedDate = dateObj.toISOString().split("T")[0];
        }
      } catch (e) {
        console.error("Date parsing error:", e);
        // Keep original format if parsing fails
      }
    }

    const newElection = new Election({
      title,
      date: formattedDate,
      startTime,
      endTime,
    });

    await newElection.save();
    res.status(201).json(newElection);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Set current election
export const setCurrentElection = async (req, res) => {
  try {
    const { id } = req.params;

    // Reset all elections to non-current
    await Election.updateMany({}, { $set: { isCurrent: false } });

    // Set the specified election as current
    const election = await Election.findByIdAndUpdate(
      id,
      { isCurrent: true },
      { new: true }
    );

    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    res.status(200).json(election);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete an election
export const deleteElection = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if ID is valid
    if (!id || id === "undefined") {
      return res.status(400).json({ message: "Invalid election ID" });
    }

    // Check if election exists
    const election = await Election.findById(id);
    if (!election) {
      return res.status(404).json({ message: "Election not found" });
    }

    // Delete all voters associated with this election
    await Voter.deleteMany({ electionId: id });

    // Delete the election
    await Election.findByIdAndDelete(id);

    res.status(200).json({ message: "Election deleted successfully" });
  } catch (error) {
    console.error("Delete election error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a default election if none exists
export const createDefaultElection = async (req, res) => {
  try {
    const electionCount = await Election.countDocuments();

    if (electionCount === 0) {
      // Create a default election
      const defaultElection = new Election({
        title: "Student Council Election 2025",
        date: "2025-05-15",
        startTime: "08:00:00",
        endTime: "17:00:00",
        isCurrent: true,
      });

      await defaultElection.save();

      return res.status(201).json({
        message: "Default election created",
        election: defaultElection,
      });
    }

    return res.status(200).json({
      message: "Elections already exist",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Server error",
      error: error.message,
    });
  }
};

// Get election results
export const getElectionResults = async (req, res) => {
  try {
    const { electionId } = req.params;

    // Get the specified election or the current election if not specified
    let election;

    if (electionId) {
      election = await Election.findById(electionId);
      if (!election) {
        return res.status(404).json({ message: "Election not found" });
      }
    } else {
      // Get the current active election
      election = await Election.findOne({ isCurrent: true });
      if (!election) {
        return res.status(404).json({ message: "No active election found" });
      }
    }

    // Get all positions
    const positions = await Position.find({ election: election._id });

    // Get all candidates for these positions
    const candidates = await Candidate.find({
      election: election._id,
    }).populate("position");

    // Get all votes for this election
    const votes = await Vote.find({ election: election._id });

    // Calculate the total number of voters who have voted in this election
    const totalVoters = await Voter.countDocuments({ hasVoted: true });

    // Process the results for each position
    const results = [];

    for (const position of positions) {
      // Get all candidates for this position
      const positionCandidates = candidates.filter(
        (c) => c.position._id.toString() === position._id.toString()
      );

      // Get all votes for this position
      const positionVotes = votes.filter(
        (v) => v.position.toString() === position._id.toString()
      );

      // Count votes for each candidate
      const candidateResults = positionCandidates.map((candidate) => {
        const candidateVotes = positionVotes.filter(
          (v) => v.candidate.toString() === candidate._id.toString()
        ).length;

        // Calculate the percentage
        const percentage =
          positionVotes.length > 0
            ? (candidateVotes / positionVotes.length) * 100
            : 0;

        return {
          id: candidate._id,
          name: candidate.name,
          votes: candidateVotes,
          percentage: parseFloat(percentage.toFixed(1)),
          imageUrl: candidate.photoUrl || null,
        };
      });

      results.push({
        position: position.name,
        candidates: candidateResults,
        totalVotes: positionVotes.length,
      });
    }

    res.status(200).json({
      electionId: election._id,
      electionName: election.name,
      totalVoters,
      results,
    });
  } catch (error) {
    console.error("Error getting election results:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get detailed vote analysis
export const getDetailedVoteAnalysis = async (req, res) => {
  try {
    const currentElection = await Election.findOne({ isCurrent: true });
    if (!currentElection) {
      return res.status(404).json({ message: "No active election found" });
    }

    // Get all voters who have voted
    const voters = await Voter.find({
      electionId: currentElection._id,
      hasVoted: true,
    }).sort({ votedAt: -1 });

    // Get all positions
    const positions = await Position.find({ electionId: currentElection._id });

    // Get votes with populated candidate and position information
    const votes = await Vote.find({ electionId: currentElection._id })
      .populate("candidateId")
      .populate("positionId");

    // Process data to match the format needed for the frontend
    const detailedVoteData = voters.map((voter) => {
      // Find all votes cast by this voter
      const voterVotes = votes.filter(
        (vote) => vote.voterId.toString() === voter._id.toString()
      );

      // Format votes by position
      const votedFor = {};
      voterVotes.forEach((vote) => {
        const position = vote.positionId
          ? vote.positionId.title
          : "Unknown Position";
        const candidate = vote.candidateId
          ? vote.candidateId.name
          : "Unknown Candidate";
        votedFor[position] = candidate;
      });

      return {
        id: voter._id,
        name: voter.name,
        voterId: voter.voterId,
        class: voter.class,
        votedAt: voter.votedAt,
        votedFor,
      };
    });

    res.status(200).json(detailedVoteData);
  } catch (error) {
    console.error("Error getting detailed vote analysis:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Toggle election status
export const toggleElectionStatus = async (req, res) => {
  try {
    console.log("Toggling election status...");

    // Find the current election
    const currentElection = await Election.findOne({ isCurrent: true });

    if (!currentElection) {
      console.log("No active election found");
      return res.status(404).json({ message: "No active election found" });
    }

    // Toggle the active status
    currentElection.isActive = !currentElection.isActive;

    // Always update the status field based on isActive to maintain consistency
    if (currentElection.isActive) {
      currentElection.status = "active";
    } else {
      // When deactivating, set to not-started as the safest option
      currentElection.status = "not-started";
    }

    await currentElection.save();

    console.log(
      `Election status toggled to: ${
        currentElection.isActive ? "active" : "inactive"
      }, status: ${currentElection.status}`
    );
    console.log("Election document after save:", currentElection);

    // Also update the associated setting for better synchronization
    const settings = await Setting.findOne();
    if (settings) {
      settings.isActive = currentElection.isActive;
      await settings.save();
      console.log("Settings also updated with isActive:", settings.isActive);
    }

    // Return the updated election data
    res.status(200).json({
      isActive: currentElection.isActive,
      status: currentElection.status,
      message: `Election ${
        currentElection.isActive ? "activated" : "deactivated"
      } successfully`,
    });
  } catch (error) {
    console.error("Error toggling election status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get election results
export const getResults = async (req, res) => {
  try {
    // Get the current active election
    const election = await Election.findOne({ isActive: true });
    if (!election) {
      return res.status(404).json({ message: "No active election found" });
    }

    // Get all positions
    const positions = await Position.find().sort({ priority: 1 });

    // Get results for each position
    const results = await Promise.all(
      positions.map(async (position) => {
        // Get candidates for this position
        const candidates = await Candidate.find({ position: position._id });

        // Get vote counts for each candidate
        const candidateResults = await Promise.all(
          candidates.map(async (candidate) => {
            const voteCount = await Vote.countDocuments({
              candidate: candidate._id,
              election: election._id,
            });

            return {
              candidate,
              voteCount,
              percentage: 0, // Will be calculated after getting total
            };
          })
        );

        // Calculate total votes for the position
        const totalVotes = candidateResults.reduce(
          (sum, item) => sum + item.voteCount,
          0
        );

        // Calculate percentages
        candidateResults.forEach((item) => {
          item.percentage =
            totalVotes > 0 ? (item.voteCount / totalVotes) * 100 : 0;
        });

        // Sort by votes (highest first)
        candidateResults.sort((a, b) => b.voteCount - a.voteCount);

        return {
          position,
          candidates: candidateResults,
          totalVotes,
        };
      })
    );

    // Get voter statistics
    const totalEligibleVoters = await Voter.countDocuments();
    const votedVoters = await Voter.countDocuments({ hasVoted: true });

    const stats = {
      total: totalEligibleVoters,
      voted: votedVoters,
      notVoted: totalEligibleVoters - votedVoters,
      percentage:
        totalEligibleVoters > 0 ? (votedVoters / totalEligibleVoters) * 100 : 0,
    };

    res.status(200).json({ results, stats });
  } catch (error) {
    console.error("Error getting election results:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Toggle results publication status
export const toggleResultsPublication = async (req, res) => {
  try {
    const { published } = req.body;

    // Find the current active election
    const election = await Election.findOne({ isActive: true });
    if (!election) {
      return res.status(404).json({ message: "No active election found" });
    }

    // Update the published status
    election.resultsPublished = published;
    await election.save();

    res.status(200).json({
      resultsPublished: election.resultsPublished,
    });
  } catch (error) {
    console.error("Error toggling results publication:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
