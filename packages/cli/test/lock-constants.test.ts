import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { LOCKED_COMMANDS, LOCKED_PATTERNS } from '../src/index.js';

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
    expect(commands).toHaveLength(7);
    const held = LOCKED_COMMANDS.map((c) => c.command);
    for (const command of commands) expect(held, command).toContain(command);
    expect(held[0]).toBe('npm ci');
    expect(commands[0]).toBe('npm ci');
  });
});
