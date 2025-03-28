import Setting from "../models/Setting.js";
import Election from "../models/Election.js";

// Get all settings
export const getSettings = async (req, res) => {
  try {
    // Find settings document or create one if it doesn't exist
    let settings = await Setting.findOne();

    if (!settings) {
      console.log("No settings found, creating default settings");
      settings = await Setting.create(DEFAULT_SETTINGS);
    }

    // Get current election for election-specific settings
    const currentElection = await Election.findOne({ isCurrent: true });
    if (currentElection) {
      console.log("Found current election with properties:", {
        date: currentElection.date,
        startTime: currentElection.startTime,
        endTime: currentElection.endTime,
        isActive: currentElection.isActive,
        title: currentElection.title,
      });

      // Sync settings with current election
      settings.isActive = currentElection.isActive;
      settings.electionTitle = currentElection.title;

      // If settings doesn't have dates, use the election's date
      if (!settings.votingStartDate) {
        settings.votingStartDate = currentElection.date;
      }

      if (!settings.votingEndDate) {
        settings.votingEndDate = currentElection.date;
      }

      // Save any changes
      await settings.save();
    }

    console.log("Returning settings:", settings);
    res.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Update settings
export const updateSettings = async (req, res) => {
  try {
    // Extract settings from request body
    const {
      systemName,
      electionTitle,
      votingStartDate,
      votingEndDate,
      votingStartTime,
      votingEndTime,
      resultsPublished,
      allowVoterRegistration,
      requireEmailVerification,
      maxVotesPerVoter,
      systemLogo,
      isActive,
    } = req.body;

    console.log("Updating settings with data:", req.body);

    // Validate required fields
    if (!systemName) {
      return res.status(400).json({ message: "System name is required" });
    }

    // Find existing settings or create new
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting();
    }

    // Update settings model
    settings.systemName = systemName;
    settings.electionTitle = electionTitle;
    settings.votingStartDate = votingStartDate;
    settings.votingEndDate = votingEndDate;
    settings.votingStartTime = votingStartTime;
    settings.votingEndTime = votingEndTime;
    settings.resultsPublished = resultsPublished;
    settings.allowVoterRegistration = allowVoterRegistration;
    settings.requireEmailVerification = requireEmailVerification;
    settings.maxVotesPerVoter = maxVotesPerVoter;
    if (systemLogo) settings.systemLogo = systemLogo;

    // Update isActive if provided
    if (isActive !== undefined) {
      settings.isActive = isActive;
    }

    // Save settings
    await settings.save();

    // Also update the current election for date/time values
    const currentElection = await Election.findOne({ isCurrent: true });
    if (currentElection) {
      let needsUpdate = false;

      // Update election title if different
      if (electionTitle && currentElection.title !== electionTitle) {
        currentElection.title = electionTitle;
        needsUpdate = true;
      }

      // Update election date if it's different
      if (votingStartDate && currentElection.date !== votingStartDate) {
        currentElection.date = votingStartDate;
        needsUpdate = true;
      }

      // Add seconds to time values if not present
      let startTime = votingStartTime;
      if (startTime && !startTime.includes(":")) {
        startTime += ":00";
      } else if (startTime && startTime.length === 5) {
        startTime += ":00";
      }

      let endTime = votingEndTime;
      if (endTime && !endTime.includes(":")) {
        endTime += ":00";
      } else if (endTime && endTime.length === 5) {
        endTime += ":00";
      }

      // Update start/end times if different
      if (startTime && currentElection.startTime !== startTime) {
        currentElection.startTime = startTime;
        needsUpdate = true;
      }

      if (endTime && currentElection.endTime !== endTime) {
        currentElection.endTime = endTime;
        needsUpdate = true;
      }

      // Update isActive status
      if (isActive !== undefined && currentElection.isActive !== isActive) {
        currentElection.isActive = isActive;
        needsUpdate = true;
      }

      if (needsUpdate) {
        console.log("Updating election with new settings:", {
          title: currentElection.title,
          date: currentElection.date,
          startTime: currentElection.startTime,
          endTime: currentElection.endTime,
          isActive: currentElection.isActive,
        });
        await currentElection.save();
      }
    }

    res.status(200).json({
      message: "Settings updated successfully",
      settings,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Create a backup
export const createBackup = async (req, res) => {
  // Backup implementation...
};

// Restore from backup
export const restoreSystem = async (req, res) => {
  // Restore implementation...
};
