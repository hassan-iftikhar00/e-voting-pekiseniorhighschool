import House from "../models/House.js";

// Get all houses
export const getAllHouses = async (req, res) => {
  try {
    const houses = await House.find().sort({ name: 1 }); // Sort by name
    res.status(200).json(houses);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new house
export const createHouse = async (req, res) => {
  try {
    const { name, description, color, active } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({ message: "House name is required" });
    }

    if (!color) {
      return res.status(400).json({ message: "House color is required" });
    }

    // Check if house already exists
    const existingHouse = await House.findOne({ name });
    if (existingHouse) {
      return res.status(400).json({ message: "House already exists" });
    }

    // Create new house
    const newHouse = new House({
      name,
      description,
      color,
      active: active !== undefined ? active : true,
    });

    await newHouse.save();
    res.status(201).json(newHouse);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update a house
export const updateHouse = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, color, active } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({ message: "House name is required" });
    }

    if (!color) {
      return res.status(400).json({ message: "House color is required" });
    }

    // Check if name already exists (excluding this house)
    const existingHouse = await House.findOne({ name, _id: { $ne: id } });
    if (existingHouse) {
      return res.status(400).json({ message: "House name already exists" });
    }

    // Update house
    const updatedHouse = await House.findByIdAndUpdate(
      id,
      { name, description, color, active },
      { new: true }
    );

    if (!updatedHouse) {
      return res.status(404).json({ message: "House not found" });
    }

    res.status(200).json(updatedHouse);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a house
export const deleteHouse = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedHouse = await House.findByIdAndDelete(id);
    if (!deletedHouse) {
      return res.status(404).json({ message: "House not found" });
    }

    res.status(200).json({ message: "House deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Toggle house active status
export const toggleHouseStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const house = await House.findById(id);
    if (!house) {
      return res.status(404).json({ message: "House not found" });
    }

    house.active = !house.active;
    await house.save();

    res.status(200).json(house);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
