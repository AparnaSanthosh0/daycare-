// @ts-check
/**
 * Playwright configuration for TinyTots project.
 * It starts the dev servers (client+server via `npm run dev`) and runs tests against http://localhost:3000
 */
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    // Original site on 3000
    {
      name: 'Chromium@3000',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3000' },
    },
    {
      name: 'Firefox@3000',
      use: { ...devices['Desktop Firefox'], baseURL: 'http://localhost:3000' },
    },
    {
      name: 'WebKit@3000',
      use: { ...devices['Desktop Safari'], baseURL: 'http://localhost:3000' },
    },
    // Test site on 4000
    {
      name: 'Chromium@4000',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:4000' },
    },
    {
      name: 'Firefox@4000',
      use: { ...devices['Desktop Firefox'], baseURL: 'http://localhost:4000' },
    },
    {
      name: 'WebKit@4000',
      use: { ...devices['Desktop Safari'], baseURL: 'http://localhost:4000' },
    },
  ],
  // Start server and both client sites with one command to avoid port conflicts
  webServer: {
    command: 'npm run dev:two',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 180_000,
  },
});
