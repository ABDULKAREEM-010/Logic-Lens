import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  XAxis,
  YAxis,
  Bar,
  ResponsiveContainer,
} from "recharts";
import { API_ENDPOINTS } from '../config/api';

const COLORS = ["#667eea", "#764ba2", "#f093fb", "#f5576c", "#4facfe", "#00f2fe"];

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      console.log('🔄 Fetching admin stats...');
      
      // Add cache-busting parameter to ensure fresh data
      const timestamp = Date.now();
      const res = await axios.get(`${API_ENDPOINTS.STATS}?t=${timestamp}`);
      const feedbacks = res.data.feedbacks || [];

      console.log('📊 Received feedback data:', feedbacks.length, 'entries');
      
      // Log first few feedbacks to see user profile data
      if (feedbacks.length > 0) {
        console.log('👤 Sample feedback with user data:', {
          user_id: feedbacks[0].user_id,
          user_profile: feedbacks[0].user_profile,
          suggestion_type: feedbacks[0].suggestion_type
        });
      }

      const errorTypes = {
        syntax: feedbacks.filter((f) =>
          f.suggestion_type?.toLowerCase().includes("syntax")
        ).length,
        semantic: feedbacks.filter((f) =>
          f.suggestion_type?.toLowerCase().includes("semantic")
        ).length,
        logical: feedbacks.filter((f) =>
          f.suggestion_type?.toLowerCase().includes("logic")
        ).length,
        nonCritical: feedbacks.filter((f) => {
          const type = f.suggestion_type?.toLowerCase() || "";
          return (
            type.includes("style") ||
            type.includes("best-practice") ||
            type.includes("maintain") ||
            type.includes("readability") ||
            type.includes("format")
          );
        }).length,
      };

      setStats({
        total: feedbacks.length,
        accepted: feedbacks.filter((f) => f.decision === "accepted").length,
        rejected: feedbacks.filter((f) => f.decision === "rejected").length,
        feedbacks,
        errorTypes,
      });

      console.log('✅ Stats updated successfully');
    } catch (err) {
      console.error("❌ Failed to fetch stats:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="container fade-in text-center py-20">
        <h2 className="text-2xl font-bold mb-2">Loading Admin Dashboard...</h2>
        <p className="text-gray">Fetching system statistics...</p>
        <div className="loading-spinner mx-auto mt-6"></div>
      </div>
    );
  }

  const pieData = [
    { name: "Accepted", value: stats.accepted },
    { name: "Rejected", value: stats.rejected },
  ];

  const barData = [
    { type: "Syntax", count: stats.errorTypes.syntax },
    { type: "Semantic", count: stats.errorTypes.semantic },
    { type: "Logical", count: stats.errorTypes.logical },
    { type: "Non-Critical", count: stats.errorTypes.nonCritical || 0 },
  ];

  const acceptanceRate =
    stats.total > 0 ? ((stats.accepted / stats.total) * 100).toFixed(1) : 0;

  return (
    <div className="container fade-in">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="dashboard-title">🔧 Admin Dashboard</h1>
        <p className="dashboard-subtitle font-bold">
          System-wide analytics and feedback management
        </p>
        <button onClick={fetchStats} disabled={refreshing} className="btn-refresh">
          {refreshing ? "🔄 Refreshing..." : "🔄 Refresh Data"}
        </button>
      </div>

      {/* Summary Cards */}
      <div className="cards-grid">
        {[
          { icon: "📊", title: "Total Suggestions", value: stats.total },
          { icon: "✅", title: "Accepted", value: stats.accepted },
          { icon: "❌", title: "Rejected", value: stats.rejected },
          { icon: "📈", title: "Accept Rate", value: `${acceptanceRate}%` },
        ].map((c, i) => (
          <div key={i} className="card summary-card">
            <div className="card-body text-center">
              <div className="card-icon">{c.icon}</div>
              <h3 className="card-title">{c.title}</h3>
              <p className="card-value">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="charts-grid">
        <div className="card chart-card">
          <h3 className="chart-title">🥧 Accept vs Reject</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, value, percent }) =>
                  `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                }
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="card chart-card">
          <h3 className="chart-title">📊 Error Type Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <XAxis dataKey="type" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#3182ce" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Feedback Table */}
      <div className="card feedback-card">
        <div className="card-header">
          <h3 className="chart-title">📋 All Feedback Records</h3>
          <p className="text-muted">Complete system feedback history</p>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>User Name</th>
                <th>User ID</th>
                <th>Type</th>
                <th>Status</th>
                <th>Comment</th>
                <th>View Code</th>
              </tr>
            </thead>
            <tbody>
              {stats.feedbacks.length > 0 ? (
                stats.feedbacks.map((fb, i) => (
                  <tr key={i}>
                    <td>
                      <div className="user-info">
                        <div className="user-name">
                          {fb.user_profile?.display_name || 'Unknown User'}
                        </div>
                        {fb.user_profile?.email && fb.user_profile?.email !== 'Unknown' && (
                          <div className="user-email">
                            {fb.user_profile.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="font-mono user-id">{fb.user_id?.substring(0, 8) || 'N/A'}</td>
                    <td>
                      <span className="suggestion-type">
                        {fb.suggestion_type || "General"}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge ${fb.decision}`}>
                        {fb.decision === 'accepted' ? '✅ Accepted' : 
                         fb.decision === 'rejected' ? '❌ Rejected' : 
                         '⏳ Pending'}
                      </span>
                    </td>
                    <td className="comment-cell">
                      {fb.comment ? (
                        <div className="comment-preview" title={fb.comment}>
                          {fb.comment.length > 50 ? `${fb.comment.substring(0, 50)}...` : fb.comment}
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedFeedback(fb)}
                        className="btn-view"
                      >
                        👁️ View
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center py-8 text-gray">
                    No feedback data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {selectedFeedback && (
        <div className="modal-overlay" onClick={() => setSelectedFeedback(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-lg font-semibold mb-2">
                👁️ Code Review Details
              </h3>
              <div className="feedback-meta">
                <div className="meta-row">
                  <span className="meta-label">👤 User:</span>
                  <span className="meta-value">
                    {selectedFeedback.user_profile?.display_name || 'Unknown User'}
                    {selectedFeedback.user_profile?.email && selectedFeedback.user_profile.email !== 'Unknown' && (
                      <span className="meta-email"> ({selectedFeedback.user_profile.email})</span>
                    )}
                  </span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">🏷️ Type:</span>
                  <span className="meta-value">{selectedFeedback.suggestion_type || 'General'}</span>
                </div>
                <div className="meta-row">
                  <span className="meta-label">📊 Status:</span>
                  <span className={`status-badge ${selectedFeedback.decision}`}>
                    {selectedFeedback.decision === 'accepted' ? '✅ Accepted' : 
                     selectedFeedback.decision === 'rejected' ? '❌ Rejected' : 
                     '⏳ Pending'}
                  </span>
                </div>
                {selectedFeedback.comment && (
                  <div className="meta-row">
                    <span className="meta-label">💬 Comment:</span>
                    <span className="meta-value comment-text">{selectedFeedback.comment}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="code-section">
              <h4 className="code-title">📝 Code:</h4>
              <pre className="code-block">{selectedFeedback.code || "No code available"}</pre>
            </div>
            <button onClick={() => setSelectedFeedback(null)} className="btn-close">
              Close
            </button>
          </div>
        </div>
      )}

  <style>{`
        .summary-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 1.5rem;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .summary-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }
        .card-icon {
          font-size: 2rem;
          margin-bottom: 0.5rem;
        }
        .card-value {
          font-size: 1.5rem;
          font-weight: bold;
        }
        .table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.03);
          border-radius: 8px;
          overflow: hidden;
        }
        .table th,
        .table td {
          padding: 12px;
          border-bottom: 1px solid #e2e8f0;
        }
        .table th {
          background: #f8fafc;
          text-align: left;
          font-weight: 600;
        }
        .table tr:hover {
          background: #f1f5f9;
        }
        .btn-view {
          background: #3182ce;
          color: white;
          border: none;
          padding: 4px 10px;
          border-radius: 6px;
          cursor: pointer;
        }
        .btn-view:hover {
          background: #2b6cb0;
        }
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .modal-content {
          background: white;
          padding: 1.5rem;
          border-radius: 8px;
          width: 80%;
          max-width: 700px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .code-block {
          background: #f7fafc;
          padding: 1rem;
          border-radius: 6px;
          font-family: monospace;
          white-space: pre-wrap;
          overflow-x: auto;
        }
        .btn-close {
          background: #e53e3e;
          color: #fff;
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 6px;
          margin-top: 1rem;
          cursor: pointer;
        }
        .user-info {
          min-width: 160px;
        }
        .user-name {
          font-weight: 600;
          color: #2d3748;
          font-size: 14px;
        }
        .user-email {
          font-size: 12px;
          color: #718096;
          margin-top: 2px;
        }
        .user-id {
          font-family: 'Courier New', monospace;
          font-size: 12px;
          color: #4a5568;
          background: #f7fafc;
          padding: 4px 8px;
          border-radius: 4px;
          display: inline-block;
        }
        .suggestion-type {
          background: #e6fffa;
          color: #065f46;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          text-transform: capitalize;
        }
        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }
        .status-badge.accepted {
          background: #d1fae5;
          color: #065f46;
        }
        .status-badge.rejected {
          background: #fee2e2;
          color: #991b1b;
        }
        .status-badge.pending {
          background: #fef3c7;
          color: #92400e;
        }
        .comment-cell {
          max-width: 200px;
        }
        .comment-preview {
          font-size: 13px;
          line-height: 1.4;
          color: #4a5568;
        }
        .text-muted {
          color: #a0aec0;
          font-style: italic;
        }
        .modal-header {
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 1rem;
          margin-bottom: 1rem;
        }
        .feedback-meta {
          background: #f8fafc;
          padding: 1rem;
          border-radius: 8px;
          margin-top: 0.5rem;
        }
        .meta-row {
          display: flex;
          margin-bottom: 0.5rem;
          align-items: flex-start;
        }
        .meta-row:last-child {
          margin-bottom: 0;
        }
        .meta-label {
          font-weight: 600;
          color: #4a5568;
          min-width: 80px;
          margin-right: 0.5rem;
        }
        .meta-value {
          color: #2d3748;
          flex: 1;
        }
        .meta-email {
          color: #718096;
          font-size: 0.9em;
        }
        .comment-text {
          background: white;
          padding: 0.5rem;
          border-radius: 4px;
          border: 1px solid #e2e8f0;
          white-space: pre-wrap;
          line-height: 1.5;
        }
        .code-section {
          margin-top: 1rem;
        }
        .code-title {
          font-weight: 600;
          color: #4a5568;
          margin-bottom: 0.5rem;
        }
      `}</style>
    </div>
  );
}

export default AdminDashboard;
