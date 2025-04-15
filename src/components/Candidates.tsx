import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useUser } from "../context/UserContext";
import {
  AlertCircle,
  Check,
  X,
  ChevronRight,
  Search,
  RefreshCw,
} from "lucide-react";
import axios from "axios";

interface VoterCategory {
  type: "all" | "year" | "class" | "house";
  values: string[];
}

interface Candidate {
  id: string;
  _id?: string;
  name: string;
  imageUrl: string | null;
  image?: string;
  bio?: string;
  manifesto?: string;
  votes?: number;
  position: string;
  positionId?: string;
}

type CandidatesByPosition = {
  [key: string]: Candidate[];
};

const Candidates: React.FC = () => {
  const location = useLocation();
  const [candidatesByPosition, setCandidatesByPosition] =
    useState<CandidatesByPosition>({});
  const [positions, setPositions] = useState<string[]>([]);
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<
    Record<string, string>
  >({});
  const [noneSelected, setNoneSelected] = useState<Record<string, boolean>>({});
  const [error, setError] = useState("");
  const [unselectedPositions, setUnselectedPositions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [candidatesCacheTime, setCandidatesCacheTime] = useState<number>(0);
  const [isBackgroundFetching, setIsBackgroundFetching] = useState(false);
  const navigate = useNavigate();
  const { user } = useUser();
  const topRef = useRef<HTMLDivElement>(null);
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
  const fetchRequestRef = useRef<AbortController | null>(null);
  const CACHE_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    const voterId = localStorage.getItem("voterId");
    if (!voterId) {
      setError("Please enter your Voter ID to view candidates.");
      setLoading(false);
      return;
    }

    const fetchCandidatesData = async (showLoading = true, useCache = true) => {
      // Abort any in-flight requests
      if (fetchRequestRef.current) {
        fetchRequestRef.current.abort();
      }

      // Create new abort controller
      fetchRequestRef.current = new AbortController();

      if (showLoading) {
        setLoading(true);
      } else {
        setIsBackgroundFetching(true);
      }

      try {
        // Check for cached data if useCache is true
        if (useCache) {
          const cachedData = localStorage.getItem("candidatesData");
          const cacheTimestamp = Number(
            localStorage.getItem("candidatesCacheTime") || "0"
          );
          const now = Date.now();

          // If we have valid, non-expired cached data
          if (cachedData && now - cacheTimestamp < CACHE_EXPIRY_MS) {
            const parsedData = JSON.parse(cachedData);
            if (parsedData && Object.keys(parsedData).length > 0) {
              setCandidatesByPosition(parsedData);
              setPositions(Object.keys(parsedData));
              setCandidatesCacheTime(cacheTimestamp);
              setLastUpdated(new Date(cacheTimestamp));

              // If we're showing cached data, fetch updated data in the background
              if (showLoading) {
                setLoading(false);
                // Fetch fresh data in the background
                setTimeout(() => fetchCandidatesData(false, false), 100);
                return;
              }
            }
          }
        }

        const response = await axios.get(
          `${apiUrl}/api/candidates/for-voter?voterId=${voterId}&t=${Date.now()}`,
          {
            timeout: 10000, // Reduced timeout from 15s to 10s
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
            signal: fetchRequestRef.current.signal,
          }
        );

        if (!response.data || !Object.keys(response.data).length) {
          setError("No candidates available for your voter group.");
          setCandidatesByPosition({});
          setPositions([]);
          return;
        }

        // Update state with fresh data
        setCandidatesByPosition(response.data);
        setPositions(Object.keys(response.data));
        setError("");

        // Cache the data
        const now = Date.now();
        localStorage.setItem("candidatesData", JSON.stringify(response.data));
        localStorage.setItem("candidatesCacheTime", now.toString());
        setCandidatesCacheTime(now);
        setLastUpdated(new Date(now));
      } catch (error) {
        // Don't show errors for aborted requests
        if (axios.isCancel(error)) {
          console.log("Request canceled:", error.message);
          return;
        }

        if (
          axios.isAxiosError(error) &&
          error.response &&
          error.response.status === 404
        ) {
          setError(
            "No candidates found for your voter group. Please contact the administrator."
          );
        } else {
          setError("Failed to load candidates. Please try again.");
        }
      } finally {
        if (showLoading) {
          setLoading(false);
        } else {
          setIsBackgroundFetching(false);
        }
        fetchRequestRef.current = null;
      }
    };

    // Initial fetch
    fetchCandidatesData();

    // Cleanup function to abort any pending requests when component unmounts
    return () => {
      if (fetchRequestRef.current) {
        fetchRequestRef.current.abort();
      }
    };
  }, [user, navigate, apiUrl]);

  useEffect(() => {
    const unselected = positions.filter(
      (position) =>
        selectedCandidateIds[position] === undefined && !noneSelected[position]
    );
    setUnselectedPositions(unselected);
  }, [selectedCandidateIds, noneSelected, positions]);

  // Add this useEffect to restore selections from location state
  useEffect(() => {
    // Check if we have state from ConfirmVote component
    if (location.state) {
      const { selectedCandidates, noneSelected: receivedNoneSelected } =
        location.state as {
          selectedCandidates?: Record<string, Candidate>;
          noneSelected?: Record<string, boolean>;
        };

      // Restore selected candidates if present
      if (selectedCandidates && Object.keys(selectedCandidates).length > 0) {
        // Convert selectedCandidates to selectedCandidateIds format
        const newSelectedIds = Object.entries(selectedCandidates).reduce(
          (acc, [position, candidate]) => {
            acc[position] = candidate.id || candidate._id || "";
            return acc;
          },
          {} as Record<string, string>
        );
        setSelectedCandidateIds(newSelectedIds);
      }

      // Restore none selected if present
      if (
        receivedNoneSelected &&
        Object.keys(receivedNoneSelected).length > 0
      ) {
        setNoneSelected(receivedNoneSelected);
      }
    }
  }, [location.state]);

  const handleVote = (candidate: Candidate, position: string) => {
    const candidateId = candidate.id || candidate._id || "";
    setNoneSelected((prev) => ({ ...prev, [position]: false }));
    setSelectedCandidateIds((prev) => ({ ...prev, [position]: candidateId }));
    setError("");
  };

  const handleNoneSelected = (position: string) => {
    setNoneSelected((prev) => ({ ...prev, [position]: true }));
    setSelectedCandidateIds((prev) => {
      const updated = { ...prev };
      delete updated[position];
      return updated;
    });
    setError("");
  };

  const handleConfirmVote = () => {
    const allPositionsSelected = positions.every(
      (position) =>
        selectedCandidateIds[position] !== undefined || noneSelected[position]
    );

    if (allPositionsSelected) {
      const validSelectedCandidates = Object.entries(
        selectedCandidateIds
      ).reduce((acc, [position, candidateId]) => {
        const candidate = candidatesByPosition[position]?.find(
          (c) => c.id === candidateId
        );
        if (candidate) {
          acc[position] = candidate;
        }
        return acc;
      }, {} as Record<string, Candidate>);

      navigate("/confirm-vote", {
        state: {
          selectedCandidates: validSelectedCandidates,
          noneSelected,
        },
      });
    } else {
      setError(
        `Please make a selection for each position: ${unselectedPositions.join(
          ", "
        )}`
      );
    }
  };

  const handleRefresh = () => {
    // Force refresh from server without using cache
    const fetchCandidates = async () => {
      setLoading(true);
      try {
        // Abort any in-flight requests
        if (fetchRequestRef.current) {
          fetchRequestRef.current.abort();
        }

        // Create new abort controller
        fetchRequestRef.current = new AbortController();

        const voterId = localStorage.getItem("voterId");
        if (!voterId) {
          setError("Please enter your Voter ID to view candidates.");
          return;
        }

        const response = await axios.get(
          `${apiUrl}/api/candidates/for-voter?voterId=${voterId}&t=${Date.now()}`,
          {
            timeout: 10000,
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
            signal: fetchRequestRef.current.signal,
          }
        );

        if (!response.data || !Object.keys(response.data).length) {
          setError("No candidates available for your voter group.");
          setCandidatesByPosition({});
          setPositions([]);
          return;
        }

        // Update state and cache with fresh data
        setCandidatesByPosition(response.data);
        setPositions(Object.keys(response.data));
        setError("");

        const now = Date.now();
        localStorage.setItem("candidatesData", JSON.stringify(response.data));
        localStorage.setItem("candidatesCacheTime", now.toString());
        setCandidatesCacheTime(now);
        setLastUpdated(new Date(now));
      } catch (error) {
        if (axios.isCancel(error)) {
          console.log("Request canceled:", error.message);
          return;
        }
        setError("Failed to refresh candidates. Please try again.");
      } finally {
        setLoading(false);
        fetchRequestRef.current = null;
      }
    };

    fetchCandidates();
  };

  const filteredCandidates = searchTerm
    ? Object.entries(candidatesByPosition).reduce(
        (acc, [position, candidates]) => {
          const filtered = candidates.filter(
            (candidate) =>
              candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              position.toLowerCase().includes(searchTerm.toLowerCase())
          );
          if (filtered.length > 0) {
            acc[position] = filtered;
          }
          return acc;
        },
        {} as CandidatesByPosition
      )
    : candidatesByPosition;

  if (!user) {
    return null;
  }

  if (!localStorage.getItem("voterId")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-50">
        <div className="text-center">
          <h2 className="text-xl font-bold text-gray-800">Voter ID Required</h2>
          <p className="text-gray-600 mt-2">
            Please enter your Voter ID to view the candidates.
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-50 relative" ref={topRef}>
      {/* Watermark Background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none overflow-hidden">
        <div className="absolute w-[300%] h-[300%] -rotate-12">
          <div className="absolute top-0 left-0 w-full h-full flex flex-wrap gap-2">
            {Array.from({ length: 200 }).map((_, i) => (
              <div
                key={i}
                className="text-indigo-900 text-2xl sm:text-4xl md:text-6xl lg:text-8xl font-extrabold whitespace-nowrap transform rotate-12"
              >
                {i % 2 === 0 ? "Your choice matters" : "Choose Wisely"}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 w-full bg-indigo-800 text-white py-3 shadow-lg">
        <div className="text-center px-4 sm:px-6 lg:px-8">
          <h1 className="text-xl sm:text-2xl font-bold font-sans tracking-wide">
            Student Council Election 2025
          </h1>
          <p className="text-indigo-100 text-xs sm:text-sm font-sans font-light">
            Select your preferred candidate for each position
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="pt-20 pb-12 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search Bar */}
          <div className="mb-6 sticky top-20 z-50">
            <div className="relative">
              <input
                type="text"
                placeholder="Search candidates by name or position..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 sm:px-5 py-2 sm:py-3 pl-10 sm:pl-12 rounded-full border-2 border-indigo-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200 transition-all duration-300 shadow-sm text-sm sm:text-base"
              />
              <div className="absolute inset-y-0 left-0 pl-3 sm:pl-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 sm:h-5 sm:w-5 text-indigo-500" />
              </div>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 sm:pr-4 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
              )}
            </div>
          </div>

          {/* Cache indicator for debugging */}
          {lastUpdated && (
            <div className="text-xs text-gray-500 text-right mb-2">
              {isBackgroundFetching ? (
                <span className="text-indigo-600">
                  Updating in background...
                </span>
              ) : (
                `Last updated: ${lastUpdated.toLocaleTimeString()}`
              )}
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="mb-4 rounded-lg bg-indigo-50 p-4 shadow-sm text-center">
              <div className="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-indigo-600 mr-2"></div>
              <span className="text-indigo-800 text-sm sm:text-base">
                Loading candidates...
              </span>
            </div>
          )}

          {/* No Candidates Message */}
          {!loading && Object.keys(candidatesByPosition).length === 0 && (
            <div className="rounded-lg bg-amber-50 p-4 shadow-sm mb-4">
              <div className="flex items-center">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600" />
                <div className="ml-3">
                  <h3 className="text-sm sm:text-base font-medium text-amber-800">
                    No candidates available
                  </h3>
                  <p className="mt-1 text-xs sm:text-sm text-amber-700">
                    There are currently no candidates to display. This could be
                    because the election is still being set up. Please try again
                    later or contact an administrator.
                  </p>
                  <button
                    onClick={handleRefresh}
                    className="mt-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-md hover:bg-amber-200 inline-flex items-center text-xs sm:text-sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Candidates
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Candidates List */}
          {Object.keys(candidatesByPosition).length > 0 &&
            Object.entries(filteredCandidates).map(
              ([position, positionCandidates]) => {
                const displayPosition =
                  position === "undefined" || !position
                    ? "General Position"
                    : position;

                const anySelected =
                  selectedCandidateIds[position] !== undefined ||
                  noneSelected[position];

                return (
                  <div
                    key={`position-${position}`}
                    className={`mb-6 p-4 sm:p-6 rounded-xl ${
                      anySelected
                        ? "bg-white shadow-md border-l-4 border-l-yellow-500"
                        : "bg-white shadow-sm"
                    } transition-all duration-10`}
                  >
                    <h2 className="text-lg sm:text-2xl font-extrabold text-indigo-800 mb-4 font-sans tracking-wide text-left border-b border-indigo-100 pb-2">
                      {displayPosition}
                    </h2>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                      {(Array.isArray(positionCandidates)
                        ? positionCandidates
                        : []
                      ).map((candidate) => {
                        const candidateId = candidate.id || candidate._id || "";
                        const isSelected =
                          selectedCandidateIds[position] === candidateId;

                        return (
                          <div
                            key={`candidate-${candidateId}`}
                            className={`bg-white rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
                              noneSelected[position]
                                ? "opacity-60 shadow"
                                : isSelected
                                ? "ring-2 ring-indigo-500 shadow-lg"
                                : "shadow hover:shadow-md"
                            }`}
                            onClick={() => handleVote(candidate, position)}
                            data-position={position}
                            data-candidate-id={candidateId}
                          >
                            <div className="relative">
                              <img
                                src={
                                  candidate.image ||
                                  candidate.imageUrl ||
                                  "https://placehold.co/150x150"
                                }
                                alt={candidate.name}
                                className="w-full h-32 sm:h-40 object-cover"
                              />
                              {isSelected && (
                                <div className="absolute top-2 right-2 bg-indigo-600 text-white p-1 rounded-full shadow-md">
                                  <Check className="h-4 w-4" />
                                </div>
                              )}
                            </div>
                            <div className="p-3">
                              <h3 className="text-sm sm:text-base font-bold mb-2 text-gray-800 font-sans">
                                {candidate.name}
                              </h3>
                              <button
                                className={`w-full py-1 sm:py-1.5 px-2 rounded-md font-medium transition-colors duration-200 ${
                                  isSelected
                                    ? "bg-indigo-600 text-white"
                                    : "bg-gray-100 text-gray-700 hover:bg-indigo-100"
                                } font-sans text-xs sm:text-sm`}
                              >
                                {isSelected ? "Selected" : "Select"}
                              </button>
                            </div>
                          </div>
                        );
                      })}

                      {/* None Option */}
                      <div
                        key={`none-option-${position}`}
                        className={`bg-white rounded-lg overflow-hidden cursor-pointer transition-all duration-200 ${
                          noneSelected[position]
                            ? "ring-2 ring-red-700 shadow-lg"
                            : "shadow hover:shadow-md"
                        }`}
                        onClick={() => handleNoneSelected(position)}
                      >
                        <div className="relative h-32 sm:h-40 bg-red-100 flex items-center justify-center">
                          <img
                            src="https://cdn-icons-png.flaticon.com/512/6711/6711656.png"
                            alt="None of the listed"
                            className={`h-16 w-16 sm:h-20 sm:w-20 ${
                              noneSelected[position]
                                ? "opacity-100"
                                : "opacity-70"
                            }`}
                          />
                          {noneSelected[position] && (
                            <div className="absolute top-2 right-2 bg-red-700 text-white p-1 rounded-full shadow-md">
                              <X className="h-4 w-4" />
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <h3 className="text-sm sm:text-base font-bold mb-2 text-red-800">
                            None of the listed
                          </h3>
                          <button
                            className={`w-full py-1 sm:py-1.5 px-2 rounded-md font-medium transition-colors duration-200 ${
                              noneSelected[position]
                                ? "bg-red-700 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-red-100"
                            } font-sans text-xs sm:text-sm`}
                          >
                            {noneSelected[position] ? "Selected" : "Select"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
            )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-4 border-l-4 border-red-700 shadow-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-600" />
                </div>
                <div className="ml-3">
                  <h3 className="text-sm sm:text-base font-medium text-red-800 font-sans">
                    {error}
                  </h3>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Button */}
          <div className="mt-6 text-center">
            <button
              onClick={handleConfirmVote}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 sm:py-3 px-6 sm:px-10 rounded-lg text-base sm:text-lg shadow-lg hover:shadow-xl transition-all duration-300 font-sans tracking-wide flex items-center mx-auto"
            >
              Review & Confirm Selections
              <ChevronRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Candidates;
