// Frozen with the C rows (eval plan 7.4). Read-only to every builder.
//
// Loaded by harness/web/vitest.config.js before any test file. It must not import
// `src/App.jsx`: the baseline expects each *test file* to fail to load because the
// client is absent (eval plan 1.2), and a setup file that reached for the client would
// instead fail the whole run before a single file was collected, which would tell the
// three web mechanisms apart less clearly.

import '@testing-library/jest-dom/vitest';

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// React Testing Library's automatic cleanup runs only when the test globals are
// injected. The frozen configuration keeps `globals: false`, so cleanup is wired here.
// Without it a rendered page from one case stays in the document and the next case's
// `getByTestId` finds two of everything.
afterEach(() => {
  cleanup();
});
