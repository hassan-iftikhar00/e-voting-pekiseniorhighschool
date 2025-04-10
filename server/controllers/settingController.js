import Setting from "../models/Setting.js";
import Election from "../models/Election.js";

// Cache for settings to reduce database queries
let settingsCache = null;
let settingsCacheTime = null;
const CACHE_DURATION = 300000; // 5 minutes in milliseconds

// Get all settings
export const getSettings = async (req, res) => {
  try {
    // Add performance metrics
    const startTime = Date.now();
    console.log(
      `[PERF][SERVER] Settings request received at ${new Date().toISOString()}`
    );

    // Check if we have valid cached settings
    const now = Date.now();
    if (
      settingsCache &&
      settingsCacheTime &&
      now - settingsCacheTime < CACHE_DURATION
    ) {
      console.log(
        `[PERF][SERVER] Returning cached settings (age: ${
          (now - settingsCacheTime) / 1000
        }s)`
      );

      // Set appropriate caching headers to help client-side caching
      res.set("Cache-Control", `private, max-age=${CACHE_DURATION / 1000}`);
      res.set("ETag", `"${settingsCacheTime}"`);

      // Check if client has the latest version
      const clientETag = req.headers["if-none-match"];
      if (clientETag === `"${settingsCacheTime}"`) {
        console.log(
          `[PERF][SERVER] Client has current version, returning 304 Not Modified`
        );
        console.log(`[PERF][SERVER] Total time: ${Date.now() - startTime}ms`);
        return res.status(304).end(); // Not Modified
      }

      console.log(`[PERF][SERVER] Total time: ${Date.now() - startTime}ms`);
      return res.json(settingsCache);
    }

    // If we need to fetch from database
    console.log("[PERF][SERVER] Fetching settings from database");
    const dbFetchStart = Date.now();

    // Find settings document or create one if it doesn't exist
    let settings = await Setting.findOne().lean().exec();
    console.log(
      `[PERF][SERVER] Settings DB fetch took: ${Date.now() - dbFetchStart}ms`
    );

    if (!settings) {
      console.log("[PERF][SERVER] Creating new settings document");
      const newSettings = new Setting();
      await newSettings.save();
      settings = newSettings.toObject();
    }

    // Get current election data to supplement settings
    const electionFetchStart = Date.now();
    const currentElection = await Election.findOne({ isCurrent: true })
      .lean()
      .exec();
    console.log(
      `[PERF][SERVER] Election DB fetch took: ${
        Date.now() - electionFetchStart
      }ms`
    );

    if (currentElection) {
      // Synchronize election dates with settings
      settings.electionDate = currentElection.date;
      settings.electionStartDate =
        currentElection.startDate || currentElection.date;
      settings.electionEndDate =
        currentElection.endDate || currentElection.date;
      settings.electionStartTime =
        currentElection.startTime?.substring(0, 5) || "08:00";
      settings.electionEndTime =
        currentElection.endTime?.substring(0, 5) || "17:00";
      settings.electionTitle = currentElection.title || settings.electionTitle;
      settings.isActive = currentElection.isActive;
    }

    // Update the cache with better efficiency
    settingsCache = settings;
    settingsCacheTime = now;

    // Set response headers for better client caching
    res.set("Cache-Control", `private, max-age=${CACHE_DURATION / 1000}`);
    res.set("ETag", `"${settingsCacheTime}"`);

    console.log(
      `[PERF][SERVER] Total settings processing time: ${
        Date.now() - startTime
      }ms`
    );
    res.json(settingsCache);
  } catch (error) {
    console.error("[PERF][SERVER] Error fetching settings:", error);
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

    console.log("Updating settings with:", req.body);

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
    if (systemName) {
      settings.systemName = systemName;
    }
    // Update companyName and schoolName independently
    if (req.body.companyName) {
      settings.companyName = req.body.companyName;
    }
    if (req.body.schoolName) {
      settings.schoolName = req.body.schoolName;
    }
    // Update companyLogo and schoolLogo independently
    if (req.body.companyLogo) {
      settings.companyLogo = req.body.companyLogo;
    }
    if (req.body.schoolLogo) {
      settings.schoolLogo = req.body.schoolLogo;
    }
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

      // Update startDate and endDate with the proper values from settings
      if (votingStartDate && currentElection.startDate !== votingStartDate) {
        currentElection.startDate = votingStartDate;
        needsUpdate = true;
      }

      if (votingEndDate && currentElection.endDate !== votingEndDate) {
        currentElection.endDate = votingEndDate;
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
          startDate: currentElection.startDate,
          endDate: currentElection.endDate,
          startTime: currentElection.startTime,
          endTime: currentElection.endTime,
          isActive: currentElection.isActive,
        });
        await currentElection.save();
      }
    }

    // Invalidate cache when settings are updated
    settingsCache = null;
    settingsCacheTime = null;

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
