// ============================================================================
// CLIENTE HTTP - Configuração do Axios
// ============================================================================

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de resposta: redireciona para login se token expirar
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('@juninho-tech:token');
      localStorage.removeItem('@juninho-tech:usuario');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
