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
    // Get current election
    const currentElection = await Election.findOne({ isCurrent: true });
    if (!currentElection) {
      return res.status(404).json({ message: "No active election found" });
    }

    // Get all positions
    const positions = await Position.find({ isActive: true });

    // Create an object to store candidates by position name
    const candidatesByPosition = {};

    // For each position, find its candidates
    for (const position of positions) {
      const candidates = await Candidate.find({
        positionId: position._id,
        electionId: currentElection._id,
        isActive: true,
      });

      // Map candidates to a format expected by the frontend
      const mappedCandidates = candidates.map((candidate) => ({
        id: candidate._id,
        name: candidate.name,
        imageUrl: candidate.image,
        bio: candidate.biography,
        position: position.name,
      }));

      // Only add positions that have candidates
      if (mappedCandidates.length > 0) {
        candidatesByPosition[position.name] = mappedCandidates;
      }
    }

    res.status(200).json(candidatesByPosition);
  } catch (error) {
    console.error("Error fetching candidates by position:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch candidates", error: error.message });
  }
};
