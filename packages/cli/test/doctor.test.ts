import { chmodSync, mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ACTIONS_APP_ID,
  HOOK_COMMAND,
  HOOK_MATCHER,
  run,
  type InvocationContext,
} from '../src/index.js';
import { ciProject, type CiFixture } from './support/ci.js';
import { fakeGitHub, type FakeState } from './support/gh.js';
import { human, type ScriptedIO } from './support/project.js';
import { tempDir } from './support/repo.js';

const SETTINGS = `${JSON.stringify(
  {
    hooks: {
      PreToolUse: [{ matcher: HOOK_MATCHER, hooks: [{ type: 'command', command: HOOK_COMMAND }] }],
    },
  },
  null,
  2,
)}\n`;

const PR_CHECKS = [
  'name: pr-checks',
  'on:',
  '  pull_request_target:',
  'jobs:',
  '  lock-guard:',
  '    runs-on: ubuntu-latest',
  '  verify:',
  '    runs-on: ubuntu-latest',
  '  verify-record:',
  '    runs-on: ubuntu-latest',
  '  gate-check:',
  '    runs-on: ubuntu-latest',
  '',
].join('\n');

const RECORDS_VALIDATE = [
  'name: records-validate',
  'on:',
  '  schedule:',
  "    - cron: '*/15 * * * *'",
  'jobs:',
  '  records-validate:',
  '    steps:',
  '      - run: node packages/cli/dist/cli.js ci records-validate --relay --run-id 1 --run-url x',
  '',
].join('\n');

const MAIN_PROTECTION = {
  enforce_admins: { enabled: true },
  required_status_checks: {
    strict: true,
    contexts: ['lock-guard', 'verify', 'gate-check'],
    checks: ['lock-guard', 'verify', 'gate-check'].map((context) => ({
      context,
      app_id: ACTIONS_APP_ID,
    })),
  },
  required_pull_request_reviews: null,
  allow_force_pushes: { enabled: false },
  allow_deletions: { enabled: false },
};

const RECORDS_PROTECTION = {
  enforce_admins: { enabled: true },
  required_status_checks: null,
  required_pull_request_reviews: null,
  allow_force_pushes: { enabled: false },
  allow_deletions: { enabled: false },
};

const FULL: FakeState = {
  pulls: {},
  protection: { main: MAIN_PROTECTION, 'pod-factory/records': RECORDS_PROTECTION },
};

/** A project with every enforcement layer in place, and a packed pod-factory on PATH. */
function healthy(): { f: CiFixture; bin: string } {
  const f = ciProject();
  f.commitToMain(
    {
      '.claude/settings.json': SETTINGS,
      '.github/workflows/pr-checks.yml': PR_CHECKS,
      '.github/workflows/records-validate.yml': RECORDS_VALIDATE,
    },
    'enforcement layer',
  );
  const bin = tempDir();
  writeFileSync(join(bin, 'pod-factory'), '#!/bin/sh\n');
  chmodSync(join(bin, 'pod-factory'), 0o755);
  return { f, bin };
}

async function doctor(
  f: CiFixture,
  bin: string,
  state: FakeState,
  extra: Record<string, string> = {},
): Promise<ScriptedIO & { code: number }> {
  const github = fakeGitHub(state);
  const ctx: InvocationContext = {
    env: { ...github.env, PATH: `${bin}:${github.env.PATH}`, ...extra },
    stdinIsTTY: false,
    stdoutIsTTY: false,
  };
  const io = human(f.work, () => '', ctx);
  const code = await run(['doctor'], io);
  return Object.assign(io, { code });
}

const out = (io: ScriptedIO) => io.lines.join('\n');

describe('doctor', () => {
  it('T-19-P3 [M0] passes with every enforcement layer present', async () => {
    const { f, bin } = healthy();
    const io = await doctor(f, bin, FULL);
    expect(io.errors).toEqual([]);
    for (const layer of [
      'hook configuration',
      'pod-factory binary',
      'CI workflows on main',
      'main branch protection',
      'records branch',
      'records branch protection',
    ]) {
      expect(out(io)).toMatch(new RegExp(`^present {2}${layer}: `, 'm'));
    }
    expect(out(io)).toContain('strict (branches up to date before merge) is on');
    expect(out(io)).toMatch(/Every enforcement layer is present/);
    expect(io.code).toBe(0);
  });

  it('T-03-P2 [M0] runs as a read-only command from an agent session', async () => {
    const { f, bin } = healthy();
    const io = await doctor(f, bin, FULL, { CLAUDECODE: '1' });
    expect(io.errors).toEqual([]);
    expect(out(io)).toMatch(/Every enforcement layer is present/);
    expect(io.code).toBe(0);
  });

  it('T-19-N3 [M0] fails naming each missing layer', async () => {
    const cases: {
      name: string;
      state?: FakeState;
      change?: (f: CiFixture, bin: string) => string | undefined;
      expect: RegExp;
    }[] = [
      {
        name: 'administrators not bound',
        state: {
          ...FULL,
          protection: {
            ...FULL.protection,
            main: { ...MAIN_PROTECTION, enforce_admins: { enabled: false } },
          },
        },
        expect: /^MISSING {2}main branch protection: administrators are not bound/m,
      },
      {
        name: 'a check not bound to the Actions app',
        state: {
          ...FULL,
          protection: {
            ...FULL.protection,
            main: {
              ...MAIN_PROTECTION,
              required_status_checks: {
                ...MAIN_PROTECTION.required_status_checks,
                checks: [
                  { context: 'lock-guard', app_id: ACTIONS_APP_ID },
                  { context: 'verify', app_id: ACTIONS_APP_ID },
                  { context: 'gate-check', app_id: null },
                ],
              },
            },
          },
        },
        expect: /gate-check is required but not bound to the GitHub Actions app \(15368\)/,
      },
      {
        name: 'the records branch requires checks',
        state: {
          ...FULL,
          protection: {
            ...FULL.protection,
            'pod-factory/records': {
              ...RECORDS_PROTECTION,
              required_status_checks: { contexts: ['verify'] },
            },
          },
        },
        expect:
          /^MISSING {2}records branch protection: it requires status checks, so verify-record could not push/m,
      },
      {
        name: 'the records branch unprotected',
        state: { ...FULL, protection: { main: MAIN_PROTECTION } },
        expect: /^MISSING {2}records branch protection: pod-factory\/records is not protected/m,
      },
      {
        name: 'GitHub cannot be asked',
        state: { ...FULL, fail: true },
        expect:
          /^MISSING {2}main branch protection: cannot be checked: gh api repos\/\{owner\}\/\{repo\}\/branches\/main\/protection failed/m,
      },
      {
        name: 'no hook configuration on main',
        change: (f) => {
          f.commitToMain({ '.claude/settings.json': null });
          return undefined;
        },
        expect: /^MISSING {2}hook configuration: main has no \.claude\/settings\.json/m,
      },
      {
        name: 'a hook command that would fail open',
        change: (f) => {
          f.commitToMain({
            '.claude/settings.json': SETTINGS.replace(
              HOOK_COMMAND.replace(/"/g, '\\"'),
              'pod-factory hook pre-tool-use',
            ),
          });
          return undefined;
        },
        expect:
          /^MISSING {2}hook configuration: main's \.claude\/settings\.json has no PreToolUse entry running hook 1 exactly as pod-factory ships it/m,
      },
      {
        name: 'a workflow without the relay',
        change: (f) => {
          f.commitToMain({
            '.github/workflows/records-validate.yml': RECORDS_VALIDATE.replace(' --relay', ''),
          });
          return undefined;
        },
        expect:
          /^MISSING {2}CI workflows on main: records-validate\.yml does not run the revocation relay/m,
      },
      {
        name: 'the binary links into a checkout',
        change: (f, bin) => {
          mkdirSync(join(f.work, 'tools'), { recursive: true });
          writeFileSync(join(f.work, 'tools', 'pod-factory'), '#!/bin/sh\n');
          chmodSync(join(f.work, 'tools', 'pod-factory'), 0o755);
          const linked = join(bin, 'linked');
          mkdirSync(linked);
          symlinkSync(join(f.work, 'tools', 'pod-factory'), join(linked, 'pod-factory'));
          return linked;
        },
        expect:
          /^MISSING {2}pod-factory binary: .* inside the git checkout .*Install a packed copy instead: npm ci && npm run build --workspace packages\/cli && cd packages\/cli && npm pack/m,
      },
    ];
    for (const c of cases) {
      const { f, bin } = healthy();
      const path = c.change?.(f, bin) ?? bin;
      const io = await doctor(f, path, c.state ?? FULL);
      expect(out(io), c.name).toMatch(c.expect);
      expect(out(io), c.name).toMatch(/enforcement layers? (is|are) missing/);
      expect(io.code, c.name).toBe(1);
    }
  });

  it('names a still-required bootstrap-check as the placeholder', async () => {
    const { f, bin } = healthy();
    const checks = [
      ...MAIN_PROTECTION.required_status_checks.checks,
      { context: 'bootstrap-check', app_id: ACTIONS_APP_ID },
    ];
    const io = await doctor(f, bin, {
      ...FULL,
      protection: {
        ...FULL.protection,
        main: {
          ...MAIN_PROTECTION,
          required_status_checks: {
            ...MAIN_PROTECTION.required_status_checks,
            strict: false,
            checks,
          },
        },
      },
    });
    expect(out(io)).toContain('strict (branches up to date before merge) is off');
    expect(out(io)).toContain('the placeholder bootstrap-check is still required');
  });
});
