import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    let token = null;
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        token = window.localStorage.getItem('token');
      }
    } catch {}

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
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem('token');
          window.localStorage.removeItem('usuario');
        }
      } catch {}
    }
    return Promise.reject(error);
  }
);

export default api;
