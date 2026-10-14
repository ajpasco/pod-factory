import { existsSync, realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { short, type CommandIO } from '../commands/common.js';
import { effectiveLock, isLockedBy } from '../lock-state.js';
import { LOCKED_PATTERNS, globToRegExp } from '../lock-policy.js';
import { git } from '../records/git.js';
import { readRecords, remoteRecordsRef } from '../records/store.js';

/** The PreToolUse matcher in the committed .claude/settings.json; a test pins the file to it. */
export const HOOK_MATCHER = 'Write|Edit|MultiEdit|NotebookEdit';

/**
 * The hook command in the committed .claude/settings.json: refuse every edit with exit 2 when
 * pod-factory is not installed, otherwise run the installed copy. `doctor` checks main holds it.
 */
export const HOOK_COMMAND =
  'command -v pod-factory >/dev/null 2>&1 || { echo "pod-factory is not installed on this machine, so locked and protected paths cannot be checked and every file edit is refused. Install a packed copy from a checkout of main: npm ci && npm run build --workspace packages/cli && cd packages/cli && npm pack && npm install -g ./pod-factory-0.0.0-m0.tgz" >&2; exit 2; }; exec pod-factory hook pre-tool-use';

/** The file-edit tools hook 1 answers, with the field that names the target file. */
const EDIT_TOOLS: Record<string, string> = {
  Write: 'file_path',
  Edit: 'file_path',
  MultiEdit: 'file_path',
  NotebookEdit: 'notebook_path',
};

/**
 * The protected zone on main in milestone zero: the records' main copies and the enforcement
 * layer itself. Denied always, whether or not a lock exists.
 */
export const PROTECTED_PATTERNS: readonly string[] = [
  '.factory/records/**',
  '.claude/settings.json',
  '.claude/settings.local.json',
  '.github/workflows/**',
  '.github/CODEOWNERS',
];

const PROTECTED = PROTECTED_PATTERNS.map(globToRegExp);
const LOCKED_CONSTANTS = LOCKED_PATTERNS.map(globToRegExp);

function deny(io: CommandIO, reason: string): number {
  io.out(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: reason,
      },
    }),
  );
  return 0;
}

/** The real path of `path`, resolving symlinks in its nearest existing ancestor. */
function real(path: string): string {
  let existing = path;
  const rest: string[] = [];
  while (!existsSync(existing)) {
    const parent = dirname(existing);
    if (parent === existing) return path;
    rest.unshift(basename(existing));
    existing = parent;
  }
  return join(realpathSync(existing), ...rest);
}

/** `path` relative to the checkout at `top`, or null when it lies outside it. */
function inside(top: string, path: string): string | null {
  const rel = relative(top, path);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) return null;
  return rel.split(sep).join('/');
}

/**
 * `pod-factory hook pre-tool-use`: hook 1. Reads one Claude Code PreToolUse event on standard
 * input and denies a file edit whose target is in the protected zone or locked by the current
 * lock. It is the advisory layer; CI's lock-guard is the authority. It answers only the file-edit
 * tools, prints nothing to allow, and fails closed on the locked and protected paths when it
 * cannot decide. Returns the exit code.
 */
export function hookPreToolUse(input: string, io: CommandIO): number {
  try {
    return decide(input, io);
  } catch (error) {
    // Claude Code treats any exit but 2 as allow, so an unexpected failure must answer deny.
    return deny(
      io,
      `pod-factory could not decide whether this edit touches a locked or protected path (${(error as Error).message}), so it is refused.`,
    );
  }
}

function decide(input: string, io: CommandIO): number {
  let event: Record<string, unknown>;
  try {
    event = JSON.parse(input) as Record<string, unknown>;
  } catch {
    // The matcher sends only file-edit events, so an unreadable one is still an edit.
    return deny(io, 'pod-factory could not read this hook event, so the edit is refused.');
  }
  const field = EDIT_TOOLS[String(event.tool_name)];
  if (field === undefined) return 0;
  const toolInput = (event.tool_input ?? {}) as Record<string, unknown>;
  const target = toolInput[field];
  if (typeof target !== 'string' || target === '') {
    return deny(
      io,
      `pod-factory cannot tell which file this ${String(event.tool_name)} changes, so it is refused.`,
    );
  }
  const cwd = typeof event.cwd === 'string' && event.cwd !== '' ? event.cwd : io.cwd;
  const topLevel = git(cwd, ['rev-parse', '--show-toplevel'], { allowFail: true });
  if (topLevel.status !== 0) return 0; // not inside a git checkout, so not a pod-factory project
  const rawTop = topLevel.stdout.toString().trim();
  const top = real(rawTop);
  if (!existsSync(join(top, '.factory'))) return 0; // ADR-005: silent outside pod-factory projects

  // The path as written, and the path a symlink would really reach; both are checked.
  const absolute = resolve(cwd, target);
  // The checkout's own prefix may itself sit under a symlink (macOS /var is /private/var).
  const written = inside(rawTop, absolute) ?? inside(top, join(real(cwd), relative(cwd, absolute)));
  const reached = inside(top, real(absolute));
  const paths = [...new Set([written, reached])].filter((p): p is string => p !== null);
  if (paths.length === 0) return 0;

  for (const path of paths) {
    if (PROTECTED.some((re) => re.test(path))) {
      return deny(
        io,
        `${path} is part of pod-factory's enforcement layer or its records, which agents never edit. A human changes it in a bootstrap pull request (or, once it is locked, under "pod-factory approve amendment"), run from a terminal outside any agent session.`,
      );
    }
  }

  let locked;
  try {
    locked = effectiveLock(readRecords(top, remoteRecordsRef(io.remote)));
  } catch (error) {
    const hit = paths.find((p) => LOCKED_CONSTANTS.some((re) => re.test(p)));
    if (hit === undefined) return 0;
    return deny(
      io,
      `${hit} may be locked, and pod-factory could not read the lock to tell (${(error as Error).message}). It is refused until the records branch can be read; fetch it with "git fetch origin pod-factory/records".`,
    );
  }
  if (locked === null) return 0;
  const hit = paths.find((p) => isLockedBy(locked, p));
  if (hit === undefined) return 0;
  const approval = locked.lock.record.refs[0] ?? 'the gate-2 approval';
  return deny(
    io,
    `${hit} is locked by lock ${locked.lock.record.recordId}, which follows gate-2 approval ${short(approval)}. Agents cannot change locked files. A change goes through a pull request and "pod-factory approve amendment --pr <n> ${hit}", run by the approver from a terminal outside any agent session; CI's lock-guard fails the pull request otherwise.`,
  );
}
