import { defineConfig, devices } from "@playwright/test";

// Load the test account passwords
for (const file of [".env.local", ".env.test.local"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    // Optional; tests that need accounts skip themselves
  }
}

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // Uses your running dev server, or starts one if none is running
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});