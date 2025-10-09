const express = require('express');
const axios = require('axios');
const router = express.Router();

// In-memory cache to avoid re-exchanging the same one-time OAuth code.
// Codes are single-use; duplicate POSTs (from double-mounts or retries) cause GitHub to reply with bad_verification_code.
const exchangedCodes = new Set();

// Test route to verify backend registration
router.get('/test', (req, res) => {
  res.json({ message: 'GitHub route is working!' });
});

// Test route for disconnect functionality
router.post('/test-disconnect', (req, res) => {
  console.log('🧪 Test disconnect endpoint called');
  console.log('Request body:', req.body);
  
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId for test' });
  }
  
  // Simulate successful disconnect
  setTimeout(() => {
    res.json({
      success: true,
      message: 'Test disconnect successful',
      userId,
      timestamp: new Date().toISOString(),
      test: true
    });
  }, 1000); // Simulate 1 second delay
});

// Load secrets from environment
const CLIENT_ID = process.env.GITHUB_CLIENT_ID || 'Ov23lik9tQOuJI8KleP9';
const CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET || 'be3d65f67482fc5298ddf2d706306638bb6f2619';

// POST /api/github/callback
// Expects { code, userId } in body
router.post('/callback', async (req, res) => {
  console.log('Received POST /api/github/callback');
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);
  console.log('Using GitHub CLIENT_ID:', CLIENT_ID);
  console.log('Using GitHub CLIENT_SECRET:', CLIENT_SECRET ? CLIENT_SECRET.replace(/./g, '*').slice(-4).padStart(CLIENT_SECRET.length, '*') : '<not set>');
  
  // Accept code from POST body or query param for robustness
  const code = req.body?.code || req.query?.code;
  const userId = req.body?.userId; // User ID from authenticated app user
  
  if (!code) {
    console.warn('Missing OAuth code in request (body and query empty)');
    return res.status(400).json({ error: 'Missing code. Provide { code } in JSON body or ?code= in query string' });
  }

  // Create user-specific code key to prevent cross-user token sharing
  const userSpecificCodeKey = userId ? `${code}_${userId}` : code;

  // Server-side guard: if we already exchanged this code for this user, return early
  if (exchangedCodes.has(userSpecificCodeKey)) {
    console.warn('OAuth code already exchanged (server-side guard) for user and code:', userSpecificCodeKey);
    return res.status(400).json({ error: 'This OAuth code has already been exchanged for this user. Generate a fresh authorization.' });
  }

  // Mark code as being processed immediately to prevent race conditions
  exchangedCodes.add(userSpecificCodeKey);
  console.log('Marked user-specific code as processing:', userSpecificCodeKey);

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

    // Schedule cleanup after 5 minutes to avoid memory leak
    setTimeout(() => exchangedCodes.delete(userSpecificCodeKey), 5 * 60 * 1000);

    // Fetch GitHub user info
    const userRes = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${access_token}` }
    });

    console.log(`✅ GitHub OAuth successful for app user ${userId || 'unknown'} -> GitHub user ${userRes.data.login}`);

    res.json({ 
      access_token, 
      token_type, 
      scope, 
      github_user: userRes.data,
      connected_at: new Date().toISOString(),
      app_user_id: userId
    });
  } catch (err) {
    console.error('GitHub OAuth error:', err.message, err.response?.data);
    // Remove from processing set on error
    exchangedCodes.delete(userSpecificCodeKey);
    res.status(500).json({ error: 'GitHub OAuth failed', details: err.response?.data });
  }
});

// POST /api/github/disconnect
// Disconnect GitHub integration for a user
router.post('/disconnect', async (req, res) => {
  console.log('🔌 Received POST /api/github/disconnect');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  const { userId, access_token } = req.body;
  
  if (!userId) {
    console.error('❌ Missing userId in disconnect request');
    return res.status(400).json({ error: 'Missing userId' });
  }

  try {
    let tokenRevoked = false;
    
    // Optionally revoke the GitHub token (recommended for security)
    if (access_token && access_token.trim()) {
      try {
        console.log(`🔄 Attempting to revoke GitHub token for user ${userId}`);
        
        const revokeResponse = await axios.delete(`https://api.github.com/applications/${CLIENT_ID}/token`, {
          headers: {
            'Authorization': `Basic ${Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64')}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github+json',
            'User-Agent': 'CodeReviewBot/1.0'
          },
          data: { access_token: access_token.trim() }
        });
        
        console.log(`✅ Successfully revoked GitHub token for user ${userId}`, revokeResponse.status);
        tokenRevoked = true;
        
      } catch (revokeError) {
        console.warn(`⚠️ Failed to revoke GitHub token for user ${userId}:`, {
          message: revokeError.message,
          status: revokeError.response?.status,
          statusText: revokeError.response?.statusText,
          data: revokeError.response?.data
        });
        
        // Don't fail the entire disconnect if token revocation fails
        // The token might already be invalid or expired
      }
    } else {
      console.log(`ℹ️ No access token provided for user ${userId}, skipping revocation`);
    }

    // Clear any cached codes for this user (cleanup)
    const codesToDelete = [];
    for (const code of exchangedCodes) {
      if (code.includes(userId)) {
        codesToDelete.push(code);
      }
    }
    
    if (codesToDelete.length > 0) {
      codesToDelete.forEach(code => exchangedCodes.delete(code));
      console.log(`🧹 Cleared ${codesToDelete.length} cached OAuth codes for user ${userId}`);
    }

    const responseMessage = tokenRevoked 
      ? 'GitHub integration disconnected and token revoked successfully' 
      : 'GitHub integration disconnected successfully';
      
    console.log(`✅ GitHub disconnect completed for user ${userId}`);
    
    res.json({ 
      success: true, 
      message: responseMessage,
      tokenRevoked,
      userId,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error(`❌ GitHub disconnect error for user ${userId}:`, {
      message: err.message,
      stack: err.stack,
      response: err.response?.data
    });
    
    res.status(500).json({ 
      error: 'GitHub disconnect failed', 
      details: err.message,
      userId 
    });
  }
});

module.exports = router;
