import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const rootDir = process.cwd();
const basePath = process.env.GOJITO_ASSET_BASE ? process.env.GOJITO_ASSET_BASE : "/";

export default defineConfig({
  base: basePath,
  logLevel: "error",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "./src"),
      "@gojito/entitlements": path.resolve(rootDir, "../packages/entitlements/src/core.js"),
      "@gojito/nav": path.resolve(rootDir, "../gojito-platform/packages/gojito-nav/src/GojitoNav.jsx"),
      "@gojito/nav-styles": path.resolve(rootDir, "../gojito-platform/packages/gojito-nav/portal-chrome.css"),
      "@gojito/shared": path.resolve(rootDir, "../packages/gojito-shared/src"),
    },
  },
});
