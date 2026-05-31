import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import { ensureUserProfile, getUserProfile, updateUserTier } from "@/lib/profileStore";
import { registerGojitoHubAccessBridge } from "@/lib/gojitoAccessBridge";
import { syncCakerySavesWithAccount } from "@/lib/cloudGameSaves";
import {
  refreshAccountProfileTier,
  syncProfileTierFromGojitoBackend,
} from "@/lib/gojitoEntitlements";
import { setRuntimeBuildTier } from "@/lib/buildConfig";
import {
  submitFullAccessRequest,
  isGojitoGameplayActive,
  dispatchGojitoProfileTierChange,
  clearSessionTierSynced,
  clearGojitoProfileCache,
} from "@gojito/shared";
import { mergeArcadeLocaleUnlocks } from "@/lib/arcadeLocaleUnlocks";

const AuthContext = createContext(null);

/** Pull cloud saves only on cold start and explicit sign-in. */
const SAVE_SYNC_EVENTS = new Set(["INITIAL_SESSION", "SIGNED_IN"]);

export async function syncCakeryCloudSaves(userId) {
  if (!userId || isGojitoGameplayActive()) return;
  await syncCakerySavesWithAccount(userId);
}

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
  const initialSessionHandledRef = useRef(false);

  const applyTier = useCallback((tier, { broadcast = true } = {}) => {
    setRuntimeBuildTier(
      tier === "guac" || tier === "gold" || tier === "paid" ? "full" : "free",
    );
    if (broadcast) dispatchGojitoProfileTierChange(tier);
  }, []);

  const applyGuestState = useCallback(() => {
    clearSessionTierSynced();
    clearGojitoProfileCache();
    setUser({
      id: "local",
      role: "player",
      full_name: "Player",
      email: null,
    });
    setProfile(null);
    setIsAuthenticated(false);
    setAuthError(null);
    applyTier("beef", { broadcast: false });
    setIsLoadingAuth(false);
    initialSessionHandledRef.current = true;
  }, [applyTier]);

  const applyProfileState = useCallback(
    (authUser, mergedProfile) => {
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
    },
    [applyTier],
  );

  const handleAuthUser = useCallback(
    async (authUser, activeSession, event) => {
      if (event === "TOKEN_REFRESHED") {
        setSession(activeSession);
        return;
      }

      if (!authUser) {
        applyGuestState();
        return;
      }

      const shouldSyncSaves = SAVE_SYNC_EVENTS.has(event) && !isGojitoGameplayActive();
      const showLoading = !initialSessionHandledRef.current && !isGojitoGameplayActive();

      if (showLoading) setIsLoadingAuth(true);

      try {
        const ensured = (await ensureUserProfile(authUser)) || (await getUserProfile(authUser.id));
        const backendSynced = await syncProfileTierFromGojitoBackend(authUser, {
          session: activeSession,
        });
        const mergedProfile = backendSynced || ensured || null;
        applyProfileState(authUser, mergedProfile);

        if (shouldSyncSaves) {
          mergeArcadeLocaleUnlocks();
          await syncCakeryCloudSaves(authUser.id);
        }
      } catch (e) {
        setAuthError({ type: "auth_failed", message: e?.message || "Authentication failed" });
        setIsAuthenticated(false);
        applyTier("beef", { broadcast: false });
      } finally {
        setIsLoadingAuth(false);
        initialSessionHandledRef.current = true;
      }
    },
    [applyGuestState, applyProfileState, applyTier],
  );

  useEffect(() => {
    registerGojitoHubAccessBridge();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      applyTier("beef", { broadcast: false });
      setIsLoadingAuth(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      handleAuthUser(data.session?.user ?? null, data.session, "INITIAL_SESSION");
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === "INITIAL_SESSION") return;
      handleAuthUser(nextSession?.user ?? null, nextSession, event);
    });

    return () => listener.subscription.unsubscribe();
  }, [applyTier, handleAuthUser]);

  const refreshEntitlements = useCallback(async () => {
    const authUser = session?.user;
    if (!isSupabaseConfigured || !authUser) return false;
    if (isGojitoGameplayActive()) return false;
    const doc = await refreshAccountProfileTier(authUser, {
      forceRefreshToken: true,
      session,
    });
    if (doc) {
      setProfile(doc);
      applyTier(doc.tier || "beef");
      await syncCakeryCloudSaves(authUser.id);
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

  const requestFullAccess = useCallback(
    async (source = "cakery_bakery", contextNote = null) => {
      if (!isAuthenticated || user?.id === "local") {
        return submitFullAccessRequest(null, { userId: "", source, contextNote });
      }
      return submitFullAccessRequest(supabase, {
        userId: user.id,
        email: user.email,
        displayName: user.full_name,
        source,
        contextNote,
      });
    },
    [isAuthenticated, user],
  );

  const value = useMemo(
    () => ({
      user,
      profile,
      profileTier: isAuthenticated ? profile?.tier || "beef" : undefined,
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
      requestFullAccess,
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
      requestFullAccess,
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
