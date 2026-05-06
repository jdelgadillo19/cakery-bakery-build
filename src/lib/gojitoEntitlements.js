import { getUserProfile, normalizeProfileTier, updateUserTier } from "@/lib/profileStore";

/** Production Workers URL without trailing slash, e.g. `https://gojito-backend.<account>.workers.dev` */
export function gojitoApiBaseUrl() {
  const raw = import.meta.env.VITE_GOJITO_API_URL;
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim().replace(/\/+$/, "");
  return trimmed;
}

/**
 * Authoritative entitlement sync from gojito-backend into Firestore `users/{uid}.tier`.
 * Recommended: call after login and periodically while authenticated.
 *
 * @param {import('firebase/auth').User} firebaseUser
 * @param {{ forceRefreshToken?: boolean }} [opts]
 * @returns {Promise<object|null>} refreshed Firestore profile or null if skipped/failed
 */
export async function syncFirestoreTierFromGojitoBackend(firebaseUser, opts = {}) {
  const base = gojitoApiBaseUrl();
  if (!base || !firebaseUser?.uid) return null;

  const forceRefresh = Boolean(opts.forceRefreshToken);
  let token;
  try {
    token = await firebaseUser.getIdToken(forceRefresh);
  } catch {
    return null;
  }

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
    const existing = await getUserProfile(firebaseUser.uid);
    const localTier = normalizeProfileTier(existing?.tier);
    if (localTier === remoteTier) {
      return existing;
    }
    await updateUserTier(firebaseUser.uid, remoteTier);
    return await getUserProfile(firebaseUser.uid);
  } catch {
    return null;
  }
}
