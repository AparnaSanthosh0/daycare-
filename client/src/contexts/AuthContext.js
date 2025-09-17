import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../config/api';
import { toast } from 'react-toastify';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Set up API defaults
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const response = await api.get('/api/auth/me');
          setUser(response.data.user);
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (identifier, password) => {
    try {
      // Send as username primarily, fallback to email for backward compatibility
      const payload = identifier && identifier.includes('@')
        ? { email: identifier, password }
        : { username: identifier, password };
      const response = await api.post('/api/auth/login', payload);
      const { token, user } = response.data;
      
      localStorage.setItem('token', token);
      // Store role for client-side redirection safety (do not trust UI selection)
      try {
        // Parse role from token payload (base64url safe)
        const base64Url = token.split('.')[1] || '';
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + (4 - (base64.length % 4 || 4)) % 4, '=');
        const payloadJwt = JSON.parse(atob(padded) || '{}') || {};
        localStorage.setItem('token_payload', JSON.stringify({ role: payloadJwt.role }));
      } catch {}
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      toast.success('Login successful!');
      return { success: true, user, role: user?.role };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Exchange Firebase ID token for backend JWT and set user
  const loginWithGoogleIdToken = async (idToken) => {
    try {
      const response = await api.post('/api/auth/google', { idToken });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      toast.success('Signed in with Google');
      return { success: true, user, role: user?.role };
    } catch (error) {
      const message = error.response?.data?.message || 'Google sign-in failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const register = async (userData) => {
    try {
      const isFormData = typeof FormData !== 'undefined' && userData instanceof FormData;
      const response = await api.post('/api/auth/register', userData, {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
      });

      // If backend signals pending or if role is staff/parent, treat as submitted for approval
      const role = (userData?.get ? userData.get('role') : userData?.role) || 'parent';
      const pending = response.data?.pending === true || ['staff', 'parent'].includes(role);

      if (pending && !response.data?.token) {
        const message = response.data?.message || 'Registration submitted. Awaiting admin approval.';
        toast.success(message);
        return { success: true, pending: true, message };
      }

      // Fallback: if token returned, proceed with normal login flow
      const { token, user } = response.data;
      if (token && user) {
        localStorage.setItem('token', token);
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(user);
        toast.success('Registration successful!');
        return { success: true };
      }

      // No token and not explicitly pending -> treat as submitted
      const message = response.data?.message || 'Registration submitted successfully.';
      toast.success(message);
      return { success: true, pending: true, message };
    } catch (error) {
      const message = error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Registration failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    // Avoid duplicate toasts if logout called multiple times (e.g., StrictMode)
    if (!window.__tt_lastLogoutToast || Date.now() - window.__tt_lastLogoutToast > 1500) {
      toast.info('Logged out successfully');
      window.__tt_lastLogoutToast = Date.now();
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/api/auth/profile', profileData);
      setUser(response.data.user);
      toast.success('Profile updated successfully!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Profile update failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateProfile,
    loginWithGoogleIdToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};