import { BOOTSTRAP_HASH_ALGORITHM, HASH_ALGORITHM } from './hash.js';
import {
  ACTOR_KEYS,
  ACTOR_KINDS,
  AMENDMENT_BINDING_KEYS,
  BINDS_KEYS,
  BLOCK_KEY,
  BLOCK_KEYS,
  CHECKS,
  COMMON_KEYS,
  HANDOFF_NOTE_KEYS,
  LEASE_KEYS,
  BOOTSTRAP_FILE_PATTERN,
  RECORD_FILE_PATTERN,
  RECORD_TYPES,
  SCHEMA_VERSION,
  STAGES,
  compactTimestamp,
  serializeRecord,
  type ActorKind,
  type FactoryRecord,
  type RecordType,
} from './format.js';

/** A bootstrap record as written by hand before the approval path existed (schema bootstrap-0). */
export interface BootstrapRecord {
  schemaVersion: 'bootstrap-0';
  recordType: 'approval' | 'amendment' | 'classification';
  factoryVersion: string;
  hashAlgorithm: typeof BOOTSTRAP_HASH_ALGORITHM;
  binds: Record<string, unknown>;
  outcome: 'approved';
  [field: string]: unknown;
}

export type Validation<T> = { ok: true; record: T } | { ok: false; reason: string };

/** Which actor kinds may write each record type. */
export const WRITER_RULE: Record<RecordType, readonly ActorKind[]> = {
  approval: ['human'],
  lock: ['human'],
  revocation: ['human'],
  transition: ['human', 'agent'],
  'check-result': ['check-runner'],
};

const OUTCOMES: Record<RecordType, readonly string[]> = {
  approval: ['approved'],
  lock: ['locked'],
  revocation: ['revoked'],
  transition: STAGES,
  'check-result': ['pass', 'fail'],
};

const SHA256 = /^[0-9a-f]{64}$/;
const GIT_OID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const RECORD_ID = /^[0-9a-f]{12}$/;
const UTC_SECONDS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const STORY = /^story-[0-9]+$/;

/** Thrown inside a check; carries the plain-language reason. */
class Invalid extends Error {}

function fail(reason: string): never {
  throw new Invalid(reason);
}

type Obj = Record<string, unknown>;

function isObject(value: unknown): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function object(value: unknown, field: string): Obj {
  if (!isObject(value)) fail(`field "${field}" must be an object`);
  return value;
}

/** The object has exactly these keys; missing ones are named first. */
function exactKeys(value: Obj, keys: readonly string[], where: string): void {
  for (const key of keys) {
    if (!(key in value)) fail(`missing field "${where}${key}"`);
  }
  for (const key of Object.keys(value)) {
    if (!keys.includes(key)) fail(`unexpected field "${where}${key}"`);
  }
}

function text(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(`field "${field}" must be non-empty text`);
  }
  return value;
}

function matching(value: unknown, pattern: RegExp, field: string, what: string): string {
  if (typeof value !== 'string' || !pattern.test(value)) fail(`field "${field}" must be ${what}`);
  return value;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], field: string): T {
  if (typeof value !== 'string' || !(allowed as readonly string[]).includes(value)) {
    fail(`field "${field}" must be one of ${allowed.join(', ')}`);
  }
  return value as T;
}

function positiveInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    fail(`field "${field}" must be a positive whole number`);
  }
  return value;
}

function utcTime(value: unknown, field: string): string {
  const s = matching(value, UTC_SECONDS, field, 'a UTC time like 2026-10-13T18:15:02Z');
  if (Number.isNaN(Date.parse(s))) fail(`field "${field}" is not a real date`);
  return s;
}

function relativePath(value: string, field: string): void {
  const parts = value.split('/');
  if (value.startsWith('/') || parts.includes('..') || parts.includes('') || value.includes('\\')) {
    fail(`field "${field}" names "${value}", which is not a plain path inside the repository`);
  }
}

function nullableSha(value: unknown, field: string): void {
  if (value !== null) matching(value, SHA256, field, 'a SHA-256 hash in lowercase hex, or null');
}

function decode(bytes: Uint8Array | string): string {
  if (typeof bytes === 'string') return bytes;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    fail('is not valid UTF-8');
  }
}

function parse(raw: string): Obj {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    fail('is not complete JSON, so it may be half-written');
  }
  if (!isObject(parsed)) fail('is not a JSON object');
  return parsed;
}

function checkSchemaVersion(value: unknown): void {
  if (value === undefined) fail('missing field "schemaVersion"');
  if (typeof value === 'number' && Number.isInteger(value) && value > SCHEMA_VERSION) {
    fail(
      `uses schema ${value}, which is newer than this pod-factory reads (schema ${SCHEMA_VERSION}); upgrade pod-factory to read it`,
    );
  }
  if (value !== SCHEMA_VERSION) fail(`has an unknown schema version ${JSON.stringify(value)}`);
}

function checkHashAlgorithm(value: unknown): void {
  if (value === undefined) fail('missing field "hashAlgorithm"');
  if (value !== HASH_ALGORITHM) {
    fail(
      `names the hash algorithm ${JSON.stringify(value)}, which this pod-factory does not know (it knows "${HASH_ALGORITHM}")`,
    );
  }
}

function checkBinds(value: unknown, type: RecordType, amendment: boolean): void {
  const binds = object(value, 'binds');
  exactKeys(binds, BINDS_KEYS, 'binds.');
  if (binds.tree !== null) {
    matching(binds.tree, GIT_OID, 'binds.tree', 'a git tree ID, or null');
  }
  const files = object(binds.files, 'binds.files');
  const paths = Object.keys(files);
  const sorted = [...paths].sort();
  if (paths.some((p, i) => p !== sorted[i])) fail('field "binds.files" is not in path order');
  for (const path of paths) {
    const field = `binds.files.${path}`;
    relativePath(path, field);
    const binding = files[path];
    if (amendment) {
      const pair = object(binding, field);
      exactKeys(pair, AMENDMENT_BINDING_KEYS, `${field}.`);
      nullableSha(pair.before, `${field}.before`);
      nullableSha(pair.after, `${field}.after`);
      if (pair.before === null && pair.after === null) {
        fail(`field "${field}" must have a hash before or after`);
      }
    } else {
      matching(binding, SHA256, field, `a SHA-256 hash in lowercase hex (${type} records)`);
    }
  }
}

function checkApproval(record: Obj, block: Obj): void {
  const kind = oneOf(block.kind, ['gate', 'story', 'bootstrap', 'amendment'], 'approval.kind');
  const binds = record.binds as { tree: unknown; files: Obj };
  if (kind === 'gate') {
    positiveInteger(block.gate, 'approval.gate');
    if ((block.gate as number) > 5) fail('field "approval.gate" must be a gate from 1 to 5');
  } else if (block.gate !== null) {
    fail(`field "approval.gate" must be null for a ${kind} approval`);
  }
  if (kind === 'story') matching(block.story, STORY, 'approval.story', 'a story like story-1');
  else if (block.story !== null) fail(`field "approval.story" must be null for a ${kind} approval`);
  if (kind === 'bootstrap') positiveInteger(block.pullRequest, 'approval.pullRequest');
  else if (block.pullRequest !== null) positiveInteger(block.pullRequest, 'approval.pullRequest');
  if ((kind === 'story' || kind === 'bootstrap') && binds.tree === null) {
    fail(`a ${kind} approval must bind a head tree in "binds.tree"`);
  }
  if (Object.keys(binds.files).length === 0 && binds.tree === null) {
    fail('an approval must bind a tree or at least one file');
  }
  const shown = matching(block.shownHash, SHA256, 'approval.shownHash', 'a SHA-256 hash');
  const typed = matching(block.typedPrefix, /^[0-9a-f]{8}$/, 'approval.typedPrefix', '8 hex');
  if (!shown.startsWith(typed)) {
    fail(
      'field "approval.typedPrefix" does not match the first eight characters of the hash shown',
    );
  }
  text(block.statement, 'approval.statement');
}

function textList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length === 0)
    fail(`field "${field}" must be a non-empty list`);
  value.forEach((item, i) => text(item, `${field}.${i}`));
  return value as string[];
}

function checkLock(record: Obj, block: Obj): void {
  const patterns = textList(block.patterns, 'lock.patterns');
  patterns.forEach((pattern, i) => relativePath(pattern, `lock.patterns.${i}`));
  if (new Set(patterns).size !== patterns.length) fail('field "lock.patterns" repeats a pattern');
  textList(block.testCommands, 'lock.testCommands');
  const binds = record.binds as { tree: unknown; files: Obj };
  if (binds.tree === null) fail('a lock must bind the approved tree in "binds.tree"');
  if (Object.keys(binds.files).length === 0) fail('a lock must list at least one locked path');
  if ((record.refs as unknown[]).length === 0) {
    fail('a lock must refer to the gate-2 approval it follows in "refs"');
  }
}

function checkRevocation(record: Obj, block: Obj): void {
  const revokes = block.revokes;
  if (
    typeof revokes !== 'string' ||
    !(RECORD_ID.test(revokes) || BOOTSTRAP_FILE_PATTERN.test(revokes))
  ) {
    fail('field "revocation.revokes" must be a record ID or a bootstrap record\'s file name');
  }
  if (!(record.refs as unknown[]).includes(revokes)) {
    fail('field "refs" must include the record named in "revocation.revokes"');
  }
  text(block.reason, 'revocation.reason');
}

function checkTransition(record: Obj, block: Obj): void {
  matching(block.story, STORY, 'transition.story', 'a story like story-1');
  oneOf(block.from, STAGES, 'transition.from');
  const to = oneOf(block.to, STAGES, 'transition.to');
  if (record.outcome !== to) fail('field "outcome" must equal "transition.to"');
  if (to === 'in-progress') {
    const lease = object(block.lease, 'transition.lease');
    exactKeys(lease, LEASE_KEYS, 'transition.lease.');
    text(lease.holder, 'transition.lease.holder');
    utcTime(lease.expiresAt, 'transition.lease.expiresAt');
  } else if (block.lease !== null) {
    fail('field "transition.lease" must be null unless the story moves to in-progress');
  }
  if (to === 'verifying') {
    const note = object(block.handoffNote, 'transition.handoffNote');
    exactKeys(note, HANDOFF_NOTE_KEYS, 'transition.handoffNote.');
    relativePath(text(note.path, 'transition.handoffNote.path'), 'transition.handoffNote.path');
    matching(note.sha256, SHA256, 'transition.handoffNote.sha256', 'a SHA-256 hash');
  } else if (block.handoffNote !== null) {
    fail('field "transition.handoffNote" must be null unless the story moves to verifying');
  }
}

function checkCheckResult(record: Obj, block: Obj): void {
  const check = oneOf(block.check, CHECKS, 'checkResult.check');
  if (block.pullRequest !== null) positiveInteger(block.pullRequest, 'checkResult.pullRequest');
  positiveInteger(block.runId, 'checkResult.runId');
  matching(block.runUrl, /^https:\/\/\S+$/, 'checkResult.runUrl', 'an https link to the run');
  if (check === 'verify') {
    matching(
      block.bundleManifestSha256,
      SHA256,
      'checkResult.bundleManifestSha256',
      "the evidence bundle manifest's SHA-256 for a verify result",
    );
  } else {
    nullableSha(block.bundleManifestSha256, 'checkResult.bundleManifestSha256');
  }
  if ((record.binds as { tree: unknown }).tree === null) {
    fail('a check result must bind the tree it checked in "binds.tree"');
  }
}

const BLOCK_CHECKS: Record<RecordType, (record: Obj, block: Obj) => void> = {
  approval: checkApproval,
  lock: checkLock,
  revocation: checkRevocation,
  transition: checkTransition,
  'check-result': checkCheckResult,
};

function validateSchema1(fileName: string, raw: string): FactoryRecord {
  const record = parse(raw);
  checkSchemaVersion(record.schemaVersion);
  const type = oneOf(record.recordType, RECORD_TYPES, 'recordType');
  const blockKey = BLOCK_KEY[type];
  exactKeys(record, [...COMMON_KEYS, blockKey], '');
  checkHashAlgorithm(record.hashAlgorithm);
  const id = matching(record.recordId, RECORD_ID, 'recordId', '12 lowercase hex characters');
  text(record.factoryVersion, 'factoryVersion');
  const createdAt = utcTime(record.createdAt, 'createdAt');

  const actor = object(record.actor, 'actor');
  exactKeys(actor, ACTOR_KEYS, 'actor.');
  text(actor.name, 'actor.name');
  text(actor.email, 'actor.email');
  const kind = oneOf(actor.kind, ACTOR_KINDS, 'actor.kind');
  if (!WRITER_RULE[type].includes(kind)) {
    fail(
      `was written by actor kind ${kind}, but only ${WRITER_RULE[type].join(' or ')} may write ${type} records`,
    );
  }

  const block = object(record[blockKey], blockKey);
  exactKeys(block, BLOCK_KEYS[type], `${blockKey}.`);
  checkBinds(record.binds, type, type === 'approval' && block.kind === 'amendment');
  oneOf(record.outcome, OUTCOMES[type], 'outcome');
  if (!Array.isArray(record.refs)) fail('field "refs" must be a list of record IDs');
  record.refs.forEach((ref, i) => {
    if (typeof ref !== 'string' || !(RECORD_ID.test(ref) || BOOTSTRAP_FILE_PATTERN.test(ref))) {
      fail(`field "refs.${i}" must be a record ID or a bootstrap record's file name`);
    }
  });
  BLOCK_CHECKS[type](record, block);

  const name = RECORD_FILE_PATTERN.exec(fileName);
  if (name === null)
    fail('has a file name that does not follow <timestamp>-<type>-<subject>-<id>.json');
  if (name[1] !== compactTimestamp(createdAt))
    fail('has a file name timestamp that differs from "createdAt"');
  if (name[2] !== type) fail('has a file name type that differs from "recordType"');
  if (name[4] !== id) fail('has a file name ID that differs from "recordId"');

  const typed = record as unknown as FactoryRecord;
  if (serializeRecord(typed) !== raw) {
    fail('is not byte-for-byte in the fixed record format, so it was edited outside pod-factory');
  }
  return typed;
}

function baseName(path: string): string {
  return path.slice(path.lastIndexOf('/') + 1);
}

/**
 * Validates one schema-1 record file: format, writer rule for its type and hashes.
 * Never throws for a bad record; the reason names the file.
 */
export function validateRecord(
  path: string,
  bytes: Uint8Array | string,
): Validation<FactoryRecord> {
  try {
    return { ok: true, record: validateSchema1(baseName(path), decode(bytes)) };
  } catch (error) {
    if (error instanceof Invalid) return { ok: false, reason: `${path} ${error.message}` };
    throw error;
  }
}

function validateBootstrap0(fileName: string, raw: string): BootstrapRecord {
  if (!BOOTSTRAP_FILE_PATTERN.test(fileName)) {
    fail('has a file name that does not follow the bootstrap form NNNN-<subject>.json');
  }
  const record = parse(raw);
  if (record.schemaVersion !== 'bootstrap-0') {
    if (record.schemaVersion === undefined) fail('missing field "schemaVersion"');
    fail(`has schema ${JSON.stringify(record.schemaVersion)} where bootstrap-0 was expected`);
  }
  oneOf(record.recordType, ['approval', 'amendment', 'classification'], 'recordType');
  if (record.factoryVersion === undefined) fail('missing field "factoryVersion"');
  text(record.factoryVersion, 'factoryVersion');
  if (record.hashAlgorithm === undefined) fail('missing field "hashAlgorithm"');
  if (record.hashAlgorithm !== BOOTSTRAP_HASH_ALGORITHM) {
    fail(
      `names the hash algorithm ${JSON.stringify(record.hashAlgorithm)}, which this pod-factory does not know for bootstrap records`,
    );
  }
  // Record 0001 predates the common field names and says approvedAt and approver.
  const time = record.createdAt ?? record.approvedAt;
  if (typeof time !== 'string' || Number.isNaN(Date.parse(time))) {
    fail('missing a valid "createdAt" (or "approvedAt")');
  }
  const actor = object(record.actor ?? record.approver, 'actor');
  text(actor.name, 'actor.name');
  text(actor.email, 'actor.email');
  if (actor.kind !== undefined && actor.kind !== 'human') {
    fail('is a bootstrap record whose actor is not human');
  }
  object(record.binds, 'binds');
  oneOf(record.outcome, ['approved'], 'outcome');
  return record as BootstrapRecord;
}

/** Validates one bootstrap record (schema bootstrap-0); hand-written, so byte layout is not checked. */
export function validateBootstrapRecord(
  path: string,
  bytes: Uint8Array | string,
): Validation<BootstrapRecord> {
  try {
    return { ok: true, record: validateBootstrap0(baseName(path), decode(bytes)) };
  } catch (error) {
    if (error instanceof Invalid) return { ok: false, reason: `${path} ${error.message}` };
    throw error;
  }
}
