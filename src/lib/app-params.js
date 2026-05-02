/**
 * Legacy hook for URL/query params. Hosted-backend tokens removed —
 * game data is stored locally only.
 */
export const appParams = {
  appId: null,
  token: null,
  fromUrl: typeof window !== "undefined" ? window.location.href : "",
  functionsVersion: null,
  appBaseUrl: null,
};
