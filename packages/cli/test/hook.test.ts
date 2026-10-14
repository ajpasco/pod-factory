import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { HOOK_COMMAND, HOOK_MATCHER, PROTECTED_PATTERNS, type LockRecord } from '../src/index.js';
import { ciProject, plantLock, type CiFixture } from './support/ci.js';
import { cleanEnv, runCli } from './support/cli.js';
import { BRANCH, sh, tempDir } from './support/repo.js';

const EVENTS = fileURLToPath(new URL('./fixtures/hook-events/', import.meta.url));
const SETTINGS = fileURLToPath(new URL('../../../.claude/settings.json', import.meta.url));

type EventName = 'main-session-write' | 'subagent-write-unlocked' | 'subagent-write-locked';

/** A pinned Claude Code event with this machine's paths filled in. */
function event(name: EventName, cwd: string, filePath: string): string {
  return readFileSync(join(EVENTS, `${name}.json`), 'utf8')
    .replaceAll('{{cwd}}', cwd)
    .replaceAll('{{file_path}}', filePath)
    .replaceAll('{{home}}', '/home/fixture');
}

interface Answer {
  status: number | null;
  denied: boolean;
  reason: string;
  stdout: string;
}

/** Feeds `input` to `pod-factory hook pre-tool-use` and reads the answer as Claude Code does. */
function hook(input: string, cwd: string): Answer {
  const result = runCli(cwd, ['hook', 'pre-tool-use'], cleanEnv(), input);
  const stdout = result.stdout.trim();
  const output =
    stdout === ''
      ? null
      : (JSON.parse(stdout) as {
          hookSpecificOutput: {
            hookEventName: string;
            permissionDecision: string;
            permissionDecisionReason: string;
          };
        });
  if (output !== null) expect(output.hookSpecificOutput.hookEventName).toBe('PreToolUse');
  return {
    status: result.status,
    denied: output?.hookSpecificOutput.permissionDecision === 'deny',
    reason: output?.hookSpecificOutput.permissionDecisionReason ?? '',
    stdout,
  };
}

/** A pod-factory project clone with the records branch fetched, as a builder's checkout has it. */
function project(options: { locked?: boolean } = {}): { f: CiFixture; lock: LockRecord | null } {
  const f = ciProject();
  f.commitToMain({ '.factory/work/README.md': 'work zone\n' }, 'work zone');
  sh(f.work, ['pull', '--quiet', 'origin', 'main']);
  const lock = options.locked === false ? null : plantLock(f);
  sh(f.work, ['fetch', '--quiet', 'origin', `+refs/heads/${BRANCH}:refs/remotes/origin/${BRANCH}`]);
  return { f, lock };
}

const LOCKED_TEST = 'packages/cli/test/a.test.ts';

describe('hook pre-tool-use', () => {
  it('T-06-P1 [M0] hook 1 allows an agent edit to a file that is not locked', () => {
    const { f } = project();
    const answer = hook(event('main-session-write', f.work, join(f.work, 'src/app.js')), f.work);
    expect(answer).toMatchObject({ status: 0, denied: false, stdout: '' });
  });

  it('T-06-N1 [M0] hook 1 denies an agent edit to a locked test, naming the lock and how to amend', () => {
    const { f, lock } = project();
    const answer = hook(event('main-session-write', f.work, join(f.work, LOCKED_TEST)), f.work);
    expect(answer.status).toBe(0);
    expect(answer.denied).toBe(true);
    expect(answer.reason).toContain(`${LOCKED_TEST} is locked by lock ${lock?.recordId}`);
    expect(answer.reason).toContain(`pod-factory approve amendment --pr <n> ${LOCKED_TEST}`);
  });

  it("resolves a subagent's edit against its own worktree, from the event's cwd", () => {
    const { f } = project();
    const worktree = join(f.work, '.claude', 'worktrees', 'agent-ab5062320d58b433d');
    sh(f.work, ['worktree', 'add', '--quiet', '--detach', worktree]);
    const denied = hook(
      event('subagent-write-locked', worktree, join(worktree, LOCKED_TEST)),
      f.work,
    );
    expect(denied.denied).toBe(true);
    expect(denied.reason).toContain(`${LOCKED_TEST} is locked`);
    const allowed = hook(
      event('subagent-write-unlocked', worktree, join(worktree, 'free/b.txt')),
      f.work,
    );
    expect(allowed).toMatchObject({ status: 0, denied: false });
  });

  it('denies the enforcement layer and the records always, even before any lock exists', () => {
    const { f } = project({ locked: false });
    for (const path of [
      '.github/workflows/pr-checks.yml',
      '.github/CODEOWNERS',
      '.claude/settings.json',
      '.claude/settings.local.json',
      '.factory/records/0005-classification-gate-2.json',
    ]) {
      const answer = hook(event('main-session-write', f.work, join(f.work, path)), f.work);
      expect(answer.denied, path).toBe(true);
      expect(answer.reason).toContain(
        `${path} is part of pod-factory's enforcement layer or its records`,
      );
    }
    expect(PROTECTED_PATTERNS).toHaveLength(5);
    const unlocked = hook(event('main-session-write', f.work, join(f.work, LOCKED_TEST)), f.work);
    expect(unlocked.denied).toBe(false);
  });

  it('denies a write through a symlink that reaches a locked file', () => {
    const { f } = project();
    mkdirSync(join(f.work, 'free'), { recursive: true });
    symlinkSync(join(f.work, LOCKED_TEST), join(f.work, 'free', 'link.ts'));
    symlinkSync(join(f.work, 'packages/cli/test'), join(f.work, 'free', 'tests'));
    for (const via of ['free/link.ts', 'free/tests/a.test.ts']) {
      const answer = hook(event('main-session-write', f.work, join(f.work, via)), f.work);
      expect(answer.denied, via).toBe(true);
      expect(answer.reason).toContain(`${LOCKED_TEST} is locked`);
    }
  });

  it('allows edits outside the checkout, tools that do not edit, and projects without .factory', () => {
    const { f } = project();
    expect(
      hook(event('main-session-write', f.work, join(tempDir(), 'notes.md')), f.work).denied,
    ).toBe(false);
    const read = event('main-session-write', f.work, join(f.work, LOCKED_TEST)).replace(
      '"tool_name": "Write"',
      '"tool_name": "Read"',
    );
    expect(hook(read, f.work)).toMatchObject({ status: 0, denied: false, stdout: '' });

    const plain = ciProject();
    const answer = hook(
      event('main-session-write', plain.work, join(plain.work, LOCKED_TEST)),
      plain.work,
    );
    expect(answer).toMatchObject({ status: 0, denied: false });
  });

  it('answers NotebookEdit by its notebook path, and refuses an edit that names no file', () => {
    const { f } = project();
    const notebook = JSON.stringify({
      cwd: f.work,
      hook_event_name: 'PreToolUse',
      tool_name: 'NotebookEdit',
      tool_input: {
        notebook_path: join(f.work, 'packages/cli/test/fixtures/n.ipynb'),
        new_source: 'x',
      },
    });
    expect(hook(notebook, f.work).denied).toBe(true);
    const nameless = event('main-session-write', f.work, '');
    const answer = hook(nameless, f.work);
    expect(answer.denied).toBe(true);
    expect(answer.reason).toMatch(/cannot tell which file this Write changes/);
  });

  it('refuses an event it cannot read, since the matcher sends only edits', () => {
    const { f } = project();
    const answer = hook('{"tool_name": "Write", "tool_input": ', f.work);
    expect(answer.denied).toBe(true);
    expect(answer.reason).toMatch(/could not read this hook event, so the edit is refused/);
  });

  it('refuses the edit when something unexpected stops it from deciding', () => {
    const { f } = project();
    const gone = join(tempDir(), 'removed-worktree');
    const answer = hook(event('main-session-write', gone, join(gone, 'src/app.js')), f.work);
    expect(answer.status).toBe(0);
    expect(answer.denied).toBe(true);
    expect(answer.reason).toMatch(
      /could not decide whether this edit touches a locked or protected path/,
    );
  });

  it('fails closed on locked paths when it cannot read the lock, and allows the rest', () => {
    const { f } = project();
    const shallow = join(f.root, 'shallow');
    sh(f.root, [
      'clone',
      '--quiet',
      '--depth',
      '1',
      '--no-single-branch',
      `file://${f.remote}`,
      shallow,
    ]);
    mkdirSync(join(shallow, '.factory'), { recursive: true });
    const locked = hook(event('main-session-write', shallow, join(shallow, LOCKED_TEST)), shallow);
    expect(locked.denied).toBe(true);
    expect(locked.reason).toMatch(/may be locked, and pod-factory could not read the lock to tell/);
    expect(
      hook(event('main-session-write', shallow, join(shallow, 'src/app.js')), shallow).denied,
    ).toBe(false);
  });
});

describe('the committed hook configuration', () => {
  const settings = JSON.parse(readFileSync(SETTINGS, 'utf8')) as {
    hooks: { PreToolUse: { matcher: string; hooks: { type: string; command: string }[] }[] };
  };
  const [entry] = settings.hooks.PreToolUse;
  const command = entry?.hooks[0]?.command as string;

  it('is exactly what doctor checks main for', () => {
    expect(entry?.matcher).toBe(HOOK_MATCHER);
    expect(command).toBe(HOOK_COMMAND);
  });

  it('runs hook 1 on every file-edit tool', () => {
    expect(entry?.matcher).toBe('Write|Edit|MultiEdit|NotebookEdit');
    expect(command).toMatch(/exec pod-factory hook pre-tool-use$/);
  });

  it('blocks the edit with exit 2 when pod-factory is not installed, and runs it when it is', () => {
    const missing = spawnSync('sh', ['-c', command], {
      env: { PATH: '/usr/bin:/bin' },
      input: '{}',
      encoding: 'utf8',
    });
    expect(missing.status).toBe(2);
    expect(missing.stderr).toMatch(
      /pod-factory is not installed on this machine, so locked and protected paths cannot be checked/,
    );

    const bin = tempDir();
    writeFileSync(join(bin, 'pod-factory'), '#!/bin/sh\necho "called with $*"; cat\n');
    chmodSync(join(bin, 'pod-factory'), 0o755);
    const present = spawnSync('sh', ['-c', command], {
      env: { PATH: `${bin}:/usr/bin:/bin` },
      input: '{"event": 1}',
      encoding: 'utf8',
    });
    expect(present.status).toBe(0);
    expect(present.stdout).toBe('called with hook pre-tool-use\n{"event": 1}');
  });
});
