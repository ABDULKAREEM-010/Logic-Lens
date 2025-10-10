// API utility for backend communication
const API_BASE_URL = 'http://localhost:5000';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// Get authentication token from Supabase session
const getAuthToken = async () => {
  // Dynamic import to avoid circular dependencies
  const { supabase } = await import('../supabaseClient');
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

// Generic API call function with error handling and authentication
const apiCall = async (endpoint, options = {}) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = await getAuthToken();
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Network or other errors
    throw new ApiError(`Network error: ${error.message}`, 0, error);
  }
};

// Teams API functions
export const teamsAPI = {
  // Get team members with statistics
  getMembers: async (teamId) => {
    return await apiCall(`/api/teams/${teamId}/members`);
  },

  // Get team info and member info for current user
  getTeamInfo: async (teamId) => {
    return await apiCall(`/api/teams/${teamId}/info`);
  },

  // Get member's personal feedback for a team
  getMyFeedback: async (teamId) => {
    return await apiCall(`/api/teams/${teamId}/my-feedback`);
  },

  // Create a new team
  createTeam: async (teamName) => {
    return await apiCall('/api/teams', {
      method: 'POST',
      body: JSON.stringify({ team_name: teamName }),
    });
  },

  // Join a team
  joinTeam: async (teamId) => {
    return await apiCall(`/api/teams/${teamId}/join`);
  },

  // Update member role
  updateMemberRole: async (teamId, userId, role) => {
    return await apiCall(`/api/teams/${teamId}/members/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  // Remove team member
  removeMember: async (teamId, userId) => {
    return await apiCall(`/api/teams/${teamId}/members/${userId}`, {
      method: 'DELETE',
    });
  },

  // Leave team (self-removal)
  leaveTeam: async (teamId) => {
    return await apiCall(`/api/teams/${teamId}/leave`, {
      method: 'POST',
    });
  },

  // Get team analytics
  getAnalytics: async (teamId) => {
    return await apiCall(`/api/teams/${teamId}/analytics`);
  },

  // Leader dashboard - get all team feedback
  getLeaderDashboard: async (teamId) => {
    return await apiCall(`/api/teams/${teamId}/dashboard`);
  },

  // Fix team roles (utility endpoint)
  fixRoles: async () => {
    return await apiCall('/api/teams/fix-roles', {
      method: 'POST',
    });
  },
};

// Feedback API functions (existing backend endpoints)
export const feedbackAPI = {
  // Submit code analysis feedback (accept/reject)
  submitCodeFeedback: async (feedbackData) => {
    return await apiCall('/api/feedback', {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    });
  },

  // Submit peer feedback
  submitPeerFeedback: async (feedbackData) => {
    return await apiCall('/api/feedback/submit', {
      method: 'POST',
      body: JSON.stringify(feedbackData),
    });
  },

  // Get user's feedback for a specific team
  getMyTeamFeedback: async (teamId) => {
    return await apiCall(`/api/feedback/my/${teamId}`);
  },

  // Get all feedback with optional filters
  getAllFeedback: async (filters = {}) => {
    const params = new URLSearchParams(filters);
    const queryString = params.toString();
    return await apiCall(`/api/feedback/all${queryString ? `?${queryString}` : ''}`);
  },

  // Get feedback received by user in a team
  getReceivedFeedback: async (teamId) => {
    return await apiCall(`/api/feedback/received/${teamId}`);
  },
};

// Stats API functions (existing backend endpoints)
export const statsAPI = {
  getDashboardStats: async () => {
    return await apiCall('/api/stats');
  },
};

// Analysis API functions (existing backend endpoints)
export const analysisAPI = {
  analyzeCode: async (codeData) => {
    return await apiCall('/api/analyze', {
      method: 'POST',
      body: JSON.stringify(codeData),
    });
  },

  analyzeMultipleFiles: async (formData) => {
    return await apiCall('/api/analyze/multi', {
      method: 'POST',
      body: formData,
      headers: {}, // Remove Content-Type for FormData
    });
  },
};

// Export ApiError class separately since it's defined with class declaration
export { ApiError };

// Default export for convenience
export default {
  teamsAPI,
  feedbackAPI,
  statsAPI,
  analysisAPI,
  ApiError,
};