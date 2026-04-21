import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Agregar token a cada solicitud
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Manejar errores de respuesta
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (email, password) => 
    apiClient.post('/auth/login', { email, password }),
  
  register: (email, password, name) => 
    apiClient.post('/auth/register', { email, password, name }),
  
  getMe: () => 
    apiClient.get('/auth/me')
};

export const analysisService = {
  uploadFile: (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return apiClient.post('/analysis/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        if (onProgress) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      }
    });
  },
  
  getAnalysis: (id) => 
    apiClient.get(`/analysis/${id}`),
  
  getHistory: () => 
    apiClient.get('/analysis/user/history')
};

export const rulesService = {
  getRules: () => 
    apiClient.get('/rules'),
  
  createRule: (rule) => 
    apiClient.post('/rules', rule),
  
  updateRule: (id, rule) => 
    apiClient.put(`/rules/${id}`, rule),
  
  deleteRule: (id) => 
    apiClient.delete(`/rules/${id}`)
};

export default apiClient;
