import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      browser: {
        enabled: true,
        provider: "playwright",
        name: "chromium",
        headless: true,
      },
    },
  }),
);
