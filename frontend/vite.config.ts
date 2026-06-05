import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite dev server config. Port 5173 matches .claude/launch.json.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
});
