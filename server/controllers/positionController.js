import Position from "../models/Position.js";
import Election from "../models/Election.js";

// Get all positions
export const getAllPositions = async (req, res) => {
  try {
    const currentElection = await Election.findOne({ isCurrent: true });
    if (!currentElection) {
      return res.status(404).json({ message: "No active election found" });
    }

    const positions = await Position.find({
      electionId: currentElection._id,
    }).sort({ order: 1 }); // Sort by order instead of priority

    res.status(200).json(positions);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create position
export const createPosition = async (req, res) => {
  try {
    const {
      title,
      description,
      maxCandidates,
      maxSelections,
      priority,
      order,
      isActive,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Position title is required" });
    }

    // Check current election
    const currentElection = await Election.findOne({ isCurrent: true });
    if (!currentElection) {
      return res.status(404).json({ message: "No active election found" });
    }

    // Check if position already exists for this election
    const existingPosition = await Position.findOne({
      title,
      electionId: currentElection._id,
    });

    if (existingPosition) {
      return res
        .status(400)
        .json({ message: "Position already exists for this election" });
    }

    // If no specific order is provided, place at the end
    let positionOrder = order;
    if (positionOrder === undefined) {
      const lastPosition = await Position.findOne({
        electionId: currentElection._id,
      }).sort({ order: -1 });
      positionOrder = lastPosition ? lastPosition.order + 1 : 1;
    }

    const position = new Position({
      title,
      description: description || "",
      electionId: currentElection._id,
      maxCandidates: maxCandidates || 1,
      maxSelections: maxSelections || 1,
      priority: priority || 0,
      order: positionOrder,
      isActive: isActive === undefined ? true : isActive,
    });

    await position.save();
    res.status(201).json(position);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update position
export const updatePosition = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      maxCandidates,
      maxSelections,
      priority,
      order,
      isActive,
    } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Position title is required" });
    }

    // Check current election
    const currentElection = await Election.findOne({ isCurrent: true });
    if (!currentElection) {
      return res.status(404).json({ message: "No active election found" });
    }

    // Check if position exists
    const position = await Position.findById(id);
    if (!position) {
      return res.status(404).json({ message: "Position not found" });
    }

    // Check if the title is already used by another position in the same election
    const existingPosition = await Position.findOne({
      title,
      electionId: currentElection._id,
      _id: { $ne: id },
    });

    if (existingPosition) {
      return res.status(400).json({ message: "Position title already in use" });
    }

    position.title = title;
    position.description = description || position.description;
    position.maxCandidates = maxCandidates || position.maxCandidates;
    position.maxSelections = maxSelections || position.maxSelections;
    position.priority = priority !== undefined ? priority : position.priority;
    position.order = order !== undefined ? order : position.order;
    position.isActive = isActive !== undefined ? isActive : position.isActive;

    await position.save();
    res.status(200).json(position);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete position
export const deletePosition = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if position exists
    const position = await Position.findById(id);
    if (!position) {
      return res.status(404).json({ message: "Position not found" });
    }

    await Position.findByIdAndDelete(id);
    res.status(200).json({ message: "Position deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// New endpoint to update position order
export const updatePositionOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { direction } = req.body;

    if (!["up", "down"].includes(direction)) {
      return res
        .status(400)
        .json({ message: "Direction must be 'up' or 'down'" });
    }

    // Get the current position
    const position = await Position.findById(id);
    if (!position) {
      return res.status(404).json({ message: "Position not found" });
    }

    // Find the adjacent position based on direction
    const adjacentPosition = await Position.findOne({
      electionId: position.electionId,
      order: direction === "up" ? position.order - 1 : position.order + 1,
    });

    if (!adjacentPosition) {
      return res.status(400).json({
        message: `Cannot move position ${direction}. No adjacent position found.`,
      });
    }

    // Swap the order values
    const tempOrder = position.order;
    position.order = adjacentPosition.order;
    adjacentPosition.order = tempOrder;

    // Save both positions
    await position.save();
    await adjacentPosition.save();

    // Get all positions with updated order
    const positions = await Position.find({
      electionId: position.electionId,
    }).sort({ order: 1 });

    res.status(200).json(positions);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Seed initial positions
export const seedDefaultPositions = async (req, res) => {
  try {
    const currentElection = await Election.findOne({ isCurrent: true });
    if (!currentElection) {
      return res.status(404).json({ message: "No active election found" });
    }

    // Check if positions already exist
    const existingCount = await Position.countDocuments({
      electionId: currentElection._id,
    });
    if (existingCount > 0) {
      return res
        .status(200)
        .json({ message: "Positions already exist for this election" });
    }

    // Default positions with order field
    const defaultPositions = [
      {
        title: "School Prefect",
        description: "School leader",
        priority: 1,
        order: 1,
        maxCandidates: 2,
      },
      {
        title: "Assistant School Prefect",
        description: "Assistant to the school leader",
        priority: 2,
        order: 2,
        maxCandidates: 2,
      },
      {
        title: "Academic Prefect",
        description: "Responsible for academic affairs",
        priority: 3,
        order: 3,
        maxCandidates: 2,
      },
      {
        title: "Sports Prefect",
        description: "Leads sports activities",
        priority: 4,
        order: 4,
        maxCandidates: 2,
      },
      {
        title: "Entertainment Prefect",
        description: "Organizes entertainment events",
        priority: 5,
        order: 5,
        maxCandidates: 2,
      },
      {
        title: "Health Prefect",
        description: "Oversees health related matters",
        priority: 6,
        order: 6,
        maxCandidates: 2,
      },
    ];

    const positions = [];
    for (const pos of defaultPositions) {
      const position = new Position({
        ...pos,
        electionId: currentElection._id,
        maxSelections: 1,
        isActive: true,
      });
      await position.save();
      positions.push(position);
    }

    res.status(201).json({
      message: "Default positions created successfully",
      count: positions.length,
      positions,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
