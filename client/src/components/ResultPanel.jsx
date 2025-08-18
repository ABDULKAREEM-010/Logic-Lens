import React, { useState } from 'react';
import { parseGeminiReview } from '../utils/parseGeminiReview';
import { applyReplacements } from '../utils/applyReplacement';

const ResultPanel = ({ result, code, language, setCode }) => {
  const [comment, setComment] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState({});

  const handleFeedback = async (suggestion, decision, autoFixApplied = false) => {
    const key = `${suggestion.source || 'linter'}-${suggestion.message}`;
    setFeedbackStatus(prev => ({ ...prev, [key]: 'submitting' }));

    const res = await fetch('http://localhost:5000/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language,
        originalCode: code,
        suggestionText: suggestion.message,
        action: decision,
        optionalReason: comment,
        autoFixApplied
      })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Feedback error:', data.error);
      setFeedbackStatus(prev => ({ ...prev, [key]: 'error' }));
    } else {
      setFeedbackStatus(prev => ({ ...prev, [key]: decision }));
      setComment('');
    }
  };

  const handleAutoFix = (suggestion) => {
    if (!suggestion.replacement || !suggestion.line) {
      alert("Auto-fix not available for this suggestion.");
      return;
    }

    const newCode = applyReplacements(code, [
      { line: suggestion.line, newText: suggestion.replacement.to }
    ]);

    setCode(newCode);
    handleFeedback(suggestion, 'accepted', true);
  };

  return (
    <div className="result-panel" style={{ marginTop: '1rem' }}>
      {result.error && (
        <p style={{ color: 'red', fontWeight: 'bold' }}>{result.error}</p>
      )}

      {result.suggestions?.length > 0 && (
        <>
          <h2 style={{ fontSize: '1.25rem', borderBottom: '1px solid #ddd', paddingBottom: '0.25rem' }}>
            AI Suggestions ({result.suggestions.length})
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
            {result.suggestions.map((s, index) => {
              const status = feedbackStatus[`${s.source || 'linter'}-${s.message}`];
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

                  {s.replacement?.from && (
                    <>
                      <p><strong>Original:</strong></p>
                      <pre style={styles.codeBlock}>{s.replacement.from}</pre>
                    </>
                  )}

                  {s.replacement?.to && (
                    <>
                      <p><strong>Suggested:</strong></p>
                      <pre style={{ ...styles.codeBlock, backgroundColor: '#e8f5e9' }}>{s.replacement.to}</pre>
                    </>
                  )}

                  <textarea
                    placeholder="Optional comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    style={styles.textarea}
                  />

                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() =>
                        s.replacement ? handleAutoFix(s) : handleFeedback(s, 'accepted')
                      }
                      style={styles.acceptButton}
                      disabled={status === 'submitting'}
                    >
                      ✅ Accept
                    </button>

                    <button
                      onClick={() => handleFeedback(s, 'rejected')}
                      style={styles.rejectButton}
                      disabled={status === 'submitting'}
                    >
                      ❌ Reject
                    </button>
                  </div>

                  {status === 'accepted' && <p style={{ color: 'green' }}>Feedback accepted ✅</p>}
                  {status === 'rejected' && <p style={{ color: 'red' }}>Feedback rejected ❌</p>}
                  {status === 'error' && <p style={{ color: 'red' }}>Error submitting feedback</p>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {result.geminiReview?.rawReview && (
        <>
          <h2 style={{ fontWeight: 'bold', marginTop: '2rem', borderBottom: '1px solid #ddd' }}>Gemini Review</h2>
          <div style={styles.geminiBox}>
            <p style={{ whiteSpace: 'pre-wrap' }}>{result.geminiReview.rawReview}</p>
          </div>

          {Array.isArray(result.geminiReview.suggestions) && result.geminiReview.suggestions.length > 0 && (
            <>
              <h3 style={{ marginTop: '1rem' }}>Gemini Suggestions</h3>
              {result.geminiReview.suggestions.map((s, i) => {
                const key = `gemini-${s.message}`;
                const status = feedbackStatus[key];
                const hasFix = s.replacement?.to;

                return (
                  <div key={i} style={styles.geminiSuggestion}>
                    <p><strong>Line {s.line}</strong>: {s.message}</p>

                    {s.replacement?.from && (
                      <>
                        <p><strong>Original:</strong></p>
                        <pre style={styles.codeBlock}>{s.replacement.from}</pre>
                      </>
                    )}

                    {s.replacement?.to && (
                      <>
                        <p><strong>Suggested:</strong></p>
                        <pre style={{ ...styles.codeBlock, backgroundColor: '#e8f5e9' }}>{s.replacement.to}</pre>
                      </>
                    )}

                    {/* Show buttons only when there is a code suggestion */}
                    {hasFix && (
                      <>
                        <textarea
                          placeholder="Optional comment"
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          style={styles.textarea}
                        />

                        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => handleAutoFix(s)}
                            style={styles.acceptButton}
                            disabled={status === 'submitting'}
                          >
                            ✅ Accept
                          </button>

                          <button
                            onClick={() => handleFeedback(s, 'rejected')}
                            style={styles.rejectButton}
                            disabled={status === 'submitting'}
                          >
                            ❌ Reject
                          </button>
                        </div>

                        {status === 'accepted' && <p style={{ color: 'green' }}>Feedback accepted ✅</p>}
                        {status === 'rejected' && <p style={{ color: 'red' }}>Feedback rejected ❌</p>}
                        {status === 'error' && <p style={{ color: 'red' }}>Error submitting feedback</p>}
                      </>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </>
      )}
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
    padding: '0.4rem 1rem',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  rejectButton: {
    backgroundColor: '#f44336',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.4rem 1rem',
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
