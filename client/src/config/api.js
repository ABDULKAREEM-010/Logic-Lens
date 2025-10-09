// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  // Analysis
  ANALYZE: `${API_BASE_URL}/api/analyze`,
  ANALYZE_MULTI: `${API_BASE_URL}/api/analyze/multi`,
  
  // GitHub
  GITHUB_CALLBACK: `${API_BASE_URL}/api/github/callback`,
  GITHUB_DISCONNECT: `${API_BASE_URL}/api/github/disconnect`,
  GITHUB_TEST: `${API_BASE_URL}/api/github/test`,
  
  // Stats & Admin
  STATS: `${API_BASE_URL}/api/stats`,
  
  // Feedback
  FEEDBACK: `${API_BASE_URL}/api/feedback`,
  FEEDBACK_ALL: `${API_BASE_URL}/api/feedback/all`,
};

export default API_BASE_URL;