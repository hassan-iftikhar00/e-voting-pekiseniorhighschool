import Voter from "../models/Voter.js";
import Election from "../models/Election.js";

// Get all voters
export const getAllVoters = async (req, res) => {
  try {
    const currentElection = await Election.findOne({ isCurrent: true });
    if (!currentElection) {
      return res.status(404).json({ message: "No active election found" });
    }

    const voters = await Voter.find({
      electionId: currentElection._id,
    });

    res.status(200).json(voters);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create voter
export const createVoter = async (req, res) => {
  try {
    const { name, voterId, gender, class: className, year, house } = req.body;

    // Validation
    if (!name || !voterId || !className || !year || !house) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check current election
    const currentElection = await Election.findOne({ isCurrent: true });
    if (!currentElection) {
      return res.status(404).json({ message: "No active election found" });
    }

    // Check if voter already exists
    const existingVoter = await Voter.findOne({
      voterId,
      electionId: currentElection._id,
    });

    if (existingVoter) {
      return res.status(400).json({ message: "Voter ID already exists" });
    }

    // Create new voter
    const voter = new Voter({
      name,
      voterId,
      gender: gender || "Male", // Include gender with default
      class: className,
      year,
      house,
      electionId: currentElection._id,
    });

    await voter.save();

    // Update total voters count in election
    currentElection.totalVoters++;
    await currentElection.save();

    res.status(201).json(voter);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update voter details
export const updateVoter = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, gender, class: className, year, house } = req.body;

    // Validation
    if (!name || !className || !year || !house) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const voter = await Voter.findById(id);
    if (!voter) {
      return res.status(404).json({ message: "Voter not found" });
    }

    // Update voter details
    voter.name = name;
    voter.gender = gender || "Male"; // Use default if undefined
    voter.class = className;
    voter.year = year;
    voter.house = house;

    await voter.save();
    res.status(200).json(voter);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update voter (mark as voted)
export const markVoterAsVoted = async (req, res) => {
  try {
    const { id } = req.params;

    // Get current election
    const currentElection = await Election.findOne({ isCurrent: true });
    if (!currentElection) {
      return res.status(404).json({ message: "No active election found" });
    }

    // Find voter
    const voter = await Voter.findById(id);
    if (!voter) {
      return res.status(404).json({ message: "Voter not found" });
    }

    // Check if already voted
    if (voter.hasVoted) {
      return res.status(400).json({ message: "Voter has already voted" });
    }

    // Mark as voted
    voter.hasVoted = true;
    voter.votedAt = new Date();
    await voter.save();

    // Update election stats
    currentElection.votedCount++;
    await currentElection.save();

    res.status(200).json(voter);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete voter
export const deleteVoter = async (req, res) => {
  try {
    const { id } = req.params;

    const voter = await Voter.findById(id);
    if (!voter) {
      return res.status(404).json({ message: "Voter not found" });
    }

    // Get current election
    const currentElection = await Election.findOne({ isCurrent: true });

    // Delete voter
    await Voter.findByIdAndDelete(id);

    // Update election stats if found
    if (currentElection) {
      currentElection.totalVoters--;
      if (voter.hasVoted) {
        currentElection.votedCount--;
      }
      await currentElection.save();
    }

    res.status(200).json({ message: "Voter deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Add bulk voters from CSV
export const bulkAddVoters = async (req, res) => {
  try {
    const voters = req.body;
    if (!Array.isArray(voters) || voters.length === 0) {
      return res.status(400).json({ message: "Invalid voter data" });
    }

    // Get current election
    const currentElection = await Election.findOne({ isCurrent: true });
    if (!currentElection) {
      return res.status(404).json({ message: "No active election found" });
    }

    // Process each voter
    const results = {
      added: 0,
      errors: 0,
      duplicates: 0,
    };

    for (const voterData of voters) {
      try {
        // Check required fields
        if (
          !voterData.name ||
          !voterData.voterId ||
          !voterData.class ||
          !voterData.year ||
          !voterData.house
        ) {
          results.errors++;
          continue;
        }

        // Check for duplicates
        const existingVoter = await Voter.findOne({
          voterId: voterData.voterId,
          electionId: currentElection._id,
        });

        if (existingVoter) {
          results.duplicates++;
          continue;
        }

        // Create voter
        const voter = new Voter({
          ...voterData,
          electionId: currentElection._id,
        });

        await voter.save();
        results.added++;
      } catch (err) {
        results.errors++;
      }
    }

    // Update election total voters count
    currentElection.totalVoters += results.added;
    await currentElection.save();

    res.status(200).json({
      message: "Bulk import completed",
      results,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get recent voters who have voted
export const getRecentVoters = async (req, res) => {
  try {
    // Get the most recent voters who have voted
    const recentVoters = await Voter.find({ hasVoted: true })
      .sort({ votedAt: -1 })
      .limit(10)
      .select("name voterId votedAt hasVoted");

    res.status(200).json(recentVoters);
  } catch (error) {
    console.error("Error fetching recent voters:", error);
    res
      .status(500)
      .json({ message: "Error fetching recent voters", error: error.message });
  }
};

// Validate voter for voting process
export const validateVoter = async (req, res) => {
  try {
    const { voterId } = req.body;

    if (!voterId) {
      return res.status(400).json({
        success: false,
        message: "Voter ID is required",
      });
    }

    // Find the voter by voter ID
    const voter = await Voter.findOne({ voterId });

    if (!voter) {
      return res.status(404).json({
        success: false,
        message: "Voter not found",
      });
    }

    // Return voter details including whether they have voted
    return res.status(200).json({
      success: true,
      voter: {
        id: voter._id,
        name: voter.name,
        voterId: voter.voterId,
        hasVoted: voter.hasVoted,
        votedAt: voter.votedAt,
        class: voter.class,
        year: voter.year,
        house: voter.house,
      },
    });
  } catch (error) {
    console.error("Error validating voter:", error);
    return res.status(500).json({
      success: false,
      message: "Error validating voter",
      error: error.message,
    });
  }
};
