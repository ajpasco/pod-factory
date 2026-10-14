import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { BOOTSTRAP_DIR, RECORDS_BRANCH, RECORDS_DIR, type FactoryRecord } from './format.js';
import { CHECK_RUNNER_IDENTITY } from './actor.js';
import { git, gitText, readBlobs } from './git.js';
import { validateBootstrapRecord, validateRecord, type BootstrapRecord } from './validate.js';

export interface StoredRecord<T> {
  path: string;
  /** The commit that first added this file. */
  commit: string;
  record: T;
}

export interface FlaggedRecord {
  path: string;
  reason: string;
}

export interface RecordSet {
  /** The commit read, or null when the records branch does not exist. */
  head: string | null;
  records: StoredRecord<FactoryRecord>[];
  bootstrap: StoredRecord<BootstrapRecord>[];
  /** Everything ignored or worth a human's attention, each with a plain-language reason. */
  flagged: FlaggedRecord[];
}

/** The local ref a records branch on `remote` is fetched into. */
export function remoteRecordsRef(remote: string): string {
  return `refs/remotes/${remote}/${RECORDS_BRANCH}`;
}

/**
 * The records branch cannot be read safely. Every consumer stops with this message; nothing is
 * treated as approved.
 */
export class RecordsReadError extends Error {}

/**
 * Fetches the records branch from `remote` with its full history, so the commit that first added
 * each record can be read even in a shallow clone (the default in GitHub Actions). Returns false
 * when the remote has no records branch; throws when the remote cannot be reached.
 */
export function fetchRecords(cwd: string, remote = 'origin'): boolean {
  const heads = gitText(cwd, ['ls-remote', '--heads', remote, `refs/heads/${RECORDS_BRANCH}`]);
  if (heads === '') return false;
  const shallow = gitText(cwd, ['rev-parse', '--is-shallow-repository']) === 'true';
  git(cwd, [
    'fetch',
    '--quiet',
    '--no-tags',
    // git's own spelling of "all of it": deepens a shallow clone's copy of this branch only.
    ...(shallow ? ['--depth=2147483647'] : []),
    remote,
    `+refs/heads/${RECORDS_BRANCH}:${remoteRecordsRef(remote)}`,
  ]);
  return true;
}

/** The first commit on `head`'s history that a shallow clone cut off, or null when it is whole. */
function cutAt(cwd: string, head: string): string | null {
  const file = gitText(cwd, ['rev-parse', '--git-path', 'shallow']);
  const path = isAbsolute(file) ? file : join(cwd, file);
  if (!existsSync(path)) return null;
  const cut = new Set(
    readFileSync(path, 'utf8')
      .split('\n')
      .filter((l) => l !== ''),
  );
  if (cut.size === 0) return null;
  return (
    gitText(cwd, ['rev-list', head])
      .split('\n')
      .find((c) => cut.has(c)) ?? null
  );
}

interface FirstAdded {
  blob: string;
  commit: string;
}

interface Change {
  status: string;
  blob: string;
  path: string;
}

function short(commit: string): string {
  return commit.slice(0, 12);
}

/** Every commit on the first-parent line, oldest first, with the files it changed. */
function history(cwd: string, head: string): { commit: string; changes: Change[] }[] {
  const out = gitText(cwd, [
    'log',
    '--first-parent',
    '--reverse',
    '--root',
    '--raw',
    '--no-renames',
    '--no-abbrev',
    '--format=commit %H',
    head,
  ]);
  const commits: { commit: string; changes: Change[] }[] = [];
  for (const line of out.split('\n')) {
    if (line.startsWith('commit ')) {
      commits.push({ commit: line.slice('commit '.length), changes: [] });
    } else if (line.startsWith(':')) {
      // :<old mode> <new mode> <old blob> <new blob> <status>\t<path>
      const [meta = '', path = ''] = line.split('\t');
      const fields = meta.split(' ');
      commits.at(-1)?.changes.push({
        status: (fields[4] ?? '').charAt(0),
        blob: fields[3] ?? '',
        path,
      });
    }
  }
  return commits;
}

/** The committer email of every commit on `head`'s history. */
function committers(cwd: string, head: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of gitText(cwd, ['log', '--format=%H %ce', head]).split('\n')) {
    const [commit = '', email = ''] = line.split(' ');
    if (commit !== '') map.set(commit, email);
  }
  return map;
}

/**
 * The writer check at commit level (TECH-SPEC section 4): a human record pushed by the Actions
 * bot, or a check result pushed by anyone else, is flagged. Returns the reason, or null.
 */
function wrongCommitter(
  path: string,
  type: string,
  commit: string,
  committer: string | undefined,
): string | null {
  if (committer === undefined) {
    return `${path} was added in commit ${short(commit)}, whose committer cannot be read, so who wrote it cannot be checked; it is ignored`;
  }
  const byBot = committer === CHECK_RUNNER_IDENTITY.email;
  if (type === 'check-result' && !byBot) {
    return `${path} is a check result committed by ${committer}, not by the check runner ${CHECK_RUNNER_IDENTITY.email}; only CI writes check results, so it is ignored`;
  }
  if ((type === 'approval' || type === 'lock' || type === 'revocation') && byBot) {
    return `${path} is a human ${type} record committed by the check runner ${CHECK_RUNNER_IDENTITY.email}; a human record must be pushed by a human, so it is ignored`;
  }
  return null;
}

function isRecordPath(path: string): boolean {
  return path.startsWith(`${RECORDS_DIR}/`);
}

function isBootstrapPath(path: string): boolean {
  return path.startsWith(`${BOOTSTRAP_DIR}/`);
}

/**
 * Reads every record on the records branch at `ref` and validates each one on its own.
 *
 * A record counts as the content it had when its file was first added. A file changed after
 * that is flagged and ignored; a file deleted after that is flagged and still counts, so
 * deleting a revocation cannot undo it. Invalid records are flagged by name and never stop
 * later valid records from being read. Nothing is ever repaired.
 */
export function readRecords(cwd: string, ref: string = remoteRecordsRef('origin')): RecordSet {
  const set: RecordSet = { head: null, records: [], bootstrap: [], flagged: [] };
  const head = git(cwd, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`], {
    allowFail: true,
  });
  if (head.status !== 0) return set;
  set.head = head.stdout.toString().trim();
  const cut = cutAt(cwd, set.head);
  if (cut !== null) {
    throw new RecordsReadError(
      `The records branch history in this clone stops at commit ${short(cut)} (a shallow clone), so pod-factory cannot tell what each record held when it was first added. Fetch the whole branch with "git fetch --unshallow" or a fresh clone and run it again. Nothing was read as approved.`,
    );
  }

  for (const merge of gitText(cwd, ['rev-list', '--min-parents=2', set.head]).split('\n')) {
    if (merge !== '') {
      set.flagged.push({
        path: `commit ${short(merge)}`,
        reason: `commit ${short(merge)} is a merge; the records branch must stay linear`,
      });
    }
  }

  const firstAdded = new Map<string, FirstAdded>();
  const changed = new Set<string>();
  const position = new Map<string, number>();
  for (const { commit, changes } of history(cwd, set.head)) {
    position.set(commit, position.size);
    for (const { status, blob, path } of changes) {
      if (!isRecordPath(path)) {
        set.flagged.push({
          path,
          reason: `${path} was changed in commit ${short(commit)}, outside the record paths; it is not a record`,
        });
        continue;
      }
      const first = firstAdded.get(path);
      if (status === 'A' && first === undefined) {
        firstAdded.set(path, { blob, commit });
      } else if (status === 'D' && changed.has(path)) {
        set.flagged.push({
          path,
          reason: `${path} was deleted in commit ${short(commit)} after being changed; it stays ignored`,
        });
      } else if (status === 'D') {
        set.flagged.push({
          path,
          reason: `${path} was deleted in commit ${short(commit)}; records are never deleted, so it still counts as first added`,
        });
      } else if (status === 'A' && first?.blob === blob) {
        set.flagged.push({
          path,
          reason: `${path} was re-added unchanged in commit ${short(commit)} after a deletion`,
        });
      } else {
        changed.add(path);
        set.flagged.push({
          path,
          reason: `${path} was changed in commit ${short(commit)} after it was first added; records are never edited, so it is ignored`,
        });
      }
    }
  }

  // In the order the records were added to the branch; file names tie within one second.
  const counted = [...firstAdded.entries()]
    .filter(([path]) => !changed.has(path))
    .sort(
      ([a, x], [b, y]) =>
        (position.get(x.commit) ?? 0) - (position.get(y.commit) ?? 0) || a.localeCompare(b),
    );
  const blobs = readBlobs(
    cwd,
    counted.map(([, first]) => first.blob),
  );
  const committedBy = committers(cwd, set.head);
  const seenIds = new Map<string, string>();
  for (const [path, first] of counted) {
    const bytes = blobs.get(first.blob) ?? Buffer.alloc(0);
    if (isBootstrapPath(path)) {
      const result = validateBootstrapRecord(path, bytes);
      const wrong = result.ok
        ? wrongCommitter(path, 'approval', first.commit, committedBy.get(first.commit))
        : null;
      if (!result.ok) set.flagged.push({ path, reason: `${result.reason}; it is ignored` });
      else if (wrong !== null) set.flagged.push({ path, reason: wrong });
      else set.bootstrap.push({ path, commit: first.commit, record: result.record });
      continue;
    }
    if (path.lastIndexOf('/') !== RECORDS_DIR.length) {
      set.flagged.push({
        path,
        reason: `${path} is in a folder records are never written to; it is ignored`,
      });
      continue;
    }
    const result = validateRecord(path, bytes);
    if (!result.ok) {
      set.flagged.push({ path, reason: `${result.reason}; it is ignored` });
      continue;
    }
    const wrong = wrongCommitter(
      path,
      result.record.recordType,
      first.commit,
      committedBy.get(first.commit),
    );
    if (wrong !== null) {
      set.flagged.push({ path, reason: wrong });
      continue;
    }
    const earlier = seenIds.get(result.record.recordId);
    if (earlier !== undefined) {
      set.flagged.push({
        path,
        reason: `${path} repeats record ID ${result.record.recordId} already used by ${earlier}; it is ignored`,
      });
      continue;
    }
    seenIds.set(result.record.recordId, path);
    set.records.push({ path, commit: first.commit, record: result.record });
  }
  return set;
}

/**
 * Fetches the records branch from `remote` and reads it as it is at this moment. This is what
 * every consumer uses; a missing branch reads as no records, so nothing is approved.
 */
export function loadRecords(cwd: string, remote = 'origin'): RecordSet {
  if (!fetchRecords(cwd, remote)) return { head: null, records: [], bootstrap: [], flagged: [] };
  return readRecords(cwd, remoteRecordsRef(remote));
}
