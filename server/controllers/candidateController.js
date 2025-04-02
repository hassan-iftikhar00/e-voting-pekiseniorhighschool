import Candidate from "../models/Candidate.js";
import Position from "../models/Position.js";
import Election from "../models/Election.js";

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
      voterCategory, // Make sure to include this in the destructuring
    } = req.body;

    console.log("Received candidate data:", req.body);

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
      voterCategory: voterCategory || { type: "all", values: [] }, // Ensure voterCategory is saved
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
      voterCategory, // Include voterCategory in the destructuring
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

// Get candidates by position for the voting panel
export const getCandidatesByPosition = async (req, res) => {
  try {
    // Get current election
    const currentElection = await Election.findOne({ isCurrent: true });
    if (!currentElection) {
      return res.status(404).json({ message: "No active election found" });
    }

    // Get all active positions, sorted by order
    const positions = await Position.find({
      electionId: currentElection._id,
      isActive: true,
    }).sort({ order: 1 });

    // Get all active candidates for this election
    const candidates = await Candidate.find({
      electionId: currentElection._id,
      isActive: true,
    });

    // Group candidates by position
    const candidatesByPosition = {};

    for (const position of positions) {
      // Find candidates for this position
      const positionCandidates = candidates.filter(
        (c) => c.positionId.toString() === position._id.toString()
      );

      // Attach position info to each candidate
      const candidatesWithInfo = positionCandidates.map((c) => {
        // Convert to plain object to allow adding properties
        const candidateObj = c.toObject();
        candidateObj.positionInfo = {
          title: position.title,
          order: position.order,
          maxSelections: position.maxSelections,
        };
        return candidateObj;
      });

      // Only include positions that have candidates
      if (candidatesWithInfo.length > 0) {
        candidatesByPosition[position.title] = candidatesWithInfo;
      }
    }

    return res.status(200).json(candidatesByPosition);
  } catch (error) {
    console.error("Error getting candidates by position:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
};
