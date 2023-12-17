import { defineConfig } from "vite";
import { checker } from "vite-plugin-checker";
import { svelte } from "@sveltejs/vite-plugin-svelte";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [svelte(), checker({ typescript: true })],
  build: {
    outDir: "build",
  },
});
