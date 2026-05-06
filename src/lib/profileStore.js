import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebaseClient";

/** Free registered account — short: Beef full: Gojito's Beefy Supreme Team */
export const DEFAULT_PROFILE_TIER = "beef";

function profileRef(uid) {
  return doc(db, "users", uid);
}

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

export async function getUserProfile(uid) {
  if (!isFirebaseConfigured || !uid) return null;
  const snap = await getDoc(profileRef(uid));
  return snap.exists() ? snap.data() : null;
}

export async function ensureUserProfile(firebaseUser) {
  if (!isFirebaseConfigured || !firebaseUser?.uid) return null;
  const ref = profileRef(firebaseUser.uid);
  const existing = await getDoc(ref);
  if (existing.exists()) {
    const data = existing.data();
    const normalizedTier = normalizeTier(data.tier);
    if (data.tier !== normalizedTier) {
      await updateDoc(ref, { tier: normalizedTier, updatedAt: serverTimestamp() });
      return { ...data, tier: normalizedTier };
    }
    return data;
  }

  const created = {
    uid: firebaseUser.uid,
    displayName: firebaseUser.displayName || "Player",
    email: firebaseUser.email || null,
    tier: DEFAULT_PROFILE_TIER,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, created, { merge: true });
  return { ...created, createdAt: new Date(), updatedAt: new Date() };
}

export async function updateUserTier(uid, tier) {
  if (!isFirebaseConfigured || !uid) return;
  await updateDoc(profileRef(uid), {
    tier: normalizeTier(tier),
    updatedAt: serverTimestamp(),
  });
}
