import React, { createContext, useState, useContext, useEffect } from 'react';
import authService from '../services/authService';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

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
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token && authService.isAuthenticated()) {
        try {
          const response = await authService.getCurrentUser();
          if (response.status === 'success') {
            setUser(response.data);
            authService.updateUser(response.data);
          } else {
            authService.logout();
          }
        } catch (error) {
          console.error('Auth initialization error:', error);
          authService.logout();
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      if (response.status === 'success') {
        const { access_token, refresh_token, user } = response.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        toast.success('Login successful!');
        return { success: true };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      if (response.status === 'success') {
        toast.success('Registration successful! Please verify your email.');
        return { success: true, requiresVerification: true };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const verifyOtp = async (email, otp) => {
    try {
      const response = await authService.verifyOtp(email, otp);
      if (response.status === 'success') {
        const { access_token, refresh_token, user } = response.data;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        localStorage.setItem('user', JSON.stringify(user));
        setUser(user);
        toast.success('Email verified successfully!');
        return { success: true };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Verification failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const logout = () => {
    authService.logout();
    setUser(null);
    toast.success('Logged out successfully');
    navigate('/login');
  };

  const forgotPassword = async (email) => {
    try {
      const response = await authService.forgotPassword(email);
      if (response.status === 'success') {
        toast.success('Password reset OTP sent to your email');
        return { success: true };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to send OTP';
      toast.error(message);
      return { success: false, message };
    }
  };

  const resetPassword = async (email, otp, newPassword) => {
    try {
      const response = await authService.resetPassword(email, otp, newPassword);
      if (response.status === 'success') {
        toast.success('Password reset successfully!');
        return { success: true };
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Password reset failed';
      toast.error(message);
      return { success: false, message };
    }
  };

  const updateUserData = (userData) => {
    setUser(userData);
    authService.updateUser(userData);
  };

  const value = {
    user,
    loading,
    login,
    register,
    verifyOtp,
    logout,
    forgotPassword,
    resetPassword,
    updateUserData,
    isAuthenticated: authService.isAuthenticated,
    getUserRole: authService.getUserRole,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;