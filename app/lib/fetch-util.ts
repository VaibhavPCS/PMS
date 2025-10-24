import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api-v1';

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ✅ ENHANCED REQUEST INTERCEPTOR
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token ?? ""}`;
  }
  
  // ✅ ADD WORKSPACE HEADER SUPPORT (Optional - for future use)
  const currentWorkspaceId = localStorage.getItem("currentWorkspaceId");
  if (currentWorkspaceId && config.url?.includes('/workspace/')) {
    config.headers['workspace-id'] = currentWorkspaceId;
  }
  
  return config;
});

// Keep existing response interceptor and functions
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      window.dispatchEvent(new Event("force-logout"));
    }
    return Promise.reject(error);
  }
);

// ✅ ALL API METHODS USING AXIOS
const postData = async <T = any>(url: string, data: unknown): Promise<T> => {
  const response = await api.post(url, data);
  return response.data;
};

const putData = async <T = any>(url: string, data: unknown): Promise<T> => {
  const response = await api.put(url, data);
  return response.data;
};

const updateData = async <T = any>(url: string, data: unknown): Promise<T> => {
  const response = await api.put(url, data);
  return response.data;
};

const fetchData = async <T = any>(url: string): Promise<T> => {
  const response = await api.get<T>(url);
  return response.data;
};

// ✅ CLEAN: Single deleteData function using axios
const deleteData = async <T = any>(url: string): Promise<T> => {
  const response = await api.delete(url);
  return response.data;
};

export { postData, putData, updateData, fetchData, deleteData };
