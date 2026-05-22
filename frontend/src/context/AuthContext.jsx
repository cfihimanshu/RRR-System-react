import React, { createContext, useState, useEffect } from 'react';
import api from '../api/axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('rrr_token') || null);
  const [user, setUser] = useState(() => {
    let role = localStorage.getItem('rrr_user_role');
    if (role === 'SuperAdmin') role = 'Super Admin';
    const email = localStorage.getItem('rrr_user_email');
    const fullName = localStorage.getItem('rrr_user_fullName');
    const canAccessRecords = localStorage.getItem('rrr_user_canAccessRecords') === 'true';
    return (role && email) ? { role, email, fullName, canAccessRecords } : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let timer;
    const syncUser = async () => {
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          const expiryTime = payload.exp * 1000;
          const remainingTime = expiryTime - Date.now();

          if (remainingTime <= 0) {
            logout();
          } else {
            timer = setTimeout(() => {
              logout();
              window.location.href = '/login';
            }, remainingTime);
          }

          const res = await api.get('/auth/me');
          let role = res.data.role;
          if (role === 'SuperAdmin') role = 'Super Admin';
          setUser({
            role: role,
            email: res.data.email,
            fullName: res.data.fullName || res.data.name || '',
            canAccessRecords: res.data.canAccessRecords
          });
        } catch (err) {
          if (err.response?.status === 401) logout();
        }
      }
      setLoading(false);
    };

    syncUser();
    return () => timer && clearTimeout(timer);
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    let { token: newToken, role, email: userEmail, fullName, canAccessRecords } = res.data;
    if (role === 'SuperAdmin') role = 'Super Admin';
    localStorage.setItem('rrr_token', newToken);
    localStorage.setItem('rrr_user_role', role);
    localStorage.setItem('rrr_user_email', userEmail);
    localStorage.setItem('rrr_user_fullName', fullName || '');
    localStorage.setItem('rrr_user_canAccessRecords', canAccessRecords);
    setToken(newToken);
    setUser({ role, email: userEmail, fullName: fullName || '', canAccessRecords });
  };

  const logout = () => {
    localStorage.removeItem('rrr_token');
    localStorage.removeItem('rrr_user_role');
    localStorage.removeItem('rrr_user_email');
    localStorage.removeItem('rrr_user_fullName');
    localStorage.removeItem('rrr_user_canAccessRecords');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
