const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);


router.post('/', async (req, res) => {
  const { language, originalCode, suggestionText, action, optionalReason } = req.body;

  if (!language || !originalCode || !suggestionText || !action) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const suggestionType = getSuggestionType(suggestionText);
  const { error } = await supabase.from('feedback').insert([
    {
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
// infer type from suggestionText
function getSuggestionType(text) {
  const lower = text.toLowerCase();
  if (lower.includes("syntax")) return "Syntax Error";
  if (lower.includes("logic")) return "Logic Error";
  if (lower.includes("performance")) return "Performance Issue";
  if (lower.includes("security")) return "Security Risk";
  return "Other";
}

// GET all feedback entries
router.get('/all', async (req, res) => {
  const { data, error } = await supabase.from('feedback').select('*');
  if (error) {
    console.error('Error fetching feedback:', error.message);
    return res.status(500).json({ error: 'Failed to fetch feedback' });
  }
  res.json(data);
});

module.exports = router;
