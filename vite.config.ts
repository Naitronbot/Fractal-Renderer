/// <reference types="vitest" />
import { defineConfig } from "vite";
import { checker } from "vite-plugin-checker";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import tsConfigPaths from "vite-tsconfig-paths";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    svelte({ compilerOptions: { accessors: !!process.env.VITEST } }),
    checker({ typescript: true }),
    tsConfigPaths(),
  ],
  build: {
    outDir: "build",
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});
