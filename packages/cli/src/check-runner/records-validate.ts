import { parseArgs } from 'node:util';
import { Refusal, type CommandIO } from '../commands/common.js';
import { RECORDS_BRANCH } from '../records/format.js';
import { loadRecords, type RecordSet } from '../records/store.js';
import { relay } from './relay.js';

/**
 * `pod-factory ci records-validate`. Validates every record on the records branch, each on its
 * own, and names every one that is flagged. It is the alerting job, not a gate: it rejects,
 * rewrites and deletes nothing, and fails only so that a flagged record is seen. Returns the exit
 * code.
 */
export function recordsValidate(argv: string[], io: CommandIO): number {
  const usage = 'Usage: pod-factory ci records-validate [--relay --run-id <id> --run-url <url>]';
  let values;
  try {
    values = parseArgs({
      args: argv,
      options: {
        relay: { type: 'boolean' },
        'run-id': { type: 'string' },
        'run-url': { type: 'string' },
      },
    }).values;
  } catch (error) {
    throw new Refusal(`${(error as Error).message}\n${usage}`);
  }
  if (
    values.relay === true &&
    (values['run-id'] === undefined || values['run-url'] === undefined)
  ) {
    throw new Refusal(`--relay needs --run-id and --run-url.\n${usage}`);
  }
  const validated = validate(io);
  if (values.relay !== true || validated.set === null) return validated.code;
  const relayed = relay(io, validated.set, Number(values['run-id']), values['run-url'] as string);
  return Math.max(validated.code, relayed);
}

function validate(io: CommandIO): { code: number; set: RecordSet | null } {
  const set = loadRecords(io.cwd, io.remote);
  if (set.head === null) {
    io.out(
      `The records branch ${RECORDS_BRANCH} does not exist on ${io.remote}, so there is nothing to validate.`,
    );
    return { code: 0, set: null };
  }
  const valid = set.records.length + set.bootstrap.length;
  io.out(
    `Records branch ${RECORDS_BRANCH} at commit ${set.head}: ${valid} valid ${valid === 1 ? 'record' : 'records'}, ${set.flagged.length} flagged.`,
  );
  if (set.flagged.length === 0) return { code: 0, set };
  io.out('Flagged, and ignored by every check that reads the records branch:');
  for (const flag of set.flagged) io.out(`  ${flag.reason}`);
  io.out(
    'Nothing was changed. A flagged record is never repaired in place; a human writes a new record if one is needed.',
  );
  return { code: 1, set };
}
