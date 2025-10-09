// src/pages/GithubCallback.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FaGithub } from "react-icons/fa";
import { supabase } from '../supabaseClient';
import { API_ENDPOINTS } from '../config/api';

const GithubCallback = () => {
  const [status, setStatus] = useState('Processing GitHub login...');
  const [githubUser, setGithubUser] = useState(null);
  const [appUser, setAppUser] = useState(null);
  const [repos, setRepos] = useState([]);
  const [files, setFiles] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileContent, setFileContent] = useState('');
  const [currentPath, setCurrentPath] = useState('');
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [alreadyProcessing, setAlreadyProcessing] = useState(false);
  const hasExchanged = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeGitHubAuth = async () => {
      // Check if user is authenticated with the app first
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        setStatus('❌ Please log into your account first before connecting GitHub');
        setLoading(false);
        return;
      }
      
      setAppUser(authUser);
      
      // Check if user already has GitHub integration
      try {
        const userStorageKey = `github_data_${authUser.id}`;
        const existingGitHubData = localStorage.getItem(userStorageKey);
        
        if (existingGitHubData) {
          const { access_token, github_user } = JSON.parse(existingGitHubData);
          // Verify token is still valid
          const response = await fetch('https://api.github.com/user', {
            headers: { Authorization: `token ${access_token}` }
          });
          
          if (response.ok) {
            setStatus('✅ GitHub already connected!');
            setGithubUser(github_user);
            
            // Fetch repos
            const reposResponse = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
              headers: { Authorization: `token ${access_token}` }
            });
            const reposData = await reposResponse.json();
            setRepos(Array.isArray(reposData) ? reposData : []);
            setLoading(false);
            return;
          } else {
            // Token expired, clear old data
            localStorage.removeItem(userStorageKey);
          }
        }
      } catch (error) {
        console.log('No existing GitHub data or expired token');
      }

      // Prevent double-execution from React StrictMode or re-renders
      if (alreadyProcessing || hasExchanged.current) {
        console.log('OAuth exchange already in progress or completed, skipping');
        setLoading(false);
        return;
      }

      hasExchanged.current = true;

      // Extract ?code=... from URL
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      if (!code) {
        setStatus('No authorization code found in URL. Please authorize GitHub access.');
        setLoading(false);
        return;
      }

      // Avoid exchanging the same code twice
      const exchangeKey = `github_oauth_exchanged_${code}_${authUser.id}`;
      if (sessionStorage.getItem(exchangeKey)) {
        console.log('OAuth code already exchanged for this session, skipping duplicate POST');
        setStatus('GitHub code already processed.');
        setLoading(false);
        return;
      }

      // Mark as processing to prevent concurrent executions
      setAlreadyProcessing(true);

      try {
        // Send code to backend to exchange for access token
        const response = await fetch(API_ENDPOINTS.GITHUB_CALLBACK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, userId: authUser.id })
        });

        const data = await response.json();
        
        if (data.error) {
          setStatus('❌ GitHub login failed: ' + (data.error_description || data.error));
        } else {
          // Mark this code as handled for the session
          sessionStorage.setItem(exchangeKey, '1');

          setStatus('✅ GitHub connected successfully!');
          
          // Store GitHub data with user-specific key
          const userStorageKey = `github_data_${authUser.id}`;
          localStorage.setItem(userStorageKey, JSON.stringify({
            access_token: data.access_token,
            github_user: data.github_user,
            connected_at: new Date().toISOString()
          }));
          
          setGithubUser(data.github_user);

          // Fetch user repos using the access token
          const reposResponse = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
            headers: { Authorization: `token ${data.access_token}` }
          });
          const reposData = await reposResponse.json();
          setRepos(Array.isArray(reposData) ? reposData : []);
        }
      } catch (err) {
        setStatus('❌ GitHub connection failed: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    initializeGitHubAuth();
  }, []);

  // Helper function to get user-specific GitHub token
  const getGitHubToken = () => {
    if (!appUser) return null;
    const userStorageKey = `github_data_${appUser.id}`;
    const gitHubData = localStorage.getItem(userStorageKey);
    if (!gitHubData) return null;
    try {
      return JSON.parse(gitHubData).access_token;
    } catch (e) {
      return null;
    }
  };

  // Fetch files in selected repo or directory
  const fetchFiles = (repo, path = '') => {
    setFiles([]);
    setSelectedFile(null);
    setFileContent('');
    setCurrentPath(path);
    
    const token = getGitHubToken();
    if (!token) {
      setStatus('❌ No GitHub token found. Please reconnect GitHub.');
      return;
    }

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
    
    // Check if file is viewable (not binary)
    const viewableExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.css', '.html', '.json', '.md', '.txt', '.yml', '.yaml'];
    const isViewable = viewableExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isViewable) {
      alert('This file type is not supported for preview. Please select a code file.');
      return;
    }

    // Fetch file content
    setSelectedFile(file);
    setFileContent('Loading...');
    const token = getGitHubToken();
    if (!token) {
      setFileContent('❌ No GitHub token found. Please reconnect GitHub.');
      return;
    }

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

  // Recursively fetch all viewable code files under a path
  const fetchAllFilesRecursive = async (repo, path = '') => {
    const token = getGitHubToken();
    if (!token) {
      throw new Error('No GitHub token found. Please reconnect GitHub.');
    }

    const url = path
      ? `https://api.github.com/repos/${repo.owner.login}/${repo.name}/contents/${path}`
      : `https://api.github.com/repos/${repo.owner.login}/${repo.name}/contents`;

    const results = [];

    const list = await fetch(url, { headers: { Authorization: `token ${token}` } }).then(r => r.json());
    if (!Array.isArray(list)) return results;

    for (const item of list) {
      if (item.type === 'dir') {
        const nested = await fetchAllFilesRecursive(repo, item.path);
        results.push(...nested);
      } else if (item.type === 'file') {
        // only gather common code file extensions
        const viewableExtensions = ['.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.h', '.json', '.md', '.txt', '.yml', '.yaml', '.html', '.css'];
        if (!viewableExtensions.some(ext => item.name.toLowerCase().endsWith(ext))) continue;

        // fetch content
        try {
          const data = await fetch(item.url, { headers: { Authorization: `token ${token}` } }).then(r => r.json());
          if (data && data.content) {
            const decoded = atob(data.content.replace(/\n/g, ''));
            results.push({ name: item.name, path: item.path, code: decoded });
          }
        } catch (e) {
          // ignore individual file failures
          console.warn('Failed to fetch file', item.path, e);
        }
      }
    }

    return results;
  };

  const goBackDirectory = () => {
    const pathParts = currentPath.split('/').filter(Boolean);
    pathParts.pop();
    const newPath = pathParts.join('/');
    fetchFiles(selectedRepo, newPath);
  };

  if (loading) {
    return (
      <div className="container fade-in">
        <div className="text-center py-20">
          <div className="card card-glass inline-block p-8">
            <div className="text-6xl mb-4">🔄</div>
            <h2 className="text-2xl font-bold text-white mb-2">Connecting to GitHub</h2>
            <p className="text-white opacity-80">Processing your authentication...</p>
            <div className="flex justify-center mt-6">
              <div className="loading-spinner"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container fade-in">
      {/* Disconnection Success Overlay */}
      {status.includes('Ready to reconnect') && (
        <div className="reconnect-notice fade-in">
          <div className="notice-content">
            <span className="notice-icon">✅</span>
            <span className="notice-text">GitHub disconnected successfully! You can now reconnect below.</span>
          </div>
        </div>
      )}

      {/* Beautiful Header */}
      <div className="header-gradient mb-8">
        <div className="header-content">
          <div className="header-main">
            <div className="header-icon-wrapper">
              <span className="header-icon"><FaGithub /></span>
            </div>
            <div className="header-text">
              <h1 className="header-title">GitHub Integration</h1>
              <p className="header-subtitle">{status}</p>
            </div>
          </div>
        </div>
      </div>

      {/* User Profile */}
      {githubUser && appUser && (
        <div className="user-profile-card scale-in">
          <div className="profile-header">
            <div className="profile-avatar-section">
              <div className="avatar-wrapper">
                <img 
                  src={githubUser.avatar_url} 
                  alt="GitHub Avatar" 
                  className="profile-avatar"
                />
                <div className="avatar-status"></div>
              </div>
              <div className="profile-info">
                <h3 className="profile-name">{githubUser.name || githubUser.login}</h3>
                <p className="profile-username">@{githubUser.login}</p>
                <p className="app-user-info">Connected to: {appUser.email}</p>
              </div>
            </div>
            <div className="profile-actions">
              <a 
                href={githubUser.html_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="action-btn profile-btn"
              >
                🔗 View Profile
              </a>
              <button
                onClick={async () => {
                  // Prevent multiple clicks
                  if (disconnecting) return;
                  
                  setDisconnecting(true);
                  setStatus('🔄 Disconnecting from GitHub...');
                  
                  try {
                    // Get current GitHub token for revocation
                    const userStorageKey = `github_data_${appUser.id}`;
                    const gitHubData = localStorage.getItem(userStorageKey);
                    let access_token = null;
                    
                    if (gitHubData) {
                      try {
                        const parsedData = JSON.parse(gitHubData);
                        access_token = parsedData.access_token;
                        console.log('Found GitHub token for revocation');
                      } catch (e) {
                        console.warn('Could not parse GitHub data for token revocation:', e);
                      }
                    }

                    // Call backend disconnect endpoint
                    console.log('Calling GitHub disconnect endpoint...');
                    
                    let response, responseData;
                    
                    try {
                      response = await fetch(API_ENDPOINTS.GITHUB_DISCONNECT, {
                        method: 'POST',
                        headers: { 
                          'Content-Type': 'application/json',
                          'Accept': 'application/json'
                        },
                        body: JSON.stringify({ 
                          userId: appUser.id,
                          access_token: access_token
                        }),
                        timeout: 10000 // 10 second timeout
                      });

                      if (!response.ok) {
                        const errorText = await response.text();
                        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
                      }

                      responseData = await response.json();
                      console.log('Backend disconnect successful:', responseData);
                      
                    } catch (fetchError) {
                      if (fetchError.name === 'TypeError' && fetchError.message.includes('fetch')) {
                        throw new Error('Could not connect to server. Please check if the server is running.');
                      } else if (fetchError.message.includes('timeout')) {
                        throw new Error('Server request timed out. Please try again.');
                      } else {
                        throw new Error(`Server error: ${fetchError.message}`);
                      }
                    }

                    // Clear user-specific GitHub data
                    localStorage.removeItem(userStorageKey);
                    console.log('Cleared user-specific GitHub data');
                    
                    // Clear all temporary GitHub data (both user-specific and global for cleanup)
                    const keysToRemove = [
                      'github_selected_code',
                      'github_selected_filename', 
                      'github_multi_files',
                      `github_selected_code_${appUser.id}`,
                      `github_selected_filename_${appUser.id}`,
                      `github_multi_files_${appUser.id}`,
                      // Legacy keys for cleanup
                      'github_access_token',
                      'github_user'
                    ];
                    
                    keysToRemove.forEach(key => {
                      localStorage.removeItem(key);
                    });
                    
                    // Clear session storage
                    Object.keys(sessionStorage).forEach(key => {
                      if (key.startsWith('github_oauth_exchanged_')) {
                        sessionStorage.removeItem(key);
                      }
                    });
                    
                    console.log('Cleared all GitHub-related storage');
                    
                    // Reset component state
                    setGithubUser(null);
                    setRepos([]);
                    setFiles([]);
                    setSelectedRepo(null);
                    setSelectedFile(null);
                    setFileContent('');
                    setCurrentPath('');
                    setLoading(false); // Ensure loading is false to show connect button
                    setStatus('✅ Successfully disconnected from GitHub - Ready to reconnect');
                    
                    console.log('GitHub disconnect completed successfully - ready for reconnection');
                    
                    // After a brief moment, update status to encourage reconnection
                    setTimeout(() => {
                      setGithubUser(null); // Ensure githubUser is null
                      setLoading(false);   // Ensure loading is false
                      if (!githubUser) { // Only if still disconnected
                        setStatus('🔗 Ready to connect GitHub - Click reconnect below');
                      }
                    }, 2000);
                    
                  } catch (error) {
                    console.error('Error during GitHub disconnect:', error);
                    
                    // Show specific error message to user
                    if (error.message.includes('Could not connect to server')) {
                      setStatus('⚠️ Server connection failed - disconnected locally only. Please restart the server.');
                    } else if (error.message.includes('timeout')) {
                      setStatus('⚠️ Server timeout - disconnected locally. Please try again if needed.');
                    } else {
                      setStatus(`❌ Disconnect error: ${error.message}`);
                    }
                    
                    // Always perform local cleanup even if backend fails
                    console.log('Performing local cleanup after error...');
                    const userStorageKey = `github_data_${appUser.id}`;
                    localStorage.removeItem(userStorageKey);
                    
                    // Clear all GitHub-related data
                    const keysToRemove = [
                      'github_selected_code',
                      'github_selected_filename', 
                      'github_multi_files',
                      `github_selected_code_${appUser.id}`,
                      `github_selected_filename_${appUser.id}`,
                      `github_multi_files_${appUser.id}`,
                      'github_access_token',
                      'github_user'
                    ];
                    
                    keysToRemove.forEach(key => localStorage.removeItem(key));
                    
                    // Clear session storage
                    Object.keys(sessionStorage).forEach(key => {
                      if (key.startsWith('github_oauth_exchanged_')) {
                        sessionStorage.removeItem(key);
                      }
                    });
                    
                    // Clear component state
                    setGithubUser(null);
                    setRepos([]);
                    setFiles([]);
                    setSelectedRepo(null);
                    setSelectedFile(null);
                    setFileContent('');
                    setCurrentPath('');
                    setLoading(false); // Ensure loading is false to show connect button
                    
                    console.log('Local cleanup completed after error - ready for reconnection');
                    
                    // Show success message after 3 seconds since local cleanup worked
                    setTimeout(() => {
                      setGithubUser(null); // Ensure githubUser is null
                      setLoading(false);   // Ensure loading is false
                      setStatus('🔗 Disconnected locally - Ready to reconnect GitHub below');
                    }, 3000);
                    
                  } finally {
                    setDisconnecting(false);
                  }
                }}
                disabled={disconnecting}
                className="action-btn logout-btn"
              >
                {disconnecting ? (
                  <>
                    <div className="loading-spinner-small"></div>
                    Disconnecting...
                  </>
                ) : (
                  <>🚪 Disconnect GitHub</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repository List - keeping original */}
      {repos.length > 0 && !selectedRepo && (
        <div className="card card-glass slide-up">
          <div className="card-header">
            <h3 className="text-xl font-semibold text-white">Your Repositories</h3>
            <p className="text-white opacity-80 text-sm">Click on a repository to browse files</p>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {repos.slice(0, 20).map(repo => (
                <div 
                  key={repo.id} 
                  onClick={() => handleRepoClick(repo)}
                  className="repo-card"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-gray-800">{repo.name}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${repo.private ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                      {repo.private ? '🔒 Private' : '🌍 Public'}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{repo.description || 'No description available'}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>⭐ {repo.stargazers_count}</span>
                    <span>🍴 {repo.forks_count}</span>
                    <span>📝 {repo.language || 'N/A'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* File Browser */}
      {selectedRepo && (
        <div className="card card-glass slide-up mb-6">
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">{selectedRepo.name}</h3>
                <p className="text-white opacity-80 text-sm">
                  📁 {currentPath || 'Root directory'}
                </p>
              </div>
              <div className="flex gap-2">
                {currentPath && (
                  <button onClick={goBackDirectory} className="btn btn-ghost btn-sm">
                    ⬆️ Back
                  </button>
                )}
                {/* New: Analyze folder / repo buttons */}
                <button
                  onClick={async () => {
                    try {
                      if (!appUser) {
                        alert('Please log in to your account first');
                        return;
                      }
                      setLoading(true);
                      const files = await fetchAllFilesRecursive(selectedRepo, currentPath || '');
                      if (!files.length) return alert('No viewable code files found in this folder.');
                      // store files with user-specific key to prevent cross-user access
                      localStorage.setItem(`github_multi_files_${appUser.id}`, JSON.stringify(files));
                      navigate('/editor');
                    } catch (err) {
                      console.error(err);
                      alert('Failed to prepare folder for review');
                    } finally { setLoading(false); }
                  }}
                  className="btn btn-primary btn-sm"
                >
                  🔍 Review Folder
                </button>
                <button
                  onClick={async () => {
                    try {
                      if (!appUser) {
                        alert('Please log in to your account first');
                        return;
                      }
                      setLoading(true);
                      const files = await fetchAllFilesRecursive(selectedRepo, '');
                      if (!files.length) return alert('No viewable code files found in this repository.');
                      localStorage.setItem(`github_multi_files_${appUser.id}`, JSON.stringify(files));
                      navigate('/editor');
                    } catch (err) {
                      console.error(err);
                      alert('Failed to prepare repository for review');
                    } finally { setLoading(false); }
                  }}
                  className="btn btn-accent btn-sm"
                >
                  📦 Review Entire Repo
                </button>
                <button 
                  onClick={() => { 
                    setSelectedRepo(null); 
                    setFiles([]); 
                    setSelectedFile(null); 
                    setFileContent('');
                    setCurrentPath('');
                  }} 
                  className="btn btn-secondary btn-sm"
                >
                  📋 All Repos
                </button>
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="space-y-2">
              {files.map(file => (
                <div 
                  key={file.path} 
                  onClick={() => handleFileClick(file)}
                  className="file-item"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {file.type === 'dir' ? '📁' : '📄'}
                    </span>
                    <div className="flex-1">
                      <span className="font-medium text-gray-800">{file.name}</span>
                      <span className="ml-2 text-xs text-gray-500 capitalize">{file.type}</span>
                    </div>
                    {file.type === 'file' && (
                      <span className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* File Content Viewer */}
      {selectedFile && (
        <div className="card shadow-lg scale-in">
          <div className="card-header bg-gradient-to-r from-blue-500 to-purple-600">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-white">{selectedFile.name}</h3>
                <p className="text-white opacity-80 text-sm">{selectedFile.path}</p>
              </div>
              <button
                onClick={() => {
                  if (appUser) {
                    // Store with user-specific key to prevent cross-user access
                    localStorage.setItem(`github_selected_code_${appUser.id}`, fileContent);
                    localStorage.setItem(`github_selected_filename_${appUser.id}`, selectedFile.name);
                    navigate('/editor');
                  }
                }}
                className="btn btn-success"
                disabled={!fileContent || fileContent === 'Loading...' || !appUser}
              >
                🔍 Review Code
              </button>
            </div>
          </div>
          <div className="card-body p-0">
            <pre className="code-preview">
              {fileContent}
            </pre>
          </div>
        </div>
      )}

      {/* Enhanced No User State */}
      {!githubUser && !loading && appUser && (() => {
        console.log('Rendering GitHub connect section:', { githubUser: !!githubUser, loading, appUser: !!appUser, status });
        return true;
      })() && (
        <div className="auth-required-section">
          <div className="auth-card">
            <div className="auth-icon-wrapper">
              <span className="auth-icon">�</span>
            </div>
            <div className="auth-content">
              <h3 className="auth-title">Connect GitHub Account</h3>
              <p className="auth-description">
                Hello {appUser.email}! {status.includes('disconnected') || status.includes('Disconnected') || status.includes('Ready to reconnect') ? 'Reconnect' : 'Connect'} your GitHub account to browse and review your repositories
              </p>
              <div className="auth-actions">
                <button
                  onClick={() => {
                    console.log('User clicking GitHub connect/reconnect button');
                    const clientId = 'Ov23lik9tQOuJI8KleP9';
                    const redirectUri = window.location.origin + '/github-callback';
                    const scope = 'repo user';
                    // Add user ID to state to ensure proper linking
                    const state = btoa(appUser.id);
                    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;
                    
                    // Clear any previous GitHub URL fragments for clean reconnection
                    window.history.replaceState({}, document.title, window.location.pathname);
                    
                    window.location.href = githubAuthUrl;
                  }}
                  className="connect-github-btn"
                >
                  {status.includes('disconnected') || status.includes('Disconnected') || status.includes('Ready to reconnect') ? (
                    <>🔄 Reconnect GitHub</>
                  ) : (
                    <>🔗 Connect GitHub</>
                  )}
                
                </button>
                <Link to="/editor" className="code-editor-btn">
                  ✏️ Code Editor
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* App Authentication Required */}
      {!appUser && !loading && (
        <div className="auth-required-section">
          <div className="auth-card">
            <div className="auth-icon-wrapper">
              <span className="auth-icon">🔐</span>
            </div>
            <div className="auth-content">
              <h3 className="auth-title">Login Required</h3>
              <p className="auth-description">
                Please log into your account first before connecting GitHub
              </p>
              <div className="auth-actions">
                <Link to="/login" className="connect-github-btn">
                  🔐 Login to Account
                </Link>
                <Link to="/editor" className="code-editor-btn">
                  ✏️ Code Editor
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

  <style>{`
        /* VIBRANT BODY BACKGROUND */
        body {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%) !important;
          min-height: 100vh;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
          min-height: 100vh;
        }

        /* BEAUTIFUL HEADER */
        .header-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 20px;
          padding: 2.5rem;
          box-shadow: 0 25px 50px rgba(102, 126, 234, 0.4);
          position: relative;
          overflow: hidden;
          border: 2px solid rgba(255, 255, 255, 0.3);
          margin-bottom: 3rem;
        }

        .header-gradient::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: linear-gradient(45deg, rgba(255,255,255,0.2) 0%, transparent 50%, rgba(255,255,255,0.2) 100%);
          animation: shimmer 3s ease-in-out infinite;
        }

        @keyframes shimmer {
          0%, 100% { transform: translateX(-100%) translateY(-100%) rotate(45deg); }
          50% { transform: translateX(100%) translateY(100%) rotate(45deg); }
        }

        .header-content {
          position: relative;
          z-index: 2;
        }

        .header-main {
          display: flex;
          align-items: center;
          gap: 2rem;
        }

        .header-icon-wrapper {
          background: rgba(255, 255, 255, 0.25);
          border-radius: 50%;
          padding: 1.5rem;
          backdrop-filter: blur(15px);
          box-shadow: 0 12px 40px rgba(255, 255, 255, 0.2);
        }

        .header-icon {
          font-size: 3.5rem;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
        }

        .header-title {
          font-size: 3.5rem;
          font-weight: 900;
          color: white;
          margin: 0;
          text-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          background: linear-gradient(45deg, #ffffff, #f0f0f0);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .header-subtitle {
          color: rgba(255, 255, 255, 0.95);
          font-size: 1.4rem;
          margin: 0.5rem 0 0 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
          font-weight: 600;
        }

        /* ENHANCED USER PROFILE CARD */
        .user-profile-card {
          background: rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          padding: 2rem;
          margin-bottom: 3rem;
          border: 2px solid rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(20px);
          box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
        }

        .profile-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2rem;
        }

        .profile-avatar-section {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .avatar-wrapper {
          position: relative;
        }

        .profile-avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 4px solid rgba(255, 255, 255, 0.8);
          box-shadow: 0 12px 30px rgba(0, 0, 0, 0.3);
        }

        .avatar-status {
          position: absolute;
          bottom: 5px;
          right: 5px;
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4);
        }

        .profile-info {
          color: white;
        }

        .profile-name {
          font-size: 2rem;
          font-weight: 800;
          margin: 0 0 0.5rem 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .profile-username {
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.8);
          margin: 0;
          font-weight: 500;
        }

        .app-user-info {
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.6);
          margin: 0.25rem 0 0 0;
          font-weight: 400;
        }

        .profile-actions {
          display: flex;
          gap: 1rem;
        }

        .action-btn {
          padding: 0.75rem 1.5rem;
          border-radius: 12px;
          font-weight: 700;
          font-size: 1rem;
          text-decoration: none;
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .profile-btn {
          background: linear-gradient(135deg, #3b82f6, #1d4ed8);
          color: white;
          box-shadow: 0 8px 25px rgba(59, 130, 246, 0.4);
        }

        .logout-btn {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          box-shadow: 0 8px 25px rgba(239, 68, 68, 0.4);
        }

        .secondary-btn {
          background: linear-gradient(135deg, #6b7280, #4b5563);
          color: white;
          box-shadow: 0 8px 25px rgba(107, 114, 128, 0.4);
        }

        .action-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 15px 35px rgba(0, 0, 0, 0.4);
          color: white;
          text-decoration: none;
        }

        /* ENHANCED AUTH REQUIRED SECTION */
        .auth-required-section {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 60vh;
        }

        .auth-card {
          background: rgba(81, 50, 181, 0.46);
          border-radius: 25px;
          padding: 3rem;
          text-align: center;
          border: 2px solid rgba(255, 255, 255, 0.3);
          backdrop-filter: blur(20px);
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.3);
          max-width: 500px;
          width: 100%;
        }

        .auth-icon-wrapper {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          padding: 1.5rem;
          display: inline-block;
          margin-bottom: 2rem;
          box-shadow: 0 12px 40px rgba(255, 255, 255, 0.2);
        }

        .auth-icon {
          font-size: 4rem;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
        }

        .auth-content {
          color: white;
        }

        .auth-title {
          font-size: 2.2rem;
          font-weight: 800;
          margin: 0 0 1rem 0;
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .auth-description {
          font-size: 1.2rem;
          color: rgba(255, 255, 255, 0.9);
          margin: 0 0 2.5rem 0;
          line-height: 1.6;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        .auth-actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        .connect-github-btn {
          background: linear-gradient(135deg, #f97316, #ea580c);
          color: white;
          border: none;
          padding: 1.2rem 2.5rem;
          border-radius: 15px;
          font-weight: 700;
          font-size: 1.2rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 12px 30px rgba(249, 115, 22, 0.4);
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .connect-github-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 20px 40px rgba(249, 115, 22, 0.5);
          background: linear-gradient(135deg, #fb923c, #f97316);
        }

        .code-editor-btn {
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border: 2px solid rgba(255, 255, 255, 0.4);
          padding: 1.2rem 2.5rem;
          border-radius: 15px;
          font-weight: 700;
          font-size: 1.2rem;
          text-decoration: none;
          transition: all 0.3s ease;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          backdrop-filter: blur(10px);
        }

        .code-editor-btn:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: translateY(-3px);
          text-decoration: none;
          color: white;
          box-shadow: 0 15px 35px rgba(255, 255, 255, 0.2);
        }

        /* LOADING SPINNER */
        .loading-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top: 3px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .loading-spinner-small {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          display: inline-block;
          margin-right: 0.5rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        /* ANIMATIONS */
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }

        @keyframes slide-up {
          from { opacity: 0; transform: translateY(50px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .fade-in {
          animation: fade-in 0.8s ease-out forwards;
        }

        .scale-in {
          animation: scale-in 0.6s ease-out forwards;
        }

        .slide-up {
          animation: slide-up 0.7s ease-out forwards;
        }

        /* Reconnect Notice */
        .reconnect-notice {
          background: linear-gradient(135deg, #10b981, #059669);
          border-radius: 12px;
          padding: 1rem 1.5rem;
          margin-bottom: 2rem;
          box-shadow: 0 8px 25px rgba(16, 185, 129, 0.3);
          border: 2px solid rgba(255, 255, 255, 0.2);
        }

        .notice-content {
          display: flex;
          align-items: center;
          gap: 1rem;
          color: white;
          font-weight: 600;
          font-size: 1.1rem;
        }

        .notice-icon {
          font-size: 1.5rem;
        }

        .notice-text {
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
        }

        /* EXISTING STYLES FOR REPO SECTION */
        .repo-card {
          background: white;
          padding: 1rem;
          border-radius: 0.75rem;
          border: 2px solid transparent;
          cursor: pointer;
          transition: all 0.25s ease;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .repo-card:hover {
          border-color: var(--primary-blue);
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .file-item {
          background: white;
          padding: 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid #e2e8f0;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .file-item:hover {
          background: #f8fafc;
          border-color: var(--primary-blue);
          transform: translateX(4px);
        }

        .code-preview {
          background: var(--bg-dark);
          color: #e2e8f0;
          padding: 1.5rem;
          font-family: 'Fira Code', 'Monaco', 'Cascadia Code', monospace;
          font-size: 0.875rem;
          line-height: 1.6;
          overflow-x: auto;
          max-height: 600px;
          overflow-y: auto;
          margin: 0;
          white-space: pre-wrap;
        }

        /* RESPONSIVE */
        @media (max-width: 768px) {
          .container {
            padding: 1rem;
          }

          .header-main {
            flex-direction: column;
            text-align: center;
          }

          .header-title {
            font-size: 2.5rem;
          }

          .profile-header {
            flex-direction: column;
            text-align: center;
          }

          .auth-actions {
            flex-direction: column;
          }

          .auth-card {
            padding: 2rem;
          }
        }

        /* UTILITY CLASSES */
        .w-20 { width: 5rem; }
        .h-20 { height: 5rem; }
        .rounded-full { border-radius: 9999px; }
        .mx-auto { margin-left: auto; margin-right: auto; }
        .border-4 { border-width: 4px; }
        .border-white { border-color: white; }
        .shadow-lg { box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        .grid { display: grid; }
        .grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
        @media (min-width: 768px) {
          .md\\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        .gap-4 { gap: 1rem; }
        .flex { display: flex; }
        .items-center { align-items: center; }
        .items-start { align-items: flex-start; }
        .justify-between { justify-content: space-between; }
        .justify-center { justify-content: center; }
        .gap-2 { gap: 0.5rem; }
        .gap-3 { gap: 0.75rem; }
        .gap-6 { gap: 1.5rem; }
        .flex-1 { flex: 1; }
        .space-y-2 > * + * { margin-top: 0.5rem; }
        .text-xs { font-size: 0.75rem; }
        .text-sm { font-size: 0.875rem; }
        .inline-block { display: inline-block; }
        .py-12 { padding-top: 3rem; padding-bottom: 3rem; }
        .py-20 { padding-top: 5rem; padding-bottom: 5rem; }
      `}</style>
    </div>
  );
};

export default GithubCallback;