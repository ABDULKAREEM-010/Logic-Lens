const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Utility to categorize errors by keyword
function categorizeSuggestion(suggestion) {
  suggestion = suggestion.toLowerCase();
  if (suggestion.includes('syntax')) return 'Syntax Error';
  if (suggestion.includes('null') || suggestion.includes('undefined')) return 'Runtime Error';
  if (suggestion.includes('logic')) return 'Logic Error';
  if (suggestion.includes('naming')) return 'Naming Issue';
  return 'Other';
}

router.get('/summary', async (req, res) => {
  const { data, error } = await supabase.from('feedback').select('suggestion');

  if (error) {
    console.error('Error fetching feedback:', error.message);
    return res.status(500).json({ error: 'Failed to fetch feedback' });
  }

  const counts = {};

  for (const row of data) {
    const category = categorizeSuggestion(row.suggestion);
    counts[category] = (counts[category] || 0) + 1;
  }

  const total = Object.values(counts).reduce((sum, c) => sum + c, 0);

  const stats = Object.entries(counts).map(([category, count]) => ({
    category,
    count,
    percentage: ((count / total) * 100).toFixed(1) + '%'
  }));

  res.json({ total, stats });
});

module.exports = router;
