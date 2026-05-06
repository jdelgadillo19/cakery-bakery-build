import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { auth, googleProvider, isFirebaseConfigured } from "@/lib/firebaseClient";
import { ensureUserProfile, getUserProfile, updateUserTier } from "@/lib/profileStore";
import { syncFirestoreTierFromGojitoBackend } from "@/lib/gojitoEntitlements";
import { setRuntimeBuildTier } from "@/lib/buildConfig";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState({
    id: "local",
    role: "player",
    full_name: "Player",
    email: null,
  });
  const [profile, setProfile] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!isFirebaseConfigured);
  const [isLoadingAuth, setIsLoadingAuth] = useState(isFirebaseConfigured);
  const [authError, setAuthError] = useState(null);

  const applyTier = useCallback((tier) => {
    setRuntimeBuildTier(
      tier === "guac" || tier === "gold" || tier === "paid" ? "full" : "free",
    );
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      applyTier("beef");
      return;
    }

    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        setIsLoadingAuth(true);
        if (!firebaseUser) {
          setUser({
            id: "local",
            role: "player",
            full_name: "Player",
            email: null,
          });
          setProfile(null);
          setIsAuthenticated(false);
          setAuthError(null);
          applyTier("beef");
          return;
        }

        const ensured = (await ensureUserProfile(firebaseUser)) || (await getUserProfile(firebaseUser.uid));
        const backendSynced = await syncFirestoreTierFromGojitoBackend(firebaseUser);
        const mergedProfile = backendSynced || ensured || null;
        setUser({
          id: firebaseUser.uid,
          role: "player",
          full_name: firebaseUser.displayName || mergedProfile?.displayName || "Player",
          email: firebaseUser.email || mergedProfile?.email || null,
        });
        setProfile(mergedProfile);
        setIsAuthenticated(true);
        setAuthError(null);
        applyTier(mergedProfile?.tier || "beef");
      } catch (e) {
        setAuthError({ type: "auth_failed", message: e?.message || "Authentication failed" });
        setIsAuthenticated(false);
        applyTier("beef");
      } finally {
        setIsLoadingAuth(false);
      }
    });

    return () => unsub();
  }, [applyTier]);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth || !isAuthenticated || user?.id === "local") return undefined;

    const intervalMs = 5 * 60 * 1000;
    const tick = () => {
      const current = auth.currentUser;
      if (!current) return;
      syncFirestoreTierFromGojitoBackend(current).then((doc) => {
        if (doc) {
          setProfile(doc);
          applyTier(doc.tier || "beef");
        }
      });
    };

    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [applyTier, isAuthenticated, user?.id]);

  const refreshEntitlements = useCallback(async () => {
    if (!isFirebaseConfigured || !auth?.currentUser) return false;
    const doc = await syncFirestoreTierFromGojitoBackend(auth.currentUser, {
      forceRefreshToken: true,
    });
    if (doc) {
      setProfile(doc);
      applyTier(doc.tier || "beef");
      return true;
    }
    return false;
  }, [applyTier]);

  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) return;
    setAuthError(null);
    await signInWithPopup(auth, googleProvider);
  }, []);

  const signInWithEmail = useCallback(async (email, password) => {
    if (!isFirebaseConfigured || !auth) return;
    setAuthError(null);
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signUpWithEmail = useCallback(async (email, password) => {
    if (!isFirebaseConfigured || !auth) return;
    setAuthError(null);
    await createUserWithEmailAndPassword(auth, email, password);
  }, []);

  const logout = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) return;
    await signOut(auth);
  }, []);

  const setProfileTier = useCallback(
    async (tier) => {
      if (!isFirebaseConfigured || !user?.id || user.id === "local") return;
      await updateUserTier(user.id, tier);
      const refreshed = await getUserProfile(user.id);
      setProfile(refreshed);
      applyTier(refreshed?.tier || "beef");
    },
    [applyTier, user?.id],
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      profileTier: profile?.tier || "beef",
      isFirebaseConfigured,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings: false,
      authError,
      appPublicSettings: null,
      logout,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      setProfileTier,
      refreshEntitlements,
      navigateToLogin: () => {},
      checkAppState: refreshEntitlements,
    }),
    [
      authError,
      isAuthenticated,
      isLoadingAuth,
      logout,
      profile,
      refreshEntitlements,
      setProfileTier,
      signInWithEmail,
      signInWithGoogle,
      signUpWithEmail,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
