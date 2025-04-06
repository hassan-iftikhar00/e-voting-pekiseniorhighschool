import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useRef,
} from "react";
import axios from "axios";

// Add a debug flag that can be toggled
const DEBUG = process.env.NODE_ENV === "development" && false; // Set to true to see debug logs in development

// Helper function to conditionally log based on debug mode
const debugLog = (...args: any[]) => {
  if (DEBUG) console.log(...args);
};

interface ElectionStats {
  totalVoters: number;
  votedCount: number;
  remainingVoters: number;
  completionPercentage: number;
  recentVoters: Array<{
    id: string;
    name: string;
    voterId: string;
    votedAt: Date;
  }>;
  votingActivity: {
    year: {
      labels: string[];
      data: number[];
    };
    class: {
      labels: string[];
      data: number[];
    };
    house: {
      labels: string[];
      data: number[];
    };
  };
}

interface ElectionStatus {
  status: "not-started" | "active" | "ended";
  electionDate: string;
  startTime: string;
  endTime: string;
  targetTime: string | null;
}

interface ElectionContextType {
  stats: ElectionStats;
  electionStatus: "not-started" | "active" | "ended";
  timeRemaining: string;
  isDemo: boolean;
  setIsDemo: (demo: boolean) => void;
  updateStats: () => void;
  loading: boolean;
  error: string | null;
}

const ElectionContext = createContext<ElectionContextType | undefined>(
  undefined
);

// Add API base URL helper
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Initial default stats - will be replaced with API data
const initialStats: ElectionStats = {
  totalVoters: 0,
  votedCount: 0,
  remainingVoters: 0,
  completionPercentage: 0,
  recentVoters: [],
  votingActivity: {
    year: { labels: [], data: [] },
    class: { labels: [], data: [] },
    house: { labels: [], data: [] },
  },
};

export const ElectionProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [stats, setStats] = useState<ElectionStats>(initialStats);
  const [isDemo, setIsDemo] = useState(false);
  const [electionStatus, setElectionStatus] = useState<
    "not-started" | "active" | "ended"
  >("not-started");
  const [timeRemaining, setTimeRemaining] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [targetTime, setTargetTime] = useState<Date | null>(null);
  const [useFallbackData, setUseFallbackData] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  const [lastDataHash, setLastDataHash] = useState<string>("");
  const [pollingInterval, setPollingInterval] = useState<number>(10000); // Start with 10s
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  // Helper function to create a simple hash of the data
  const createDataHash = (data: any): string => {
    return JSON.stringify({
      totalVoters: data.totalVoters,
      votedCount: data.votedCount,
      completionPercentage: data.completionPercentage,
    });
  };

  // Fetch election stats from API with better error handling
  const fetchElectionStats = async () => {
    // More aggressive throttling - 5 seconds between requests
    const now = Date.now();
    if (now - lastFetchTime < 5000) {
      debugLog("Throttling: Skipping request, too soon after last fetch");
      return;
    }

    setLastFetchTime(now);

    try {
      debugLog("Fetching election stats");
      const response = await fetch(`${API_BASE_URL}/api/elections/stats`);

      if (!response.ok) {
        throw new Error(`Failed to fetch stats: ${response.status}`);
      }

      const data = await response.json();

      // Create a hash of the received data
      const dataHash = createDataHash(data);

      // Check if data has actually changed
      if (dataHash === lastDataHash) {
        debugLog("Data unchanged, may reduce polling frequency");
        // Optionally increase polling interval if data is static
        if (pollingInterval < 30000) {
          // Cap at 30 seconds
          setPollingInterval((prev) => Math.min(prev * 1.5, 30000));
        }
      } else {
        // Data has changed, reset to faster polling
        setPollingInterval(10000);
        setLastDataHash(dataHash);

        // Transform dates in recentVoters
        const transformedData = {
          ...data,
          recentVoters: data.recentVoters.map((voter: any) => ({
            ...voter,
            votedAt: new Date(voter.votedAt),
          })),
        };

        setStats(transformedData);
        debugLog("Updated stats with new data");
      }
    } catch (err: any) {
      console.error("Error fetching election stats:", err); // Keep error logs
      setError(err.message);
      if (!useFallbackData) {
        setUseFallbackData(true);
      }
    }
  };

  // Update the function that fetches election status
  useEffect(() => {
    const fetchElectionStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/elections/status`);
        const data: any = await response.json();

        // Map "inactive" to "not-started" to match the expected type
        const mappedStatus: "not-started" | "active" | "ended" =
          data.status === "inactive" ? "not-started" : data.status;

        setElectionStatus(mappedStatus);
      } catch (error) {
        console.error("Error fetching election status:", error);
      }
    };

    // Poll every 10 seconds
    const intervalId = setInterval(fetchElectionStatus, 10000);

    // Cleanup interval on component unmount
    return () => clearInterval(intervalId);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await fetchElectionStats();
    } catch (err) {
      console.error("API error:", err);
      setError("Unable to fetch election data. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update time remaining periodically
  useEffect(() => {
    const updateTimer = () => {
      if (!targetTime) {
        setTimeRemaining("Election has ended");
        return;
      }

      const now = new Date();
      const diff = targetTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeRemaining("Election has ended");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeRemaining(
        `${hours.toString().padStart(2, "0")}:${minutes
          .toString()
          .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [targetTime]);

  // Update stats periodically during active election - with improved polling logic
  useEffect(() => {
    // First, clean up any existing interval
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }

    // Only set up polling if election is active
    if (electionStatus !== "active") {
      debugLog("Election not active, polling disabled");
      return;
    }

    debugLog(`Setting up polling interval: ${pollingInterval}ms`);

    // Initial fetch immediately
    fetchElectionStats();

    // Set up new interval with the current polling rate
    intervalIdRef.current = setInterval(() => {
      debugLog("Polling for stats");
      fetchElectionStats();
    }, pollingInterval);

    // Clean up function
    return () => {
      debugLog("Cleaning up polling interval");
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    };
  }, [electionStatus, pollingInterval]); // Re-run when election status or polling interval changes

  // Demo mode logic
  useEffect(() => {
    if (!isDemo) return;

    // Reset to initial state for demo
    setLoading(true);

    // Set up demo election with 5 min countdown
    const demoStart = new Date();
    demoStart.setMinutes(demoStart.getMinutes() + 2); // Start in 2 minutes
    const demoEnd = new Date(demoStart);
    demoEnd.setMinutes(demoEnd.getMinutes() + 3); // Run for 3 minutes

    // Set demo stats
    setStats({
      totalVoters: 592,
      votedCount: 458,
      remainingVoters: 134,
      completionPercentage: 77,
      recentVoters: [
        {
          id: "voter-1",
          name: "Voter 871",
          voterId: "VOTER6869",
          votedAt: new Date(),
        },
        {
          id: "voter-2",
          name: "Voter 882",
          voterId: "VOTER4497",
          votedAt: new Date(Date.now() - 30000),
        },
        {
          id: "voter-3",
          name: "Voter 319",
          voterId: "VOTER6207",
          votedAt: new Date(Date.now() - 60000),
        },
      ],
      votingActivity: {
        year: {
          labels: ["2023", "2024", "2025"],
          data: [120, 180, 160],
        },
        class: {
          labels: ["Form 3A", "Form 3B", "Form 3C", "Form 3D"],
          data: [210, 170, 140, 90],
        },
        house: {
          labels: ["Red House", "Blue House", "Green House", "Yellow House"],
          data: [150, 190, 130, 170],
        },
      },
    });

    const now = new Date();
    if (now < demoStart) {
      setElectionStatus("not-started");
      setTargetTime(demoStart);
    } else if (now < demoEnd) {
      setElectionStatus("active");
      setTargetTime(demoEnd);
    } else {
      setElectionStatus("ended");
      setTargetTime(null);
    }

    setLoading(false);

    // Demo mode update for simulating votes
    let demoInterval: NodeJS.Timeout; // Change from number to NodeJS.Timeout

    if (electionStatus === "active") {
      demoInterval = setInterval(() => {
        setStats((prev) => {
          const newVotedCount = Math.min(prev.votedCount + 1, prev.totalVoters);
          const newRemainingVoters = prev.totalVoters - newVotedCount;
          const newCompletionPercentage = Math.round(
            (newVotedCount / prev.totalVoters) * 100
          );

          const newVoter = {
            id: `voter-${Date.now()}`,
            name: `Voter ${Math.floor(Math.random() * 1000)}`,
            voterId: `VOTER${Math.floor(Math.random() * 10000)}`,
            votedAt: new Date(),
          };

          return {
            ...prev,
            votedCount: newVotedCount,
            remainingVoters: newRemainingVoters,
            completionPercentage: newCompletionPercentage,
            recentVoters: [newVoter, ...prev.recentVoters.slice(0, 2)],
          };
        });
      }, 5000);
    }

    return () => {
      if (demoInterval) clearInterval(demoInterval);
    };
  }, [isDemo, electionStatus]);

  const updateStats = () => {
    fetchElectionStats();
  };

  return (
    <ElectionContext.Provider
      value={{
        stats,
        electionStatus,
        timeRemaining,
        isDemo,
        setIsDemo,
        updateStats,
        loading,
        error,
      }}
    >
      {children}
    </ElectionContext.Provider>
  );
};

export const useElection = () => {
  const context = useContext(ElectionContext);
  if (context === undefined) {
    throw new Error("useElection must be used within an ElectionProvider");
  }
  return context;
};
