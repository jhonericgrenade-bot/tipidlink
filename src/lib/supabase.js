import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

// Check if credentials are present and not default placeholders
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseKey && 
  !supabaseUrl.includes('your-project-id') &&
  supabaseUrl.startsWith('https://')
);

// Instantiate client if configured, otherwise provide null
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export const getSupabaseConfig = () => ({
  url: supabaseUrl,
  hasKey: Boolean(supabaseKey),
  isConfigured: isSupabaseConfigured,
});
