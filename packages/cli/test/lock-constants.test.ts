import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  LOCKED_COMMANDS,
  LOCKED_PATTERNS,
  globToRegExp,
  testCommandsFor,
  outsideScope,
} from '../src/index.js';

// The CLI holds the lock's patterns and commands as constants and never parses the eval plan.
// This test reads the eval plan so a row added to section 4 or 5 cannot quietly escape the lock.

const evalPlan = readFileSync(
  fileURLToPath(new URL('../../../docs/eval-plan.md', import.meta.url)),
  'utf8',
);

function sectionTableRows(heading: RegExp): string[] {
  const lines = evalPlan.split('\n');
  const start = lines.findIndex((l) => heading.test(l));
  expect(start, `eval plan heading ${heading}`).toBeGreaterThanOrEqual(0);
  const rows: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('## ')) break;
    if (line.startsWith('|') && !/^\|[-| ]+\|$/.test(line)) rows.push(line);
  }
  return rows.slice(1); // the header row
}

function backticked(rows: string[]): string[] {
  return rows.flatMap((row) => [...row.matchAll(/`([^`]+)`/g)].map((m) => m[1] as string));
}

describe('lock constants', () => {
  it('[M0] hold every locked path of eval plan section 5', () => {
    const paths = backticked(sectionTableRows(/^## 5\. What the gate-2 lock covers/));
    expect(paths.length).toBeGreaterThanOrEqual(15);
    for (const path of paths) expect(LOCKED_PATTERNS, path).toContain(path);
  });

  it('[M0] hold every test command of eval plan section 4, the install line first', () => {
    const commands = backticked(sectionTableRows(/^## 4\. Test commands the lock pins/));
    expect(commands).toHaveLength(9);
    const held = LOCKED_COMMANDS.map((c) => c.command);
    for (const command of commands) expect(held, command).toContain(command);
    expect(held[0]).toBe('npm ci');
    expect(commands[0]).toBe('npm ci');
  });

  it('[M0] protects the whole meeting reminder harness, including newly added files', () => {
    const protectedPaths = [
      'test/new-case.spec.ts',
      'test/fixtures/new-event.json',
      'public/new-fixture.json',
      'package.json',
      'package-lock.json',
      'tsconfig.json',
      'playwright.config.ts',
      'scripts/new-runner.mjs',
    ];
    const patterns = LOCKED_PATTERNS.map(globToRegExp);
    for (const relative of protectedPaths) {
      const path = `docs/projects/meeting-reminder/web/${relative}`;
      expect(
        patterns.some((pattern) => pattern.test(path)),
        path,
      ).toBe(true);
    }
    for (const path of [
      'docs/projects/meeting-reminder/web/src/main.ts',
      'docs/projects/other/web/test/new-case.spec.ts',
    ]) {
      expect(
        patterns.some((pattern) => pattern.test(path)),
        path,
      ).toBe(false);
    }
  });

  it('[M0] pins the protected browser runner only when the application is present', () => {
    const command = 'node docs/projects/meeting-reminder/web/scripts/run-browser-trial.mjs';
    const root = new Set(['package-lock.json', 'packages/cli/package.json']);
    const existingCommands = [
      'npm ci',
      'npm exec --workspace packages/cli -- vitest run --config vitest.config.ts',
    ];
    expect(testCommandsFor(root)).toEqual(existingCommands);
    root.add('docs/projects/meeting-reminder/web/scripts/run-browser-trial.mjs');
    expect(testCommandsFor(root)).toEqual(existingCommands);
    root.add('docs/projects/meeting-reminder/web/package.json');
    expect(testCommandsFor(root)).toEqual([...existingCommands, command]);
  });

  it('[M0] pins the equipment API runner on the frozen configuration, not the application', () => {
    const command = 'node projects/equipment-checkout/harness/api/run-eval.mjs';
    const root = new Set(['package-lock.json', 'packages/cli/package.json']);
    expect(testCommandsFor(root)).not.toContain(command);
    // The runner being present is not enough: a tree without the frozen pytest configuration
    // has no exam to run.
    root.add('projects/equipment-checkout/harness/api/run-eval.mjs');
    expect(testCommandsFor(root)).not.toContain(command);
    // The configuration is what pins it, so the command is in the lock from the freeze onwards
    // rather than from the first candidate that happens to add application source.
    root.add('projects/equipment-checkout/harness/api/pytest.ini');
    expect(testCommandsFor(root)).toContain(command);
  });

  it('[M0] protects the whole equipment harness and nothing the builder owns', () => {
    const patterns = LOCKED_PATTERNS.map(globToRegExp);
    const locked = (path: string): boolean => patterns.some((pattern) => pattern.test(path));
    for (const path of [
      'projects/equipment-checkout/api/tests/conftest.py',
      'projects/equipment-checkout/api/tests/unit/test_added_later.py',
      'projects/equipment-checkout/api/tests/db/test_added_later.py',
      'projects/equipment-checkout/harness/api/pytest.ini',
      'projects/equipment-checkout/harness/api/requirements-eval.txt',
      'projects/equipment-checkout/harness/api/run-eval.mjs',
      'projects/equipment-checkout/harness/web/vitest.config.js',
      'projects/equipment-checkout/harness/e2e/eval.env',
    ]) {
      expect(locked(path), path).toBe(true);
    }
    // What a builder must be able to write. A story cannot be delivered if its own source or
    // dependency list is frozen, and the freeze reaching them would be indistinguishable from
    // the lock being broken.
    for (const path of [
      'projects/equipment-checkout/api/app/rules.py',
      'projects/equipment-checkout/api/requirements.txt',
      'projects/equipment-checkout/web/src/App.jsx',
      'projects/equipment-checkout/docker-compose.yml',
      'projects/other-project/api/tests/unit/test_case.py',
    ]) {
      expect(locked(path), path).toBe(false);
    }
  });

  it('[M0] keeps the trial story scope limited to its exact application source file', () => {
    const main = 'docs/projects/meeting-reminder/web/src/main.ts';
    const refused = [
      'docs/projects/meeting-reminder/web/test/new-case.spec.ts',
      'docs/projects/meeting-reminder/web/playwright.config.ts',
      '.factory/work/plan/build-plan.md',
    ];
    expect(outsideScope('story-1', [main], [main, ...refused])).toEqual(refused);
    expect(outsideScope('story-1', ['**'], ['.factory/work/plan/build-plan.md'])).toEqual([
      '.factory/work/plan/build-plan.md',
    ]);
  });
});
