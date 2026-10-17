import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { desk } from "./desk-plugin.js";

// The built site is what GitHub Pages serves from /docs.
// The source you edit lives in web/.
// /desk exists only while `npm run dev` is running.
export default defineConfig({
  plugins: [react(), desk()],
  base: "/",
  build: {
    outDir: "../docs",
    emptyOutDir: true,
  },
});
