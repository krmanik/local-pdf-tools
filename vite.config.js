import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: { target: "esnext", outDir: 'dist' },
  base: "/local-pdf-tools/",
  worker: {format :'es'},
});
