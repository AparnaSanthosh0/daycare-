import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../config/api';
import { toast } from 'react-toastify';
import { debugAuth } from '../utils/debugAuth';
import firebase from '../config/firebase';

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
          const response = await api.get('/auth/me');
          setUser(response.data.user);
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
          // Don't redirect here - let the API interceptor handle it if needed
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  // Expose a refresh function for components to re-pull latest user (e.g., after profile image upload)
  const refreshUser = async () => {
    try {
      const resp = await api.get('/auth/me');
      setUser(resp.data.user);
      return resp.data.user;
    } catch (e) {
      console.error('refreshUser failed:', e);
      return null;
    }
  };

  const login = async (identifier, password) => {
    try {
      console.log('🔐 Attempting login with:', identifier);
      
      // Send as username primarily, fallback to email for backward compatibility
      const payload = identifier && identifier.includes('@')
        ? { email: identifier, password }
        : { username: identifier, password };
      
      console.log('📤 Sending login request:', { email: payload.email, username: payload.username });
      console.log('🌐 API base URL:', api.defaults.baseURL);
      console.log('🔗 Full URL will be:', `${api.defaults.baseURL}/auth/login`);
      const response = await api.post('/auth/login', payload);
      const { token, user } = response.data;
      
      console.log('✅ Login successful, received token:', token ? `${token.substring(0, 50)}...` : 'No token');
      console.log('👤 User data:', user);
      
      localStorage.setItem('token', token);
      // Store role for client-side redirection safety (do not trust UI selection)
      try {
        // Parse role from token payload (base64url safe)
        const base64Url = token.split('.')[1] || '';
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64.padEnd(base64.length + (4 - (base64.length % 4 || 4)) % 4, '=');
        const payloadJwt = JSON.parse(atob(padded) || '{}') || {};
        localStorage.setItem('token_payload', JSON.stringify({ role: payloadJwt.role }));
        console.log('🔑 Token payload parsed:', payloadJwt);
      } catch (e) {
        console.warn('⚠️ Could not parse token payload:', e);
      }
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      
      // Avoid showing duplicate toasts repeatedly; throttle within a session
      const key = 'tt_login_toast_shown';
      const lastShown = Number(sessionStorage.getItem(key) || 0);
      const now = Date.now();
      if (!lastShown || now - lastShown > 30000) { // 30s throttle
        toast.success('Login successful!');
        sessionStorage.setItem(key, String(now));
      }
      
      console.log('🎯 User state updated, returning success with role:', user?.role);
      return { success: true, user, role: user?.role };
    } catch (error) {
      console.error('❌ Login failed:', error);
      console.error('Response:', error.response?.data);
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  // Alternative Google auth using redirect instead of popup
  const loginWithGoogleRedirect = async () => {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      // Use redirect instead of popup to avoid COOP issues
      await firebase.auth().signInWithRedirect(provider);
    } catch (error) {
      console.error('Google redirect auth error:', error);
      toast.error('Google authentication failed');
    }
  };

  // Handle redirect result
  const handleRedirectResult = async () => {
    try {
      const result = await firebase.auth().getRedirectResult();
      if (result.credential) {
        const idToken = await result.user.getIdToken();
        return await loginWithGoogleIdToken(idToken);
      }
    } catch (error) {
      console.error('Redirect result error:', error);
    }
    return { success: false };
  };

  // Exchange Firebase ID token for backend JWT and set user
  const loginWithGoogleIdToken = async (idToken) => {
    try {
      const response = await api.post('/auth/google', { idToken });
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);
      toast.success('Signed in with Google');
      return { success: true, user, role: user?.role };
    } catch (error) {
      console.error('Google sign-in error:', error);
      const message = error.response?.data?.message || 'Google sign-in failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const register = async (userData) => {
    try {
      const isFormData = typeof FormData !== 'undefined' && userData instanceof FormData;
      const response = await api.post('/auth/register', userData, {
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
    // Removed logout toast per request to avoid showing a banner after logout
  };

  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/auth/profile', profileData);
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
    loginWithGoogleIdToken,
    loginWithGoogleRedirect,
    handleRedirectResult,
    refreshUser,
    debugAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};