import React, { useState } from "react";
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
} from "lucide-react";

// Mock data
const initialVoters = [
  {
    id: "1",
    voterId: "VOTER2025",
    name: "John Doe",
    gender: "Male",
    class: "Form 3A",
    hasVoted: false,
    votedAt: null,
  },
  {
    id: "2",
    voterId: "VOTER2024",
    name: "Jane Smith",
    gender: "Female",
    class: "Form 3B",
    hasVoted: true,
    votedAt: new Date("2025-05-15T10:30:45"),
  },
  {
    id: "3",
    voterId: "VOTER2023",
    name: "Kwame Asante",
    gender: "Male",
    class: "Form 3A",
    hasVoted: true,
    votedAt: new Date("2025-05-15T09:15:22"),
  },
  {
    id: "4",
    voterId: "VOTER2022",
    name: "Abena Mensah",
    gender: "Female",
    class: "Form 3C",
    hasVoted: false,
    votedAt: null,
  },
  {
    id: "5",
    voterId: "VOTER2021",
    name: "Kofi Owusu",
    gender: "Male",
    class: "Form 3B",
    hasVoted: true,
    votedAt: new Date("2025-05-15T11:45:10"),
  },
  {
    id: "6",
    voterId: "VOTER2020",
    name: "Ama Serwaa",
    gender: "Female",
    class: "Form 3A",
    hasVoted: false,
    votedAt: null,
  },
  {
    id: "7",
    voterId: "VOTER2019",
    name: "Yaw Boateng",
    gender: "Male",
    class: "Form 3C",
    hasVoted: true,
    votedAt: new Date("2025-05-15T08:20:33"),
  },
  {
    id: "8",
    voterId: "VOTER2018",
    name: "Akua Manu",
    gender: "Female",
    class: "Form 3B",
    hasVoted: false,
    votedAt: null,
  },
];

interface Voter {
  id: string;
  voterId: string;
  name: string;
  gender: string;
  class: string;
  hasVoted: boolean;
  votedAt: Date | null;
}

const VotersManager: React.FC = () => {
  const [voters, setVoters] = useState<Voter[]>(initialVoters);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const filteredVoters = voters.filter(
    (voter) =>
      voter.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      voter.voterId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* ... existing JSX ... */}

      {/* Voters Table - Remove loading state */}
      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            {/* ... existing table JSX ... */}
          </table>
        </div>

        {filteredVoters.length === 0 && (
          <div className="px-6 py-4 text-center text-gray-500">
            No voters found matching your search criteria.
          </div>
        )}

        {/* ... rest of the component ... */}
      </div>
    </div>
  );
};

export default VotersManager;
