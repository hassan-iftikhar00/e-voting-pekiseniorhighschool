import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

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

  // Fetch election stats from API with better error handling
  const fetchElectionStats = async () => {
    try {
      console.log(
        `Fetching election stats from ${API_BASE_URL}/api/elections/stats`
      );
      const response = await fetch(`${API_BASE_URL}/api/elections/stats`);

      const data = await response.json();
      console.log("Received election stats:", data);

      // Only set stats if we have voter data
      if (data.totalVoters > 0 || !data.message) {
        // Transform dates in recentVoters
        const transformedData = {
          ...data,
          recentVoters: data.recentVoters.map((voter: any) => ({
            ...voter,
            votedAt: new Date(voter.votedAt),
          })),
        };

        setStats(transformedData);
      }
    } catch (err: any) {
      console.error("Error fetching election stats:", err);
      setError(err.message);
      // Switch to fallback data if we haven't already
      if (!useFallbackData) {
        setUseFallbackData(true);
      }
    }
  };

  // Fetch election status from API with better error handling
  const fetchElectionStatus = async () => {
    try {
      console.log(
        `Fetching election status from ${API_BASE_URL}/api/elections/status`
      );
      const response = await fetch(`${API_BASE_URL}/api/elections/status`);

      const data = await response.json();
      console.log("Received election status:", data);

      // Even if there's a message about no active election, continue with the data we got
      setElectionStatus(data.status);
      if (data.targetTime) {
        setTargetTime(new Date(data.targetTime));
      } else {
        setTargetTime(null);
      }

      // Check if we need to create a default election
      if (data.message === "No active election found") {
        console.log("No active election found. Creating default election...");
        try {
          await fetch(`${API_BASE_URL}/api/elections/default`, {
            method: "POST",
          });
        } catch (createErr) {
          console.error("Failed to create default election", createErr);
        }
      }
    } catch (err: any) {
      console.error("Error fetching election status:", err);
      setError(err.message);
      // Switch to fallback data
      setUseFallbackData(true);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch of election data with fallback handling
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        await fetchElectionStatus();
        await fetchElectionStats();
      } catch (err) {
        console.error("API unavailable, switching to fallback data", err);
        setUseFallbackData(true);

        // Set demo/fallback data
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
              labels: [
                "Red House",
                "Blue House",
                "Green House",
                "Yellow House",
              ],
              data: [150, 190, 130, 170],
            },
          },
        });

        setElectionStatus("active");

        // Set a target time 30 minutes from now
        const end = new Date();
        end.setMinutes(end.getMinutes() + 30);
        setTargetTime(end);
      } finally {
        setLoading(false);
      }
    };

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
        fetchElectionStatus(); // Re-fetch status as the election state might have changed
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

  // Update stats periodically during active election
  useEffect(() => {
    if (electionStatus !== "active") return;

    const interval = setInterval(() => {
      fetchElectionStats();
    }, 10000); // Every 10 seconds

    return () => clearInterval(interval);
  }, [electionStatus]);

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
