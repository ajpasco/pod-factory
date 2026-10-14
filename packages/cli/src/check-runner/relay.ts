import { Refusal, short, type CommandIO } from '../commands/common.js';
import { fetchPullRequest, treeOf } from '../git-tree.js';
import { gh, openPullRequests } from '../github.js';
import { resolveActor } from '../records/actor.js';
import { recordBase, type CheckResultRecord, type RevocationRecord } from '../records/format.js';
import { git } from '../records/git.js';
import type { RecordSet } from '../records/store.js';
import { writeRecord } from '../records/write.js';
import { pullRequestOf, relayRecord, reliedOn, revocationTarget } from '../revocation.js';

/**
 * The revocation relay, run by records-validate in Actions (TECH-SPEC section 6). For every
 * valid revocation whose record an open pull request relied on at its current head, it posts a
 * failing gate-check check run on that head and writes a gate-check check result naming the
 * revocation, which is how `revoke` learns the block is in place. It skips what it has already
 * relayed. Returns the exit code.
 */
export function relay(io: CommandIO, set: RecordSet, runId: number, runUrl: string): number {
  const who = resolveActor(io.cwd, io.ctx);
  if (who.actor?.kind !== 'check-runner') {
    throw new Refusal(
      'The relay runs only as the check runner under GitHub Actions. Nothing was posted.',
    );
  }
  const candidates = set.records
    .filter(
      (s): s is typeof s & { record: RevocationRecord } => s.record.recordType === 'revocation',
    )
    .flatMap((s) => {
      const target = revocationTarget(set, s.record.revocation.revokes);
      if (target?.kind !== 'record') return [];
      const pr = pullRequestOf(target.stored.record);
      return pr === null ? [] : [{ revocation: s.record, target: target.stored.record, pr }];
    });
  if (candidates.length === 0) {
    io.out(
      'Relay: no revocation names a record a pull request merges on, so there is nothing to block.',
    );
    return 0;
  }
  const open = openPullRequests(io.cwd, io.ctx);
  if ('reason' in open) {
    io.out(`Relay failed: ${open.reason}. Revocations stay pending until it runs.`);
    return 1;
  }

  let failures = 0;
  for (const { revocation, target, pr } of candidates) {
    const pull = open.find((p) => p.number === pr);
    if (pull === undefined) continue;
    fetchPullRequest(io.cwd, pr, io.remote);
    git(io.cwd, ['fetch', '--quiet', '--no-tags', io.remote, pull.headSha], { allowFail: true });
    const tree = treeOf(io.cwd, pull.headSha);
    if (!reliedOn(target, pr, tree)) continue;
    if (relayRecord(set, revocation, pr, tree) !== undefined) {
      io.out(
        `Relay: pull request ${pr} at ${short(pull.headSha)} is already blocked for revocation ${revocation.recordId}.`,
      );
      continue;
    }
    const posted = gh(io.cwd, io.ctx, [
      'api',
      '-X',
      'POST',
      'repos/{owner}/{repo}/check-runs',
      '-f',
      'name=gate-check',
      '-f',
      `head_sha=${pull.headSha}`,
      '-f',
      'status=completed',
      '-f',
      'conclusion=failure',
      '-f',
      'output[title]=approval revoked',
      '-f',
      `output[summary]=Revocation ${revocation.recordId} revoked ${target.recordId}, which this pull request relied on. Reason: ${revocation.revocation.reason}`,
    ]);
    if (!posted.ok) {
      io.out(`Relay could not block pull request ${pr}: ${posted.reason}.`);
      failures++;
      continue;
    }
    const record: CheckResultRecord = {
      ...recordBase(who.actor),
      recordType: 'check-result',
      binds: { tree, files: {} },
      outcome: 'fail',
      refs: [revocation.recordId],
      checkResult: {
        check: 'gate-check',
        pullRequest: pr,
        runId,
        runUrl,
        bundleManifestSha256: null,
      },
    };
    const landed = writeRecord(io.cwd, record, `relay-pr-${pr}`, { remote: io.remote });
    io.out(
      `Relay: posted a failing gate-check on pull request ${pr} at ${short(pull.headSha)} for revocation ${revocation.recordId}; recorded as ${landed.path}.`,
    );
  }
  return failures === 0 ? 0 : 1;
}
