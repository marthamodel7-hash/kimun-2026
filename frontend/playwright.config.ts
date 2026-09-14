import { defineConfig } from "@playwright/test";
import path from "path";

// Isolate from other projects' PLAYWRIGHT_BROWSERS_PATH on shared machines.
// (cwd-relative: `npx playwright test` runs from frontend/.)
process.env.PLAYWRIGHT_BROWSERS_PATH = path.resolve(process.cwd(), "..", ".browsers");

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  use: { baseURL: "http://127.0.0.1:5199", screenshot: "only-on-failure", trace: "retain-on-failure" },
  retries: 1,
  webServer: [
    { command: "python -m uvicorn app.main:app --port 8011", cwd: "../backend", url: "http://127.0.0.1:8011/api/health", timeout: 60_000, reuseExistingServer: true },
    { command: "npm run dev -- --port 5199 --strictPort --host 127.0.0.1", url: "http://127.0.0.1:5199", timeout: 90_000, reuseExistingServer: false }
  ],
  projects: [{ name: "chrome", use: { browserName: "chromium", channel: "chrome" } }]
});
