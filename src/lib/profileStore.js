import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";

/** Free registered account — short: Beef full: Gojito's Beefy Supreme Team */
export const DEFAULT_PROFILE_TIER = "beef";

/** Canonical stored tiers: `beef` | `guac`. Legacy: mvp/free→beef, gold/paid→guac */
function normalizeTier(tier) {
  if (tier === "guac" || tier === "gold" || tier === "paid") return "guac";
  if (tier === "mvp" || tier === "free") return "beef";
  return DEFAULT_PROFILE_TIER;
}

/** Exported for entitlement sync: canonical `beef` | `guac` string. */
export function normalizeProfileTier(tier) {
  return normalizeTier(tier);
}

function rowToDoc(row) {
  return {
    uid: row.id,
    displayName: row.display_name || "Player",
    email: row.email,
    tier: normalizeTier(row.tier),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function displayNameFromAuthUser(authUser) {
  const meta = authUser.user_metadata;
  if (meta && typeof meta === "object") {
    if (typeof meta.full_name === "string" && meta.full_name) return meta.full_name;
    if (typeof meta.name === "string" && meta.name) return meta.name;
  }
  return "Player";
}

export async function getUserProfile(uid) {
  if (!isSupabaseConfigured || !supabase || !uid) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, email, tier, created_at, updated_at")
    .eq("id", uid)
    .maybeSingle();
  if (error || !data) return null;
  return rowToDoc(data);
}

export async function ensureUserProfile(authUser) {
  if (!isSupabaseConfigured || !supabase || !authUser?.id) return null;

  const existing = await getUserProfile(authUser.id);
  if (existing) {
    const normalizedTier = normalizeTier(existing.tier);
    if (existing.tier !== normalizedTier) {
      await updateUserTier(authUser.id, normalizedTier);
      return { ...existing, tier: normalizedTier };
    }
    return existing;
  }

  const now = new Date().toISOString();
  const created = {
    id: authUser.id,
    display_name: displayNameFromAuthUser(authUser),
    email: authUser.email || null,
    tier: DEFAULT_PROFILE_TIER,
    created_at: now,
    updated_at: now,
  };

  const { error } = await supabase.from("profiles").insert(created);
  if (error) return null;
  return rowToDoc(created);
}

export async function updateUserTier(uid, tier) {
  if (!isSupabaseConfigured || !supabase || !uid) return;
  await supabase
    .from("profiles")
    .update({ tier: normalizeTier(tier), updated_at: new Date().toISOString() })
    .eq("id", uid);
}
