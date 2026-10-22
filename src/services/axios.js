import axios from "axios";
import { API_URL } from "../config/config";

const axiosInstance = axios.create({
  baseURL: API_URL,
});

// Add request interceptor to attach token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // The token is invalid/expired: drop it so the next request is anonymous
      // instead of retrying with the same dead token. (This line used to be
      // swallowed by the comment above it, so the stale token was never removed.)
      localStorage.removeItem("authToken");

      const tabId = sessionStorage.getItem("tabId");
      if (tabId) {
        sessionStorage.removeItem(`auth_${tabId}`);
      }

      // Only redirect if we're not already on the login page
      if (!window.location.pathname.includes("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
