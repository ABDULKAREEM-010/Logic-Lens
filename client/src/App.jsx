import React, { useState } from 'react';
import CodeEditor from './components/CodeEditor';
import ResultPanel from './components/ResultPanel';
import ErrorStatsDashboard from './components/ErrorStatsDashboard';

const App = () => {
  return (
    <div style={styles.page}>
      <h1 style={styles.heading}>🔍 Code Review Bot</h1>

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
  }
};

export default App;
