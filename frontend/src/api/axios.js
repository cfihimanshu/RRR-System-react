import axios from 'axios';

const api = axios.create({
  baseURL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://rrr-system-react.onrender.com',
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('rrr_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('rrr_token');
      localStorage.removeItem('rrr_user_role');
      localStorage.removeItem('rrr_user_email');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
