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
  });

  const monitorRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { setUser } = useUser();
  const { stats, electionStatus, timeRemaining } = useElection();
  const { settings } = useSettings();

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

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
    }, 10000); // 10 seconds

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
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const voter = await validateVoter(votingId);
      if (!voter) {
        setUsedVoterInfo(null);
        throw new Error("Invalid Voter ID");
      }

      if (voter.hasVoted) {
        setError("Already voted");
        setUsedVoterInfo({
          name: voter.name,
          voterId: voter.voterId,
          votedAt: "votedAt" in voter ? voter.votedAt : new Date(),
        });
        return;
      }

      setUsedVoterInfo(null);
      localStorage.setItem("token", "mock-token-for-voter");
      localStorage.setItem("voterId", voter.voterId);
      setUser({ id: voter.id, username: voter.name, role: "voter" });
      navigate("/candidates");
    } catch (error: any) {
      setError(error.message || "Invalid Voter ID. Please try again.");
    }
  };

  const formatDate = (date: Date) => {
    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "short" });
    const year = date.getFullYear();
    return `${day}th-${month}-${year}`;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleString("default", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Election Info Bar */}
      <div
        className={`fixed ${
          isFullScreen ? "top-0" : "top-4"
        } right-4 z-50 flex items-center space-x-2`}
      >
        <div className="bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-white border border-white/20 flex items-center">
          <Calendar className="h-4 w-4 mr-2" />
          <span className="text-sm font-bold">
            Election Date: 15th May, 2025
          </span>
        </div>

        <div
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            electionStatus === "not-started"
              ? "bg-yellow-300 text-black"
              : electionStatus === "active"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            {electionStatus === "not-started" && (
              <span>Election starts in: {timeRemaining}</span>
            )}
            {electionStatus === "active" && (
              <span>Election ends in: {timeRemaining}</span>
            )}
            {electionStatus === "ended" && <span>Election has ended!</span>}
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
                className="text-white text-8xl font-extrabold whitespace-nowrap transform rotate-12"
              >
                STUDENT COUNCIL ELECTION
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-md w-full z-10 backdrop-blur-sm p-8 rounded-xl">
        <div className="text-center mb-8">
          <div className="mx-auto h-24 w-24 mb-6 bg-white/10 backdrop-blur-sm rounded-full flex items-center justify-center border-2 border-white/20">
            {settings.schoolLogo ? (
              <img
                src={settings.schoolLogo}
                alt="School Logo"
                className="h-14 w-14 object-contain"
              />
            ) : (
              <School className="h-14 w-14 text-white" />
            )}
          </div>
          <h2 className="text-center text-3xl font-extrabold text-white">
            {settings.schoolName}
          </h2>
          <p className="mt-2 text-center text-xl text-indigo-200">
            {settings.electionTitle || "Student Council Election 2025"}
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <h3 className="text-center text-2xl font-bold text-white">
              Enter Voter ID
            </h3>
            <p className="mt-2 text-center text-sm text-indigo-200">
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
                  disabled={electionStatus !== "active"}
                  className={`appearance-none rounded-lg relative block w-full px-4 py-3 pl-10 bg-white/10 backdrop-blur-sm border-2 border-white/20 placeholder-indigo-300 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:z-10 text-lg transition-all duration-300 ${
                    electionStatus !== "active"
                      ? "opacity-50 cursor-not-allowed"
                      : ""
                  }`}
                  placeholder={
                    electionStatus === "not-started"
                      ? `Voting starts in ${timeRemaining}`
                      : electionStatus === "ended"
                      ? "Election has ended"
                      : "Enter your Voter ID here"
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
                    This voter has already cast his/her vote
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
              disabled={electionStatus !== "active"}
              className={`group relative w-full flex justify-center py-3 px-4 border border-transparent text-lg font-medium rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-300 ${
                electionStatus !== "active"
                  ? "opacity-50 cursor-not-allowed"
                  : ""
              }`}
            >
              {electionStatus === "active"
                ? "Verify Voter ID"
                : electionStatus === "not-started"
                ? "Polls will be opened soon"
                : "Polls are closed till next election"}
            </button>
          </div>
        </form>
      </div>

      {/* Live Voting Monitor Button and Footer */}
      <div className="fixed bottom-6 left-0 right-0 flex items-center justify-between px-6">
        <div className="flex-1 text-center text-sm text-white whitespace-nowrap">
          Monitored by Secured Smart System (Contact +233 24 333 9546)
        </div>

        <button
          onClick={() => {
            setShowMonitor(!showMonitor);
            setIsFullScreen(true);
          }}
          className={`flex items-center px-4 py-2 rounded-full shadow-lg transition-all duration-300 z-50 ${
            showMonitor
              ? "bg-red-600 hover:bg-red-700 pr-2"
              : "bg-green-600 hover:bg-green-700"
          }`}
        >
          <Activity
            className={`h-5 w-5 ${
              showMonitor ? "text-red-100" : "text-green-100"
            }`}
          />
          <span
            className={`ml-2 font-medium ${
              showMonitor ? "text-red-100" : "text-green-100"
            }`}
          >
            Polling Dashboard
          </span>
          {showMonitor ? (
            <X className="h-5 w-5 text-red-100 ml-2" />
          ) : (
            <ChevronUp className="h-5 w-5 text-green-100 ml-2" />
          )}
        </button>
      </div>

      {/* Live Voting Monitor Panel */}
      <div
        ref={monitorRef}
        className={`fixed ${
          isFullScreen
            ? "inset-0 m-0 rounded-none"
            : "right-6 bottom-20 w-[800px] rounded-lg"
        } bg-white shadow-xl z-50 ${
          showMonitor ? "flex" : "hidden"
        } flex-col h-full`}
      >
        {/* Header */}
        <div className="p-3 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <Activity className="h-5 w-5 text-indigo-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">
                  Polling Dashboard
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg px-3 py-1.5 text-gray-700 border border-gray-200 flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  <span className="text-sm">Election Date: 15th May, 2025</span>
                </div>

                <div
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    electionStatus === "not-started"
                      ? "bg-yellow-300 text-black"
                      : electionStatus === "active"
                      ? "bg-green-500 text-white"
                      : "bg-red-500 text-white"
                  }`}
                >
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    {electionStatus === "not-started" && (
                      <span>Election starts in: {timeRemaining}</span>
                    )}
                    {electionStatus === "active" && (
                      <span>Election ends in: {timeRemaining}</span>
                    )}
                    {electionStatus === "ended" && (
                      <span>Election has ended!</span>
                    )}
                  </div>
                </div>
              </div>
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
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4">
          <div className="space-y-4">
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-4">
              {/* Total Voters */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg text-gray-600 font-medium mb-1">
                      Total Voters
                    </p>
                    <p className="text-6xl font-bold text-indigo-900">
                      {stats.totalVoters}
                    </p>
                  </div>
                  <Users className="h-10 w-10 text-indigo-500" />
                </div>
              </div>

              {/* Votes Cast */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg text-green-600 font-medium mb-1">
                      Votes Cast
                    </p>
                    <p className="text-6xl font-bold text-green-700">
                      {stats.votedCount}
                    </p>
                  </div>
                  <Check className="h-10 w-10 text-green-500" />
                </div>
              </div>

              {/* Yet to Vote */}
              <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg text-red-600 font-medium mb-1">
                      Yet to Vote
                    </p>
                    <p className="text-6xl font-bold text-red-700">
                      {stats.remainingVoters}
                    </p>
                  </div>
                  <AlertCircle className="h-10 w-10 text-red-500" />
                </div>
              </div>

              {/* Chart */}
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg text-gray-600 font-medium mb-1">
                      Completion
                    </p>
                    <p className="text-6xl font-bold text-gray-900">
                      {Math.round((stats.votedCount / stats.totalVoters) * 100)}
                      %
                    </p>
                  </div>
                  <div className="relative h-[80px] w-[80px]">
                    <Doughnut data={chartData} options={chartOptions} />
                  </div>
                </div>
              </div>
            </div>

            {/* Current Position Candidates */}
            <div className="bg-white rounded-lg p-4 shadow-sm">
              <AnimatePresence mode="wait">
                {positions.length > 0 &&
                candidatesByPosition[positions[currentPositionIndex]] ? (
                  <motion.div
                    key={positions[currentPositionIndex]}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                  >
                    <h5 className="text-xl font-medium text-gray-900 mb-2">
                      {positions[currentPositionIndex]}
                    </h5>
                    <div className="grid grid-cols-5 gap-2">
                      {candidatesByPosition[
                        positions[currentPositionIndex]
                      ].map((candidate) => (
                        <motion.div
                          key={candidate.id}
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.3 }}
                          className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-1"
                        >
                          <div className="relative mb-1">
                            <img
                              src={
                                candidate.imageUrl ||
                                "/placeholder-candidate.png"
                              } // Add a fallback image
                              alt={candidate.name}
                              className="w-[5cm] h-[5cm] object-cover rounded-md mx-auto"
                            />
                          </div>
                          <div className="text-lg font-medium text-gray-900 truncate text-center">
                            {candidate.name}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
                  <div className="flex justify-center items-center h-32">
                    <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
                    <span className="ml-3 text-gray-600">
                      Loading candidates...
                    </span>
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Recently Voted */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-xl font-medium text-gray-700 mb-3">
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
                  {/* Use recentVoters data, duplicate the list to ensure continuous scrolling */}
                  {loading.recentVoters
                    ? // Placeholder loading items
                      Array(10)
                        .fill(0)
                        .map((_, index) => (
                          <div
                            key={`loading-${index}`}
                            className="flex items-center space-x-3 bg-white rounded-lg px-5 py-4 shadow-sm mr-4 flex-shrink-0 animate-pulse"
                            style={{ width: "300px" }}
                          >
                            <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                            <div className="flex-1">
                              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                          </div>
                        ))
                    : // Actual voter data
                      [...recentVoters, ...recentVoters, ...recentVoters].map(
                        (voter, index) => (
                          <div
                            key={`${voter._id}-${index}`}
                            className="flex items-center space-x-3 bg-white rounded-lg px-5 py-4 shadow-sm mr-4 flex-shrink-0"
                            style={{ width: "300px" }}
                          >
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-lg font-medium text-gray-900 truncate">
                                {voter.name}
                              </p>
                              <p className="text-base text-gray-500 truncate">
                                {voter.voterId}
                              </p>
                            </div>
                            <div className="text-base text-gray-400 whitespace-nowrap">
                              {formatTime(new Date(voter.votedAt))}
                            </div>
                          </div>
                        )
                      )}
                </motion.div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-auto text-center text-sm text-black py-4">
          <p>Monitored by Secured Smart System (Contact +233 24 333 9546)</p>
        </div>
      </div>
    </div>
  );
};

export default VotingAuth;
