// ✅ FINAL ResultPanel.jsx — Light Glassmorphism UI with Separate Static & Gemini Sections
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { API_ENDPOINTS } from '../config/api';

// ✅ Smart inline replacement — prevents duplication and replaces exact text if found
const applyReplacements = (code, replacements) => {
  let newCode = code;
  replacements.forEach(({ line, newText, from }) => {
    const lines = newCode.split('\n');
    const i = Number(line) - 1;
    if (i >= 0 && i < lines.length) {
      if (from && lines[i].includes(from.trim())) {
        // partial replace within same line
        lines[i] = lines[i].replace(from.trim(), newText.trim());
      } else {
        // fallback: replace entire line
        lines[i] = newText.trim();
      }
    }
    newCode = lines.join('\n');
  });
  return newCode;
};

const standardComments = [
  'Incorrect logic',
  'Syntax error',
  'Poor readability',
  'Missing edge cases',
];

const ResultPanel = ({ result, code, language, setCode, filename }) => {
  const [comment, setComment] = useState('');
  const [selectedStandardComments, setSelectedStandardComments] = useState({});
  const [feedbackStatus, setFeedbackStatus] = useState({});
  const [showRejectOptions, setShowRejectOptions] = useState({});
  const [collapsed, setCollapsed] = useState(false);

  const makeKey = (s, i) => `${s.line || i}-${s.message?.substring(0, 25) || s.title || ''}`;

  const getAccessToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const handleFeedback = async (suggestion, decision, autoFixApplied = false, index = 0) => {
    const key = makeKey(suggestion, index);
    setFeedbackStatus((p) => ({ ...p, [key]: 'submitting' }));

    const token = await getAccessToken();
    if (!token) return setFeedbackStatus((p) => ({ ...p, [key]: 'error' }));

    const combinedComment =
      decision === 'rejected'
        ? [...(selectedStandardComments[key] || []), comment].filter(Boolean).join('; ')
        : '';

    const payload = {
      language,
      originalCode: code,
      suggestionText: suggestion.message || suggestion.title || '',
      action: decision,
      optionalReason: combinedComment,
      autoFixApplied,
      source: suggestion.source || 'static',
      suggestion_type: suggestion.type || 'syntax',
    };

    try {
      const res = await fetch(API_ENDPOINTS.FEEDBACK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Server error');

      setFeedbackStatus((p) => ({ ...p, [key]: decision }));
      setComment('');
      setSelectedStandardComments((p) => ({ ...p, [key]: [] }));
      setShowRejectOptions((p) => ({ ...p, [key]: false }));
    } catch (err) {
      console.error(err);
      setFeedbackStatus((p) => ({ ...p, [key]: 'error' }));
    }
  };

  // ✅ Updated to prevent duplicate or appended lines
  const handleAutoFix = async (suggestion, index) => {
    if (!setCode) return alert('Editor not linked.');

    const line = suggestion.line;
    const from = suggestion.replacement?.from;
    const to = suggestion.replacement?.to;

    if (!to || !line) {
      return alert('Auto-fix not available for this suggestion.');
    }

    const newCode = applyReplacements(code, [{ line, from, newText: to }]);
    setCode(newCode);

    await handleFeedback(suggestion, 'accepted', true, index);
  };

  const handleAcceptAll = async (suggestions, label) => {
    const fixable = suggestions.filter((s) => s.replacement?.to);
    if (fixable.length === 0) return alert(`No fixable ${label} suggestions found.`);

    const newCode = applyReplacements(
      code,
      fixable.map((s) => ({ line: s.line, from: s.replacement?.from, newText: s.replacement?.to }))
    );
    setCode(newCode);

    for (let i = 0; i < fixable.length; i++) {
      await handleFeedback(fixable[i], 'accepted', true, i);
    }
    alert(`✅ ${fixable.length} ${label} suggestions accepted and code updated.`);
  };

  const toggleCheckbox = (i, key) => {
    setSelectedStandardComments((p) => {
      const prevArr = p[key] || [];
      const c = standardComments[i];
      return {
        ...p,
        [key]: prevArr.includes(c)
          ? prevArr.filter((x) => x !== c)
          : [...prevArr, c],
      };
    });
  };

  const getSeverityBadgeClasses = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high':
      case 'error':
        return 'bg-red-500 text-white';
      case 'medium':
      case 'warning':
        return 'bg-yellow-500 text-white';
      case 'low':
      case 'info':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const staticSuggestions = result?.suggestions?.filter((s) => s.source === 'static') || [];
  const geminiSuggestions = result?.suggestions?.filter((s) => s.source === 'gemini') || [];
  const geminiReview = result?.geminiReview?.rawReview || 'No Gemini review available.';

  const renderSuggestionCard = (s, i) => {
    const key = makeKey(s, i);
    const status = feedbackStatus[key];

    return (
      <div
        key={i}
        className="rounded-xl shadow-md mb-6 p-5 border backdrop-blur-sm"
        style={{
          background: 'rgba(255,255,255,0.85)',
          border: '1px solid rgba(200,200,255,0.3)',
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <h4 className="font-semibold text-lg text-gray-800">
            Line {s.line || 'N/A'} — {s.symbol || s.type}
          </h4>
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${getSeverityBadgeClasses(
              s.severity
            )}`}
          >
            {s.severity || 'Medium'}
          </span>
        </div>
        <p className="text-gray-700 mb-3">{s.message}</p>

        {s.replacement?.from && (
          <pre className="bg-red-50 border-l-4 border-red-300 rounded-md p-2 text-sm text-gray-800">
            {s.replacement.from}
          </pre>
        )}
        {s.replacement?.to && (
          <pre className="bg-green-50 border-l-4 border-green-300 rounded-md p-2 text-sm text-gray-800 mt-2">
            {s.replacement.to}
          </pre>
        )}

        <div className="flex gap-3 mt-4">
          <button
            onClick={() => handleAutoFix(s, i)}
            className="bg-green-600 text-green px-3 py-2 rounded-lg hover:bg-green-700"
            disabled={status === 'submitting'}
          >
            {status === 'submitting' ? '⏳ Applying...' : '✅ Accept & Apply'}
          </button>
          <button
            onClick={() =>
              setShowRejectOptions((p) => ({ ...p, [key]: !p[key] }))
            }
            className="bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600"
            disabled={status === 'submitting'}
          >
            ❌ Reject
          </button>
        </div>

        {showRejectOptions[key] && (
          <div className="mt-4 bg-yellow-50 border border-yellow-300 rounded-xl p-4">
            <h4 className="text-lg font-semibold mb-3 text-yellow-700">🤔 Why reject?</h4>
            {standardComments.map((c, idx) => (
              <label key={idx} className="block text-sm mb-1 text-gray-700">
                <input
                  type="checkbox"
                  checked={(selectedStandardComments[key] || []).includes(c)}
                  onChange={() => toggleCheckbox(idx, key)}
                  className="mr-2"
                />
                {c}
              </label>
            ))}
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border rounded-md p-2 mt-2 text-sm text-gray-800"
              placeholder="Additional reason..."
            />
            <button
              onClick={() => handleFeedback(s, 'rejected', false, i)}
              className="bg-red-500 text-white px-3 py-2 rounded-lg mt-3 hover:bg-red-600"
              disabled={status === 'submitting'}
            >
              📝 Submit Rejection
            </button>
          </div>
        )}

        {status === 'accepted' && <p className="text-green-700 mt-2">✅ Accepted successfully!</p>}
        {status === 'rejected' && <p className="text-red-700 mt-2">❌ Rejected and recorded</p>}
        {status === 'error' && <p className="text-yellow-700 mt-2">⚠️ Error submitting feedback</p>}
      </div>
    );
  };

  return (
    <div className="mt-8">
      {/* === Gemini Review Summary === */}
      {geminiReview && (
        <div
          className="shadow-lg border rounded-2xl p-6 mb-8 backdrop-blur-md"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.85), rgba(230,230,255,0.6))',
            border: '1px solid rgba(150,100,255,0.2)',
          }}
        >
          <h2 className="text-2xl font-bold text-purple-700 mb-3">✨ Gemini Review Summary</h2>
          <p className="text-gray-800 leading-relaxed whitespace-pre-line">{geminiReview}</p>
        </div>
      )}

      {/* === GEMINI SUGGESTIONS === */}
      {geminiSuggestions.length > 0 && (
        <div
          className="p-6 rounded-2xl mb-8"
          style={{
            background: 'linear-gradient(135deg, #eef5ff, #f6f9ff)',
            border: '1px solid rgba(100,150,255,0.2)',
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-blue-700 flex items-center gap-2">
              🤖 Gemini Suggestions
            </h3>
            <button
              onClick={() => handleAcceptAll(geminiSuggestions, 'Gemini')}
              className="bg-blue-600 text-green px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              ✅ Accept All
            </button>
          </div>
          {geminiSuggestions.map(renderSuggestionCard)}
        </div>
      )}

      {/* === STATIC SUGGESTIONS === */}
      {staticSuggestions.length > 0 && (
        <div
          className="p-6 rounded-2xl"
          style={{
            background: 'linear-gradient(135deg, #fff9e6, #fffef3)',
            border: '1px solid rgba(255,210,100,0.2)',
          }}
        >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-2xl font-bold text-yellow-700 flex items-center gap-2">
              ⚡ Static Suggestions
            </h3>
            <button
              onClick={() => handleAcceptAll(staticSuggestions, 'Static')}
              className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600"
            >
              ✅ Accept All
            </button>
          </div>
          {staticSuggestions.map(renderSuggestionCard)}
        </div>
      )}
    </div>
  );
};

export default ResultPanel;
