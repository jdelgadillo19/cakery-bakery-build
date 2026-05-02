import React, { createContext, useContext, useMemo } from "react";

const AuthContext = createContext(null);

/** Offline app — no remote auth or hosted app-settings fetch. */
export function AuthProvider({ children }) {
  const value = useMemo(
    () => ({
      user: {
        id: "local",
        role: "player",
        full_name: "Player",
        email: null,
      },
      isAuthenticated: true,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      authError: null,
      appPublicSettings: null,
      logout: () => {},
      navigateToLogin: () => {},
      checkAppState: async () => {},
    }),
    [],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
