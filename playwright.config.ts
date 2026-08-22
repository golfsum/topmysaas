import { defineConfig, devices } from "@playwright/test";

const baseURL = "http://127.0.0.1:3107";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop-chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chromium",
      use: { ...devices["Pixel 7"] },
    },
  ],
  webServer: {
    command: "npm run dev -- --hostname 127.0.0.1 --port 3107",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      DEMO_MODE: "true",
      LAUNCH_AT: "2099-01-05T00:00:00.000Z",
      LAUNCH_MODE: "true",
      NEXT_PUBLIC_SITE_URL: baseURL,
    },
  },
});
