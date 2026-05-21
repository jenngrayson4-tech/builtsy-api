// ── Builtsy Supabase client ──────────────────────────────────────────────────
// Shared across all pages. Load AFTER the Supabase CDN script.

var SUPABASE_URL     = 'https://nukcbqlxxrfsgchqyxud.supabase.co';
var SUPABASE_ANON_KEY = 'sb_publishable_UDXeGe2ngBJsj_lwYkRF1A_igvEU6nX';

var _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Auth helpers ─────────────────────────────────────────────────────────────

// Returns the current session user, or null
async function getUser() {
  var { data } = await _supabase.auth.getUser();
  return data && data.user ? data.user : null;
}

// Redirect to login if not authenticated (call on protected pages)
async function requireAuth(redirectBack) {
  var user = await getUser();
  if (!user) {
    if (redirectBack) sessionStorage.setItem('builtsy-redirect', redirectBack);
    window.location.href = 'login.html';
    return null;
  }
  return user;
}

// ── Save helpers ─────────────────────────────────────────────────────────────

// Upsert blueprint save data for the current user
async function saveBlueprint(blueprintType, data) {
  var user = await getUser();
  if (!user) return { error: 'not authenticated' };
  data._savedAt = new Date().toISOString();
  var { error } = await _supabase.from('saves').upsert({
    user_id: user.id,
    blueprint_type: blueprintType,
    data: data,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id,blueprint_type' });
  return { error };
}

// Load all saves for the current user
async function loadSaves() {
  var user = await getUser();
  if (!user) return [];
  var { data, error } = await _supabase
    .from('saves')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });
  if (error) return [];
  return data || [];
}

// Load one save by blueprint type
async function loadSave(blueprintType) {
  var user = await getUser();
  if (!user) return null;
  var { data, error } = await _supabase
    .from('saves')
    .select('data')
    .eq('user_id', user.id)
    .eq('blueprint_type', blueprintType)
    .single();
  if (error || !data) return null;
  return data.data;
}

// Delete a save by blueprint type
async function deleteSave(blueprintType) {
  var user = await getUser();
  if (!user) return;
  await _supabase.from('saves')
    .delete()
    .eq('user_id', user.id)
    .eq('blueprint_type', blueprintType);
}

// ── Claims helpers (no auth — guest-facing) ──────────────────────────────────

// Load all claims for an invite
async function loadClaims(inviteId) {
  var { data } = await _supabase
    .from('claims')
    .select('item_name, claimed_by')
    .eq('invite_id', inviteId);
  // Return as { itemName: claimedBy } map
  var map = {};
  if (data) data.forEach(function(row) { map[row.item_name] = row.claimed_by; });
  return map;
}

// Claim an item — returns { ok, error }
async function claimItem(inviteId, itemName, claimedBy) {
  var { error } = await _supabase.from('claims').insert({
    invite_id: inviteId,
    item_name: itemName,
    claimed_by: claimedBy
  });
  if (error && error.code === '23505') return { ok: false, error: 'already_claimed' };
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
