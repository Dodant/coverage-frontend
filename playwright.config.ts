import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run the app in API mode against scripts/mock-api.mjs (which follows docs/API_CONTRACT.md),
// so they cover the same components as the mock-data mode plus login, likes and exhibitions. A second, smaller
// project runs the mock-data mode (the default `npm run dev`) for the browser-local favourites and exhibitions.
// Every server uses its own port and dist dir so a running `npm run dev` is left alone.
const API_PORT = Number(process.env.E2E_API_PORT ?? 4110);
const WEB_PORT = Number(process.env.E2E_WEB_PORT ?? 3100);
const MOCK_WEB_PORT = Number(process.env.E2E_MOCK_WEB_PORT ?? 3101);

export default defineConfig({
  testDir: "e2e",
  globalSetup: "./e2e/global-setup.ts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { trace: "retain-on-failure" },
  projects: [
    { name: "api", testIgnore: /e2e\/mock\//, use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${WEB_PORT}` } },
    { name: "mock", testMatch: /e2e\/mock\/.*\.spec\.ts$/, use: { ...devices["Desktop Chrome"], baseURL: `http://localhost:${MOCK_WEB_PORT}` } },
  ],
  webServer: [
    {
      command: `PORT=${API_PORT} node scripts/mock-api.mjs`,
      url: `http://localhost:${API_PORT}/api/search/browse/latest?size=1`,
      reuseExistingServer: false,
    },
    {
      command: `COVERAGE_API_ORIGIN=http://localhost:${API_PORT} NEXT_PUBLIC_DATA_SOURCE=api NEXT_DIST_DIR=.next-e2e npx next dev -p ${WEB_PORT}`,
      url: `http://localhost:${WEB_PORT}/`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
    {
      command: `NEXT_PUBLIC_DATA_SOURCE=mock NEXT_DIST_DIR=.next-e2e-mock npx next dev -p ${MOCK_WEB_PORT}`,
      url: `http://localhost:${MOCK_WEB_PORT}/`,
      reuseExistingServer: false,
      timeout: 180_000,
    },
  ],
});
