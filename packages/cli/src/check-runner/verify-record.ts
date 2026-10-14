import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Refusal, short, type CommandIO } from '../commands/common.js';
import { treeOf } from '../git-tree.js';
import { resolveActor } from '../records/actor.js';
import { recordBase, type CheckResultRecord } from '../records/format.js';
import { hashBytes } from '../records/hash.js';
import { loadRecords } from '../records/store.js';
import { writeRecord } from '../records/write.js';
import {
  enforcingCopy,
  fetchHead,
  jobArgs,
  pullRequestNumber,
  requireRecordsBranch,
} from './job.js';
import type { BundleManifest } from './verify.js';

/** What is wrong with the bundle, checked against its own manifest; empty when it is whole. */
function bundleProblems(
  bundle: string,
  manifest: BundleManifest,
  pr: number,
  head: string,
  tree: string,
): string[] {
  const problems: string[] = [];
  if (manifest.pullRequest !== pr)
    problems.push(`the manifest names pull request ${manifest.pullRequest}`);
  if (manifest.headCommit !== head)
    problems.push(`the manifest names commit ${short(manifest.headCommit)}`);
  if (manifest.headTree !== tree)
    problems.push(`the manifest names tree ${short(manifest.headTree)}`);
  const files = [
    ...manifest.commands
      .filter((c) => c.logSha256 !== null)
      .map((c) => ({ path: c.log, sha256: c.logSha256 })),
    ...manifest.reports,
  ];
  for (const { path, sha256 } of files) {
    const full = join(bundle, path);
    if (!existsSync(full)) problems.push(`${path} is missing from the bundle`);
    else if (hashBytes(readFileSync(full)) !== sha256)
      problems.push(`${path} does not match its hash in the manifest`);
  }
  if (manifest.commands.length === 0 || manifest.commands.some((c) => c.exitCode !== 0)) {
    problems.push('not every locked command ran and exited 0');
  }
  if (manifest.verdict !== 'pass') problems.push('the manifest records a failing verdict');
  return problems;
}

/**
 * `pod-factory ci verify-record --pr <n> --head <sha> --bundle <dir> --verify-result <conclusion>
 * --run-id <id> --run-url <url>`. The record-writing half of verify: it runs no application code,
 * takes the verdict from both the verify job's own conclusion and the bundle, and writes the
 * check-result record with the bundle manifest's hash. Returns the exit code.
 */
export function verifyRecord(argv: string[], io: CommandIO): number {
  const names = ['pr', 'head', 'bundle', 'verify-result', 'run-id', 'run-url'] as const;
  const args = jobArgs('verify-record', argv, names, names);
  const pr = pullRequestNumber(args.pr as string);
  const bundle = args.bundle as string;
  const runId = Number(args['run-id']);
  enforcingCopy(io);
  const who = resolveActor(io.cwd, io.ctx);
  if (who.actor?.kind !== 'check-runner') {
    throw new Refusal(
      'verify-record writes check results only from the check runner under GitHub Actions. Nothing was written.',
    );
  }
  const set = loadRecords(io.cwd, io.remote);
  requireRecordsBranch(set, 'verify-record');
  const head = fetchHead(io, pr, args.head as string);
  const tree = treeOf(io.cwd, head);

  const manifestPath = join(bundle, 'manifest.json');
  if (!existsSync(manifestPath)) {
    io.out(
      `verify-record: the verify job (concluded "${args['verify-result']}") left no evidence bundle, so no check result was written. gate-check finds no passing verify for tree ${short(tree)}.`,
    );
    return 1;
  }
  const bytes = readFileSync(manifestPath);
  let problems: string[];
  try {
    problems = bundleProblems(
      bundle,
      JSON.parse(bytes.toString()) as BundleManifest,
      pr,
      head,
      tree,
    );
  } catch {
    problems = ['manifest.json is not readable JSON'];
  }
  if (args['verify-result'] !== 'success') {
    problems.unshift(`the verify job concluded "${args['verify-result']}"`);
  }
  const outcome = problems.length === 0 ? 'pass' : 'fail';
  const record: CheckResultRecord = {
    ...recordBase(who.actor),
    recordType: 'check-result',
    binds: { tree, files: {} },
    outcome,
    refs: [],
    checkResult: {
      check: 'verify',
      pullRequest: pr,
      runId,
      runUrl: args['run-url'] as string,
      bundleManifestSha256: hashBytes(bytes),
    },
  };
  const landed = writeRecord(io.cwd, record, `verify-pr-${pr}`, { remote: io.remote });
  io.out(
    `verify-record: wrote ${outcome === 'pass' ? 'a passing' : 'a failing'} check result for pull request ${pr} at tree ${short(tree)}: ${landed.path}.`,
  );
  for (const problem of problems) io.out(`  ${problem}`);
  return 0;
}
