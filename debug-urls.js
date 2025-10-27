// Debug script to test URL generation
console.log('Environment variables:');
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL);
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);

// Import our config functions
import { getBackendBaseUrl, getApiBaseUrl, buildApiUrl } from './app/lib/config.js';

console.log('Config functions output:');
console.log('getBackendBaseUrl():', getBackendBaseUrl());
console.log('getApiBaseUrl():', getApiBaseUrl());
console.log('buildApiUrl("/auth/login"):', buildApiUrl('/auth/login'));