import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: ".",
  timeout: 60000,
  use: {
    baseURL: "https://nfstay.app",
    headless: true,
  },
  reporter: "list",
});
