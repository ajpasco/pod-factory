import { parseArgs } from 'node:util';
import { Refusal, type CommandIO } from '../commands/common.js';
import { fetchPullRequest } from '../git-tree.js';
import { RECORDS_BRANCH } from '../records/format.js';
import { git, gitText } from '../records/git.js';
import type { RecordSet } from '../records/store.js';

/** Parses a job's flags; every flag named in `required` must be given. */
export function jobArgs<K extends string>(
  job: string,
  argv: string[],
  names: readonly K[],
  required: readonly K[],
): Record<K, string | undefined> {
  const usage = `Usage: pod-factory ci ${job} ${names.map((n) => `--${n} <${n}>`).join(' ')}`;
  let values: Record<string, string | undefined>;
  try {
    values = parseArgs({
      args: argv,
      options: Object.fromEntries(names.map((n) => [n, { type: 'string' as const }])),
    }).values as Record<string, string | undefined>;
  } catch (error) {
    throw new Refusal(`${(error as Error).message}\n${usage}`);
  }
  const missing = required.filter((n) => values[n] === undefined || values[n] === '');
  if (missing.length > 0) {
    throw new Refusal(`ci ${job} needs ${missing.map((n) => `--${n}`).join(', ')}.\n${usage}`);
  }
  return values as Record<K, string | undefined>;
}

export function pullRequestNumber(value: string): number {
  if (!/^[1-9][0-9]*$/.test(value)) {
    throw new Refusal(`"${value}" is not a pull request number. Nothing was checked.`);
  }
  return Number(value);
}

/**
 * Prints and returns the commit this pod-factory was checked out at: the enforcing copy, main's
 * code under pull_request_target, never the pull request's.
 */
export function enforcingCopy(io: CommandIO): string {
  const commit = gitText(io.cwd, ['rev-parse', 'HEAD']);
  io.out(`enforcing copy: commit ${commit}`);
  return commit;
}

/**
 * Fetches the pull request and returns `sha`, the head the event named. A newer push does not
 * change what this run judges, because the check is reported on the event's head.
 */
export function fetchHead(io: CommandIO, pr: number, sha: string): string {
  const tip = fetchPullRequest(io.cwd, pr, io.remote);
  if (tip !== sha) {
    git(io.cwd, ['fetch', '--quiet', '--no-tags', io.remote, sha], { allowFail: true });
  }
  const found = git(io.cwd, ['cat-file', '-e', `${sha}^{commit}`], { allowFail: true });
  if (found.status !== 0) {
    throw new Refusal(
      `Pull request ${pr} has no commit ${sha} on ${io.remote}, so there is nothing to check. Nothing was checked.`,
    );
  }
  return sha;
}

/** Every job that reads records fails closed, in plain language, when the branch is absent. */
export function requireRecordsBranch(set: RecordSet, job: string): void {
  if (set.head !== null) return;
  throw new Refusal(
    `${job} fails: the records branch ${RECORDS_BRANCH} does not exist, so there is no approval or check result to check against. The approver creates it once, by hand (.factory/work/bootstrap-02-approve-lock/records-branch.md). This pull request cannot pass until then.`,
  );
}

/** One line per flagged record, so a reader of a failing check sees what was ignored. */
export function reportFlagged(io: CommandIO, set: RecordSet): void {
  if (set.flagged.length === 0) return;
  io.out(
    `${set.flagged.length} flagged ${set.flagged.length === 1 ? 'record was' : 'records were'} ignored:`,
  );
  for (const flag of set.flagged) io.out(`  ${flag.reason}`);
}
