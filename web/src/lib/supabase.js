import { createClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!URL || !KEY) {
  console.warn(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — auth will be unavailable. ' +
    'Add them to .env (local) or repo variables (GitHub Pages build).'
  );
}

// One client per page. PKCE flow is the right choice for browser-based
// magic-link auth in 2026 — implicit flow is deprecated.
export const supabase = (URL && KEY)
  ? createClient(URL, KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
      },
    })
  : null;
