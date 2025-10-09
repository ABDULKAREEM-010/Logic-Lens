import React, { useEffect, useState } from "react";
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
import { supabase } from "../supabaseClient";

const COLORS = ["#667eea", "#764ba2", "#f093fb", "#f5576c", "#4facfe", "#00f2fe"];

function UserDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null); // 👁️ Code view modal

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error("Error getting user:", error.message);
      setUser(data.user);
    };
    fetchUser();
  }, []);

  const fetchStats = async () => {
    if (!user) return;

    try {
      setRefreshing(true);
      const { data: feedbacks, error } = await supabase
        .from("feedback")
        .select("*")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching user feedback:", error.message);
        return;
      }

      const total = feedbacks.length;
      const accepted = feedbacks.filter((f) => f.decision === "accepted").length;
      const rejected = feedbacks.filter((f) => f.decision === "rejected").length;

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

      setStats({ total, accepted, rejected, feedbacks, errorTypes });
    } catch (err) {
      console.error("Failed to fetch user stats:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) fetchStats();
  }, [user]);

  if (loading) {
    return (
      <div className="container fade-in text-center py-20">
        <h2 className="text-2xl font-bold mb-2">Loading User Dashboard...</h2>
        <p className="text-gray">Fetching your personal analytics...</p>
        <div className="loading-spinner mx-auto mt-6"></div>
      </div>
    );
  }

  if (!stats) {
    return <p className="text-center mt-10 text-gray-600">No data available.</p>;
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
        <h1 className="dashboard-title">👤 User Dashboard</h1>
        <p className="dashboard-subtitle font-bold">
          Your personal feedback and code review insights
        </p>
        <button
          onClick={fetchStats}
          disabled={refreshing}
          className="btn-refresh"
        >
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
          <h3 className="chart-title">📋 Your Feedback Records</h3>
          <p className="text-muted">Your personal feedback history</p>
        </div>
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
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
                    <td>{fb.suggestion_type || "General"}</td>
                    <td>{fb.decision}</td>
                    <td>{fb.comment || "-"}</td>
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
                  <td colSpan="4" className="text-center py-8 text-gray">
                    No feedback data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Viewing Code */}
      {selectedFeedback && (
        <div className="modal-overlay" onClick={() => setSelectedFeedback(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-3">
              👁️ Code Review ({selectedFeedback.suggestion_type})
            </h3>
            <pre className="code-block">{selectedFeedback.code || "No code available"}</pre>
            <button onClick={() => setSelectedFeedback(null)} className="btn-close">
              Close
            </button>
          </div>
        </div>
      )}

      {/* CSS */}
  <style>{`
        body {
          background: #f9fafc;
          color: #2d3748;
          font-family: "Segoe UI", sans-serif;
        }

        .dashboard-title {
          font-size: 2rem;
          font-weight: bold;
          color: #1a202c;
        }

        .btn-refresh {
          background: #3182ce;
          padding: 0.6rem 1.2rem;
          border-radius: 6px;
          color: #fff;
          border: none;
          margin-top: 1rem;
          cursor: pointer;
          font-weight: 500;
          transition: 0.2s;
        }
        .btn-refresh:hover {
          background: #2b6cb0;
        }

        .cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .summary-card {
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          transition: transform 0.2s, box-shadow 0.2s;
        }
        .summary-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
        }

        .chart-card {
          background: #fff;
          padding: 1.5rem;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 3px 8px rgba(0, 0, 0, 0.03);
        }

        .table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
        }

        .table th,
        .table td {
          padding: 12px;
          border-bottom: 1px solid #e2e8f0;
        }

        .table th {
          background: #f8fafc;
          font-weight: 600;
        }

        .table tr:hover {
          background: #edf2f7;
        }

        .btn-view {
          background: #3182ce;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 5px;
          cursor: pointer;
        }
        
        .btn-view:hover {
          background: #2b6cb0;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          padding: 1.5rem;
          border-radius: 10px;
          width: 80%;
          max-width: 700px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
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

        .btn-close:hover {
          background: #c53030;
        }
      `}</style>
    </div>
  );
}

export default UserDashboard;
