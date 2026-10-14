import { Refusal, type CommandIO } from '../commands/common.js';
import { RECORDS_BRANCH } from '../records/format.js';
import { loadRecords } from '../records/store.js';

/**
 * `pod-factory ci records-validate`. Validates every record on the records branch, each on its
 * own, and names every one that is flagged. It is the alerting job, not a gate: it rejects,
 * rewrites and deletes nothing, and fails only so that a flagged record is seen. Returns the exit
 * code.
 */
export function recordsValidate(argv: string[], io: CommandIO): number {
  if (argv.length > 0) {
    throw new Refusal('Usage: pod-factory ci records-validate (it takes no arguments)');
  }
  const set = loadRecords(io.cwd, io.remote);
  if (set.head === null) {
    io.out(
      `The records branch ${RECORDS_BRANCH} does not exist on ${io.remote}, so there is nothing to validate.`,
    );
    return 0;
  }
  const valid = set.records.length + set.bootstrap.length;
  io.out(
    `Records branch ${RECORDS_BRANCH} at commit ${set.head}: ${valid} valid ${valid === 1 ? 'record' : 'records'}, ${set.flagged.length} flagged.`,
  );
  if (set.flagged.length === 0) return 0;
  io.out('Flagged, and ignored by every check that reads the records branch:');
  for (const flag of set.flagged) io.out(`  ${flag.reason}`);
  io.out(
    'Nothing was changed. A flagged record is never repaired in place; a human writes a new record if one is needed.',
  );
  return 1;
}
