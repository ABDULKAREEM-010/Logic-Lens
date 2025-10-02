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

  if (!['accepted', 'rejected'].includes(action)) {
    return res.status(400).json({ error: 'Invalid action value' });
  }

  const suggestionType = getSuggestionType(suggestionText);

  try {
    // Get team_id of the user from team_members table
    const { data: teamData, error: teamError } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', req.user.id)
      .single();

    if (teamError && teamError.code !== 'PGRST116') { // ignore "no rows found"
      console.error('Error fetching user team:', teamError.message);
      return res.status(500).json({ error: 'Failed to get user team' });
    }

    const team_id = teamData?.team_id || null;

    // Insert feedback
    const { data, error } = await supabase
      .from('feedback')
      .insert([
        {
          user_id: req.user.id,
          team_id,
          language,
          code: originalCode,
          suggestion: suggestionText,
          decision: action,
          comment: optionalReason,
          suggestion_type: suggestionType
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error.message);
      return res.status(500).json({ error: 'Failed to store feedback' });
    }

    res.json({ message: 'Feedback stored successfully', feedback: data });
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Server error while storing feedback' });
  }
});

// Infer suggestion type from suggestionText
function getSuggestionType(text) {
  const lower = text.toLowerCase();
  if (lower.includes("syntax")) return "Syntax Error";
  if (lower.includes("logic")) return "Logic Error";
  if (lower.includes("performance")) return "Performance Issue";
  if (lower.includes("security")) return "Security Risk";
  return "Other";
}

// GET all feedback (optionally filter by team or user)
router.get('/all', async (req, res) => {
  try {
    const { team_id, user_id } = req.query;

    let query = supabase.from('feedback').select('*');

    if (team_id) query = query.eq('team_id', team_id);
    if (user_id) query = query.eq('user_id', user_id);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching feedback:', error.message);
      return res.status(500).json({ error: 'Failed to fetch feedback' });
    }

    res.json(data);
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).json({ error: 'Server error while fetching feedback' });
  }
});

module.exports = router;
