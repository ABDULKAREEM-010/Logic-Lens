import React, { useEffect, useState } from 'react';
import axios from 'axios';
import CodeEditor from '../components/CodeEditor';  // Adjust path if needed
import ResultPanel from '../components/ResultPanel';  // Adjust path if needed

const Editor = ({ code, setCode }) => {
  const [filename, setFilename] = useState('');
  const [multiResults, setMultiResults] = useState([]);  // Array of { file, code, analysis }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rawBackendResponse, setRawBackendResponse] = useState(null);

  useEffect(() => {
    const githubCode = localStorage.getItem('github_selected_code');
    const githubFilename = localStorage.getItem('github_selected_filename');
    if (githubCode) {
      setCode(githubCode);
      setFilename(githubFilename || '');
    }
  }, [setCode]);

  // Simple language detection
  const detectLanguage = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'py') return 'python';
    if (ext === 'java') return 'java';
    if (['c', 'cpp', 'h'].includes(ext)) return ext === 'c' ? 'c' : 'cpp';
    return 'javascript';  // Default for .js, .jsx, etc.
  };

  // Read file content client-side (for auto-fix in multi-file)
  const readFileContent = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  };

  // Single-file analysis (from editor code)
  const handleSingleFileAnalyze = async () => {
    if (!code.trim()) {
      alert('No code to analyze');
      return;
    }

    const language = detectLanguage(filename || 'single.js');
    setLoading(true);
    setError(null);

    try {
      console.log('=== SENDING SINGLE-FILE REQUEST ===', { language, codeLength: code.length });

      const res = await axios.post('http://localhost:5000/api/analyze', {
        language,
        code
      });

  const fullResponse = res.data;
  setRawBackendResponse(fullResponse);
      console.log('=== SINGLE-FILE FULL RESPONSE ===', fullResponse);

      // FIXED: Better normalization - preserve the exact backend structure
      const analysis = {
        // Use the exact backend response structure
        geminiReview: fullResponse.geminiReview || { rawReview: '', suggestions: [] },
        suggestions: fullResponse.suggestions || []
      };

      // Enhanced debugging
      console.log('=== SINGLE NORMALIZED ANALYSIS ===', {
        geminiReviewExists: !!analysis.geminiReview,
        rawReviewLength: analysis.geminiReview.rawReview?.length || 0,
        rawReviewPreview: analysis.geminiReview.rawReview?.substring(0, 100) || 'EMPTY',
        totalSuggestionsCount: analysis.suggestions.length,
        geminiSuggestionsCount: analysis.geminiReview.suggestions?.length || 0,
        staticSuggestionsCount: analysis.suggestions.filter(s => s.source !== 'gemini').length
      });

      setMultiResults([{ 
        file: filename || 'single-file.js', 
        code, 
        analysis 
      }]);
    } catch (err) {
      console.error('Single-file error:', err);
      console.log('=== SINGLE-FILE ERROR RESPONSE ===', err.response?.data);
      setError('Single-file analysis failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Multi-file analysis
  const handleMultiFileUpload = async (e) => {
    console.log('=== FILE SELECTION EVENT ===', e.target.files);
    
    const files = Array.from(e.target.files).filter(file =>
      /\.(js|jsx|ts|tsx|py|java|c|cpp|h)$/i.test(file.name)  // Only code files
    );

    console.log('=== FILTERED FILES ===', files.map(f => ({ 
      name: f.name, 
      size: f.size, 
      webkitRelativePath: f.webkitRelativePath,
      type: f.type 
    })));

    if (!files.length) {
      setError('No code files selected. Please choose .js, .py, .java, etc.');
      console.error('=== NO FILES FOUND ===');
      return;
    }

    setLoading(true);
    setError(null);
    setMultiResults([]);

    try {
      console.log('=== SENDING MULTI-FILE REQUEST ===', { fileCount: files.length });

      // Read all file contents client-side first (for auto-fix)
      const fileData = await Promise.all(
        files.map(async (file) => ({
          file,
          code: await readFileContent(file)
        }))
      );

      console.log('=== FILE DATA READ ===', fileData.map(fd => ({
        name: fd.file.name,
        codeLength: fd.code.length,
        codePreview: fd.code.substring(0, 100)
      })));

      // Prepare FormData with original files (backend needs them for analysis)
      const formData = new FormData();
      fileData.forEach(({ file }) => formData.append('files', file));
      // Include relative paths so the server can preserve folder structure and names
      const paths = fileData.map(fd => fd.file.webkitRelativePath || fd.file.name);
      formData.append('paths', JSON.stringify(paths));
      
      console.log('=== FORM DATA PREPARED ===', { 
        fileCount: fileData.length, 
        paths: paths 
      });      // Let axios/browser set the Content-Type (with boundary) automatically
      const res = await axios.post('http://localhost:5000/api/analyze/multi', formData, {
        timeout: 120000  // 2 minutes for AI processing
      });

      console.log('=== AXIOS RESPONSE STATUS ===', res.status);
      const fullResponse = res.data;
      console.log('=== MULTI-FILE FULL RESPONSE ===', fullResponse);
      setRawBackendResponse(fullResponse);

      const backendResults = fullResponse.results || [];
      console.log('=== BACKEND RESULTS ARRAY ===', backendResults);

      if (!backendResults.length) {
        throw new Error('Backend returned no results');
      }

      // CRITICAL FIX: Completely rewrite the normalization to match actual backend structure
      const normalizedResults = backendResults.map((backendResult, index) => {
        console.log(`=== PROCESSING BACKEND RESULT ${index} ===`, backendResult);
        
        // Get filename - backend sends it as 'file' property
        const filename = backendResult.file || `file-${index}`;
        
        // Get code - backend sends it as 'code' property  
        const code = backendResult.code || '';
        
        // Get analysis - backend sends it as 'analysis' property
        const analysis = backendResult.analysis || {};
        
        console.log(`=== RAW ANALYSIS FOR ${filename} ===`, {
          analysisKeys: Object.keys(analysis),
          hasGeminiReview: !!analysis.geminiReview,
          hasSuggestions: !!analysis.suggestions,
          geminiReview: analysis.geminiReview,
          suggestions: analysis.suggestions
        });

        // Create properly structured analysis for ResultPanel
        const normalizedAnalysis = {
          geminiReview: analysis.geminiReview || { rawReview: '', suggestions: [] },
          suggestions: analysis.suggestions || []
        };

        console.log(`=== NORMALIZED ANALYSIS FOR ${filename} ===`, {
          geminiRawReviewLength: normalizedAnalysis.geminiReview.rawReview?.length || 0,
          geminiRawReviewPreview: normalizedAnalysis.geminiReview.rawReview?.substring(0, 100) || 'EMPTY',
          totalSuggestions: normalizedAnalysis.suggestions.length,
          geminiSuggestions: normalizedAnalysis.geminiReview.suggestions?.length || 0
        });

        return {
          file: filename,
          code: code,
          analysis: normalizedAnalysis
        };
      });      setMultiResults(normalizedResults);
    } catch (err) {
      console.error('Multi-file error:', err);
      console.log('=== MULTI-FILE ERROR RESPONSE ===', err.response?.data);
      setError('Failed to analyze files: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Update code for a specific file (for auto-fix in ResultPanel)
  const updateFileCode = (idx, newCode) => {
    setMultiResults(prev => {
      const copy = [...prev];
      copy[idx].code = newCode;
      return copy;
    });
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '2rem auto' }}>
      <h2>
        Editor {filename && <span style={{ color: '#888', fontSize: '1rem' }}>({filename})</span>}
      </h2>

      {/* Debug info */}
      {multiResults.length > 0 && (
        <div style={{ background: '#e3f2fd', padding: '0.5rem', borderRadius: '4px', marginBottom: '1rem', fontSize: '0.9rem' }}>
          📊 <strong>Debug Info:</strong> Found {multiResults.length} files. 
          {multiResults.map((r, i) => (
            <span key={i} style={{ marginLeft: '10px' }}>
              [{i}] {r.file} ({r.code?.length || 0} chars, {r.analysis?.suggestions?.length || 0} suggestions)
            </span>
          ))}
        </div>
      )}

      {/* Main editor for single-file */}
      {!multiResults.length && <CodeEditor code={code} setCode={setCode} />}

      {/* Buttons */}
      <div style={{ marginTop: '1rem' }}>
        <button
          onClick={handleSingleFileAnalyze}
          disabled={loading || !code.trim()}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            marginRight: '1rem'
          }}
        >
          {loading ? 'Analyzing...' : 'Analyze Current File'}
        </button>

        <input
          type="file"
          id="folderInput"
          style={{ display: 'none' }}
          webkitdirectory="true"
          multiple
          onChange={handleMultiFileUpload}
        />
        <button
          onClick={() => document.getElementById('folderInput').click()}
          style={{
            padding: '0.5rem 1rem',
            cursor: 'pointer',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px'
          }}
          disabled={loading}
        >
          {loading ? 'Analyzing...' : 'Select Folder for Multi-File Analysis'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#ffebee', borderRadius: '4px', color: '#c62828' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Results: Multiple ResultPanels for multi-file */}
      {multiResults.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3>Analysis Results ({multiResults.length} files)</h3>
          {multiResults.map((result, idx) => {
            console.log(`=== RENDERING RESULT ${idx} ===`, {
              filename: result.file,
              hasCode: !!result.code,
              codeLength: result.code?.length || 0,
              hasAnalysis: !!result.analysis,
              analysisKeys: Object.keys(result.analysis || {}),
              suggestionsCount: result.analysis?.suggestions?.length || 0,
              geminiReviewExists: !!result.analysis?.geminiReview,
              rawReviewLength: result.analysis?.geminiReview?.rawReview?.length || 0
            });
            
            return (
              <div key={idx} style={{ marginBottom: '2rem', border: '2px solid #2196F3', borderRadius: '8px', padding: '1rem', backgroundColor: '#fafafa' }}>
                <h4 style={{ color: '#2196F3', marginBottom: '1rem' }}>📄 {result.file}</h4>
                <div style={{ marginBottom: '1rem', fontSize: '0.9rem', color: '#666', backgroundColor: '#e3f2fd', padding: '0.5rem', borderRadius: '4px' }}>
                  <strong>File Info:</strong> {result.code?.length || 0} characters
                  {result.analysis?.suggestions && ` | ${result.analysis.suggestions.length} total suggestions`}
                  {result.analysis?.geminiReview?.rawReview && ` | AI Review: ${result.analysis.geminiReview.rawReview.length} chars`}
                  <br />
                  <strong>Debug:</strong> hasAnalysis={!!result.analysis}, hasGeminiReview={!!result.analysis?.geminiReview}, hasCode={!!result.code}
                </div>
                
                {/* FORCE DISPLAY: Always render ResultPanel */}
                <div style={{ border: '1px solid #ccc', borderRadius: '4px', padding: '1rem', backgroundColor: 'white' }}>
                  <ResultPanel
                    result={result.analysis}
                    code={result.code}  // File-specific code for auto-fix
                    language={detectLanguage(result.file)}
                    setCode={(newCode) => updateFileCode(idx, newCode)}  // Update this file's code
                    filename={result.file}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Debug: Raw backend response (toggle) */}
      {rawBackendResponse && (
        <div style={{ marginTop: '1rem', padding: '1rem', background: '#f1f3f5', borderRadius: 6 }}>
          <details open>
            <summary style={{ cursor: 'pointer', fontWeight: '600' }}>🐛 Debug: Backend Response (OPEN THIS TO SEE DATA)</summary>
            <div style={{ marginTop: '1rem' }}>
              <h4>Raw Backend Response:</h4>
              <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto', background: '#fff', padding: '1rem', fontSize: '12px' }}>
                {JSON.stringify(rawBackendResponse, null, 2)}
              </pre>
              
              <h4>Normalized Results:</h4>
              <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto', background: '#fff', padding: '1rem', fontSize: '12px' }}>
                {JSON.stringify(multiResults, null, 2)}
              </pre>
            </div>
          </details>
        </div>
      )}

      {loading && !multiResults.length && <p style={{ color: '#666' }}>Analyzing with AI... This may take a few moments per file.</p>}
      {!loading && multiResults.length === 0 && <p style={{ color: '#666' }}>Paste code or select a folder and analyze to see results.</p>}
    </div>
  );
};

export default Editor;