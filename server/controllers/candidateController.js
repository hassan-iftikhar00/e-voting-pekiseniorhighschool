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
    // Get all active positions
    const positions = await Position.find({ isActive: true }).sort({
      priority: 1,
    });

    // Get all active candidates
    const candidates = await Candidate.find({ isActive: true })
      .populate("position")
      .sort({ position: 1, name: 1 });

    // Group candidates by position
    const candidatesByPosition = {};

    // Initialize with empty arrays for all positions
    positions.forEach((position) => {
      candidatesByPosition[position.title] = [];
    });

    // Add candidates to their respective positions
    candidates.forEach((candidate) => {
      if (
        candidate.position &&
        candidatesByPosition[candidate.position.title]
      ) {
        candidatesByPosition[candidate.position.title].push({
          id: candidate._id,
          name: candidate.name,
          imageUrl: candidate.imageUrl || null,
          bio: candidate.bio || "",
          manifesto: candidate.manifesto || "",
        });
      }
    });

    res.status(200).json(candidatesByPosition);
  } catch (error) {
    console.error("Error fetching candidates by position:", error);
    res
      .status(500)
      .json({ message: "Error fetching candidates", error: error.message });
  }
};
