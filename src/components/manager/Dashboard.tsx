import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  Check,
  AlertTriangle,
  PieChart,
  BarChart2,
  GraduationCap,
  Home,
  Calendar,
  Shield,
  RefreshCw,
  Award,
  Settings,
  Clock,
} from "lucide-react";
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from "chart.js";
import { Radar } from "react-chartjs-2";
import { useElection } from "../../context/ElectionContext";
import { useSettings } from "../../context/SettingsContext";
import { useUser } from "../../context/UserContext"; // Add this import
import PermissionGuard from "../PermissionGuard";

// Register ChartJS components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const Dashboard: React.FC = () => {
  const { stats, electionStatus, timeRemaining, updateStats, loading } =
    useElection();
  const { settings } = useSettings();
  const { user } = useUser();
  const [activityView, setActivityView] = React.useState<
    "year" | "class" | "house"
  >("year");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await updateStats();
    setTimeout(() => setIsRefreshing(false), 800);
  };

  // Voting activity data
  const votingActivityData = {
    year: {
      labels: stats.votingActivity.year.labels,
      datasets: [
        {
          label: "Votes",
          data: stats.votingActivity.year.data,
          fill: true,
          backgroundColor: "rgba(99, 102, 241, 0.2)",
          borderColor: "rgba(99, 102, 241, 1)",
          pointBackgroundColor: "rgba(99, 102, 241, 1)",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "rgba(99, 102, 241, 1)",
        },
      ],
    },
    class: {
      labels: stats.votingActivity.class.labels,
      datasets: [
        {
          label: "Votes",
          data: stats.votingActivity.class.data,
          fill: true,
          backgroundColor: "rgba(16, 185, 129, 0.2)",
          borderColor: "rgba(16, 185, 129, 1)",
          pointBackgroundColor: "rgba(16, 185, 129, 1)",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "rgba(16, 185, 129, 1)",
        },
      ],
    },
    house: {
      labels: stats.votingActivity.house.labels,
      datasets: [
        {
          label: "Votes",
          data: stats.votingActivity.house.data,
          fill: true,
          backgroundColor: "rgba(245, 158, 11, 0.2)",
          borderColor: "rgba(245, 158, 11, 1)",
          pointBackgroundColor: "rgba(245, 158, 11, 1)",
          pointBorderColor: "#fff",
          pointHoverBackgroundColor: "#fff",
          pointHoverBorderColor: "rgba(245, 158, 11, 1)",
        },
      ],
    },
  };

  // Chart options
  const chartOptions = {
    scales: {
      r: {
        beginAtZero: true,
        ticks: {
          stepSize: 50,
        },
        grid: {
          color: "rgba(0, 0, 0, 0.1)",
        },
        angleLines: {
          color: "rgba(0, 0, 0, 0.1)",
        },
        pointLabels: {
          font: {
            size: 12,
          },
        },
      },
    },
    plugins: {
      legend: {
        display: false,
      },
    },
    maintainAspectRatio: false,
  };

  // Get icon for current view
  const getViewIcon = () => {
    switch (activityView) {
      case "year":
        return <Calendar className="h-5 w-5 text-indigo-600" />;
      case "class":
        return <GraduationCap className="h-5 w-5 text-indigo-600" />;
      case "house":
        return <Home className="h-5 w-5 text-indigo-600" />;
    }
  };

  // Get title for current view
  const getViewTitle = () => {
    switch (activityView) {
      case "year":
        return "Voting by Year/Level";
      case "class":
        return "Voting by Programme/Class";
      case "house":
        return "Voting by Hall/House";
    }
  };

  // Format date from settings
  const getFormattedDate = () => {
    try {
      if (settings.electionDate) {
        // Try to parse and format the date
        const dateParts = settings.electionDate.split("-");
        if (dateParts.length === 3) {
          // If format is like 15-May-2025
          return settings.electionDate;
        } else {
          // Try to parse as ISO date
          const date = new Date(settings.electionDate);
          return date
            .toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
            .replace(/ /g, "-");
        }
      }
      return "15-May-2025"; // Fallback
    } catch (e) {
      console.error("Error formatting date:", e);
      return "15-May-2025"; // Fallback
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-6 rounded-lg shadow-lg">
        <h1 className="text-2xl font-bold">
          Welcome, {user?.name || "Administrator"}!
        </h1>
        <p className="mt-2 text-indigo-100">
          This is your election management dashboard. Monitor election progress,
          manage candidates, and view results.
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-4 bg-white rounded-lg overflow-hidden">
        {/* Total Voters */}
        <div className="p-4 relative">
          <div className="absolute right-0 top-1 bottom-1 w-[2px] bg-gray-200" />
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="bg-indigo-50 rounded-lg p-2">
                <Users className="h-5 w-5 text-indigo-600" />
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Voters</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? "..." : stats.totalVoters}
              </p>
            </div>
          </div>
        </div>

        {/* Total Votes Cast */}
        <div className="p-4 relative">
          <div className="absolute right-0 top-1 bottom-1 w-[2px] bg-gray-200" />
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="bg-green-50 rounded-lg p-2">
                <Check className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Votes Cast</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? "..." : stats.votedCount}
              </p>
            </div>
          </div>
        </div>

        {/* Yet to Vote */}
        <div className="p-4 relative">
          <div className="absolute right-0 top-1 bottom-1 w-[2px] bg-gray-200" />
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="bg-red-50 rounded-lg p-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Yet to Vote</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? "..." : stats.remainingVoters}
              </p>
            </div>
          </div>
        </div>

        {/* Completion Percentage */}
        <div className="p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="bg-purple-50 rounded-lg p-2">
                <PieChart className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Completion</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? "..." : `${stats.completionPercentage}%`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Empty state for no voters - simplified version without seeding */}
      {stats.totalVoters === 0 && (
        <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4">
          <div className="flex items-center">
            <div>
              <h3 className="text-lg font-medium text-yellow-800">
                No voter data found
              </h3>
              <p className="text-sm text-yellow-600">
                Add voters through the Voters Management page to see election
                statistics
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Voting Activity Graph */}
      <div className="grid grid-cols-2 gap-6">
        {/* Voting Analysis */}
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">
              Voting Analysis
            </h3>
            <button
              onClick={handleRefresh}
              className="p-1 rounded-full hover:bg-gray-100"
              title="Refresh data"
            >
              <RefreshCw
                className={`h-5 w-5 text-gray-500 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
            </button>
          </div>
          <div className="flex justify-center">
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 100 100" className="transform -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#E5E7EB"
                  strokeWidth="10"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  fill="none"
                  stroke="#3B82F6"
                  strokeWidth="10"
                  strokeDasharray={`${stats.completionPercentage * 2.83} 283`}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">
                  {loading ? "..." : `${stats.completionPercentage}%`}
                </span>
              </div>
            </div>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-4">
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-blue-500 mr-2" />
              <span className="text-sm text-gray-600">Voted</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-gray-300 mr-2" />
              <span className="text-sm text-gray-600">Remaining</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 rounded-full bg-orange-500 mr-2" />
              <span className="text-sm text-gray-600">In Progress</span>
            </div>
          </div>
        </div>

        {/* Voting Activity */}
        <div className="bg-white rounded-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              {getViewIcon()}
              <h3 className="text-lg font-semibold text-gray-900">
                {getViewTitle()}
              </h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActivityView("year")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activityView === "year"
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Year
              </button>
              <button
                onClick={() => setActivityView("class")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activityView === "class"
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Programme
              </button>
              <button
                onClick={() => setActivityView("house")}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activityView === "house"
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Hall
              </button>
            </div>
          </div>
          <div className="h-64">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
              </div>
            ) : (
              <Radar
                data={votingActivityData[activityView]}
                options={chartOptions}
              />
            )}
          </div>
        </div>
      </div>

      {/* Recent Voters Section */}
      <div className="bg-white rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Voters
        </h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
          </div>
        ) : stats.recentVoters.length > 0 ? (
          <div className="space-y-4">
            {stats.recentVoters.map((voter) => (
              <div
                key={voter.id}
                className="flex items-center justify-between border-b pb-3"
              >
                <div>
                  <p className="font-medium text-gray-800">{voter.name}</p>
                  <p className="text-sm text-gray-500">{voter.voterId}</p>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(voter.votedAt).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No recent voting activity
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="fixed bottom-4 left-0 right-0 py-2 bg-black text-white">
        <div className="flex items-center justify-center text-xs">
          <Shield className="h-3 w-3 mr-1" />
          Monitored by Secured Smart System (Contact +233 24 333 9546)
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
