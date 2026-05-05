/**
 * Absolute URL for a file under `public/` (e.g. `sprites/scenes/paris.webp`).
 * Respects Vite `base` so assets load when the app is hosted under a subpath.
 */
export function publicUrl(pathFromPublicRoot) {
  const base = import.meta.env.BASE_URL;
  const rel = pathFromPublicRoot.startsWith("/")
    ? pathFromPublicRoot.slice(1)
    : pathFromPublicRoot;
  return `${base}${rel}`;
}
