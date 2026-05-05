import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOOP_CONSTRAINTS_PATH = path.resolve(__dirname, "./.bgmLoopConstraints.dev.json");

function devBgmLoopCommitPlugin() {
  return {
    name: "dev-bgm-loop-commit",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__dev/commit-bgm-loop", (req, res) => {
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: false, error: "Method not allowed" }));
          return;
        }

        let body = "";
        req.on("data", (chunk) => {
          body += chunk;
        });
        req.on("end", () => {
          try {
            const incoming = JSON.parse(body || "{}");
            const incomingTracks = incoming && incoming.tracks;
            if (!incomingTracks || typeof incomingTracks !== "object") {
              throw new Error("Missing payload.tracks object");
            }

            let existing = { version: 1, tracks: {} };
            if (fs.existsSync(LOOP_CONSTRAINTS_PATH)) {
              existing = JSON.parse(fs.readFileSync(LOOP_CONSTRAINTS_PATH, "utf8"));
            }

            const next = {
              version: (existing && existing.version) ?? 1,
              tracks: {
                ...((existing && existing.tracks) || {}),
                ...incomingTracks,
              },
            };

            fs.writeFileSync(LOOP_CONSTRAINTS_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: true, path: ".bgmLoopConstraints.dev.json" }));
          } catch (error) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ ok: false, error: String((error && error.message) || error) }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  base: process.env.GOJITO_ASSET_BASE ?? "/",
  logLevel: "error",
  plugins: [react(), devBgmLoopCommitPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
