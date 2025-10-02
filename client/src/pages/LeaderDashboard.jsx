import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

const LeaderDashboard = () => {
  const { teamId } = useParams(); // gets :teamId from URL
  const [feedback, setFeedback] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState("all");

  // Fetch members and feedback
  useEffect(() => {
    if (!teamId) return;

    const fetchData = async () => {
      try {
        // 1. Fetch team members
        const { data: teamMembers, error: tmError } = await supabase
          .from("team_members") // change to your table name
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
            .from("user_profiles") // view with id,email
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
          setFeedback(feedbackData);
        }
      } catch (err) {
        console.error("Unexpected error fetching data:", err);
      }
    };

    fetchData();
  }, [teamId, selectedMember]);

  // Pie chart data
  const chartData = [
    { name: "Accepted", value: feedback.filter((f) => f.decision === "accepted").length },
    { name: "Rejected", value: feedback.filter((f) => f.decision === "rejected").length },
  ];

  // Map user_id to email for table display
  const getEmail = (userId) => {
    const user = members.find((m) => m.id === userId);
    return user?.email || "Unknown";
  };

  return (
    <div>
      <h2>Team Feedback for {teamId}</h2>

      {/* Filter Dropdown */}
      <label>Filter by Member: </label>
      <select value={selectedMember} onChange={(e) => setSelectedMember(e.target.value)}>
        <option value="all">All Members</option>
        {members.map((m) => (
          <option key={m.id} value={m.id}>
            {m.email || "Unknown"}
          </option>
        ))}
      </select>

      {/* Pie Chart */}
      <PieChart width={400} height={300}>
        <Pie
          data={chartData}
          cx={200}
          cy={150}
          labelLine={false}
          outerRadius={100}
          dataKey="value"
          nameKey="name"
        >
          {chartData.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>

      {/* Feedback Table */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
        <thead>
          <tr>
            <th style={styles.th}>Email</th>
            <th style={styles.th}>Original Code</th>
            <th style={styles.th}>Suggestion</th>
            <th style={styles.th}>Type</th>
            <th style={styles.th}>Decision</th>
            <th style={styles.th}>Comment</th>
          </tr>
        </thead>
        <tbody>
          {feedback.map((f) => (
            <tr key={f.id} style={styles.tr}>
              <td style={styles.td}>{getEmail(f.user_id)}</td>
              <td style={styles.td}>
                <pre style={styles.codeBlock}>{f.code}</pre>
              </td>
              <td style={styles.td}>{f.suggestion}</td>
              <td style={styles.td}>{f.suggestion_type}</td>
              <td style={styles.td}>{f.decision}</td>
              <td style={styles.td}>{f.comment}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const styles = {
  th: { border: "1px solid #ddd", padding: "8px", backgroundColor: "#f2f2f2" },
  td: { border: "1px solid #ddd", padding: "8px", verticalAlign: "top" },
  tr: { borderBottom: "1px solid #ddd" },
  codeBlock: { background: "#f5f5f5", padding: "4px", borderRadius: "4px", fontFamily: "monospace" },
};

export default LeaderDashboard;
