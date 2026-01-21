import { createClient } from '@supabase/supabase-js';

// Novas credenciais fornecidas
const SUPABASE_URL = 'https://ykdpflkgxuorebvedasi.supabase.co';
const SUPABASE_KEY = 'sb_publishable_0OKpWd_GIuQkPCza9KWCgg_d-p71f-l';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});