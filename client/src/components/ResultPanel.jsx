import React, { useState } from 'react';
import { parseGeminiReview } from '../utils/parseGeminiReview';
import { applyReplacements } from '../utils/applyReplacement';
import { supabase } from '../supabaseClient';

const standardComments = [
  "Incorrect logic",
  "Syntax error",
  "Poor readability",
  "Missing edge cases"
];

const ResultPanel = ({ result, code, language, setCode }) => {
  const [comment, setComment] = useState('');
  const [selectedStandardComments, setSelectedStandardComments] = useState({});
  const [feedbackStatus, setFeedbackStatus] = useState({});
  const [showRejectOptions, setShowRejectOptions] = useState({});

  const getAccessToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const handleFeedback = async (suggestion, decision, autoFixApplied = false) => {
    const key = `${suggestion.source || 'static'}-${suggestion.message || suggestion.title || Math.random()}`;
    setFeedbackStatus(prev => ({ ...prev, [key]: 'submitting' }));

    const token = await getAccessToken();
    if (!token) {
      console.error('No session token found');
      setFeedbackStatus(prev => ({ ...prev, [key]: 'error' }));
      return;
    }

    const combinedComment = decision === 'rejected'
      ? [...(selectedStandardComments[key] || []), comment].filter(Boolean).join('; ')
      : comment;

    const payload = {
      language,
      originalCode: code,
      suggestionText: suggestion.message || suggestion.title || '',
      action: decision,
      optionalReason: combinedComment,
      autoFixApplied,
      source: suggestion.source || 'static',
      suggestion_type: suggestion.type || 'syntax'
    };

    try {
      const res = await fetch('http://localhost:5000/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Feedback error:', data.error);
        setFeedbackStatus(prev => ({ ...prev, [key]: 'error' }));
      } else {
        setFeedbackStatus(prev => ({ ...prev, [key]: decision }));
        setComment('');
        setSelectedStandardComments(prev => ({ ...prev, [key]: [] }));
        setShowRejectOptions(prev => ({ ...prev, [key]: false }));
      }
    } catch (err) {
      console.error('Network error:', err);
      setFeedbackStatus(prev => ({ ...prev, [key]: 'error' }));
    }
  };

  const handleAutoFix = async (suggestion) => {
    if (!suggestion.replacement?.to || !suggestion.line) {
      alert("Auto-fix not available for this suggestion.");
      return;
    }

    const newCode = applyReplacements(code, [
      { line: suggestion.line, newText: suggestion.replacement.to }
    ]);

    setCode(newCode);
    await handleFeedback(suggestion, 'accepted', true);
  };

  const toggleCheckbox = (index, key) => {
    setSelectedStandardComments(prev => {
      const copy = prev[key] || [];
      const comment = standardComments[index];
      return {
        ...prev,
        [key]: copy.includes(comment)
          ? copy.filter(c => c !== comment)
          : [...copy, comment]
      };
    });
  };

  const handleAcceptAll = async () => {
    if (!code) return;

    const replacements = result.suggestions
      .filter(s => s.replacement?.to)
      .map(s => ({ line: s.line, newText: s.replacement.to, suggestion: s }));

    const newCode = applyReplacements(code, replacements);
    setCode(newCode);

    // Send feedback for all suggestions as accepted
    for (const r of replacements) {
      await handleFeedback(r.suggestion, 'accepted', true);
    }
  };

  return (
    <div className="result-panel" style={{ marginTop: '1rem' }}>
      {result.error && <p style={{ color: 'red', fontWeight: 'bold' }}>{result.error}</p>}

      {result.suggestions?.length > 0 && (
        <>
          <h2 style={{ fontSize: '1.25rem', borderBottom: '1px solid #ddd', paddingBottom: '0.25rem' }}>
            Static Suggestions ({result.suggestions.length})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {result.suggestions.map((s, index) => {
              const key = `${s.source || 'static'}-${s.message}`;
              const status = feedbackStatus[key];

              return (
                <div
                  key={index}
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    padding: '1rem',
                    backgroundColor: '#ffffff',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: '600', color: '#333' }}>
                      ⚠️ Line {s.line} - {s.symbol || s.type}
                    </span>
                    <span
                      style={{
                        backgroundColor: '#ffe0b2',
                        color: '#b26a00',
                        borderRadius: '10px',
                        padding: '0.2rem 0.6rem',
                        fontSize: '0.75rem',
                        fontWeight: 'bold'
                      }}
                    >
                      {s.severity || 'medium'}
                    </span>
                  </div>

                  <p style={{ marginTop: '0.5rem' }}>{s.message}</p>

                  {s.replacement?.from && <>
                    <p><strong>Original:</strong></p>
                    <pre style={styles.codeBlock}>{s.replacement.from}</pre>
                  </>}

                  {s.replacement?.to && <>
                    <p><strong>Suggested:</strong></p>
                    <pre style={{ ...styles.codeBlock, backgroundColor: '#e8f5e9' }}>{s.replacement.to}</pre>
                  </>}

                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleAutoFix(s)}
                      style={styles.acceptButton}
                      disabled={status === 'submitting'}
                    >
                      ✅ Accept
                    </button>

                    <button
                      onClick={() => setShowRejectOptions(prev => ({ ...prev, [key]: true }))}
                      style={styles.rejectButton}
                      disabled={status === 'submitting'}
                    >
                      ❌ Reject
                    </button>
                  </div>

                  {showRejectOptions[key] && (
                    <div style={{ marginTop: '0.5rem' }}>
                      {standardComments.map((c, i) => (
                        <label key={i} style={{ display: 'block', marginBottom: '0.25rem' }}>
                          <input
                            type="checkbox"
                            checked={(selectedStandardComments[key] || []).includes(c)}
                            onChange={() => toggleCheckbox(i, key)}
                          />{' '}
                          {c}
                        </label>
                      ))}
                      <textarea
                        placeholder="Additional comment..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        style={styles.textarea}
                      />
                      <button
                        onClick={() => handleFeedback(s, 'rejected')}
                        style={{ ...styles.rejectButton, marginTop: '0.5rem' }}
                        disabled={status === 'submitting'}
                      >
                        Submit Reject
                      </button>
                    </div>
                  )}

                  {status === 'accepted' && <p style={{ color: 'green' }}>Feedback accepted ✅</p>}
                  {status === 'rejected' && !showRejectOptions[key] && <p style={{ color: 'red' }}>Feedback rejected ❌</p>}
                  {status === 'error' && <p style={{ color: 'red' }}>Error submitting feedback</p>}
                </div>
              );
            })}
          </div>

          {/* Accept All button */}
          <div style={{ marginTop: '1rem' }}>
            <button onClick={handleAcceptAll} style={{ ...styles.acceptButton, width: '100%' }}>
              ✅ Accept All
            </button>
          </div>
        </>
      )}

      {result.geminiReview?.rawReview && <>
        <h2 style={{ fontWeight: 'bold', marginTop: '2rem', borderBottom: '1px solid #ddd' }}>Gemini Review</h2>
        <div style={styles.geminiBox}>
          <p style={{ whiteSpace: 'pre-wrap' }}>{result.geminiReview.rawReview}</p>
        </div>

        {parseGeminiReview(result.geminiReview.rawReview).map((section, idx) => {
          if (section.type === 'code') return (
            <div key={idx} style={styles.geminiSuggestion}>
              <pre style={styles.codeBlock}>{section.code}</pre>
            </div>
          );
          else if (section.type === 'text') return (
            <div key={idx} style={styles.geminiSuggestion}>
              <h3>{section.title}</h3>
              {section.content.map((line, i) => <p key={i}>{line}</p>)}
            </div>
          );
          return null;
        })}
      </>}
    </div>
  );
};

const styles = {
  codeBlock: {
    background: '#f5f5f5',
    padding: '0.5rem',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '0.9rem',
    overflowX: 'auto'
  },
  textarea: {
    width: '100%',
    marginTop: '0.5rem',
    padding: '0.5rem',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '0.9rem'
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  rejectButton: {
    backgroundColor: '#f44336',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  geminiBox: {
    backgroundColor: '#f9f9f9',
    padding: '1rem',
    border: '1px solid #ccc',
    borderRadius: '8px',
    marginTop: '1rem',
    fontSize: '0.95rem',
    fontFamily: 'Segoe UI, sans-serif',
    color: '#333'
  },
  geminiSuggestion: {
    border: '1px solid #ccc',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '1rem',
    backgroundColor: '#fefefe'
  }
};

export default ResultPanel;
