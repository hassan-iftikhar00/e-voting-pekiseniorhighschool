import React, { useEffect } from "react";
import { useUser } from "./context/UserContext";
import { initializeElectionData } from "./utils/dbInitializer";

interface AppContentProps {
  children: React.ReactNode;
}

const AppContent: React.FC<AppContentProps> = ({ children }) => {
  const { isAuthenticated, authToken } = useUser();

  useEffect(() => {
    // Only initialize if the user is authenticated
    if (isAuthenticated && authToken) {
      initializeElectionData(authToken);
    }
  }, [isAuthenticated, authToken]);

  return <>{children}</>;
};

export default AppContent;
