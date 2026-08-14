import { parseEntitlementApiResponse } from "@gojito/entitlements";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { getUserProfile, normalizeProfileTier } from "@/lib/profileStore";

/** Optional legacy API base URL. Leave unset — entitlements come from Supabase profiles. */
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
 * Authoritative entitlement sync from Supabase `profiles.tier` (optional legacy API when configured).
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

  const snapshot = parseEntitlementApiResponse(data);
  const remoteTier = snapshot?.accessTier === "guac" ? "guac" : "beef";

  try {
    const existing = await getUserProfile(authUser.id);
    const localTier = normalizeProfileTier(existing?.tier);
    if (localTier === remoteTier) {
      return existing;
    }
    // Phase 1: do not write remote tier onto profiles. Entitlement is server-controlled.
    return existing;
  } catch {
    return null;
  }
}

/**
 * Refresh tier for the active session: backend KV when API URL is set,
 * otherwise re-read Supabase `profiles.tier` (manual guac grants).
 *
 * @param {import('@supabase/supabase-js').User} authUser
 * @param {{ forceRefreshToken?: boolean, session?: import('@supabase/supabase-js').Session | null }} [opts]
 * @returns {Promise<object|null>}
 */
export async function refreshAccountProfileTier(authUser, opts = {}) {
  if (gojitoApiBaseUrl()) {
    return syncProfileTierFromGojitoBackend(authUser, opts);
  }
  if (!authUser?.id) return null;
  return getUserProfile(authUser.id);
}
