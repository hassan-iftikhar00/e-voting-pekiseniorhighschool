import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, Download, LogOut, ExternalLink, Printer } from "lucide-react";
import { useUser } from "../context/UserContext";
import { useSettings } from "../context/SettingsContext";

const VoteSuccess: React.FC = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { logout } = useUser();
  const { settings } = useSettings();

  const [voteTimestamp] = useState(() => {
    const timestamp = state?.votedAt ? new Date(state.votedAt) : new Date();
    return timestamp;
  });

  const { voteToken } = state || {};

  useEffect(() => {
    if (!voteToken) {
      navigate("/");
    }

    localStorage.removeItem("token");
    localStorage.removeItem("voterId");
  }, [voteToken, navigate]);

  const handleDownloadReceipt = () => {
    const receiptHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vote Receipt - ${voteToken}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .receipt {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 25px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
          .receipt-header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 2px solid #4f46e5;
          }
          .receipt-header h1 {
            color: #4f46e5;
            margin: 0 0 5px 0;
          }
          .receipt-header p {
            color: #666;
            margin: 0;
          }
          .school-info {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .receipt-body {
            margin-bottom: 25px;
          }
          .receipt-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
          }
          .receipt-label {
            font-weight: bold;
            color: #666;
          }
          .receipt-value {
            text-align: right;
          }
          .token {
            font-family: monospace;
            font-size: 20px;
            background-color: #f5f3ff;
            padding: 8px 12px;
            border-radius: 4px;
            letter-spacing: 1px;
            font-weight: bold;
            color: #4f46e5;
          }
          .receipt-footer {
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
          .receipt-note {
            font-style: italic;
            margin-top: 15px;
          }
          .stamp {
            margin-top: 30px;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .stamp-inner {
            border: 2px dashed #4CAF50;
            border-radius: 50%;
            width: 120px;
            height: 120px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: #4CAF50;
            transform: rotate(-15deg);
          }
          .stamp-text {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 14px;
          }
          .stamp-date {
            font-size: 12px;
          }
          @media print {
            body {
              padding: 0;
              margin: 0;
            }
            .receipt {
              border: none;
              box-shadow: none;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="receipt-header">
            <div class="school-info">${settings.schoolName}</div>
            <h1>VOTE CONFIRMATION RECEIPT</h1>
            <p>${settings.electionTitle || "Student Council Election"}</p>
          </div>
          
          <div class="receipt-body">
            <div class="receipt-row">
              <span class="receipt-label">Date:</span>
              <span class="receipt-value">${voteTimestamp.toLocaleDateString(
                undefined,
                {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }
              )}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Time:</span>
              <span class="receipt-value">${voteTimestamp.toLocaleTimeString(
                undefined,
                {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }
              )}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Vote Token:</span>
              <span class="receipt-value token">${voteToken}</span>
            </div>
          </div>
          
          <div class="stamp">
            <div class="stamp-inner">
              <div class="stamp-text">Verified</div>
              <div class="stamp-date">${voteTimestamp.toLocaleDateString()}</div>
            </div>
          </div>
          
          <div class="receipt-footer">
            <p>This receipt confirms your participation in the election.</p>
            <p class="receipt-note">Your vote is anonymous and cannot be linked back to you.</p>
            <p class="receipt-note">Keep this receipt as proof of your participation.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob([receiptHtml], { type: "text/html" });

    const downloadLink = document.createElement("a");
    downloadLink.href = URL.createObjectURL(blob);
    downloadLink.download = `vote-receipt-${voteToken}.html`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handlePrint = () => {
    const receiptHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Vote Receipt - ${voteToken}</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .receipt {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 25px;
          }
          .receipt-header {
            text-align: center;
            margin-bottom: 20px;
            padding-bottom: 20px;
            border-bottom: 2px solid #4f46e5;
          }
          .receipt-header h1 {
            color: #4f46e5;
            margin: 0 0 5px 0;
          }
          .receipt-header p {
            color: #666;
            margin: 0;
          }
          .school-info {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .receipt-body {
            margin-bottom: 25px;
          }
          .receipt-row {
            display: flex;
            justify-content: space-between;
            padding: 10px 0;
            border-bottom: 1px solid #eee;
          }
          .receipt-label {
            font-weight: bold;
            color: #666;
          }
          .receipt-value {
            text-align: right;
          }
          .token {
            font-family: monospace;
            font-size: 20px;
            background-color: #f5f3ff;
            padding: 8px 12px;
            border-radius: 4px;
            letter-spacing: 1px;
            font-weight: bold;
            color: #4f46e5;
          }
          .receipt-footer {
            margin-top: 30px;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
          .receipt-note {
            font-style: italic;
            margin-top: 15px;
          }
          .stamp {
            margin-top: 30px;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .stamp-inner {
            border: 2px dashed #4CAF50;
            border-radius: 50%;
            width: 120px;
            height: 120px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            color: #4CAF50;
            transform: rotate(-15deg);
          }
          .stamp-text {
            font-weight: bold;
            text-transform: uppercase;
            font-size: 14px;
          }
          .stamp-date {
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="receipt-header">
            <div class="school-info">${settings.schoolName}</div>
            <h1>VOTE CONFIRMATION RECEIPT</h1>
            <p>${settings.electionTitle || "Student Council Election"}</p>
          </div>
          
          <div class="receipt-body">
            <div class="receipt-row">
              <span class="receipt-label">Date:</span>
              <span class="receipt-value">${voteTimestamp.toLocaleDateString(
                undefined,
                {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                }
              )}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Time:</span>
              <span class="receipt-value">${voteTimestamp.toLocaleTimeString(
                undefined,
                {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }
              )}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Vote Token:</span>
              <span class="receipt-value token">${voteToken}</span>
            </div>
          </div>
          
          <div class="stamp">
            <div class="stamp-inner">
              <div class="stamp-text">Verified</div>
              <div class="stamp-date">${voteTimestamp.toLocaleDateString()}</div>
            </div>
          </div>
          
          <div class="receipt-footer">
            <p>This receipt confirms your participation in the election.</p>
            <p class="receipt-note">Your vote is anonymous and cannot be linked back to you.</p>
            <p class="receipt-note">Keep this receipt as proof of your participation.</p>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(receiptHtml);
      printWindow.document.close();
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleViewResults = () => {
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
                {voteTimestamp.toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span className="text-gray-500">Time:</span>
              <span className="text-gray-900 font-medium">
                {voteTimestamp.toLocaleTimeString()}
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
              onClick={handleDownloadReceipt}
              className="flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Receipt
            </button>

            <button
              onClick={handlePrint}
              className="flex items-center justify-center px-4 py-2 border border-indigo-300 shadow-sm text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
            >
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </button>
          </div>

          <button
            onClick={handleLogout}
            className="mt-4 flex items-center justify-center w-full px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Finish
          </button>

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
