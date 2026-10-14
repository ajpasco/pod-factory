import type { CheckResultRecord, FactoryRecord, RevocationRecord } from './records/format.js';
import type { RecordSet, StoredRecord } from './records/store.js';
import type { BootstrapRecord } from './records/validate.js';

export type RevocationTarget =
  | { kind: 'record'; stored: StoredRecord<FactoryRecord> }
  | { kind: 'bootstrap'; stored: StoredRecord<BootstrapRecord> };

/** The valid record or bootstrap record a revocation names, or null when there is none. */
export function revocationTarget(set: RecordSet, revokes: string): RevocationTarget | null {
  const stored = set.records.find((s) => s.record.recordId === revokes);
  if (stored !== undefined) return { kind: 'record', stored };
  const bootstrap = set.bootstrap.find((s) => s.path.endsWith(`/${revokes}`));
  return bootstrap === undefined ? null : { kind: 'bootstrap', stored: bootstrap };
}

/**
 * The pull request a record lets merge, if any: a story or bootstrap approval's, or a verify
 * result's. Revoking it can block that pull request; revoking anything else blocks none.
 */
export function pullRequestOf(record: FactoryRecord): number | null {
  if (record.recordType === 'approval') return record.approval.pullRequest;
  if (record.recordType === 'check-result') return record.checkResult.pullRequest;
  return null;
}

/**
 * Whether an open pull request at `headTree` relied on `record`: gate-check only ever counts
 * an approval or verify result bound to the head tree, so only then does revoking it block.
 */
export function reliedOn(record: FactoryRecord, pr: number, headTree: string): boolean {
  return pullRequestOf(record) === pr && record.binds.tree === headTree;
}

/** The relay's record that it blocked pull request `pr` at `headTree` for this revocation. */
export function relayRecord(
  set: RecordSet,
  revocation: RevocationRecord,
  pr: number,
  headTree: string,
): StoredRecord<CheckResultRecord> | undefined {
  return set.records.find(
    (s): s is StoredRecord<CheckResultRecord> =>
      s.record.recordType === 'check-result' &&
      s.record.checkResult.check === 'gate-check' &&
      s.record.outcome === 'fail' &&
      s.record.checkResult.pullRequest === pr &&
      s.record.binds.tree === headTree &&
      s.record.refs.includes(revocation.recordId),
  );
}
