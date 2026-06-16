import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '../utils/axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize Auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (token && storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          // Refresh user profile details from backend
          const res = await axiosInstance.get('/profile');
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));
        } catch (error) {
          console.error('Failed to validate token on launch', error);
          // Token is invalid/expired and refresh failed
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  // Send OTP
  const sendOtp = async (email) => {
    try {
      const res = await axiosInstance.post('/auth/send-otp', { email });
      return { success: true, message: res.data.message, devOtp: res.data.devOtp };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to send OTP.' 
      };
    }
  };

  // Verify OTP
  const verifyOtp = async (email, otp) => {
    try {
      const res = await axiosInstance.post('/auth/verify-otp', { email, otp });
      const { user: userData, token } = res.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Verification failed.' 
      };
    }
  };

  // Login with OAuth (Google/GitHub)
  const loginWithOAuth = async (payload) => {
    try {
      const res = await axiosInstance.post('/auth/oauth', payload);
      const { user: userData, token } = res.data;
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      
      return { success: true, user: userData };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'OAuth login failed.' 
      };
    }
  };

  // Logout
  const logout = async () => {
    try {
      await axiosInstance.post('/auth/logout');
    } catch (error) {
      console.error('Error logging out on backend', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  // Update Profile
  const updateProfile = async (profileData) => {
    try {
      const res = await axiosInstance.put('/profile', profileData);
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      return { success: true, user: res.data };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to update profile.' 
      };
    }
  };

  // Toggle "Looking for Match" Mode
  const updateLookingForMatch = async (config) => {
    try {
      const res = await axiosInstance.put('/profile/looking-for-match', config);
      setUser(res.data);
      localStorage.setItem('user', JSON.stringify(res.data));
      return { success: true, user: res.data };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Failed to toggle status.' 
      };
    }
  };

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    sendOtp,
    verifyOtp,
    loginWithOAuth,
    logout,
    updateProfile,
    updateLookingForMatch
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
