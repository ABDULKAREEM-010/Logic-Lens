const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabaseClient');

// GET /api/admin/stats
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('feedback')
      .select('*');

    if (error) throw error;

    const feedbacks = data || [];

    // Normalize values
    const normalized = feedbacks.map(f => ({
      ...f,
      decision: (f.decision || '').toLowerCase(),
      suggestion_type: (f.suggestion_type || 'others').toLowerCase()
    }));

    const stats = {
      total: normalized.length,
      accepted: normalized.filter(f => f.decision === 'accepted').length,
      rejected: normalized.filter(f => f.decision === 'rejected').length,
      errorTypes: {
        syntax: normalized.filter(f => f.suggestion_type === 'syntax').length,
        semantic: normalized.filter(f => f.suggestion_type === 'semantic').length,
        logical: normalized.filter(f => f.suggestion_type === 'logical').length,
        others: normalized.filter(f =>
          !['syntax', 'semantic', 'logical'].includes(f.suggestion_type)
        ).length
      },
      feedbacks: normalized
    };

    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Unknown error occurred' });
  }
});

module.exports = router;
