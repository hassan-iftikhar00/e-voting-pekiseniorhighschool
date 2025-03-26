import Year from "../models/Year.js";

// Get all years
export const getAllYears = async (req, res) => {
  try {
    const years = await Year.find().sort({ name: -1 });
    res.status(200).json(years);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new year
export const createYear = async (req, res) => {
  try {
    const { name, description, active } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({ message: "Year name is required" });
    }

    // Check if year already exists
    const existingYear = await Year.findOne({ name });
    if (existingYear) {
      return res.status(400).json({ message: "Year already exists" });
    }

    // Create new year
    const year = new Year({
      name,
      description,
      active,
    });

    await year.save();
    res.status(201).json(year);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update a year
export const updateYear = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, active } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({ message: "Year name is required" });
    }

    // Ensure we have at least one active year
    if (active === false) {
      const activeCount = await Year.countDocuments({ active: true });
      if (activeCount <= 1) {
        const currentActive = await Year.findOne({ _id: id, active: true });
        if (currentActive) {
          return res
            .status(400)
            .json({ message: "At least one year must be active" });
        }
      }
    }

    // Check if name already exists (excluding this year)
    const existingYear = await Year.findOne({ name, _id: { $ne: id } });
    if (existingYear) {
      return res.status(400).json({ message: "Year name already exists" });
    }

    // Update year
    const year = await Year.findByIdAndUpdate(
      id,
      { name, description, active },
      { new: true }
    );

    if (!year) {
      return res.status(404).json({ message: "Year not found" });
    }

    res.status(200).json(year);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
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
