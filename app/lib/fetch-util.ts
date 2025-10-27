import axios from "axios";
import type { InternalAxiosRequestConfig, AxiosError } from "axios";
import type { AxiosResponse } from "axios";
import { getApiBaseUrl } from "./config";

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Enable cookies for HTTP-only authentication
});

// ✅ ENHANCED REQUEST INTERCEPTOR
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  // Remove localStorage token handling - cookies are sent automatically
  
  // ✅ ADD WORKSPACE HEADER SUPPORT (Optional - for future use)
  const currentWorkspaceId = localStorage.getItem("currentWorkspaceId");
  if (currentWorkspaceId && config.url?.includes('/workspace/')) {
    if (config.headers) {
      config.headers['workspace-id'] = currentWorkspaceId;
    }
  }
  
  return config;
});

// Keep existing response interceptor and functions
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
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
