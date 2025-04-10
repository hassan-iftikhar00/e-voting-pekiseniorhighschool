import { getApiUrl } from "./apiConfig";

/**
 * Custom fetch function with API URL handling and error management
 * @param {string} endpoint - API endpoint path (with or without leading slash)
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} - Response data as JSON
 */
export async function apiFetch(endpoint, options = {}) {
  // Build the full URL
  const url = getApiUrl(endpoint);

  // Default headers
  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  try {
    // Add timestamp to prevent caching for GET requests
    const urlWithCache =
      options.method === "GET" || !options.method
        ? `${url}${url.includes("?") ? "&" : "?"}_=${Date.now()}`
        : url;

    console.log(`[API] Fetching: ${urlWithCache}`);

    const response = await fetch(urlWithCache, {
      ...options,
      headers,
    });

    // Handle HTTP errors
    if (!response.ok) {
      const errorText = await response.text();
      let errorData;

      try {
        // Try to parse as JSON
        errorData = JSON.parse(errorText);
      } catch (e) {
        // If not JSON, use the raw text
        errorData = { message: errorText };
      }

      throw new Error(
        errorData.message || `Request failed with status ${response.status}`
      );
    }

    // Parse JSON response
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`[API] Error fetching ${endpoint}:`, error);
    throw error;
  }
}

export default apiFetch;
