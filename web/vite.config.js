import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The built site is what GitHub Pages serves from the repository root.
// The source you edit lives in web/.
// /desk is the public upload page in web/public/desk.
export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "../docs",
    emptyOutDir: true,
  },
});
