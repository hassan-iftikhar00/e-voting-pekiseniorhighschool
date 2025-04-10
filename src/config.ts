// Ensure API_URL doesn't have a trailing slash
export const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

// Helper function to properly join API paths
export const getApiUrl = (path: string) => {
  // Ensure path starts with a slash but doesn't include trailing slash
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
};
