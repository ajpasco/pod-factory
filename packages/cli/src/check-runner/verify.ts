import { spawnSync } from 'node:child_process';
import {
  closeSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { Refusal, short, type CommandIO } from '../commands/common.js';
import { filesAt, treeOf } from '../git-tree.js';
import { effectiveLock } from '../lock-state.js';
import { testCommandsFor } from '../lock-policy.js';
import { gitText } from '../records/git.js';
import { hashBytes } from '../records/hash.js';
import { loadRecords } from '../records/store.js';
import {
  enforcingCopy,
  fetchHead,
  jobArgs,
  pullRequestNumber,
  requireRecordsBranch,
} from './job.js';

/** Where the locked runner configuration writes its JSON reports, relative to the repository. */
export const REPORTS_DIR = '.factory/work/reports';

export interface BundleManifest {
  pullRequest: number;
  headCommit: string;
  headTree: string;
  enforcingCommit: string;
  /** The lock the commands came from, or null before the first lock. */
  lockRecord: string | null;
  commands: { command: string; exitCode: number | null; log: string; logSha256: string | null }[];
  reports: { path: string; sha256: string }[];
  verdict: 'pass' | 'fail';
}

/**
 * The environment the pull request's code runs in: this job's, without any token or Actions
 * runtime variable, so test code cannot act with the job's credentials.
 */
export function scrubbedEnv(env: NodeJS.ProcessEnv): Record<string, string> {
  const kept: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined || /TOKEN|SECRET|^ACTIONS_/i.test(key)) continue;
    kept[key] = value;
  }
  return kept;
}

/**
 * `pod-factory ci verify --pr <n> --head <sha> --subject <dir> --bundle <dir>`. Runs the locked
 * test commands, exactly as locked and never the branch's own scripts, in `subject` (the pull
 * request's head checked out) and writes the evidence bundle. The only job that runs application
 * code; it holds a read-only token. Returns the exit code.
 */
export function verify(argv: string[], io: CommandIO): number {
  const names = ['pr', 'head', 'subject', 'bundle'] as const;
  const args = jobArgs('verify', argv, names, names);
  const pr = pullRequestNumber(args.pr as string);
  const subject = args.subject as string;
  const bundle = args.bundle as string;
  const enforcingCommit = enforcingCopy(io);
  const set = loadRecords(io.cwd, io.remote);
  requireRecordsBranch(set, 'verify');
  const head = fetchHead(io, pr, args.head as string);
  const checkedOut = gitText(subject, ['rev-parse', 'HEAD']);
  if (checkedOut !== head) {
    throw new Refusal(
      `verify fails: ${subject} is at ${short(checkedOut)}, not the pull request head ${short(head)}. Nothing was run.`,
    );
  }

  const locked = effectiveLock(set);
  const commands = locked
    ? locked.lock.record.lock.testCommands
    : testCommandsFor(new Set(filesAt(io.cwd, head).keys()));
  io.out(
    locked
      ? `Test commands from lock ${locked.lock.record.recordId}, exactly as locked.`
      : "No lock yet: test commands from the enforcing copy's section-4 list, for the packages this head has. The branch's own scripts are never used.",
  );
  if (commands.length === 0) {
    throw new Refusal(
      'verify fails: no test command applies to this head, so nothing would be verified.',
    );
  }

  mkdirSync(join(bundle, 'logs'), { recursive: true });
  mkdirSync(join(bundle, 'reports'), { recursive: true });
  const env = scrubbedEnv(process.env);
  const ran: BundleManifest['commands'] = [];
  let failed = false;
  commands.forEach((command, i) => {
    const log = `logs/${i + 1}.log`;
    if (failed) {
      ran.push({ command, exitCode: null, log, logSha256: null });
      return;
    }
    io.out(`$ ${command}`);
    const fd = openSync(join(bundle, log), 'w');
    let exitCode: number;
    try {
      const result = spawnSync('sh', ['-c', command], {
        cwd: subject,
        env,
        stdio: ['ignore', fd, fd],
      });
      exitCode = result.status ?? 1;
    } finally {
      closeSync(fd);
    }
    io.out(`  exit ${exitCode}`);
    ran.push({ command, exitCode, log, logSha256: hashBytes(readFileSync(join(bundle, log))) });
    if (exitCode !== 0) failed = true;
  });

  const reports: BundleManifest['reports'] = [];
  const reportsDir = join(subject, REPORTS_DIR);
  if (existsSync(reportsDir)) {
    for (const name of readdirSync(reportsDir)
      .filter((n) => n.endsWith('.json'))
      .sort()) {
      const path = `reports/${name}`;
      copyFileSync(join(reportsDir, name), join(bundle, path));
      reports.push({ path, sha256: hashBytes(readFileSync(join(bundle, path))) });
    }
  }

  const manifest: BundleManifest = {
    pullRequest: pr,
    headCommit: head,
    headTree: treeOf(io.cwd, head),
    enforcingCommit,
    lockRecord: locked?.lock.record.recordId ?? null,
    commands: ran,
    reports,
    verdict: failed ? 'fail' : 'pass',
  };
  writeFileSync(join(bundle, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  io.out(
    `verify ${manifest.verdict === 'pass' ? 'passes' : 'fails'}: ${ran.filter((c) => c.exitCode === 0).length} of ${ran.length} commands passed for pull request ${pr} at ${short(head)}. Evidence bundle: ${bundle}.`,
  );
  return failed ? 1 : 0;
}
