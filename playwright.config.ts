import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";

export default defineConfig({
  testDir: "./tests/e2e",
  // The full round drives three browser contexts against one shared room.
  fullyParallel: false,
  workers: 1,
  // A full round is ~40 API calls; against hosted Postgres that is well over
  // Playwright's 30s default.
  timeout: 180_000,
  expect: { timeout: 20_000 },
  use: { baseURL: BASE_URL, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" } },
  ],
  webServer: {
    // Next 16 allows only one dev server per project directory, so tests reuse
    // a running `npm run dev` rather than starting a second one on its own port.
    command: "npm run dev",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
