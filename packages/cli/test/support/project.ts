import type { CommandIO, InvocationContext } from '../../src/index.js';
import { hashText } from '../../src/index.js';
import { fixture, type Fixture } from './repo.js';

/** A fixture tree shaped like pod-factory's bootstrap layout; never the repository's own docs. */
export const PROJECT_FILES: Record<string, string> = {
  'docs/PRD.md': '# PRD\n\n**REQ-01 Start.** fixture requirement\n',
  'docs/TECH-SPEC.md': '# Tech spec\n\nfixture design\n',
  'docs/eval-plan.md': '# Eval plan\n\nfixture eval plan\n',
  'docs/spec/criterion-to-control-mapping.md': '# Mapping\n',
  'docs/spec/threat-review.md': '# Threat review\n',
  'docs/spec/production-readiness.md': '# Production readiness\n',
  'docs/spec/interfaces-and-non-goals.md': '# Interfaces\n',
  'docs/adr/ADR-001-history.md': '# History, never bound\n',
  '.factory/work/classification/gate-2.json': '{"numTotalTests": 63, "success": false}\n',
  'package.json': '{"name": "fixture", "private": true}\n',
  'package-lock.json': '{"lockfileVersion": 3}\n',
  'packages/cli/package.json': '{"name": "pod-factory"}\n',
  'packages/cli/vitest.config.ts': 'export default {};\n',
  'packages/cli/test/approve.test.ts': "it('T-03-N4 [M0] fixture', () => {});\n",
  'packages/cli/test/fixtures/record.json': '{}\n',
  'packages/cli/src/index.ts': 'export {};\n',
  '.github/workflows/pr-checks.yml': 'name: pr-checks\n',
};

export const CLASSIFICATION_RECORD = '0005-classification-gate-2.json';

export function classificationRecord(reportText: string): string {
  return `${JSON.stringify(
    {
      schemaVersion: 'bootstrap-0',
      recordType: 'classification',
      project: 'fixture',
      factoryVersion: 'bootstrap (decision 23)',
      hashAlgorithm: 'sha256 over LF-normalized UTF-8',
      createdAt: '2026-10-20T12:00:00-04:00',
      actor: { name: 'Test Human', email: 'human@example.test', kind: 'human' },
      binds: { '.factory/work/classification/gate-2.json': { sha256: hashText(reportText) } },
      command: 'npm exec --workspace packages/cli -- vitest run --config vitest.config.ts',
      counts: { RB: 61, NB: 2 },
      outcome: 'approved',
    },
    null,
    2,
  )}\n`;
}

/** A fixture remote whose main holds the project files and whose records branch holds 0005. */
export function project(options: { classification?: boolean } = {}): Fixture {
  const f = fixture();
  f.commitToMain(PROJECT_FILES, 'project scaffold');
  if (options.classification !== false) {
    f.plant(
      {
        [`records/bootstrap/${CLASSIFICATION_RECORD}`]: classificationRecord(
          PROJECT_FILES['.factory/work/classification/gate-2.json'] as string,
        ),
      },
      'classification record 0005',
    );
  }
  return f;
}

export interface ScriptedIO extends CommandIO {
  lines: string[];
  errors: string[];
  questions: string[];
}

/** The hash `approve` printed, read back from its own output. */
export function shownHash(io: ScriptedIO): string {
  const line = io.lines.find((l) => l.startsWith('Hash of everything above: '));
  if (line === undefined) throw new Error(`approve showed no hash:\n${io.lines.join('\n')}`);
  return line.slice('Hash of everything above: '.length);
}

/**
 * A human at an interactive terminal with no agent marker. `answer` receives the IO so far and
 * returns what the human types.
 */
export function human(
  cwd: string,
  answer: (io: ScriptedIO) => string | Promise<string> = () => '',
  ctx: InvocationContext = { env: {}, stdinIsTTY: true, stdoutIsTTY: true },
): ScriptedIO {
  const io: ScriptedIO = {
    cwd,
    ctx,
    remote: 'origin',
    lines: [],
    errors: [],
    questions: [],
    out: (line) => io.lines.push(line),
    err: (line) => io.errors.push(line),
    ask: async (question) => {
      io.questions.push(question);
      return answer(io);
    },
  };
  return io;
}

/** Types the token and the first eight characters of the hash shown, as asked. */
export const confirms =
  (token: string) =>
  (io: ScriptedIO): string =>
    `${token} ${shownHash(io).slice(0, 8)}`;
