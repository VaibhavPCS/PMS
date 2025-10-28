/**
 * Centralized configuration for backend API URLs
 * This ensures all API calls use the same base URL from environment variables
 */

/**
 * Get the backend base URL from environment variables
 * Falls back to http://pms.upda.co.in:5000 if not configured
 */
export const getBackendBaseUrl = (): string => {
  // Always use environment variable if available
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  
  if (envApiUrl) {
    return envApiUrl;
  }

  // Simple fallback - no automatic protocol switching
  return 'http://pms.upda.co.in:5000';
};

/**
 * Get the full API URL with /api-v1 suffix
 */
export const getApiBaseUrl = (): string => {
  return `${getBackendBaseUrl()}/api-v1`;
};

/**
 * Build a complete API endpoint URL
 * @param endpoint - The API endpoint (e.g., '/task/123', '/comment')
 * @returns Complete URL for the API endpoint
 */
export const buildApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

/**
 * Build a complete backend URL (for file downloads, etc.)
 * @param path - The backend path (e.g., '/uploads/file.jpg')
 * @returns Complete URL for the backend resource
 */
export const buildBackendUrl = (path: string): string => {
  const baseUrl = getBackendBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
};