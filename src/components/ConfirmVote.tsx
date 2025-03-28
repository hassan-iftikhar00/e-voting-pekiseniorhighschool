import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext";
import {
  Check,
  X,
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  Clock,
} from "lucide-react";
import axios from "axios";
import confetti from "canvas-confetti";

interface Candidate {
  id: string;
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

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";

  const { selectedCandidates = {}, noneSelected = {} } =
    (state as ConfirmVoteState) || {
      selectedCandidates: {},
      noneSelected: {},
    };

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
    try {
      setLoading(true);
      setError("");

      const voterId = localStorage.getItem("voterId");

      if (!voterId) {
        throw new Error("Voter ID not found. Please log in again.");
      }

      // Prepare vote data with proper position names
      const voteData = {
        voterId: voterId,
        selections: Object.entries(selectedCandidates).map(
          ([position, candidate]) => {
            const typedCandidate = candidate as Candidate;
            return {
              position: position || "Unknown Position", // Ensure position is not empty
              candidateId: typedCandidate?.id || null,
              positionId: typedCandidate?.positionId || null,
            };
          }
        ),
        abstentions: Object.keys(noneSelected)
          .filter((pos) => noneSelected[pos])
          .map((position) => ({ position: position || "Unknown Position" })),
      };

      console.log("Submitting vote data:", voteData);

      const response = await axios.post(`${apiUrl}/api/votes/submit`, voteData);

      if (response.data.success) {
        const token = Math.random().toString(36).substring(2, 8).toUpperCase();
        setVoteToken(token);
        setSuccess(true);

        localStorage.removeItem("voterId");
      } else {
        throw new Error(response.data.message || "Failed to submit vote");
      }
    } catch (error: any) {
      console.error("Error submitting vote:", error);
      if (error.response) {
        console.error("Server response:", error.response.data);
        setError(
          error.response.data.message || "Server error. Please try again."
        );
      } else {
        setError(
          error.message || "An error occurred while submitting your vote"
        );
      }
    } finally {
      setLoading(false);
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

  return (
    <div className="min-h-screen bg-indigo-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-indigo-900">
            Confirm Your Vote
          </h1>
          <p className="mt-2 text-lg text-indigo-700">
            Please review your selections carefully. You cannot change your vote
            after submission.
          </p>
          <div className="mt-2 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-indigo-100 text-indigo-800">
            <Clock className="h-4 w-4 mr-1" />
            {currentTime.toLocaleTimeString()}
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4 border-l-4 border-red-500">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">{error}</h3>
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
            <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
              <div className="px-6 py-4 bg-indigo-600">
                <h2 className="text-xl font-bold text-white">
                  Your Selected Candidates
                </h2>
              </div>
              <div className="divide-y divide-gray-200">
                {Object.entries(selectedCandidates).map(
                  ([position, candidateData]) => {
                    const candidate = candidateData as Candidate;
                    return (
                      <div
                        key={position}
                        className="px-6 py-4 flex justify-between items-center"
                      >
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">
                            {position}
                          </h3>
                          <div className="flex items-center mt-1">
                            {candidate ? (
                              <>
                                <div className="h-10 w-10 rounded-full overflow-hidden mr-3">
                                  <img
                                    src={
                                      candidate.imageUrl ||
                                      "https://via.placeholder.com/40"
                                    }
                                    alt={candidate.name}
                                    className="h-full w-full object-cover"
                                  />
                                </div>
                                <span className="text-indigo-900 font-semibold">
                                  {candidate.name}
                                </span>
                              </>
                            ) : (
                              <span className="text-gray-500 italic">
                                No candidate selected
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center">
                          <Check className="h-5 w-5 text-green-500" />
                        </div>
                      </div>
                    );
                  }
                )}

                {Object.keys(noneSelected)
                  .filter((position) => noneSelected[position])
                  .map((position) => (
                    <div
                      key={position}
                      className="px-6 py-4 flex justify-between items-center bg-red-50"
                    >
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {position}
                        </h3>
                        <div className="flex items-center mt-1">
                          <span className="text-red-700 font-medium">
                            None of the listed candidates
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <X className="h-5 w-5 text-red-500" />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex justify-between space-x-4">
              <button
                onClick={handleGoBack}
                disabled={loading}
                className="flex items-center justify-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Go Back
              </button>
              <button
                onClick={handleSubmitVote}
                disabled={loading}
                className={`flex-1 flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 ${
                  loading ? "opacity-70 cursor-not-allowed" : ""
                }`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </>
                ) : (
                  <>
                    Submit My Vote
                    <ChevronRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ConfirmVote;
