import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../context/UserContext";
import { CheckCircle, User, Calendar, Clock } from "lucide-react";

const ThankYou: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useUser();
  const [countdown, setCountdown] = useState(10);
  const [voterId, setVoterId] = useState<string>("");
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const voteTimestamp = localStorage.getItem("voteTimestamp")
    ? new Date(localStorage.getItem("voteTimestamp")!)
    : new Date();

  useEffect(() => {
    const storedVoterId = localStorage.getItem("voterId");
    if (storedVoterId) {
      setVoterId(storedVoterId);
    }
  }, []);

  const formatDate = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      day: "2-digit",
      month: "long",
      year: "numeric",
    };
    return date.toLocaleDateString("en-GB", options);
  };

  const formatTime = (date: Date) => {
    const options: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    };
    return date.toLocaleTimeString("en-US", options);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
          }
          setTimeout(() => {
            handleLogout();
          }, 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [user, navigate]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-indigo-50 relative overflow-hidden flex items-center justify-center">
      {/* Beautiful Watermark Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Animated Watercolor Effect */}
        <div className="absolute inset-0 opacity-[0.06]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full animate-pulse"
              style={{
                width: "600px",
                height: "600px",
                background: `radial-gradient(circle, ${
                  i % 2 === 0
                    ? "rgba(16, 185, 129, 0.05)"
                    : "rgba(5, 150, 105, 0.05)"
                } 0%, transparent 70%)`,
                left: `${i * 20 + Math.random() * 20}%`,
                top: `${i * 20 + Math.random() * 20}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: "3s",
              }}
            />
          ))}
        </div>

        {/* Decorative Lines */}
        <div className="absolute inset-0 opacity-[0.06]">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className="absolute h-px w-full"
              style={{
                top: `${i * 10}%`,
                background:
                  "linear-gradient(90deg, transparent 0%, #059669 50%, transparent 100%)",
                animationDelay: `${i * 0.2}s`,
                animationDuration: "3s",
              }}
            />
          ))}
        </div>

        {/* Floating Text */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.06]">
          <div className="absolute w-[200%] h-[200%] -rotate-12">
            <div className="absolute top-0 left-0 w-full h-full flex flex-wrap gap-16">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className="text-emerald-900 text-9xl font-black whitespace-nowrap transform rotate-12"
                >
                  THANK YOU
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-sm w-full bg-gradient-to-b from-emerald-500 to-green-500 rounded-xl shadow-2xl overflow-hidden relative z-10">
        <div className="h-1 bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-400"></div>

        <div className="p-4 text-center">
          {/* Success Icon */}
          <div className="mx-auto w-16 h-16 relative mb-4">
            <div className="absolute inset-0 rounded-full bg-white shadow-xl flex items-center justify-center overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-200 to-green-200 animate-pulse"></div>
              <div className="relative z-10 transform transition-transform duration-500 hover:scale-110">
                <CheckCircle
                  className="w-10 h-10 text-emerald-600"
                  strokeWidth={1.5}
                />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold mb-2 text-white">
            Thank You for Voting!
          </h1>

          {/* Voter Information Card */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 mb-4">
            <div className="flex items-center justify-center mb-2">
              <User className="h-5 w-5 text-white mr-2" />
              <h3 className="font-semibold text-white text-lg">
                {user.username}{" "}
                <span className="text-emerald-100 font-normal">
                  ({voterId || "VOTER2025"})
                </span>
              </h3>
            </div>
            <div className="flex flex-col space-y-1 text-sm text-emerald-100">
              <div className="flex items-center justify-center">
                <Calendar className="h-4 w-4 mr-2" />
                <span>{formatDate(voteTimestamp)}</span>
              </div>
              <div className="flex items-center justify-center">
                <Clock className="h-4 w-4 mr-2" />
                <span>{formatTime(voteTimestamp)}</span>
              </div>
            </div>
          </div>

          {/* Countdown Timer */}
          <div className="mb-4">
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-300 to-green-300 h-2 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${(countdown / 10) * 100}%` }}
              ></div>
            </div>
            <div className="flex justify-between items-center mt-1">
              <p className="text-emerald-100 text-xs">Logging out soon</p>
              <p className="text-white font-bold text-sm">{countdown}s</p>
            </div>
          </div>

          {/* Button */}
          <button
            onClick={handleLogout}
            className="w-full py-2 px-4 rounded-lg font-medium text-emerald-700 bg-white hover:bg-emerald-50 transition-all duration-300 shadow-lg text-sm"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  );
};

export default ThankYou;
