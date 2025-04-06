import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext";
import {
  Check,
  X,
  ArrowLeft,
  ChevronRight,
  AlertTriangle,
  Clock,
  AlertCircle,
} from "lucide-react";
import axios from "axios";
import confetti from "canvas-confetti";

interface Candidate {
  id?: string;
  _id?: string; // Add _id property to support MongoDB objects
  name: string;
  imageUrl: string | null;
  bio?: string;
  manifesto?: string;
  position: string;
  positionId?: string;
}

interface ConfirmVoteState {
  selectedCandidates: Record<string, Candidate>;
  noneSelected: Record<string, boolean>;
}

const ConfirmVote: React.FC = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [voteToken, setVoteToken] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const { selectedCandidates = {}, noneSelected = {} } =
    (state as ConfirmVoteState) || {
      selectedCandidates: {},
      noneSelected: {},
    };

  useEffect(() => {
    window.scrollTo(0, 0);
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "instant" });
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/");
    }

    if (!state || !state.selectedCandidates) {
      navigate("/candidates");
    }

    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timeInterval);
  }, [user, navigate, state]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (success && countdown > 0) {
      timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (success && countdown === 0) {
      navigate("/vote-success", { state: { voteToken } });
    }
  }, [success, countdown, navigate, voteToken]);

  useEffect(() => {
    if (success) {
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
          colors: ["#4F46E5", "#6366F1", "#818CF8"],
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
          colors: ["#4F46E5", "#6366F1", "#818CF8"],
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [success]);

  const handleSubmitVote = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      const voterId = localStorage.getItem("voterId");

      if (!voterId) {
        throw new Error("Voter ID not found. Please log in again.");
      }

      const response = await fetch(`${apiUrl}/api/votes/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          voterId: voterId,
          selections: Object.values(selectedCandidates).map((candidate) => ({
            positionId: candidate.positionId,
            candidateId: candidate.id || candidate._id, // Handle both id and _id
          })),
          abstentions: Object.keys(noneSelected).filter(
            (position) => noneSelected[position]
          ),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error submitting vote");
      }

      navigate("/vote-success", {
        state: {
          voteToken: data.voteToken,
          votedAt: data.votedAt,
        },
      });
    } catch (error: any) {
      console.error("Vote submission error:", error);
      setError(error.message || "Failed to submit vote. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleGoBack = () => {
    navigate("/candidates", {
      state: {
        selectedCandidates,
        noneSelected,
      },
    });
  };

  const allPositions = new Set([
    ...Object.keys(selectedCandidates),
    ...Object.keys(noneSelected).filter((pos) => noneSelected[pos]),
  ]);

  const noneSelectedCount = Object.values(noneSelected).filter(Boolean).length;

  if (!user || allPositions.size === 0) {
    navigate("/candidates");
    return null;
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-indigo-50 relative flex flex-col"
      ref={topRef}
    >
      <div className="fixed top-0 left-0 right-0 z-50 w-full bg-gradient-to-r from-indigo-800 to-indigo-700 text-white py-3 shadow-lg">
        <div className="text-center">
          <h1 className="text-2xl font-bold font-sans tracking-wide">
            Student Council Election 2025
          </h1>
          <p className="text-indigo-100 text-sm font-sans font-light">
            Confirm your selections
          </p>
        </div>
      </div>

      {/* Enhanced Watermark Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Hexagonal Pattern */}
        <div className="absolute inset-0 opacity-[0.06]">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern
                id="hexagons"
                width="50"
                height="43.4"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M25,0 L50,14.4 L50,28.8 L25,43.4 L0,28.8 L0,14.4 Z"
                  fill="none"
                  stroke="#4338ca"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hexagons)" />
          </svg>
        </div>

        {/* Animated Circles */}
        <div className="absolute inset-0 opacity-[0.06]">
          {Array.from({ length: 15 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-pulse"
              style={{
                width: "200px",
                height: "200px",
                border: "1px solid #4338ca",
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: "4s",
              }}
            />
          ))}
        </div>

        {/* Floating Text */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.06]">
          <div className="absolute w-[200%] h-[200%] -rotate-45">
            <div className="absolute top-0 left-0 w-full h-full flex flex-wrap gap-20">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="text-indigo-900 text-9xl font-black whitespace-nowrap"
                >
                  CONFIRM VOTE
                </div>
              ))}
            </div>
          </div>
          <div className="absolute w-[200%] h-[200%] rotate-45">
            <div className="absolute top-0 left-0 w-full h-full flex flex-wrap gap-20">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="text-indigo-900 text-8xl font-black whitespace-nowrap"
                >
                  MAKE IT COUNT
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-20 pb-12 relative z-10 flex-1 flex items-center justify-center">
        <div className="max-w-3xl w-full px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-100 to-indigo-50 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-extrabold text-indigo-800 font-sans tracking-wide">
              Review Your Selections
            </h2>
            <p className="text-indigo-600 font-sans text-sm mt-1">
              Please verify your choices before submitting your vote
            </p>
          </div>
          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800 whitespace-nowrap">
            <Clock className="h-4 w-4 mr-1" />
            {currentTime.toLocaleTimeString()}
          </div>
        </div>

            <div className="p-6">
              {error && (
                <div className="mb-6 rounded-lg bg-red-50 p-4 border-l-4 border-red-500">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        {error}
                      </h3>
                    </div>
                  </div>
                </div>
              )}

              {success ? (
                <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-green-200">
                  <div className="mx-auto h-24 w-24 bg-green-100 rounded-full flex items-center justify-center mb-6">
                    <Check className="h-12 w-12 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    Vote Submitted Successfully!
                  </h2>
                  <p className="text-gray-600 mb-6">
                    Thank you for participating in the election.
                  </p>
                  <p className="text-lg font-semibold text-indigo-700 mb-8">
                    Your vote token:{" "}
                    <span className="font-mono bg-indigo-50 px-2 py-1 rounded">
                      {voteToken}
                    </span>
                  </p>
                  <p className="text-sm text-gray-500">
                    Redirecting in {countdown} seconds...
                  </p>
                </div>
              ) : (
                <>
                  {noneSelectedCount > 0 && (
                    <div className="mb-5 p-4 bg-amber-50 rounded-lg border-l-4 border-amber-500 flex items-start">
                      <AlertTriangle className="h-5 w-5 text-amber-500 mr-3 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-amber-800 font-medium font-sans">
                          You've selected "None of the listed" for{" "}
                          {noneSelectedCount} position
                          {noneSelectedCount > 1 ? "s" : ""}.
                        </p>
                        <p className="text-amber-700 text-sm font-sans font-light mt-1">
                          These positions will be recorded as abstentions.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {Array.from(allPositions).map((position) => (
                      <div
                        key={position}
                        className="bg-gray-50 rounded-lg p-4 transition-all duration-300 hover:shadow-md border border-gray-100"
                      >
                        <h3 className="text-xl font-extrabold text-indigo-700 mb-3 font-sans tracking-wide border-b border-indigo-100 pb-2">
                          {position}
                        </h3>

                        {selectedCandidates[position] ? (
                          <div className="flex items-center">
                            <div className="relative">
                              <img
                                src={
                                  selectedCandidates[position].imageUrl ||
                                  "https://via.placeholder.com/150"
                                }
                                alt={selectedCandidates[position].name}
                                className="w-16 h-16 object-cover rounded-full border-2 border-indigo-100 shadow-sm"
                              />
                              <div className="absolute -top-1 -right-1 bg-green-500 text-white p-1 rounded-full shadow-sm">
                                <Check className="h-3 w-3" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <p className="text-base font-bold text-gray-800 font-sans">
                                {selectedCandidates[position].name}
                              </p>
                              <p className="text-xs text-gray-500 font-sans font-light mt-1">
                                Candidate ID: {selectedCandidates[position].id}
                              </p>
                            </div>
                          </div>
                        ) : noneSelected[position] ? (
                          <div className="flex items-center">
                            <div className="relative">
                              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center border-2 border-red-100 shadow-sm">
                                <img
                                  src="https://cdn-icons-png.flaticon.com/512/6711/6711656.png"
                                  alt="None of the listed"
                                  className="h-10 w-10"
                                />
                              </div>
                              <div className="absolute -top-1 -right-1 bg-red-700 text-white p-1 rounded-full shadow-sm">
                                <X className="h-3 w-3" />
                              </div>
                            </div>
                            <div className="ml-4">
                              <p className="text-base font-bold text-red-700 font-sans">
                                None of the listed
                              </p>
                              <p className="text-xs text-gray-500 font-sans font-light mt-1">
                                Abstaining from this position
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-500">
                            No selection made for this position
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {!success && (
              <div className="bg-gray-50 p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0">
              <button
                onClick={handleGoBack}
                className="bg-yellow-400 text-black hover:bg-yellow-300 font-medium py-2 px-4 sm:py-2.5 sm:px-5 rounded-lg inline-flex items-center transition-colors duration-300 font-sans shadow-sm w-full sm:w-auto"
                disabled={loading}
              >
                <ArrowLeft className="mr-2" size={18} />
                Back to Selection
              </button>
              <button
                onClick={handleSubmitVote}
                disabled={loading}
                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-medium py-2 px-4 sm:py-2.5 sm:px-6 rounded-lg inline-flex items-center shadow-md hover:shadow-lg transition-all duration-300 font-sans tracking-wide w-full sm:w-auto"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    Submit Vote
                    <ChevronRight className="ml-2" size={18} />
                  </>
                )}
              </button>
            </div>
            )}
          </div>

          <div className="text-center text-sm text-gray-500 font-sans font-light mt-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <p>
              Your vote is confidential and secure. Once submitted, it cannot be
              changed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmVote;
