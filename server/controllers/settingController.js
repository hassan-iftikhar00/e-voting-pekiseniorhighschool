import Setting from "../models/Setting.js";
import Election from "../models/Election.js";
import { getCircuitBreaker } from "../utils/circuitBreaker.js";
import cacheManager from "../utils/cacheManager.js";

// Timeout constants
const QUERY_TIMEOUT = 10000; // 10 seconds
const ELECTION_QUERY_TIMEOUT = 5000; // 5 seconds

// Create circuit breaker for settings with more robust fallback
const settingsCircuitBreaker = getCircuitBreaker("settings", {
  failureThreshold: 3,
  resetTimeout: 60000, // 1 minute
  successThreshold: 2, // 2 successful operations to close circuit
  fallback: (req, res) => {
    console.log("[CIRCUIT BREAKER] Using fallback for settings");

    // Use cache if available (even if expired)
    const cachedSettings = cacheManager.get("settings", { allowExpired: true });
    if (cachedSettings) {
      console.log("[CIRCUIT BREAKER] Returning cached settings as fallback");
      res.set("X-Settings-Source", "circuit-breaker-cache");
      return cachedSettings;
    }

    // Create defaults as last resort
    console.log("[CIRCUIT BREAKER] Creating default settings as last resort");
    const defaultSettings = createDefaultSettings();
    return defaultSettings;
  },
});

// Get settings with timeout and fallback
export const getSettings = async (req, res) => {
  const startTime = Date.now();
  console.log(
    `[PERF][SERVER] Settings request received at ${new Date().toISOString()}`
  );

  try {
    // Try to get cached settings first (using the new cache manager)
    const cachedSettings = cacheManager.get("settings");
    if (cachedSettings) {
      console.log(
        `[PERF][SERVER] Returning cached settings from ${new Date(
          cacheManager.cache.get("settings").created
        ).toISOString()}`
      );

      // Add ETag for client-side caching
      const etag = `"${cacheManager.cache.get("settings").created}"`;
      res.set("ETag", etag);

      // Check if client has the latest version
      const clientETag = req.headers["if-none-match"];
      if (clientETag === etag) {
        console.log(
          `[PERF][SERVER] Client has current version, returning 304 Not Modified`
        );
        console.log(`[PERF][SERVER] Total time: ${Date.now() - startTime}ms`);
        return res.status(304).end(); // Not Modified
      }

      console.log(`[PERF][SERVER] Total time: ${Date.now() - startTime}ms`);
      res.set("X-Settings-Source", "cache");
      return res.json(cachedSettings);
    }

    // Execute with circuit breaker protection
    const settings = await settingsCircuitBreaker.execute(
      async () => {
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
            "[PERF][SERVER] Settings query timed out, using fallback"
          );

          // Try to get expired cache as fallback
          const expiredCache = cacheManager.get("settings", {
            allowExpired: true,
          });
          if (expiredCache) {
            console.log(
              "[PERF][SERVER] Using expired cached settings as fallback"
            );
            res.set("X-Settings-Source", "expired-cache-fallback");
            return expiredCache;
          }

          // Create default settings if no cache available
          settings = createDefaultSettings();
          res.set("X-Settings-Source", "default-fallback");
        }

        console.log(
          `[PERF][SERVER] Settings DB fetch took: ${
            Date.now() - dbFetchStart
          }ms`
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

        return settings;
      },
      req,
      res
    );

    // If circuit breaker fallback sent a response directly, we're done
    if (!settings) return;

    // Cache the settings (this happens regardless of source)
    cacheManager.set("settings", settings, {
      ttl: 10 * 60 * 1000, // 10 minutes
      source: "database",
    });

    // Try to add supplemental election data
    try {
      const electionFetchStart = Date.now();
      const currentElection = await Promise.race([
        Election.findOne({ isCurrent: true }).lean().exec(),
        new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error("Election query timeout")),
            ELECTION_QUERY_TIMEOUT
          )
        ),
      ]);

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
        settings.electionTitle =
          currentElection.title || settings.electionTitle;
        settings.isActive = currentElection.isActive;
      }
    } catch (electionError) {
      console.warn(
        "[PERF][SERVER] Election fetch error:",
        electionError.message
      );
      // Proceed without election data
    }

    console.log(
      `[PERF][SERVER] Total settings processing time: ${
        Date.now() - startTime
      }ms`
    );

    // Set ETag for client caching
    const etag = `"${Date.now()}"`;
    res.set("ETag", etag);
    res.set("X-Settings-Source", "database");

    return res.json(settings);
  } catch (error) {
    console.error("Error retrieving settings:", error);

    // Try to get even expired cached settings in case of error
    const cachedSettings = cacheManager.get("settings", { allowExpired: true });
    if (cachedSettings) {
      console.log(
        "[PERF][SERVER] Error fetching settings, using cached version"
      );
      res.set("X-Settings-Source", "error-fallback");
      return res.json(cachedSettings);
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
    if (systemName) settings.systemName = systemName;
    if (req.body.companyName) settings.companyName = req.body.companyName;
    if (req.body.schoolName) settings.schoolName = req.body.schoolName;
    if (req.body.companyLogo) settings.companyLogo = req.body.companyLogo;
    if (req.body.schoolLogo) settings.schoolLogo = req.body.schoolLogo;

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
    cacheManager.invalidate("settings");
    cacheManager.invalidate("electionStatus");

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
