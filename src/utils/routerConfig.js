/**
 * Helper function to create consistent routes across development and production
 */

// Get the base API URL from environment variables with a fallback
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

// Build a full API URL with the given endpoint
export function getApiUrl(endpoint) {
  const path = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${path}`;
}

// Config for React Router - add this to ensure proper SPA routing
export const routerConfig = {
  basename: "/",
};

export default {
  API_BASE_URL,
  getApiUrl,
  routerConfig,
};
