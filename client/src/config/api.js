import axios from 'axios';

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Request interceptor to add auth token and handle FormData
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // If sending FormData, let the browser set the correct multipart boundary
    if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
      if (config.headers) {
        delete config.headers['Content-Type'];
      }
    } else {
      // Default content type for JSON requests
      config.headers = config.headers || {};
      if (!config.headers['Content-Type']) {
        config.headers['Content-Type'] = 'application/json';
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Set default axios baseURL for backward compatibility
axios.defaults.baseURL = API_BASE_URL;

export default api;
export { API_BASE_URL };