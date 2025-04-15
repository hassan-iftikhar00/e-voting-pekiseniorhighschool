import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, Printer, FileText } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

interface VoteSuccessProps {
  voter?: {
    name: string;
    voterId: string;
    votedAt: string;
    voteToken: string;
  };
  isPopup?: boolean;
}

const VoteSuccess: React.FC<VoteSuccessProps> = ({
  voter,
  isPopup = false,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [voteToken, setVoteToken] = useState<string>("");

  // Get voter information from location state or props
  const voterData = voter || location.state?.voter || {};
  const voteTimestamp = voterData.votedAt
    ? new Date(voterData.votedAt)
    : new Date();

  useEffect(() => {
    // Set vote token from state or props
    if (location.state?.voteToken) {
      setVoteToken(location.state.voteToken);
    } else if (voterData.voteToken) {
      setVoteToken(voterData.voteToken);
    }
  }, [location.state, voterData]);

  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow pop-ups to print your receipt");
      return;
    }

    // Format vote timestamp
    const formatDate = (date: Date) => {
      return date
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
        .replace(/\//g, "-");
    };

    const formatTime = (date: Date) => {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    };

    // HTML for the print receipt
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Vote Confirmation Receipt</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            max-width: 80mm;
            margin: 0 auto;
          }
          .receipt {
            border: 1px solid #ccc;
            padding: 15px;
          }
          .receipt-header {
            text-align: center;
            margin-bottom: 15px;
            border-bottom: 1px dashed #ccc;
            padding-bottom: 10px;
          }
          .school-info {
            font-weight: bold;
            margin-bottom: 5px;
          }
          h1 {
            font-size: 14px;
            margin: 5px 0;
          }
          .receipt-body {
            font-size: 12px;
          }
          .receipt-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
          }
          .receipt-label {
            font-weight: bold;
          }
          .token {
            font-family: monospace;
            background-color: #f0f0f0;
            padding: 2px 5px;
            border-radius: 3px;
          }
          .footer {
            margin-top: 15px;
            font-size: 10px;
            text-align: center;
            border-top: 1px dashed #ccc;
            padding-top: 10px;
          }
          @media print {
            body {
              margin: 0;
              padding: 0;
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
            <div class="school-info">${
              settings.schoolName || "Peki Senior High School"
            }</div>
            <h1>VOTE CONFIRMATION RECEIPT</h1>
            <p>${settings.electionTitle || "Student Council Election 2025"}</p>
          </div>
          
          <div class="receipt-body">
            <div class="receipt-row">
              <span class="receipt-label">Voter:</span>
              <span class="receipt-value">${voterData.name || "Anonymous"} (${
      voterData.voterId || "Unknown"
    })</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Date Voted:</span>
              <span class="receipt-value">${formatDate(voteTimestamp)}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Time Voted:</span>
              <span class="receipt-value">${formatTime(voteTimestamp)}</span>
            </div>
            <div class="receipt-row">
              <span class="receipt-label">Vote Token:</span>
              <span class="receipt-value token">${voteToken}</span>
            </div>
          </div>
          
          <div class="footer">
            <p>This receipt confirms your vote was recorded successfully.</p>
            <p>Keep this receipt for your records.</p>
          </div>
        </div>
        
        <div class="no-print" style="text-align: center; margin-top: 20px;">
          <button onclick="window.print()">Print</button>
          <button onclick="window.close()">Close</button>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();

    // Add slight delay before printing to ensure content is loaded
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Replace jsPDF implementation with browser-based PDF export
  const handleDownloadPDF = () => {
    const pdfWindow = window.open("", "_blank");
    if (!pdfWindow) {
      alert("Please allow pop-ups to download your PDF receipt");
      return;
    }

    const styles = `
      <style>
        body { 
          font-family: 'Segoe UI', Arial, sans-serif; 
          margin: 0; 
          padding: 30px;
          color: #333;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          padding: 40px;
        }
        h1 { 
          text-align: center; 
          color: #4338ca; 
          margin-bottom: 20px; 
          font-size: 24px;
          border-bottom: 2px solid #4338ca;
          padding-bottom: 10px;
        }
        .header-info {
          text-align: center;
          margin-bottom: 30px;
        }
        .receipt-section {
          margin-bottom: 30px;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin-bottom: 30px; 
        }
        th { 
          background-color: #f3f4f6; 
          color: #374151; 
          font-weight: bold; 
          text-align: left; 
          padding: 12px; 
          border-bottom: 1px solid #e5e7eb;
        }
        td { 
          padding: 12px; 
          border-bottom: 1px solid #e5e7eb; 
        }
        .token-container {
          background-color: #f3f4f6;
          border-radius: 6px;
          padding: 15px;
          margin: 20px 0;
          text-align: center;
        }
        .token {
          font-family: monospace;
          font-size: 18px;
          color: #4338ca;
          font-weight: bold;
        }
        .footer { 
          margin-top: 30px; 
          text-align: center; 
          font-size: 12px; 
          color: #6b7280; 
          border-top: 1px solid #e5e7eb;
          padding-top: 20px;
        }
        @media print {
          .no-print {
            display: none;
          }
          body {
            padding: 0;
          }
          .container {
            border: none;
            box-shadow: none;
          }
        }
      </style>
    `;

    // Format date and time for receipt
    const formatDate = (date: Date) => {
      return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    };

    const formatTime = (date: Date) => {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    };

    pdfWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Vote Confirmation PDF - ${
            voterData.voterId || "Receipt"
          }</title>
          ${styles}
        </head>
        <body>
          <div class="container">
            <h1>VOTE CONFIRMATION RECEIPT</h1>
            
            <div class="header-info">
              <p><strong>${
                settings.schoolName || "Peki Senior High School"
              }</strong></p>
              <p>${
                settings.electionTitle || "Student Council Election 2025"
              }</p>
            </div>
            
            <div class="receipt-section">
              <table>
                <tr>
                  <th>Voter Information</th>
                  <th>Details</th>
                </tr>
                <tr>
                  <td>Voter Name</td>
                  <td>${voterData.name || "Anonymous"}</td>
                </tr>
                <tr>
                  <td>Voter ID</td>
                  <td>${voterData.voterId || "Unknown"}</td>
                </tr>
                <tr>
                  <td>Date Voted</td>
                  <td>${formatDate(voteTimestamp)}</td>
                </tr>
                <tr>
                  <td>Time Voted</td>
                  <td>${formatTime(voteTimestamp)}</td>
                </tr>
              </table>
            </div>
            
            <div class="token-container">
              <p>Your Vote Token:</p>
              <div class="token">${voteToken || "TOKEN_NOT_AVAILABLE"}</div>
            </div>
            
            <div class="footer">
              <p>This receipt confirms your vote was recorded successfully.</p>
              <p>Keep this receipt for your records.</p>
              <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
          </div>
          
          <div class="no-print" style="text-align: center; margin-top: 20px;">
            <p>To save as PDF, use the Print option (Ctrl+P or Command+P) and select "Save as PDF".</p>
            <button onclick="window.print()" style="padding: 8px 16px; background: #4338ca; color: white; border: none; border-radius: 4px; cursor: pointer; margin-right: 10px;">Save as PDF</button>
            <button onclick="window.close()" style="padding: 8px 16px; background: #e5e7eb; color: #374151; border: none; border-radius: 4px; cursor: pointer;">Close</button>
          </div>
        </body>
      </html>
    `);

    pdfWindow.document.close();

    // Wait for content to load before prompting to print
    setTimeout(() => {
      pdfWindow.print();
    }, 500);
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-lg ${
        isPopup ? "p-6" : "p-8 max-w-md mx-auto my-8"
      }`}
    >
      <div className="text-center">
        <div className="mx-auto h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
          <Check className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Vote Confirmation
        </h2>
      </div>

      <div className="space-y-4 mt-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500">School:</p>
              <p className="text-base font-semibold text-gray-900">
                {settings.schoolName || "Peki Senior High School"}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Election:</p>
              <p className="text-base font-semibold text-gray-900">
                {settings.electionTitle || "Student Council Election 2025"}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Voter:</p>
              <p className="text-base font-semibold text-gray-900">
                {voterData.name || "Anonymous"} (
                {voterData.voterId || "Unknown"})
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Date Voted:</p>
              <p className="text-base font-semibold text-gray-900">
                {voteTimestamp
                  .toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })
                  .replace(/\//g, "-")}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Time Voted:</p>
              <p className="text-base font-semibold text-gray-900">
                {voteTimestamp.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">Vote Token:</p>
              <p className="text-base font-mono bg-gray-100 p-1 rounded text-indigo-700">
                {voteToken || "TOKEN_NOT_AVAILABLE"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <button
          onClick={handlePrint}
          className="w-full flex items-center justify-center px-4 py-2 border border-indigo-300 shadow-sm text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
        >
          <Printer className="h-4 w-4 mr-2" />
          Print Receipt
        </button>

        {/* PDF download button */}
        <button
          onClick={handleDownloadPDF}
          className="w-full flex items-center justify-center px-4 py-2 border border-indigo-300 shadow-sm text-sm font-medium rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
        >
          <FileText className="h-4 w-4 mr-2" />
          Download as PDF
        </button>

        {!isPopup && (
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            Return to Home
          </button>
        )}
      </div>
    </div>
  );
};

export default VoteSuccess;
