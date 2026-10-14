import { LOCKED_PATTERNS, globToRegExp, testCommandsFor } from '../lock-policy.js';
import { fetchTrunk, filesAt, hashesAt, treeOf, TRUNK } from '../git-tree.js';
import { resolveActor } from '../records/actor.js';
import { recordBase, type LockRecord } from '../records/format.js';
import { loadRecords } from '../records/store.js';
import { writeRecord } from '../records/write.js';
import {
  Refusal,
  active,
  finishPendingWrites,
  isGate2Approval,
  isLock,
  requireHuman,
  short,
  writeOptions,
  type CommandIO,
} from './common.js';

/**
 * `pod-factory lock`. Writes the lock record for the tree the gate-2 approval binds: every file
 * under the locked patterns with its hash, the patterns themselves, and the exact test commands.
 * Returns the exit code.
 */
export function lock(argv: string[], io: CommandIO): number {
  requireHuman('lock', io.ctx);
  if (argv.length > 0) throw new Refusal('Usage: pod-factory lock (it takes no arguments)');
  finishPendingWrites(io);

  const commit = fetchTrunk(io.cwd, io.remote);
  const tree = treeOf(io.cwd, commit);
  const set = loadRecords(io.cwd, io.remote);
  const approval = active(set, isGate2Approval).at(-1);
  if (approval === undefined) {
    throw new Refusal(
      'Lock refused: there is no valid, unrevoked gate-2 approval. Run "pod-factory approve 2" first. Nothing was written.',
    );
  }
  const existing = active(set, isLock).find((l) =>
    l.record.refs.includes(approval.record.recordId),
  );
  if (existing !== undefined) {
    io.out(
      `Already locked: ${existing.path} follows gate-2 approval ${approval.record.recordId}. Nothing was written.`,
    );
    return 0;
  }
  if (approval.record.binds.tree !== tree) {
    throw new Refusal(
      `Lock refused: ${TRUNK} moved after the gate-2 approval (approved tree ${short(approval.record.binds.tree ?? '')}, ${TRUNK} now at commit ${short(commit)} with tree ${short(tree)}). Run "pod-factory approve 2" again so the lock matches what was approved. Nothing was written.`,
    );
  }

  const files = filesAt(io.cwd, commit);
  const patterns = LOCKED_PATTERNS.map(globToRegExp);
  const locked = [...files.keys()].filter((p) => patterns.some((re) => re.test(p))).sort();
  if (locked.length === 0) {
    throw new Refusal(
      `Lock refused: no file on ${TRUNK} matches a locked pattern. Nothing was written.`,
    );
  }
  const testCommands = testCommandsFor(new Set(files.keys()));

  const who = resolveActor(io.cwd, io.ctx);
  if (who.actor === null) throw new Refusal(`Lock refused: ${who.reason}. Nothing was written.`);
  const record: LockRecord = {
    ...recordBase(who.actor),
    recordType: 'lock',
    binds: { tree, files: hashesAt(io.cwd, files, locked) },
    outcome: 'locked',
    refs: [approval.record.recordId],
    lock: { patterns: [...LOCKED_PATTERNS], testCommands },
  };
  const landed = writeRecord(io.cwd, record, 'gate-2', writeOptions(io));
  io.out(
    `Locked ${locked.length} files under ${LOCKED_PATTERNS.length} patterns on ${TRUNK} at commit ${commit}, following gate-2 approval ${approval.record.recordId}.`,
  );
  io.out('Test commands, in order:');
  for (const command of testCommands) io.out(`  ${command}`);
  io.out(`Record ${landed.path} is on the records branch (record ID ${record.recordId}).`);
  return 0;
}
