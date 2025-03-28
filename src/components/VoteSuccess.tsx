import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, Printer, LogOut, ExternalLink } from "lucide-react";
import { useUser } from "../context/UserContext";
import { useSettings } from "../context/SettingsContext";

const VoteSuccess: React.FC = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { logout } = useUser();
  const { settings } = useSettings();
  const [currentTime] = useState(new Date());

  const { voteToken } = state || {};

  useEffect(() => {
    if (!voteToken) {
      navigate("/");
    }

    // Clear any remaining voter session data
    localStorage.removeItem("token");
    localStorage.removeItem("voterId");
  }, [voteToken, navigate]);

  const handlePrint = () => {
    window.print();
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleViewResults = () => {
    // Only navigate to results if they're published
    if (settings.resultsPublished) {
      navigate("/results");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-800 py-12 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl overflow-hidden">
        <div className="bg-indigo-600 h-2"></div>

        <div className="p-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Vote Confirmation
            </h2>
            <p className="text-gray-600 mb-6">
              Your vote has been successfully recorded.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">School:</span>
              <span className="text-gray-900 font-medium">
                {settings.schoolName}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">Election:</span>
              <span className="text-gray-900 font-medium">
                {settings.electionTitle || "Student Council Election"}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">Date:</span>
              <span className="text-gray-900 font-medium">
                {currentTime.toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">Time:</span>
              <span className="text-gray-900 font-medium">
                {currentTime.toLocaleTimeString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Vote Token:</span>
              <span className="text-gray-900 font-mono font-bold">
                {voteToken}
              </span>
            </div>
          </div>

          <div className="text-center text-sm text-gray-500 mb-6">
            <p>Keep your vote token as proof of your participation.</p>
            <p>Your vote is anonymous and cannot be linked back to you.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={handlePrint}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Finish
            </button>
          </div>

          {settings.resultsPublished && (
            <button
              onClick={handleViewResults}
              className="mt-4 flex items-center justify-center w-full px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Election Results
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default VoteSuccess;
