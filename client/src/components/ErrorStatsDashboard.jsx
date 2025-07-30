import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';

const ErrorStatsDashboard = () => {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('http://localhost:5000/api/feedback/all')
      .then(res => res.json())
      .then(data => {
        const grouped = {};

        data.forEach(entry => {
          const key = classifyError(entry.suggestion || 'unknown');
          if (!grouped[key]) {
            grouped[key] = { count: 0 };
          }
          grouped[key].count += 1;
        });

        setStats(grouped);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching feedback data:', err);
        setLoading(false);
      });
  }, []);

  const classifyError = (suggestionText) => {
    const text = suggestionText.toLowerCase();
    if (text.includes('syntax') || text.includes('unexpected')) return 'Syntax Error';
    if (text.includes('null') || text.includes('logic') || text.includes('unreachable')) return 'Logic Error';
    if (text.includes('style') || text.includes('format') || text.includes('indent')) return 'Style Error';
    if (text.includes('deprecated') || text.includes('unused')) return 'Code Smell';
    return 'Other';
  };

  const total = Object.values(stats).reduce((sum, s) => sum + s.count, 0);

  const chartData = Object.entries(stats).map(([type, { count }]) => ({
    name: type,
    count,
    percent: ((count / total) * 100).toFixed(1),
  }));

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>📊 Error Statistics Dashboard</h2>
      {loading ? (
        <p style={{ textAlign: 'center' }}>Loading stats...</p>
      ) : (
        <>
          {/* Cards */}
          <div style={styles.cardsWrapper}>
            {Object.entries(stats).map(([type, { count }], i) => (
              <div
                key={i}
                style={{
                  ...styles.card,
                  backgroundColor: softColors[type] || '#f0f0f0',
                }}
              >
                <h3 style={{ marginBottom: '0.5rem' }}>{type}</h3>
                <p><strong>Count:</strong> {count}</p>
                <p><strong>Percentage:</strong> {((count / total) * 100).toFixed(1)}%</p>
              </div>
            ))}
          </div>

          {/* Bar Chart */}
          <div style={{ width: '100%', height: 300, marginTop: '2rem' }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#3f51b5" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
};

const softColors = {
  'Syntax Error': '#fff9c4',   // light yellow
  'Logic Error': '#ffccbc',    // light orange-red
  'Style Error': '#b3e5fc',    // light blue
  'Code Smell': '#c8e6c9',     // light green
  'Other': '#e1bee7',          // light purple
};

const styles = {
  container: {
    padding: '2rem',
    fontFamily: 'sans-serif',
    backgroundColor: '#f7f9fc',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    maxWidth: '1000px',
    margin: '2rem auto',
  },
  heading: {
    textAlign: 'center',
    color: '#333',
    marginBottom: '1rem',
  },
  cardsWrapper: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    justifyContent: 'center',
  },
  card: {
    borderRadius: '10px',
    boxShadow: '0 1px 5px rgba(0,0,0,0.1)',
    padding: '1rem',
    minWidth: '200px',
    textAlign: 'center',
    border: '1px solid #e0e0e0',
    transition: 'transform 0.2s ease',
  }
};

export default ErrorStatsDashboard;
