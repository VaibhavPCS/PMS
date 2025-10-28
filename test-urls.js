/**
 * URL Construction Test Script
 * Modified: January 2025
 * Original: 'http://pms.upda.co.in:5001' (inconsistent with main config)
 * New: 'https://pms.upda.co.in:5001' (production server - consistent with main config)
 */

// Simple test to verify URL construction
console.log('Environment variables:');
console.log('VITE_API_BASE_URL:', process.env.VITE_API_BASE_URL);
console.log('VITE_API_URL:', process.env.VITE_API_URL);

// Simulate the config functions
const getBackendBaseUrl = () => {
  const envApiUrl = process.env.VITE_API_BASE_URL;
  if (envApiUrl) {
    return envApiUrl;
  }
  // Production API endpoint (updated to HTTPS)
  return 'https://pms.upda.co.in:5001';
  
  // Previous configuration (commented out for reference)
  // return 'http://pms.upda.co.in:5001';
};

const getApiBaseUrl = () => {
  return `${getBackendBaseUrl()}/api-v1`;
};

console.log('\nURL construction:');
console.log('getBackendBaseUrl():', getBackendBaseUrl());
console.log('getApiBaseUrl():', getApiBaseUrl());
console.log('Final auth URL would be:', getApiBaseUrl() + '/auth/login');