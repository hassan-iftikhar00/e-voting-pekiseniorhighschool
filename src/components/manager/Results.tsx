import React, { useState, useEffect } from "react";
import {
  Search,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  BarChart2,
  Eye,
  EyeOff,
  BarChart3,
  PieChart,
} from "lucide-react";
import { useUser } from "../../context/UserContext";

// Define types for the results data
interface Candidate {
  _id: string;
  name: string;
  positionId: string;
  image?: string;
  biography?: string;
  class?: string;
  house?: string;
  year?: string;
  isActive: boolean;
}

interface Position {
  _id: string;
  title: string;
  priority: number;
  maxVotes: number;
  isActive: boolean;
}

interface Vote {
  _id: string;
  candidateId: string;
  positionId: string;
  voterId: string;
  timestamp: string;
}

interface ResultItem {
  position: Position;
  candidates: Array<{
    candidate: Candidate;
    voteCount: number;
    percentage: number;
  }>;
  totalVotes: number;
}

interface VoterStats {
  total: number;
  voted: number;
  notVoted: number;
  percentage: number;
}

const Results: React.FC = () => {
  const { hasPermission } = useUser(); // Get permission check function
  const [results, setResults] = useState<ResultItem[]>([]);
  const [voterStats, setVoterStats] = useState<VoterStats>({
    total: 0,
    voted: 0,
    notVoted: 0,
    percentage: 0,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPosition, setFilterPosition] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const [electionStatus, setElectionStatus] = useState<{
    isActive: boolean;
    resultsPublished: boolean;
  }>({ isActive: false, resultsPublished: false });

  // Check user permissions once instead of using PermissionGuard everywhere
  const canViewResults = hasPermission("results", "view");
  const canManageResults = hasPermission("results", "edit");

  // Fetch election results from the API
  const fetchResults = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get authentication token
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/results`,
        { headers }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // Set empty default data for development until API is ready
          setResults([]);
          setVoterStats({
            total: 0,
            voted: 0,
            notVoted: 0,
            percentage: 0,
          });
          return;
        }
        throw new Error(`Failed to fetch results: ${response.status}`);
      }

      const data = await response.json();
      setResults(data.results);
      setVoterStats(data.stats);
    } catch (error: any) {
      console.error("Error fetching results:", error);
      setError(error.message || "Failed to load election results");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch positions for filtering
  const fetchPositions = async () => {
    try {
      // Get authentication token
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/positions`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch positions: ${response.status}`);
      }

      const data = await response.json();
      setPositions(data);
    } catch (error: any) {
      console.error("Error fetching positions:", error);
    }
  };

  // Updated fetchElectionStatus function to improve error handling and logging
  const fetchElectionStatus = async () => {
    try {
      // Get authentication token
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10-second timeout

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/election/status`,
        { headers, signal: controller.signal }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          // Set default status until API is ready
          setElectionStatus({ isActive: false, resultsPublished: false });
          return;
        }
        throw new Error(`Failed to fetch election status: ${response.status}`);
      }

      const data = await response.json();
      setElectionStatus(data);
    } catch (error) {
      console.error("Error fetching election status:", error);
      // Don't show error for this, just use defaults
      setElectionStatus({ isActive: false, resultsPublished: false });
    }
  };

  // Toggle results publication status
  const toggleResultsPublication = async () => {
    try {
      setIsLoading(true);

      // Get authentication token
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/election/toggle-results`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            published: !electionStatus.resultsPublished,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to update results publication status: ${response.status}`
        );
      }

      const data = await response.json();
      setElectionStatus({
        ...electionStatus,
        resultsPublished: data.resultsPublished,
      });

      setNotification({
        type: "success",
        message: `Results are now ${
          data.resultsPublished ? "published" : "hidden"
        } to voters`,
      });
    } catch (error: any) {
      console.error("Error toggling results publication:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to update results publication status",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Load data on component mount
  useEffect(() => {
    if (canViewResults) {
      fetchResults();
      fetchPositions();
      fetchElectionStatus();
    }
  }, [canViewResults]);

  // Filter results based on search term and position filter
  const filteredResults = results.filter(
    (result) =>
      (filterPosition === "" || result.position._id === filterPosition) &&
      (searchTerm === "" ||
        result.position.title
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        result.candidates.some((c) =>
          c.candidate.name.toLowerCase().includes(searchTerm.toLowerCase())
        ))
  );

  // Print results
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print");
      return;
    }

    const styles = `
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
        h1 { text-align: center; color: #4338ca; margin-bottom: 20px; }
        .position-card { 
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 20px;
          padding: 16px;
          page-break-inside: avoid;
        }
        .position-title {
          font-size: 18px;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 12px;
        }
        .candidate {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          padding: 8px;
          background: #f9fafb;
          border-radius: 6px;
        }
        .candidate-image {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          margin-right: 12px;
          object-fit: cover;
        }
        .candidate-info {
          flex-grow: 1;
        }
        .candidate-name {
          font-weight: 600;
          color: #111827;
        }
        .candidate-votes {
          color: #6b7280;
          font-size: 14px;
        }
        .progress-bar {
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          margin-top: 8px;
        }
        .progress-fill {
          height: 100%;
          border-radius: 4px;
        }
        .total-votes {
          text-align: right;
          color: #6b7280;
          font-size: 14px;
          margin-top: 8px;
        }
        .footer {
          margin-top: 40px;
          text-align: center;
          font-size: 12px;
          color: #6b7280;
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
        }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student Council Election ${new Date().getFullYear()} - Results</title>
          ${styles}
        </head>
        <body>
          <h1>Peki Senior High School - Election Results</h1>
          <h1>Student Council Election ${new Date().getFullYear()}</h1>
          
          ${filteredResults
            .map(
              (result) => `
            <div class="position-card">
              <div class="position-title">${result.position.title}</div>
              ${result.candidates
                .sort((a, b) => b.voteCount - a.voteCount)
                .map((candidateResult, index) => {
                  const candidate = candidateResult.candidate;
                  return `
                  <div class="candidate">
                    <div class="candidate-image" style="
                      background-color: #ddd; 
                      display: flex; 
                      align-items: center; 
                      justify-content: center; 
                      font-size: 20px; 
                      font-weight: bold;
                      color: #4338ca;
                    ">
                      ${
                        candidate.image
                          ? `<img src="${candidate.image}" alt="${candidate.name}" class="candidate-image">`
                          : candidate.name.charAt(0)
                      }
                    </div>
                    <div class="candidate-info">
                      <div class="candidate-name">${candidate.name}</div>
                      <div class="candidate-votes">${
                        candidateResult.voteCount
                      } votes (${candidateResult.percentage.toFixed(1)}%)</div>
                      <div class="progress-bar">
                        <div 
                          class="progress-fill" 
                          style="width: ${
                            candidateResult.percentage
                          }%; background-color: ${
                    index === 0
                      ? "#059669"
                      : index === 1
                      ? "#0284c7"
                      : "#6366f1"
                  };"
                        ></div>
                      </div>
                    </div>
                  </div>
                  `;
                })
                .join("")}
              <div class="total-votes">Total Votes: ${result.totalVotes}</div>
            </div>
          `
            )
            .join("")}
          
          <div class="footer">
            <p>Generated on ${new Date().toLocaleString()}</p>
            <p>Peki Senior High School - Prefectorial Elections ${new Date().getFullYear()}</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  // Export results to Excel (CSV)
  const handleExportExcel = () => {
    let csvContent = "Position,Candidate,Votes,Percentage\n";

    filteredResults.forEach((result) => {
      result.candidates
        .sort((a, b) => b.voteCount - a.voteCount)
        .forEach((candidateResult) => {
          csvContent += `"${result.position.title}","${
            candidateResult.candidate.name
          }",${candidateResult.voteCount},${candidateResult.percentage.toFixed(
            1
          )}%\n`;
        });
      // Add an empty line after each position
      csvContent += `"${result.position.title} Total",,${result.totalVotes},100%\n\n`;
    });

    // Create a blob and download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `election_results_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Render loading state
  if (isLoading && results.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex flex-col items-center">
          <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mb-2" />
          <p className="text-gray-500">Loading Results...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && !isLoading && results.length === 0) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  // If user doesn't have view permission
  if (!canViewResults) {
    return (
      <div className="bg-yellow-50 p-6 rounded-lg text-center">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-yellow-800 mb-2">
          Access Restricted
        </h3>
        <p className="text-yellow-700">
          You don't have permission to view election results.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-4 rounded-lg shadow-md">
        <div>
          <h2 className="text-xl font-bold">Election Results</h2>
          <p className="text-indigo-100 text-sm font-sans font-light">
            View and analyze voting results
          </p>
        </div>
        <div className="flex space-x-2">
          {canManageResults && (
            <button
              onClick={toggleResultsPublication}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm rounded-md shadow-sm text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 disabled:opacity-50"
            >
              {electionStatus.resultsPublished ? (
                <>
                  <EyeOff className="h-4 w-4 mr-2" />
                  Hide Results from Voters
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Publish Results to Voters
                </>
              )}
            </button>
          )}
          <button
            onClick={handleExportExcel}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm rounded-md shadow-sm text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Export
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm rounded-md shadow-sm text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </button>
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-4 rounded-md ${
            notification.type === "success"
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          } flex justify-between items-start shadow-sm`}
        >
          <div className="flex">
            {notification.type === "success" ? (
              <Check className="h-5 w-5 text-green-500 mr-3" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            )}
            <p
              className={
                notification.type === "success"
                  ? "text-green-800"
                  : "text-red-800"
              }
            >
              {notification.message}
            </p>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Search positions or candidates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          {/* Position filter (optional) */}
          {positions.length > 0 && (
            <div className="md:ml-4">
              <select
                className="p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={filterPosition}
                onChange={(e) => setFilterPosition(e.target.value)}
              >
                <option value="">All Positions</option>
                {positions.map((position) => (
                  <option key={position._id} value={position._id}>
                    {position.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center text-center">
          <div className="text-3xl font-bold text-indigo-600 mb-1">
            {voterStats.total}
          </div>
          <div className="text-sm text-gray-500">Total Voters</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center text-center">
          <div className="text-3xl font-bold text-green-600 mb-1">
            {voterStats.voted}
          </div>
          <div className="text-sm text-gray-500">
            Voted ({voterStats.percentage.toFixed(1)}%)
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-4 flex flex-col items-center text-center">
          <div className="text-3xl font-bold text-red-600 mb-1">
            {voterStats.notVoted}
          </div>
          <div className="text-sm text-gray-500">Not Voted Yet</div>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredResults.map((result) => (
          <div
            key={result.position._id}
            className="bg-white rounded-lg shadow-md overflow-hidden"
          >
            <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {result.position.title}
              </h3>
              <p className="text-sm text-gray-500">
                Total Votes: {result.totalVotes}
              </p>
            </div>

            <div className="p-4 space-y-4">
              {result.candidates
                .sort((a, b) => b.voteCount - a.voteCount)
                .map((candidateResult, index) => {
                  const candidate = candidateResult.candidate;
                  return (
                    <div key={candidate._id} className="space-y-2">
                      <div className="flex items-center space-x-3">
                        <div className="relative">
                          {candidate.image ? (
                            <img
                              src={candidate.image}
                              alt={candidate.name}
                              className="h-10 w-10 rounded-full object-cover border-2 border-white shadow-sm"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center border-2 border-white shadow-sm">
                              <span className="text-indigo-800 font-medium text-sm">
                                {candidate.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          {index === 0 && (
                            <div className="absolute -top-1 -right-1 bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs shadow-sm">
                              1
                            </div>
                          )}
                          {index === 1 && (
                            <div className="absolute -top-1 -right-1 bg-yellow-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs shadow-sm">
                              2
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-900">
                              {candidate.name}
                            </span>
                            <div className="flex items-center">
                              <span className="text-sm font-medium text-indigo-600">
                                {candidateResult.voteCount}
                              </span>
                              <span className="text-xs text-gray-500 ml-1">
                                ({candidateResult.percentage.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                          <div className="relative mt-2">
                            <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-100">
                              <div
                                style={{
                                  width: `${candidateResult.percentage}%`,
                                }}
                                className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                                  index === 0
                                    ? "bg-green-500"
                                    : index === 1
                                    ? "bg-yellow-500"
                                    : "bg-indigo-500"
                                }`}
                              ></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        ))}
      </div>

      {filteredResults.length === 0 && (
        <div className="bg-white p-8 text-center rounded-lg shadow-md">
          <BarChart2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No results found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {results.length === 0
              ? "No votes have been cast yet."
              : "Try adjusting your search terms"}
          </p>
        </div>
      )}
    </div>
  );
};

export default Results;
