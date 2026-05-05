import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { db, isFirebaseConfigured } from "@/lib/firebaseClient";

export const DEFAULT_PROFILE_TIER = "free";

function profileRef(uid) {
  return doc(db, "users", uid);
}

function normalizeTier(tier) {
  return tier === "paid" ? "paid" : DEFAULT_PROFILE_TIER;
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
    if (!data.tier) {
      await updateDoc(ref, { tier: DEFAULT_PROFILE_TIER, updatedAt: serverTimestamp() });
      return { ...data, tier: DEFAULT_PROFILE_TIER };
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
