import Year from "../models/Year.js";

// Get all years
export const getAllYears = async (req, res) => {
  try {
    const years = await Year.find().sort({ name: 1 }); // Sort by name
    res.status(200).json(years);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new year
export const createYear = async (req, res) => {
  try {
    const { name, description, active } = req.body;

    // If the new year is set as active, deactivate all other years
    if (active) {
      await Year.updateMany({ active: true }, { active: false });
    }

    const newYear = new Year({ name, description, active });
    await newYear.save();

    res.status(201).json(newYear);
  } catch (error) {
    console.error("Error creating year:", error);
    res
      .status(500)
      .json({ message: "Failed to create year", error: error.message });
  }
};

// Update a year
export const updateYear = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, active } = req.body;

    // If the updated year is set as active, deactivate all other years
    if (active) {
      await Year.updateMany({ active: true }, { active: false });
    }

    const updatedYear = await Year.findByIdAndUpdate(
      id,
      { name, description, active },
      { new: true }
    );

    if (!updatedYear) {
      return res.status(404).json({ message: "Year not found" });
    }

    res.status(200).json(updatedYear);
  } catch (error) {
    console.error("Error updating year:", error);
    res
      .status(500)
      .json({ message: "Failed to update year", error: error.message });
  }
};

// Delete a year
export const deleteYear = async (req, res) => {
  try {
    const { id } = req.params;

    // Don't allow deleting active year
    const year = await Year.findById(id);

    if (!year) {
      return res.status(404).json({ message: "Year not found" });
    }

    if (year.active) {
      return res.status(400).json({ message: "Cannot delete the active year" });
    }

    await Year.findByIdAndDelete(id);
    res.status(200).json({ message: "Year deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Set a year as active
export const setActiveYear = async (req, res) => {
  try {
    const { id } = req.params;

    const year = await Year.findById(id);
    if (!year) {
      return res.status(404).json({ message: "Year not found" });
    }

    year.active = true;
    await year.save();

    res.status(200).json(year);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
