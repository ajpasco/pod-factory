import { defineConfig } from 'vitest/config';

// Locked runner configuration (eval plan section 4).
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts', 'src/**/*.test.ts'],
    exclude: ['test/ai-evals/**', 'node_modules/**', 'dist/**'],
    allowOnly: false,
    passWithNoTests: false,
    isolate: true,
    globalSetup: ['test/support/build.ts'],
    setupFiles: ['test/support/git-env.ts'],
    testTimeout: 60_000,
    // The JSON report is the evidence verify bundles and, at gate 2, the classification input.
    // It lands at a fixed, ignored path; the approver's runbook copies one committed run to
    // .factory/work/classification/gate-2.json. Durations differ per run: what reproduces is
    // the outcome, not the bytes.
    reporters: ['default', 'json'],
    outputFile: { json: '../../.factory/work/reports/cli.json' },
  },
});
