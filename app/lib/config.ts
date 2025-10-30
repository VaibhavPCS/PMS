export const getBackendBaseUrl = (): string => {
  const envApiUrl = import.meta.env.VITE_API_BASE_URL;
  if (envApiUrl) {
    return envApiUrl;
  }
  // return 'https://pms.upda.co.in:5001';
  return 'http://localhost:5000';
};

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