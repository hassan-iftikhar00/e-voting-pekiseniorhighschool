import React, { useState, useRef, useEffect } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  X,
  Check,
  AlertCircle,
  Download,
  RefreshCw,
  FileSpreadsheet,
  Printer,
  Columns,
  Info,
  Users,
  ArrowUp,
  ArrowDown,
  KeyRound,
  Upload,
  FileText,
} from "lucide-react";
import { useUser } from "../../context/UserContext";

// Update the Voter interface to match the backend model
interface Voter {
  _id: string;
  voterId: string;
  name: string;
  gender: string;
  class: string;
  year: string; // Added to match server requirement
  house: string; // Added to match server requirement
  hasVoted: boolean;
  votedAt: string | null;
}

// Add interfaces for House, Year, and Class
interface House {
  _id: string;
  name: string;
  description: string;
  color: string;
  active: boolean;
}

interface Year {
  _id: string;
  name: string;
  description: string;
  active: boolean;
}

interface Class {
  _id: string;
  name: string;
  description: string;
  active: boolean;
}

const VotersManager: React.FC = () => {
  const { hasPermission } = useUser();
  const [voters, setVoters] = useState<Voter[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterVoted, setFilterVoted] = useState<boolean | null>(null);
  const [filterGender, setFilterGender] = useState<string>("");
  const [filterClass, setFilterClass] = useState<string>("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingVoter, setEditingVoter] = useState<Voter | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [sortField, setSortField] = useState<"name" | "class">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);

  // Add state for dynamic data
  const [availableClasses, setAvailableClasses] = useState<Class[]>([]);
  const [availableHouses, setAvailableHouses] = useState<House[]>([]);
  const [availableYears, setAvailableYears] = useState<Year[]>([]);

  // Visible columns state
  const [visibleColumns, setVisibleColumns] = useState({
    voterId: true,
    name: true,
    gender: true,
    class: true,
    status: true,
    actions: true,
  });

  // Form state - updated to match API structure
  const [newVoter, setNewVoter] = useState({
    voterId: "",
    name: "",
    gender: "",
    class: "",
    year: "",
    house: "",
    hasVoted: false,
    votedAt: null,
  });

  // Import functionality state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    total: number;
    success: number;
    failed: number;
    errors: string[];
  }>({
    total: 0,
    success: 0,
    failed: 0,
    errors: [],
  });
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Close column selector when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        columnSelectorRef.current &&
        !columnSelectorRef.current.contains(event.target as Node)
      ) {
        setShowColumnSelector(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch classes from API
  const fetchClasses = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/classes`
      );
      if (!response.ok)
        throw new Error(`Failed to fetch classes: ${response.status}`);
      const data = await response.json();
      setAvailableClasses(data);
    } catch (error) {
      console.error("Error fetching classes:", error);
    }
  };

  // Fetch houses from API
  const fetchHouses = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/houses`
      );
      if (!response.ok)
        throw new Error(`Failed to fetch houses: ${response.status}`);
      const data = await response.json();
      setAvailableHouses(data);
    } catch (error) {
      console.error("Error fetching houses:", error);
    }
  };

  // Fetch years from API
  const fetchYears = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/years`
      );
      if (!response.ok)
        throw new Error(`Failed to fetch years: ${response.status}`);
      const data = await response.json();
      setAvailableYears(data);
    } catch (error) {
      console.error("Error fetching years:", error);
    }
  };

  // Fetch voters from the API
  const fetchVoters = async () => {
    try {
      setIsLoading(true);

      // Get authentication token
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/voters`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch voters: ${response.status}`);
      }

      const data = await response.json();
      setVoters(data);
    } catch (error) {
      console.error("Error fetching voters:", error);
      setNotification({
        type: "error",
        message: "Failed to load voters",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Load all data on component mount
  useEffect(() => {
    fetchVoters();
    fetchClasses();
    fetchHouses();
    fetchYears();
  }, []);

  // Filter and sort voters
  const filteredVoters = voters
    .filter(
      (voter) =>
        (voter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          voter.voterId.toLowerCase().includes(searchTerm.toLowerCase())) &&
        (filterVoted === null || voter.hasVoted === filterVoted) &&
        (filterGender === "" || voter.gender === filterGender) &&
        (filterClass === "" || voter.class === filterClass)
    )
    .sort((a, b) => {
      if (sortField === "name") {
        return sortDirection === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortField === "class") {
        return sortDirection === "asc"
          ? a.class.localeCompare(b.class)
          : b.class.localeCompare(a.class);
      }
      return 0;
    });

  // Get unique classes and genders for filters
  const uniqueClasses = Array.from(new Set(voters.map((v) => v.class))).sort();
  const uniqueGenders = Array.from(new Set(voters.map((v) => v.gender))).sort();

  const handleSort = (field: "name" | "class") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Add voter with API integration
  const handleAddVoter = async () => {
    // Trim the input values
    const trimmedName = newVoter.name.trim();
    const trimmedGender = newVoter.gender.trim();
    const trimmedClass = newVoter.class.trim();
    const trimmedYear = newVoter.year.trim();
    const trimmedHouse = newVoter.house.trim();

    console.log("Submitting voter with:", {
      name: trimmedName,
      gender: trimmedGender,
      class: trimmedClass,
      year: trimmedYear,
      house: trimmedHouse,
    });

    // Check if any required field is empty
    if (!trimmedName) {
      setNotification({
        type: "error",
        message: "Full Name is required",
      });
      return;
    }

    if (!trimmedGender) {
      setNotification({
        type: "error",
        message: "Gender is required",
      });
      return;
    }

    if (!trimmedClass) {
      setNotification({
        type: "error",
        message: "Class is required",
      });
      return;
    }

    if (!trimmedYear) {
      setNotification({
        type: "error",
        message: "Year is required",
      });
      return;
    }

    if (!trimmedHouse) {
      setNotification({
        type: "error",
        message: "House is required",
      });
      return;
    }

    try {
      setIsLoading(true);

      // Get authentication token
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      // Generate a temporary voterId (server will create the real one)
      const tempVoterId = `TEMP${Math.floor(Math.random() * 10000)}`;

      // Include all required fields
      const voterToAdd = {
        name: trimmedName,
        gender: trimmedGender,
        class: trimmedClass,
        year: trimmedYear,
        house: trimmedHouse,
        voterId: tempVoterId, // Provide a temporary ID
        hasVoted: false,
        votedAt: null,
      };

      console.log("Sending data to server:", voterToAdd);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/voters`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(voterToAdd),
        }
      );

      const responseData = await response.json();
      console.log("Server response:", responseData);

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to add voter");
      }

      setVoters([...voters, responseData]);

      setNewVoter({
        voterId: "",
        name: "",
        gender: "",
        class: "",
        year: "",
        house: "",
        hasVoted: false,
        votedAt: null,
      });

      setShowAddForm(false);
      setNotification({
        type: "success",
        message: "Voter added successfully",
      });
    } catch (error: any) {
      console.error("Error adding voter:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to add voter",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Update voter with API integration
  const handleUpdateVoter = async () => {
    if (!editingVoter) return;

    // Trim the input values
    const trimmedName = editingVoter.name.trim();
    const trimmedGender = (editingVoter.gender || "Male").trim(); // Provide default if undefined
    const trimmedClass = editingVoter.class.trim();
    const trimmedYear = editingVoter.year?.trim() || "";
    const trimmedHouse = editingVoter.house?.trim() || "";

    console.log("Updating voter with:", {
      id: editingVoter._id,
      name: trimmedName,
      gender: trimmedGender,
      class: trimmedClass,
      year: trimmedYear,
      house: trimmedHouse,
    });

    // Check all fields
    if (
      !trimmedName ||
      !trimmedGender ||
      !trimmedClass ||
      !trimmedYear ||
      !trimmedHouse
    ) {
      setNotification({
        type: "error",
        message: "All fields are required",
      });
      return;
    }

    try {
      setIsLoading(true);

      // Get authentication token
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      const updatedVoter = {
        ...editingVoter,
        name: trimmedName,
        gender: trimmedGender,
        class: trimmedClass,
        year: trimmedYear,
        house: trimmedHouse,
      };

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/voters/${editingVoter._id}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(updatedVoter),
        }
      );

      const responseData = await response.json();
      console.log("Server response:", responseData);

      if (!response.ok) {
        throw new Error(responseData.message || "Failed to update voter");
      }

      setVoters(
        voters.map((voter) =>
          voter._id === responseData._id ? responseData : voter
        )
      );

      setEditingVoter(null);
      setNotification({
        type: "success",
        message: "Voter updated successfully",
      });
    } catch (error: any) {
      console.error("Error updating voter:", error);
      setNotification({
        type: "error",
        message: error.message || "Failed to update voter",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Delete voter with API integration
  const handleDeleteVoter = async (id: string) => {
    const voter = voters.find((v) => v._id === id);
    if (voter?.hasVoted) {
      setNotification({
        type: "error",
        message: "Cannot delete a voter who has already voted",
      });
      return;
    }

    if (!window.confirm("Are you sure you want to delete this voter?")) {
      return;
    }

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
        }/api/voters/${id}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete voter: ${response.status}`);
      }

      setVoters(voters.filter((voter) => voter._id !== id));
      setNotification({
        type: "success",
        message: "Voter deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting voter:", error);
      setNotification({
        type: "error",
        message: "Failed to delete voter",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Regenerate voter ID with API integration
  const handleRegenerateVoterId = async (id: string) => {
    const voter = voters.find((v) => v._id === id);
    if (voter?.hasVoted) {
      setNotification({
        type: "error",
        message: "Cannot regenerate Voter ID after voting",
      });
      return;
    }

    if (!window.confirm("Are you sure you want to regenerate this Voter ID?")) {
      return;
    }

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
        }/api/voters/${id}/regenerate-id`,
        {
          method: "POST",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to regenerate voter ID: ${response.status}`);
      }

      const updatedVoter = await response.json();

      setVoters(
        voters.map((voter) =>
          voter._id === updatedVoter._id ? updatedVoter : voter
        )
      );

      setNotification({
        type: "success",
        message: "Voter ID regenerated successfully",
      });
    } catch (error) {
      console.error("Error regenerating voter ID:", error);
      setNotification({
        type: "error",
        message: "Failed to regenerate voter ID",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Format date and time
  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "-";

    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(date);
  };

  // Fix the handleEditVoter function to provide a default gender if it's missing
  const handleEditVoter = (voter: Voter) => {
    console.log("Editing voter:", voter);
    // Ensure gender exists - database might not have this field yet
    if (!voter.gender) {
      voter.gender = "Male"; // Default gender if missing
    }
    console.log("Gender value after fix:", voter.gender);
    setEditingVoter(voter);
  };

  // Open file picker dialog
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        // Reset all import-related state before starting a new import
        setImportFile(file);
        setImportProgress(0);
        setImportResults({
          total: 0,
          success: 0,
          failed: 0,
          errors: [],
        });
        setIsImporting(false);
        setShowImportModal(true);
      } else {
        setNotification({
          type: "error",
          message: "Please select a CSV file.",
        });
      }
    }
  };

  // Parse CSV file
  const parseCSV = (text: string): any[] => {
    try {
      // Remove any BOM characters or invisible Unicode characters
      text = text.replace(/^\uFEFF/, "");

      // Split into lines and remove empty lines
      const lines = text
        .split(/\r?\n/)
        .filter((line) => line.trim().length > 0);

      if (lines.length === 0) {
        throw new Error("CSV file is empty");
      }

      console.log("Original CSV lines:", lines);
      let headerLine = lines[0];

      // Detect the separator by analyzing the first line
      let separator = ","; // Default to comma now instead of tab
      if (headerLine.includes("\t")) {
        separator = "\t";
      } else if (headerLine.includes(";")) {
        separator = ";";
      }

      console.log(`Using separator: "${separator}"`);

      // Clean potential line numbers from the start of each line
      const cleanLines = lines.map((line) => {
        // Remove line numbers that might appear at the start (e.g., "1 Name")
        return line.replace(/^\d+\s+/, "");
      });

      console.log("Cleaned lines:", cleanLines);
      headerLine = cleanLines[0];

      // Process headers - trim and normalize
      const headers = headerLine
        .split(separator)
        .map((h) => h.trim().toLowerCase()) // Normalize all headers to lowercase
        .filter((h) => h.length > 0);

      console.log("Detected headers:", headers);

      // Check for required columns (case-insensitive)
      const requiredColumnsLower = ["name", "gender", "class", "year", "house"];
      const missingColumns = requiredColumnsLower.filter(
        (col) => !headers.includes(col)
      );

      if (missingColumns.length > 0) {
        console.error("Missing required columns:", missingColumns);
        console.error("Available headers:", headers);
        throw new Error(
          `Missing required columns: ${missingColumns.join(", ")}`
        );
      }

      // Process data rows (skip header)
      const data = [];
      for (let i = 1; i < cleanLines.length; i++) {
        const values = cleanLines[i].split(separator).map((v) => v.trim());

        // Make sure we have enough values
        if (values.length < headers.length) {
          console.warn(
            `Row ${i} has fewer values than headers, padding with empty strings`
          );
          while (values.length < headers.length) {
            values.push("");
          }
        }

        // Create an object with header keys and row values
        const rowData: Record<string, string> = {};
        headers.forEach((header, index) => {
          if (index < values.length) {
            rowData[header] = values[index];
          } else {
            rowData[header] = "";
          }
        });

        console.log(`Row ${i} data:`, rowData);
        data.push(rowData);
      }

      console.log(`Parsed ${data.length} rows of data`);
      return data;
    } catch (error) {
      console.error("CSV parsing error:", error);
      throw error;
    }
  };

  // Start import process
  const handleStartImport = async () => {
    if (!importFile) return;

    setIsImporting(true);
    setImportProgress(0);
    setImportResults({
      total: 0,
      success: 0,
      failed: 0,
      errors: [],
    });

    try {
      // Read file
      const text = await importFile.text();
      console.log("Raw CSV content:", text.substring(0, 500));

      // Parse CSV
      const data = parseCSV(text);

      if (data.length === 0) {
        throw new Error("No valid data found in the CSV file");
      }

      setImportProgress(25);
      setImportResults((prev) => ({ ...prev, total: data.length }));

      // Log the first row to verify structure
      console.log("Sample data row:", data[0]);
      console.log("Complete parsed data:", data);

      // Get token
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("Authentication token not found");
      }

      setImportProgress(50);

      // Prepare request payload
      const payload = { voters: data };
      console.log(
        "Sending payload to server:",
        JSON.stringify(payload, null, 2)
      );

      // Try multiple ports if needed
      const primaryPort = 5000;
      const fallbackPort = 50001;
      let apiBaseUrl = `http://localhost:${primaryPort}`;

      // First try the default API URL
      const defaultUrl = import.meta.env.VITE_API_URL || apiBaseUrl;
      console.log("Trying primary API URL:", defaultUrl);

      try {
        // Try to connect to the server on the primary URL
        const serverInfoResponse = await fetch(
          `${defaultUrl}/api/server-info`,
          {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          }
        );

        if (!serverInfoResponse.ok) {
          throw new Error("Primary server not responding");
        }

        console.log("Successfully connected to primary URL");
      } catch (e) {
        // If primary URL fails, try the fallback port
        console.log("Primary URL failed, trying fallback port:", fallbackPort);
        apiBaseUrl = `http://localhost:${fallbackPort}`;

        try {
          const alternateResponse = await fetch(
            `${apiBaseUrl}/api/server-info`
          );
          if (!alternateResponse.ok) {
            throw new Error("Alternate server not responding");
          }
          console.log(
            "Successfully connected to alternate port:",
            fallbackPort
          );
        } catch (altError) {
          console.error("Failed to connect to either port");
        }
      }

      console.log("Using API URL for import:", apiBaseUrl);

      // Make API request with explicit port
      try {
        const response = await fetch(`${apiBaseUrl}/api/voters/bulk`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        setImportProgress(75);

        console.log("Server response status:", response.status);

        const responseText = await response.text();
        console.log("Raw server response:", responseText);

        // Try to parse the response
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          console.error("Failed to parse server response as JSON:", e);
          throw new Error(`Server returned invalid JSON: ${responseText}`);
        }

        if (!response.ok) {
          throw new Error(result.message || "Failed to import voters");
        }

        // Update results
        setImportResults({
          total: data.length,
          success: result.success || 0,
          failed: result.failed || 0,
          errors: result.errors || [],
        });

        // Only show notification for successful imports
        if (result.success > 0) {
          setNotification({
            type: "success",
            message: `Successfully imported ${result.success} voters.`,
          });

          // Refresh the voter list
          fetchVoters();
        }
      } catch (fetchError) {
        console.error("Fetch error details:", fetchError);
        throw fetchError;
      }
    } catch (error: any) {
      console.error("Import error details:", error);
      setImportResults((prev) => ({
        ...prev,
        failed: prev.total || 1,
        errors: [error.message || "An error occurred during import."],
      }));
    } finally {
      setIsImporting(false);
      setImportProgress(100);
    }
  };

  // Close import modal and reset state
  const handleCloseImport = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportProgress(0);
    // Clear results when closing the modal
    setImportResults({
      total: 0,
      success: 0,
      failed: 0,
      errors: [],
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Check user permissions once instead of using PermissionGuard everywhere
  const canAddVoter = hasPermission("voters", "add");
  const canEditVoter = hasPermission("voters", "edit");
  const canDeleteVoter = hasPermission("voters", "delete");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-4 rounded-lg shadow-md">
        <div>
          <h2 className="text-xl font-bold">Voter Management</h2>
          <p className="text-indigo-100 text-sm font-sans font-light">
            Manage student voters for the election
          </p>
        </div>
        <div className="flex space-x-2">
          {canAddVoter && (
            <>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm rounded-md shadow-sm text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Voter
              </button>
              <button
                onClick={handleImportClick}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
              >
                <Upload className="h-4 w-4 mr-2" />
                Import Voters
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".csv"
                className="hidden"
              />
            </>
          )}
        </div>
      </div>

      {/* Notification */}
      {notification && (
        <div
          className={`p-3 rounded-md ${
            notification.type === "success"
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          } flex justify-between items-start shadow-sm`}
        >
          <div className="flex">
            {notification.type === "success" ? (
              <Check className="h-5 w-5 text-green-500 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
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

      {/* Add/Edit Form */}
      {(showAddForm || editingVoter) && (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-md">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {editingVoter ? "Edit Voter" : "Add New Voter"}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md"
                value={editingVoter ? editingVoter.name : newVoter.name}
                onChange={(e) => {
                  if (editingVoter) {
                    setEditingVoter({ ...editingVoter, name: e.target.value });
                  } else {
                    setNewVoter({ ...newVoter, name: e.target.value });
                  }
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md"
                value={
                  editingVoter ? editingVoter.gender || "" : newVoter.gender
                }
                onChange={(e) => {
                  if (editingVoter) {
                    setEditingVoter({
                      ...editingVoter,
                      gender: e.target.value,
                    });
                  } else {
                    setNewVoter({ ...newVoter, gender: e.target.value });
                  }
                }}
              >
                <option key="empty-gender" value="">
                  Select gender
                </option>
                <option key="male" value="Male">
                  Male
                </option>
                <option key="female" value="Female">
                  Female
                </option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={editingVoter ? editingVoter.class : newVoter.class}
                onChange={(e) => {
                  if (editingVoter) {
                    setEditingVoter({ ...editingVoter, class: e.target.value });
                  } else {
                    setNewVoter({ ...newVoter, class: e.target.value });
                  }
                }}
              >
                <option value="">Select class</option>
                {availableClasses.map((cls) => (
                  <option key={cls.name} value={cls.name}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md"
                value={editingVoter ? editingVoter.year : newVoter.year}
                onChange={(e) => {
                  if (editingVoter) {
                    setEditingVoter({ ...editingVoter, year: e.target.value });
                  } else {
                    setNewVoter({ ...newVoter, year: e.target.value });
                  }
                }}
              >
                <option key="empty-year" value="">
                  Select year
                </option>
                {availableYears.map((year) => (
                  <option
                    key={`year-${year._id}`}
                    value={year.name}
                    disabled={!year.active}
                  >
                    {year.name} {year.active ? "(Active)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                House
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md"
                value={editingVoter ? editingVoter.house : newVoter.house}
                onChange={(e) => {
                  if (editingVoter) {
                    setEditingVoter({ ...editingVoter, house: e.target.value });
                  } else {
                    setNewVoter({ ...newVoter, house: e.target.value });
                  }
                }}
              >
                <option key="empty-house" value="">
                  Select house
                </option>
                {availableHouses
                  .filter((house) => house.active)
                  .map((house) => (
                    <option key={`house-${house._id}`} value={house.name}>
                      {house.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingVoter(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={editingVoter ? handleUpdateVoter : handleAddVoter}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              {editingVoter ? "Update" : "Add"} Voter
            </button>
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-md">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterVoted(null)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              filterVoted === null
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            All Voters
          </button>
          <button
            onClick={() => setFilterVoted(true)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              filterVoted === true
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            Voted
          </button>
          <button
            onClick={() => setFilterVoted(false)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${
              filterVoted === false
                ? "bg-red-600 text-white"
                : "bg-gray-100 text-gray-800 hover:bg-gray-200"
            }`}
          >
            Not Voted
          </button>
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-1.5 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Search voters..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <select
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
          >
            <option key="all-genders" value="">
              All Genders
            </option>
            {uniqueGenders.map((gender) => (
              <option key={`gender-${gender}`} value={gender}>
                {gender}
              </option>
            ))}
          </select>

          <select
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
            value={filterClass}
            onChange={(e) => setFilterClass(e.target.value)}
          >
            <option key="all-classes" value="">
              All Classes
            </option>
            {uniqueClasses.map((cls) => (
              <option key={`filter-class-${cls}`} value={cls}>
                {cls}
              </option>
            ))}
          </select>

          <div className="relative" ref={columnSelectorRef}>
            <button
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Columns className="h-4 w-4" />
            </button>

            {showColumnSelector && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                <div className="p-2">
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Show/Hide Columns
                  </div>
                  {Object.entries(visibleColumns).map(([key, value]) => (
                    <label
                      key={key}
                      className="flex items-center p-2 hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={value}
                        onChange={() =>
                          setVisibleColumns({
                            ...visibleColumns,
                            [key]: !value,
                          })
                        }
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {key.charAt(0).toUpperCase() + key.slice(1)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center">
            <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mb-2" />
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      )}

      {/* Empty state for no voters */}
      {!isLoading && voters.length === 0 && (
        <div className="bg-white rounded-lg p-8 text-center">
          <Users className="h-12 w-12 text-indigo-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No voters found
          </h3>
          <p className="text-gray-500 mb-6">
            Get started by adding voters using the button above
          </p>
        </div>
      )}

      {/* Voters Table */}
      {(!isLoading || voters.length > 0) && (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    S/N
                  </th>
                  {visibleColumns.voterId && (
                    <th
                      scope="col"
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Voter ID
                    </th>
                  )}
                  {visibleColumns.name && (
                    <th
                      scope="col"
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort("name")}
                    >
                      <div className="flex items-center">
                        Name
                        {sortField === "name" &&
                          (sortDirection === "asc" ? (
                            <ArrowUp className="h-4 w-4 ml-1" />
                          ) : (
                            <ArrowDown className="h-4 w-4 ml-1" />
                          ))}
                      </div>
                    </th>
                  )}
                  {visibleColumns.gender && (
                    <th
                      scope="col"
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Gender
                    </th>
                  )}
                  {visibleColumns.class && (
                    <th
                      scope="col"
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                      onClick={() => handleSort("class")}
                    >
                      <div className="flex items-center">
                        Class
                        {sortField === "class" &&
                          (sortDirection === "asc" ? (
                            <ArrowUp className="h-4 w-4 ml-1" />
                          ) : (
                            <ArrowDown className="h-4 w-4 ml-1" />
                          ))}
                      </div>
                    </th>
                  )}
                  {visibleColumns.status && (
                    <th
                      scope="col"
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                  )}
                  <th
                    scope="col"
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Date Voted
                  </th>
                  {visibleColumns.actions &&
                    (canEditVoter || canDeleteVoter) && (
                      <th
                        scope="col"
                        className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Actions
                      </th>
                    )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredVoters.map((voter, index) => (
                  <tr key={voter._id} className="hover:bg-gray-50">
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {index + 1}
                    </td>
                    {visibleColumns.voterId && (
                      <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {voter.voterId}
                      </td>
                    )}
                    {visibleColumns.name && (
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {voter.name}
                      </td>
                    )}
                    {visibleColumns.gender && (
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {voter.gender}
                      </td>
                    )}
                    {visibleColumns.class && (
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                        {voter.class}
                      </td>
                    )}
                    {visibleColumns.status && (
                      <td className="px-3 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            voter.hasVoted
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {voter.hasVoted ? "Voted" : "Not Voted"}
                        </span>
                      </td>
                    )}
                    <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                      {voter.hasVoted && voter.votedAt
                        ? formatDateTime(voter.votedAt)
                        : "-"}
                    </td>
                    {visibleColumns.actions &&
                      (canEditVoter || canDeleteVoter) && (
                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            {canEditVoter && (
                              <>
                                <button
                                  onClick={() =>
                                    handleRegenerateVoterId(voter._id)
                                  }
                                  className={`text-indigo-600 hover:text-indigo-900 ${
                                    voter.hasVoted
                                      ? "opacity-50 cursor-not-allowed"
                                      : ""
                                  }`}
                                  disabled={voter.hasVoted}
                                >
                                  <KeyRound className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => handleEditVoter(voter)}
                                  className="ml-2 text-indigo-600 hover:text-indigo-900"
                                >
                                  <Edit className="h-4 w-4" />
                                </button>
                              </>
                            )}
                            {canDeleteVoter && (
                              <button
                                onClick={() => handleDeleteVoter(voter._id)}
                                className={`ml-2 text-red-600 hover:text-red-900 ${
                                  voter.hasVoted
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                                disabled={voter.hasVoted}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredVoters.length === 0 && voters.length > 0 && (
            <div className="text-center py-4 text-gray-500">
              No voters found matching your criteria
            </div>
          )}
        </div>
      )}

      {/* Table Information */}
      <div className="bg-white p-4 rounded-lg shadow-md text-sm text-gray-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Info className="h-4 w-4 mr-1.5 text-gray-400" />
            <span>
              Showing{" "}
              <span className="font-medium text-gray-900">
                {filteredVoters.length}
              </span>{" "}
              of{" "}
              <span className="font-medium text-gray-900">{voters.length}</span>{" "}
              voters
            </span>
          </div>
          <button
            onClick={() => {
              setSearchTerm("");
              setFilterVoted(null);
              setFilterGender("");
              setFilterClass("");
            }}
            className="text-indigo-600 hover:text-indigo-900"
          >
            Clear all filters
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
              &#8203;
            </span>
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                    <FileText className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Import Voters
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Upload a CSV file to import voters in bulk. The CSV
                        should have the following columns: name, gender, class,
                        year, house.
                      </p>

                      {/* Only show errors if they exist and we've completed an import */}
                      {importResults.errors.length > 0 &&
                        importProgress === 100 && (
                          <div className="mt-3 mb-4 p-3 border-l-4 border-red-500 bg-red-50 rounded-md overflow-hidden">
                            {/* ...existing error display code... */}
                            <div className="flex items-start">
                              <AlertCircle className="h-5 w-5 text-red-500 mr-2 flex-shrink-0 mt-0.5" />
                              <div className="w-full overflow-hidden">
                                <p className="text-sm font-medium text-red-800 mb-1">
                                  Import failed
                                </p>
                                <div className="max-h-24 overflow-y-auto pr-2">
                                  <ul className="text-sm text-red-700 list-disc list-inside">
                                    {importResults.errors.map(
                                      (error, index) => (
                                        <li
                                          key={index}
                                          className="break-words text-xs"
                                        >
                                          {error}
                                        </li>
                                      )
                                    )}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                      {importFile && (
                        <div className="mt-3 p-2 bg-indigo-50 rounded-md">
                          <p className="text-sm font-medium text-indigo-800">
                            Selected file: {importFile.name}
                          </p>
                          <p className="text-xs text-indigo-500">
                            Size: {(importFile.size / 1024).toFixed(2)} KB
                          </p>
                        </div>
                      )}

                      {isImporting && (
                        <div className="mt-4">
                          <div className="relative pt-1">
                            <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-indigo-200">
                              <div
                                style={{ width: `${importProgress}%` }}
                                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-indigo-500 transition-all duration-500"
                              ></div>
                            </div>
                            <p className="text-center text-sm text-indigo-700">
                              Processing...
                            </p>
                          </div>
                        </div>
                      )}

                      {importResults.total > 0 &&
                        importProgress === 100 &&
                        !isImporting && (
                          <div
                            className={`mt-4 border rounded-md p-3 ${
                              importResults.failed > 0
                                ? "border-orange-200 bg-orange-50"
                                : "border-green-200 bg-green-50"
                            }`}
                          >
                            {/* ...existing results display code... */}
                            <h4 className="font-medium text-gray-700">
                              Import Results
                            </h4>
                            <div className="mt-2 space-y-1">
                              <p className="text-sm">
                                Total: {importResults.total} voters
                              </p>
                              <p className="text-sm text-green-600 font-medium">
                                Success: {importResults.success} voters
                              </p>
                              {importResults.failed > 0 && (
                                <p className="text-sm text-red-600 font-medium">
                                  Failed: {importResults.failed} voters
                                </p>
                              )}

                              {importResults.errors.length > 0 &&
                                importResults.errors.length > 1 && (
                                  <div className="mt-2">
                                    <p className="text-sm font-medium text-red-700">
                                      Errors:
                                    </p>
                                    <div className="max-h-32 overflow-y-auto pr-2 mt-1">
                                      <ul className="list-disc pl-5 text-xs text-red-600 space-y-1">
                                        {importResults.errors.map(
                                          (error, index) => (
                                            <li
                                              key={index}
                                              className="break-words"
                                            >
                                              {error}
                                            </li>
                                          )
                                        )}
                                      </ul>
                                    </div>
                                  </div>
                                )}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {/* Only show Start Import button if we haven't completed an import or have reset the state */}
                {importResults.total === 0 || importProgress !== 100 ? (
                  <>
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={handleStartImport}
                      disabled={!importFile || isImporting}
                    >
                      {isImporting ? "Importing..." : "Start Import"}
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={handleCloseImport}
                      disabled={isImporting}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={handleCloseImport}
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                      onClick={() => {
                        // Reset the import state AND file input to allow selecting a new file
                        setImportProgress(0);
                        setImportResults({
                          total: 0,
                          success: 0,
                          failed: 0,
                          errors: [],
                        });
                        setImportFile(null);
                        if (fileInputRef.current) {
                          fileInputRef.current.value = "";
                        }
                        // Trigger file input dialog
                        handleImportClick();
                      }}
                    >
                      Select New File
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VotersManager;
