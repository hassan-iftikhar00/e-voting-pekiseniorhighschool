import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Key,
  AlertCircle,
  Clock,
  User,
  Calendar,
  School,
  Activity,
  X,
  ChevronUp,
  RefreshCw,
  Shield,
  Users,
  Check,
  Maximize2,
} from "lucide-react";
import { useUser } from "../context/UserContext";
import axios from "axios";
import { useElection } from "../context/ElectionContext";
import { useSettings } from "../context/SettingsContext";
import { motion, AnimatePresence } from "framer-motion";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import VoteSuccess from "./VoteSuccess";

ChartJS.register(ArcElement, Tooltip, Legend);

// Add this near the top of the file, outside the component
const DEBUG = false; // Set to false to disable all console logs

// Define interface for candidate
interface Candidate {
  id: string;
  name: string;
  imageUrl: string | null;
  bio?: string;
  manifesto?: string;
}

// Define type for candidates by position
type CandidatesByPosition = {
  [key: string]: Candidate[];
};

// Define interface for voter - update to match ElectionContext's RecentVoter
interface RecentVoter {
  _id: string; // Keep as _id as it matches with API response
  name: string;
  voterId: string;
  votedAt: string;
}

const VotingAuth: React.FC = () => {
  const [votingId, setVotingId] = useState("");
  const [error, setError] = useState("");
  const [usedVoterInfo, setUsedVoterInfo] = useState<{
    name: string;
    voterId: string;
    votedAt: Date;
  } | null>(null);
  const [showMonitor, setShowMonitor] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [candidatesByPosition, setCandidatesByPosition] =
    useState<CandidatesByPosition>({});
  const [positions, setPositions] = useState<string[]>([]);
  const [recentVoters, setRecentVoters] = useState<RecentVoter[]>([]);
  const [loading, setLoading] = useState({
    candidates: true,
    recentVoters: true,
    submit: false, // Add a new property for submit operation
  });

  const monitorRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { setUser } = useUser();
  const { stats, electionStatus: contextElectionStatus } = useElection();
  const { settings } = useSettings();

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const [currentElection, setCurrentElection] = useState<{
    title: string;
    date: string;
    startDate?: string;
    endDate?: string;
    startTime: string;
    endTime: string;
    isActive: boolean;
    resultsPublished?: boolean;
  } | null>(null);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [electionStatus, setElectionStatus] = useState<
    "not-started" | "active" | "ended"
  >("not-started");

  const [voterId, setVoterId] = useState("");
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  // Add new state for the VoteSuccess popup
  const [showVoteSuccess, setShowVoteSuccess] = useState(false);
  const [votedVoterData, setVotedVoterData] = useState<any>(null);

  const fetchCurrentElection = async () => {
    try {
      // Try the fast endpoint first
      const quickEndpoint = `${apiUrl}/api/election-status-quick?timestamp=${new Date().getTime()}`;

      try {
        // Set a shorter timeout for this request - 3 seconds max
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(quickEndpoint, {
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          setCurrentElection(data);
          return;
        }
      } catch (quickError) {
        console.log("Fast endpoint failed, falling back to regular endpoint");
      }

      // If quick endpoint fails, fall back to regular endpoint
      const response = await fetch(
        `${apiUrl}/api/election/status?timestamp=${new Date().getTime()}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch election status: ${response.status}`);
      }

      const data = await response.json();
      setCurrentElection(data);
    } catch (error) {
      if (DEBUG) console.error("Error fetching election data:", error);

      // Create default election with fallback values
      // Don't try to access properties on contextElectionStatus since it's just a string
      setCurrentElection({
        title: "Election",
        date: new Date().toISOString().split("T")[0],
        startDate: undefined,
        endDate: undefined,
        startTime: "08:00:00",
        endTime: "17:00:00",
        isActive: contextElectionStatus === "active",
      });
    }
  };

  const formatElectionDate = (dateString?: string) => {
    if (!dateString) return "Unknown date";

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch (e) {
      console.error("Error formatting date:", e);
      return dateString;
    }
  };

  const updateTimeRemaining = useCallback(() => {
    if (!currentElection) {
      setTimeRemaining("Loading...");
      return;
    }

    const now = new Date();
    let targetDate;

    try {
      if (currentElection.isActive) {
        const dateStr = currentElection.endDate || currentElection.date;

        // Add validation check for dateStr
        if (!dateStr) {
          console.error("Invalid date string for end date");
          setTimeRemaining("Date unavailable");
          return;
        }

        // Only log in debug mode
        const dateParts = dateStr.split("-").map(Number);
        if (dateParts.length !== 3 || dateParts.some(isNaN)) {
          console.error("Invalid date format:", dateStr);
          setTimeRemaining("Date format error");
          return;
        }

        const [year, month, day] = dateParts;

        // Validate time parts
        const timeParts = (currentElection.endTime || "16:00")
          .split(":")
          .map(Number);

        if (timeParts.some(isNaN)) {
          console.error("Invalid time format:", currentElection.endTime);
          setTimeRemaining("Time format error");
          return;
        }

        const [hours, minutes] = timeParts;

        // Create date safely
        targetDate = new Date(year, month - 1, day, hours, minutes);

        // Validate the created date
        if (isNaN(targetDate.getTime())) {
          console.error("Created an invalid date object");
          setTimeRemaining("Date calculation error");
          return;
        }

        if (targetDate <= now) {
          if (DEBUG) console.log("End date is in the past");
          setTimeRemaining("Election has ended");
          setElectionStatus("ended");
          return;
        }
      } else {
        const dateStr = currentElection.startDate || currentElection.date;

        // Add validation check for dateStr
        if (!dateStr) {
          console.error("Invalid date string for start date");
          setTimeRemaining("Date unavailable");
          return;
        }

        // Validate date parts
        const dateParts = dateStr.split("-").map(Number);
        if (dateParts.length !== 3 || dateParts.some(isNaN)) {
          console.error("Invalid date format:", dateStr);
          setTimeRemaining("Date format error");
          return;
        }

        const [year, month, day] = dateParts;

        // Validate time parts
        const timeParts = (currentElection.startTime || "08:00")
          .split(":")
          .map(Number);

        if (timeParts.some(isNaN)) {
          console.error("Invalid time format:", currentElection.startTime);
          setTimeRemaining("Time format error");
          return;
        }

        const [hours, minutes] = timeParts;

        // Create date safely
        targetDate = new Date(year, month - 1, day, hours, minutes);

        // Validate the created date
        if (isNaN(targetDate.getTime())) {
          console.error("Created an invalid date object");
          setTimeRemaining("Date calculation error");
          return;
        }

        if (DEBUG)
          console.log("Target start date:", targetDate.toLocaleString());

        if (targetDate <= now) {
          setTimeRemaining("Election start time has passed");
          return;
        }
      }

      const difference = targetDate.getTime() - now.getTime();

      // Only log in debug mode
      if (DEBUG) console.log("Time difference in ms:", difference);

      if (difference <= 0) {
        if (currentElection.isActive) {
          setTimeRemaining("Election has ended");
          setElectionStatus("ended");
        } else {
          setTimeRemaining("Election start time has passed");
        }
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      let timeString = "";
      if (days > 0) timeString += `${days}d `;
      if (hours > 0) timeString += `${hours}h `;
      if (minutes > 0) timeString += `${minutes}m `;
      timeString += `${seconds}s`;

      setElectionStatus(currentElection.isActive ? "active" : "not-started");
      setTimeRemaining(timeString);
    } catch (error) {
      console.error("Error calculating time remaining:", error);
      setTimeRemaining("Time calculation error");
    }
  }, [currentElection]);

  useEffect(() => {
    fetchCurrentElection();

    const statusInterval = setInterval(fetchCurrentElection, 30000); // Increased from 15000 to 30000

    return () => clearInterval(statusInterval);
  }, []);

  useEffect(() => {
    if (currentElection) {
      updateTimeRemaining();
    }

    const timer = setInterval(() => {
      updateTimeRemaining();
    }, 1000);

    return () => clearInterval(timer);
  }, [currentElection, updateTimeRemaining]);

  useEffect(() => {
    const fetchRecentVoters = async () => {
      try {
        setLoading((prev) => ({ ...prev, recentVoters: true }));
        const response = await axios.get(`${apiUrl}/api/voters/recent`);
        setRecentVoters(response.data);
      } catch (error) {
        console.error("Error fetching recent voters:", error);
      } finally {
        setLoading((prev) => ({ ...prev, recentVoters: false }));
      }
    };

    fetchRecentVoters();

    const interval = setInterval(fetchRecentVoters, 30000);

    return () => clearInterval(interval);
  }, [apiUrl]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        monitorRef.current &&
        !monitorRef.current.contains(event.target as Node)
      ) {
        setShowMonitor(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (positions.length === 0) return;
    const interval = setInterval(() => {
      setCurrentPositionIndex((prev) => (prev + 1) % positions.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [positions.length]);

  const validateVoter = async (voterId: string) => {
    try {
      const response = await axios.post(`${apiUrl}/api/voters/validate`, {
        voterId,
      });
      if (response.data.success) {
        return response.data.voter;
      }
      return null;
    } catch (error) {
      console.error("Error validating voter:", error);

      // Check for "already voted" error response
      if (axios.isAxiosError(error) && error.response) {
        // If there's an error response with a specific code for already voted
        if (
          error.response.data.errorCode === "ALREADY_VOTED" &&
          error.response.data.voter
        ) {
          // Return the voter data with a flag indicating they've already voted
          return {
            ...error.response.data.voter,
            hasVoted: true,
          };
        }
      }

      // For other errors, throw to be caught by handleSubmit
      throw error;
    }
  };

  const formatDate = (dateInput: Date | string) => {
    try {
      if (!dateInput) return "Date unavailable";

      const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

      if (isNaN(date.getTime())) {
        return "Invalid date";
      }

      const day = date.getDate();
      const month = date.toLocaleString("default", { month: "short" });
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Date unavailable";
    }
  };

  const formatTime = (dateInput: Date | string) => {
    try {
      if (!dateInput) return "Time unavailable";

      const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

      if (isNaN(date.getTime())) {
        return "Invalid time";
      }

      return date.toLocaleString("default", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error("Error formatting time:", error);
      return "Time unavailable";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setUsedVoterInfo(null);

    if (!votingId.trim()) {
      setError("Please enter your Voter ID");
      return;
    }

    try {
      if (!currentElection?.isActive) {
        setError(
          currentElection
            ? "Election is not currently active. Please try again later."
            : "Election information not available. Please refresh the page."
        );
        return;
      }

      setLoading((prev) => ({ ...prev, submit: true }));

      const voter = await validateVoter(votingId);
      if (!voter) {
        setUsedVoterInfo(null);
        throw new Error("Invalid Voter ID. Please check and try again.");
      }

      if (voter.hasVoted) {
        setError("This Voter ID has already been used to cast a vote");
        const votedAtDate = voter.votedAt
          ? new Date(voter.votedAt)
          : new Date();

        setUsedVoterInfo({
          name: voter.name,
          voterId: voter.voterId,
          votedAt: votedAtDate,
        });

        // Store voter data for VoteSuccess component
        setVotedVoterData({
          name: voter.name,
          voterId: voter.voterId,
          votedAt: voter.votedAt,
          voteToken: voter.voteToken || "TOKEN_NOT_AVAILABLE",
        });

        // Set timer to show VoteSuccess popup after 5 seconds
        setTimeout(() => {
          setShowVoteSuccess(true);
        }, 5000);

        return;
      }

      setUsedVoterInfo(null);
      localStorage.setItem("token", "mock-token-for-voter");
      localStorage.setItem("voterId", voter.voterId);

      setUser({
        _id: voter.id,
        id: voter.id,
        username: voter.name,
        role: "voter",
      });

      navigate("/candidates");
    } catch (error: any) {
      setError(error.message || "Invalid Voter ID. Please try again.");
    } finally {
      setLoading((prev) => ({ ...prev, submit: false }));
    }
  };

  const handleVoterIdSubmit = () => {
    if (votingId) {
      localStorage.setItem("voterId", votingId);
      navigate("/candidates");
    } else {
      setError("Please enter a valid Voter ID.");
    }
  };

  const fetchCandidates = async () => {
    if (!showMonitor) return;

    try {
      setLoading((prev) => ({ ...prev, candidates: true }));

      // Get authentication token (in case this endpoint requires it)
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      // Fix the URL - use 'byPosition' (camelCase) instead of 'by-position'
      const response = await axios.get(`${apiUrl}/api/candidates/byPosition`, {
        headers,
      });

      if (response.data && Object.keys(response.data).length > 0) {
        setCandidatesByPosition(response.data);
        setPositions(Object.keys(response.data));
        setCurrentPositionIndex(0); // Reset to first position when data is loaded
      }
    } catch (error) {
      console.error("Error fetching candidates:", error);
    } finally {
      setLoading((prev) => ({ ...prev, candidates: false }));
    }
  };

  useEffect(() => {
    if (showMonitor) {
      fetchCandidates();
    }
  }, [showMonitor]);

  const chartData = {
    labels: ["Votes Cast", "Yet to Vote"],
    datasets: [
      {
        data: [stats.votedCount, stats.remainingVoters],
        backgroundColor: ["rgba(16, 185, 129, 0.9)", "rgba(239, 68, 68, 0.9)"],
        borderColor: ["rgba(16, 185, 129, 1)", "rgba(239, 68, 68, 1)"],
        borderWidth: 2,
        cutout: "80%",
        borderRadius: 10,
        spacing: 5,
      },
    ],
  };

  const chartOptions = {
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: false,
      },
    },
    maintainAspectRatio: false,
    rotation: -90,
    circumference: 360,
    animation: {
      animateRotate: true,
      animateScale: true,
    },
  };

  const renderCandidates = () => {
    if (
      !positions.length ||
      !positions[currentPositionIndex] ||
      !candidatesByPosition[positions[currentPositionIndex]]
    ) {
      return (
        <div className="text-center py-8">
          <p>No candidates available for this position.</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {(candidatesByPosition[positions[currentPositionIndex]] || []).map(
          (candidate) => (
            <div
              key={candidate.id}
              className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-1"
            >
              <img
                src={candidate.imageUrl || "/placeholder-candidate.png"}
                alt={candidate.name}
                className="w-[5cm] h-[5cm] object-cover rounded-md mx-auto"
              />
              <div className="text-lg font-medium text-gray-900 truncate text-center">
                {candidate.name}
              </div>
            </div>
          )
        )}
      </div>
    );
  };

  // Add function to close the VoteSuccess popup
  const handleCloseVoteSuccess = () => {
    setShowVoteSuccess(false);
    setVotedVoterData(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Add fixed top left container for logo and school name */}
      <div className="fixed top-4 left-4 z-50 flex items-center">
        <div className="h-10 w-10 sm:h-12 sm:w-12 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/20">
          {settings.schoolLogo ? (
            <img
              src={settings.schoolLogo}
              alt="School Logo"
              className="h-6 w-6 sm:h-8 sm:w-8 object-contain"
            />
          ) : (
            <School className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
          )}
        </div>
        <h2 className="ml-2 sm:ml-3 text-sm sm:text-base font-bold text-white whitespace-nowrap">
          {settings.schoolName ||
            settings.systemName ||
            "Peki Senior High School"}
        </h2>
      </div>

      <div
        className={`fixed ${
          isFullScreen ? "top-0" : "top-20 sm:top-4"
        } left-1/2 sm:left-auto sm:right-4 transform -translate-x-1/2 sm:translate-x-0 z-50 flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2`}
      >
        <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-2 sm:px-6 sm:py-3 text-white border border-white/20 flex items-center whitespace-nowrap w-full sm:w-auto min-w-[200px]">
          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
          <span className="text-xs sm:text-sm font-bold">
            {currentElection
              ? `Election Date: ${formatElectionDate(
                  currentElection.endDate || currentElection.date
                )}`
              : "Date unavailable"}
          </span>
        </div>

        <div
          className={`rounded-lg px-3 py-2 sm:px-6 sm:py-3 text-xs sm:text-sm font-medium w-full sm:w-auto min-w-[220px] ${
            electionStatus === "active"
              ? "bg-green-500 text-white"
              : electionStatus === "ended"
              ? "bg-gray-500 text-white"
              : "bg-yellow-300 text-black"
          }`}
        >
          <div className="flex items-center justify-center whitespace-nowrap">
            <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span>
              {electionStatus === "active" ? (
                <>Election in progress • Ends in: {timeRemaining}</>
              ) : electionStatus === "ended" ? (
                <>Election has ended</>
              ) : (
                <>Election starts in: {timeRemaining}</>
              )}
            </span>
          </div>
        </div>
      </div>

      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none overflow-hidden">
        <div className="absolute w-[200%] h-[200%] -rotate-12">
          <div className="absolute top-0 left-0 w-full h-full flex flex-wrap gap-4 sm:gap-8 md:gap-16">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="text-white text-2xl sm:text-4xl md:text-6xl lg:text-8xl font-extrabold whitespace-nowrap transform rotate-12"
              >
                STUDENT COUNCIL ELECTION
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-md w-full z-10 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-xl">
        <div className="text-center mb-6 sm:mb-8">
          {/* Remove the logo and school name from here */}
          {/* Keep only the election title */}
          <p className="text-center mt-10 text-lg sm:text-xl md:text-2xl font-extrabold text-white">
            {settings.electionTitle || "Student Council Election 2025"}
          </p>
        </div>
        <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit}>
          <div>
            <h3 className="text-center text-lg sm:text-xl md:text-2xl font-bold text-white">
              Enter Voter ID
            </h3>
            <p className="mt-1 sm:mt-2 text-center text-xs sm:text-sm md:text-base text-indigo-200 whitespace-nowrap overflow-hidden text-overflow-ellipsis">
              You can only vote once with your unique voter id
            </p>
          </div>
          <div className="rounded-md">
            <div>
              <label htmlFor="voting-id" className="sr-only">
                Voter ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                  <Key
                    className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-200 relative"
                    style={{ textShadow: "0 0 10px rgba(255,255,255,0.5)" }}
                  />
                </div>
                <input
                  id="voting-id"
                  name="votingId"
                  type="text"
                  required
                  disabled={!currentElection?.isActive}
                  className={`appearance-none rounded-lg relative block w-full px-3 py-2 sm:px-4 sm:py-3 pl-8 sm:pl-10 bg-white/10 backdrop-blur-sm border-2 border-white/20 placeholder-indigo-300 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:z-10 text-sm sm:text-base lg:text-lg transition-all duration-300 ${
                    !currentElection?.isActive
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  placeholder={
                    currentElection?.isActive
                      ? "Enter your Voter ID here"
                      : currentElection
                      ? `Election starts in ${timeRemaining}`
                      : "Loading election status..."
                  }
                  value={votingId}
                  onChange={(e) => {
                    setVotingId(e.target.value);
                    setError("");
                    setUsedVoterInfo(null);
                  }}
                />
              </div>
            </div>
          </div>

          {error && !usedVoterInfo && (
            <div className="rounded-md bg-red-900/50 backdrop-blur-sm border border-red-500/20 p-3">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle
                    className="h-5 w-5 text-red-400"
                    aria-hidden="true"
                  />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-200">{error}</h3>
                </div>
              </div>
            </div>
          )}

          {usedVoterInfo && (
            <div className="rounded-md bg-red-900/50 backdrop-blur-sm border border-red-500/20 p-3">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <AlertCircle
                    className="h-5 w-5 text-red-400"
                    aria-hidden="true"
                  />
                </div>
                <div className="ml-3 w-full">
                  <h3 className="text-sm font-medium text-red-200 mb-1">
                    This voter has already cast a vote
                  </h3>

                  <div className="mt-2 bg-white/5 backdrop-blur-sm p-3 rounded-md border border-red-500/10 text-xs text-red-200">
                    <div className="flex items-center mb-1">
                      <User className="h-3.5 w-3.5 mr-2" />
                      <span className="font-medium">{usedVoterInfo.name}</span>
                      <span className="ml-1">({usedVoterInfo.voterId})</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-3.5 w-3.5 mr-2" />
                      <span>
                        {formatDate(usedVoterInfo.votedAt)},{" "}
                        {formatTime(usedVoterInfo.votedAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={!currentElection?.isActive}
              className={`group relative w-full flex justify-center py-2 sm:py-3 px-4 border border-transparent text-sm sm:text-base md:text-lg font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 ${
                !currentElection?.isActive
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              {currentElection?.isActive
                ? "Verify Voter ID"
                : currentElection
                ? "Polls will be opened soon"
                : "Loading election status..."}
            </button>
          </div>
        </form>
      </div>

      <div className="fixed bottom-4 left-2 right-2 flex flex-col sm:flex-row items-center sm:justify-center px-2 sm:px-4 md:px-6 space-y-3 sm:space-y-0">
        <div className="text-center text-xs sm:text-sm text-white whitespace-normal sm:whitespace-nowrap sm:absolute sm:left-1/2 sm:transform sm:-translate-x-1/2 mb-2 sm:mb-0">
          <span className=" xs:inline">Monitored by</span> Secured Smart System
          (Contact +233 24 333 9546)
        </div>

        <button
          onClick={() => {
            setShowMonitor(!showMonitor);
            setIsFullScreen(true);
          }}
          className={`flex items-center px-2 py-1.5 sm:px-3 sm:py-2 rounded-full shadow-lg transition-all duration-300 z-50 ${
            showMonitor
              ? "bg-red-600 hover:bg-red-700 pr-2"
              : "bg-green-600 hover:bg-green-700"
          } sm:ml-auto`}
        >
          <Activity
            className={`h-4 w-4 sm:h-5 sm:w-5 ${
              showMonitor ? "text-red-100" : "text-green-100"
            }`}
          />
          <span
            className={`ml-1 sm:ml-2 text-xs sm:text-sm font-medium ${
              showMonitor ? "text-red-100" : "text-green-100"
            }`}
          >
            <span className="hidden xs:inline">Polling</span> Dashboard
          </span>
          {showMonitor ? (
            <X className="h-4 w-4 sm:h-5 sm:w-5 text-red-100 ml-1 sm:ml-2" />
          ) : (
            <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-100 ml-1 sm:ml-2" />
          )}
        </button>
      </div>
      <div
        ref={monitorRef}
        className={`fixed ${
          isFullScreen
            ? "inset-0 m-0 rounded-none"
            : "right-6 bottom-0 w-full max-w-[800px] sm:w-[90%] md:w-[80%] lg:w-[800px] rounded-lg"
        } bg-white shadow-xl z-50 ${
          showMonitor ? "flex" : "hidden"
        } flex-col h-screen sm:h-auto`}
      >
        <div className="p-3 border-b border-gray-200 relative">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
            <div className="flex justify-between items-center mb-2 sm:mb-0">
              <div className="flex items-center space-x-4">
                <Activity className="h-5 w-5 text-indigo-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900 flex flex-col sm:flex-row sm:items-center">
                  {settings.schoolName && (
                    <span className="inline-block sm:mr-2">
                      {settings.schoolName || "Peki Senior High School"}{" "}
                      <span className="mx-1 text-gray-400 hidden sm:inline">
                        |
                      </span>
                    </span>
                  )}
                  <span className="text-xs md:text-sm lg:text-base mt-1 sm:mt-0">
                    Polling Dashboard
                  </span>
                </h3>
              </div>

              <button
                onClick={() => {
                  setShowMonitor(false);
                  setIsFullScreen(false);
                }}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors sm:hidden"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 sm:items-center mt-6 sm:mt-0">
              <div className="bg-indigo-100 backdrop-blur-sm rounded-lg px-3 py-2 border border-indigo-200 flex items-center">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0 text-indigo-600" />
                <span className="text-xs sm:text-sm font-bold text-indigo-700">
                  {currentElection
                    ? `Election Date: ${formatElectionDate(
                        currentElection.endDate || currentElection.date
                      )}`
                    : "Date unavailable"}
                </span>
              </div>

              <div
                className={`rounded-lg px-3 py-2 text-xs sm:text-sm font-medium flex items-center ${
                  electionStatus === "active"
                    ? "bg-green-500 text-white"
                    : electionStatus === "ended"
                    ? "bg-gray-500 text-white"
                    : "bg-yellow-300 text-black"
                }`}
              >
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span>
                  {electionStatus === "active" ? (
                    <>Election in progress • Ends in: {timeRemaining}</>
                  ) : electionStatus === "ended" ? (
                    <>Election has ended</>
                  ) : (
                    <>Election starts in: {timeRemaining}</>
                  )}
                </span>
              </div>

              <button
                onClick={() => {
                  setShowMonitor(false);
                  setIsFullScreen(false);
                }}
                className="hidden sm:flex p-1 hover:bg-gray-100 rounded-full transition-colors items-center justify-center"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 overflow-auto">
          <div className="space-y-4">
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-indigo-50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">
                    Total Voters
                  </p>
                  <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-indigo-900">
                    {stats.totalVoters}
                  </p>
                </div>
                <Users className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-500" />
              </div>

              <div className="bg-green-50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-green-600 font-medium">
                    Votes Cast
                  </p>
                  <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-green-700">
                    {stats.votedCount}
                  </p>
                </div>
                <Check className="h-6 w-6 sm:h-8 sm:w-8 text-green-500" />
              </div>

              <div className="bg-red-50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-red-600 font-medium">
                    Yet to Vote
                  </p>
                  <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-red-700">
                    {stats.remainingVoters}
                  </p>
                </div>
                <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-red-500" />
              </div>

              <div className="bg-gray-50 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 font-medium">
                    Completion
                  </p>
                  <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900">
                    {Math.round((stats.votedCount / stats.totalVoters) * 100)}%
                  </p>
                </div>
                <div className="flex justify-center">
                  <div className="h-[40px] w-[40px] sm:h-[60px] sm:w-[60px] md:h-[80px] md:w-[80px] lg:h-[100px] lg:w-[100px]">
                    <Doughnut data={chartData} options={chartOptions} />
                  </div>
                </div>
              </div>
            </div>

            {showMonitor && candidatesByPosition && (
              <div className="bg-white rounded-lg p-4 shadow-sm">
                {loading.candidates ? (
                  <div className="flex items-center justify-center p-6">
                    <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
                    <p className="ml-2 text-gray-600">Loading candidates...</p>
                  </div>
                ) : positions.length > 0 ? (
                  <div>
                    {/* Position Navigation */}
                    <div className="flex justify-between items-center mb-4">
                      <AnimatePresence mode="wait">
                        <motion.h5
                          key={positions[currentPositionIndex]}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3 }}
                          className="text-lg font-medium text-gray-900"
                        >
                          {positions[currentPositionIndex]}
                        </motion.h5>
                      </AnimatePresence>

                      {/* Position indicator dots */}
                      <div className="flex space-x-1">
                        {positions.map((_, index) => (
                          <div
                            key={index}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${
                              index === currentPositionIndex
                                ? "bg-indigo-600 scale-110"
                                : "bg-gray-300"
                            }`}
                          ></div>
                        ))}
                      </div>
                    </div>

                    {/* Candidates Grid with Animations */}
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={positions[currentPositionIndex]}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.4 }}
                        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3"
                      >
                        {(
                          candidatesByPosition[
                            positions[currentPositionIndex]
                          ] || []
                        ).map((candidate, idx) => (
                          <motion.div
                            key={candidate.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.3, delay: idx * 0.05 }}
                            whileHover={{
                              y: -5,
                              transition: { duration: 0.2 },
                            }}
                            className="bg-gradient-to-b from-indigo-50 to-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow duration-300"
                          >
                            <div className="aspect-square overflow-hidden rounded-md mb-2">
                              <img
                                src={
                                  candidate.imageUrl ||
                                  "/placeholder-candidate.png"
                                }
                                alt={candidate.name}
                                className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                              />
                            </div>
                            <div className="text-sm font-medium text-gray-900 text-center truncate">
                              {candidate.name}
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">
                    No candidates available
                  </p>
                )}
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-lg font-medium text-gray-700 mb-3">
                Recently Voted
              </h4>
              <div className="overflow-hidden">
                <motion.div
                  className="flex"
                  initial={{ x: "100%" }}
                  animate={{ x: "-100%" }}
                  transition={{
                    duration: 45,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  {[...recentVoters, ...recentVoters].map((voter, index) => (
                    <div
                      key={`${voter._id}-${index}`}
                      className="flex items-center space-x-3 bg-white rounded-lg px-4 py-3 shadow-sm mr-2 flex-shrink-0"
                      style={{ width: "250px" }}
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {voter.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {voter.voterId}
                        </p>
                        <div className="text-xs text-gray-400">
                          {formatTime(new Date(voter.votedAt))}
                        </div>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Add footer for polling dashboard */}
        <div className="mt-auto p-3 text-xs text-gray-500 border-t">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* Empty column on desktop to help with centering */}
            <div className="hidden md:block"></div>

            {/* Middle content - centered on all screens */}
            <div className="flex items-center justify-center mb-2 md:mb-0">
              <Shield className="h-3 w-3 mr-1 flex-shrink-0" />
              <span>
                Monitored by Secured Smart System (Contact +233 24 333 9546)
              </span>
            </div>

            {/* Right content - centered on mobile, right-aligned on desktop */}
            <div className="flex justify-center md:justify-end">
              <a
                href="https://hassaniftikhar.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:underline transition-colors duration-200"
              >
                <span className="text-gray-500 hover:text-gray-600">
                  Developed by{" "}
                </span>
                <span className="text-indigo-500 hover:text-indigo-600">
                  © Hassan Iftikhar
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Add VoteSuccess popup */}
      {showVoteSuccess && votedVoterData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 sm:p-0">
          <div className="relative bg-white rounded-lg w-full sm:max-w-md max-h-[80vh] sm:max-h-[90vh] overflow-auto">
            <button
              onClick={handleCloseVoteSuccess}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 p-2 z-10"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
            <VoteSuccess voter={votedVoterData} isPopup={true} />
          </div>
        </div>
      )}

      {/* <div className="text-center text-xs text-white py-2 bg-transparent">
        <p>Monitored by Secured Smart System (Contact +233 24 333 9546)</p>
      </div> */}
    </div>
  );
};

export default VotingAuth;
