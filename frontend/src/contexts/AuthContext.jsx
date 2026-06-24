import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('access_token'));
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Toast system
  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      removeToast(id);
    }, 4000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Fetch current user details on load
  const loadUser = async (authToken) => {
    try {
      const userData = await api.get('/auth/me', authToken);
      setUser(userData);
    } catch (err) {
      console.error("Failed to load user info:", err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadUser(token);
    } else {
      setLoading(false);
    }
  }, [token]);

  // Login handler
  const login = async (username, password) => {
    try {
      const data = await api.post('/auth/login', { username, password });
      
      if (data.isAdmin) {
        localStorage.setItem('access_token', data.accessToken);
        setToken(data.accessToken);
        setUser({ username: 'admin1234', role: 'admin' });
        addToast('Welcome, Administrator.', 'success');
        return { success: true, isAdmin: true };
      }

      localStorage.setItem('access_token', data.accessToken);
      localStorage.setItem('refresh_token', data.refreshToken);
      setToken(data.accessToken);
      setUser(data.user);
      addToast(`Logged in as ${data.user.username}`, 'success');
      return { success: true, isAdmin: false };
    } catch (err) {
      addToast(err.message || 'Invalid credentials.', 'danger');
      return { success: false, message: err.message || 'Invalid credentials.' };
    }
  };

  // Register handler
  const register = async (formData) => {
    try {
      const data = await api.post('/auth/register', formData);
      localStorage.setItem('access_token', data.accessToken);
      localStorage.setItem('refresh_token', data.refreshToken);
      setToken(data.accessToken);
      setUser(data.user);
      addToast(`Account created! Logged in as ${data.user.username}`, 'success');
      return { success: true };
    } catch (err) {
      const msg = err.message || 'Registration failed.';
      addToast(msg, 'danger');
      return { success: false, error: msg };
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      if (token) await api.post('/auth/logout', {}, token);
    } catch (err) {
      console.error("Logout request error", err);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      setToken(null);
      setUser(null);
      addToast('Logged out!', 'info');
    }
  };

  // Sync / refresh user details (e.g. after budget deductions)
  const refreshUser = async () => {
    if (token) {
      try {
        const userData = await api.get('/auth/me', token);
        setUser(userData);
      } catch (err) {
        console.error("Error refreshing user budget", err);
      }
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      refreshUser,
      toasts,
      addToast,
      removeToast
    }}>
      {children}
    </AuthContext.Provider>
  );
};
