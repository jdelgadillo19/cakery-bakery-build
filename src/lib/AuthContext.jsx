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
    setRuntimeBuildTier(tier === "paid" ? "full" : "free");
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !auth) {
      applyTier("free");
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
          applyTier("free");
          return;
        }

        const ensured = (await ensureUserProfile(firebaseUser)) || (await getUserProfile(firebaseUser.uid));
        setUser({
          id: firebaseUser.uid,
          role: "player",
          full_name: firebaseUser.displayName || ensured?.displayName || "Player",
          email: firebaseUser.email || ensured?.email || null,
        });
        setProfile(ensured || null);
        setIsAuthenticated(true);
        setAuthError(null);
        applyTier(ensured?.tier || "free");
      } catch (e) {
        setAuthError({ type: "auth_failed", message: e?.message || "Authentication failed" });
        setIsAuthenticated(false);
        applyTier("free");
      } finally {
        setIsLoadingAuth(false);
      }
    });

    return () => unsub();
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
      applyTier(refreshed?.tier || "free");
    },
    [applyTier, user?.id],
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      profileTier: profile?.tier || "free",
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
      navigateToLogin: () => {},
      checkAppState: async () => {},
    }),
    [
      authError,
      isAuthenticated,
      isLoadingAuth,
      logout,
      profile,
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
