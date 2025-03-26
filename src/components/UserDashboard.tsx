import React, { useState, useEffect } from "react";
import { useUser } from "../context/UserContext";

interface Poll {
  id: number;
  question: string;
  options: string[];
}

const UserDashboard: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votes, setVotes] = useState<Record<number, string>>({});
  const { user } = useUser();

  useEffect(() => {
    // In a real application, you would fetch polls from an API
    setPolls([
      {
        id: 1,
        question: "What is your favorite color?",
        options: ["Red", "Blue", "Green"],
      },
      {
        id: 2,
        question: "Which programming language do you prefer?",
        options: ["JavaScript", "Python", "Java"],
      },
    ]);
  }, []);

  const handleVote = (pollId: number, option: string) => {
    setVotes((prev) => ({ ...prev, [pollId]: option }));
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">User Dashboard</h1>
      <p className="mb-4">Welcome, {user?.username || "User"}!</p>

      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Available Polls</h2>
        {polls.map((poll) => (
          <div key={poll.id} className="mb-6 last:mb-0">
            <h3 className="text-lg font-medium mb-2">{poll.question}</h3>
            <div className="space-y-2">
              {poll.options.map((option, index) => (
                <button
                  key={index}
                  className={`w-full text-left p-2 rounded ${
                    votes[poll.id] === option
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 hover:bg-gray-200"
                  }`}
                  onClick={() => handleVote(poll.id, option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserDashboard;
