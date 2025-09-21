import axios from 'axios';

// API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5100';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/signin';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData: {
    email: string;
    password: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  }) => api.post('/api/auth/register', userData),

  login: (credentials: { email: string; password: string }) =>
    api.post('/api/auth/login', credentials),

  logout: () => api.post('/api/auth/logout'),

  getProfile: () => api.get('/api/auth/profile'),

  updateProfile: (profileData: {
    username?: string;
    full_name?: string;
    avatar_url?: string;
  }) => api.put('/api/auth/profile', profileData),

  googleLogin: () => api.get('/api/auth/google'),

  refreshToken: (refreshToken: string) =>
    api.post('/api/auth/refresh', { refresh_token: refreshToken }),
};

// Documents API
export const documentsAPI = {
  upload: (formData: FormData) =>
    api.post('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  getAll: () => api.get('/api/documents/all'),

  getById: (id: string) => api.get(`/api/documents/${id}`),

  delete: (id: string) => api.delete(`/api/delete/${id}`),

  getClauses: (documentId: string) =>
    api.get(`/api/clauses/${documentId}`),
};

// Query API
export const queryAPI = {
  queryDocument: (documentId: string, query: string) =>
    api.post('/api/query', {
      document_id: documentId,
      query,
    }),
};

// Feedback API
export const feedbackAPI = {
  updateFeedback: (feedbackData: {
    query_id: string;
    feedback_type: 'positive' | 'negative';
    feedback_text?: string;
  }) => api.post('/api/feedback', feedbackData),
};

// Health API
export const healthAPI = {
  check: () => api.get('/api/health'),
  testGemini: () => api.get('/test-gemini'),
};

// Admin API
export const adminAPI = {
  getAnalytics: () => api.get('/api/admin/analytics'),
  getUsers: () => api.get('/api/admin/users'),
  getUserStats: () => api.get('/api/admin/user-stats'),
};

export default api;
