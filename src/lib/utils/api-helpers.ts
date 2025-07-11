/**
 * Helper utility for working with API endpoints
 * Ensures API URLs are correctly formed regardless of the port the app is running on
 */

/**
 * Gets the base URL for API calls
 * This will return the base URL with the correct port
 */
export function getApiBaseUrl(): string {
  // Use window.location when in browser to get the current host including port
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  // Default to relative URLs if not in browser context
  return '';
}

/**
 * Creates a full API URL with the correct host and port
 * @param endpoint - The API endpoint path (e.g., '/api/cards')
 * @returns The full URL with proper host and port
 */
export function apiUrl(endpoint: string): string {
  const baseUrl = getApiBaseUrl();
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // If we have a baseUrl, use it, otherwise just use the path (for relative URLs)
  return baseUrl ? `${baseUrl}${path}` : path;
}
