import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The built site is what GitHub Pages serves from /docs.
// The source you edit lives in web/.
export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "../docs",
    emptyOutDir: true,
  },
});
