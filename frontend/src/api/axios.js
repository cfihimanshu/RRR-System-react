import axios from 'axios';
import { decryptData } from '../utils/cryptoUtils';

const api = axios.create({
  baseURL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://api.cfi247.com/api',
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
  (response) => {
    // Automatically decrypt if the response is wrapped in our encryption object
    if (response.data && response.data._enc) {
      const decrypted = decryptData(response.data._enc);
      // If decryption worked, use the decrypted data
      if (decrypted !== null && decrypted !== undefined) {
        response.data = decrypted;
      }
    }
    return response;
  },
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
