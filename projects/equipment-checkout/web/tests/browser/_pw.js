// The one place that names where Playwright is installed. Frozen with the B rows.
//
// Eval plan 7.4 puts `@playwright/test` in `harness/web` (command C9 runs
// `harness/web/node_modules/.bin/playwright`), while the B rows live under `web/`.
// `harness/web` is not an ancestor of `web/`, so Node's resolution from a spec never
// reaches it and a bare `import ... from '@playwright/test'` fails with
// ERR_MODULE_NOT_FOUND. Importing through this file keeps the path in one place, and it
// keeps every spec on the very copy of the library the runner itself is using, which
// Playwright requires: two copies would register two separate test suites.

export * from '../../../harness/web/node_modules/@playwright/test/index.mjs';
