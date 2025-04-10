// Utility file to ensure all API calls use the correct URL

// Get the API URL from environment variables or use a default
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

// Remove trailing slash if present
const apiBaseUrl = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;

// Helper function to build complete API URLs
export function getApiUrl(endpoint) {
  // Ensure endpoint starts with a slash
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${apiBaseUrl}${path}`;
}

// Export a configured fetch function that automatically uses the correct base URL
export async function apiFetch(endpoint, options = {}) {
  const url = getApiUrl(endpoint);

  // Add common headers
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return response.json();
}

export default {
  getApiUrl,
  apiFetch,
};
