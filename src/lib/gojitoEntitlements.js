import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { getUserProfile, normalizeProfileTier, updateUserTier } from "@/lib/profileStore";

/** Production Workers URL without trailing slash, e.g. `https://gojito-backend.<account>.workers.dev` */
export function gojitoApiBaseUrl() {
  const raw = import.meta.env.VITE_GOJITO_API_URL;
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim().replace(/\/+$/, "");
  return trimmed;
}

async function getAccessToken(session, forceRefresh) {
  if (!isSupabaseConfigured || !supabase) return null;
  if (forceRefresh) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) return null;
    return data.session?.access_token ?? null;
  }
  return session?.access_token ?? null;
}

/**
 * Authoritative entitlement sync from gojito-backend into Supabase `profiles.tier`.
 * Recommended: call after login and periodically while authenticated.
 *
 * @param {import('@supabase/supabase-js').User} authUser
 * @param {{ forceRefreshToken?: boolean, session?: import('@supabase/supabase-js').Session | null }} [opts]
 * @returns {Promise<object|null>} refreshed profile or null if skipped/failed
 */
export async function syncProfileTierFromGojitoBackend(authUser, opts = {}) {
  const base = gojitoApiBaseUrl();
  if (!base || !authUser?.id) return null;

  const session =
    opts.session ?? (await supabase?.auth.getSession())?.data?.session ?? null;

  const token = await getAccessToken(session, Boolean(opts.forceRefreshToken));
  if (!token) return null;

  let res;
  try {
    res = await fetch(`${base}/api/entitlements/me`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  let data;
  try {
    data = await res.json();
  } catch {
    return null;
  }

  const remoteTier = data.profileTier === "guac" ? "guac" : "beef";

  try {
    const existing = await getUserProfile(authUser.id);
    const localTier = normalizeProfileTier(existing?.tier);
    if (localTier === remoteTier) {
      return existing;
    }
    await updateUserTier(authUser.id, remoteTier);
    return await getUserProfile(authUser.id);
  } catch {
    return null;
  }
}
