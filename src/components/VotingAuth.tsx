import React, { useState, useEffect, useRef } from "react";
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

ChartJS.register(ArcElement, Tooltip, Legend);

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

// Define interface for voter
interface RecentVoter {
  _id: string;
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
  const { stats, electionStatus } = useElection();
  const { settings } = useSettings();

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  // Add state for the election data
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

  // Function to fetch election data
  const fetchElectionStatus = async () => {
    try {
      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/election/status`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch election status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Election status data:", data);
      setCurrentElection(data);
    } catch (error) {
      console.error("Error fetching election status:", error);
    }
  };

  // Format date properly
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

  // Calculate time remaining
  const calculateTimeRemaining = () => {
    if (!currentElection) return "";

    const now = new Date();
    let targetDate;

    // Determine which date to use (endDate or date)
    if (currentElection.isActive) {
      // For active elections, target is the end date
      const dateStr = currentElection.endDate || currentElection.date;
      const [year, month, day] = dateStr.split("-").map(Number);
      const [hours, minutes] = (currentElection.endTime || "17:00")
        .split(":")
        .map(Number);

      targetDate = new Date(year, month - 1, day, hours, minutes);
    } else {
      // For inactive elections, target is the start date
      const dateStr = currentElection.startDate || currentElection.date;
      const [year, month, day] = dateStr.split("-").map(Number);
      const [hours, minutes] = (currentElection.startTime || "08:00")
        .split(":")
        .map(Number);

      targetDate = new Date(year, month - 1, day, hours, minutes);
    }

    // Calculate difference
    const difference = targetDate.getTime() - now.getTime();

    // If difference is negative, the date is in the past
    if (difference <= 0) {
      return currentElection.isActive
        ? "Election has ended"
        : "Election start date has passed";
    }

    // Calculate remaining time
    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    // Format the time remaining
    let result = "";
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    if (minutes > 0) result += `${minutes}m `;
    result += `${seconds}s`;

    return result;
  };

  // Fix the useEffect that's causing the infinite loop
  useEffect(() => {
    // Fetch election status initially
    fetchElectionStatus();

    // Set up regular polling for election status
    const statusInterval = setInterval(fetchElectionStatus, 15000); // Poll every 15 seconds

    // Update time remaining every second
    const timeInterval = setInterval(() => {
      if (currentElection) {
        setTimeRemaining(calculateTimeRemaining());
      }
    }, 1000);

    return () => {
      clearInterval(statusInterval);
      clearInterval(timeInterval);
    };
  }, []); // Keep empty dependency array to prevent re-creating intervals

  // Fetch candidates by position
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        setLoading((prev) => ({ ...prev, candidates: true }));
        const response = await axios.get(`${apiUrl}/api/candidates/byPosition`);
        setCandidatesByPosition(response.data);
        setPositions(Object.keys(response.data));
      } catch (error) {
        console.error("Error fetching candidates:", error);
        setCandidatesByPosition({});
      } finally {
        setLoading((prev) => ({ ...prev, candidates: false }));
      }
    };

    fetchCandidates();
  }, [apiUrl]);

  // Fetch recent voters
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

    // Initial fetch
    fetchRecentVoters();

    // Set up polling interval (every 30 seconds) for real-time updates
    const interval = setInterval(fetchRecentVoters, 30000);

    // Clear interval on component unmount
    return () => clearInterval(interval);
  }, [apiUrl]);

  // Handle click outside to close monitor
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

  // Add effect for position rotation
  useEffect(() => {
    if (positions.length === 0) return;
    const interval = setInterval(() => {
      setCurrentPositionIndex((prev) => (prev + 1) % positions.length);
    }, 10000); // 10 seconds rotation
    return () => clearInterval(interval);
  }, [positions.length]);

  // Add these logs before the map operation
  useEffect(() => {
    console.log("Positions array:", positions);
    console.log("Current position index:", currentPositionIndex);
    console.log("Current position:", positions[currentPositionIndex]);
    console.log("candidatesByPosition:", candidatesByPosition);
    console.log(
      "Candidates for current position:",
      candidatesByPosition[positions[currentPositionIndex]]
    );
  }, [positions, currentPositionIndex, candidatesByPosition]);

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
      return null;
    }
  };

  const formatDate = (dateInput: Date | string) => {
    try {
      // Convert string to Date if needed
      const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

      // Check if date is valid before using date methods
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
      // Convert string to Date if needed
      const date = dateInput instanceof Date ? dateInput : new Date(dateInput);

      // Check if date is valid
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
      // Check if election is active
      if (!currentElection?.isActive) {
        setError(
          currentElection
            ? "Election is not currently active. Please try again later."
            : "Election information not available. Please refresh the page."
        );
        return;
      }

      // Show loading state
      setLoading((prev) => ({ ...prev, submit: true }));

      const voter = await validateVoter(votingId);
      if (!voter) {
        setUsedVoterInfo(null);
        throw new Error("Invalid Voter ID. Please check and try again.");
      }

      if (voter.hasVoted) {
        setError("This Voter ID has already been used to cast a vote");
        // Ensure votedAt is properly handled regardless of format
        const votedAtDate = voter.votedAt
          ? new Date(voter.votedAt)
          : new Date();

        setUsedVoterInfo({
          name: voter.name,
          voterId: voter.voterId,
          votedAt: votedAtDate,
        });
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

  // Chart data
  const chartData = {
    labels: ["Votes Cast", "Yet to Vote"],
    datasets: [
      {
        data: [stats.votedCount, stats.remainingVoters],
        backgroundColor: [
          "rgba(16, 185, 129, 0.9)", // Softer green
          "rgba(239, 68, 68, 0.9)", // Softer red
        ],
        borderColor: [
          "rgba(16, 185, 129, 1)", // Solid green border
          "rgba(239, 68, 68, 1)", // Solid red border
        ],
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

  // Render candidates with null check
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
   {/* Election Info Bar */}
<div
  className={`fixed ${
    isFullScreen ? "top-0" : "top-4"
  } left-1/2 sm:left-auto sm:right-4 transform -translate-x-1/2 sm:translate-x-0 z-50 flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2`}
>
  <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3 text-white border border-white/20 flex items-center whitespace-nowrap">
    <Calendar className="h-4 w-4 mr-2" />
    <span className="text-sm font-bold">
      Election Date:{" "}
      {currentElection
        ? formatElectionDate(currentElection.endDate || currentElection.date)
        : "Loading..."}
    </span>
  </div>

  <div
    className={`rounded-lg px-6 py-3 text-sm font-medium whitespace-nowrap ${
      currentElection?.isActive
        ? "bg-green-500 text-white"
        : "bg-yellow-300 text-black"
    }`}
  >
    <div className="flex items-center justify-center text-center">
      <Clock className="h-4 w-4 mr-2" />
      {currentElection?.isActive ? (
        <span>Election in progress • Ends in: {timeRemaining}</span>
      ) : (
        <span>Election starts in: {timeRemaining}</span>
      )}
    </div>
  </div>
</div>
  
      {/* Watermark Background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none overflow-hidden">
        <div className="absolute w-[200%] h-[200%] -rotate-12">
          <div className="absolute top-0 left-0 w-full h-full flex flex-wrap gap-16">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="text-white text-4xl sm:text-6xl lg:text-8xl font-extrabold whitespace-nowrap transform rotate-12"
              >
                STUDENT COUNCIL ELECTION
              </div>
            ))}
          </div>
        </div>
      </div>
  
      <div className="max-w-md w-full z-10 backdrop-blur-sm p-8 rounded-xl">
        <div className="text-center mb-8">
          <div className="mx-auto h-20 w-20 sm:h-24 sm:w-24 mb-6 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/20">
            {settings.schoolLogo ? (
              <img
                src={settings.schoolLogo}
                alt="School Logo"
                className="h-12 w-12 sm:h-14 sm:w-14 object-contain"
              />
            ) : (
              <School className="h-12 w-12 sm:h-14 sm:w-14 text-white" />
            )}
          </div>
          <h2 className="text-center text-2xl sm:text-3xl font-extrabold text-white">
            {settings.schoolName}
          </h2>
          <p className="mt-2 text-center text-lg sm:text-xl text-indigo-200">
            {settings.electionTitle || "Student Council Election 2025"}
          </p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <h3 className="text-center text-xl sm:text-2xl font-bold text-white">
              Enter Voter ID
            </h3>
            <p className="mt-2 text-center text-sm sm:text-base text-indigo-200">
              You can only vote once with your unique voter id
            </p>
          </div>
          <div className="rounded-md">
            <div>
              <label htmlFor="voting-id" className="sr-only">
                Voter ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-5 w-5 text-indigo-300" />
                </div>
                <input
                  id="voting-id"
                  name="votingId"
                  type="text"
                  required
                  disabled={!currentElection?.isActive}
                  className={`appearance-none rounded-lg relative block w-full px-4 py-3 pl-10 bg-white/10 backdrop-blur-sm border-2 border-white/20 placeholder-indigo-300 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:z-10 text-lg transition-all duration-300 ${
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
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-lg font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 ${
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
  
 {/* Live Voting Monitor Button and Footer */}
<div className="fixed bottom-4 left-2 right-2 flex flex-col sm:flex-row items-center justify-between px-4 sm:px-6 space-y-3 sm:space-y-0">
  <div className="flex-1 text-center text-xs sm:text-sm text-white whitespace-normal sm:whitespace-nowrap">
    Monitored by Secured Smart System (Contact +233 24 333 9546)
  </div>

  <button
    onClick={() => {
      setShowMonitor(!showMonitor);
      setIsFullScreen(true);
    }}
    className={`flex items-center px-3 py-2 sm:px-4 sm:py-2 rounded-full shadow-lg transition-all duration-300 z-50 ${
      showMonitor
        ? "bg-red-600 hover:bg-red-700 pr-2"
        : "bg-green-600 hover:bg-green-700"
    }`}
  >
    <Activity
      className={`h-4 w-4 sm:h-5 sm:w-5 ${
        showMonitor ? "text-red-100" : "text-green-100"
      }`}
    />
    <span
      className={`ml-2 text-xs sm:text-sm font-medium ${
        showMonitor ? "text-red-100" : "text-green-100"
      }`}
    >
      Polling Dashboard
    </span>
    {showMonitor ? (
      <X className="h-4 w-4 sm:h-5 sm:w-5 text-red-100 ml-2" />
    ) : (
      <ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 text-green-100 ml-2" />
    )}
  </button>
</div>
     {/* Live Voting Monitor Panel */}
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
  {/* Header */}
  <div className="p-3 border-b border-gray-200 flex items-center justify-between">
    <div className="flex items-center space-x-4">
      <Activity className="h-5 w-5 text-indigo-600 mr-2" />
      <h3 className="text-lg font-semibold text-gray-900">Polling Dashboard</h3>
    </div>
    <button
      onClick={() => {
        setShowMonitor(false);
        setIsFullScreen(false);
      }}
      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
    >
      <X className="h-5 w-5 text-gray-500" />
    </button>
  </div>

  {/* Main Content */}
  <div className="flex-1 p-4 overflow-auto">
    <div className="space-y-4">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {/* Total Voters */}
        <div className="bg-indigo-50 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">Total Voters</p>
            <p className="text-3xl font-bold text-indigo-900">
              {stats.totalVoters}
            </p>
          </div>
          <Users className="h-8 w-8 text-indigo-500" />
        </div>

        {/* Votes Cast */}
        <div className="bg-green-50 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-green-600 font-medium">Votes Cast</p>
            <p className="text-3xl font-bold text-green-700">
              {stats.votedCount}
            </p>
          </div>
          <Check className="h-8 w-8 text-green-500" />
        </div>

        {/* Yet to Vote */}
        <div className="bg-red-50 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-red-600 font-medium">Yet to Vote</p>
            <p className="text-3xl font-bold text-red-700">
              {stats.remainingVoters}
            </p>
          </div>
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>

        {/* Completion */}
        <div className="bg-gray-50 rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600 font-medium">Completion</p>
            <p className="text-3xl font-bold text-gray-900">
              {Math.round((stats.votedCount / stats.totalVoters) * 100)}%
            </p>
          </div>
          <Shield className="h-8 w-8 text-gray-500" />
        </div>
      </div>

      {/* Chart */}
      <div className="flex justify-center">
        <div className="h-[80px] w-[80px] sm:h-[120px] sm:w-[120px] lg:h-[160px] lg:w-[160px]">
          <Doughnut data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Candidates List */}
      {showMonitor && candidatesByPosition && (
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h5 className="text-lg font-medium text-gray-900 mb-2">
            {positions[currentPositionIndex]}
          </h5>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {(
              candidatesByPosition[positions[currentPositionIndex]] || []
            ).map((candidate) => (
              <div key={candidate.id} className="bg-indigo-50 rounded-lg p-2">
                <img
                  src={candidate.imageUrl || "/placeholder-candidate.png"}
                  alt={candidate.name}
                  className="w-full h-auto object-cover rounded-md"
                />
                <div className="text-sm font-medium text-gray-900 text-center">
                  {candidate.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Voted */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-lg font-medium text-gray-700 mb-3">Recently Voted</h4>
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

  {/* Footer */}
  <div className="text-center text-xs text-black py-2 bg-gray-100">
    <p>Monitored by Secured Smart System (Contact +233 24 333 9546)</p>
  </div>
</div>
      </div>
  );
};
export default VotingAuth;