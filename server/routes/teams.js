// server/routes/teams.js
const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabaseClient');
const { verifyUserToken } = require('../utils/auth');
console.log("verifyUserToken =", verifyUserToken);

// Create a new team (Leader)
router.post('/', verifyUserToken, async (req, res) => {
  const { team_name } = req.body;
  const user_id = req.user.id;

  if (!team_name) return res.status(400).json({ error: 'Team name required' });

  const { data, error } = await supabase
    .from('teams')
    .insert([{ team_name, team_lead_id: user_id }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const join_link = `http://localhost:5173/join/${data.team_id}`;
  res.json({ team_id: data.team_id, join_link });
});

// Join team (Member)
router.get('/:teamId/join', verifyUserToken, async (req, res) => {
  const { teamId } = req.params;
  const user_id = req.user.id;

  const { data, error } = await supabase
    .from('team_members')
    .insert([{ team_id: teamId, user_id }])
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  res.json({ message: 'Joined team successfully', team_member: data });
});

// Leader dashboard: fetch all team feedback
router.get('/:teamId/dashboard', verifyUserToken, async (req, res) => {
  const { teamId } = req.params;
  const user_id = req.user.id;

  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('team_id', teamId)
    .single();

  if (!team || team.team_lead_id !== user_id) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const { data: feedback, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('team_id', teamId);

  if (error) return res.status(500).json({ error: error.message });

  res.json({ feedback });
});

module.exports = router;
