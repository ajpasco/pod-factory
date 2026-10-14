import { createHash } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  RecordWriteError,
  journalDir,
  readJournal,
  loadRecords,
  recordFileName,
  resumePendingRecords,
  serializeRecord,
  writeRecord,
  type FactoryRecord,
  type KillPoint,
} from '../src/index.js';
import { runChild } from './support/child.js';
import { BRANCH, fixture, prePushOnce, sh } from './support/repo.js';
import { checkResult, gateApproval, inProgress, revocation, stored } from './support/records.js';

function filesWithId(files: string[], id: string): string[] {
  return files.filter((f) => f.endsWith(`-${id}.json`));
}

describe('record store: writing', () => {
  it('writes a record in the fixed format, journaled and then marked landed', () => {
    const f = fixture();
    const record = gateApproval();
    const before = f.commitCount();
    const result = writeRecord(f.work, record, 'gate-2');

    expect(result).toMatchObject({ recordId: record.recordId, attempts: 1, alreadyLanded: false });
    expect(result.path).toBe(`records/${recordFileName(record, 'gate-2')}`);
    expect(f.commitCount()).toBe(before + 1);
    expect(sh(f.remote, ['show', `${BRANCH}:${result.path}`]) + '\n').toBe(serializeRecord(record));
    expect(sh(f.remote, ['log', '-1', '--format=%an <%ae>', BRANCH])).toBe(
      'Test Human <human@example.test>',
    );

    const journal = readJournal(f.work);
    expect(journal.entries).toEqual([
      expect.objectContaining({
        recordId: record.recordId,
        state: 'landed',
        landedCommit: result.commit,
      }),
    ]);
    expect(journalDir(f.work).startsWith(join(f.work, '.git'))).toBe(true);
    expect(sh(f.work, ['status', '--porcelain'])).toBe('');

    const set = loadRecords(f.work);
    expect(set.flagged).toEqual([]);
    expect(set.records.map((s) => s.record)).toEqual([record]);
  });

  it('journals the record before the first push and finishes it later with the same ID', () => {
    const f = fixture();
    const record = gateApproval();
    sh(f.work, ['remote', 'set-url', 'origin', join(f.root, 'unreachable.git')]);

    expect(() => writeRecord(f.work, record, 'gate-2')).toThrow(
      /could not be pushed after 5 attempts.*saved in the local journal as pending/s,
    );
    expect(readJournal(f.work).entries).toEqual([
      expect.objectContaining({ recordId: record.recordId, state: 'pending' }),
    ]);
    expect(filesWithId(f.filesOnBranch(), record.recordId)).toEqual([]);

    sh(f.work, ['remote', 'set-url', 'origin', f.remote]);
    const [result] = resumePendingRecords(f.work);
    expect(result).toMatchObject({ recordId: record.recordId, alreadyLanded: false });
    expect(filesWithId(f.filesOnBranch(), record.recordId)).toHaveLength(1);
    expect(readJournal(f.work).entries[0]?.state).toBe('landed');
    expect(resumePendingRecords(f.work)).toEqual([]);
  });

  it('validates a pending journal entry again before pushing it', () => {
    const f = fixture();
    const record = gateApproval();
    sh(f.work, ['remote', 'set-url', 'origin', join(f.root, 'unreachable.git')]);
    expect(() => writeRecord(f.work, record, 'gate-2')).toThrow(/pending/);
    sh(f.work, ['remote', 'set-url', 'origin', f.remote]);

    // Someone edits the pending entry so it now claims an agent wrote an approval.
    const file = join(journalDir(f.work), `${record.recordId}.json`);
    const entry = JSON.parse(readFileSync(file, 'utf8')) as Record<string, string>;
    const content = (entry.content as string).replace('"kind": "human"', '"kind": "agent"');
    writeFileSync(
      file,
      JSON.stringify({
        ...entry,
        content,
        sha256: createHash('sha256').update(content).digest('hex'),
      }),
    );

    expect(() => resumePendingRecords(f.work)).toThrow(
      /Refusing to push journal entry .*only human may write approval records/,
    );
    expect(f.filesOnBranch()).toEqual([]);
  });

  it('never writes an invalid record, and journals nothing for it', () => {
    const f = fixture();
    const bad = {
      ...gateApproval(),
      actor: { name: 'x', email: 'x@example.test', kind: 'agent' },
    } as FactoryRecord;
    expect(() => writeRecord(f.work, bad, 'gate-2')).toThrow(RecordWriteError);
    expect(() => writeRecord(f.work, bad, 'gate-2')).toThrow(
      /Refusing to write an invalid record: .*only human may write/,
    );
    expect(readJournal(f.work).entries).toEqual([]);
    expect(f.filesOnBranch()).toEqual([]);
  });

  it('refuses to write when the remote has no records branch, keeping the record pending', () => {
    const f = fixture({ recordsBranch: false });
    const record = gateApproval();
    expect(() => writeRecord(f.work, record, 'gate-2')).toThrow(
      /has no pod-factory\/records branch/,
    );
    expect(readJournal(f.work).entries[0]).toMatchObject({
      recordId: record.recordId,
      state: 'pending',
    });
    expect(sh(f.remote, ['branch', '--list', BRANCH])).toBe('');
  });

  it("rebases onto a concurrent writer's record and retries, keeping the branch linear", () => {
    const f = fixture();
    const other = f.clone('other');
    sh(other, ['checkout', '--quiet', '-B', 'records', `origin/${BRANCH}`]);
    const theirs = gateApproval();
    const [theirPath, theirBytes] = stored(theirs, 'gate-3');
    mkdirSync(join(other, 'records'), { recursive: true });
    writeFileSync(join(other, theirPath), theirBytes);
    // The other writer lands its record between our fetch and our push.
    prePushOnce(
      f.work,
      `cd '${other}' && git add '${theirPath}' && git commit -q -m theirs && git push -q origin HEAD:refs/heads/${BRANCH}`,
    );

    const ours = checkResult();
    const result = writeRecord(f.work, ours, 'verify');
    expect(result.attempts).toBe(2);
    expect(filesWithId(f.filesOnBranch(), theirs.recordId)).toHaveLength(1);
    expect(filesWithId(f.filesOnBranch(), ours.recordId)).toHaveLength(1);
    expect(sh(f.remote, ['rev-list', '--min-parents=2', BRANCH])).toBe('');
    const set = loadRecords(f.work);
    expect(set.flagged).toEqual([]);
    expect(set.records.map((s) => s.record.recordId).sort()).toEqual(
      [theirs.recordId, ours.recordId].sort(),
    );
  });
});

describe('record store: kill and resume at each write point', () => {
  const cases: {
    point: KillPoint;
    landedBeforeResume: boolean;
    journaled: 'none' | 'pending' | 'landed';
  }[] = [
    { point: 'during-journal-write', landedBeforeResume: false, journaled: 'none' },
    { point: 'after-journal', landedBeforeResume: false, journaled: 'pending' },
    { point: 'before-push', landedBeforeResume: false, journaled: 'pending' },
    { point: 'after-push', landedBeforeResume: true, journaled: 'pending' },
    { point: 'after-record-write', landedBeforeResume: true, journaled: 'landed' },
  ];

  for (const { point, landedBeforeResume, journaled } of cases) {
    it(`killed at ${point}: no record lost, none duplicated`, () => {
      const f = fixture();
      const record = inProgress();
      const commitsBefore = f.commitCount();

      const killed = runChild(['write', f.work, JSON.stringify(record), 'story-1-in-progress'], {
        POD_FACTORY_TEST_KILL_AT: point,
      });
      expect(killed.signal, killed.stderr).toBe('SIGKILL');
      expect(filesWithId(f.filesOnBranch(), record.recordId)).toHaveLength(
        landedBeforeResume ? 1 : 0,
      );

      const journal = readJournal(f.work);
      expect(journal.flagged).toEqual([]);
      if (journaled === 'none') {
        expect(journal.entries).toEqual([]);
        expect(readdirSync(journalDir(f.work)).some((n) => n.includes('.tmp-'))).toBe(true);
      } else {
        expect(journal.entries).toEqual([
          expect.objectContaining({ recordId: record.recordId, state: journaled }),
        ]);
      }

      const resumed = runChild(['resume', f.work]);
      expect(resumed.status, resumed.stderr).toBe(0);
      const results = JSON.parse(resumed.stdout) as { alreadyLanded: boolean }[];

      if (journaled === 'none') {
        // Nothing was journaled, so nothing was pushed: the command runs again from the start.
        expect(results).toEqual([]);
        expect(filesWithId(f.filesOnBranch(), record.recordId)).toHaveLength(0);
        expect(f.commitCount()).toBe(commitsBefore);
        return;
      }
      if (journaled === 'pending')
        expect(results).toEqual([expect.objectContaining({ alreadyLanded: landedBeforeResume })]);
      else expect(results).toEqual([]);
      expect(filesWithId(f.filesOnBranch(), record.recordId)).toHaveLength(1);
      expect(f.commitCount()).toBe(commitsBefore + 1);
      expect(readJournal(f.work).entries[0]?.state).toBe('landed');
      expect(loadRecords(f.work).records.map((s) => s.record)).toEqual([record]);
    });
  }
});

describe('record store: reading', () => {
  it('flags a half-written record by name and still reads the valid record written after it', () => {
    const f = fixture();
    const partial = gateApproval();
    const [path, bytes] = stored(partial, 'gate-2');
    f.plant({ [path]: bytes.slice(0, 120) }, 'killed mid-write');
    const later = gateApproval();
    writeRecord(f.work, later, 'gate-2');

    const set = loadRecords(f.work);
    expect(set.records.map((s) => s.record.recordId)).toEqual([later.recordId]);
    expect(set.flagged).toEqual([
      { path, reason: `${path} is not complete JSON, so it may be half-written; it is ignored` },
    ]);
  });

  it('flags and ignores a record changed after it was added', () => {
    const f = fixture();
    const record = gateApproval();
    const { path } = writeRecord(f.work, record, 'gate-2');
    const edited = { ...record, approval: { ...record.approval, statement: 'something else' } };
    f.plant({ [path]: serializeRecord(edited) }, 'edit an existing record');

    const set = loadRecords(f.work);
    expect(set.records).toEqual([]);
    expect(set.flagged).toEqual([
      expect.objectContaining({
        path,
        reason: expect.stringMatching(
          /changed in commit [0-9a-f]{12} after it was first added; .*ignored$/,
        ),
      }),
    ]);
  });

  it('flags a deleted record and keeps counting it as first added', () => {
    const f = fixture();
    const approval = gateApproval();
    writeRecord(f.work, approval, 'gate-2');
    const revoke = revocation(approval.recordId);
    const { path } = writeRecord(f.work, revoke, approval.recordId);
    f.plant({ [path]: null }, 'delete the revocation');

    const set = loadRecords(f.work);
    expect(set.records.map((s) => s.record.recordId).sort()).toEqual(
      [approval.recordId, revoke.recordId].sort(),
    );
    expect(set.records.find((s) => s.record.recordType === 'revocation')?.record).toEqual(revoke);
    expect(set.flagged).toEqual([
      expect.objectContaining({
        path,
        reason: expect.stringMatching(/deleted in commit .*still counts as first added/),
      }),
    ]);
  });

  it('flags files outside the record paths, other folders and repeated IDs', () => {
    const f = fixture();
    const record = gateApproval();
    writeRecord(f.work, record, 'gate-2');
    const [, bytes] = stored(record, 'gate-2');
    const copy = `records/${recordFileName(record, 'copy')}`;
    f.plant(
      { 'notes.txt': 'not a record\n', 'records/sub/x.json': '{}\n', [copy]: bytes },
      'stray files',
    );

    const set = loadRecords(f.work);
    expect(set.records.map((s) => s.record.recordId)).toEqual([record.recordId]);
    const reasons = set.flagged.map((x) => x.reason).join('\n');
    expect(reasons).toMatch(/notes\.txt was changed in commit .*outside the record paths/);
    expect(reasons).toMatch(/records\/sub\/x\.json is in a folder records are never written to/);
    expect(reasons).toMatch(new RegExp(`repeats record ID ${record.recordId}`));
  });

  it('reads bootstrap records under records/bootstrap with their own schema', () => {
    const f = fixture();
    const bootstrap = readFileSync(
      new URL(
        '../../../.factory/records/0002-amendment-prd-0.9.1-budget-off-mode.json',
        import.meta.url,
      ),
      'utf8',
    );
    f.plant(
      { 'records/bootstrap/0002-amendment-prd-0.9.1-budget-off-mode.json': bootstrap },
      'move bootstrap',
    );
    const set = loadRecords(f.work);
    expect(set.flagged).toEqual([]);
    expect(set.bootstrap.map((b) => b.path)).toEqual([
      'records/bootstrap/0002-amendment-prd-0.9.1-budget-off-mode.json',
    ]);
  });

  it('flags a merge on the records branch', () => {
    const f = fixture();
    const side = f.clone('side');
    sh(side, ['checkout', '--quiet', '-B', 'records', `origin/${BRANCH}`]);
    const [path, bytes] = stored(gateApproval(), 'gate-2');
    mkdirSync(join(side, 'records'), { recursive: true });
    writeFileSync(join(side, path), bytes);
    sh(side, ['add', path]);
    sh(side, ['commit', '--quiet', '-m', 'side record']);
    writeRecord(f.work, gateApproval(), 'gate-2');
    sh(side, ['fetch', '--quiet', 'origin']);
    sh(side, ['merge', '--quiet', '--no-edit', `origin/${BRANCH}`]);
    sh(side, ['push', '--quiet', 'origin', `HEAD:refs/heads/${BRANCH}`]);

    const set = loadRecords(f.work);
    expect(set.flagged).toEqual([
      expect.objectContaining({
        reason: expect.stringMatching(/is a merge; the records branch must stay linear/),
      }),
    ]);
    expect(set.records).toHaveLength(2);
  });

  it('reads nothing, failing closed, when the records branch does not exist', () => {
    const f = fixture({ recordsBranch: false });
    expect(loadRecords(f.work)).toEqual({ head: null, records: [], bootstrap: [], flagged: [] });
  });
});
