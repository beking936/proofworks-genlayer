import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: process.env.GITHUB_PAGES === "true" ? "/proofworks-genlayer/" : "/",
  server: {
    proxy: {
      "/api": {
        target: process.env.GITHUB_PROXY_TARGET || "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
  build: {
    chunkSizeWarningLimit: 900,
  },
});
