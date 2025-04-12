import Setting from "../models/Setting.js";
import Election from "../models/Election.js";

// Improved cache mechanism with timeout protection
let settingsCache = null;
let settingsCacheTime = null;
const CACHE_MAX_AGE = 10 * 60 * 1000; // 10 minutes
const QUERY_TIMEOUT = 10000; // 10 seconds

// Get settings with timeout and fallback
export const getSettings = async (req, res) => {
  const startTime = Date.now();
  console.log(
    `[PERF][SERVER] Settings request received at ${new Date().toISOString()}`
  );

  try {
    // Check for valid cache
    if (settingsCache && Date.now() - settingsCacheTime < CACHE_MAX_AGE) {
      console.log(
        `[PERF][SERVER] Returning cached settings from ${new Date(
          settingsCacheTime
        ).toISOString()}`
      );

      // Add ETag for caching
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

    // If we need to fetch from database, use a timeout
    console.log(
      "[PERF][SERVER] Fetching settings from database with timeout protection"
    );
    const dbFetchStart = Date.now();

    // Create a promise that will reject after timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error("Database query timed out"));
      }, QUERY_TIMEOUT);
    });

    // Create the actual database query
    const queryPromise = Setting.findOne().lean().exec();

    // Race the query against the timeout
    let settings;
    try {
      settings = await Promise.race([queryPromise, timeoutPromise]);
    } catch (timeoutError) {
      console.warn(
        "[PERF][SERVER] Settings query timed out, using default values"
      );

      // Check if we have a previous cache we can use
      if (settingsCache) {
        console.log(
          "[PERF][SERVER] Using previous cached settings as fallback"
        );
        res.set("X-Settings-Source", "cached-fallback");
        return res.json(settingsCache);
      }

      // Create default settings if no cache available
      settings = createDefaultSettings();
      res.set("X-Settings-Source", "default-fallback");
    }

    console.log(
      `[PERF][SERVER] Settings DB fetch took: ${Date.now() - dbFetchStart}ms`
    );

    if (!settings) {
      console.log("[PERF][SERVER] Creating new settings document");
      const newSettings = createDefaultSettings();

      // Try to save in background but don't wait for it
      Setting.create(newSettings).catch((err) =>
        console.error("Error saving default settings:", err)
      );

      settings = newSettings;
    }

    // Update cache
    settingsCache = settings;
    settingsCacheTime = Date.now();

    // Get current election data to supplement settings
    const electionFetchStart = Date.now();
    let currentElection;

    try {
      currentElection = await Promise.race([
        Election.findOne({ isCurrent: true }).lean().exec(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Election query timeout")), 5000)
        ),
      ]);
    } catch (electionError) {
      console.warn(
        "[PERF][SERVER] Election fetch timed out, using cached values if available"
      );
      // Proceed without election data
    }

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

    console.log(
      `[PERF][SERVER] Total settings processing time: ${
        Date.now() - startTime
      }ms`
    );
    res.set("X-Settings-Source", "database");
    res.set("ETag", `"${settingsCacheTime}"`);
    return res.json(settings);
  } catch (error) {
    console.error("Error retrieving settings:", error);

    // If we have cached settings, return those even on error
    if (settingsCache) {
      console.log(
        "[PERF][SERVER] Error fetching settings, using cached version"
      );
      res.set("X-Settings-Source", "error-fallback");
      return res.json(settingsCache);
    }

    // Last resort - create default settings
    const defaultSettings = createDefaultSettings();
    res.set("X-Settings-Source", "error-default");
    return res.status(200).json(defaultSettings);
  }
};

// Helper function to create default settings
function createDefaultSettings() {
  return {
    isActive: true,
    electionTitle: "Student Council Election",
    votingStartDate: new Date().toISOString().split("T")[0],
    votingEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    votingStartTime: "08:00",
    votingEndTime: "17:00",
    resultsPublished: false,
    allowVoterRegistration: false,
    requireEmailVerification: false,
    maxVotesPerVoter: 1,
    systemName: "Peki Senior High School Elections",
    systemLogo: "",
    companyName: "",
    companyLogo: "",
    schoolName: "Peki Senior High School",
    schoolLogo: "",
  };
}

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
