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

const COLORS = ["#60a5fa", "#a78bfa", "#f472b6", "#facc15", "#34d399", "#38bdf8"];

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchStats = async () => {
    try {
      setRefreshing(true);
      const timestamp = Date.now();
      const res = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/api/stats?t=${timestamp}`);
      const feedbacks = res.data.feedbacks || [];

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
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg,#0f172a,#1e1b4b,#0f172a)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          color: "#fff",
          fontFamily: "Poppins, sans-serif",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>
            Loading Admin Dashboard...
          </div>
          <div style={{ color: "#94a3b8" }}>Fetching system statistics...</div>
          <div
            style={{
              margin: "20px auto",
              width: 40,
              height: 40,
              borderRadius: "50%",
              borderTop: "3px solid #8b5cf6",
              animation: "spin 1s linear infinite",
            }}
          />
          <style>{`@keyframes spin {to{transform:rotate(360deg);}}`}</style>
        </div>
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
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#0f172a,#1e1b4b,#0f172a)",
        color: "#fff",
        padding: "40px 20px",
        fontFamily: "Poppins, sans-serif",
      }}
    >
      <div style={{ maxWidth: 1300, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1
            style={{
              fontSize: "2.8rem",
              fontWeight: 800,
              background:
                "linear-gradient(to right,#8b5cf6,#f472b6,#60a5fa)",
              WebkitBackgroundClip: "text",
              color: "transparent",
              marginBottom: 10,
            }}
          >
            🔧 Admin Dashboard
          </h1>
          <p style={{ color: "#cbd5e1", fontWeight: 500, fontSize: 16 }}>
            System-wide analytics and feedback management
          </p>
          <button
            onClick={fetchStats}
            disabled={refreshing}
            style={{
              marginTop: 20,
              padding: "10px 18px",
              borderRadius: 10,
              border: "none",
              background:
                "linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899)",
              color: "#fff",
              fontWeight: 700,
              cursor: refreshing ? "not-allowed" : "pointer",
              opacity: refreshing ? 0.6 : 1,
              transition: "0.2s",
            }}
          >
            {refreshing ? "🔄 Refreshing..." : "🔄 Refresh Data"}
          </button>
        </div>

        {/* Summary Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
            gap: 20,
            marginBottom: 40,
          }}
        >
          {[
            { icon: "📊", title: "Total Suggestions", value: stats.total },
            { icon: "✅", title: "Accepted", value: stats.accepted },
            { icon: "❌", title: "Rejected", value: stats.rejected },
            { icon: "📈", title: "Accept Rate", value: `${acceptanceRate}%` },
          ].map((c, i) => (
            <div
              key={i}
              style={{
                background: "rgba(17,25,40,0.85)",
                borderRadius: 20,
                border: "1px solid rgba(148,163,184,0.15)",
                boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
                padding: 24,
                textAlign: "center",
                transition: "transform 0.3s ease, box-shadow 0.3s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-6px) scale(1.03)";
                e.currentTarget.style.boxShadow =
                  "0 12px 36px rgba(0,0,0,0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow =
                  "0 8px 30px rgba(0,0,0,0.4)";
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 10 }}>{c.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 18 }}>{c.title}</div>
              <div style={{ fontSize: 26, fontWeight: 800, color: "#a78bfa" }}>
                {c.value}
              </div>
            </div>
          ))}
        </div>

        {/* Charts */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))",
            gap: 24,
            marginBottom: 40,
          }}
        >
          <div
            style={{
              background: "rgba(17,25,40,0.85)",
              borderRadius: 20,
              border: "1px solid rgba(148,163,184,0.15)",
              padding: 24,
            }}
          >
            <h3 style={{ fontWeight: 700, marginBottom: 10, color: "#cbd5e1" }}>
              🥧 Accept vs Reject
            </h3>
            <ResponsiveContainer width="100%" height={280}>
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

          <div
            style={{
              background: "rgba(17,25,40,0.85)",
              borderRadius: 20,
              border: "1px solid rgba(148,163,184,0.15)",
              padding: 24,
            }}
          >
            <h3 style={{ fontWeight: 700, marginBottom: 10, color: "#cbd5e1" }}>
              📊 Error Type Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData}>
                <XAxis dataKey="type" stroke="#94a3b8" />
                <YAxis allowDecimals={false} stroke="#94a3b8" />
                <Tooltip />
                <Bar
                  dataKey="count"
                  fill="url(#barGradient)"
                  radius={[6, 6, 0, 0]}
                />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#60a5fa" />
                    <stop offset="100%" stopColor="#8b5cf6" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Feedback Table */}
        <div
          style={{
            background: "rgba(17,25,40,0.85)",
            borderRadius: 20,
            border: "1px solid rgba(148,163,184,0.15)",
            padding: 24,
            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
          }}
        >
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>
            📋 All Feedback Records
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                color: "#fff",
              }}
            >
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.05)" }}>
                  {["User", "User ID", "Type", "Status", "Comment", "View"].map(
                    (h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "12px",
                          color: "#94a3b8",
                        }}
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody>
                {stats.feedbacks.map((fb, i) => (
                  <tr
                    key={i}
                    style={{
                      borderBottom: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <td style={{ padding: "10px 12px" }}>
                      {fb.user_profile?.display_name || "Unknown"}
                    </td>
                    <td style={{ padding: "10px 12px", color: "#a5b4fc" }}>
                      {fb.user_id?.substring(0, 8) || "N/A"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {fb.suggestion_type || "General"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {fb.decision === "accepted"
                        ? "✅ Accepted"
                        : fb.decision === "rejected"
                        ? "❌ Rejected"
                        : "⏳ Pending"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {fb.comment || "-"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      <button
                        onClick={() => setSelectedFeedback(fb)}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 8,
                          border: "none",
                          background:
                            "linear-gradient(90deg,#6366f1,#8b5cf6)",
                          color: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        👁️ View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {selectedFeedback && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.8)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 1000,
            }}
            onClick={() => setSelectedFeedback(null)}
          >
            <div
              style={{
                background: "rgba(17,25,40,0.98)",
                borderRadius: 14,
                padding: 24,
                width: "min(90%,700px)",
                maxHeight: "80vh",
                overflowY: "auto",
                border: "1px solid rgba(148,163,184,0.15)",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ color: "#a78bfa", fontSize: 18, marginBottom: 8 }}>
                👁️ Code Review Details
              </h3>
              <p style={{ color: "#94a3b8", marginBottom: 8 }}>
                🧑‍💻{" "}
                {selectedFeedback.user_profile?.display_name || "Unknown User"}
              </p>
              <pre
                style={{
                  background: "rgba(15,23,42,0.7)",
                  padding: 14,
                  borderRadius: 10,
                  color: "#cbd5e1",
                  overflowX: "auto",
                }}
              >
                {selectedFeedback.code || "No code available"}
              </pre>
              <button
                onClick={() => setSelectedFeedback(null)}
                style={{
                  marginTop: 16,
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "linear-gradient(90deg,#ef4444,#fb7185)",
                  color: "#fff",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminDashboard;
