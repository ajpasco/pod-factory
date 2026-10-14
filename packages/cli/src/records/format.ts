import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { HASH_ALGORITHM, hashText } from './hash.js';

export const SCHEMA_VERSION = 1;
export const RECORDS_BRANCH = 'pod-factory/records';
export const RECORDS_DIR = 'records';
export const BOOTSTRAP_DIR = 'records/bootstrap';

export const RECORD_TYPES = [
  'approval',
  'lock',
  'revocation',
  'transition',
  'check-result',
] as const;
export type RecordType = (typeof RECORD_TYPES)[number];

export const ACTOR_KINDS = ['human', 'check-runner', 'agent'] as const;
export type ActorKind = (typeof ACTOR_KINDS)[number];

export const STAGES = ['ready', 'in-progress', 'verifying', 'done'] as const;
export type Stage = (typeof STAGES)[number];

export const CHECKS = ['verify', 'lock-guard', 'gate-check'] as const;
export type CheckName = (typeof CHECKS)[number];

export interface Actor {
  name: string;
  email: string;
  kind: ActorKind;
}

/** A path's hash, or for an amendment its hash before and after (null where the file is absent). */
export type FileBinding = string | { before: string | null; after: string | null };

export interface Binds {
  /** Git tree ID of the bound commit, in the repository's own object format. */
  tree: string | null;
  files: Record<string, FileBinding>;
}

interface RecordBase {
  schemaVersion: typeof SCHEMA_VERSION;
  recordId: string;
  factoryVersion: string;
  hashAlgorithm: typeof HASH_ALGORITHM;
  createdAt: string;
  actor: Actor;
  binds: Binds;
  refs: string[];
}

export interface ApprovalBlock {
  kind: 'gate' | 'story' | 'bootstrap' | 'amendment';
  gate: number | null;
  story: string | null;
  pullRequest: number | null;
  shownHash: string;
  typedPrefix: string;
  statement: string;
}

export interface ApprovalRecord extends RecordBase {
  recordType: 'approval';
  outcome: 'approved';
  approval: ApprovalBlock;
}

export interface LockBlock {
  /** The locked path patterns; a file added under one is a change to a locked path. */
  patterns: string[];
  /** The exact test commands, in order, starting with the install line. */
  testCommands: string[];
}

export interface LockRecord extends RecordBase {
  recordType: 'lock';
  outcome: 'locked';
  lock: LockBlock;
}

export interface RevocationRecord extends RecordBase {
  recordType: 'revocation';
  outcome: 'revoked';
  revocation: { revokes: string; reason: string };
}

export interface TransitionBlock {
  story: string;
  from: Stage;
  to: Stage;
  lease: { holder: string; expiresAt: string } | null;
  handoffNote: { path: string; sha256: string } | null;
}

export interface TransitionRecord extends RecordBase {
  recordType: 'transition';
  outcome: Stage;
  transition: TransitionBlock;
}

export interface CheckResultBlock {
  check: CheckName;
  pullRequest: number | null;
  runId: number;
  runUrl: string;
  bundleManifestSha256: string | null;
}

export interface CheckResultRecord extends RecordBase {
  recordType: 'check-result';
  outcome: 'pass' | 'fail';
  checkResult: CheckResultBlock;
}

export type FactoryRecord =
  ApprovalRecord | LockRecord | RevocationRecord | TransitionRecord | CheckResultRecord;

/** The field holding each type's own block. */
export const BLOCK_KEY = {
  approval: 'approval',
  lock: 'lock',
  revocation: 'revocation',
  transition: 'transition',
  'check-result': 'checkResult',
} as const satisfies Record<RecordType, string>;

/** Field order every schema-1 record is written in, before its type block. */
export const COMMON_KEYS = [
  'schemaVersion',
  'recordType',
  'recordId',
  'factoryVersion',
  'hashAlgorithm',
  'createdAt',
  'actor',
  'binds',
  'outcome',
  'refs',
] as const;

export const BLOCK_KEYS = {
  approval: ['kind', 'gate', 'story', 'pullRequest', 'shownHash', 'typedPrefix', 'statement'],
  lock: ['patterns', 'testCommands'],
  revocation: ['revokes', 'reason'],
  transition: ['story', 'from', 'to', 'lease', 'handoffNote'],
  'check-result': ['check', 'pullRequest', 'runId', 'runUrl', 'bundleManifestSha256'],
} as const satisfies Record<RecordType, readonly string[]>;

export const ACTOR_KEYS = ['name', 'email', 'kind'] as const;
export const BINDS_KEYS = ['tree', 'files'] as const;
export const AMENDMENT_BINDING_KEYS = ['before', 'after'] as const;
export const LEASE_KEYS = ['holder', 'expiresAt'] as const;
export const HANDOFF_NOTE_KEYS = ['path', 'sha256'] as const;

export const FACTORY_VERSION: string = (
  JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
    version: string;
  }
).version;

/** Twelve lowercase hex characters, generated once per command invocation. */
export function newRecordId(): string {
  return randomBytes(6).toString('hex');
}

/** UTC at whole-second precision, e.g. 2026-10-13T18:15:02Z. */
export function utcNow(now: Date = new Date()): string {
  return now.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

/** 2026-10-13T18:15:02Z becomes 20261013T181502Z. */
export function compactTimestamp(createdAt: string): string {
  return createdAt.replace(/[-:]/g, '');
}

/** A bootstrap record's file name under records/bootstrap/, e.g. 0001-gate-1-approval-prd-0.9.json. */
export const BOOTSTRAP_FILE_PATTERN = /^\d{4}-[a-z0-9][a-z0-9.-]*\.json$/;

export const SUBJECT_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const RECORD_FILE_PATTERN = new RegExp(
  `^(\\d{8}T\\d{6}Z)-(${RECORD_TYPES.join('|')})-([a-z0-9]+(?:-[a-z0-9]+)*)-([0-9a-f]{12})\\.json$`,
);

export function recordFileName(record: FactoryRecord, subject: string): string {
  if (!SUBJECT_PATTERN.test(subject)) {
    throw new Error(
      `The record subject "${subject}" can only use lowercase letters, digits and single hyphens.`,
    );
  }
  return `${compactTimestamp(record.createdAt)}-${record.recordType}-${subject}-${record.recordId}.json`;
}

/** The fields every new record shares; the caller adds binds, outcome, refs and its block. */
export function recordBase(actor: Actor, now: Date = new Date()) {
  return {
    schemaVersion: SCHEMA_VERSION,
    recordId: newRecordId(),
    factoryVersion: FACTORY_VERSION,
    hashAlgorithm: HASH_ALGORITHM,
    createdAt: utcNow(now),
    actor,
  } as const;
}

function pick(source: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of keys) out[key] = source[key];
  return out;
}

function canonicalFiles(files: Record<string, FileBinding>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const path of Object.keys(files).sort()) {
    const value = files[path] as FileBinding;
    out[path] = typeof value === 'string' ? value : pick(value, AMENDMENT_BINDING_KEYS);
  }
  return out;
}

/** Rebuilds a record with every key in its fixed order. */
export function canonicalize(record: FactoryRecord): Record<string, unknown> {
  const r = record as unknown as Record<string, unknown>;
  const out = pick(r, COMMON_KEYS);
  out.actor = pick(record.actor as unknown as Record<string, unknown>, ACTOR_KEYS);
  out.binds = { tree: record.binds.tree, files: canonicalFiles(record.binds.files) };
  out.refs = [...record.refs];
  const blockKey = BLOCK_KEY[record.recordType];
  const block = pick(r[blockKey] as Record<string, unknown>, BLOCK_KEYS[record.recordType]);
  if (record.recordType === 'transition') {
    const t = record.transition;
    block.lease = t.lease === null ? null : pick(t.lease, LEASE_KEYS);
    block.handoffNote = t.handoffNote === null ? null : pick(t.handoffNote, HANDOFF_NOTE_KEYS);
  }
  out[blockKey] = block;
  return out;
}

/** The exact bytes a record is stored as: two-space JSON in fixed key order, LF, final newline. */
export function serializeRecord(record: FactoryRecord): string {
  return `${JSON.stringify(canonicalize(record), null, 2)}\n`;
}

/**
 * The single hash `approve` shows: SHA-256 over everything it printed above the hash, in canonical
 * form: the statement, the bound tree and files, and the records the approval refers to.
 */
export function shownHashOf(shown: { statement: string; binds: Binds; refs: string[] }): string {
  const files: Record<string, FileBinding> = {};
  for (const path of Object.keys(shown.binds.files).sort()) {
    const value = shown.binds.files[path] as FileBinding;
    files[path] = typeof value === 'string' ? value : { before: value.before, after: value.after };
  }
  return hashText(
    JSON.stringify({ statement: shown.statement, tree: shown.binds.tree, files, refs: shown.refs }),
  );
}
