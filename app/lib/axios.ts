import axios from 'axios';
import { getApiBaseUrl } from './config';

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include HTTP-only cookies in requests
  // Handle self-signed certificates in development
  ...(import.meta.env.DEV && {
    httpsAgent: typeof window === 'undefined' ? undefined : undefined
  })
});

export default api;
