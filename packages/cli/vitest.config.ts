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
  },
});
