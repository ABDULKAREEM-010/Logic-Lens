

const express = require('express');
const axios = require('axios');
const router = express.Router();

// Test route to verify backend registration
router.get('/test', (req, res) => {
  res.json({ message: 'GitHub route is working!' });
});

// Load secrets from environment
const CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'Ov23lik9tQOuJI8KleP9';
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || 'be3d65f67482fc5298ddf2d706306638bb6f2619';

// POST /api/github/callback
// Expects { code } in body
router.post('/callback', async (req, res) => {
  console.log('Received POST /api/github/callback');
  console.log('Request body:', req.body);
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Missing code' });

  try {
    // Exchange code for access token
    const response = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        code,
      },
      {
        headers: { Accept: 'application/json' }
      }
    );

    const { access_token, token_type, scope, error } = response.data;
    if (error || !access_token) {
      console.error('GitHub token error:', response.data);
      return res.status(400).json({ error: error || 'No access token received', details: response.data });
    }

    // Optionally: fetch user info
    const userRes = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${access_token}` }
    });

    res.json({ access_token, token_type, scope, github_user: userRes.data });
  } catch (err) {
    console.error('GitHub OAuth error:', err.message, err.response?.data);
    res.status(500).json({ error: 'GitHub OAuth failed', details: err.response?.data });
  }
});

module.exports = router;
