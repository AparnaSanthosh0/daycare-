import axios from 'axios';

// API Configuration
// Use environment variable for production, fallback to localhost for development
let API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Ensure /api suffix is always present
if (!API_BASE_URL.endsWith('/api')) {
  API_BASE_URL = API_BASE_URL + '/api';
}

console.log('🔧 API_BASE_URL configured as:', API_BASE_URL);

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

    // Prevent accidental double '/api/api' when callers include '/api' in the path.
    // Our baseURL already ends with '/api', so normalize any url starting with '/api/' → '/'
    if (typeof config.url === 'string' && config.url.startsWith('/api/')) {
      config.url = config.url.replace(/^\/api\//, '/');
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
      // Token expired or invalid - only redirect if not already on login page
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      
      // Only redirect if not already on login page to avoid loops
      if (window.location.pathname !== '/login' && window.location.pathname !== '/admin-login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Set default axios baseURL for backward compatibility
axios.defaults.baseURL = API_BASE_URL;

export default api;
export { API_BASE_URL };