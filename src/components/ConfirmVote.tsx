import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, AlertTriangle, ChevronRight } from "lucide-react";
import { useUser } from "../context/UserContext";
import axios from "axios";

interface Candidate {
  _id: string;
  name: string;
  imageUrl: string;
  position: string;
}

const ConfirmVote: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useUser();
  const topRef = useRef<HTMLDivElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (topRef.current) {
      topRef.current.scrollIntoView({ behavior: "instant" });
    }
  }, []);

  const state = (location.state as {
    selectedCandidates: Record<string, Candidate>;
    noneSelected: Record<string, boolean>;
  }) || { selectedCandidates: {}, noneSelected: {} };

  const { selectedCandidates = {}, noneSelected = {} } = state;

  const handleSubmitVote = () => {
    const voteTimestamp = new Date();
    localStorage.setItem("voteTimestamp", voteTimestamp.toString());
    navigate("/thank-you");
  };

  const handleBack = () => {
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

  // Submit vote to the API
  const submitVote = async () => {
    try {
      const voterId = localStorage.getItem("voterId");
      if (!voterId) {
        navigate("/voting-auth");
        return;
      }

      setSubmitting(true);

      // Get selected candidates from local storage
      const selectedCandidatesJson = localStorage.getItem("selectedCandidates");
      if (!selectedCandidatesJson) {
        setError("No candidates selected");
        return;
      }

      const selectedCandidates = JSON.parse(selectedCandidatesJson);

      // Submit vote to API
      const response = await axios.post(`${apiUrl}/api/votes/submit`, {
        voterId,
        selections: selectedCandidates,
      });

      if (response.data.success) {
        // Clear selection data after successful vote
        localStorage.removeItem("selectedCandidates");
        navigate("/thank-you");
      } else {
        setError(response.data.message || "Failed to submit vote");
      }
    } catch (error) {
      console.error("Error submitting vote:", error);
      setError("Failed to submit your vote. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-indigo-50 relative"
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

      <div className="pt-20 pb-12 relative z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-100 to-indigo-50 p-6">
              <h2 className="text-2xl font-extrabold text-indigo-800 font-sans tracking-wide">
                Review Your Selections
              </h2>
              <p className="text-indigo-600 font-sans text-sm mt-1">
                Please verify your choices before submitting your vote
              </p>
            </div>

            <div className="p-6">
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
                            src={selectedCandidates[position].imageUrl}
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
                            Candidate ID: {selectedCandidates[position]._id}
                          </p>
                        </div>
                      </div>
                    ) : (
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
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-6 border-t border-gray-200 flex justify-between items-center">
              <button
                onClick={handleBack}
                className="bg-yellow-400 text-black hover:bg-yellow-300 font-medium py-2.5 px-5 rounded-lg inline-flex items-center transition-colors duration-300 font-sans shadow-sm"
              >
                <ArrowLeft className="mr-2" size={18} />
                Back to Selection
              </button>
              <button
                onClick={handleSubmitVote}
                className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white font-medium py-2.5 px-6 rounded-lg inline-flex items-center shadow-md hover:shadow-lg transition-all duration-300 font-sans tracking-wide"
              >
                Submit Vote
                <ChevronRight className="ml-2" size={18} />
              </button>
            </div>
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
