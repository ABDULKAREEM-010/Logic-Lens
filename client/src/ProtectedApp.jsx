// src/ProtectedApp.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseclient';
import CodeEditor from './components/CodeEditor';
import ResultPanel from './components/ResultPanel';
import ErrorStatsDashboard from './components/ErrorStatsDashboard';
import { useNavigate } from 'react-router-dom';
import AdminDashboard from './components/AdminDashboard';

const ProtectedApp = () => {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('python');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
  const fetchUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/login');
      return;
    }
    setUser(user);

    // ✅ Check isAdmin from user_metadata
    setIsAdmin(user.user_metadata?.isAdmin === true);
  };

  fetchUser();
}, [navigate]);


  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/login');
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);

    const lowerCode = code.trim().toLowerCase();
    const mismatch =
      (language === 'python' && !lowerCode.includes('def')) ||
      (language === 'javascript' && !lowerCode.includes('function') && !lowerCode.includes('=>')) ||
      (language === 'java' && !lowerCode.includes('class') && !lowerCode.includes('public')) ||
      (language === 'cpp' && !lowerCode.includes('#include') && !lowerCode.includes('std::')) ||
      (language === 'c' && !lowerCode.includes('#include') && lowerCode.includes('std::'));

    if (mismatch) {
      setResult({ error: `The selected language (${language}) doesn't seem to match the code provided.` });
      setLoading(false);
      return;
    }

    try {
      const sessionData = await supabase.auth.getSession();
      const token = sessionData.data.session?.access_token;
      const userId = sessionData.data.session?.user?.id;

      const res = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ code, language, userId })
      });

      const data = await res.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setResult({ error: 'Server error' });
    }

    setLoading(false);
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>🔍 Code Review Bot</h1>
      <div style={styles.userRow}>
        <span>👋 {user?.email}</span>
        <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
      </div>

      {isAdmin && <AdminDashboard />}

      <div style={styles.controls}>
        <select
          value={language}
          onChange={e => setLanguage(e.target.value)}
          style={styles.select}
        >
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
          <option value="c">C</option>
        </select>
        <button style={styles.buttonPrimary} onClick={handleAnalyze}>Analyze</button>
        <button style={styles.buttonSecondary} onClick={() => setShowDashboard(!showDashboard)}>
          {showDashboard ? 'Hide Dashboard' : '📊 Dashboard'}
        </button>
      </div>

      <CodeEditor code={code} setCode={setCode} />
      {loading && <p style={{ textAlign: 'center' }}>Analyzing...</p>}
      {result && (
        <ResultPanel
          result={result}
          code={code}
          setCode={setCode}
          language={language}
        />
      )}
      {showDashboard && <ErrorStatsDashboard />}
    </div>
  );
};

const styles = {
  page: {
    fontFamily: 'Segoe UI, sans-serif',
    backgroundColor: '#f0f4f8',
    minHeight: '100vh',
    padding: '2rem',
  },
  heading: {
    textAlign: 'center',
    color: '#333',
    fontSize: '2rem',
    marginBottom: '1rem',
  },
  userRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
    paddingRight: '1rem'
  },
  logoutBtn: {
    backgroundColor: '#e53935',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '0.4rem 1rem',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem',
    flexWrap: 'wrap',
  },
  select: {
    padding: '0.5rem',
    fontSize: '1rem',
    borderRadius: '6px',
    border: '1px solid #ccc',
    backgroundColor: '#fff',
  },
  buttonPrimary: {
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '0.6rem 1.2rem',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  buttonSecondary: {
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    padding: '0.6rem 1.2rem',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
};

export default ProtectedApp;
