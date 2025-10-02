import React, { useState } from 'react';
import { parseGeminiReview } from '../utils/parseGeminiReview';  // Adjust path if needed (or remove if unused)
import { applyReplacements } from '../utils/applyReplacement';  // Adjust path if needed (or remove if unused)
import { supabase } from '../supabaseClient';  // Adjust path if needed (or remove if unused)

const standardComments = [
  "Incorrect logic",
  "Syntax error", 
  "Poor readability",
  "Missing edge cases"
];

const ResultPanel = ({ result, code, language, setCode, filename }) => {
  const [comment, setComment] = useState('');
  const [selectedStandardComments, setSelectedStandardComments] = useState({});
  const [feedbackStatus, setFeedbackStatus] = useState({});
  const [showRejectOptions, setShowRejectOptions] = useState({});
  const [collapsed, setCollapsed] = useState(false);
  const [showGeminiReplacement, setShowGeminiReplacement] = useState({});

  // CRITICAL DEBUG: Log exactly what props are received
  console.log('=== ResultPanel RAW PROPS ===', {
    result: result,
    code: code?.substring(0, 100) + '...',
    codeLength: code?.length,
    language: language,
    filename: filename,
    resultType: typeof result,
    resultKeys: result ? Object.keys(result) : 'NO_RESULT'
  });

  // FIXED: Robust data normalization that preserves all backend data
  const normalizedResult = {
    filename: filename || 'unknown',
    geminiReview: result?.geminiReview || { rawReview: '', suggestions: [] },
    suggestions: result?.suggestions || []
  };

  // Enhanced debug logging to track what data is received
  console.log('=== ResultPanel received data ===', {
    filename: normalizedResult.filename,
    resultKeys: Object.keys(result || {}),
    geminiReviewExists: !!normalizedResult.geminiReview,
    rawReviewContent: normalizedResult.geminiReview?.rawReview?.substring(0, 200) || 'EMPTY',
    rawReviewLength: normalizedResult.geminiReview?.rawReview?.length || 0,
    totalSuggestionsCount: normalizedResult.suggestions.length,
    geminiSuggestionsFromReview: normalizedResult.geminiReview?.suggestions?.length || 0
  });

  // FIXED: Proper suggestion separation with no data loss
  const allSuggestions = normalizedResult.suggestions || [];
  const staticSuggestions = allSuggestions.filter(s => s.source !== 'gemini');
  
  // Gemini suggestions can come from two sources - merge them without duplicates
  const geminiFromReview = normalizedResult.geminiReview?.suggestions || [];
  const geminiFromMain = allSuggestions.filter(s => s.source === 'gemini');
  
  // Use Set to avoid duplicates, then convert back to array
  const geminiSuggestions = [
    ...geminiFromReview,
    ...geminiFromMain.filter(s => !geminiFromReview.some(gr => gr.message === s.message))
  ];

  // Enhanced debug logging
  console.log('=== ResultPanel Debug Info ===', {
    filename: normalizedResult.filename,
    geminiReviewExists: !!normalizedResult.geminiReview,
    rawReviewLength: normalizedResult.geminiReview.rawReview?.length || 0,
    rawReviewPreview: normalizedResult.geminiReview.rawReview?.substring(0, 100) || 'EMPTY',
    totalSuggestionsCount: allSuggestions.length,
    staticSuggestionsCount: staticSuggestions.length,
    geminiSuggestionsCount: geminiSuggestions.length,
    geminiFromReviewCount: geminiFromReview.length,
    geminiFromMainCount: geminiFromMain.length
  });

  const getAccessToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const handleFeedback = async (suggestion, decision, autoFixApplied = false) => {
    const key = `${suggestion.source || 'static'}-${suggestion.message?.substring(0, 20) || suggestion.title?.substring(0, 20) || Math.random()}`;
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
        if (decision === 'rejected') {
          setComment('');
          setSelectedStandardComments(prev => ({ ...prev, [key]: [] }));
          setShowRejectOptions(prev => ({ ...prev, [key]: false }));
        }
      }
    } catch (err) {
      console.error('Network error:', err);
      setFeedbackStatus(prev => ({ ...prev, [key]: 'error' }));
    }
  };

  const handleAutoFix = async (suggestion) => {
    if (suggestion.source === 'gemini') {
      alert("Gemini suggestions provide full code examples. Copy-paste manually or review the replacement below.");
      return;
    }

    if (!suggestion.replacement?.to || !suggestion.line) {
      alert("Auto-fix not available for this suggestion.");
      return;
    }

    const newCode = applyReplacements(code, [
      { line: suggestion.line, newText: suggestion.replacement.to }
    ]);

    setCode?.(newCode);
    await handleFeedback(suggestion, 'accepted', true);
  };

  // Toggle Gemini replacement visibility
  const toggleGeminiReplacement = (key) => {
    setShowGeminiReplacement(prev => ({ ...prev, [key]: !prev[key] }));
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

    // Only auto-apply static suggestions (skip Gemini)
    const staticReplacements = staticSuggestions
      ?.filter(s => s.replacement?.to)
      .map(s => ({ line: s.line, newText: s.replacement.to, suggestion: s })) || [];

    if (staticReplacements.length > 0) {
      const newCode = applyReplacements(code, staticReplacements);
      setCode?.(newCode);

      for (const r of staticReplacements) {
        await handleFeedback(r.suggestion, 'accepted', true);
      }
    }

    // Alert about Gemini suggestions that need manual review
    const geminiCount = geminiSuggestions.length;
    if (geminiCount > 0) {
      alert(`Applied ${staticReplacements.length} static fixes. Review ${geminiCount} AI suggestions manually.`);
    } else if (staticReplacements.length === 0) {
      alert('No auto-fixable suggestions found.');
    }
  };

  // FIXED: Complete suggestion card renderer with proper key generation
  const renderSuggestionCard = (s, index, isGemini = false) => {
    const key = `${isGemini ? 'gemini' : (s.source || 'static')}-${s.message?.substring(0, 20) || index}`;
    const status = feedbackStatus[key];

    return (
      <div
        key={key}
        style={{
          border: '1px solid #e0e0e0',
          borderRadius: '8px',
          padding: '1rem',
          backgroundColor: isGemini ? '#f0f8ff' : '#ffffff',
          boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
          marginBottom: '1rem'
        }}
      >
        {/* Suggestion Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: '600', color: '#333' }}>
            {isGemini ? '🔍' : '⚠️'} Line {s.line || 'N/A'} {isGemini ? '(AI Insight)' : `- ${s.symbol || s.type || 'Issue'}`}
          </span>
          <span
            style={{
              backgroundColor: isGemini ? '#4285f4' : '#ffe0b2',
              color: isGemini ? 'white' : '#b26a00',
              borderRadius: '10px',
              padding: '0.2rem 0.6rem',
              fontSize: '0.75rem',
              fontWeight: 'bold'
            }}
          >
            {isGemini ? 'AI Review' : (s.severity || 'Medium')}
          </span>
        </div>

        {/* Suggestion Message */}
        <p style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>{s.message || 'No message available'}</p>

        {/* Static Replacement (from/to) */}
        {s.replacement?.from && !isGemini && (
          <div>
            <strong>Current:</strong>
            <pre style={styles.codeBlock}>{s.replacement.from}</pre>
          </div>
        )}
        {s.replacement?.to && !isGemini && (
          <div>
            <strong>Suggested:</strong>
            <pre style={{ ...styles.codeBlock, backgroundColor: '#e8f5e9' }}>{s.replacement.to}</pre>
          </div>
        )}

        {/* Gemini Replacement (full snippet) */}
        {isGemini && s.replacement && (
          <>
            <button
              onClick={() => toggleGeminiReplacement(key)}
              style={{
                ...styles.button,
                backgroundColor: '#4285f4',
                marginTop: '0.5rem',
                fontSize: '0.85rem'
              }}
            >
              {showGeminiReplacement[key] ? 'Hide' : 'View'} Code Suggestion
            </button>
            {showGeminiReplacement[key] && (
              <div>
                <strong>AI Suggested Code:</strong>
                <pre style={styles.codeBlock}>{s.replacement}</pre>
              </div>
            )}
          </>
        )}

        {/* Action Buttons */}
        <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
          {isGemini ? (
            <>
              <button
                onClick={() => handleFeedback(s, 'accepted')}
                style={{...styles.button, backgroundColor: '#4CAF50'}}
                disabled={status === 'submitting'}
              >
                ✅ Accept AI Feedback
              </button>
              <button
                onClick={() => setShowRejectOptions(prev => ({ ...prev, [key]: !prev[key] }))}
                style={{...styles.button, backgroundColor: '#f44336'}}
                disabled={status === 'submitting'}
              >
                ❌ Reject
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => handleAutoFix(s)}
                style={{...styles.button, backgroundColor: '#4CAF50'}}
                disabled={status === 'submitting' || !s.replacement?.to}
              >
                ✅ Accept & Apply Fix
              </button>
              <button
                onClick={() => setShowRejectOptions(prev => ({ ...prev, [key]: !prev[key] }))}
                style={{...styles.button, backgroundColor: '#f44336'}}
                disabled={status === 'submitting'}
              >
                ❌ Reject
              </button>
            </>
          )}
        </div>

        {/* Reject Options Panel */}
        {showRejectOptions[key] && (
          <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#fff3cd', borderRadius: '6px', border: '1px solid #ffeaa7' }}>
            <h4 style={{ margin: '0 0 0.5rem 0', color: '#856404' }}>Why reject this suggestion?</h4>
            {standardComments.map((c, i) => (
              <label key={i} style={{ display: 'block', marginBottom: '0.3rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={(selectedStandardComments[key] || []).includes(c)}
                  onChange={() => toggleCheckbox(i, key)}
                  style={{ marginRight: '0.5rem' }}
                />
                {c}
              </label>
            ))}
            <textarea
              placeholder="Additional reason (optional)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              style={styles.textarea}
            />
            <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => handleFeedback(s, 'rejected')}
                style={{...styles.button, backgroundColor: '#f44336'}}
                disabled={status === 'submitting'}
              >
                Submit Rejection
              </button>
              <button
                onClick={() => setShowRejectOptions(prev => ({ ...prev, [key]: false }))}
                style={{...styles.button, backgroundColor: '#6c757d'}}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Status Messages */}
        {status === 'accepted' && <p style={{ color: 'green', marginTop: '0.5rem', fontWeight: 'bold' }}>✅ Feedback accepted</p>}
        {status === 'rejected' && !showRejectOptions[key] && <p style={{ color: 'red', marginTop: '0.5rem', fontWeight: 'bold' }}>❌ Feedback rejected</p>}
        {status === 'error' && <p style={{ color: 'red', marginTop: '0.5rem' }}>⚠️ Error submitting feedback</p>}
        {status === 'submitting' && <p style={{ color: 'orange', marginTop: '0.5rem' }}>⏳ Submitting...</p>}
      </div>
    );
  };

  return (
    <div style={{ marginTop: '1rem', border: '1px solid #ddd', borderRadius: '8px', overflow: 'hidden' }}>
      {/* File Header (Collapsible) */}
      {normalizedResult.filename && (
        <div
          onClick={() => setCollapsed(!collapsed)}
          style={{
            background: '#f8f9fa',
            padding: '0.75rem 1rem',
            cursor: 'pointer',
            fontWeight: 'bold',
            borderBottom: collapsed ? 'none' : '1px solid #ddd',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            userSelect: 'none'
          }}
        >
          <span>📄 {normalizedResult.filename}</span>
          <span style={{ fontSize: '0.8rem', color: '#666' }}>
            {collapsed ? '▶️ Click to expand' : '▼️ Click to collapse'}
          </span>
        </div>
      )}

      {/* Main Content */}
      {!collapsed && (
        <div style={{ padding: '1.5rem' }}>
          {/* FORCE DEBUG: Always show data summary */}
          <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '4px', fontSize: '0.85rem' }}>
            <strong>🔍 Data Summary:</strong> {normalizedResult.filename} | 
            Code: {code?.length || 0} chars | 
            Static: {staticSuggestions.length} | 
            Gemini Review: {normalizedResult.geminiReview?.rawReview ? `${normalizedResult.geminiReview.rawReview.length} chars` : 'EMPTY'} | 
            Gemini Suggestions: {geminiSuggestions.length}
          </div>
          {/* Static Analysis Section - FIXED: Always show to debug */}
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ color: '#333', margin: 0 }}>
                ⚡ Static Analysis ({staticSuggestions.length})
              </h3>
              {code && staticSuggestions.some(s => s.replacement?.to) && (
                <button
                  onClick={handleAcceptAll}
                  style={{
                    ...styles.button,
                    backgroundColor: '#28a745',
                    fontSize: '0.9rem'
                  }}
                >
                  ✅ Accept All Fixable
                </button>
              )}
            </div>
            {staticSuggestions.length > 0 ? (
              staticSuggestions.map((s, i) => renderSuggestionCard(s, i, false))
            ) : (
              <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', border: '1px solid #e9ecef', borderRadius: '6px' }}>
                <p style={{ color: '#666', fontStyle: 'italic', margin: 0 }}>
                  No static analysis issues found.
                </p>
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#999' }}>
                  Debug: allSuggestions.length = {allSuggestions.length}, 
                  staticSuggestions.length = {staticSuggestions.length}
                </div>
              </div>
            )}
          </div>

          {/* AI Review Section - FIXED: Always show if geminiReview exists */}
          {normalizedResult.geminiReview && (
            <div>
              <h3 style={{ color: '#4285f4', marginBottom: '1rem' }}>
                🤖 AI Code Review (Gemini)
              </h3>
              
              {/* AI Summary - FIXED: Always show, even if generic */}
              <div style={styles.aiSummaryBox}>
                <strong>AI Summary:</strong>
                {normalizedResult.geminiReview.rawReview && normalizedResult.geminiReview.rawReview.trim() ? (
                  <p style={{ whiteSpace: 'pre-wrap', marginTop: '0.5rem', lineHeight: '1.5' }}>
                    {normalizedResult.geminiReview.rawReview}
                  </p>
                ) : (
                  <p style={{ color: '#666', fontStyle: 'italic', marginTop: '0.5rem' }}>
                    AI analysis completed. Check specific suggestions below.
                  </p>
                )}
              </div>

              {/* AI Suggestions - FIXED: Show even if empty to debug */}
              <div style={{ marginTop: '1rem' }}>
                <h4 style={{ color: '#4285f4', marginBottom: '1rem' }}>AI Suggestions ({geminiSuggestions.length})</h4>
                {geminiSuggestions.length > 0 ? (
                  geminiSuggestions.map((s, i) => renderSuggestionCard(s, i, true))
                ) : (
                  <div style={{ padding: '1rem', backgroundColor: '#f8f9ff', border: '1px solid #d4e3fc', borderRadius: '6px' }}>
                    <p style={{ color: '#666', fontStyle: 'italic', margin: 0 }}>
                      No specific AI suggestions generated. The code may be well-structured.
                    </p>
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#999' }}>
                      Debug: geminiSuggestions.length = {geminiSuggestions.length}, 
                      geminiFromReview.length = {geminiFromReview.length}, 
                      geminiFromMain.length = {geminiFromMain.length}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* No Results Fallback - FIXED: Better condition checking */}
          {(() => {
            const hasStaticSuggestions = staticSuggestions.length > 0;
            const hasGeminiReview = normalizedResult.geminiReview?.rawReview && normalizedResult.geminiReview.rawReview.trim() !== '';
            const hasGeminiSuggestions = geminiSuggestions.length > 0;
            const shouldShowFallback = !hasStaticSuggestions && !hasGeminiReview && !hasGeminiSuggestions;
            
            console.log('=== FALLBACK CONDITION CHECK ===', {
              hasStaticSuggestions,
              hasGeminiReview,
              hasGeminiSuggestions,
              shouldShowFallback,
              rawReviewValue: normalizedResult.geminiReview?.rawReview
            });
            
            return shouldShowFallback ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#666' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
                <h3 style={{ color: '#28a745', marginBottom: '0.5rem' }}>Code looks great!</h3>
                <p>No issues or improvements found by our analysis tools.</p>
                <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: '#999' }}>
                  Debug: staticSuggestions={staticSuggestions.length}, 
                  rawReview='{normalizedResult.geminiReview?.rawReview?.substring(0, 50)}...', 
                  geminiSuggestions={geminiSuggestions.length}
                </div>
              </div>
            ) : null;
          })()}
        </div>
      )}
    </div>
  );
};

// Styles
const styles = {
  codeBlock: {
    background: '#f8f9fa',
    padding: '0.75rem',
    borderRadius: '6px',
    fontFamily: 'Consolas, Monaco, "Courier New", monospace',
    fontSize: '0.85rem',
    overflowX: 'auto',
    margin: '0.5rem 0',
    border: '1px solid #e9ecef',
    lineHeight: '1.4'
  },
  textarea: {
    width: '100%',
    minHeight: '80px',
    marginTop: '0.5rem',
    padding: '0.75rem',
    borderRadius: '6px',
    border: '1px solid #ced4da',
    fontSize: '0.9rem',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  button: {
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '0.5rem 1rem',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '0.9rem',
    transition: 'opacity 0.2s'
  },
  aiSummaryBox: {
    backgroundColor: '#f8f9ff',
    padding: '1.25rem',
    border: '1px solid #d4e3fc',
    borderRadius: '8px',
    fontSize: '0.95rem',
    lineHeight: '1.5',
    color: '#333'
  }
};

export default ResultPanel;