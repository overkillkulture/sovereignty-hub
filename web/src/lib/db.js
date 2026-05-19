import { supabase } from './supabase.js';
import { authState } from './auth.js';

const AVATAR_BUCKET = 'hub-avatars';

function userId() {
  return authState.user?.id || null;
}

/**
 * Read the user's profile + survey_state rows.
 * Returns null if signed out or on error. Returns a merge-ready object:
 *   { answers, descriptions, cursor, maxReached, hub: { name, email, link, imageDataUrl } }
 *
 * The trigger on auth.users creates both rows on first sign-in, so PGRST116
 * (no rows) is only expected if a user was created before the trigger
 * existed — we tolerate it and return defaults.
 */
export async function loadRemoteState() {
  if (!supabase) return null;
  const uid = userId();
  if (!uid) return null;

  const [profileRes, surveyRes] = await Promise.all([
    supabase.from('profiles').select('hub_name, hub_email, hub_link, hub_image_url').eq('id', uid).maybeSingle(),
    supabase.from('survey_state').select('answers, descriptions, cursor, max_reached').eq('user_id', uid).maybeSingle(),
  ]);

  if (profileRes.error) console.error('[db] profile load failed', profileRes.error);
  if (surveyRes.error)  console.error('[db] survey_state load failed', surveyRes.error);

  const p = profileRes.data || {};
  const s = surveyRes.data || {};
  return {
    answers:      s.answers || {},
    descriptions: s.descriptions || {},
    cursor:       s.cursor ?? 0,
    maxReached:   s.max_reached ?? 0,
    hub: {
      name:         p.hub_name || '',
      email:        p.hub_email || '',
      link:         p.hub_link || '',
      imageDataUrl: p.hub_image_url || '',
    },
  };
}

// Debounce survey_state upserts — UI calls saveRemoteState() on every keystroke.
let saveTimer = null;
let lastQueued = null;

export function saveRemoteState(state) {
  if (!supabase || !userId()) return;
  lastQueued = state;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flushRemoteState, 500);
}

async function flushRemoteState() {
  const uid = userId();
  if (!uid || !lastQueued) return;
  const s = lastQueued;
  lastQueued = null;
  const { error } = await supabase.from('survey_state').upsert({
    user_id:      uid,
    answers:      s.answers || {},
    descriptions: s.descriptions || {},
    cursor:       s.cursor ?? 0,
    max_reached:  s.maxReached ?? 0,
    updated_at:   new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) console.error('[db] survey_state upsert failed', error);
}

/**
 * Force-flush any pending survey_state write. Useful on sign-out / page unload.
 */
export async function flushPending() {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
    await flushRemoteState();
  }
}

/**
 * Save the hub profile. If `hub.imageDataUrl` is a fresh data: URL from the
 * cropper, upload it to Storage and replace it with the public URL. Returns
 * the (possibly rewritten) imageDataUrl so the caller can update its local
 * state.
 */
export async function saveProfile(hub) {
  if (!supabase) return { error: 'Supabase not configured' };
  const uid = userId();
  if (!uid) return { error: 'Not signed in' };

  let imageUrl = hub.imageDataUrl || '';

  // Upload only when it's a new data URL from the cropper.
  // Once uploaded, imageDataUrl holds the public https URL and won't
  // trigger a re-upload on subsequent saves.
  if (imageUrl.startsWith('data:')) {
    const blob = await (await fetch(imageUrl)).blob();
    const path = `${uid}/avatar.png`;
    const { error: upErr } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, blob, { upsert: true, contentType: 'image/png', cacheControl: '3600' });
    if (upErr) {
      console.error('[db] avatar upload failed', upErr);
      return { error: upErr.message };
    }
    const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    // bust caches when a user re-uploads
    imageUrl = `${pub.publicUrl}?v=${Date.now()}`;
  }

  const { error } = await supabase.from('profiles').upsert({
    id:            uid,
    hub_name:      hub.name || '',
    hub_email:     hub.email || '',
    hub_link:      hub.link || '',
    hub_image_url: imageUrl,
    updated_at:    new Date().toISOString(),
  }, { onConflict: 'id' });

  if (error) {
    console.error('[db] profile upsert failed', error);
    return { error: error.message };
  }
  return { ok: true, imageDataUrl: imageUrl };
}
