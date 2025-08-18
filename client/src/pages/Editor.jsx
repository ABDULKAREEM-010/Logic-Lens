// Editor.jsx
import React, { useEffect, useState } from 'react';
import CodeEditor from '../components/CodeEditor';

const Editor = () => {
  const [code, setCode] = useState('');
  const [filename, setFilename] = useState('');

  useEffect(() => {
    // Load code from localStorage if present (from GitHub review)
    const githubCode = localStorage.getItem('github_selected_code');
    const githubFilename = localStorage.getItem('github_selected_filename');
    if (githubCode) {
      setCode(githubCode);
      setFilename(githubFilename || '');
      // Optionally clear after loading
      // localStorage.removeItem('github_selected_code');
      // localStorage.removeItem('github_selected_filename');
    }
  }, []);

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '2rem auto' }}>
      <h2>Editor {filename && <span style={{ color: '#888', fontSize: '1rem' }}>({filename})</span>}</h2>
      <CodeEditor code={code} setCode={setCode} />
    </div>
  );
};

export default Editor;
