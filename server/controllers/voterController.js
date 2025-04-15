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
    if (!name || !className || !year || !house) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Check current election
    const currentElection = await Election.findOne({ isCurrent: true });
    if (!currentElection) {
      return res.status(404).json({ message: "No active election found" });
    }

    // Generate a standardized voter ID (matching the model's format)
    const randomDigits = Math.floor(10000 + Math.random() * 90000);
    const newVoterId = `VOTER${randomDigits}`;

    // Create new voter with standardized ID
    const voter = new Voter({
      name,
      voterId: newVoterId, // Use the standardized format
      gender: gender,
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
    voter.gender = gender; // Use default if undefined
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
    console.log("==== BULK ADD VOTERS CONTROLLER ====");
    console.log("Request reached controller function");

    const { voters } = req.body;

    if (!voters) {
      console.log("No voters array found in request body");
      return res.status(400).json({
        message: "No valid voter data provided - voters array is missing",
        success: 0,
        failed: 0,
        errors: ["No voters array found in request"],
      });
    }

    if (!Array.isArray(voters)) {
      console.log("Voters is not an array:", typeof voters);
      return res.status(400).json({
        message: "Invalid voter data - voters is not an array",
        success: 0,
        failed: 0,
        errors: ["Invalid data format: voters must be an array"],
      });
    }

    if (voters.length === 0) {
      console.log("Voters array is empty");
      return res.status(400).json({
        message: "No voter data provided - empty array",
        success: 0,
        failed: 0,
        errors: ["No voter data found in CSV file"],
      });
    }

    console.log("Number of voters to import:", voters.length);
    console.log("First voter sample:", JSON.stringify(voters[0], null, 2));

    // Get current election
    const currentElection = await Election.findOne({ isCurrent: true });
    if (!currentElection) {
      console.log("No active election found");
      return res.status(400).json({
        message: "No active election found",
        success: 0,
        failed: voters.length,
        errors: ["No active election found for adding voters"],
      });
    }

    console.log("Found current election:", currentElection._id);

    const results = {
      success: 0,
      failed: 0,
      errors: [],
    };

    // Track for duplicate handling
    const processedNames = new Set();

    // Process each voter with improved logging
    console.log("Starting to process voters...");
    for (const voterData of voters) {
      try {
        // Find all possible keys case-insensitively
        const keys = Object.keys(voterData);
        console.log("Voter data keys:", keys);

        const getValueCaseInsensitive = (targetKey) => {
          const key = keys.find(
            (k) => k.toLowerCase() === targetKey.toLowerCase()
          );
          return key ? voterData[key].trim() : "";
        };

        // Get data using case-insensitive keys
        const name = getValueCaseInsensitive("name");
        const gender = getValueCaseInsensitive("gender");
        const className = getValueCaseInsensitive("class");
        const year = getValueCaseInsensitive("year");
        const house = getValueCaseInsensitive("house");

        console.log(
          `Processing voter: ${name}, gender=${gender}, class=${className}, year=${year}, house=${house}`
        );

        // Validate required fields with better error details
        if (!name || !gender || !className || !year || !house) {
          const missingFields = [];
          if (!name) missingFields.push("name");
          if (!gender) missingFields.push("gender");
          if (!className) missingFields.push("class");
          if (!year) missingFields.push("year");
          if (!house) missingFields.push("house");

          const errorMsg = `Missing required fields for voter: ${missingFields.join(
            ", "
          )}`;
          console.log(errorMsg);

          results.failed++;
          results.errors.push(errorMsg);
          continue;
        }

        // Fix gender normalization to be more tolerant
        let normalizedGender = "Male"; // Default to Male
        if (gender.toLowerCase().includes("f")) {
          normalizedGender = "Female";
        }

        // Generate a voterId manually with standardized format
        const randomDigits = Math.floor(10000 + Math.random() * 90000);
        const voterId = `VOTER${randomDigits}`;

        // Create voter with proper debugging and manual voterId
        console.log(
          `Creating new voter: ${name} with gender ${normalizedGender} and voterId ${voterId}`
        );

        const newVoter = new Voter({
          name,
          gender: normalizedGender,
          class: className,
          year,
          house,
          voterId,
          hasVoted: false,
          votedAt: null,
          electionId: currentElection._id,
        });

        const savedVoter = await newVoter.save();
        console.log(`Successfully saved voter with ID: ${savedVoter._id}`);

        // Update election counts
        currentElection.totalVoters++;
        await currentElection.save();

        results.success++;
      } catch (err) {
        console.error("Error processing voter row:", err);
        results.failed++;
        results.errors.push(`Error processing row: ${err.message}`);
      }
    }

    console.log("Import complete. Results:", JSON.stringify(results, null, 2));

    // Return success response
    return res.status(200).json({
      message: `Imported ${results.success} voters successfully with ${results.failed} failures`,
      success: results.success,
      failed: results.failed,
      errors: results.errors,
    });
  } catch (error) {
    console.error("Bulk import error:", error);
    return res.status(500).json({
      message: "Server error during import",
      error: error.message,
      success: 0,
      failed: req.body.voters?.length || 0,
      errors: [error.message],
    });
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

    const voter = await Voter.findOne({ voterId }).lean();

    if (!voter) {
      return res.status(404).json({
        success: false,
        message: "Voter not found",
      });
    }

    // Check if voter has already voted
    if (voter.hasVoted) {
      // Format a nice response with voter info for the VoteSuccess component
      const formattedVoter = {
        name: voter.name,
        voterId: voter.voterId,
        votedAt: voter.votedAt,
        voteToken: voter.voteToken || "TOKEN_NOT_AVAILABLE", // Include vote token
      };

      return res.status(400).json({
        success: false,
        message: "Voter has already cast a vote",
        errorCode: "ALREADY_VOTED",
        voter: formattedVoter,
      });
    }

    // Format the response to ensure consistent date handling
    const formattedVoter = {
      id: voter._id,
      name: voter.name,
      voterId: voter.voterId,
      hasVoted: voter.hasVoted,
      // Format dates properly for client consumption
      votedAt: voter.votedAt ? voter.votedAt.toISOString() : null,
      electionId: voter.electionId,
      year: voter.year,
      class: voter.class,
      house: voter.house,
      gender: voter.gender,
    };

    return res.status(200).json({
      success: true,
      message: "Voter validated successfully",
      voter: formattedVoter,
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

// Get voter statistics
export const getVoterStats = async (req, res) => {
  try {
    // Find current election (or use a default one)
    const currentElection = await Election.findOne({ isCurrent: true });

    if (!currentElection) {
      return res.status(200).json({
        totalVoters: 0,
        activeVoters: 0,
        votedVoters: 0,
        votingPercentage: 0,
      });
    }

    // Count voters
    const totalVoters = await Voter.countDocuments();
    const activeVoters = await Voter.countDocuments({ active: true });
    const votedVoters = await Voter.countDocuments({ hasVoted: true });

    // Calculate percentage
    const votingPercentage =
      totalVoters > 0 ? Math.round((votedVoters / totalVoters) * 100) : 0;

    res.status(200).json({
      totalVoters,
      activeVoters,
      votedVoters,
      votingPercentage,
    });
  } catch (error) {
    console.error("Error fetching voter stats:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
