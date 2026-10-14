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

/** Every valid amendment record, revoked or not, with its revocation if it has one; oldest first. */
function amendmentRecords(
  set: RecordSet,
): { amendment: ApprovalRecord; revocation: RevocationRecord | undefined }[] {
  const revocations = set.records
    .map((s) => s.record)
    .filter((r): r is RevocationRecord => r.recordType === 'revocation');
  return set.records
    .filter(
      (s): s is StoredRecord<ApprovalRecord> =>
        s.record.recordType === 'approval' && s.record.approval.kind === 'amendment',
    )
    .map((s) => ({
      amendment: s.record,
      revocation: revocations.find((r) => r.revocation.revokes === s.record.recordId),
    }));
}

function binding(
  amendment: ApprovalRecord,
  path: string,
): { before: string | null; after: string | null } | undefined {
  const bound = amendment.binds.files[path];
  return typeof bound === 'object' ? bound : undefined;
}

const revokedBy = (revocation: RevocationRecord) =>
  `revoked by ${revocation.recordId} (reason: ${revocation.revocation.reason})`;

/** Why a stale amendment no longer applies, in words: what changed the content it was approved on. */
function staleBecause(
  set: RecordSet,
  locked: EffectiveLock,
  stale: ApprovalRecord,
  path: string,
): string {
  const before = binding(stale, path)?.before ?? null;
  const builtOn = amendmentRecords(set)
    .filter(
      (a) =>
        a.revocation !== undefined &&
        a.amendment.refs.includes(locked.lock.record.recordId) &&
        binding(a.amendment, path)?.after === before,
    )
    .at(-1);
  if (builtOn?.revocation !== undefined) {
    return `was approved on top of amendment ${builtOn.amendment.recordId}, which was ${revokedBy(builtOn.revocation)}, so it no longer matches what is locked now`;
  }
  const first = locked.amendments.find(
    (a) => a.record.recordId !== stale.recordId && binding(a.record, path)?.before === before,
  );
  return first !== undefined
    ? `no longer matches what is locked now: amendment ${first.record.recordId} changed it first`
    : 'was approved against content that is no longer what is locked for it, so it no longer applies';
}

/**
 * The locked-path rule, the one place lock-guard and gate-check read it from (ADR-015). It judges
 * the content a merge would leave on main, path by path:
 * - a locked path the pull request changes passes when its head content is what is locked now,
 *   or when a valid, unrevoked amendment approval bound to this pull request and head approves
 *   exactly that content;
 * - a locked path it leaves alone is what the merge keeps from main, so main's content there must
 *   be one this lock has approved (`held`).
 * The two halves differ on purpose. A changed path checked against `held` would let a pull
 * request restore a superseded locked test without an amendment; an untouched path checked
 * against the current hash would let one approved but unmerged amendment fail every other pull
 * request. Neither half depends on branches being up to date with main.
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
  const base = gitText(io.cwd, ['merge-base', main, head]);
  const changed = gitText(io.cwd, ['diff', '--name-only', '--no-renames', '-z', base, head])
    .split('\0')
    .filter((p) => p !== '' && isLockedBy(locked, p));
  const touched = new Set(changed);

  const mainFiles = filesAt(io.cwd, main);
  const onMain = [...mainFiles.keys()].filter((p) => isLockedBy(locked, p) && !touched.has(p));
  const mainHashes = hashesAt(io.cwd, mainFiles, onMain);
  for (const path of [...new Set([...locked.hashes.keys(), ...onMain])].sort()) {
    if (touched.has(path)) continue;
    const now = mainHashes[path] ?? null;
    if (!(locked.held.get(path) ?? [null]).includes(now)) {
      failures.push(
        `${path} on main ${now === null ? 'is missing, which' : 'holds content that'} neither the lock nor any amendment approved. Main has drifted from the lock, so every pull request that leaves it alone fails until one restores it to what is locked now or an amendment approves what main holds.`,
      );
    }
  }

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
      const bound = binding(a.record, path);
      return (
        a.record.approval.pullRequest === pr &&
        a.record.binds.tree === headTree &&
        bound?.after === after
      );
    });
    if (isCovered) {
      covered.push(`${path}: changed under an amendment approval bound to this head.`);
      continue;
    }
    if (after === (locked.hashes.get(path) ?? null)) {
      covered.push(`${path}: changed to exactly what is locked now, which needs no amendment.`);
      continue;
    }
    const stale = locked.stale.find(
      (s) => s.path === path && s.amendment.record.approval.pullRequest === pr,
    );
    const revoked = amendmentRecords(set)
      .filter(
        (a) =>
          a.revocation !== undefined &&
          a.amendment.approval.pullRequest === pr &&
          a.amendment.binds.tree === headTree &&
          binding(a.amendment, path)?.after === after,
      )
      .at(-1);
    failures.push(
      stale !== undefined
        ? `${path} is locked, and amendment ${stale.amendment.record.recordId} for it ${staleBecause(set, locked, stale.amendment.record, path)}. The approver runs "pod-factory approve amendment --pr ${pr} ${path}" again, which binds the change against what is locked now, in a terminal outside any agent session.`
        : revoked?.revocation !== undefined
          ? `${path} is locked, and amendment ${revoked.amendment.recordId}, which let pull request ${pr} change it, was ${revokedBy(revoked.revocation)}. The change has no authority now: revert it, or the approver runs "pod-factory approve amendment --pr ${pr} ${path}" for a new amendment, in a terminal outside any agent session.`
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
