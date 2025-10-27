import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${baseURL}/api-v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Include HTTP-only cookies in requests
});

export default api;
