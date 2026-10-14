import { readFileSync } from 'node:fs';
import { currentContext, detectActorKind, type InvocationContext } from '../records/actor.js';
import type { ApprovalRecord, FactoryRecord, LockRecord } from '../records/format.js';
import { resumePendingRecords, type WriteOptions } from '../records/write.js';
import type { KillPointHook } from '../records/killpoint.js';
import type { RecordSet, StoredRecord } from '../records/store.js';

/** Everything a command touches outside its arguments, so tests can script it. */
export interface CommandIO {
  cwd: string;
  ctx: InvocationContext;
  remote: string;
  out(line: string): void;
  err(line: string): void;
  /** Asks the human a question on the terminal and returns the typed line. */
  ask(question: string): Promise<string>;
  /** Everything on standard input, for the hook, which reads one event there. */
  input?(): string;
  /** The defined kill points of a record write (REQ-08); shipped code never sets it. */
  onKillPoint?: KillPointHook;
}

export function processIO(cwd: string, ask: CommandIO['ask']): CommandIO {
  return {
    cwd,
    ctx: currentContext(),
    remote: 'origin',
    out: (line) => process.stdout.write(`${line}\n`),
    err: (line) => process.stderr.write(`${line}\n`),
    ask,
    input: () => readFileSync(0, 'utf8'),
  };
}

/** A command stopped for a reason the human can act on; the message is plain language. */
export class Refusal extends Error {}

/**
 * The approval-path commands run only for a human at an interactive terminal. An approval typed
 * into an agent's shell cannot be told from one the agent runs, so any marker refuses.
 */
export function requireHuman(command: string, ctx: InvocationContext): void {
  const detected = detectActorKind(ctx);
  if (detected.kind === 'human') return;
  if (detected.kind === 'agent') {
    throw new Refusal(
      `${command} refused: ${detected.reason}, so this is an agent session. Only a human approves: run "pod-factory ${command}" from a terminal outside any agent session. Nothing was written.`,
    );
  }
  throw new Refusal(
    `${command} refused: ${detected.reason}. Only a human approves: run "pod-factory ${command}" from an interactive terminal outside any agent session. Nothing was written.`,
  );
}

/** Finishes any record write a killed or failed command left pending, before doing anything new. */
export function finishPendingWrites(io: CommandIO): void {
  for (const landed of resumePendingRecords(io.cwd, writeOptions(io))) {
    io.out(`Finished an earlier pending write: ${landed.path}.`);
  }
}

/** The options every command passes to a record write: its remote, and any kill-point hook. */
export function writeOptions(io: CommandIO): WriteOptions {
  return io.onKillPoint === undefined
    ? { remote: io.remote }
    : { remote: io.remote, onKillPoint: io.onKillPoint };
}

/** IDs revoked by a valid revocation record. */
export function revokedIds(set: RecordSet): Set<string> {
  const revoked = new Set<string>();
  for (const { record } of set.records) {
    if (record.recordType === 'revocation') revoked.add(record.revocation.revokes);
  }
  return revoked;
}

/** Valid, unrevoked records of one kind, oldest first. */
export function active<T extends FactoryRecord>(
  set: RecordSet,
  match: (record: FactoryRecord) => record is T,
): StoredRecord<T>[] {
  const revoked = revokedIds(set);
  return set.records.filter(
    (s): s is StoredRecord<T> => match(s.record) && !revoked.has(s.record.recordId),
  );
}

export const isGate2Approval = (r: FactoryRecord): r is ApprovalRecord =>
  r.recordType === 'approval' && r.approval.kind === 'gate' && r.approval.gate === 2;

export const isLock = (r: FactoryRecord): r is LockRecord => r.recordType === 'lock';

export function short(id: string): string {
  return id.slice(0, 12);
}
