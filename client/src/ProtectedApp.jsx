// // src/ProtectedApp.jsx
// import React, { useState, useEffect } from 'react';
// import { supabase } from './supabaseClient';
// import CodeEditor from './components/CodeEditor';
// import ResultPanel from './components/ResultPanel';
// import ErrorStatsDashboard from './components/ErrorStatsDashboard';
// import { useNavigate } from 'react-router-dom';
// import AdminDashboard from './components/AdminDashboard';

// const ProtectedApp = () => {
//   const [code, setCode] = useState('');
//   const [multipleFiles, setMultipleFiles] = useState([]);
//   const [language, setLanguage] = useState('python');
//   const [result, setResult] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [isAdmin, setIsAdmin] = useState(false);
//   const [showDashboard, setShowDashboard] = useState(false);
//   const [user, setUser] = useState(null);
//   const navigate = useNavigate();

//   // Load code from localStorage (GitHub)
//   useEffect(() => {
//     const githubCode = localStorage.getItem('github_selected_code');
//     if (githubCode) setCode(githubCode);
//   }, []);

//   useEffect(() => {
//     const fetchUser = async () => {
//       const { data: { user } } = await supabase.auth.getUser();
//       if (!user) {
//         navigate('/login');
//         return;
//       }
//       setUser(user);
//       setIsAdmin(user.user_metadata?.isAdmin === true);
//     };
//     fetchUser();
//   }, [navigate]);

//   const handleLogout = async () => {
//     await supabase.auth.signOut();
//     setUser(null);
//     navigate('/login');
//   };

//   const handleGithubIntegration = () => {
//     const clientId = 'Ov23lik9tQOuJI8KleP9';
//     const redirectUri = 'http://localhost:5173/github-callback';
//     const scope = 'repo user';
//     const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
//     window.location.href = githubAuthUrl;
//   };

//   // Read folder recursively
//   const readFilesRecursively = async (dirHandle, path = '') => {
//     const files = [];
//     for await (const handle of dirHandle.values()) {
//       const name = handle.name;
//       if (handle.kind === 'file') {
//         const file = await handle.getFile();
//         const text = await file.text();
//         files.push({ filename: path + name, code: text });
//       } else if (handle.kind === 'directory') {
//         const nestedFiles = await readFilesRecursively(handle, path + name + '/');
//         files.push(...nestedFiles);
//       }
//     }
//     return files;
//   };

//   const handleSelectFolder = async () => {
//     try {
//       const dirHandle = await window.showDirectoryPicker();
//       const files = await readFilesRecursively(dirHandle);
//       console.log('Files found in folder:', files);
//       setMultipleFiles(files);
//       setResult(null); // clear previous results
//     } catch (err) {
//       console.error('Folder selection cancelled or failed:', err);
//     }
//   };

//   const handleAnalyze = async () => {
//     setLoading(true);
//     setResult(null);

//     try {
//       const sessionData = await supabase.auth.getSession();
//       const token = sessionData.data.session?.access_token;
//       const userId = sessionData.data.session?.user?.id;

//       // Single code analyze
//       if (multipleFiles.length === 0) {
//         const res = await fetch('http://localhost:5000/api/analyze', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//             Authorization: `Bearer ${token}`
//           },
//           body: JSON.stringify({ code, language, userId })
//         });
//         const data = await res.json();
//         setResult(data);
//       } else {
//         // Analyze multiple files
//         const analysisResults = [];
//         for (const file of multipleFiles) {
//           const res = await fetch('http://localhost:5000/api/analyze', {
//             method: 'POST',
//             headers: {
//               'Content-Type': 'application/json',
//               Authorization: `Bearer ${token}`
//             },
//             body: JSON.stringify({ code: file.code, language, userId, filename: file.filename })
//           });
//           const data = await res.json();
//           analysisResults.push({ filename: file.filename, result: data });
//         }
//         setResult({ multipleFiles: analysisResults });
//       }
//     } catch (error) {
//       console.error('Error:', error);
//       setResult({ error: 'Server error' });
//     }

//     setLoading(false);
//   };

//   return (
//     <div style={styles.page}>
//       <h1 style={styles.heading}>🔍 Code Review Bot</h1>
//       <div style={styles.userRow}>
//         <span>👋 {user?.email}</span>
//         <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
//         <button onClick={handleGithubIntegration} style={styles.githubBtn}>GitHub</button>
//       </div>

//       {isAdmin && <AdminDashboard />}

//       <div style={styles.controls}>
//         <select value={language} onChange={e => setLanguage(e.target.value)} style={styles.select}>
//           <option value="python">Python</option>
//           <option value="javascript">JavaScript</option>
//           <option value="java">Java</option>
//           <option value="cpp">C++</option>
//           <option value="c">C</option>
//         </select>
//         <button style={styles.buttonPrimary} onClick={handleAnalyze}>Analyze</button>
//         <button style={styles.buttonSecondary} onClick={() => setShowDashboard(!showDashboard)}>
//           {showDashboard ? 'Hide Dashboard' : '📊 Dashboard'}
//         </button>
//         <button style={styles.buttonSecondary} onClick={handleSelectFolder}>📁 Multiple Files</button>
//       </div>

//       <CodeEditor code={code} setCode={setCode} />

//       {loading && <p style={{ textAlign: 'center' }}>Analyzing...</p>}

//       {result && (
//         <ResultPanel
//           result={result}
//           code={code}
//           setCode={setCode}
//           language={language}
//           multipleFiles={multipleFiles}
//         />
//       )}

//       {showDashboard && <ErrorStatsDashboard />}
//     </div>
//   );
// };

// const styles = {
//   page: { fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f0f4f8', minHeight: '100vh', padding: '2rem' },
//   heading: { textAlign: 'center', color: '#333', fontSize: '2rem', marginBottom: '1rem' },
//   userRow: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginBottom: '1rem', paddingRight: '1rem' },
//   logoutBtn: { backgroundColor: '#e53935', color: 'white', border: 'none', borderRadius: '6px', padding: '0.4rem 1rem', cursor: 'pointer', fontWeight: 'bold' },
//   githubBtn: { backgroundColor: '#24292f', color: 'white', border: 'none', borderRadius: '6px', padding: '0.4rem 1rem', cursor: 'pointer', fontWeight: 'bold', marginLeft: '0.5rem' },
//   controls: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' },
//   select: { padding: '0.5rem', fontSize: '1rem', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff' },
//   buttonPrimary: { backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', padding: '0.6rem 1.2rem', cursor: 'pointer', fontWeight: 'bold' },
//   buttonSecondary: { backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '6px', padding: '0.6rem 1.2rem', cursor: 'pointer', fontWeight: 'bold' },
// };

// export default ProtectedApp;
// src/ProtectedApp.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import CodeEditor from './components/CodeEditor';
import ResultPanel from './components/ResultPanel';
import ErrorStatsDashboard from './components/ErrorStatsDashboard';
import { useNavigate } from 'react-router-dom';
import AdminDashboard from './components/AdminDashboard';

const ProtectedApp = () => {
  const [code, setCode] = useState('');
  const [multipleFiles, setMultipleFiles] = useState([]); // { filename, code }
  const [language, setLanguage] = useState('python');
  const [result, setResult] = useState(null); // will hold { results: [...] } for multi or analysis for single
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  // Load code from localStorage (GitHub)
  useEffect(() => {
    const githubCode = localStorage.getItem('github_selected_code');
    if (githubCode) setCode(githubCode);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/login');
        return;
      }
      setUser(user);
      setIsAdmin(user.user_metadata?.isAdmin === true);
    };
    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/login');
  };

  const handleGithubIntegration = () => {
    const clientId = 'Ov23lik9tQOuJI8KleP9';
    const redirectUri = 'http://localhost:5173/github-callback';
    const scope = 'repo user';
    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
    window.location.href = githubAuthUrl;
  };

  // Read folder recursively (File System Access API)
  const readFilesRecursively = async (dirHandle, path = '') => {
    const files = [];
    for await (const handle of dirHandle.values()) {
      const name = handle.name;
      if (handle.kind === 'file') {
        const file = await handle.getFile();
        const text = await file.text();
        files.push({ filename: path + name, code: text });
      } else if (handle.kind === 'directory') {
        const nestedFiles = await readFilesRecursively(handle, path + name + '/');
        files.push(...nestedFiles);
      }
    }
    return files;
  };

  const handleSelectFolder = async () => {
    try {
      const dirHandle = await window.showDirectoryPicker();
      const files = await readFilesRecursively(dirHandle);
      console.log('Files found in folder:', files);
      setMultipleFiles(files);
      setResult(null); // clear previous results
    } catch (err) {
      console.error('Folder selection cancelled or failed:', err);
    }
  };

  // Utility: convert multipleFiles state into FormData and hit /api/analyze/multi
  const analyzeMultipleFiles = async (token) => {
    // Build FormData
    const formData = new FormData();
    // append Files (construct File objects from code text so backend multer receives them)
    multipleFiles.forEach((f, idx) => {
      const blob = new Blob([f.code], { type: 'text/plain' });
      // Construct a File with the original filename so multer.originalname is set
      const clientFile = new File([blob], f.filename);
      formData.append('files', clientFile);
    });
    // include 'paths' metadata so backend can reconstruct relative paths
    formData.append('paths', JSON.stringify(multipleFiles.map(f => f.filename)));

    // Send to multi endpoint. Do NOT set Content-Type header (browser will set boundary)
    const res = await fetch('http://localhost:5000/api/analyze/multi', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Multi-file analysis failed: ${res.status}`);
    }
    const data = await res.json();
    return data; // expected shape: { results: [ { file, code, analysis } ] }
  };

  // Main analyze handler (single-file or multi-file)
  const handleAnalyze = async () => {
    setLoading(true);
    setResult(null);

    try {
      const sessionData = await supabase.auth.getSession();
      const token = sessionData.data.session?.access_token;
      const userId = sessionData.data.session?.user?.id;

      // Single file analyze (existing behavior)
      if (!multipleFiles || multipleFiles.length === 0) {
        const res = await fetch('http://localhost:5000/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : ''
          },
          body: JSON.stringify({ code, language, userId })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Single-file analysis failed');
        }
        const data = await res.json();
        // setResult as the single-file analysis (keeps compatibility with existing ResultPanel usage)
        setResult(data);
      } else {
        // Multi-file analyze: send all files in one request
        const multiData = await analyzeMultipleFiles(token);
        // Save the returned structure (expecting { results: [...] })
        setResult(multiData);
      }
    } catch (error) {
      console.error('Error:', error);
      setResult({ error: error.message || 'Server error' });
    } finally {
      setLoading(false);
    }
  };

  // Update code for a specific file in multipleFiles AND in result.results so UI stays in sync
  const updateFileCode = (idx, newCode) => {
    setMultipleFiles(prev => {
      const copy = [...prev];
      if (!copy[idx]) return prev;
      copy[idx] = { ...copy[idx], code: newCode };
      return copy;
    });

    // Also update result.results if we have multi results
    setResult(prev => {
      if (!prev || !prev.results) return prev;
      const copy = { ...prev };
      copy.results = copy.results.map((r, i) => i === idx ? { ...r, code: newCode } : r);
      return copy;
    });
  };

  // Helper to detect language by extension (kept simple)
  const detectLanguage = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'py') return 'python';
    if (ext === 'java') return 'java';
    if (['c', 'cpp', 'h'].includes(ext)) return ext === 'c' ? 'c' : 'cpp';
    return 'javascript';
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>🔍 Code Review Bot</h1>
      <div style={styles.userRow}>
        <span>👋 {user?.email}</span>
        <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
        <button onClick={handleGithubIntegration} style={styles.githubBtn}>GitHub</button>
      </div>

      {isAdmin && <AdminDashboard />}

      <div style={styles.controls}>
        <select value={language} onChange={e => setLanguage(e.target.value)} style={styles.select}>
          <option value="python">Python</option>
          <option value="javascript">JavaScript</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
          <option value="c">C</option>
        </select>
        <button style={styles.buttonPrimary} onClick={handleAnalyze} disabled={loading}>
          {loading ? 'Analyzing...' : 'Analyze'}
        </button>
        <button style={styles.buttonSecondary} onClick={() => setShowDashboard(!showDashboard)}>
          {showDashboard ? 'Hide Dashboard' : '📊 Dashboard'}
        </button>
        <button style={styles.buttonSecondary} onClick={handleSelectFolder}>
          📁 Multiple Files
        </button>
      </div>

      <CodeEditor code={code} setCode={setCode} />

      {loading && <p style={{ textAlign: 'center' }}>Analyzing...</p>}

      {/* Render results:
          - Single-file: `result` is the analysis object { suggestions, geminiReview }
          - Multi-file: `result` is { results: [ { file, code, analysis } ] } */}
      {result && result.results && Array.isArray(result.results) && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Analysis Results ({result.results.length} files)</h3>

          {result.results.map((r, idx) => {
            // Debug logging if needed
            console.log(`Rendering result ${idx}`, { file: r.file, codeLength: r.code?.length, analysisKeys: Object.keys(r.analysis || {}) });

            return (
              <div key={idx} style={{ marginBottom: '2rem', border: '2px solid #2196F3', borderRadius: '8px', padding: '1rem', backgroundColor: '#fafafa' }}>
                <h4 style={{ color: '#2196F3', marginBottom: '1rem' }}>📄 {r.file}</h4>
                <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#666', backgroundColor: '#e3f2fd', padding: '0.5rem', borderRadius: '4px' }}>
                  <strong>File Info:</strong> {r.code?.length || 0} characters
                  {r.analysis?.suggestions && ` | ${r.analysis.suggestions.length} total suggestions`}
                  {r.analysis?.geminiReview?.rawReview && ` | AI Review: ${r.analysis.geminiReview.rawReview.length} chars`}
                </div>

                <div style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '1rem', backgroundColor: 'white' }}>
                  <ResultPanel
                    result={r.analysis}
                    code={r.code}
                    language={detectLanguage(r.file)}
                    setCode={(newCode) => updateFileCode(idx, newCode)}
                    filename={r.file}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Single-file display (if result looks like a single analysis object) */}
      {result && !result.results && !result.error && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Analysis Result</h3>
          <ResultPanel result={result} code={code} language={language} setCode={setCode} filename={null} />
        </div>
      )}

      {/* Error display */}
      {result && result.error && (
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#ffebee', borderRadius: '4px', color: '#c62828' }}>
          <strong>Error:</strong> {result.error}
        </div>
      )}

      {showDashboard && <ErrorStatsDashboard />}
    </div>
  );
};

const styles = {
  page: { fontFamily: 'Segoe UI, sans-serif', backgroundColor: '#f0f4f8', minHeight: '100vh', padding: '2rem' },
  heading: { textAlign: 'center', color: '#333', fontSize: '2rem', marginBottom: '1rem' },
  userRow: { display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem', marginBottom: '1rem', paddingRight: '1rem' },
  logoutBtn: { backgroundColor: '#e53935', color: 'white', border: 'none', borderRadius: '6px', padding: '0.4rem 1rem', cursor: 'pointer', fontWeight: 'bold' },
  githubBtn: { backgroundColor: '#24292f', color: 'white', border: 'none', borderRadius: '6px', padding: '0.4rem 1rem', cursor: 'pointer', fontWeight: 'bold', marginLeft: '0.5rem' },
  controls: { display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' },
  select: { padding: '0.5rem', fontSize: '1rem', borderRadius: '6px', border: '1px solid #ccc', backgroundColor: '#fff' },
  buttonPrimary: { backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '6px', padding: '0.6rem 1.2rem', cursor: 'pointer', fontWeight: 'bold' },
  buttonSecondary: { backgroundColor: '#2196F3', color: 'white', border: 'none', borderRadius: '6px', padding: '0.6rem 1.2rem', cursor: 'pointer', fontWeight: 'bold' },
};

export default ProtectedApp;
