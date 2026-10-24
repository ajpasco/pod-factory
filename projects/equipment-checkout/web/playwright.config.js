// Frozen configuration for mechanism B (eval plan 7.4). Read-only to every builder.
//
// Command C9 runs it from the project root as
//   harness/web/node_modules/.bin/playwright test --config web/playwright.config.js
// It builds the client's production bundle, serves it with `vite preview`, drives Chromium
// only, and writes `web/reports/browser.xml` and traces.
//
// `defineConfig` is imported through `./tests/browser/_pw.js` rather than from
// `@playwright/test` directly. That is required, not stylistic: eval plan 7.4 installs
// `@playwright/test` in `harness/web`, which is not an ancestor of `web/`, so Node's
// resolution from this file never reaches it and a bare import fails with
// ERR_MODULE_NOT_FOUND. The shim holds the one relative path, and it also keeps the specs
// and the runner on the same copy of the library, which Playwright requires.

import path from 'node:path';

import { defineConfig, devices } from './tests/browser/_pw.js';

const here = import.meta.dirname;

export default defineConfig({
  testDir: path.join(here, 'tests', 'browser'),
  testMatch: '**/*.spec.js',
  // One worker, in order: these rows load a freshly built page and measure it, and the
  // preview server serves one build.
  workers: 1,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['junit', { outputFile: path.join(here, 'reports', 'browser.xml') }]],
  outputDir: path.join(here, 'reports', 'artifacts'),
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    // The production bundle, built and served with the client's own Vite. The branch's own
    // npm scripts are never used (eval plan 7.2); the tool is called directly.
    command:
      'node_modules/.bin/vite build' +
      ' && node_modules/.bin/vite preview --port 4173 --strictPort --host 127.0.0.1',
    cwd: here,
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'pipe',
    stderr: 'pipe',
    // The base the client reads at build time (blueprint 12.7). Every request to it is
    // answered by `page.route`, so no server behind `/api` is needed or wanted.
    env: { VITE_API_BASE_URL: '/api' },
  },
});
