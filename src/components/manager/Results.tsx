import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Columns,
  Info,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  BarChart3,
  PieChart,
  Award,
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
  const [sortBy, setSortBy] = useState<"position" | "votes">("position");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);
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

  // Fetch election status
  const fetchElectionStatus = async () => {
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
        }/api/election/status`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch election status: ${response.status}`);
      }

      const data = await response.json();
      setElectionStatus(data);
    } catch (error: any) {
      console.error("Error fetching election status:", error);
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

  // Sort and filter results
  const filteredResults = results
    .filter(
      (result) =>
        (filterPosition === "" || result.position._id === filterPosition) &&
        (searchTerm === "" ||
          result.position.title
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          result.candidates.some((c) =>
            c.candidate.name.toLowerCase().includes(searchTerm.toLowerCase())
          ))
    )
    .sort((a, b) => {
      if (sortBy === "position") {
        return sortDirection === "asc"
          ? a.position.priority - b.position.priority
          : b.position.priority - a.position.priority;
      } else if (sortBy === "votes") {
        return sortDirection === "asc"
          ? a.totalVotes - b.totalVotes
          : b.totalVotes - a.totalVotes;
      }
      return 0;
    });

  // Handle sorting change
  const handleSort = (field: "position" | "votes") => {
    if (sortBy === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }
  };

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
        h1, h2 { text-align: center; color: #4338ca; }
        h1 { margin-bottom: 5px; }
        h2 { margin-top: 0; margin-bottom: 20px; font-size: 18px; color: #666; }
        .stats { text-align: center; margin-bottom: 20px; padding: 10px; background-color: #f8f9fa; border-radius: 8px; }
        .stats p { margin: 5px 0; }
        .position { margin-bottom: 30px; }
        .position-header { background-color: #f3f4f6; padding: 10px; border-radius: 6px; margin-bottom: 10px; }
        .candidates { width: 100%; border-collapse: collapse; margin-bottom: 15px; }
        .candidates th, .candidates td { padding: 8px 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        .candidates th { background-color: #f9fafb; color: #374151; font-weight: bold; }
        .progress-bar { background-color: #eee; height: 20px; border-radius: 10px; overflow: hidden; }
        .progress { height: 100%; background-color: #4f46e5; }
        .winner { font-weight: bold; color: #047857; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280; }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Election Results - Peki Senior High School</title>
          ${styles}
        </head>
        <body>
          <h1>Peki Senior High School - Election Results</h1>
          <h2>Prefectorial Elections ${new Date().getFullYear()}</h2>
          
          <div class="stats">
            <p><strong>Total Voters:</strong> ${voterStats.total}</p>
            <p><strong>Voters Who Voted:</strong> ${
              voterStats.voted
            } (${voterStats.percentage.toFixed(1)}%)</p>
            <p><strong>Voters Who Haven't Voted:</strong> ${
              voterStats.notVoted
            }</p>
          </div>
          
          ${filteredResults
            .map(
              (result) => `
            <div class="position">
              <h3 class="position-header">${result.position.title}</h3>
              <table class="candidates">
                <thead>
                  <tr>
                    <th width="40%">Candidate</th>
                    <th width="15%">Votes</th>
                    <th width="35%">Percentage</th>
                    <th width="10%">Results</th>
                  </tr>
                </thead>
                <tbody>
                  ${result.candidates
                    .sort((a, b) => b.voteCount - a.voteCount)
                    .map(
                      (candidate, index) => `
                    <tr class="${index === 0 ? "winner" : ""}">
                      <td>${candidate.candidate.name}</td>
                      <td>${candidate.voteCount}</td>
                      <td>
                        <div class="progress-bar">
                          <div class="progress" style="width: ${
                            candidate.percentage
                          }%"></div>
                        </div>
                      </td>
                      <td>${candidate.percentage.toFixed(1)}%</td>
                    </tr>
                  `
                    )
                    .join("")}
                </tbody>
              </table>
              <p><strong>Total Votes Cast:</strong> ${result.totalVotes}</p>
            </div>
          `
            )
            .join("")}
          
          <div class="footer">
            <p>Printed on ${new Date().toLocaleString()}</p>
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
    // Create CSV content
    let csvContent = "Position,Candidate,Votes,Percentage\n";

    filteredResults.forEach((result) => {
      result.candidates
        .sort((a, b) => b.voteCount - a.voteCount)
        .forEach((candidate) => {
          csvContent += `"${result.position.title}","${
            candidate.candidate.name
          }",${candidate.voteCount},${candidate.percentage.toFixed(1)}%\n`;
        });
      // Add an empty line after each position
      csvContent += "\n";
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
            View and analyze the election results
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

      {/* Filters and Actions */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0">
          {/* Left side - Filter select */}
          <div className="flex items-center space-x-2">
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

            <div className="flex space-x-1 border border-gray-300 rounded-md p-1">
              <button
                onClick={() => setChartType("bar")}
                className={`p-1 rounded ${
                  chartType === "bar"
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
                title="Bar Chart"
              >
                <BarChart3 className="h-5 w-5" />
              </button>
              <button
                onClick={() => setChartType("pie")}
                className={`p-1 rounded ${
                  chartType === "pie"
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-500 hover:bg-gray-100"
                }`}
                title="Pie Chart"
              >
                <PieChart className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Right side - Action buttons */}
          <div className="flex space-x-2 md:ml-auto">
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              title="Print results"
            >
              <Printer className="h-4 w-4 mr-1.5" />
              Print
            </button>
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              title="Export to Excel"
            >
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />
              Export
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search by position or candidate name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Empty state */}
      {filteredResults.length === 0 && (
        <div className="bg-white rounded-lg p-8 text-center">
          <Award className="h-12 w-12 text-indigo-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No results found
          </h3>
          <p className="text-gray-500 mb-6">
            {results.length === 0
              ? "No votes have been cast yet."
              : "No results match your search criteria."}
          </p>
        </div>
      )}

      {/* Results Display */}
      <div className="space-y-6">
        {filteredResults.map((result) => (
          <div
            key={result.position._id}
            className="bg-white rounded-lg shadow-md overflow-hidden"
          >
            <div
              className="bg-indigo-50 p-4 flex justify-between items-center cursor-pointer"
              onClick={() =>
                setSelectedPosition(
                  selectedPosition === result.position._id
                    ? null
                    : result.position._id
                )
              }
            >
              <h3 className="text-lg font-semibold text-indigo-900 flex items-center">
                <Award className="h-5 w-5 mr-2 text-indigo-500" />
                {result.position.title}
              </h3>
              <div className="flex items-center">
                <span className="mr-2 text-sm text-indigo-700">
                  {result.totalVotes} votes
                </span>
                {selectedPosition === result.position._id ? (
                  <ChevronUp className="h-5 w-5 text-indigo-500" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-indigo-500" />
                )}
              </div>
            </div>

            {selectedPosition === result.position._id && (
              <div className="p-4">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th
                          scope="col"
                          className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Rank
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Candidate
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Votes
                        </th>
                        <th
                          scope="col"
                          className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3"
                        >
                          Percentage
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {result.candidates
                        .sort((a, b) => b.voteCount - a.voteCount)
                        .map((candidate, index) => (
                          <tr
                            key={candidate.candidate._id}
                            className={index === 0 ? "bg-green-50" : ""}
                          >
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {index + 1}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                {candidate.candidate.image ? (
                                  <img
                                    src={candidate.candidate.image}
                                    alt={candidate.candidate.name}
                                    className="h-8 w-8 rounded-full mr-3 object-cover"
                                  />
                                ) : (
                                  <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                                    <span className="text-indigo-800 font-medium text-sm">
                                      {candidate.candidate.name.charAt(0)}
                                    </span>
                                  </div>
                                )}
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {candidate.candidate.name}
                                    {index === 0 && (
                                      <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                                        Winner
                                      </span>
                                    )}
                                  </div>
                                  {candidate.candidate.class && (
                                    <div className="text-xs text-gray-500">
                                      {candidate.candidate.class}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              <div className="text-sm font-semibold text-gray-900">
                                {candidate.voteCount}
                              </div>
                            </td>
                            <td className="px-3 py-4">
                              <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                  className="bg-indigo-600 h-2.5 rounded-full"
                                  style={{ width: `${candidate.percentage}%` }}
                                ></div>
                              </div>
                              <div className="text-right text-xs mt-1 font-medium text-gray-500">
                                {candidate.percentage.toFixed(1)}%
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Results;
