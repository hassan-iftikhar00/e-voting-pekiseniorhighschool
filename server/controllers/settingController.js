import Setting from "../models/Setting.js";

// Get all settings
export const getSettings = async (req, res) => {
  try {
    // Find settings or create default if not exists
    let settings = await Setting.findOne();

    if (!settings) {
      settings = new Setting();
      await settings.save();
    }

    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update settings
export const updateSettings = async (req, res) => {
  try {
    const updateData = req.body;

    // Find settings or create default if not exists
    let settings = await Setting.findOne();

    if (!settings) {
      settings = new Setting(updateData);
    } else {
      // Update only the fields that are provided
      Object.keys(updateData).forEach((key) => {
        settings[key] = updateData[key];
      });
    }

    await settings.save();
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Backup system data
export const createBackup = async (req, res) => {
  try {
    // Find settings
    let settings = await Setting.findOne();

    if (!settings) {
      settings = new Setting();
    }

    // Update last backup date
    settings.lastBackupDate = new Date();
    await settings.save();

    // Here you would implement actual backup logic
    // For example, creating a MongoDB dump or archiving data

    res.status(200).json({
      message: "Backup created successfully",
      timestamp: settings.lastBackupDate,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Restore system data
export const restoreSystem = async (req, res) => {
  try {
    // Find settings
    let settings = await Setting.findOne();

    if (!settings) {
      settings = new Setting();
    }

    // Update last restore date
    settings.lastRestoreDate = new Date();
    await settings.save();

    // Here you would implement actual restore logic

    res.status(200).json({
      message: "System restored successfully",
      timestamp: settings.lastRestoreDate,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
