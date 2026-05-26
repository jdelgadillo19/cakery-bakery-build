import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { ensureUserProfile, getUserProfile, updateUserTier } from "@/lib/profileStore";
import { registerGojitoHubAccessBridge } from "@/lib/gojitoAccessBridge";
import { syncCakerySavesWithAccount } from "@/lib/cloudGameSaves";
import {
  refreshAccountProfileTier,
  syncProfileTierFromGojitoBackend,
} from "@/lib/gojitoEntitlements";
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
  const [session, setSession] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(!isSupabaseConfigured);
  const [isLoadingAuth, setIsLoadingAuth] = useState(isSupabaseConfigured);
  const [authError, setAuthError] = useState(null);

  const applyTier = useCallback((tier) => {
    setRuntimeBuildTier(
      tier === "guac" || tier === "gold" || tier === "paid" ? "full" : "free",
    );
  }, []);

  const handleAuthUser = useCallback(
    async (authUser, activeSession) => {
      try {
        setIsLoadingAuth(true);
        if (!authUser) {
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

        const ensured = (await ensureUserProfile(authUser)) || (await getUserProfile(authUser.id));
        const backendSynced = await syncProfileTierFromGojitoBackend(authUser, {
          session: activeSession,
        });
        const mergedProfile = backendSynced || ensured || null;
        setUser({
          id: authUser.id,
          role: "player",
          full_name:
            mergedProfile?.displayName ||
            authUser.user_metadata?.full_name ||
            authUser.user_metadata?.name ||
            "Player",
          email: authUser.email || mergedProfile?.email || null,
        });
        setProfile(mergedProfile);
        setIsAuthenticated(true);
        setAuthError(null);
        applyTier(mergedProfile?.tier || "beef");
        await syncCakerySavesWithAccount(authUser.id);
      } catch (e) {
        setAuthError({ type: "auth_failed", message: e?.message || "Authentication failed" });
        setIsAuthenticated(false);
        applyTier("beef");
      } finally {
        setIsLoadingAuth(false);
      }
    },
    [applyTier],
  );

  useEffect(() => {
    registerGojitoHubAccessBridge();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      applyTier("beef");
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      handleAuthUser(data.session?.user ?? null, data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      handleAuthUser(nextSession?.user ?? null, nextSession);
    });

    return () => listener.subscription.unsubscribe();
  }, [applyTier, handleAuthUser]);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !isAuthenticated || user?.id === "local") return undefined;

    const intervalMs = 5 * 60 * 1000;
    const tick = () => {
      const authUser = session?.user;
      if (!authUser) return;
      refreshAccountProfileTier(authUser, { session }).then((doc) => {
        if (doc) {
          setProfile(doc);
          applyTier(doc.tier || "beef");
        }
      });
    };

    const id = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(id);
  }, [applyTier, isAuthenticated, session, user?.id]);

  const refreshEntitlements = useCallback(async () => {
    const authUser = session?.user;
    if (!isSupabaseConfigured || !authUser) return false;
    const doc = await refreshAccountProfileTier(authUser, {
      forceRefreshToken: true,
      session,
    });
    if (doc) {
      setProfile(doc);
      applyTier(doc.tier || "beef");
      return true;
    }
    return false;
  }, [applyTier, session]);

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    setAuthError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
    if (error) {
      setAuthError({ type: "auth_failed", message: error.message });
    }
  }, []);

  const signInWithEmail = useCallback(async (email, password) => {
    if (!isSupabaseConfigured || !supabase) return;
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError({ type: "auth_failed", message: error.message });
    }
  }, []);

  const signUpWithEmail = useCallback(async (email, password) => {
    if (!isSupabaseConfigured || !supabase) return;
    setAuthError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setAuthError({ type: "auth_failed", message: error.message });
    }
  }, []);

  const logout = useCallback(async () => {
    if (!isSupabaseConfigured || !supabase) return;
    await supabase.auth.signOut();
  }, []);

  const setProfileTier = useCallback(
    async (tier) => {
      if (!isSupabaseConfigured || !user?.id || user.id === "local") return;
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
      isSupabaseConfigured,
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
