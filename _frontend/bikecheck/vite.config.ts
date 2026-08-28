import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig({
  // svgr turns an "?react" SVG import into a component, so an icon can inherit
  // its colour instead of being a fixed-colour <img>.
  plugins: [react(), svgr()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: true,
    port: 5173,
    // The API is proxied rather than called across origins: auth rides on httpOnly
    // cookies set with SameSite=Lax, and Lax cookies are not sent on a fetch to a
    // different origin - and :5173 and :3000 are different origins. Behind the proxy the
    // browser sees one origin and the cookie travels. Set VITE_API_BASE_URL="/api".
    proxy: {
      "/api": {
        target: process.env.VITE_API_PROXY_TARGET ?? "http://127.0.0.1:3000",
        changeOrigin: false,
      },
      "/strava": {
        target: process.env.VITE_STRAVA_PROXY_TARGET ?? "http://127.0.0.1:3002",
        changeOrigin: false,
        rewrite: (path) => path.replace(/^\/strava/, ""),
      },
    },
  },
});
