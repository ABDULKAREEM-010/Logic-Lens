import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
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

const LeaderDashboard = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState("all");
  const [loading, setLoading] = useState(true);
  const [teamInfo, setTeamInfo] = useState(null);
  const [accessDenied, setAccessDenied] = useState(false);

  // ✅ Fetch team data + feedback
  useEffect(() => {
    if (!teamId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/login");
          return;
        }

        const { data: team, error: teamError } = await supabase
          .from("teams")
          .select("*")
          .eq("team_id", teamId)
          .single();

        if (teamError || !team) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        const isOwner = team.owner_id === user.id || team.team_lead_id === user.id;
        if (!isOwner) {
          setAccessDenied(true);
          setLoading(false);
          return;
        }

        setTeamInfo(team);

        const { data: teamMembers } = await supabase
          .from("team_members")
          .select("user_id")
          .eq("team_id", teamId);

        const memberIds = teamMembers.map((m) => m.user_id);

        const { data: userData } = await supabase
          .from("user_profiles")
          .select("id, email")
          .in("id", memberIds);

        setMembers(userData || []);

        let query = supabase.from("feedback").select("*").eq("team_id", teamId);
        if (selectedMember !== "all") query = query.eq("user_id", selectedMember);

        const { data: feedbackData } = await query;
        setFeedback(feedbackData || []);
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [teamId, selectedMember]);

  // ✅ Prepare chart data
  const pieData = [
    { name: "Accepted", value: feedback.filter((f) => f.decision === "accepted").length },
    { name: "Rejected", value: feedback.filter((f) => f.decision === "rejected").length },
  ];

  const typeData = feedback.reduce((acc, f) => {
    const type = f.suggestion_type || "Unknown";
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});

  const barData = Object.entries(typeData).map(([type, count]) => ({ type, count }));

  const getEmail = (userId) => members.find((m) => m.id === userId)?.email || "Unknown";

  const stats = {
    total: feedback.length,
    accepted: feedback.filter((f) => f.decision === "accepted").length,
    rejected: feedback.filter((f) => f.decision === "rejected").length,
    members: members.length,
  };

  // ✅ Download CSV
  const handleDownloadCSV = () => {
    const headers = ["Member", "Type", "Decision", "Suggestion", "Comment"];
    const rows = feedback.map((f) => [
      getEmail(f.user_id),
      f.suggestion_type || "General",
      f.decision || "Pending",
      `"${f.suggestion || "-"}"`,
      `"${f.comment || "-"}"`,
    ]);

    const csvContent =
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${teamInfo?.team_name || "team"}_feedback.csv`;
    link.click();
  };

  // ✅ Loading UI
  if (loading)
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg,#0f172a,#1e1b4b,#0f172a)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "#fff",
        fontFamily: "Poppins, sans-serif"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 10 }}>
            Loading Team Dashboard...
          </div>
          <div style={{ color: "#94a3b8" }}>Fetching analytics...</div>
          <div style={{
            margin: "20px auto",
            width: 40,
            height: 40,
            borderRadius: "50%",
            borderTop: "3px solid #8b5cf6",
            animation: "spin 1s linear infinite"
          }}/>
          <style>{`@keyframes spin {to{transform:rotate(360deg);}}`}</style>
        </div>
      </div>
    );

  if (accessDenied)
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center text-center text-white">
        <div className="bg-white bg-opacity-10 backdrop-blur-lg rounded-2xl p-8 max-w-md mx-4 border border-white border-opacity-20">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="opacity-90 mb-6">
            Only the team owner can access this dashboard.
          </p>
          <Link to="/teams" className="inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded-lg transition duration-300 transform hover:scale-105">
            Back to Teams
          </Link>
        </div>
      </div>
    );

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg,#0f172a,#1e1b4b,#0f172a)",
      color: "#fff",
      padding: "40px 20px",
      fontFamily: "Poppins, sans-serif"
    }}>
      <div style={{ maxWidth: 1300, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <h1 style={{
            fontSize: "2.8rem",
            fontWeight: 800,
            background: "linear-gradient(to right,#8b5cf6,#f472b6,#60a5fa)",
            WebkitBackgroundClip: "text",
            color: "transparent",
            marginBottom: 10
          }}>
            📋 Team Dashboard
          </h1>
          <p style={{ color: "#cbd5e1", fontWeight: 500 }}>
            {teamInfo ? `Analytics for "${teamInfo.team_name}"` : "Team Analytics"}
          </p>
        </div>

        {/* Summary Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
          gap: 20,
          marginBottom: 40
        }}>
          {[
            { icon: "📊", title: "Total Feedback", value: stats.total },
            { icon: "✅", title: "Accepted", value: stats.accepted },
            { icon: "❌", title: "Rejected", value: stats.rejected },
            { icon: "👥", title: "Team Members", value: stats.members }
          ].map((c, i) => (
            <div key={i}
              style={{
                background: "rgba(17,25,40,0.85)",
                borderRadius: 20,
                border: "1px solid rgba(148,163,184,0.15)",
                boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
                padding: 24,
                textAlign: "center",
                transition: "transform 0.3s ease, box-shadow 0.3s ease"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-6px) scale(1.03)";
                e.currentTarget.style.boxShadow = "0 12px 36px rgba(0,0,0,0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "none";
                e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.4)";
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

        {/* Filter Dropdown */}
        <div style={{
          background: "rgba(17,25,40,0.85)",
          borderRadius: 20,
          padding: 20,
          marginBottom: 40,
          border: "1px solid rgba(148,163,184,0.15)"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
            <div>
              <h3 style={{ fontWeight: 700 }}>Filter by Member</h3>
              <p style={{ color: "#94a3b8" }}>View analytics for an individual</p>
            </div>
            <select
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              style={{
                background: "rgba(255,255,255,0.1)",
                borderRadius: 10,
                color: "#0c0505ff",
                border: "1px solid rgba(255,255,255,0.2)",
                padding: "10px 14px",
                cursor: "pointer",
                outline: "none"
              }}
            >
              <option value="all">All Members</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.email}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Charts */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(360px,1fr))",
          gap: 24,
          marginBottom: 40
        }}>
          <div style={{
            background: "rgba(17,25,40,0.85)",
            borderRadius: 20,
            border: "1px solid rgba(148,163,184,0.15)",
            padding: 24
          }}>
            <h3 style={{ fontWeight: 700, marginBottom: 10 }}>🥧 Feedback Distribution</h3>
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

          <div style={{
            background: "rgba(17,25,40,0.85)",
            borderRadius: 20,
            border: "1px solid rgba(148,163,184,0.15)",
            padding: 24
          }}>
            <h3 style={{ fontWeight: 700, marginBottom: 10 }}>📊 Suggestion Types</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={barData}>
                <XAxis dataKey="type" stroke="#94a3b8" />
                <YAxis allowDecimals={false} stroke="#94a3b8" />
                <Tooltip />
                <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
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
        <div style={{
          background: "rgba(17,25,40,0.85)",
          borderRadius: 20,
          border: "1px solid rgba(148,163,184,0.15)",
          padding: 24,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700 }}>📋 Feedback Records</h3>
            <button
              onClick={handleDownloadCSV}
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                border: "none",
                background: "linear-gradient(90deg,#6366f1,#8b5cf6,#ec4899)",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
                transition: "0.2s"
              }}
            >
              ⬇️ Download CSV
            </button>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", color: "#fff" }}>
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.05)" }}>
                  {["Member", "Type", "Decision", "Suggestion", "Comment"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "12px", color: "#94a3b8" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {feedback.length > 0 ? (
                  feedback.map((f, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <td style={{ padding: "10px 12px" }}>{getEmail(f.user_id)}</td>
                      <td style={{ padding: "10px 12px" }}>{f.suggestion_type || "General"}</td>
                      <td style={{ padding: "10px 12px" }}>
                        {f.decision === "accepted"
                          ? "✅ Accepted"
                          : f.decision === "rejected"
                          ? "❌ Rejected"
                          : "⏳ Pending"}
                      </td>
                      <td style={{ padding: "10px 12px" }}>{f.suggestion || "-"}</td>
                      <td style={{ padding: "10px 12px" }}>{f.comment || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "20px", color: "#94a3b8" }}>
                      No feedback records available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Navigation Buttons */}
        <div style={{
          textAlign: "center",
          marginTop: 40,
          display: "flex",
          justifyContent: "center",
          gap: 20,
          flexWrap: "wrap"
        }}>
          <Link to="/create-team" style={buttonStyle("#6366f1", "#8b5cf6")}>🆕 Create Team</Link>
          <Link to="/editor" style={buttonStyle("#34d399", "#059669")}>📝 Code Review</Link>
          <Link to="/" style={buttonStyle("#f472b6", "#ec4899")}>🏠 Home</Link>
        </div>
      </div>
    </div>
  );
};

const buttonStyle = (c1, c2) => ({
  padding: "10px 18px",
  borderRadius: 10,
  background: `linear-gradient(90deg,${c1},${c2})`,
  color: "#fff",
  fontWeight: 700,
  textDecoration: "none",
  transition: "0.3s",
});

export default LeaderDashboard;
