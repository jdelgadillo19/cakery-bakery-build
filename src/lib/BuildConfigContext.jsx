// ============================================================
// CAKERY BAKERY — BuildConfig React Context
// Provides build version and feature-flag utilities to all
// components via a single React context, with zero prop drilling.
// ============================================================
//
// USAGE IN ANY COMPONENT:
//
//   import { useBuildConfig } from "@/lib/BuildConfigContext";
//
//   const { buildVersion, isFeatureUnlocked } = useBuildConfig();
//   if (isFeatureUnlocked("recipeBook")) { ... }
//
// The context value is derived entirely from the static buildConfig
// module, so it never triggers unnecessary re-renders.
// ============================================================

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  FEATURE_REGISTRY,
  getRuntimeBuildTier,
  isFeatureUnlocked,
  getFeatureMatrix,
  getUnlockedFeatures,
  getLockedFeatures,
  subscribeRuntimeBuildTier,
} from "@/lib/buildConfig";

// ── Context ───────────────────────────────────────────────────────────────────

const BuildConfigContext = createContext(null);

// ── Provider ──────────────────────────────────────────────────────────────────

/**
 * Wrap the app (or any subtree) with this provider to make build-config
 * utilities available via useBuildConfig().
 *
 * Since BUILD_VERSION is a compile-time constant, the context value is
 * memoized once and never changes at runtime.
 */
export function BuildConfigProvider({ children }) {
  const [buildVersion, setBuildVersion] = useState(getRuntimeBuildTier());

  useEffect(() => subscribeRuntimeBuildTier(setBuildVersion), []);

  const value = useMemo(
    () => ({
      /** The active build tier string: "free" | "full" */
      buildVersion,

      /**
       * Returns true if the given feature is accessible in the current build.
       * @param {keyof typeof FEATURE_REGISTRY} featureKey
       */
      isFeatureUnlocked,

      /**
       * Full feature matrix: { [featureKey]: { unlocked, minTier, description } }
       * Useful for debug/admin views.
       */
      getFeatureMatrix,

      /** Array of currently-unlocked feature keys. */
      getUnlockedFeatures,

      /** Array of currently-locked feature keys. */
      getLockedFeatures,

      /** The full registry, for introspection. */
      featureRegistry: FEATURE_REGISTRY,
    }),
    [buildVersion]
  );

  return (
    <BuildConfigContext.Provider value={value}>
      {children}
    </BuildConfigContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Primary hook for accessing build configuration in any component.
 *
 * @returns {{
 *   buildVersion: "free"|"full",
 *   isFeatureUnlocked: (key: string) => boolean,
 *   getFeatureMatrix: () => object,
 *   getUnlockedFeatures: () => string[],
 *   getLockedFeatures: () => string[],
 *   featureRegistry: object,
 * }}
 *
 * @example
 *   const { buildVersion, isFeatureUnlocked } = useBuildConfig();
 *   const showRecipeBook = isFeatureUnlocked("recipeBook");
 */
export function useBuildConfig() {
  const ctx = useContext(BuildConfigContext);
  if (!ctx) {
    throw new Error("useBuildConfig() must be used inside <BuildConfigProvider>.");
  }
  return ctx;
}