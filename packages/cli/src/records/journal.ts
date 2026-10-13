import { createHash } from 'node:crypto';
import {
  closeSync,
  fsyncSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeSync,
} from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { gitText } from './git.js';
import type { KillPointHook } from './killpoint.js';

/**
 * The local journal of record writes. It lives in the repository's common git directory, so it
 * is never committed, never in a working tree, and shared by every worktree of the repository.
 */
export interface JournalEntry {
  recordId: string;
  fileName: string;
  /** SHA-256 of the exact bytes in `content`. */
  sha256: string;
  state: 'pending' | 'landed';
  journaledAt: string;
  landedCommit: string | null;
  content: string;
}

export interface Journal {
  entries: JournalEntry[];
  /** Journal files that could not be read, by name; never used, never repaired. */
  flagged: { path: string; reason: string }[];
}

export function journalDir(cwd: string): string {
  const common = gitText(cwd, ['rev-parse', '--git-common-dir']);
  return join(isAbsolute(common) ? common : join(cwd, common), 'pod-factory', 'journal');
}

export function contentHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/** Writes an entry whole or not at all: a temporary file, flushed, then renamed into place. */
export function writeJournalEntry(
  cwd: string,
  entry: JournalEntry,
  onKillPoint?: KillPointHook,
): void {
  const dir = journalDir(cwd);
  mkdirSync(dir, { recursive: true });
  const final = join(dir, `${entry.recordId}.json`);
  const temporary = `${final}.tmp-${process.pid}`;
  const text = `${JSON.stringify(entry, null, 2)}\n`;
  const fd = openSync(temporary, 'w');
  try {
    const half = Math.floor(text.length / 2);
    writeSync(fd, text.slice(0, half));
    onKillPoint?.('during-journal-write');
    writeSync(fd, text.slice(half));
    fsyncSync(fd);
  } finally {
    closeSync(fd);
  }
  renameSync(temporary, final);
}

function isEntry(value: unknown): value is JournalEntry {
  if (typeof value !== 'object' || value === null) return false;
  const e = value as Record<string, unknown>;
  return (
    typeof e.recordId === 'string' &&
    typeof e.fileName === 'string' &&
    typeof e.content === 'string' &&
    typeof e.sha256 === 'string' &&
    (e.state === 'pending' || e.state === 'landed') &&
    contentHash(e.content) === e.sha256
  );
}

/** Reads every journal entry. Leftover temporary files from a killed write are not entries. */
export function readJournal(cwd: string): Journal {
  const dir = journalDir(cwd);
  const journal: Journal = { entries: [], flagged: [] };
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return journal;
  }
  for (const name of names.filter((n) => n.endsWith('.json')).sort()) {
    const path = join(dir, name);
    try {
      const entry: unknown = JSON.parse(readFileSync(path, 'utf8'));
      if (isEntry(entry)) journal.entries.push(entry);
      else
        journal.flagged.push({
          path,
          reason: `journal entry ${path} is incomplete; it is ignored`,
        });
    } catch {
      journal.flagged.push({
        path,
        reason: `journal entry ${path} is not complete JSON; it is ignored`,
      });
    }
  }
  return journal;
}
