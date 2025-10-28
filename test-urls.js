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
  return 'http://pms.upda.co.in:5000';
};

const getApiBaseUrl = () => {
  return `${getBackendBaseUrl()}/api-v1`;
};

console.log('\nURL construction:');
console.log('getBackendBaseUrl():', getBackendBaseUrl());
console.log('getApiBaseUrl():', getApiBaseUrl());
console.log('Final auth URL would be:', getApiBaseUrl() + '/auth/login');