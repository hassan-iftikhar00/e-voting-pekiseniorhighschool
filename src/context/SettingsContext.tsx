import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface Settings {
  companyName: string;
  schoolName: string;
  companyLogo: string;
  schoolLogo: string;
  electionTitle: string;
  electionDate: string;
  electionStartTime: string;
  electionEndTime: string;
  autoBackupEnabled: boolean;
  autoBackupInterval: string;
  systemTimeZone: string;
  [key: string]: any; // Allow for dynamic properties
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => void;
  loading: boolean;
  error: string | null;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

const initialSettings: Settings = {
  companyName: "",
  schoolName: "",
  companyLogo: "",
  schoolLogo: "",
  electionTitle: "Student Council Election",
  electionDate: "2025-05-15",
  electionStartTime: "08:00",
  electionEndTime: "17:00",
  autoBackupEnabled: true,
  autoBackupInterval: "24",
  systemTimeZone: "Africa/Accra",
};

// Add API base URL helper
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch settings from API on component mount with better error handling
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        console.log(`Fetching settings from ${API_BASE_URL}/api/settings`);
        const response = await fetch(`${API_BASE_URL}/api/settings`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error response: ${errorText}`);
          throw new Error(`Failed to fetch settings: ${response.status}`);
        }

        const data = await response.json();
        console.log("Received settings:", data);

        // Merge API data with default settings
        setSettings({
          ...initialSettings,
          ...data,
        });
      } catch (err: any) {
        console.error("Error fetching settings:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const updateSettings = (updates: Partial<Settings>) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      ...updates,
    }));
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        loading,
        error,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
