// src/pages/GithubCallback.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const GithubCallback = () => {
  const [status, setStatus] = useState('Processing GitHub login...');
  const [user, setUser] = useState(null);
  const [repos, setRepos] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Extract ?code=... from URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (!code) {
      setStatus('No code found in URL.');
      return;
    }

    // Send code to backend to exchange for access token
    fetch('http://localhost:5000/api/github/callback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setStatus('GitHub login failed: ' + data.error);
        } else {
          setStatus('GitHub login successful!');
          localStorage.setItem('github_access_token', data.access_token);
          localStorage.setItem('github_user', JSON.stringify(data.github_user));
          setUser(data.github_user);

          // Fetch user repos using the access token
          fetch('https://api.github.com/user/repos', {
            headers: { Authorization: `token ${data.access_token}` }
          })
            .then(res => res.json())
            .then(reposData => {
              setRepos(Array.isArray(reposData) ? reposData : []);
            })
            .catch(() => setRepos([]));
        }
      })
      .catch(err => {
        setStatus('GitHub login failed: ' + err.message);
      });
  }, []);


  // Fetch files in selected repo or directory
  const fetchFiles = (repo, path = '') => {
    setFiles([]);
    setSelectedFile(null);
    setFileContent('');
    const token = localStorage.getItem('github_access_token');
    const url = path
      ? `https://api.github.com/repos/${repo.owner.login}/${repo.name}/contents/${path}`
      : `https://api.github.com/repos/${repo.owner.login}/${repo.name}/contents`;
    fetch(url, {
      headers: { Authorization: `token ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        setFiles(Array.isArray(data) ? data : []);
      })
      .catch(() => setFiles([]));
  };

  // Initial repo click
  const handleRepoClick = (repo) => {
    setSelectedRepo(repo);
    fetchFiles(repo);
  };

  // Handle file or directory click
  const handleFileClick = (file) => {
    if (file.type === 'dir') {
      // Fetch contents of directory
      fetchFiles(selectedRepo, file.path);
      return;
    }
    // Fetch file content
    setSelectedFile(file);
    setFileContent('');
    const token = localStorage.getItem('github_access_token');
    fetch(`https://api.github.com/repos/${selectedRepo.owner.login}/${selectedRepo.name}/contents/${file.path}`, {
      headers: { Authorization: `token ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.content) {
          // Decode base64 content
          const decoded = atob(data.content.replace(/\n/g, ''));
          setFileContent(decoded);
        } else {
          setFileContent('Failed to load file content.');
        }
      })
      .catch(() => setFileContent('Failed to load file content.'));
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>GitHub Login</h2>
      <p>{status}</p>
      {user && (
        <div style={{ marginTop: '2rem' }}>
          <img src={user.avatar_url} alt="avatar" style={{ width: 80, borderRadius: '50%' }} />
          <h3>{user.name || user.login}</h3>
          <p><a href={user.html_url} target="_blank" rel="noopener noreferrer">View GitHub Profile</a></p>
        </div>
      )}
      {repos.length > 0 && !selectedRepo && (
        <div style={{ marginTop: '2rem', textAlign: 'left', maxWidth: 600, margin: '2rem auto' }}>
          <h3>Your Repositories (click to view files):</h3>
          <ul>
            {repos.map(repo => (
              <li key={repo.id} style={{ marginBottom: '1rem', cursor: 'pointer' }} onClick={() => handleRepoClick(repo)}>
                <strong>{repo.name}</strong>
                <span style={{ marginLeft: '1rem', color: '#555' }}>{repo.private ? 'Private' : 'Public'}</span>
                <div style={{ fontSize: '0.9rem', color: '#888' }}>{repo.description}</div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {selectedRepo && (
        <div style={{ marginTop: '2rem', textAlign: 'left', maxWidth: 600, margin: '2rem auto' }}>
          <h3>Files in {selectedRepo.name} (click to view):</h3>
          <ul>
            {files.map(file => (
              <li key={file.path} style={{ marginBottom: '1rem', cursor: 'pointer' }} onClick={() => handleFileClick(file)}>
                <strong>{file.name}</strong>
                <span style={{ marginLeft: '1rem', color: '#555' }}>{file.type}</span>
              </li>
            ))}
          </ul>
          <button style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', borderRadius: 6, background: '#2196F3', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
            onClick={() => { setSelectedRepo(null); setFiles([]); setSelectedFile(null); setFileContent(''); }}
          >Back to Repos</button>
        </div>
      )}
      {selectedFile && (
        <div style={{ marginTop: '2rem', textAlign: 'left', maxWidth: 800, margin: '2rem auto', position: 'relative' }}>
          <h3>File: {selectedFile.name}</h3>
          <pre style={{ background: '#f5f5f5', padding: '1rem', borderRadius: '6px', fontSize: '1rem', overflowX: 'auto' }}>{fileContent}</pre>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', borderRadius: 6, background: '#4CAF50', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
              onClick={() => {
                // Store code in localStorage and redirect to main page
                localStorage.setItem('github_selected_code', fileContent);
                localStorage.setItem('github_selected_filename', selectedFile.name);
                navigate('/');
              }}
            >Review Code</button>
          </div>
        </div>
      )}
      <button style={{ marginTop: '2rem', padding: '0.5rem 1.5rem', borderRadius: 6, background: '#e53935', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
        onClick={() => {
          localStorage.removeItem('github_access_token');
          localStorage.removeItem('github_user');
          setUser(null);
          setRepos([]);
          setFiles([]);
          setSelectedRepo(null);
          setSelectedFile(null);
          setFileContent('');
          setStatus('Logged out from GitHub.');
        }}
      >Logout GitHub</button>
      <button style={{ marginTop: '2rem', marginLeft: '1rem', padding: '0.5rem 1.5rem', borderRadius: 6, background: '#2196F3', color: '#fff', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
        onClick={() => navigate('/editor')}
      >Go to Editor</button>
    </div>
  );
};

export default GithubCallback;
