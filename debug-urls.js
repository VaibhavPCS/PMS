/**
 * Debug Script for URL Generation Testing
 * Modified: January 2025
 * Note: This script simulates the config functions since Node.js cannot directly
 * import TypeScript files. The actual config.ts has been updated to use
 * 'https://pms.upda.co.in:5001' as the production API endpoint.
 */

// Simulate environment variables (Node.js doesn't have import.meta.env)
console.log('Environment variables (simulated):');
console.log('VITE_API_BASE_URL:', process.env.VITE_API_BASE_URL || 'undefined');
console.log('VITE_API_URL:', process.env.VITE_API_URL || 'undefined');

// Simulate the config functions with the same logic as config.ts
const getBackendBaseUrl = () => {
  // return process.env.VITE_API_BASE_URL || 'http://localhost:5000';
  return process.env.VITE_API_BASE_URL || 'https://pms.upda.co.in:5001';
};

const getApiBaseUrl = () => {
  return `${getBackendBaseUrl()}/api-v1`;
};

const buildApiUrl = (endpoint) => {
  const baseUrl = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
};

console.log('\nConfig functions output:');
console.log('getBackendBaseUrl():', getBackendBaseUrl());
console.log('getApiBaseUrl():', getApiBaseUrl());
console.log('buildApiUrl("/auth/login"):', buildApiUrl('/auth/login'));
console.log('buildApiUrl("/task/123"):', buildApiUrl('/task/123'));
console.log('buildApiUrl("comment"):', buildApiUrl('comment'));