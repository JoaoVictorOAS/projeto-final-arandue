import axios from 'axios';
import { Capacitor } from '@capacitor/core';

const getBaseURL = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const customUrl = window.localStorage.getItem('custom_api_url');
      if (customUrl) return customUrl;
    }
  } catch {}

  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl !== '/api') {
    return envUrl;
  }

  if (typeof Capacitor !== 'undefined' && Capacitor.isNativePlatform && Capacitor.isNativePlatform()) {
    return 'https://projeto-final-arandue.vercel.app/api';
  }

  return '/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
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
