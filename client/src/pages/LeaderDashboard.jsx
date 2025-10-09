import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from "recharts";

const COLORS = ["#667eea", "#764ba2", "#f093fb", "#f5576c", "#4facfe", "#00f2fe"];

const LeaderDashboard = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState("all");
  const [loading, setLoading] = useState(true);
  const [teamInfo, setTeamInfo] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // Fetch members and feedback
  useEffect(() => {
    if (!teamId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        
        // First, check if user is authenticated
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/login');
          return;
        }

        // Get team info first to check ownership
        const { data: team, error: teamError } = await supabase
          .from("teams")
          .select("*")
          .eq("team_id", teamId)
          .single();
          
        if (teamError || !team) {
          console.error('Team not found');
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        // Check if user is the actual team owner (check both owner_id and team_lead_id)
        const isActualOwner = team.owner_id === user.id || team.team_lead_id === user.id;
        
        // Also check the team_members table for additional verification
        const { data: memberData, error: memberError } = await supabase
          .from('team_members')
          .select('role')
          .eq('team_id', teamId)
          .eq('user_id', user.id)
          .single();

        // User must be the actual owner (in teams table) AND should be in team_members
        if (!isActualOwner || memberError || !memberData) {
          console.error('Access denied: User is not the team owner');
          setAccessDenied(true);
          setLoading(false);
          return;
        }
        
        setTeamInfo(team);

        // 1. Fetch team members
        const { data: teamMembers, error: tmError } = await supabase
          .from("team_members")
          .select("user_id")
          .eq("team_id", teamId);

        if (tmError) {
          console.error("Error fetching team members:", tmError.message);
          return;
        }

        const memberIds = teamMembers.map((m) => m.user_id);

        // 2. Fetch user emails
        let users = [];
        if (memberIds.length > 0) {
          const { data: userData, error: uError } = await supabase
            .from("user_profiles")
            .select("id, email")
            .in("id", memberIds);

          if (uError) {
            console.error("Error fetching users:", uError.message);
          } else {
            users = userData;
          }
        }
        setMembers(users);

        // 3. Fetch feedback
        let query = supabase.from("feedback").select("*").eq("team_id", teamId);
        if (selectedMember !== "all") {
          query = query.eq("user_id", selectedMember);
        }

        const { data: feedbackData, error: fError } = await query;
        if (fError) {
          console.error("Error fetching feedback:", fError.message);
        } else {
          setFeedback(feedbackData || []);
        }
      } catch (err) {
        console.error("Unexpected error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [teamId, selectedMember]);

  // Chart data
  const pieData = [
    { name: "Accepted", value: feedback.filter((f) => f.decision === "accepted").length },
    { name: "Rejected", value: feedback.filter((f) => f.decision === "rejected").length },
  ];

  const typeData = feedback.reduce((acc, f) => {
    const type = f.suggestion_type || 'Unknown';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const barData = Object.entries(typeData).map(([type, count]) => ({ type, count }));

  // Map user_id to email for table display
  const getEmail = (userId) => {
    const user = members.find((m) => m.id === userId);
    return user?.email || "Unknown";
  };

  const stats = {
    total: feedback.length,
    accepted: feedback.filter(f => f.decision === 'accepted').length,
    rejected: feedback.filter(f => f.decision === 'rejected').length,
    members: members.length
  };

  if (loading) {
    return (
      <div className="container fade-in">
        <div className="text-center py-20">
          <div className="card card-glass inline-block p-8">
            <div className="text-6xl mb-4">📋</div>
            <h2 className="text-2xl font-bold text-white mb-2">Loading Dashboard</h2>
            <p className="text-white opacity-80">Fetching team analytics...</p>
            <div className="flex justify-center mt-6">
              <div className="loading-spinner"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Access denied UI
  if (accessDenied) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 max-w-md mx-4 text-center border border-white border-opacity-20">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-white opacity-90 mb-6">
            Only team owners can access the leader dashboard. You need to be the team owner to view this page.
          </p>
          <Link 
            to="/teams" 
            className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition duration-300 transform hover:scale-105"
          >
            Back to Teams
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">
          📋 Team Dashboard
        </h1>
        <p className="text-lg text-white opacity-90">
          {teamInfo ? `Analytics for "${teamInfo.team_name}"` : `Team ${teamId} Analytics`}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card card-glass scale-in">
          <div className="card-body text-center">
            <div className="text-4xl mb-2">📊</div>
            <h3 className="text-xl font-semibold text-white mb-1">Total Feedback</h3>
            <p className="text-3xl font-bold text-white">{stats.total}</p>
          </div>
        </div>
        
        <div className="card card-glass scale-in" style={{ animationDelay: '0.1s' }}>
          <div className="card-body text-center">
            <div className="text-4xl mb-2">✅</div>
            <h3 className="text-xl font-semibold text-white mb-1">Accepted</h3>
            <p className="text-3xl font-bold text-green-300">{stats.accepted}</p>
          </div>
        </div>
        
        <div className="card card-glass scale-in" style={{ animationDelay: '0.2s' }}>
          <div className="card-body text-center">
            <div className="text-4xl mb-2">❌</div>
            <h3 className="text-xl font-semibold text-white mb-1">Rejected</h3>
            <p className="text-3xl font-bold text-red-300">{stats.rejected}</p>
          </div>
        </div>
        
        <div className="card card-glass scale-in" style={{ animationDelay: '0.3s' }}>
          <div className="card-body text-center">
            <div className="text-4xl mb-2">👥</div>
            <h3 className="text-xl font-semibold text-white mb-1">Team Members</h3>
            <p className="text-3xl font-bold text-blue-300">{stats.members}</p>
          </div>
        </div>
      </div>

      {/* Filter Section */}
      <div className="card card-glass mb-8 slide-up">
        <div className="card-body">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-xl font-semibold text-white mb-2">Filter Analytics</h3>
              <p className="text-white opacity-80">Select a team member to view individual performance</p>
            </div>
            <div className="form-group mb-0">
              <select 
                value={selectedMember} 
                onChange={(e) => setSelectedMember(e.target.value)}
                className="form-select"
                style={{ minWidth: '200px' }}
              >
                <option value="all">All Members</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.email || "Unknown"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Pie Chart */}
        <div className="card shadow-lg slide-up">
          <div className="card-header">
            <h3 className="text-xl font-semibold">Feedback Distribution</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  dataKey="value"
                >
                  {pieData.map((_, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="card shadow-lg slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="card-header">
            <h3 className="text-xl font-semibold">Suggestion Types</h3>
          </div>
          <div className="card-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <XAxis dataKey="type" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="var(--primary-blue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Feedback Table */}
      <div className="card shadow-lg slide-up">
        <div className="card-header">
          <h3 className="text-xl font-semibold">Detailed Feedback History</h3>
          <p className="text-gray-600 text-sm">All feedback submissions from team members</p>
        </div>
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Member</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Decision</th>
                  <th className="table-header">Suggestion</th>
                  <th className="table-header">Comment</th>
                  <th className="table-header">Code</th>
                </tr>
              </thead>
              <tbody>
                {feedback.length > 0 ? feedback.map((f, index) => (
                  <tr key={f.id} className={`table-row ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                          {getEmail(f.user_id).charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium">{getEmail(f.user_id)}</span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        {f.suggestion_type || 'General'}
                      </span>
                    </td>
                    <td className="table-cell">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        f.decision === 'accepted' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {f.decision === 'accepted' ? '✅ Accepted' : '❌ Rejected'}
                      </span>
                    </td>
                    <td className="table-cell max-w-xs">
                      <div className="truncate" title={f.suggestion}>
                        {f.suggestion || '-'}
                      </div>
                    </td>
                    <td className="table-cell max-w-xs">
                      <div className="truncate" title={f.comment}>
                        {f.comment || '-'}
                      </div>
                    </td>
                    <td className="table-cell">
                      <details>
                        <summary className="cursor-pointer text-blue-600 hover:text-blue-800 text-sm">
                          View Code
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded text-xs overflow-x-auto max-w-md">
                          {f.code || 'No code available'}
                        </pre>
                      </details>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="6" className="table-cell text-center py-8 text-gray-500">
                      <div className="text-4xl mb-2">📋</div>
                      No feedback data available for this team
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="text-center mt-8">
        <div className="flex gap-4 justify-center flex-wrap">
          <Link to="/create-team" className="btn btn-secondary">
            🆕 Create New Team
          </Link>
          <Link to="/editor" className="btn btn-primary">
            📝 Code Review
          </Link>
          <Link to="/" className="btn btn-ghost">
            🏠 Home
          </Link>
        </div>
      </div>

  <style>{`
        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .grid {
          display: grid;
        }

        .grid-cols-1 {
          grid-template-columns: repeat(1, minmax(0, 1fr));
        }

        @media (min-width: 768px) {
          .md\\:grid-cols-4 {
            grid-template-columns: repeat(4, minmax(0, 1fr));
          }
        }

        @media (min-width: 1024px) {
          .lg\\:grid-cols-2 {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        .gap-6 {
          gap: 1.5rem;
        }

        .gap-8 {
          gap: 2rem;
        }

        .table-header {
          padding: 1rem;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
        }

        .table-cell {
          padding: 1rem;
          border-bottom: 1px solid #e5e7eb;
          vertical-align: top;
        }

        .table-row:hover {
          background-color: #f9fafb;
        }

        .w-full {
          width: 100%;
        }

        .w-8 {
          width: 2rem;
        }

        .h-8 {
          height: 2rem;
        }

        .max-w-xs {
          max-width: 20rem;
        }

        .max-w-md {
          max-width: 28rem;
        }

        .truncate {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .overflow-x-auto {
          overflow-x: auto;
        }

        .inline-block {
          display: inline-block;
        }

        .py-8 {
          padding-top: 2rem;
          padding-bottom: 2rem;
        }

        .py-20 {
          padding-top: 5rem;
          padding-bottom: 5rem;
        }

        .flex {
          display: flex;
        }

        .items-center {
          align-items: center;
        }

        .justify-center {
          justify-content: center;
        }

        .justify-between {
          justify-content: space-between;
        }

        .gap-2 {
          gap: 0.5rem;
        }

        .gap-4 {
          gap: 1rem;
        }

        .flex-wrap {
          flex-wrap: wrap;
        }

        .text-green-300 {
          color: #9ae6b4;
        }

        .text-red-300 {
          color: #feb2b2;
        }

        .text-blue-300 {
          color: #90cdf4;
        }

        .rounded-full {
          border-radius: 9999px;
        }

        .bg-gradient-to-r {
          background-image: linear-gradient(to right, var(--tw-gradient-stops));
        }

        .from-blue-400 {
          --tw-gradient-from: #63b3ed;
          --tw-gradient-stops: var(--tw-gradient-from), var(--tw-gradient-to, rgba(99, 179, 237, 0));
        }

        .to-purple-500 {
          --tw-gradient-to: #9f7aea;
        }
      `}</style>
    </div>
  );
};

export default LeaderDashboard;
