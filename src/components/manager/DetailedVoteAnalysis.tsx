import React, { useState, useEffect } from "react";
import {
  Search,
  FileSpreadsheet,
  Printer,
  Users,
  Calendar,
  Clock,
  Filter,
  X,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useUser } from "../../context/UserContext";

// Define interfaces for our data
interface Position {
  _id: string;
  title: string;
  priority: number;
}

interface VoterData {
  id: string;
  name: string;
  voterId: string;
  class: string;
  house?: string;
  year?: string;
  votedAt: Date;
  votedFor: Record<string, string>;
}

const DetailedVoteAnalysis: React.FC = () => {
  const { hasPermission } = useUser();
  const [voterData, setVoterData] = useState<VoterData[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({
    from: new Date(new Date().setDate(new Date().getDate() - 7))
      .toISOString()
      .split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterPosition, setFilterPosition] = useState("");
  const [filterCandidate, setFilterCandidate] = useState("");

  // Check user permissions
  const canViewAnalytics = hasPermission("analytics", "view");
  const canExportAnalytics = hasPermission("analytics", "export");

  // Create a mapping from position IDs to position names
  const [positionMap, setPositionMap] = useState<Record<string, string>>({});
  const [candidateMap, setCandidateMap] = useState<Record<string, string>>({});

  // Fetch voter data
  const fetchVoterData = async () => {
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

      // Fetch all candidates first to ensure we have their data
      const candidatesResponse = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/candidates`,
        { headers }
      );

      if (!candidatesResponse.ok) {
        throw new Error(
          `Failed to fetch candidates: ${candidatesResponse.status}`
        );
      }

      const candidates = await candidatesResponse.json();
      const candidateMap: Record<string, string> = {};

      // Create mappings for candidates with proper ID handling
      candidates.forEach((candidate: { _id: string; name: string }) => {
        // Store the ID as-is
        candidateMap[candidate._id] = candidate.name;

        // Also add a cleaned version without quotes
        const cleanId = candidate._id.toString().replace(/"/g, "");
        candidateMap[cleanId] = candidate.name;

        // Also map by name for direct lookups (helps with already resolved names)
        candidateMap[candidate.name] = candidate.name;
      });

      setCandidateMap(candidateMap);
      console.log(
        `Created candidate map with ${
          Object.keys(candidateMap).length
        } candidate mappings`
      );

      // Build the query string for filters
      const params = new URLSearchParams({
        from: dateRange.from,
        to: dateRange.to,
      });

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/elections/detailed-vote-analysis?${params.toString()}`,
        { headers }
      );

      if (!response.ok) {
        if (response.status === 404) {
          // Handle specifically the case where the endpoint is not found or no data
          console.warn(
            "Detailed vote analysis endpoint not found or no data available."
          );
          setVoterData([]);
          return;
        }
        throw new Error(
          `Failed to fetch detailed vote data: ${response.status}`
        );
      }

      const data = await response.json();

      // Log first few vote records to debug position mapping
      if (data.length > 0) {
        console.log("Sample vote data:", data.slice(0, 2));

        // Check votedFor structure in detail
        const sampleVotedFor = data[0].votedFor;
        console.log("Sample votedFor structure:", sampleVotedFor);

        if (sampleVotedFor) {
          const keys = Object.keys(sampleVotedFor);
          console.log("Vote position IDs:", keys);

          // Check for undefined or problematic keys
          keys.forEach((key) => {
            if (!key || key === "undefined" || key === "null") {
              console.warn(`Problematic key found in votedFor: '${key}'`);
            }
          });
        }
      }

      // Transform the data to match our interface
      const transformedData: VoterData[] = data.map((item: any) => {
        // Ensure votedFor is an object and handle any problematic keys
        const cleanedVotedFor: Record<string, string> = {};
        if (item.votedFor && typeof item.votedFor === "object") {
          Object.entries(item.votedFor).forEach(([key, value]) => {
            // Instead of skipping undefined keys, rename them to a special key
            if (key === "undefined" || key === "null") {
              // Use a special key to mark these votes
              cleanedVotedFor["__unknown__"] = value as string;
              console.warn(
                `Converting invalid position key: '${key}' to '__unknown__' for voter: ${item.name}`
              );
            } else {
              cleanedVotedFor[key] = value as string;
            }
          });
        }

        return {
          id: item.id,
          name: item.name,
          voterId: item.voterId,
          class: item.class || "Unknown",
          house: item.house || "Unknown",
          year: item.year || "Unknown",
          votedAt: new Date(item.votedAt),
          votedFor: cleanedVotedFor,
        };
      });

      setVoterData(transformedData);

      // Check for position ID issues after setting data
      setTimeout(() => {
        if (transformedData.length > 0) {
          const missingPositions = new Set();
          transformedData.forEach((voter) => {
            Object.keys(voter.votedFor).forEach((posId) => {
              if (!positionMap[posId]) {
                missingPositions.add(posId);
              }
            });
          });

          if (missingPositions.size > 0) {
            console.warn(
              "Missing position mappings for IDs:",
              Array.from(missingPositions)
            );
          }
        }
      }, 1000);

      // Log missing candidate mappings
      const missingCandidateIds = new Set<string>();
      data.forEach((voter: any) => {
        (Object.values(voter.votedFor) as string[]).forEach((candidateId) => {
          if (!candidateMap[candidateId]) {
            missingCandidateIds.add(candidateId);
          }
        });
      });

      if (missingCandidateIds.size > 0) {
        console.warn(
          "Missing candidate mappings for IDs:",
          Array.from(missingCandidateIds)
        );
      }

      setVoterData(data);
    } catch (error: any) {
      console.error("Error fetching voting data:", error);
      setError(error.message || "Failed to load voting data");
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
      console.log("Fetched positions:", data.length);

      // Build a bidirectional map that works with both IDs and names
      const posMap: Record<string, string> = {};

      data.forEach((position: Position) => {
        // ID -> Name mapping
        if (position._id) {
          posMap[position._id] = position.title;

          // Also add without quotes if it might be stored that way
          if (typeof position._id === "string") {
            const cleanId = position._id.replace(/"/g, "");
            posMap[cleanId] = position.title;
          }
        }

        // Name -> Name mapping (for direct lookups)
        if (position.title) {
          posMap[position.title] = position.title;
        }
      });

      console.log(
        "Position map created with keys:",
        Object.keys(posMap).slice(0, 5)
      );

      setPositionMap(posMap);
      setPositions(data);
    } catch (error: any) {
      console.error("Error fetching positions:", error);
    }
  };

  // Load data on component mount and when filters change
  useEffect(() => {
    if (canViewAnalytics) {
      fetchPositions();
      fetchVoterData();
    }
  }, [canViewAnalytics, dateRange]);

  // Format date time with error handling
  const formatDateTime = (date: Date | string): string => {
    try {
      const parsedDate = date instanceof Date ? date : new Date(date);
      if (isNaN(parsedDate.getTime())) {
        throw new Error("Invalid date");
      }
      return new Intl.DateTimeFormat("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      }).format(parsedDate);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date/Time";
    }
  };

  // Get unique values for filters
  const getUniqueClasses = () => {
    return Array.from(new Set(voterData.map((voter) => voter.class)));
  };

  const getUniquePositions = () => {
    // Change to use transformedVoterData instead of voterData to match the filter comparison
    return Array.from(
      new Set(
        transformedVoterData.flatMap((voter) => Object.keys(voter.votedFor))
      )
    );
  };

  const getUniqueCandidates = () => {
    return Array.from(
      new Set(voterData.flatMap((voter) => Object.values(voter.votedFor)))
    );
  };

  // Helper function to get position name from ID
  const getPositionName = (positionKey: string | undefined): string => {
    if (!positionKey) return "Unknown Position";
    return positionMap[positionKey] || `Position ID: ${positionKey}`;
  };

  // Helper function to get candidate name from ID - Modified to handle the "Unknown Candidate" case better
  const getCandidateName = (candidateKey: string | undefined): string => {
    if (!candidateKey) return "Unknown";

    // Special handling for abstentions
    if (candidateKey === "Abstained" || candidateKey === "abstained") {
      return "Abstained";
    }

    // If it's already a name like "Charlie Brown" rather than an ID, return it directly
    if (candidateKey.includes(" ") && candidateKey !== "Unknown Candidate") {
      return candidateKey;
    }

    // Check if it's already "Unknown Candidate" and simplify it
    if (candidateKey === "Unknown Candidate") {
      return "Unknown";
    }

    // Try to look up in candidate map
    return candidateMap[candidateKey] || "Unknown";
  };

  // Transform voter data to handle missing references
  const transformedVoterData = voterData.map((voter) => ({
    ...voter,
    votedFor: Object.entries(voter.votedFor).reduce(
      (acc, [positionId, candidateId]) => {
        acc[getPositionName(positionId)] = getCandidateName(candidateId);
        return acc;
      },
      {} as Record<string, string>
    ),
  }));

  // Update the mapping logic to include candidate names
  useEffect(() => {
    const fetchCandidates = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        };

        const response = await fetch(
          `${
            import.meta.env.VITE_API_URL || "http://localhost:5000"
          }/api/candidates`,
          { headers }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch candidates: ${response.status}`);
        }

        const data = await response.json();
        const candidateMap: Record<string, string> = {};

        data.forEach((candidate: { _id: string; name: string }) => {
          // Store the ID as-is
          candidateMap[candidate._id] = candidate.name;

          // Also add a cleaned version without quotes
          const cleanId = candidate._id.toString().replace(/"/g, "");
          candidateMap[cleanId] = candidate.name;

          // Also map by name for direct lookups
          candidateMap[candidate.name] = candidate.name;
        });

        // Add special case for abstentions
        candidateMap["Abstained"] = "Abstained";
        candidateMap["abstained"] = "Abstained";

        setCandidateMap(candidateMap);
        console.log("Updated candidate map with both IDs and names as keys");
      } catch (error) {
        console.error("Error fetching candidates:", error);
      }
    };

    fetchCandidates();
  }, []);

  // Filter voter data
  const filteredVoters = transformedVoterData.filter((voter) => {
    const matchesSearch =
      voter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voter.voterId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesClass = !filterClass || voter.class === filterClass;

    const matchesPosition =
      !filterPosition || Object.keys(voter.votedFor).includes(filterPosition);

    const matchesCandidate =
      !filterCandidate ||
      Object.values(voter.votedFor).includes(filterCandidate);

    return matchesSearch && matchesClass && matchesPosition && matchesCandidate;
  });

  // Handle print
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
        .voter-card {
          background: #fff;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          margin-bottom: 20px;
          padding: 16px;
        }
        .voter-info {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
        }
        .voter-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: #e5e7eb;
          margin-right: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .voter-details {
          flex-grow: 1;
        }
        .voter-name {
          font-weight: 600;
          color: #111827;
        }
        .voter-id {
          color: #6b7280;
          font-size: 14px;
        }
        .votes-cast {
          margin-top: 8px;
          padding-left: 52px;
        }
        .vote-item {
          margin-bottom: 4px;
          color: #374151;
        }
        .vote-position {
          color: #6b7280;
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
          <title>Detailed Vote Analysis</title>
          ${styles}
        </head>
        <body>
          <h1>Student Council Election ${new Date().getFullYear()}</h1>
          <h1>Detailed Vote Analysis</h1>
          
          ${filteredVoters
            .map(
              (voter) => `
            <div class="voter-card">
              <div class="voter-info">
                <div class="voter-avatar">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6b7280">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                    <circle cx="12" cy="7" r="4"></circle>
                  </svg>
                </div>
                <div class="voter-details">
                  <div class="voter-name">${voter.name}</div>
                  <div class="voter-id">${voter.voterId}</div>
                </div>
                <div class="voter-class">${voter.class}</div>
                <div class="voter-time">${formatDateTime(voter.votedAt)}</div>
              </div>
              <div class="votes-cast">
                ${Object.entries(voter.votedFor)
                  .map(
                    ([positionId, candidate], index) => `
                  <div class="vote-item">
                    <span class="vote-position">${getPositionName(
                      positionId
                    )}:</span> ${candidate}
                  </div>
                `
                  )
                  .join("")}
              </div>
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

  // Handle export to Excel/CSV
  const handleExportExcel = () => {
    let csvContent = "Voter ID,Name,Class,Date/Time,Position,Voted For\n";

    filteredVoters.forEach((voter) => {
      Object.entries(voter.votedFor).forEach(([positionId, candidate]) => {
        csvContent += `${voter.voterId},"${voter.name}","${
          voter.class
        }","${formatDateTime(voter.votedAt)}","${getPositionName(
          positionId
        )}","${candidate}"\n`;
      });
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `detailed_vote_analysis_${new Date().toISOString().split("T")[0]}.csv`
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
          You don't have permission to view detailed voting data.
        </p>
      </div>
    );
  }

  // Render loading state
  if (isLoading && voterData.length === 0) {
    return (
      <div className="flex justify-center py-12">
        <div className="flex flex-col items-center">
          <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mb-2" />
          <p className="text-gray-500">Loading voter data...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error && !isLoading && voterData.length === 0) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-bold">Detailed Vote Analysis</h2>
        <p className="text-indigo-100 text-sm">
          Analyze individual voting patterns and results
        </p>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-md space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by name or voter ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Date range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>

        {/* Filter selects */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            className="w-full p-2 border border-gray-300 rounded-lg"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            <option value="">All Classes</option>
            {getUniqueClasses().map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>

          <select
            className="w-full p-2 border border-gray-300 rounded-lg"
            value={filterPosition}
            onChange={(e) => setFilterPosition(e.target.value)}
          >
            <option value="">All Positions</option>
            {getUniquePositions().map((pos) => (
              <option key={pos} value={pos}>
                {pos}
              </option>
            ))}
          </select>

          <select
            className="w-full p-2 border border-gray-300 rounded-lg"
            value={filterCandidate}
            onChange={(e) => setFilterCandidate(e.target.value)}
          >
            <option value="">All Candidates</option>
            {getUniqueCandidates().map((candidate) => (
              <option key={candidate} value={candidate}>
                {candidate}
              </option>
            ))}
          </select>
        </div>

        {/* Action buttons */}
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {filteredVoters.length}{" "}
            {filteredVoters.length === 1 ? "voter" : "voters"} found
          </div>
          <div className="flex space-x-2">
            {canExportAnalytics && (
              <>
                <button
                  onClick={handleExportExcel}
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Voter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date/Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Votes Cast
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVoters.map((voter) => (
                <tr key={voter.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-indigo-100 rounded-full">
                        <Users className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {voter.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {voter.voterId}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{voter.class}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center text-sm text-gray-900">
                      <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                      {formatDateTime(voter.votedAt)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      {Object.entries(voter.votedFor).map(
                        ([positionId, candidate], index) => (
                          <div
                            key={positionId || `unknown-${index}`}
                            className="text-sm"
                          >
                            <span className="text-gray-500">
                              {getPositionName(positionId)}:
                            </span>{" "}
                            <span className="text-gray-900 font-medium">
                              {getCandidateName(candidate)}
                            </span>
                          </div>
                        )
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredVoters.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No results found matching your criteria
          </div>
        )}
      </div>
    </div>
  );
};

export default DetailedVoteAnalysis;
