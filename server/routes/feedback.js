// server/routes/feedback.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabaseClient');
const { verifyUserToken } = require('../utils/auth');

// POST feedback (protected route)
router.post('/', verifyUserToken, async (req, res) => {
  const { language, originalCode, suggestionText, action, optionalReason } = req.body;

  if (!language || !originalCode || !suggestionText || !action) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const suggestionType = getSuggestionType(suggestionText);

  const { error } = await supabase.from('feedback').insert([
    {
      user_id: req.user.id,   // ✅ tie feedback to Supabase Auth user
      language,
      code: originalCode,
      suggestion: suggestionText,
      decision: action,
      comment: optionalReason,
      timestamp: new Date().toISOString(),
      suggestion_type: suggestionType
    }
  ]);

  if (error) {
    console.error('Supabase insert error:', error.message);
    return res.status(500).json({ error: 'Failed to store feedback' });
  }

  res.json({ message: 'Feedback stored successfully' });
});

// Infer type from suggestionText
function getSuggestionType(text) {
  const lower = text.toLowerCase();
  if (lower.includes("syntax")) return "Syntax Error";
  if (lower.includes("logic")) return "Logic Error";
  if (lower.includes("performance")) return "Performance Issue";
  if (lower.includes("security")) return "Security Risk";
  return "Other";
}

// GET all feedback (admin/debug)
router.get('/all', async (req, res) => {
  const { data, error } = await supabase.from('feedback').select('*');
  if (error) {
    console.error('Error fetching feedback:', error.message);
    return res.status(500).json({ error: 'Failed to fetch feedback' });
  }
  res.json(data);
});

module.exports = router;
