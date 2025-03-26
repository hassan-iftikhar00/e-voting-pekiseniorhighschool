import React, { useState, useEffect } from "react";
import {
  BarChart3,
  PieChart,
  DollarSign,
  AlertCircle,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  ChevronDown,
  Calendar,
  Clock,
  Users,
  GraduationCap,
  Home,
  Search,
  Filter,
  X,
  Check,
  Award,
} from "lucide-react";
import { useUser } from "../../context/UserContext";

// Define interfaces for our data
interface Position {
  _id: string;
  title: string;
  priority: number;
}

interface VoteTimeline {
  hour: number;
  count: number;
}

interface VotingPattern {
  class?: string;
  house?: string;
  year?: string;
  count: number;
  percentage: number;
}

interface VotingMetrics {
  totalVotes: number;
  totalEligibleVoters: number;
  turnoutPercentage: number;
  averageVotesPerPosition: number;
  votingTimeline: VoteTimeline[];
  byClass: VotingPattern[];
  byHouse: VotingPattern[];
  byYear: VotingPattern[];
}

const DetailedVoteAnalysis: React.FC = () => {
  const { hasPermission } = useUser();
  const [metrics, setMetrics] = useState<VotingMetrics | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: new Date(new Date().setDate(new Date().getDate() - 7))
      .toISOString()
      .split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartType, setChartType] = useState<"bar" | "pie">("bar");
  const [filter, setFilter] = useState<"class" | "house" | "year">("class");
  const [searchTerm, setSearchTerm] = useState("");

  // Check user permissions once
  const canViewAnalytics = hasPermission("analytics", "view");
  const canExportAnalytics = hasPermission("analytics", "export");

  // Fetch metrics data
  const fetchMetrics = async () => {
    if (!canViewAnalytics) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get authentication token
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      // Build the query string for filters
      const params = new URLSearchParams({
        position: selectedPosition !== "all" ? selectedPosition : "",
        from: dateRange.from,
        to: dateRange.to,
      });

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/analytics/voting-patterns?${params.toString()}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }

      const data = await response.json();
      setMetrics(data);
    } catch (error: any) {
      console.error("Error fetching voting analytics:", error);
      setError(error.message || "Failed to load voting analytics");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch positions
  const fetchPositions = async () => {
    if (!canViewAnalytics) return;

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

  // Load data on component mount and when filters change
  useEffect(() => {
    if (canViewAnalytics) {
      fetchPositions();
      fetchMetrics();
    }
  }, [canViewAnalytics, selectedPosition, dateRange]);

  // Handle print function
  const handlePrint = () => {
    if (!metrics) return;

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
        .metrics-card { margin-bottom: 20px; padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px; }
        .metric-item { padding: 15px; background-color: #f9fafb; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 24px; font-weight: bold; color: #4f46e5; margin: 10px 0; }
        .metric-label { font-size: 14px; color: #6b7280; }
        h3 { color: #4f46e5; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background-color: #f3f4f6; font-weight: bold; color: #374151; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 15px; }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Detailed Voting Analysis - Peki Senior High School</title>
          ${styles}
        </head>
        <body>
          <h1>Peki Senior High School - Voting Analysis</h1>
          <h2>Prefectorial Elections ${new Date().getFullYear()}</h2>
          
          <div class="metrics-card">
            <h3>Key Metrics</h3>
            <div class="metrics-grid">
              <div class="metric-item">
                <div class="metric-label">Total Votes Cast</div>
                <div class="metric-value">${metrics.totalVotes}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Eligible Voters</div>
                <div class="metric-value">${metrics.totalEligibleVoters}</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Voter Turnout</div>
                <div class="metric-value">${metrics.turnoutPercentage.toFixed(
                  1
                )}%</div>
              </div>
              <div class="metric-item">
                <div class="metric-label">Avg. Votes Per Position</div>
                <div class="metric-value">${metrics.averageVotesPerPosition.toFixed(
                  1
                )}</div>
              </div>
            </div>
          </div>
          
          <h3>Voting by Class</h3>
          <table>
            <thead>
              <tr>
                <th>Class</th>
                <th>Votes</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${metrics.byClass
                .map(
                  (item) => `
                <tr>
                  <td>${item.class || "Unknown"}</td>
                  <td>${item.count}</td>
                  <td>${item.percentage.toFixed(1)}%</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          
          <h3>Voting by House</h3>
          <table>
            <thead>
              <tr>
                <th>House</th>
                <th>Votes</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${metrics.byHouse
                .map(
                  (item) => `
                <tr>
                  <td>${item.house || "Unknown"}</td>
                  <td>${item.count}</td>
                  <td>${item.percentage.toFixed(1)}%</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          
          <h3>Voting by Year</h3>
          <table>
            <thead>
              <tr>
                <th>Year</th>
                <th>Votes</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              ${metrics.byYear
                .map(
                  (item) => `
                <tr>
                  <td>${item.year || "Unknown"}</td>
                  <td>${item.count}</td>
                  <td>${item.percentage.toFixed(1)}%</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          
          <h3>Voting Timeline</h3>
          <table>
            <thead>
              <tr>
                <th>Hour</th>
                <th>Vote Count</th>
              </tr>
            </thead>
            <tbody>
              ${metrics.votingTimeline
                .map(
                  (item) => `
                <tr>
                  <td>${item.hour}:00</td>
                  <td>${item.count}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Printed on ${new Date().toLocaleString()}</p>
            <p>Analysis period: ${new Date(
              dateRange.from
            ).toLocaleDateString()} - ${new Date(
      dateRange.to
    ).toLocaleDateString()}</p>
            <p>Peki Senior High School - Prefectorial Elections ${new Date().getFullYear()}</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  };

  // Handle export to Excel/CSV
  const handleExport = () => {
    if (!metrics) return;

    // Create CSV content
    let csvContent = "Type,Category,Votes,Percentage\n";

    // Class data
    metrics.byClass.forEach((item) => {
      csvContent += `Class,${item.class || "Unknown"},${
        item.count
      },${item.percentage.toFixed(1)}%\n`;
    });

    // House data
    csvContent += "\n";
    metrics.byHouse.forEach((item) => {
      csvContent += `House,${item.house || "Unknown"},${
        item.count
      },${item.percentage.toFixed(1)}%\n`;
    });

    // Year data
    csvContent += "\n";
    metrics.byYear.forEach((item) => {
      csvContent += `Year,${item.year || "Unknown"},${
        item.count
      },${item.percentage.toFixed(1)}%\n`;
    });

    // Timeline data
    csvContent += "\nHour,Vote Count\n";
    metrics.votingTimeline.forEach((item) => {
      csvContent += `${item.hour}:00,${item.count}\n`;
    });

    // Add summary stats
    csvContent += "\nKey Metrics,Value\n";
    csvContent += `Total Votes,${metrics.totalVotes}\n`;
    csvContent += `Total Eligible Voters,${metrics.totalEligibleVoters}\n`;
    csvContent += `Turnout Percentage,${metrics.turnoutPercentage.toFixed(
      1
    )}%\n`;
    csvContent += `Average Votes Per Position,${metrics.averageVotesPerPosition.toFixed(
      1
    )}\n`;

    // Create and download the file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `voting_analysis_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If user doesn't have view permission
  if (!canViewAnalytics) {
    return (
      <div className="bg-yellow-50 p-6 rounded-lg text-center">
        <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-yellow-800 mb-2">
          Access Restricted
        </h3>
        <p className="text-yellow-700">
          You don't have permission to view detailed voting analytics.
        </p>
      </div>
    );
  }

  // Render loading state
  if (isLoading && !metrics) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex flex-col items-center">
          <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mb-2" />
          <p className="text-gray-500">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && !isLoading && !metrics) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  // Helper function to render the active dataset based on filter
  const getFilteredData = () => {
    if (!metrics) return [];

    switch (filter) {
      case "class":
        return metrics.byClass.filter(
          (item) =>
            !searchTerm ||
            (item.class &&
              item.class.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      case "house":
        return metrics.byHouse.filter(
          (item) =>
            !searchTerm ||
            (item.house &&
              item.house.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      case "year":
        return metrics.byYear.filter(
          (item) =>
            !searchTerm ||
            (item.year &&
              item.year.toLowerCase().includes(searchTerm.toLowerCase()))
        );
      default:
        return [];
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-4 rounded-lg shadow-md">
        <div>
          <h2 className="text-xl font-bold">Detailed Voting Analysis</h2>
          <p className="text-indigo-100 text-sm font-sans font-light">
            Advanced metrics and patterns of voting behavior
          </p>
        </div>

        {canExportAnalytics && (
          <div className="flex space-x-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm rounded-md shadow-sm text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Report
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm rounded-md shadow-sm text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export Data
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Position
            </label>
            <select
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              value={selectedPosition}
              onChange={(e) => setSelectedPosition(e.target.value)}
            >
              <option value="all">All Positions</option>
              {positions.map((position) => (
                <option key={position._id} value={position._id}>
                  {position.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              value={dateRange.from}
              onChange={(e) =>
                setDateRange({ ...dateRange, from: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              value={dateRange.to}
              onChange={(e) =>
                setDateRange({ ...dateRange, to: e.target.value })
              }
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Chart Type
            </label>
            <div className="flex p-1 border border-gray-300 rounded-md">
              <button
                className={`flex-1 py-1 px-2 rounded-md flex items-center justify-center ${
                  chartType === "bar"
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-500"
                }`}
                onClick={() => setChartType("bar")}
              >
                <BarChart3 className="h-4 w-4 mr-1" />
                Bar
              </button>
              <button
                className={`flex-1 py-1 px-2 rounded-md flex items-center justify-center ${
                  chartType === "pie"
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-500"
                }`}
                onClick={() => setChartType("pie")}
              >
                <PieChart className="h-4 w-4 mr-1" />
                Pie
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              filter === "class"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
            onClick={() => setFilter("class")}
          >
            <GraduationCap className="h-4 w-4 inline mr-1" />
            By Class
          </button>
          <button
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              filter === "house"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
            onClick={() => setFilter("house")}
          >
            <Home className="h-4 w-4 inline mr-1" />
            By House
          </button>
          <button
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              filter === "year"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
            onClick={() => setFilter("year")}
          >
            <Calendar className="h-4 w-4 inline mr-1" />
            By Year
          </button>
        </div>

        <div className="mt-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder={`Search by ${filter}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Analytics cards */}
      {metrics && (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-indigo-100 text-indigo-600">
                  <Users className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Total Votes
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {metrics.totalVotes}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-green-100 text-green-600">
                  <Users className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Eligible Voters
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {metrics.totalEligibleVoters}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-blue-100 text-blue-600">
                  <DollarSign className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Turnout</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {metrics.turnoutPercentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md">
              <div className="flex items-center">
                <div className="p-3 rounded-full bg-purple-100 text-purple-600">
                  <Award className="h-6 w-6" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">
                    Avg. Per Position
                  </p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {metrics.averageVotesPerPosition.toFixed(1)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Main analysis */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {filter === "class"
                ? "Voting by Class"
                : filter === "house"
                ? "Voting by House"
                : "Voting by Year"}
            </h3>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {filter === "class"
                        ? "Class"
                        : filter === "house"
                        ? "House"
                        : "Year"}
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Votes
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Percentage
                    </th>
                    {chartType === "bar" && (
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Distribution
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {getFilteredData().map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {filter === "class"
                            ? item.class
                            : filter === "house"
                            ? item.house
                            : item.year || "Unknown"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.count}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {item.percentage.toFixed(1)}%
                        </div>
                      </td>
                      {chartType === "bar" && (
                        <td className="px-6 py-4">
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className="bg-indigo-600 h-2.5 rounded-full"
                              style={{ width: `${item.percentage}%` }}
                            ></div>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Timeline analysis */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Clock className="h-5 w-5 text-indigo-500 mr-2" />
              Voting Timeline
            </h3>

            <div className="h-64">
              {/* Here, you would normally use a charting library like recharts or Chart.js */}
              {/* For simplicity, I'm using a basic representation */}
              <div className="h-full flex items-end space-x-1">
                {metrics.votingTimeline.map((item, index) => {
                  const maxCount = Math.max(
                    ...metrics.votingTimeline.map((t) => t.count)
                  );
                  const height =
                    maxCount > 0 ? (item.count / maxCount) * 100 : 0;

                  return (
                    <div
                      key={index}
                      className="flex flex-col items-center flex-1"
                    >
                      <div
                        className="w-full bg-indigo-500 rounded-t"
                        style={{ height: `${height}%` }}
                      ></div>
                      <div className="text-xs text-gray-500 mt-1">
                        {item.hour}:00
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 text-sm text-gray-500 text-center">
              Hourly vote distribution throughout the day
            </div>
          </div>
        </>
      )}

      {/* Empty state if no data */}
      {!isLoading &&
        !error &&
        (!metrics ||
          (filter === "class" && metrics.byClass.length === 0) ||
          (filter === "house" && metrics.byHouse.length === 0) ||
          (filter === "year" && metrics.byYear.length === 0)) && (
          <div className="bg-white rounded-lg p-8 text-center">
            <Filter className="h-12 w-12 text-indigo-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No voting data available
            </h3>
            <p className="text-gray-500 mb-6">
              There's no voting data to analyze for the selected filters.
            </p>
            <button
              onClick={() => {
                setSelectedPosition("all");
                setDateRange({
                  from: new Date(new Date().setDate(new Date().getDate() - 7))
                    .toISOString()
                    .split("T")[0],
                  to: new Date().toISOString().split("T")[0],
                });
                setFilter("class");
                setSearchTerm("");
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Reset Filters
            </button>
          </div>
        )}
    </div>
  );
};

export default DetailedVoteAnalysis;
