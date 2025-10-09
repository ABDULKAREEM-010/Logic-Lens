import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { teamsAPI, feedbackAPI, ApiError } from "../utils/api";

// Feedback Submission Form Component
const FeedbackSubmissionForm = ({ teamMembers, currentUserId, teamId, onFeedbackSubmitted }) => {
  const [selectedMember, setSelectedMember] = useState('');
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState('general');
  const [comments, setComments] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');

  // Filter out current user from team members
  const otherMembers = teamMembers.filter(member => member.user_id !== currentUserId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedMember || !rating || !comments.trim()) {
      setSubmitMessage('❌ Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setSubmitMessage('');

    try {
      const feedbackData = {
        team_id: teamId,
        reviewee_id: selectedMember,
        rating: parseInt(rating),
        category,
        comments: comments.trim(),
        suggestions: suggestions.trim()
      };

      await feedbackAPI.submitPeerFeedback(feedbackData);
      
      // Reset form
      setSelectedMember('');
      setRating(5);
      setCategory('general');
      setComments('');
      setSuggestions('');
      
      setSubmitMessage('✅ Feedback submitted successfully!');
      
      // Call parent callback to refresh data
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted();
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSubmitMessage(''), 3000);

    } catch (error) {
      console.error('Error submitting feedback:', error);
      setSubmitMessage(`❌ ${error.message || 'Failed to submit feedback'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedMemberInfo = teamMembers.find(member => member.user_id === selectedMember);

  return (
    <div className="space-y-6">
      {/* Status Message */}
      {submitMessage && (
        <div className={`p-4 rounded-lg border text-center font-medium ${
          submitMessage.includes('✅') 
            ? 'bg-green-500 bg-opacity-20 border-green-400 border-opacity-50 text-green-200'
            : 'bg-red-500 bg-opacity-20 border-red-400 border-opacity-50 text-red-200'
        }`}>
          {submitMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Member Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-white font-semibold mb-3">
              👤 Select Team Member *
            </label>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              className="w-full bg-black bg-opacity-40 border border-gray-600 border-opacity-50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
              required
            >
              <option value="">Choose a team member...</option>
              {otherMembers.map(member => (
                <option key={member.user_id} value={member.user_id}>
                  {member.user_profiles?.full_name || 
                   member.user_profiles?.username || 
                   member.user_profiles?.email?.split('@')[0] || 
                   `Member ${member.user_id?.substring(0, 8)}`}
                  {member.role === 'owner' ? ' (Owner)' : ''}
                </option>
              ))}
            </select>
            
            {/* Selected Member Preview */}
            {selectedMemberInfo && (
              <div className="mt-3 p-3 bg-indigo-500 bg-opacity-20 rounded-lg border border-indigo-400 border-opacity-30">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {(selectedMemberInfo.user_profiles?.full_name?.charAt(0) ||
                      selectedMemberInfo.user_profiles?.email?.charAt(0))?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <p className="text-white font-medium">
                      {selectedMemberInfo.user_profiles?.full_name || 
                       selectedMemberInfo.user_profiles?.username || 
                       'Team Member'}
                    </p>
                    <p className="text-indigo-200 text-sm">
                      {selectedMemberInfo.user_profiles?.email || selectedMemberInfo.user_id}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-white font-semibold mb-3">
              ⭐ Rating *
            </label>
            <select
              value={rating}
              onChange={(e) => setRating(e.target.value)}
              className="w-full bg-black bg-opacity-40 border border-gray-600 border-opacity-50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50"
              required
            >
              <option value={5}>⭐⭐⭐⭐⭐ Excellent (5)</option>
              <option value={4}>⭐⭐⭐⭐ Good (4)</option>
              <option value={3}>⭐⭐⭐ Average (3)</option>
              <option value={2}>⭐⭐ Below Average (2)</option>
              <option value={1}>⭐ Needs Improvement (1)</option>
            </select>
          </div>
        </div>

        {/* Category Selection */}
        <div>
          <label className="block text-white font-semibold mb-3">
            🏷️ Feedback Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full bg-black bg-opacity-40 border border-gray-600 border-opacity-50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:ring-opacity-50"
          >
            <option value="general">💬 General Feedback</option>
            <option value="code_quality">💻 Code Quality</option>
            <option value="collaboration">🤝 Collaboration</option>
            <option value="communication">📞 Communication</option>
            <option value="problem_solving">🧠 Problem Solving</option>
            <option value="leadership">👑 Leadership</option>
            <option value="creativity">🎨 Creativity</option>
            <option value="performance">📈 Performance</option>
          </select>
        </div>

        {/* Comments */}
        <div>
          <label className="block text-white font-semibold mb-3">
            💬 Comments * 
            <span className="text-white opacity-60 font-normal text-sm ml-2">
              (Share your thoughts and feedback)
            </span>
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className="w-full bg-black bg-opacity-40 border border-gray-600 border-opacity-50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 resize-none"
            rows={4}
            placeholder="Describe their performance, collaboration, contributions, or areas of excellence..."
            required
          />
          <div className="text-right text-white opacity-60 text-sm mt-1">
            {comments.length}/500 characters
          </div>
        </div>

        {/* Suggestions */}
        <div>
          <label className="block text-white font-semibold mb-3">
            💡 Suggestions for Improvement
            <span className="text-white opacity-60 font-normal text-sm ml-2">
              (Optional constructive feedback)
            </span>
          </label>
          <textarea
            value={suggestions}
            onChange={(e) => setSuggestions(e.target.value)}
            className="w-full bg-black bg-opacity-40 border border-gray-600 border-opacity-50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50 resize-none"
            rows={3}
            placeholder="Optional: Suggest areas where they could improve or grow further..."
          />
          <div className="text-right text-white opacity-60 text-sm mt-1">
            {suggestions.length}/300 characters
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-center pt-4">
          <button
            type="submit"
            disabled={isSubmitting || !selectedMember || !comments.trim()}
            className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:from-gray-500 disabled:to-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-lg transition duration-300 transform hover:scale-105 disabled:hover:scale-100 shadow-lg border border-green-400 border-opacity-50"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Submitting Feedback...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                📝 Submit Feedback
              </div>
            )}
          </button>
        </div>
      </form>

      {/* Instructions */}
      <div className="bg-blue-500 bg-opacity-20 rounded-lg p-4 border border-blue-400 border-opacity-30">
        <h4 className="text-blue-200 font-semibold mb-2 flex items-center gap-2">
          ℹ️ Feedback Guidelines
        </h4>
        <ul className="text-blue-200 text-sm space-y-1">
          <li>• Be constructive and specific in your feedback</li>
          <li>• Focus on behaviors and work quality, not personal traits</li>
          <li>• Highlight both strengths and areas for improvement</li>
          <li>• Keep feedback professional and respectful</li>
          <li>• Your feedback will help improve team collaboration and performance</li>
        </ul>
      </div>
    </div>
  );
};

const MemberDashboard = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [teamInfo, setTeamInfo] = useState(null);
  const [memberInfo, setMemberInfo] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [myFeedback, setMyFeedback] = useState([]);
  const [receivedFeedback, setReceivedFeedback] = useState([]);
  const [myStats, setMyStats] = useState({
    totalFeedback: 0,
    avgRating: 0,
    recentActivity: 0,
    acceptanceRate: 0
  });
  const [accessDenied, setAccessDenied] = useState(false);
  const [error, setError] = useState(null);
  const [isLeavingTeam, setIsLeavingTeam] = useState(false);
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);

  useEffect(() => {
    if (!teamId) return;
    fetchMemberData();
  }, [teamId]);

  const fetchMemberData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }

      console.log('Authenticated user:', user.id, user.email);

      // Get team information and member info using backend API
      try {
        const teamInfoResponse = await teamsAPI.getTeamInfo(teamId);
        setTeamInfo(teamInfoResponse.team);
        setMemberInfo(teamInfoResponse.memberInfo);
      } catch (error) {
        if (error.status === 403) {
          console.error('Access denied: User is not a member of this team');
          setAccessDenied(true);
          setLoading(false);
          return;
        }
        throw error;
      }

      // Get team members using backend API
      try {
        console.log('Fetching team members for teamId:', teamId);
        const membersResponse = await teamsAPI.getMembers(teamId);
        console.log('Members response:', membersResponse);
        
        if (membersResponse && membersResponse.members) {
          setTeamMembers(membersResponse.members);
          console.log('Set team members:', membersResponse.members.length, 'members');
        } else {
          console.warn('No members data in response:', membersResponse);
          setTeamMembers([]);
        }
      } catch (error) {
        console.error('Error fetching team members:', error);
        console.error('Error details:', {
          message: error.message,
          status: error.status,
          data: error.data
        });
        // Continue with other data even if members fetch fails
        setTeamMembers([]);
      }

      // Get my feedback using backend API
      try {
        const feedbackResponse = await teamsAPI.getMyFeedback(teamId);
        const feedback = feedbackResponse.feedback || [];
        const stats = feedbackResponse.stats || {};
        
        setMyFeedback(feedback);
        setMyStats({
          totalFeedback: stats.totalFeedback || 0,
          avgRating: stats.avgRating || 0,
          recentActivity: stats.recentActivity || 0,
          acceptanceRate: stats.acceptanceRate || 0
        });
      } catch (error) {
        console.error('Error fetching feedback data:', error);
        // Set default values if feedback fetch fails
        setMyFeedback([]);
        setMyStats({
          totalFeedback: 0,
          avgRating: 0,
          recentActivity: 0,
          acceptanceRate: 0
        });
      }

      // Get received feedback using backend API
      try {
        const receivedFeedbackResponse = await feedbackAPI.getReceivedFeedback(teamId);
        setReceivedFeedback(receivedFeedbackResponse || []);
      } catch (error) {
        console.error('Error fetching received feedback:', error);
        setReceivedFeedback([]);
      }

    } catch (error) {
      console.error('Error fetching member data:', error);
      if (error instanceof ApiError && error.status === 401) {
        navigate('/login');
      } else {
        setError(error.message || 'Failed to load dashboard data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveTeam = () => {
    setShowLeaveConfirmation(true);
  };

  const confirmLeaveTeam = async () => {
    try {
      setIsLeavingTeam(true);
      setError(null);

      console.log('🚪 Leaving team:', teamId);
      
      const response = await teamsAPI.leaveTeam(teamId);
      console.log('✅ Successfully left team:', response);

      // Redirect to teams page after successful leave
      navigate('/teams');
      
    } catch (error) {
      console.error('❌ Error leaving team:', error);
      setError(error.message || 'Failed to leave team. Please try again.');
    } finally {
      setIsLeavingTeam(false);
      setShowLeaveConfirmation(false);
    }
  };

  const cancelLeaveTeam = () => {
    setShowLeaveConfirmation(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="bg-white bg-opacity-5 backdrop-blur-lg rounded-2xl p-8 text-center border border-white border-opacity-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <h3 className="text-xl font-bold text-white mb-2">Loading Dashboard</h3>
          <p className="text-white opacity-70">Please wait while we fetch your team information...</p>
        </div>
      </div>
    );
  }

  // Access denied UI
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 flex items-center justify-center">
        <div className="bg-white bg-opacity-5 backdrop-blur-lg rounded-2xl p-8 max-w-md mx-4 text-center border border-white border-opacity-10">
          <div className="text-6xl mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-white opacity-90 mb-6">
            You are not a member of this team. Please join the team first or check if you have the correct team link.
          </p>
          <Link 
            to="/teams" 
            className="inline-block bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-6 rounded-lg transition duration-300 transform hover:scale-105"
          >
            Back to Teams
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 member-dashboard relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-10 animate-pulse animation-delay-4000"></div>
      </div>
      
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-500 bg-opacity-20 border border-red-500 border-opacity-50 rounded-lg p-4 text-center">
            <div className="text-red-200 font-medium">⚠️ Error Loading Dashboard</div>
            <div className="text-red-300 text-sm mt-1">{error}</div>
            <button 
              onClick={() => { setError(null); fetchMemberData(); }}
              className="mt-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded transition duration-200"
            >
              Try Again
            </button>
          </div>
        )}
        
        {/* Enhanced Header */}
        <div className="text-center mb-12">
          <div className="bg-gradient-to-r from-slate-800/80 to-slate-900/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-600/30 shadow-2xl relative overflow-hidden">
            {/* Header Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 rounded-3xl"></div>
            
            <div className="relative z-10">
              <div className="flex justify-center mb-4">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center shadow-xl ring-4 ring-purple-500/20">
                  <span className="text-3xl">👤</span>
                </div>
              </div>
              
              <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-4">
                Member Dashboard
              </h1>
              
              <p className="text-xl text-slate-200 mb-6 font-medium">
                {teamInfo ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="text-purple-400">✨</span>
                    Welcome to <span className="text-blue-400 font-semibold">"{teamInfo.team_name}"</span>
                    <span className="text-purple-400">✨</span>
                  </span>
                ) : (
                  `Team ${teamId}`
                )}
              </p>
              
              {memberInfo && (
                <div className="flex justify-center items-center gap-4 flex-wrap">
                  <span className={`px-6 py-2 rounded-full text-sm font-semibold shadow-lg border-2 ${
                    memberInfo.role === 'owner' 
                      ? 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-yellow-400/50'
                      : memberInfo.role === 'lead' 
                      ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-blue-400/50'
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white border-purple-400/50'
                  }`}>
                    {memberInfo.role === 'owner' ? '👑 Team Owner' : 
                     memberInfo.role === 'lead' ? '⭐ Team Lead' : '👤 Member'}
                  </span>
                  <span className="text-slate-300 text-sm flex items-center gap-1 bg-slate-700/50 px-4 py-2 rounded-full">
                    <span className="text-green-400">📅</span>
                    Joined {new Date(memberInfo.joined_at).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="group relative card-hover animation-delay-100">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
            <div className="relative bg-slate-800/80 backdrop-blur-xl rounded-2xl p-8 border border-slate-600/30 shadow-xl glass glow-border">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-2xl">📈</span>
                </div>
                <h3 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {myStats.totalFeedback}
                </h3>
                <p className="text-slate-300 font-medium">Total Feedback Submitted</p>
                <div className="mt-3 w-full bg-slate-700/50 rounded-full h-2">
                  <div 
                    className="progress-bar h-2 rounded-full transition-all duration-500"
                    style={{width: `${Math.min((myStats.totalFeedback / 20) * 100, 100)}%`}}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="group relative card-hover animation-delay-200">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
            <div className="relative bg-slate-800/80 backdrop-blur-xl rounded-2xl p-8 border border-slate-600/30 shadow-xl glass glow-border">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-2xl">✅</span>
                </div>
                <h3 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  {myStats.acceptanceRate}%
                </h3>
                <p className="text-slate-300 font-medium">Acceptance Rate</p>
                <div className="mt-3 w-full bg-slate-700/50 rounded-full h-2">
                  <div 
                    className="progress-bar h-2 rounded-full transition-all duration-500"
                    style={{width: `${myStats.acceptanceRate}%`}}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-red-600 rounded-2xl blur-lg opacity-25 group-hover:opacity-40 transition-opacity duration-300"></div>
            <div className="relative bg-slate-800/80 backdrop-blur-xl rounded-2xl p-8 border border-slate-600/30 shadow-xl hover:shadow-2xl transition-all duration-300 hover:transform hover:scale-105">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-2xl">🔥</span>
                </div>
                <h3 className="text-3xl font-bold text-white mb-2 bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                  {myStats.recentActivity}
                </h3>
                <p className="text-slate-300 font-medium">Recent Activity (7 days)</p>
                <div className="mt-3 w-full bg-slate-700/50 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-500"
                    style={{width: `${Math.min((myStats.recentActivity / 10) * 100, 100)}%`}}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Recent Feedback Section */}
        <div className="mb-12">
          <div className="bg-slate-800/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-600/30 shadow-2xl relative overflow-hidden">
            {/* Section Background Glow */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
            
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl">📝</span>
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                  Recent Feedback
                </h2>
              </div>
              <span className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-200 px-6 py-2 rounded-full text-sm font-semibold border border-indigo-400/30 shadow-lg">
                ✨ Latest 5 Entries
              </span>
            </div>
            
            {myFeedback.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-600/30">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-slate-600/50 bg-gradient-to-r from-slate-700/80 to-slate-800/80">
                      <th className="text-left py-4 px-6 text-slate-200 font-semibold tracking-wide">📊 Status</th>
                      <th className="text-left py-4 px-6 text-slate-200 font-semibold tracking-wide">🏷️ Type</th>
                      <th className="text-center py-4 px-6 text-slate-200 font-semibold tracking-wide">📅 Date</th>
                      <th className="text-left py-4 px-6 text-slate-200 font-semibold tracking-wide">💡 Suggestion</th>
                      <th className="text-left py-4 px-6 text-slate-200 font-semibold tracking-wide">💬 Comments</th>
                      <th className="text-center py-4 px-6 text-slate-200 font-semibold tracking-wide">⚙️ Technical</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-600/30">
                    {myFeedback.slice(0, 5).map((feedback, index) => (
                      <tr key={feedback.id || index} className="hover:bg-slate-700/50 transition-all duration-300 group">
                        {/* Status Column */}
                        <td className="py-6 px-6">
                          <span className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-semibold shadow-lg transform group-hover:scale-105 transition-transform duration-200 ${
                            feedback.decision === 'accepted' 
                              ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-green-500/25'
                              : feedback.decision === 'rejected'
                              ? 'bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-red-500/25'
                              : 'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-slate-500/25'
                          }`}>
                            {feedback.decision === 'accepted' ? '✅ Accepted' : 
                             feedback.decision === 'rejected' ? '❌ Rejected' : '⏳ Pending'}
                          </span>
                        </td>
                        
                        {/* Suggestion Type Column */}
                        <td className="py-6 px-6">
                          <span className="bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-200 px-4 py-2 rounded-xl text-sm font-semibold border border-blue-400/30 shadow-lg backdrop-blur-sm transform group-hover:scale-105 transition-transform duration-200">
                            {feedback.suggestion_type || 'General'}
                          </span>
                        </td>
                        
                        {/* Date Column */}
                        <td className="py-6 px-6 text-center">
                          <div className="bg-slate-700/50 rounded-xl px-4 py-3 inline-block shadow-lg backdrop-blur-sm transform group-hover:scale-105 transition-transform duration-200">
                            <div className="text-slate-200 text-sm font-semibold">
                              {new Date(feedback.created_at).toLocaleDateString()}
                            </div>
                            <div className="text-slate-400 text-xs mt-1">
                              {new Date(feedback.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </td>
                        
                        {/* Suggestion Text Column */}
                        <td className="py-6 px-6">
                          <div className="max-w-sm">
                            {feedback.suggestion ? (
                              <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-xl p-4 border border-indigo-400/30 shadow-lg backdrop-blur-sm transform group-hover:scale-105 transition-transform duration-200">
                                <p className="text-slate-200 text-sm leading-relaxed">
                                  {feedback.suggestion.length > 100 
                                    ? `${feedback.suggestion.substring(0, 100)}...` 
                                    : feedback.suggestion}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-sm italic bg-slate-700/30 px-3 py-2 rounded-lg">No suggestion text</span>
                            )}
                          </div>
                        </td>
                        
                        {/* Comments Column */}
                        <td className="py-6 px-6">
                          <div className="max-w-sm">
                            {feedback.comment ? (
                              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl p-4 border border-purple-400/30 shadow-lg backdrop-blur-sm transform group-hover:scale-105 transition-transform duration-200">
                                <p className="text-slate-200 text-sm leading-relaxed">
                                  {feedback.comment.length > 80 
                                    ? `${feedback.comment.substring(0, 80)}...` 
                                    : feedback.comment}
                                </p>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-sm italic bg-slate-700/30 px-3 py-2 rounded-lg">No comments</span>
                            )}
                          </div>
                        </td>
                        
                        {/* Technical Details Column */}
                        <td className="py-6 px-6 text-center">
                          <div className="bg-slate-700/50 rounded-xl p-4 space-y-3 shadow-lg backdrop-blur-sm transform group-hover:scale-105 transition-transform duration-200">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-xs text-slate-400 font-medium">Lang:</span>
                              <span className="bg-gradient-to-r from-orange-500/30 to-amber-500/30 text-orange-200 px-3 py-1 rounded-lg text-xs font-semibold border border-orange-400/30">
                                {(feedback.language || 'Unknown').toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-xs text-slate-400 font-medium">Source:</span>
                              <span className="bg-gradient-to-r from-cyan-500/30 to-teal-500/30 text-cyan-200 px-3 py-1 rounded-lg text-xs font-semibold border border-cyan-400/30">
                                {(feedback.source || 'Static').charAt(0).toUpperCase() + (feedback.source || 'Static').slice(1)}
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                
                {/* Show total count if more than 5 */}
                {myFeedback.length > 5 && (
                  <div className="mt-4 text-center">
                    <span className="text-white opacity-60 text-sm bg-black bg-opacity-40 px-4 py-2 rounded-lg">
                      Showing 5 of {myFeedback.length} total feedback entries
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-20">
                <div className="relative mb-8">
                  <div className="w-32 h-32 mx-auto bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center shadow-2xl border border-indigo-400/30">
                    <span className="text-6xl">📋</span>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl"></div>
                </div>
                
                <h3 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent mb-4">
                  No Feedback History
                </h3>
                <p className="text-slate-300 text-lg mb-2">You haven't submitted any feedback yet</p>
                <p className="text-slate-400 mb-8 max-w-md mx-auto">
                  Start analyzing code to build your feedback history and track your contributions to the team
                </p>
                
                <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-2xl p-6 border border-indigo-400/20 backdrop-blur-sm max-w-lg mx-auto">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <span className="text-lg">💡</span>
                    </div>
                    <h4 className="text-indigo-200 font-semibold text-lg">Pro Tip</h4>
                  </div>
                  <p className="text-indigo-200/80 text-sm leading-relaxed">
                    Use the code analysis feature to provide feedback and suggestions to your team members. 
                    Your insights help improve code quality and team collaboration.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Give Feedback Section */}
        <div className="mb-12">
          <div className="bg-slate-800/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-600/30 shadow-2xl relative overflow-hidden">
            {/* Section Background Glow */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500"></div>
            
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl">💝</span>
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  Give Feedback to Team Members
                </h2>
              </div>
              <span className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-200 px-6 py-2 rounded-full text-sm font-semibold border border-green-400/30 shadow-lg">
                🎯 Peer Review
              </span>
            </div>

            <FeedbackSubmissionForm 
              teamMembers={teamMembers} 
              currentUserId={memberInfo?.user_id}
              teamId={teamId}
              onFeedbackSubmitted={() => {
                // Refresh data after feedback submission
                fetchMemberData();
              }}
            />
          </div>
        </div>

        {/* Enhanced Received Feedback Section */}
        <div className="mb-12">
          <div className="bg-slate-800/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-600/30 shadow-2xl relative overflow-hidden">
            {/* Section Background Glow */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500"></div>
            
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl">📥</span>
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Feedback Received from Team
                </h2>
              </div>
              <span className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-purple-200 px-6 py-2 rounded-full text-sm font-semibold border border-purple-400/30 shadow-lg">
                ⭐ {receivedFeedback.length} Reviews
              </span>
            </div>

            {receivedFeedback.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-white border-opacity-10 bg-black bg-opacity-40">
                      <th className="text-left py-3 px-3 text-white opacity-90 font-semibold">👤 From</th>
                      <th className="text-center py-3 px-3 text-white opacity-90 font-semibold">⭐ Rating</th>
                      <th className="text-left py-3 px-3 text-white opacity-90 font-semibold">🏷️ Category</th>
                      <th className="text-center py-3 px-3 text-white opacity-90 font-semibold">📅 Date</th>
                      <th className="text-left py-3 px-3 text-white opacity-90 font-semibold">💬 Comments</th>
                      <th className="text-left py-3 px-3 text-white opacity-90 font-semibold">💡 Suggestions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white divide-opacity-10">
                    {receivedFeedback.map((feedback, index) => (
                      <tr key={feedback.id || index} className="hover:bg-white hover:bg-opacity-5 transition-colors duration-200">
                        {/* Reviewer Column */}
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {(feedback.reviewer_profile?.full_name?.charAt(0) ||
                                feedback.reviewer_profile?.email?.charAt(0))?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <p className="text-white font-medium">
                                {feedback.reviewer_profile?.full_name || 
                                 feedback.reviewer_profile?.username || 
                                 'Team Member'}
                              </p>
                              <p className="text-white opacity-60 text-sm">
                                {feedback.reviewer_profile?.email || 'Unknown'}
                              </p>
                            </div>
                          </div>
                        </td>
                        
                        {/* Rating Column */}
                        <td className="py-4 px-3 text-center">
                          <div className={`inline-flex items-center px-3 py-2 rounded-lg font-bold ${
                            feedback.rating >= 4 ? 'bg-green-500 bg-opacity-20 text-green-300' :
                            feedback.rating >= 3 ? 'bg-yellow-500 bg-opacity-20 text-yellow-300' : 
                            'bg-red-500 bg-opacity-20 text-red-300'
                          }`}>
                            {'⭐'.repeat(feedback.rating)} ({feedback.rating}/5)
                          </div>
                        </td>
                        
                        {/* Category Column */}
                        <td className="py-4 px-3">
                          <span className="bg-blue-500 bg-opacity-30 text-blue-200 px-3 py-1 rounded-full text-xs font-medium border border-blue-400 border-opacity-50">
                            {feedback.category ? 
                              feedback.category.charAt(0).toUpperCase() + 
                              feedback.category.slice(1).replace('_', ' ') : 
                              'General'}
                          </span>
                        </td>
                        
                        {/* Date Column */}
                        <td className="py-4 px-3 text-center">
                          <div className="bg-black bg-opacity-40 rounded-lg px-3 py-2 inline-block">
                            <div className="text-white text-sm font-medium">
                              {new Date(feedback.created_at).toLocaleDateString()}
                            </div>
                            <div className="text-white opacity-60 text-xs">
                              {new Date(feedback.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </td>
                        
                        {/* Comments Column */}
                        <td className="py-4 px-3">
                          <div className="max-w-xs">
                            {feedback.comments ? (
                              <div className="bg-green-500 bg-opacity-20 rounded-lg p-3 border border-green-400 border-opacity-30">
                                <p className="text-white text-sm leading-relaxed">
                                  {feedback.comments.length > 100 
                                    ? `${feedback.comments.substring(0, 100)}...` 
                                    : feedback.comments}
                                </p>
                              </div>
                            ) : (
                              <span className="text-white opacity-50 text-sm italic">No comments</span>
                            )}
                          </div>
                        </td>
                        
                        {/* Suggestions Column */}
                        <td className="py-4 px-3">
                          <div className="max-w-xs">
                            {feedback.suggestions ? (
                              <div className="bg-orange-500 bg-opacity-20 rounded-lg p-3 border border-orange-400 border-opacity-30">
                                <p className="text-white text-sm leading-relaxed">
                                  {feedback.suggestions.length > 80 
                                    ? `${feedback.suggestions.substring(0, 80)}...` 
                                    : feedback.suggestions}
                                </p>
                              </div>
                            ) : (
                              <span className="text-white opacity-50 text-sm italic">No suggestions</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Feedback Summary */}
                {receivedFeedback.length > 0 && (
                  <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-500 bg-opacity-20 rounded-lg p-4 text-center border border-green-400 border-opacity-30">
                      <div className="text-2xl font-bold text-green-200">
                        {receivedFeedback.length > 0 ? 
                          (receivedFeedback.reduce((sum, f) => sum + f.rating, 0) / receivedFeedback.length).toFixed(1) : 
                          'N/A'}
                      </div>
                      <div className="text-green-300 text-sm">Average Rating</div>
                    </div>
                    <div className="bg-blue-500 bg-opacity-20 rounded-lg p-4 text-center border border-blue-400 border-opacity-30">
                      <div className="text-2xl font-bold text-blue-200">{receivedFeedback.length}</div>
                      <div className="text-blue-300 text-sm">Total Reviews</div>
                    </div>
                    <div className="bg-purple-500 bg-opacity-20 rounded-lg p-4 text-center border border-purple-400 border-opacity-30">
                      <div className="text-2xl font-bold text-purple-200">
                        {receivedFeedback.filter(f => f.rating >= 4).length}
                      </div>
                      <div className="text-purple-300 text-sm">Positive Reviews</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-xl font-bold text-white mb-2">No Feedback Received</h3>
                <p className="text-white opacity-70 mb-4">You haven't received any feedback from team members yet</p>
                <p className="text-white opacity-50 text-sm">As you collaborate with your team, feedback will appear here to help you grow and improve</p>
                <div className="mt-6 bg-purple-500 bg-opacity-20 rounded-lg p-4 border border-purple-400 border-opacity-30">
                  <p className="text-purple-200 text-sm">
                    💡 <strong>Tip:</strong> Actively participate in team activities and code reviews to receive valuable feedback from peers
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Team Members Section */}
        <div className="mb-12">
          <div className="bg-slate-800/80 backdrop-blur-xl rounded-3xl p-8 border border-slate-600/30 shadow-2xl relative overflow-hidden">
            {/* Section Background Glow */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500"></div>
            
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-xl">👥</span>
                </div>
                <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  Team Members ({teamMembers.length})
                </h2>
              </div>
              
              {/* Quick Team Stats */}
              {(() => {
                const owner = teamMembers.find(member => member.role === 'owner');
                const members = teamMembers.filter(member => member.role !== 'owner');
                return (
                  <div className="flex gap-4 text-sm">
                    <span className="bg-yellow-500 bg-opacity-20 text-yellow-200 px-3 py-1 rounded-full border border-yellow-400 border-opacity-50">
                      👑 1 Owner
                    </span>
                    <span className="bg-blue-500 bg-opacity-20 text-blue-200 px-3 py-1 rounded-full border border-blue-400 border-opacity-50">
                      👤 {members.length} Members
                    </span>
                  </div>
                );
              })()}
            </div>

            {/* Team Owner Info */}
            {(() => {
              const owner = teamMembers.find(member => member.role === 'owner');
              return owner ? (
                <div className="mb-6 bg-gradient-to-r from-yellow-500 to-yellow-600 bg-opacity-20 border border-yellow-400 border-opacity-50 rounded-xl p-4 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-yellow-200 font-semibold flex items-center gap-2">
                      👑 Team Owner
                    </h3>
                    <div className="flex gap-2">
                      <span className="text-yellow-300 text-xs bg-yellow-500 bg-opacity-30 px-2 py-1 rounded">
                        ADMIN ACCESS
                      </span>
                      <span className="text-yellow-300 text-xs bg-yellow-600 bg-opacity-30 px-2 py-1 rounded">
                        CANNOT LEAVE
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg border-2 border-yellow-300">
                      {(owner.user_profiles?.full_name?.charAt(0) ||
                        owner.user_profiles?.username?.charAt(0) ||
                        owner.user_profiles?.email?.charAt(0))?.toUpperCase() || '👑'}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-white font-bold text-xl mb-1">
                        {owner.user_profiles?.full_name || 
                         owner.user_profiles?.username ||
                         owner.user_profiles?.email?.split('@')[0] ||
                         `Owner ${owner.user_id?.substring(0, 8) || 'Unknown'}`}
                      </h4>
                      <p className="text-yellow-200 text-sm mb-2 flex items-center gap-2">
                        📧 {owner.user_profiles?.email || `ID: ${owner.user_id?.substring(0, 12) || 'Unknown'}`}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-6 bg-red-500 bg-opacity-20 border border-red-400 border-opacity-50 rounded-xl p-4">
                  <p className="text-red-200 text-center">⚠️ No team owner found</p>
                </div>
              );
            })()}
            
            {teamMembers.length > 0 ? (
              <div className="overflow-x-auto">

                <table className="w-full text-white">
                  <thead>
                    <tr className="border-b border-white border-opacity-10 bg-black bg-opacity-40">
                      <th className="text-left py-4 px-3 text-white opacity-90 font-semibold">👤 Member</th>
                      <th className="text-left py-4 px-3 text-white opacity-90 font-semibold">📧 Email</th>
                      <th className="text-center py-4 px-3 text-white opacity-90 font-semibold">🎭 Role</th>
                      <th className="text-center py-4 px-3 text-white opacity-90 font-semibold">📊 Feedback</th>
                      <th className="text-center py-4 px-3 text-white opacity-90 font-semibold">✅ Success Rate</th>
                      <th className="text-center py-4 px-3 text-white opacity-90 font-semibold">📈 Recent</th>
                      <th className="text-center py-4 px-3 text-white opacity-90 font-semibold">📅 Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white divide-opacity-10">
                    {teamMembers
                      .sort((a, b) => {
                        // Sort: owner first, then members by join date
                        if (a.role === 'owner' && b.role !== 'owner') return -1;
                        if (b.role === 'owner' && a.role !== 'owner') return 1;
                        return new Date(a.joined_at) - new Date(b.joined_at);
                      })
                      .map((member, index) => (
                      <tr key={member.user_id || index} className={`hover:bg-white hover:bg-opacity-5 transition-colors duration-200 ${
                        member.role === 'owner' ? 'bg-yellow-500 bg-opacity-10 border border-yellow-400 border-opacity-30' : ''
                      }`}>
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                              {(member.user_profiles?.full_name?.charAt(0) ||
                                member.user_profiles?.username?.charAt(0) ||
                                member.user_profiles?.email?.charAt(0))?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <h4 className="text-white font-semibold text-lg">
                                {member.user_profiles?.full_name || 
                                 member.user_profiles?.username ||
                                 member.user_profiles?.email?.split('@')[0] ||
                                 `Member ${member.user_id?.substring(0, 8) || 'Unknown'}`}
                              </h4>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-3">
                          <span className="text-white opacity-80 text-sm bg-black bg-opacity-40 px-2 py-1 rounded">
                            📧 {member.user_profiles?.email || `ID: ${member.user_id?.substring(0, 12) || 'Unknown'}`}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium shadow-md ${
                            member.role === 'owner' 
                              ? 'bg-yellow-500 bg-opacity-80 text-yellow-100 border border-yellow-300' 
                              : member.role === 'lead'
                              ? 'bg-blue-500 bg-opacity-80 text-blue-100 border border-blue-300'
                              : 'bg-gray-600 bg-opacity-80 text-gray-100 border border-gray-400'
                          }`}>
                            {member.role === 'owner' ? '👑 Owner' : 
                             member.role === 'lead' ? '⭐ Lead' : '👤 Member'}
                          </span>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <div className="bg-black bg-opacity-40 rounded-lg px-3 py-2 inline-block">
                            <span className="text-white font-bold text-lg">
                              {member.stats?.totalFeedback || 0}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <div className={`inline-flex items-center px-3 py-2 rounded-lg font-bold text-lg ${
                            (member.stats?.acceptanceRate || 0) >= 70 ? 'bg-green-500 bg-opacity-20 text-green-300' :
                            (member.stats?.acceptanceRate || 0) >= 50 ? 'bg-yellow-500 bg-opacity-20 text-yellow-300' : 
                            'bg-red-500 bg-opacity-20 text-red-300'
                          }`}>
                            {member.stats?.acceptanceRate || 0}%
                          </div>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <div className="bg-black bg-opacity-40 rounded-lg px-3 py-2 inline-block">
                            <span className="text-white opacity-80 font-medium">
                              {member.stats?.recentActivity || 0}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-3 text-center">
                          <span className="text-white opacity-70 text-sm bg-black bg-opacity-40 px-2 py-1 rounded">
                            {new Date(member.joined_at).toLocaleDateString()}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-3">👥</div>
                <p className="text-white opacity-70">No team members found</p>
                <p className="text-white opacity-50 text-sm mt-2">There might be an issue loading team members</p>
              </div>
            )}
          </div>
        </div>

        {/* Enhanced Action Buttons */}
        <div className="mt-12 flex justify-center">
          <div className="flex gap-4 flex-wrap">
            <Link 
              to="/teams" 
              className="group relative bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 font-semibold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 backdrop-blur-xl border border-slate-600/30 shadow-xl hover:shadow-2xl"
            >
              <div className="flex items-center gap-2">
                <span className="group-hover:transform group-hover:-translate-x-1 transition-transform duration-200">←</span>
                Back to Teams
              </div>
            </Link>
            
            <button 
              onClick={() => window.location.reload()}
              className="group relative bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
            >
              <div className="flex items-center gap-2">
                <span className="group-hover:rotate-180 transition-transform duration-300">🔄</span>
                Refresh Dashboard
              </div>
            </button>

            {/* Leave Team Button - Only show for regular members, not owners */}
            {memberInfo && memberInfo.role !== 'owner' && (
              <button 
                onClick={handleLeaveTeam}
                className="group relative bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white font-semibold py-4 px-8 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl"
              >
                <div className="flex items-center gap-2">
                  <span className="group-hover:transform group-hover:scale-110 transition-transform duration-300">🚪</span>
                  Leave Team
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Leave Team Confirmation Modal */}
        {showLeaveConfirmation && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-slate-800/95 backdrop-blur-xl rounded-2xl p-8 max-w-md mx-4 border border-slate-600/30 shadow-2xl">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-red-500 to-rose-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-2xl">⚠️</span>
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-4">
                  Leave Team?
                </h3>
                
                <p className="text-slate-300 mb-2 leading-relaxed">
                  Are you sure you want to leave "{teamInfo?.team_name || 'this team'}"?
                </p>
                
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  You will lose access to all team resources and will need to be re-invited to rejoin.
                </p>

                {/* Team stats summary */}
                <div className="bg-slate-700/50 rounded-lg p-4 mb-6 text-left">
                  <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                    <span>📊</span> Your Team Contributions
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-slate-400">Total Feedback</div>
                      <div className="text-white font-semibold">{myStats.totalFeedback}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Acceptance Rate</div>
                      <div className="text-white font-semibold">{myStats.acceptanceRate}%</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={cancelLeaveTeam}
                    disabled={isLeavingTeam}
                    className="flex-1 bg-slate-600 hover:bg-slate-700 disabled:bg-slate-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition duration-200"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={confirmLeaveTeam}
                    disabled={isLeavingTeam}
                    className="flex-1 bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 disabled:from-red-700 disabled:to-rose-700 disabled:opacity-50 text-white font-semibold py-3 px-4 rounded-xl transition duration-200 flex items-center justify-center gap-2"
                  >
                    {isLeavingTeam ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Leaving...
                      </>
                    ) : (
                      <>
                        <span>🚪</span>
                        Leave Team
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberDashboard;