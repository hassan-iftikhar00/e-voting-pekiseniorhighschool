import Candidate from "../models/Candidate.js";
import Position from "../models/Position.js";
import Election from "../models/Election.js";
import Voter from "../models/Voter.js"; // Ensure the Voter model is imported

// Get all candidates
export const getAllCandidates = async (req, res) => {
  try {
    const currentElection = await Election.findOne({ isCurrent: true });
    if (!currentElection) {
      return res.status(404).json({ message: "No active election found" });
    }

    const candidates = await Candidate.find({
      electionId: currentElection._id,
    });

    res.status(200).json(candidates);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create candidate
export const createCandidate = async (req, res) => {
  try {
    const {
      name,
      positionId,
      image,
      biography,
      year,
      class: className,
      house,
      isActive,
      voterCategory, // Add voterCategory
    } = req.body;

    if (!name || !positionId) {
      return res
        .status(400)
        .json({ message: "Name and position are required" });
    }

    // Check current election
    const currentElection = await Election.findOne({ isCurrent: true });
    if (!currentElection) {
      return res.status(404).json({ message: "No active election found" });
    }

    // Check if position exists
    const position = await Position.findById(positionId);
    if (!position) {
      return res.status(404).json({ message: "Position not found" });
    }

    const candidate = new Candidate({
      name,
      positionId,
      electionId: currentElection._id,
      image: image || "",
      biography: biography || "",
      year: year || "",
      class: className || "",
      house: house || "",
      isActive: isActive === undefined ? true : isActive,
      voterCategory: voterCategory || { type: "all", values: [] }, // Default voterCategory
    });

    await candidate.save();
    res.status(201).json(candidate);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update candidate
export const updateCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      positionId,
      image,
      biography,
      year,
      class: className,
      house,
      isActive,
      voterCategory, // Add voterCategory
    } = req.body;

    if (!name || !positionId) {
      return res
        .status(400)
        .json({ message: "Name and position are required" });
    }

    // Check if candidate exists
    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    // Check if position exists
    const position = await Position.findById(positionId);
    if (!position) {
      return res.status(404).json({ message: "Position not found" });
    }

    candidate.name = name;
    candidate.positionId = positionId;
    candidate.image = image !== undefined ? image : candidate.image;
    candidate.biography =
      biography !== undefined ? biography : candidate.biography;
    candidate.year = year !== undefined ? year : candidate.year;
    candidate.class = className !== undefined ? className : candidate.class;
    candidate.house = house !== undefined ? house : candidate.house;
    candidate.isActive = isActive !== undefined ? isActive : candidate.isActive;
    candidate.voterCategory =
      voterCategory !== undefined ? voterCategory : candidate.voterCategory;

    await candidate.save();
    res.status(200).json(candidate);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete candidate
export const deleteCandidate = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if candidate exists
    const candidate = await Candidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found" });
    }

    await Candidate.findByIdAndDelete(id);
    res.status(200).json({ message: "Candidate deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Get all candidates grouped by position
export const getCandidatesByPosition = async (req, res) => {
  try {
    console.log("getCandidatesByPosition endpoint called");

    // Get current election
    const currentElection = await Election.findOne({ isCurrent: true });
    if (!currentElection) {
      console.log("No active election found");
      return res.status(404).json({ message: "No active election found" });
    }

    console.log(`Current election ID: ${currentElection._id}`);

    // Get all positions in a single query
    const positions = await Position.find({ isActive: true });
    console.log(`Found ${positions.length} active positions`);

    // Create a map of position IDs to position names for quick lookup
    const positionMap = {};
    positions.forEach((position) => {
      const positionName =
        position.title || position.name || `Position ${position._id}`;
      positionMap[position._id.toString()] = positionName;
      console.log(`Mapped position: ${position._id} to ${positionName}`);
    });

    // Fetch all candidates with a single query
    const allCandidates = await Candidate.find({
      electionId: currentElection._id,
      isActive: true,
    }).lean();

    console.log(`Found ${allCandidates.length} total candidates`);

    // Add debug information for each candidate
    allCandidates.forEach((candidate) => {
      console.log(
        `Candidate ${candidate._id}: name=${candidate.name}, positionId=${candidate.positionId}`
      );
    });

    // Group candidates by position in memory
    const candidatesByPosition = {};

    allCandidates.forEach((candidate) => {
      if (!candidate.positionId) {
        console.log(`Candidate ${candidate._id} has no positionId, skipping`);
        return;
      }

      const positionId = candidate.positionId.toString();
      const positionName = positionMap[positionId] || "Unknown Position";

      if (!candidatesByPosition[positionName]) {
        candidatesByPosition[positionName] = [];
      }

      candidatesByPosition[positionName].push({
        id: candidate._id,
        name: candidate.name || "Unnamed Candidate",
        imageUrl: candidate.image || null,
        bio: candidate.biography || "",
        position: positionName,
        positionId: positionId,
      });

      console.log(
        `Mapped candidate ${candidate.name} to position ${positionName}`
      );
    });

    // Log the final structure before sending
    console.log(
      "Final candidatesByPosition structure:",
      Object.entries(candidatesByPosition).map(
        ([key, value]) => `${key}: ${value.length} candidates`
      )
    );

    // Return the actual data from database - no fallback data
    return res.status(200).json(candidatesByPosition);
  } catch (error) {
    console.error("Error in getCandidatesByPosition:", error);
    // Return an empty object instead of fallback data
    return res.status(500).json({
      message: "Error fetching candidates",
      error: error.message,
    });
  }
};

// Get candidates for voter
export const getCandidatesForVoter = async (req, res) => {
  try {
    const { voterId } = req.query;

    if (!voterId) {
      return res.status(400).json({ message: "Voter ID is required" });
    }

    const voter = await Voter.findOne({ voterId });
    if (!voter) {
      console.error(`Voter with ID ${voterId} not found.`);
      return res.status(404).json({ message: "Voter not found" });
    }

    console.log(`Voter found: ${JSON.stringify(voter)}`);

    // Store original (non-normalized) values for matching exact format in DB
    const voterClass = voter.class;
    const voterYear = voter.year;
    const voterHouse = voter.house;

    // Normalize voter's attributes for debugging
    const normalizedClass = voter.class.trim().toLowerCase();
    const normalizedYear = voter.year.trim().toLowerCase();
    const normalizedHouse = voter.house.trim().toLowerCase();

    console.log("Normalized voter attributes:", {
      class: normalizedClass,
      year: normalizedYear,
      house: normalizedHouse,
    });

    console.log("Original voter attributes:", {
      class: voterClass,
      year: voterYear,
      house: voterHouse,
    });

    // Get all positions in a single query
    const positions = await Position.find({ isActive: true });
    console.log(`Found ${positions.length} active positions`);

    // Create a map of position IDs to position names for quick lookup
    const positionMap = {};
    positions.forEach((position) => {
      const positionName =
        position.title || position.name || `Position ${position._id}`;
      positionMap[position._id.toString()] = positionName;
      console.log(`Mapped position: ${position._id} to ${positionName}`);
    });

    // Fetch candidates based on voter category using original case format AND case-insensitive regex
    const candidates = await Candidate.find({
      electionId: voter.electionId,
      $or: [
        { "voterCategory.type": "all" },
        // Match exact format
        {
          "voterCategory.type": "class",
          "voterCategory.values": { $in: [voterClass] },
        },
        {
          "voterCategory.type": "year",
          "voterCategory.values": { $in: [voterYear] },
        },
        {
          "voterCategory.type": "house",
          "voterCategory.values": { $in: [voterHouse] },
        },
        // Also try with regex for case-insensitive matching
        {
          "voterCategory.type": "class",
          "voterCategory.values": {
            $elemMatch: {
              $regex: new RegExp(`^${escapeRegExp(normalizedClass)}$`, "i"),
            },
          },
        },
        {
          "voterCategory.type": "year",
          "voterCategory.values": {
            $elemMatch: {
              $regex: new RegExp(`^${escapeRegExp(normalizedYear)}$`, "i"),
            },
          },
        },
        {
          "voterCategory.type": "house",
          "voterCategory.values": {
            $elemMatch: {
              $regex: new RegExp(`^${escapeRegExp(normalizedHouse)}$`, "i"),
            },
          },
        },
        // Include candidates with missing voter category
        { voterCategory: { $exists: false } },
        { "voterCategory.type": { $exists: false } },
        { "voterCategory.values": { $exists: false } },
        { "voterCategory.values": { $size: 0 } },
      ],
    }).lean();

    // Helper function to escape special regex characters
    function escapeRegExp(string) {
      return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }

    // Log candidates for debugging
    console.log(`Candidates fetched: ${candidates.length}`);
    candidates.forEach((candidate) => {
      console.log(
        `Candidate ID: ${candidate._id}, Name: ${candidate.name}, PositionId: ${
          candidate.positionId
        }, VoterCategory: ${JSON.stringify(candidate.voterCategory)}`
      );
    });

    console.log(
      `Filtering candidates for voter ID ${voterId} with attributes:`,
      {
        class: voterClass,
        year: voterYear,
        house: voterHouse,
      }
    );

    if (!candidates.length) {
      console.error(`No candidates found for voter ID ${voterId}.`);
      return res.status(404).json({ message: "No candidates found" });
    }

    console.log(
      `Found ${candidates.length} candidates for voter ID ${voterId}.`
    );

    // Group candidates by position title instead of position ID
    const candidatesByPosition = candidates.reduce((acc, candidate) => {
      // Use position title from the position map instead of the ObjectId
      const positionId = candidate.positionId
        ? candidate.positionId.toString()
        : null;
      const positionName =
        positionId && positionMap[positionId]
          ? positionMap[positionId]
          : "General Position";

      if (!acc[positionName]) {
        acc[positionName] = [];
      }

      acc[positionName].push({
        id: candidate._id,
        name: candidate.name,
        imageUrl: candidate.image || null,
        bio: candidate.biography || "",
        position: positionName,
        positionId: candidate.positionId,
      });
      return acc;
    }, {});

    res.status(200).json(candidatesByPosition);
  } catch (error) {
    console.error("Error fetching candidates for voter:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
