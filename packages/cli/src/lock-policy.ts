/**
 * What the gate-2 lock covers, held as constants because this code is enforcement code.
 * Eval plan section 5 is the authority for the patterns and section 4 for the commands; a locked
 * test checks that every path and command named there appears here. Shipped code never parses
 * the eval plan.
 */
export const LOCKED_PATTERNS: readonly string[] = [
  'packages/*/test/**',
  'templates/test/**',
  'docs/eval-plan.md',
  'packages/*/vitest.config.ts',
  'packages/check-runner/vitest.ai-evals.config.ts',
  'templates/vitest.config.ts',
  'package-lock.json',
  'npm-shrinkwrap.json',
  'release/smoke/**',
  'release/scripts/**',
  'release/runbook.yaml',
  '.github/workflows/**',
  '.github/CODEOWNERS',
  '.claude/settings.json',
  'templates/checklists/**',
];

export interface LockedCommand {
  command: string;
  /** The command joins the lock only when this path exists in the approved tree. */
  requires: string;
}

/** Section 4's commands in order, the install line first. */
export const LOCKED_COMMANDS: readonly LockedCommand[] = [
  { command: 'npm ci', requires: 'package-lock.json' },
  {
    command: 'npm exec --workspace packages/cli -- vitest run --config vitest.config.ts',
    requires: 'packages/cli/package.json',
  },
  {
    command: 'npm exec --workspace packages/hooks -- vitest run --config vitest.config.ts',
    requires: 'packages/hooks/package.json',
  },
  {
    command: 'npm exec --workspace packages/check-runner -- vitest run --config vitest.config.ts',
    requires: 'packages/check-runner/package.json',
  },
  {
    command:
      'npm exec --workspace packages/release-executor -- vitest run --config vitest.config.ts',
    requires: 'packages/release-executor/package.json',
  },
  {
    command: 'npm exec --workspace templates -- vitest run --config vitest.config.ts',
    requires: 'templates/package.json',
  },
  {
    command:
      'npm exec --workspace packages/check-runner -- vitest run --config vitest.ai-evals.config.ts',
    requires: 'packages/check-runner/vitest.ai-evals.config.ts',
  },
];

/** The files `approve 2` binds by name, besides every docs/spec/*.md (TECH-SPEC section 3.3). */
export const GATE_2_FILES: readonly string[] = [
  'docs/PRD.md',
  'docs/TECH-SPEC.md',
  'docs/eval-plan.md',
  '.factory/work/classification/gate-2.json',
];
export const SPEC_DIR = 'docs/spec/';
export const MAPPING_FILE = 'docs/spec/criterion-to-control-mapping.md';
export const CLASSIFICATION_REPORT = '.factory/work/classification/gate-2.json';

/** The one-story build plan `approve 3` binds, and the story files it names. */
export const BUILD_PLAN = '.factory/work/plan/build-plan.md';
export const STORY_FILE = /\.factory\/work\/story-[0-9]+\/story\.md/g;

/** `**` matches any run of characters including slashes; `*` matches within one path segment. */
export function globToRegExp(pattern: string): RegExp {
  let source = '';
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i] as string;
    if (c === '*' && pattern[i + 1] === '*') {
      source += '.*';
      i++;
    } else if (c === '*') {
      source += '[^/]*';
    } else {
      source += c.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
    }
  }
  return new RegExp(`^${source}$`);
}

/** The commands that apply to a tree holding `paths`, in their locked order. */
export function testCommandsFor(paths: ReadonlySet<string>): string[] {
  return LOCKED_COMMANDS.filter((c) => paths.has(c.requires)).map((c) => c.command);
}
