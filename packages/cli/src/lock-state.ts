import { active, isLock } from './commands/common.js';
import { globToRegExp } from './lock-policy.js';
import type { ApprovalRecord, FactoryRecord, LockRecord } from './records/format.js';
import type { RecordSet, StoredRecord } from './records/store.js';

/** What is locked now: the latest valid lock with every amendment that follows it applied. */
export interface EffectiveLock {
  lock: StoredRecord<LockRecord>;
  patterns: RegExp[];
  /** Each locked path's current hash; null where an amendment deleted it. */
  hashes: Map<string, string | null>;
  /** Every hash each path has held under this lock, the lock's own first; absent is null. */
  held: Map<string, (string | null)[]>;
  /** The amendments applied, oldest first. */
  amendments: StoredRecord<ApprovalRecord>[];
  /** Amendments that name this lock but whose before hashes no longer match, with the path. */
  stale: { amendment: StoredRecord<ApprovalRecord>; path: string }[];
}

const isAmendment = (r: FactoryRecord): r is ApprovalRecord =>
  r.recordType === 'approval' && r.approval.kind === 'amendment';

/**
 * The effective locked hashes, the one place `approve amendment`, lock-guard and the drift check
 * read them from. Start from the latest valid, unrevoked lock; apply each valid, unrevoked
 * amendment that refers to that lock, oldest first, when every before hash it binds matches the
 * current hash. An amendment that does not match is stale and changes nothing. Returns null when
 * nothing is locked.
 */
export function effectiveLock(set: RecordSet): EffectiveLock | null {
  const lock = active(set, isLock).at(-1);
  if (lock === undefined) return null;
  const hashes = new Map<string, string | null>(
    Object.entries(lock.record.binds.files).map(([path, hash]) => [path, hash as string]),
  );
  const held = new Map<string, (string | null)[]>(
    [...hashes].map(([path, hash]) => [path, [hash]]),
  );
  const state: EffectiveLock = {
    lock,
    patterns: lock.record.lock.patterns.map(globToRegExp),
    hashes,
    held,
    amendments: [],
    stale: [],
  };
  for (const amendment of active(set, isAmendment)) {
    if (!amendment.record.refs.includes(lock.record.recordId)) continue;
    const changes = Object.entries(amendment.record.binds.files).map(([path, binding]) => ({
      path,
      ...(binding as { before: string | null; after: string | null }),
    }));
    const mismatch = changes.find((c) => (hashes.get(c.path) ?? null) !== c.before);
    if (mismatch !== undefined) {
      state.stale.push({ amendment, path: mismatch.path });
      continue;
    }
    for (const { path, after } of changes) {
      hashes.set(path, after);
      held.set(path, [...(held.get(path) ?? [null]), after]);
    }
    state.amendments.push(amendment);
  }
  return state;
}

export function isLockedBy(state: EffectiveLock, path: string): boolean {
  return state.patterns.some((re) => re.test(path));
}
