import Class from "../models/Class.js";

// Get all classes
export const getAllClasses = async (req, res) => {
  try {
    const classes = await Class.find().sort({ name: 1 }); // Sort by name
    res.status(200).json(classes);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a new class
export const createClass = async (req, res) => {
  try {
    const { name, description, active } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({ message: "Class name is required" });
    }

    // Check if class already exists
    const existingClass = await Class.findOne({ name });
    if (existingClass) {
      return res.status(400).json({ message: "Class already exists" });
    }

    // Create new class
    const newClass = new Class({
      name,
      description,
      active: active !== undefined ? active : true,
    });

    await newClass.save();
    res.status(201).json(newClass);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update a class
export const updateClass = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, active } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({ message: "Class name is required" });
    }

    // Check if name already exists (excluding this class)
    const existingClass = await Class.findOne({ name, _id: { $ne: id } });
    if (existingClass) {
      return res.status(400).json({ message: "Class name already exists" });
    }

    // Update class
    const updatedClass = await Class.findByIdAndUpdate(
      id,
      { name, description, active },
      { new: true }
    );

    if (!updatedClass) {
      return res.status(404).json({ message: "Class not found" });
    }

    res.status(200).json(updatedClass);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Delete a class
export const deleteClass = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedClass = await Class.findByIdAndDelete(id);
    if (!deletedClass) {
      return res.status(404).json({ message: "Class not found" });
    }

    res.status(200).json({ message: "Class deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Toggle class active status
export const toggleClassStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const classObj = await Class.findById(id);
    if (!classObj) {
      return res.status(404).json({ message: "Class not found" });
    }

    classObj.active = !classObj.active;
    await classObj.save();

    res.status(200).json(classObj);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
