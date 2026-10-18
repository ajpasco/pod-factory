import { defineConfig, devices } from '@playwright/test';

declare const process: { env: Record<string, string | undefined> };

/**
 * Protected runner configuration for the browser modal trial (TECH-SPEC section 6,
 * EVAL-PLAN "Harness and result contract"). Chromium only, no retries, serves the
 * freshly built dist/ through vite preview on a strict port, keeps a JSON report and
 * failure evidence. The builder may not change this file.
 */
export default defineConfig({
  testDir: './test',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    ['json', { outputFile: process.env.TRIAL_REPORT_FILE || 'test-results/results.json' }],
  ],
  outputDir: 'test-results/artifacts',
  use: {
    baseURL: 'http://127.0.0.1:4187',
    locale: 'en-US',
    timezoneId: 'America/New_York',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run preview -- --host 127.0.0.1 --port 4187 --strictPort',
    url: 'http://127.0.0.1:4187',
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
