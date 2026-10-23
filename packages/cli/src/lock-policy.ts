/**
 * What the gate-2 lock covers, held as constants because this code is enforcement code.
 * Eval plan section 5 is the authority for the patterns and section 4 for the commands; a locked
 * test checks that every path and command named there appears here. Shipped code never parses
 * the eval plan.
 *
 * Section 5 now carries a row for the harness of a project pod-factory builds, so its paths
 * and this list are the same set. They need not stay that way: the locked test reads the plan
 * one way, checking that every path section 5 names appears here and not the reverse, so this
 * list may be a superset. That is the fail-safe direction -- more locked than the plan records,
 * never less -- and it is what a pattern added between two gate-2 approvals looks like until
 * the plan catches up.
 */
export const LOCKED_PATTERNS: readonly string[] = [
  'packages/*/test/**',
  'templates/test/**',
  // The acceptance tests and frozen tool list of the equipment-checkout project (ADR-021).
  // Named for this one project, like the meeting-reminder rows below: a project cannot
  // choose its own locked set, so each one is added here deliberately.
  'projects/equipment-checkout/api/tests/**',
  'projects/equipment-checkout/harness/**',
  'docs/projects/meeting-reminder/web/test/**',
  'docs/projects/meeting-reminder/web/public/**',
  'docs/projects/meeting-reminder/web/package.json',
  'docs/projects/meeting-reminder/web/package-lock.json',
  'docs/projects/meeting-reminder/web/tsconfig.json',
  'docs/projects/meeting-reminder/web/playwright.config.ts',
  'docs/projects/meeting-reminder/web/scripts/**',
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
  {
    command: 'node docs/projects/meeting-reminder/web/scripts/run-browser-trial.mjs',
    requires: 'docs/projects/meeting-reminder/web/package.json',
  },
  // The equipment-checkout API rows: U and D of that project's eval plan, section 7.2. One
  // runner rather than that section's steps, because the lock holds independent command strings
  // and verify runs each in its own shell: the virtual environment C2 builds, the PYTHONPATH C3
  // needs and the database URL C4 computes cannot survive between them, and teardown has to run
  // after a failing step that verify would stop at. Same shape as the browser trial above, which
  // section 4 calls an application adapter.
  //
  // Pinned by the frozen pytest configuration, not by the runner or the application: a tree
  // holding the harness always runs it. With no application in the tree the runner reports
  // "skipped" and exits 0, so the frozen cases stand as a standard for a candidate that offers
  // an implementation without failing pod-factory's own pull requests.
  {
    command: 'node projects/equipment-checkout/harness/api/run-eval.mjs',
    requires: 'projects/equipment-checkout/harness/api/pytest.ini',
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
