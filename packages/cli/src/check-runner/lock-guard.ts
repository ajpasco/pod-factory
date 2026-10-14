import { short, type CommandIO } from '../commands/common.js';
import { fetchTrunk, filesAt, hashesAt, treeOf } from '../git-tree.js';
import { effectiveLock, isLockedBy, type EffectiveLock } from '../lock-state.js';
import type { ApprovalRecord, RevocationRecord } from '../records/format.js';
import { gitText } from '../records/git.js';
import { loadRecords, type RecordSet, type StoredRecord } from '../records/store.js';
import { enforcingCopy, fetchHead, jobArgs, pullRequestNumber, reportFlagged } from './job.js';

/** The locked-path rule's answer for one pull request head. */
export interface LockedPaths {
  /** What is locked now; null when nothing is. */
  locked: EffectiveLock | null;
  /** The locked paths the pull request changes. */
  changed: string[];
  /** One line per locked path changed under an amendment approval bound to this head. */
  covered: string[];
  /** One plain-language sentence per failure; empty when the rule holds. */
  failures: string[];
}

/** The newest amendment for `pr` that bound this change at this head and was then revoked. */
function revokedAmendment(
  set: RecordSet,
  pr: number,
  headTree: string,
  path: string,
  after: string | null,
): { amendment: ApprovalRecord; revocation: RevocationRecord } | undefined {
  const revocations = set.records
    .map((s) => s.record)
    .filter((r): r is RevocationRecord => r.recordType === 'revocation');
  return set.records
    .filter(
      (s): s is StoredRecord<ApprovalRecord> =>
        s.record.recordType === 'approval' &&
        s.record.approval.kind === 'amendment' &&
        s.record.approval.pullRequest === pr &&
        s.record.binds.tree === headTree,
    )
    .flatMap((s) => {
      const binding = s.record.binds.files[path];
      if (typeof binding !== 'object' || binding.after !== after) return [];
      const revocation = revocations.find((r) => r.revocation.revokes === s.record.recordId);
      return revocation === undefined ? [] : [{ amendment: s.record, revocation }];
    })
    .at(-1);
}

/**
 * The locked-path rule, the one place lock-guard and gate-check read it from. It fails when main
 * holds locked content the lock and its amendments never approved, or when the pull request
 * changes a locked path without a valid, unrevoked amendment approval bound to its head tree.
 * The caller passes the records set it read, so the caller decides what "now" is; this never
 * reads the records branch itself.
 */
export function checkLockedPaths(
  io: CommandIO,
  set: RecordSet,
  pr: number,
  head: string,
): LockedPaths {
  const locked = effectiveLock(set);
  if (locked === null) return { locked, changed: [], covered: [], failures: [] };

  const failures: string[] = [];
  const main = fetchTrunk(io.cwd, io.remote);
  const mainFiles = filesAt(io.cwd, main);
  const onMain = [...mainFiles.keys()].filter((p) => isLockedBy(locked, p));
  const mainHashes = hashesAt(io.cwd, mainFiles, onMain);
  for (const path of [...new Set([...locked.hashes.keys(), ...onMain])].sort()) {
    const now = mainHashes[path] ?? null;
    if (!(locked.held.get(path) ?? [null]).includes(now)) {
      failures.push(
        `${path} on main ${now === null ? 'is missing, which' : 'holds content that'} neither the lock nor any amendment approved. Main has drifted from the lock, so no pull request passes until that is restored or amended.`,
      );
    }
  }

  const base = gitText(io.cwd, ['merge-base', main, head]);
  const changed = gitText(io.cwd, ['diff', '--name-only', '--no-renames', '-z', base, head])
    .split('\0')
    .filter((p) => p !== '' && isLockedBy(locked, p));
  const headFiles = filesAt(io.cwd, head);
  const headTree = treeOf(io.cwd, head);
  const headHashes = hashesAt(
    io.cwd,
    headFiles,
    changed.filter((p) => headFiles.has(p)),
  );
  const covered: string[] = [];
  for (const path of changed) {
    const after = headHashes[path] ?? null;
    const isCovered = locked.amendments.some((a) => {
      const binding = a.record.binds.files[path];
      return (
        a.record.approval.pullRequest === pr &&
        a.record.binds.tree === headTree &&
        typeof binding === 'object' &&
        binding.after === after
      );
    });
    if (isCovered) {
      covered.push(`${path}: changed under an amendment approval bound to this head.`);
      continue;
    }
    const stale = locked.stale.find(
      (s) => s.path === path && s.amendment.record.approval.pullRequest === pr,
    );
    const revoked = revokedAmendment(set, pr, headTree, path, after);
    failures.push(
      stale !== undefined
        ? `${path} is locked, and amendment ${stale.amendment.record.recordId} for it no longer matches what is locked now (another amendment changed it first). The approver runs "pod-factory approve amendment --pr ${pr} ${path}" again, in a terminal outside any agent session.`
        : revoked !== undefined
          ? `${path} is locked, and amendment ${revoked.amendment.recordId}, which let pull request ${pr} change it, was revoked by ${revoked.revocation.recordId} (reason: ${revoked.revocation.revocation.reason}). The change has no authority now: revert it, or the approver runs "pod-factory approve amendment --pr ${pr} ${path}" for a new amendment, in a terminal outside any agent session.`
          : `${path} is locked, and pull request ${pr} changes it without an amendment approval bound to its head tree ${short(headTree)}. To change it, the approver runs "pod-factory approve amendment --pr ${pr} ${path}" in a terminal outside any agent session.`,
    );
  }
  return { locked, changed, covered, failures };
}

/**
 * `pod-factory ci lock-guard --pr <n> --head <sha>`. Reports the locked-path rule
 * (`checkLockedPaths`) for the pull request's head. gate-check applies the same rule itself, so
 * for merging this check run is advisory. Returns the exit code.
 */
export function lockGuard(argv: string[], io: CommandIO): number {
  const args = jobArgs('lock-guard', argv, ['pr', 'head'], ['pr', 'head']);
  const pr = pullRequestNumber(args.pr as string);
  enforcingCopy(io);
  const set = loadRecords(io.cwd, io.remote);
  const head = fetchHead(io, pr, args.head as string);
  reportFlagged(io, set);
  const { locked, changed, covered, failures } = checkLockedPaths(io, set, pr, head);
  if (locked === null) {
    io.out(
      `lock-guard passes: nothing is locked yet (${set.head === null ? 'the records branch does not exist' : 'no valid lock on the records branch'}).`,
    );
    return 0;
  }
  io.out(
    `Lock ${locked.lock.record.recordId} with ${locked.amendments.length} amendment${locked.amendments.length === 1 ? '' : 's'} applied.`,
  );
  for (const line of covered) io.out(line);
  if (failures.length === 0) {
    io.out(
      `lock-guard passes: pull request ${pr} at ${short(head)} changes ${changed.length === 0 ? 'no locked path' : 'locked paths only under amendments'}.`,
    );
    return 0;
  }
  io.out(`lock-guard fails for pull request ${pr} at ${short(head)}:`);
  for (const failure of failures) io.out(`  ${failure}`);
  return 1;
}
