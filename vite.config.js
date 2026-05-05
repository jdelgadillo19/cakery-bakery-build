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
    },
  },
});
