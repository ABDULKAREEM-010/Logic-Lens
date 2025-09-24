import React, { useEffect, useState } from "react";
import axios from "axios";
import { Card, CardContent } from "../components/ui/card";
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

const COLORS = ["#0088FE", "#00C49F", "#FFBB28"];

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Fetch feedback stats from backend
        const res = await axios.get("http://localhost:5000/api/stats");
        const feedbacks = res.data.feedbacks || [];

        // No Supabase email fetching; just use user_id
        const feedbacksWithId = feedbacks.map(fb => ({
          ...fb,
          email: fb.user_id, // Display user_id instead
        }));

        setStats({
          total: res.data.total || 0,
          accepted: res.data.accepted || 0,
          rejected: res.data.rejected || 0,
          feedbacks: feedbacksWithId,
          errorTypes: {
            syntax: res.data.errorTypes?.syntax || 0,
            semantic: res.data.errorTypes?.semantic || 0,
            logical: res.data.errorTypes?.logical || 0,
          },
        });
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    };

    fetchStats();
  }, []);

  if (!stats) return <p>Loading admin dashboard...</p>;

  const pieData = [
    { name: "Accepted", value: stats.accepted },
    { name: "Rejected", value: stats.rejected },
  ];

  const barData = [
    { type: "Syntax", count: stats.errorTypes.syntax },
    { type: "Semantic", count: stats.errorTypes.semantic },
    { type: "Logical", count: stats.errorTypes.logical },
  ];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold">Total Suggestions</h2>
            <p className="text-2xl">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold">Accepted</h2>
            <p className="text-2xl text-green-600">{stats.accepted}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h2 className="text-lg font-semibold">Rejected</h2>
            <p className="text-2xl text-red-500">{stats.rejected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold mb-2">Accept vs Reject</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  outerRadius={100}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h2 className="text-lg font-semibold mb-2">Error Type Breakdown</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData}>
                <XAxis dataKey="type" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Feedback Table */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-2">All Feedbacks</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-4 py-2">User ID</th>
                <th className="border px-4 py-2">Type</th>
                <th className="border px-4 py-2">Accepted</th>
                <th className="border px-4 py-2">Comment</th>
                <th className="border px-4 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {stats.feedbacks.map(fb => (
                <tr key={fb.id}>
                  <td className="border px-4 py-2 text-xs">{fb.email}</td>
                  <td className="border px-4 py-2">{fb.suggestion_type || "-"}</td>
                  <td className="border px-4 py-2">
                    {fb.decision === "accepted" ? "✅" : "❌"}
                  </td>
                  <td className="border px-4 py-2">{fb.comment || "-"}</td>
                  <td className="border px-4 py-2">
                    <button
                      onClick={() => setSelectedFeedback(fb)}
                      className="text-blue-600 underline"
                    >
                      More Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* More Details Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-lg max-w-2xl w-full overflow-auto">
            <h2 className="text-xl font-bold mb-4">Feedback Details</h2>

            <p><strong>User ID:</strong> {selectedFeedback.email}</p>
            <p><strong>Type:</strong> {selectedFeedback.suggestion_type || "-"}</p>
            <p><strong>Accepted:</strong> {selectedFeedback.decision === "accepted" ? "Yes" : "No"}</p>
            <p><strong>Comment:</strong> {selectedFeedback.comment || "N/A"}</p>

            <p><strong>Original Code:</strong></p>
            <pre className="bg-gray-100 p-2 overflow-auto max-h-60">{selectedFeedback.code || "-"}</pre>

            <p><strong>Suggested Change:</strong></p>
            <pre className="bg-gray-100 p-2 overflow-auto max-h-60">{selectedFeedback.suggestion || "-"}</pre>

            <div className="text-right mt-4">
              <button
                onClick={() => setSelectedFeedback(null)}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;
