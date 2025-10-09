const express = require('express');
const router = express.Router();
const { supabase } = require('../utils/supabaseClient');

// Debug endpoint to test user fetching
router.get('/debug-users', async (req, res) => {
  try {
    console.log('🔍 Testing user fetching...');
    
    // Get some user IDs from feedback table
    const { data: feedbacks, error: feedbackError } = await supabase
      .from('feedback')
      .select('user_id')
      .limit(5);

    if (feedbackError) {
      return res.status(500).json({ error: 'Failed to fetch feedbacks', details: feedbackError });
    }

    const userIds = [...new Set(feedbacks.map(f => f.user_id).filter(Boolean))];
    console.log('Found user IDs:', userIds);

    if (userIds.length === 0) {
      return res.json({ message: 'No user IDs found in feedback table' });
    }

    // Try to fetch users via Admin API
    const results = {};
    for (const userId of userIds.slice(0, 3)) { // Test first 3
      try {
        const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
        results[userId] = {
          success: !userError,
          error: userError?.message,
          user: userData?.user ? {
            email: userData.user.email,
            metadata: userData.user.user_metadata
          } : null
        };
      } catch (err) {
        results[userId] = {
          success: false,
          error: err.message
        };
      }
    }

    res.json({ 
      message: 'User fetch test completed',
      userIds,
      results
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/stats
router.get('/', async (req, res) => {
  try {
    console.log('🔍 Starting admin stats fetch...');
    
    const { data, error } = await supabase
      .from('feedback')
      .select('*');

    if (error) throw error;

    const feedbacks = data || [];
    console.log(`📊 Found ${feedbacks.length} feedback entries`);

    // Analyze user IDs
    const allUserIds = feedbacks.map(f => f.user_id);
    const nullUserIds = allUserIds.filter(id => !id);
    const validUserIds = [...new Set(allUserIds.filter(Boolean))];
    
    console.log('📊 User ID analysis:');
    console.log(`- Total feedback entries: ${feedbacks.length}`);
    console.log(`- Entries with null user_id: ${nullUserIds.length}`);
    console.log(`- Unique valid user IDs: ${validUserIds.length}`);
    console.log(`- Valid user IDs:`, validUserIds);

    // Fetch user profiles using Supabase Auth Admin API
    const userProfiles = {};
    
    if (validUserIds.length > 0) {
      console.log('🔍 Fetching user profiles for:', validUserIds);
      
      // Use Supabase Admin API to get actual user information
      for (const userId of validUserIds) {
        try {
          console.log(`🔍 Fetching user data for: ${userId}`);
          
          const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);
          
          if (!userError && userData?.user) {
            const user = userData.user;
            const displayName = user.user_metadata?.full_name || 
                              user.user_metadata?.name || 
                              user.user_metadata?.username || 
                              user.user_metadata?.user_name ||
                              user.email?.split('@')[0] ||
                              `User-${userId.substring(0, 8)}`;
                              
            userProfiles[userId] = {
              email: user.email || 'No email',
              full_name: user.user_metadata?.full_name || user.user_metadata?.name,
              username: user.user_metadata?.username || user.user_metadata?.user_name,
              display_name: displayName
            };
            
            console.log(`✅ Successfully fetched user ${userId}:`, {
              email: user.email,
              display_name: displayName,
              metadata: user.user_metadata
            });
          } else {
            console.log(`❌ Failed to fetch user ${userId}:`, userError?.message);
            
            // Create fallback profile
            userProfiles[userId] = {
              email: 'User not found',
              display_name: `User-${userId.substring(0, 8)}`,
              username: userId.substring(0, 8),
              full_name: null
            };
          }
        } catch (userErr) {
          console.error(`💥 Error fetching user ${userId}:`, userErr.message);
          
          // Create error fallback profile
          userProfiles[userId] = {
            email: 'Fetch error',
            display_name: `User-${userId.substring(0, 8)}`,
            username: userId.substring(0, 8),
            full_name: null
          };
        }
      }
      
      console.log(`✅ Final user profiles created: ${Object.keys(userProfiles).length}`);
      
      // Log all profiles for debugging
      Object.entries(userProfiles).forEach(([userId, profile]) => {
        console.log(`👤 ${userId}: ${profile.display_name} (${profile.email})`);
      });

    }

    // Normalize values and add user information
    const normalized = feedbacks.map(f => {
      let userProfile;
      
      if (!f.user_id) {
        // No user_id - truly anonymous feedback
        userProfile = {
          email: 'System Generated',
          display_name: 'System User',
          username: 'system'
        };
      } else if (userProfiles[f.user_id]) {
        // Found user profile
        userProfile = userProfiles[f.user_id];
      } else {
        // User ID exists but profile not found - create a better fallback
        userProfile = {
          email: 'Profile Not Found',
          display_name: `User ${f.user_id.substring(0, 8)}`,
          username: f.user_id.substring(0, 8)
        };
      }

      return {
        ...f,
        decision: (f.decision || 'pending').toLowerCase(),
        suggestion_type: (f.suggestion_type || 'general').toLowerCase(),
        user_profile: userProfile
      };
    });

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
