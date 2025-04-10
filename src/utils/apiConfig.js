// API configuration utility to ensure consistent URL usage

// Get API base URL from environment variables with fallback
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://e-voting-api-jsfc.onrender.com";

// Remove any trailing slash for consistency
const apiUrl = API_BASE_URL.endsWith("/")
  ? API_BASE_URL.slice(0, -1)
  : API_BASE_URL;

// Build complete URL with endpoint
export const getApiUrl = (endpoint) => {
  // Ensure endpoint starts with slash
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${apiUrl}${path}`;
};

export default {
  baseUrl: apiUrl,
  getApiUrl,
};
