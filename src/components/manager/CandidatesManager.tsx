import React, { useState, useEffect, useRef } from "react";
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
  Filter,
  User,
  Upload,
  ArrowUp,
  ArrowDown,
  Award,
  ImageIcon,
} from "lucide-react";
import { useUser } from "../../context/UserContext";

// Interface for candidate data
interface Candidate {
  _id: string;
  name: string;
  positionId: string;
  position?: {
    title: string;
  };
  image?: string;
  biography?: string;
  year?: string;
  class?: string;
  house?: string;
  isActive: boolean;
  voterCategory?: VoterCategory;
}

// Interface for positions (used in dropdown)
interface Position {
  _id: string;
  title: string;
  priority: number;
  isActive: boolean;
}

// Define types for voter categories
type VoterCategoryType = "all" | "year" | "class" | "house";

interface VoterCategory {
  type: VoterCategoryType;
  values: string[];
}

const CandidatesManager: React.FC = () => {
  const { hasPermission } = useUser();
  // Initialize with empty array instead of undefined initialCandidates
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterPosition, setFilterPosition] = useState<string>("");
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  const [filterClass, setFilterClass] = useState<string>(""); // Add missing filterClass state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(
    null
  );
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [sortField, setSortField] = useState<"name" | "position">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reference data for filters - now properly initialized
  const [years] = useState<string[]>(["2023", "2024", "2025"]);
  const [classes] = useState<string[]>([
    "Form 1A",
    "Form 1B",
    "Form 2A",
    "Form 2B",
    "Form 3A",
    "Form 3B",
  ]);
  const [houses] = useState<string[]>([
    "Red House",
    "Blue House",
    "Green House",
    "Yellow House",
  ]);

  // Visible columns state
  const [visibleColumns, setVisibleColumns] = useState({
    name: true,
    position: true,
    image: true,
    biography: false,
    class: true,
    year: true,
    house: true,
    status: true,
    actions: true,
    voterCategory: true,
    description: false,
  });

  // Form state
  const [newCandidate, setNewCandidate] = useState<Candidate>({
    _id: "",
    name: "",
    positionId: "",
    image: "",
    biography: "",
    year: "",
    class: "",
    house: "",
    isActive: true,
    voterCategory: { type: "all", values: [] },
  });

  // Check user permissions once instead of using PermissionGuard everywhere
  const canAddCandidate = hasPermission("candidates", "add");
  const canEditCandidate = hasPermission("candidates", "edit");
  const canDeleteCandidate = hasPermission("candidates", "delete");

  // Function to get available options based on voter category type
  const getAvailableOptions = (type: VoterCategoryType): string[] => {
    switch (type) {
      case "year":
        return years;
      case "class":
        return classes;
      case "house":
        return houses;
      default:
        return [];
    }
  };

  // Get voter category label - previously missing
  const getVoterCategoryLabel = (category?: VoterCategory) => {
    if (!category || category.type === "all") return "All Voters";
    return `${category.values.join(", ")} Only`;
  };

  // Handle voter category change - previously missing
  const handleVoterCategoryChange = (
    type: VoterCategoryType,
    value: string,
    checked: boolean
  ) => {
    if (editingCandidate) {
      setEditingCandidate((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          voterCategory: {
            type,
            values: checked
              ? [...(prev.voterCategory?.values || []), value]
              : (prev.voterCategory?.values || []).filter((v) => v !== value),
          },
        };
      });
    } else {
      setNewCandidate((prev) => ({
        ...prev,
        voterCategory: {
          type,
          values: checked
            ? [...(prev.voterCategory?.values || []), value]
            : (prev.voterCategory?.values || []).filter((v) => v !== value),
        },
      }));
    }
  };

  // Handle move position functionality - previously missing
  const handleMovePosition = async (id: string, direction: "up" | "down") => {
    // In a real implementation, this would make an API call to update position order
    // For now, this is just a UI simulation
    const candidateIndex = candidates.findIndex((c) => c._id === id);
    if (
      (direction === "up" && candidateIndex === 0) ||
      (direction === "down" && candidateIndex === candidates.length - 1)
    ) {
      return;
    }

    const newCandidates = [...candidates];
    const targetIndex =
      direction === "up" ? candidateIndex - 1 : candidateIndex + 1;

    // Swap positions
    [newCandidates[candidateIndex], newCandidates[targetIndex]] = [
      newCandidates[targetIndex],
      newCandidates[candidateIndex],
    ];

    setCandidates(newCandidates);
    setNotification({
      type: "success",
      message: `Candidate moved ${direction}`,
    });

    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

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

  // Fetch candidates and positions from the backend API
  const fetchCandidates = async () => {
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
        }/api/candidates`,
        { headers }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch candidates: ${response.status}`);
      }

      const data = await response.json();
      setCandidates(data);
    } catch (error) {
      console.error("Error fetching candidates:", error);
      setNotification({
        type: "error",
        message: "Failed to load candidates",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
    } catch (error) {
      console.error("Error fetching positions:", error);
      setNotification({
        type: "error",
        message: "Failed to load positions",
      });
    }
  };

  // Load data on component mount
  useEffect(() => {
    fetchPositions();
    fetchCandidates();
  }, []);

  // Filter and sort candidates
  const filteredCandidates = candidates
    .filter(
      (candidate) =>
        candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (filterActive === null || candidate.isActive === filterActive) &&
        (filterPosition === "" || candidate.positionId === filterPosition) &&
        (filterClass === "" || candidate.class === filterClass)
    )
    .sort((a, b) => {
      if (sortField === "name") {
        return sortDirection === "asc"
          ? a.name.localeCompare(b.name)
          : b.name.localeCompare(a.name);
      } else if (sortField === "position") {
        const posA = positions.find((p) => p._id === a.positionId)?.title || "";
        const posB = positions.find((p) => p._id === b.positionId)?.title || "";
        return sortDirection === "asc"
          ? posA.localeCompare(posB)
          : posB.localeCompare(posA);
      }
      return 0;
    });

  // Get position title by ID
  const getPositionTitle = (positionId: string) => {
    const position = positions.find((p) => p._id === positionId);
    return position ? position.title : "Unknown Position";
  };

  const handleSort = (field: "name" | "position") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Handle file upload for candidate image
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        if (editingCandidate) {
          setEditingCandidate({
            ...editingCandidate,
            image: base64String,
          });
        } else {
          setNewCandidate({
            ...newCandidate,
            image: base64String,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Add candidate handler with API integration
  const handleAddCandidate = async () => {
    if (!newCandidate.name || !newCandidate.positionId) {
      setNotification({
        type: "error",
        message: "Name and position are required",
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

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/candidates`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(newCandidate),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to add candidate");
      }

      const data = await response.json();
      setCandidates([...candidates, data]);

      setNewCandidate({
        _id: "",
        name: "",
        positionId: "",
        image: "",
        biography: "",
        year: "",
        class: "",
        house: "",
        isActive: true,
        voterCategory: { type: "all", values: [] },
      });

      setShowAddForm(false);
      setNotification({
        type: "success",
        message: "Candidate added successfully",
      });
    } catch (error: any) {
      setNotification({
        type: "error",
        message: error.message || "Failed to add candidate",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Update candidate handler with API integration
  const handleUpdateCandidate = async () => {
    if (
      !editingCandidate ||
      !editingCandidate.name ||
      !editingCandidate.positionId
    ) {
      setNotification({
        type: "error",
        message: "Name and position are required",
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

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/candidates/${editingCandidate._id}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(editingCandidate),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update candidate");
      }

      const updatedCandidate = await response.json();

      setCandidates(
        candidates.map((candidate) =>
          candidate._id === updatedCandidate._id ? updatedCandidate : candidate
        )
      );

      setEditingCandidate(null);
      setNotification({
        type: "success",
        message: "Candidate updated successfully",
      });
    } catch (error: any) {
      setNotification({
        type: "error",
        message: error.message || "Failed to update candidate",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Delete candidate handler with API integration
  const handleDeleteCandidate = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this candidate?")) {
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
        }/api/candidates/${id}`,
        {
          method: "DELETE",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete candidate: ${response.status}`);
      }

      setCandidates(candidates.filter((candidate) => candidate._id !== id));

      setNotification({
        type: "success",
        message: "Candidate deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting candidate:", error);
      setNotification({
        type: "error",
        message: "Failed to delete candidate",
      });
    } finally {
      setIsLoading(false);
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Toggle candidate active status with API integration
  const handleToggleActive = async (candidate: Candidate) => {
    try {
      // Get authentication token
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      };

      const updatedCandidate = {
        ...candidate,
        isActive: !candidate.isActive,
      };

      const response = await fetch(
        `${
          import.meta.env.VITE_API_URL || "http://localhost:5000"
        }/api/candidates/${candidate._id}`,
        {
          method: "PUT",
          headers,
          body: JSON.stringify(updatedCandidate),
        }
      );

      if (!response.ok) {
        throw new Error(
          `Failed to update candidate status: ${response.status}`
        );
      }

      const result = await response.json();

      setCandidates(
        candidates.map((cand) => (cand._id === candidate._id ? result : cand))
      );

      setNotification({
        type: "success",
        message: "Candidate status updated",
      });
    } catch (error) {
      console.error("Error updating candidate status:", error);
      setNotification({
        type: "error",
        message: "Failed to update candidate status",
      });
    } finally {
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Handle print and export functions
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
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        th { background-color: #f3f4f6; color: #374151; font-weight: bold; text-align: left; padding: 12px; }
        td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .status-active { color: #047857; font-weight: bold; }
        .status-inactive { color: #b91c1c; font-weight: bold; }
        .footer { margin-top: 20px; text-align: center; font-size: 12px; color: #6b7280; }
        .candidate-image { width: 50px; height: 50px; object-fit: cover; border-radius: 50%; }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Candidates List - Peki Senior High School</title>
          ${styles}
        </head>
        <body>
          <h1>Peki Senior High School - Candidates List</h1>
          
          <table>
            <thead>
              <tr>
                <th>S/N</th>
                ${visibleColumns.name ? "<th>Name</th>" : ""}
                ${visibleColumns.position ? "<th>Position</th>" : ""}
                ${visibleColumns.class ? "<th>Class</th>" : ""}
                ${visibleColumns.year ? "<th>Year</th>" : ""}
                ${visibleColumns.house ? "<th>House</th>" : ""}
                ${visibleColumns.status ? "<th>Status</th>" : ""}
              </tr>
            </thead>
            <tbody>
              ${filteredCandidates
                .map(
                  (candidate, index) => `
                <tr>
                  <td>${index + 1}</td>
                  ${visibleColumns.name ? `<td>${candidate.name}</td>` : ""}
                  ${
                    visibleColumns.position
                      ? `<td>${getPositionTitle(candidate.positionId)}</td>`
                      : ""
                  }
                  ${
                    visibleColumns.class
                      ? `<td>${candidate.class || "-"}</td>`
                      : ""
                  }
                  ${
                    visibleColumns.year
                      ? `<td>${candidate.year || "-"}</td>`
                      : ""
                  }
                  ${
                    visibleColumns.house
                      ? `<td>${candidate.house || "-"}</td>`
                      : ""
                  }
                  ${
                    visibleColumns.status
                      ? `<td class="${
                          candidate.isActive
                            ? "status-active"
                            : "status-inactive"
                        }">${candidate.isActive ? "Active" : "Inactive"}</td>`
                      : ""
                  }
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          
          <div class="footer">
            <p>Printed on ${new Date().toLocaleString()}</p>
            <p>Peki Senior High School - Prefectorial Elections 2025</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  // Handle export to Excel
  const handleExportExcel = () => {
    // Create CSV content
    let csvContent = "S/N,Name,Position,Class,Year,House,Status\n";

    filteredCandidates.forEach((candidate, index) => {
      csvContent += `${index + 1},"${candidate.name}","${getPositionTitle(
        candidate.positionId
      )}","${candidate.class || ""}","${candidate.year || ""}","${
        candidate.house || ""
      }","${candidate.isActive ? "Active" : "Inactive"}"\n`;
    });

    // Create a blob and download link
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `candidates_list_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Title and Add Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0 bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-4 rounded-lg shadow-md">
        <div>
          <h2 className="text-xl font-bold">Candidate Management</h2>
          <p className="text-indigo-100 text-sm font-sans font-light">
            Manage election candidates for each position
          </p>
        </div>
        <div className="flex space-x-2">
          {canAddCandidate && (
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingCandidate(null);
              }}
              disabled={positions.length === 0}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm rounded-md shadow-sm text-indigo-700 bg-white hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Candidate
            </button>
          )}
        </div>
      </div>

      {/* Empty state with action button */}
      {!isLoading && positions.length === 0 && (
        <div className="bg-white rounded-lg p-8 text-center">
          <Award className="h-12 w-12 text-indigo-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No positions available
          </h3>
          <p className="text-gray-500 mb-6">
            You need to create positions before adding candidates
          </p>
          <a
            href="/election-manager/positions"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Manage Positions
          </a>
        </div>
      )}

      {/* Empty state for no candidates */}
      {!isLoading && positions.length > 0 && candidates.length === 0 && (
        <div className="bg-white rounded-lg p-8 text-center">
          <User className="h-12 w-12 text-indigo-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No candidates found
          </h3>
          <p className="text-gray-500 mb-6">
            Get started by adding candidates using the button above
          </p>
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="flex flex-col items-center">
            <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin mb-2" />
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      )}

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

      {/* Add/Edit Form */}
      {(showAddForm || editingCandidate) && (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4 border-b pb-2 flex items-center">
            {editingCandidate ? (
              <>
                <Edit className="h-5 w-5 text-indigo-500 mr-2" />
                Edit Candidate
              </>
            ) : (
              <>
                <Plus className="h-5 w-5 text-indigo-500 mr-2" />
                Add New Candidate
              </>
            )}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Image Upload */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Candidate Photo
              </label>
              <div className="flex items-center space-x-4">
                <div className="w-32 h-32 border-2 border-gray-300 border-dashed rounded-lg overflow-hidden">
                  {editingCandidate?.image || newCandidate.image ? (
                    <img
                      src={editingCandidate?.image || newCandidate.image}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <User className="h-12 w-12 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex flex-col space-y-2">
                  <label className="relative cursor-pointer">
                    <input
                      type="file"
                      className="sr-only"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                    <div className="px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
                      Browse...
                    </div>
                  </label>
                  <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                </div>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={
                  editingCandidate ? editingCandidate.name : newCandidate.name
                }
                onChange={(e) => {
                  if (editingCandidate) {
                    setEditingCandidate({
                      ...editingCandidate,
                      name: e.target.value,
                    });
                  } else {
                    setNewCandidate({ ...newCandidate, name: e.target.value });
                  }
                }}
                placeholder="Enter candidate name"
              />
            </div>

            {/* Position */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Position
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={
                  editingCandidate
                    ? editingCandidate.positionId
                    : newCandidate.positionId
                }
                onChange={(e) => {
                  if (editingCandidate) {
                    setEditingCandidate({
                      ...editingCandidate,
                      positionId: e.target.value,
                    });
                  } else {
                    setNewCandidate({
                      ...newCandidate,
                      positionId: e.target.value,
                    });
                  }
                }}
              >
                <option value="">Select position</option>
                {positions.map((position) => (
                  <option key={position._id} value={position._id}>
                    {position.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Class */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Class
              </label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={
                  editingCandidate ? editingCandidate.class : newCandidate.class
                }
                onChange={(e) => {
                  if (editingCandidate) {
                    setEditingCandidate({
                      ...editingCandidate,
                      class: e.target.value,
                    });
                  } else {
                    setNewCandidate({ ...newCandidate, class: e.target.value });
                  }
                }}
              >
                <option value="">Select class</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>

            {/* Voter Category */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Voter Category
              </label>
              <div className="space-y-4">
                <select
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={
                    editingCandidate
                      ? editingCandidate.voterCategory?.type || "all"
                      : newCandidate.voterCategory?.type || "all"
                  }
                  onChange={(e) => {
                    const type = e.target.value as VoterCategory["type"];
                    if (editingCandidate) {
                      setEditingCandidate({
                        ...editingCandidate,
                        voterCategory: { type, values: [] },
                      });
                    } else {
                      setNewCandidate({
                        ...newCandidate,
                        voterCategory: { type, values: [] },
                      });
                    }
                  }}
                >
                  <option value="all">All Voters</option>
                  <option value="year">Specific Year/Level</option>
                  <option value="class">Specific Programme/Class</option>
                  <option value="house">Specific Hall/House</option>
                </select>

                {/* Fix the conditional rendering here to check the correct state */}
                {((editingCandidate &&
                  editingCandidate.voterCategory?.type !== "all") ||
                  (!editingCandidate &&
                    newCandidate.voterCategory?.type !== "all")) && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700">
                      Select{" "}
                      {editingCandidate
                        ? editingCandidate.voterCategory?.type
                        : newCandidate.voterCategory?.type}
                      s:
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {getAvailableOptions(
                        editingCandidate?.voterCategory?.type ??
                          newCandidate.voterCategory?.type ??
                          "all"
                      ).map((option) => (
                        <label
                          key={option}
                          className="flex items-center space-x-2"
                        >
                          <input
                            type="checkbox"
                            checked={
                              editingCandidate
                                ? editingCandidate.voterCategory?.values.includes(
                                    option
                                  )
                                : newCandidate.voterCategory?.values.includes(
                                    option
                                  )
                            }
                            onChange={(e) =>
                              handleVoterCategoryChange(
                                editingCandidate?.voterCategory?.type ??
                                  newCandidate.voterCategory?.type ??
                                  "all",
                                option,
                                e.target.checked
                              )
                            }
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                          />
                          <span className="text-sm text-gray-700">
                            {option}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                rows={3}
                value={
                  editingCandidate
                    ? editingCandidate.biography
                    : newCandidate.biography
                }
                onChange={(e) => {
                  if (editingCandidate) {
                    setEditingCandidate({
                      ...editingCandidate,
                      biography: e.target.value,
                    });
                  } else {
                    setNewCandidate({
                      ...newCandidate,
                      biography: e.target.value,
                    });
                  }
                }}
                placeholder="Enter candidate description"
              />
            </div>

            {/* Active Status */}
            <div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="active-status"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  checked={
                    editingCandidate
                      ? editingCandidate.isActive
                      : newCandidate.isActive
                  }
                  onChange={(e) => {
                    if (editingCandidate) {
                      setEditingCandidate({
                        ...editingCandidate,
                        isActive: e.target.checked,
                      });
                    } else {
                      setNewCandidate({
                        ...newCandidate,
                        isActive: e.target.checked,
                      });
                    }
                  }}
                />
                <label
                  htmlFor="active-status"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Active
                </label>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Only active candidates will be available for voting.
              </p>
            </div>
          </div>

          <div className="mt-4 flex justify-end space-x-2">
            <button
              onClick={() => {
                setShowAddForm(false);
                setEditingCandidate(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
            <button
              onClick={
                editingCandidate ? handleUpdateCandidate : handleAddCandidate
              }
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {editingCandidate ? "Update Candidate" : "Add Candidate"}
            </button>
          </div>
        </div>
      )}

      {/* Filters and table - only show if we have some candidates or filter is active */}
      {(candidates.length > 0 ||
        searchTerm ||
        filterPosition ||
        filterActive !== null) && (
        <>
          {/* Filters and Actions */}
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex flex-col md:flex-row md:items-center space-y-3 md:space-y-0">
              {/* Left side - Filter buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setFilterActive(null)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    filterActive === null
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  All Candidates
                </button>
                <button
                  onClick={() => setFilterActive(true)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    filterActive === true
                      ? "bg-green-600 text-white"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  Active
                </button>
                <button
                  onClick={() => setFilterActive(false)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                    filterActive === false
                      ? "bg-red-600 text-white"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  Inactive
                </button>
              </div>

              {/* Right side - Action buttons */}
              <div className="flex space-x-2 md:ml-auto">
                <button
                  onClick={() => {}}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  title="Print candidate list"
                >
                  <Printer className="h-4 w-4 mr-1.5" />
                  Print
                </button>
                <button
                  onClick={() => {}}
                  className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  title="Export to Excel"
                >
                  <FileSpreadsheet className="h-4 w-4 mr-1.5" />
                  Export
                </button>
                <div className="relative" ref={columnSelectorRef}>
                  <button
                    onClick={() => setShowColumnSelector(!showColumnSelector)}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    title="Select columns"
                  >
                    <Columns className="h-4 w-4 mr-1.5" />
                    Columns
                  </button>

                  {showColumnSelector && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border border-gray-200">
                      <div className="p-2">
                        <div className="text-sm font-medium text-gray-700 mb-2 border-b pb-1">
                          Show/Hide Columns
                        </div>
                        <div className="space-y-2">
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={visibleColumns.name}
                              onChange={() =>
                                setVisibleColumns({
                                  ...visibleColumns,
                                  name: !visibleColumns.name,
                                })
                              }
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Name
                            </span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={visibleColumns.position}
                              onChange={() =>
                                setVisibleColumns({
                                  ...visibleColumns,
                                  position: !visibleColumns.position,
                                })
                              }
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Position
                            </span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={visibleColumns.class}
                              onChange={() =>
                                setVisibleColumns({
                                  ...visibleColumns,
                                  class: !visibleColumns.class,
                                })
                              }
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Class
                            </span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={visibleColumns.description}
                              onChange={() =>
                                setVisibleColumns({
                                  ...visibleColumns,
                                  description: !visibleColumns.description,
                                })
                              }
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Description
                            </span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={visibleColumns.voterCategory}
                              onChange={() =>
                                setVisibleColumns({
                                  ...visibleColumns,
                                  voterCategory: !visibleColumns.voterCategory,
                                })
                              }
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Voter Category
                            </span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={visibleColumns.status}
                              onChange={() =>
                                setVisibleColumns({
                                  ...visibleColumns,
                                  status: !visibleColumns.status,
                                })
                              }
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Status
                            </span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="checkbox"
                              checked={visibleColumns.actions}
                              onChange={() =>
                                setVisibleColumns({
                                  ...visibleColumns,
                                  actions: !visibleColumns.actions,
                                })
                              }
                              className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">
                              Actions
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Search candidates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <select
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
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

              <select
                className="block w-full pl-3 pr-10 py-2 text-base border border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={filterClass}
                onChange={(e) => setFilterClass(e.target.value)}
              >
                <option value="">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls} value={cls}>
                    {cls}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Candidates Table */}
          <div className="bg-white shadow-md rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"
                    >
                      S/N
                    </th>
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
                              <ArrowUp className="h-4 w-4 ml-1 text-indigo-500" />
                            ) : (
                              <ArrowDown className="h-4 w-4 ml-1 text-indigo-500" />
                            ))}
                        </div>
                      </th>
                    )}
                    {visibleColumns.position && (
                      <th
                        scope="col"
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                        onClick={() => handleSort("position")}
                      >
                        <div className="flex items-center">
                          Position
                          {sortField === "position" &&
                            (sortDirection === "asc" ? (
                              <ArrowUp className="h-4 w-4 ml-1 text-indigo-500" />
                            ) : (
                              <ArrowDown className="h-4 w-4 ml-1 text-indigo-500" />
                            ))}
                        </div>
                      </th>
                    )}
                    {visibleColumns.class && (
                      <th
                        scope="col"
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Class
                      </th>
                    )}
                    {visibleColumns.description && (
                      <th
                        scope="col"
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Description
                      </th>
                    )}
                    {visibleColumns.voterCategory && (
                      <th
                        scope="col"
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Voter Category
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
                    {visibleColumns.actions &&
                      (canEditCandidate || canDeleteCandidate) && (
                        <th
                          scope="col"
                          className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                        >
                          Actions
                        </th>
                      )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredCandidates.map((candidate, index) => (
                    <tr
                      key={candidate._id}
                      className="hover:bg-indigo-50 transition-colors duration-150"
                    >
                      <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                        {index + 1}
                      </td>
                      {visibleColumns.name && (
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <img
                              src={candidate.image}
                              alt={candidate.name}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {candidate.name}
                              </div>
                            </div>
                          </div>
                        </td>
                      )}
                      {visibleColumns.position && (
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {getPositionTitle(candidate.positionId)}
                          </div>
                        </td>
                      )}
                      {visibleColumns.class && (
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {candidate.class}
                          </div>
                        </td>
                      )}
                      {visibleColumns.description && (
                        <td className="px-3 py-4">
                          <div className="text-sm text-gray-500 max-w-md">
                            {candidate.biography}
                          </div>
                        </td>
                      )}
                      {visibleColumns.voterCategory && (
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <Filter className="h-4 w-4 text-indigo-500 mr-2" />
                            <span className="text-sm text-gray-900">
                              {getVoterCategoryLabel(candidate.voterCategory)}
                            </span>
                          </div>
                        </td>
                      )}
                      {visibleColumns.status && (
                        <td className="px-3 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              candidate.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {candidate.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      )}
                      {visibleColumns.actions &&
                        (canEditCandidate || canDeleteCandidate) && (
                          <td className="px-3 py-4 whitespace-nowrap text-right text-sm">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() =>
                                  handleMovePosition(candidate._id, "up")
                                }
                                disabled={index === 0}
                                className={`p-1.5 rounded-md ${
                                  index === 0
                                    ? "text-gray-300 cursor-not-allowed"
                                    : "text-indigo-600 hover:text-indigo-900 hover:bg-indigo-100"
                                } transition-colors duration-200`}
                                title="Move up"
                              >
                                <ArrowUp className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() =>
                                  handleMovePosition(candidate._id, "down")
                                }
                                disabled={
                                  index === filteredCandidates.length - 1
                                }
                                className={`p-1.5 rounded-md ${
                                  index === filteredCandidates.length - 1
                                    ? "text-gray-300 cursor-not-allowed"
                                    : "text-indigo-600 hover:text-indigo-900 hover:bg-indigo-100"
                                } transition-colors duration-200`}
                                title="Move down"
                              >
                                <ArrowDown className="h-4 w-4" />
                              </button>

                              {/* Edit actions */}
                              {canEditCandidate && (
                                <>
                                  <button
                                    onClick={() =>
                                      handleToggleActive(candidate)
                                    }
                                    className={`p-1 rounded ${
                                      candidate.isActive
                                        ? "text-red-600 hover:text-red-900 hover:bg-red-100"
                                        : "text-green-600 hover:text-green-900 hover:bg-green-100"
                                    }`}
                                  >
                                    {candidate.isActive ? (
                                      <X className="h-5 w-5" />
                                    ) : (
                                      <Check className="h-5 w-5" />
                                    )}
                                  </button>
                                  <button
                                    onClick={() =>
                                      setEditingCandidate(candidate)
                                    }
                                    className="p-1.5 rounded-md text-indigo-600 hover:text-indigo-900 hover:bg-indigo-100 transition-colors duration-200"
                                    title="Edit candidate"
                                  >
                                    <Edit className="h-4 w-4" />
                                  </button>
                                </>
                              )}

                              {/* Delete action */}
                              {canDeleteCandidate && (
                                <button
                                  onClick={() =>
                                    handleDeleteCandidate(candidate._id)
                                  }
                                  className="p-1.5 rounded-md text-red-600 hover:text-red-900 hover:bg-red-100 transition-colors duration-200"
                                  title="Delete candidate"
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

            {filteredCandidates.length === 0 && (
              <div className="px-6 py-4 text-center text-gray-500">
                No candidates found matching your search criteria.
              </div>
            )}

            {/* Status bar with table information */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 text-sm text-gray-500 flex items-center justify-between">
              <div className="flex items-center">
                <Info className="h-4 w-4 mr-1.5 text-gray-400" />
                <span>
                  Showing{" "}
                  <span className="font-medium text-gray-900">
                    {filteredCandidates.length}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-900">
                    {candidates.length}
                  </span>{" "}
                  candidates
                  {filterActive !== null && (
                    <span>
                      {" "}
                      • {filterActive ? "Active" : "Inactive"} filter applied
                    </span>
                  )}
                  {filterPosition && <span> • Position: {filterPosition}</span>}
                  {filterClass && <span> • Class: {filterClass}</span>}
                  {searchTerm && <span> • Search: "{searchTerm}"</span>}
                </span>
              </div>
              <div>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setFilterActive(null);
                    setFilterPosition("");
                    setFilterClass("");
                  }}
                  className="text-indigo-600 hover:text-indigo-900 text-xs font-medium"
                >
                  Clear all filters
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CandidatesManager;
