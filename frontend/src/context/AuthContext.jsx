import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('rrr_token') || null);
  const [user, setUser] = useState(() => {
    const role = localStorage.getItem('rrr_user_role');
    const email = localStorage.getItem('rrr_user_email');
    const fullName = localStorage.getItem('rrr_user_fullName');
    return (role && email) ? { role, email, fullName } : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const syncUser = async () => {
      if (token) {
        try {
          const res = await api.get('/auth/me');
          const userData = {
            role: res.data.role,
            email: res.data.email,
            fullName: res.data.fullName || res.data.name || ''
          };
          setUser(userData);
          // Update localStorage with fresh DB data
          localStorage.setItem('rrr_user_role', userData.role);
          localStorage.setItem('rrr_user_email', userData.email);
          localStorage.setItem('rrr_user_fullName', userData.fullName);
        } catch (err) {
          console.error('User sync failed:', err);
          if (err.response?.status === 401 || err.response?.status === 404) {
            logout();
          }
        }
      }
      setLoading(false);
    };

    syncUser();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: newToken, role, email: userEmail, fullName } = res.data;
    localStorage.setItem('rrr_token', newToken);
    localStorage.setItem('rrr_user_role', role);
    localStorage.setItem('rrr_user_email', userEmail);
    localStorage.setItem('rrr_user_fullName', fullName || '');
    setToken(newToken);
    setUser({ role, email: userEmail, fullName: fullName || '' });
  };

  const logout = () => {
    localStorage.removeItem('rrr_token');
    localStorage.removeItem('rrr_user_role');
    localStorage.removeItem('rrr_user_email');
    localStorage.removeItem('rrr_user_fullName');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
