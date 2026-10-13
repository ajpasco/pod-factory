import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  RECORDS_BRANCH,
  RECORDS_DIR,
  recordFileName,
  serializeRecord,
  type FactoryRecord,
} from './format.js';
import { git, gitText } from './git.js';
import { contentHash, readJournal, writeJournalEntry, type JournalEntry } from './journal.js';
import type { KillPointHook } from './killpoint.js';
import { fetchRecords, remoteRecordsRef } from './store.js';
import { validateRecord } from './validate.js';

export interface WriteOptions {
  /** The remote holding the records branch; origin by default. */
  remote?: string;
  /** Called at each defined kill point; only the kill-and-resume tests set it. */
  onKillPoint?: KillPointHook;
}

/** How many fetch-and-push rounds a write makes before it stops and leaves the entry pending. */
export const MAX_PUSH_ATTEMPTS = 5;

export interface LandResult {
  recordId: string;
  path: string;
  /** The commit that added the record, or null when a retry found it already on the branch. */
  commit: string | null;
  attempts: number;
  alreadyLanded: boolean;
}

export class RecordWriteError extends Error {}

function journalNote(entry: JournalEntry): string {
  return `Record ${entry.fileName} is saved in the local journal as pending and will be pushed the next time a pod-factory command runs.`;
}

/** Whether the record's ID is already on the branch at `tip`, and if so whether its bytes match. */
function presenceOnTip(
  cwd: string,
  tip: string,
  entry: JournalEntry,
  blob: string,
): 'absent' | 'same' {
  const listing = gitText(cwd, ['ls-tree', '--full-tree', tip, `${RECORDS_DIR}/`]);
  for (const line of listing.split('\n')) {
    const [meta = '', path = ''] = line.split('\t');
    if (!path.endsWith(`-${entry.recordId}.json`)) continue;
    const oid = meta.split(' ')[2];
    if (path === `${RECORDS_DIR}/${entry.fileName}` && oid === blob) return 'same';
    throw new RecordWriteError(
      `Record ID ${entry.recordId} is already on ${RECORDS_BRANCH} as ${path} with different content; nothing was pushed. ${journalNote(entry)}`,
    );
  }
  return 'absent';
}

function commitOnTip(
  cwd: string,
  tip: string,
  entry: JournalEntry,
  blob: string,
  actor: { name: string; email: string },
  createdAt: string,
): string {
  const scratch = mkdtempSync(join(tmpdir(), 'pod-factory-index-'));
  const env = { GIT_INDEX_FILE: join(scratch, 'index') };
  try {
    git(cwd, ['read-tree', tip], { env });
    git(
      cwd,
      ['update-index', '--add', '--cacheinfo', `100644,${blob},${RECORDS_DIR}/${entry.fileName}`],
      { env },
    );
    const tree = gitText(cwd, ['write-tree'], { env });
    return gitText(cwd, ['commit-tree', tree, '-p', tip, '-m', `record: ${entry.fileName}`], {
      env: {
        GIT_AUTHOR_NAME: actor.name,
        GIT_AUTHOR_EMAIL: actor.email,
        GIT_AUTHOR_DATE: createdAt,
        GIT_COMMITTER_NAME: actor.name,
        GIT_COMMITTER_EMAIL: actor.email,
      },
    });
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

/**
 * Pushes one journaled record. Every round fetches first: if the ID is already on the branch the
 * write has succeeded; otherwise the record is committed on the fetched tip and pushed without
 * force. A rejected or uncertain push simply starts the next round.
 */
function land(cwd: string, entry: JournalEntry, options: WriteOptions): LandResult {
  const remote = options.remote ?? 'origin';
  // The journal is a local file: what it holds is validated again before it is pushed.
  const check = validateRecord(entry.fileName, entry.content);
  if (!check.ok) {
    throw new RecordWriteError(
      `Refusing to push journal entry ${entry.recordId}: ${check.reason}. It stays pending and is never pushed.`,
    );
  }
  const parsed = check.record;
  const blob = gitText(cwd, ['hash-object', '-w', '--stdin'], { input: entry.content });
  const path = `${RECORDS_DIR}/${entry.fileName}`;
  let lastProblem = '';
  for (let attempt = 1; attempt <= MAX_PUSH_ATTEMPTS; attempt++) {
    let branchExists: boolean;
    try {
      branchExists = fetchRecords(cwd, remote);
    } catch (error) {
      lastProblem = (error as Error).message;
      continue;
    }
    if (!branchExists) {
      throw new RecordWriteError(
        `The remote "${remote}" has no ${RECORDS_BRANCH} branch, so the record cannot be written there. ${journalNote(entry)}`,
      );
    }
    const tip = gitText(cwd, ['rev-parse', remoteRecordsRef(remote)]);
    if (presenceOnTip(cwd, tip, entry, blob) === 'same') {
      return {
        recordId: entry.recordId,
        path,
        commit: null,
        attempts: attempt,
        alreadyLanded: true,
      };
    }
    const commit = commitOnTip(cwd, tip, entry, blob, parsed.actor, parsed.createdAt);
    options.onKillPoint?.('before-push');
    const push = git(cwd, ['push', '--quiet', remote, `${commit}:refs/heads/${RECORDS_BRANCH}`], {
      allowFail: true,
    });
    options.onKillPoint?.('after-push');
    if (push.status === 0) {
      return { recordId: entry.recordId, path, commit, attempts: attempt, alreadyLanded: false };
    }
    lastProblem = push.stderr.trim();
  }
  throw new RecordWriteError(
    `The record could not be pushed after ${MAX_PUSH_ATTEMPTS} attempts (last problem: ${lastProblem}). ${journalNote(entry)}`,
  );
}

function markLanded(
  cwd: string,
  entry: JournalEntry,
  result: LandResult,
  options: WriteOptions,
): void {
  writeJournalEntry(
    cwd,
    { ...entry, state: 'landed', landedCommit: result.commit },
    options.onKillPoint,
  );
}

/**
 * Writes one record to the records branch. The record is validated first and never written if
 * invalid; its bytes and ID are journaled before the first push, so a killed or failed write
 * resumes with the same ID through {@link resumePendingRecords}.
 */
export function writeRecord(
  cwd: string,
  record: FactoryRecord,
  subject: string,
  options: WriteOptions = {},
): LandResult {
  const fileName = recordFileName(record, subject);
  const content = serializeRecord(record);
  const check = validateRecord(fileName, content);
  if (!check.ok)
    throw new RecordWriteError(`Refusing to write an invalid record: ${check.reason}.`);
  const entry: JournalEntry = {
    recordId: record.recordId,
    fileName,
    sha256: contentHash(content),
    state: 'pending',
    journaledAt: new Date().toISOString(),
    landedCommit: null,
    content,
  };
  writeJournalEntry(cwd, entry, options.onKillPoint);
  options.onKillPoint?.('after-journal');
  const result = land(cwd, entry, options);
  markLanded(cwd, entry, result, options);
  options.onKillPoint?.('after-record-write');
  return result;
}

/** Finishes every write the journal still holds as pending, with the IDs they were given. */
export function resumePendingRecords(cwd: string, options: WriteOptions = {}): LandResult[] {
  const results: LandResult[] = [];
  for (const entry of readJournal(cwd).entries) {
    if (entry.state !== 'pending') continue;
    const result = land(cwd, entry, options);
    markLanded(cwd, entry, result, options);
    results.push(result);
  }
  return results;
}
