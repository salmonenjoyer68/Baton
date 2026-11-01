import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// This config lives next to index.html, so Vite's root is the frontend
// directory by default. Do not set `root: "frontend"` here: it would resolve
// to frontend/frontend and the entry module would not be found.
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: { outDir: "../dist", emptyOutDir: true }
});
