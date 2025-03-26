import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { UserProvider } from "./context/UserContext";
import { ElectionProvider } from "./context/ElectionContext";
import { SettingsProvider } from "./context/SettingsContext";
import ServerConnectionHandler from "./components/ServerConnectionHandler";
import Login from "./components/Login";
import VotingAuth from "./components/VotingAuth";
import Candidates from "./components/Candidates";
import ConfirmVote from "./components/ConfirmVote";
import ThankYou from "./components/ThankYou";
import ElectionManagerVoterPanel from "./components/ElectionManagerVoterPanel";

const App: React.FC = () => {
  return (
    <UserProvider>
      <ElectionProvider>
        <SettingsProvider>
          <ServerConnectionHandler>
            <div className="flex flex-col min-h-screen">
              <main className="flex-grow">
                <Routes>
                  <Route
                    path="/"
                    element={<Navigate to="/voting-auth" replace />}
                  />
                  <Route path="/login" element={<Login />} />
                  <Route path="/voting-auth" element={<VotingAuth />} />
                  <Route path="/candidates" element={<Candidates />} />
                  <Route path="/confirm-vote" element={<ConfirmVote />} />
                  <Route path="/thank-you" element={<ThankYou />} />
                  <Route
                    path="/election-manager/*"
                    element={<ElectionManagerVoterPanel />}
                  />
                </Routes>
              </main>
            </div>
          </ServerConnectionHandler>
        </SettingsProvider>
      </ElectionProvider>
    </UserProvider>
  );
};

export default App;
