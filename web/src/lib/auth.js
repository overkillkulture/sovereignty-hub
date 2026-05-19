import { supabase } from './supabase.js';

/**
 * Lightweight auth state with pub/sub. UI code calls `subscribe(cb)` and
 * `cb(authState)` runs whenever the session changes.
 *
 * status values:
 *   'unknown'    – before init() resolves
 *   'signed-in'  – authState.user is populated
 *   'signed-out' – no session
 *   'sending'    – signInWithEmail in flight
 *   'sent'       – magic link sent, awaiting click
 */
export const authState = {
  user: null,
  status: 'unknown',
};

const listeners = new Set();
function notify() {
  for (const cb of listeners) {
    try { cb(authState); } catch (e) { console.error('[auth] listener threw', e); }
  }
}

export function subscribe(cb) {
  listeners.add(cb);
  // fire once immediately so callers don't have to mirror state themselves
  try { cb(authState); } catch (e) { console.error('[auth] initial fire threw', e); }
  return () => listeners.delete(cb);
}

/** Read current session, then keep state in sync via onAuthStateChange. */
export async function init() {
  if (!supabase) {
    authState.status = 'signed-out';
    notify();
    return;
  }
  const { data: { session } } = await supabase.auth.getSession();
  authState.user = session?.user ?? null;
  authState.status = authState.user ? 'signed-in' : 'signed-out';
  notify();

  supabase.auth.onAuthStateChange((_event, session) => {
    authState.user = session?.user ?? null;
    authState.status = authState.user ? 'signed-in' : 'signed-out';
    notify();
  });
}

/**
 * Send a magic-link email. Same flow for sign-in and sign-up — Supabase
 * creates the user on first click.
 *
 * Redirect URL is built from BASE_URL so dev (http://localhost:5173/) and
 * prod (https://tairea.github.io/sovereignty-hub-ui/) both work without
 * hard-coding. Both must be listed in Supabase → Auth → URL Configuration.
 */
export async function signInWithEmail(email) {
  if (!supabase) return { error: 'Auth is not configured. Missing Supabase env vars.' };
  authState.status = 'sending';
  notify();

  const redirectTo = window.location.origin + import.meta.env.BASE_URL;
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) {
    // back to whatever we were before — most often signed-out
    authState.status = authState.user ? 'signed-in' : 'signed-out';
    notify();
    return { error: error.message };
  }

  authState.status = 'sent';
  notify();
  return { ok: true };
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
  // onAuthStateChange fires and updates state for us
}
