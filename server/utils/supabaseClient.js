// server/utils/supabaseClient.js
const { createClient } = require('@supabase/supabase-js');

// Ensure these are correctly defined in your .env file
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Missing Supabase URL or service role key in environment variables.");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = { supabase };
