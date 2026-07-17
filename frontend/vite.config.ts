import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// SPA build served by the FastAPI backend in production.
// In dev, API and WebSocket calls proxy to the backend on :8010.
export default defineConfig({
  plugins: [
    tsconfigPaths(),
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
  ],
  server: {
    host: true,
    proxy: {
      "/api": "http://localhost:8010",
      "/ws": { target: "ws://localhost:8010", ws: true },
    },
  },
});
