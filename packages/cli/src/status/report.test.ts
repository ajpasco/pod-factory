// Builder tests for the status report: the cases the locked T-19 tests do not reach. Records are
// built in memory, as the reader would return them, so these run without git.
import { describe, expect, it } from 'vitest';
import {
  recordBase,
  type ApprovalRecord,
  type FactoryRecord,
  type LockRecord,
  type RevocationRecord,
  type Stage,
  type TransitionRecord,
} from '../records/format.js';
import type { RecordSet, StoredRecord } from '../records/store.js';
import { claimedStage, statusReport, type PlannedStory, type StatusInput } from './report.js';

const HUMAN = { name: 'A Human', email: 'human@example.com', kind: 'human' } as const;
const NOW = new Date('2026-10-15T12:00:00Z');
const PLAN = '.factory/work/plan/build-plan.md';
const STORY_1 = '.factory/work/story-1/story.md';

const stored = <T extends FactoryRecord>(record: T): StoredRecord<T> => ({
  path: `records/${record.recordType}-${record.recordId}.json`,
  commit: 'c'.repeat(40),
  record,
});

function approval(
  block: Pick<ApprovalRecord['approval'], 'kind' | 'gate' | 'story' | 'pullRequest'>,
  files: Record<string, string> = {},
  tree: string | null = 't'.repeat(40),
): ApprovalRecord {
  return {
    ...recordBase(HUMAN),
    recordType: 'approval',
    binds: { tree, files },
    outcome: 'approved',
    refs: [],
    approval: { ...block, shownHash: 'h'.repeat(64), typedPrefix: 'hhhhhhhh', statement: 'x' },
  };
}

const gate = (n: number, files: Record<string, string> = {}) =>
  approval({ kind: 'gate', gate: n, story: null, pullRequest: null }, files);

function lockRecord(): LockRecord {
  return {
    ...recordBase(HUMAN),
    recordType: 'lock',
    binds: { tree: 't'.repeat(40), files: {} },
    outcome: 'locked',
    refs: [],
    lock: { patterns: [], testCommands: [] },
  };
}

function transition(
  from: Stage,
  to: Stage,
  lease: TransitionRecord['transition']['lease'] = null,
): TransitionRecord {
  return {
    ...recordBase(HUMAN),
    recordType: 'transition',
    binds: { tree: 't'.repeat(40), files: {} },
    outcome: to,
    refs: [],
    transition: { story: 'story-1', from, to, lease, handoffNote: null },
  };
}

function revocation(of: FactoryRecord): RevocationRecord {
  return {
    ...recordBase(HUMAN),
    recordType: 'revocation',
    binds: { tree: null, files: {} },
    outcome: 'revoked',
    refs: [of.recordId],
    revocation: { revokes: of.recordId, reason: 'test' },
  };
}

const PLANNED: PlannedStory = { story: 'story-1', path: STORY_1, text: '# story-1\n' };
const MAIN_HASHES: Record<string, string> = { [PLAN]: 'p'.repeat(64), [STORY_1]: 's'.repeat(64) };
const gate3 = () => gate(3, MAIN_HASHES);

function report(records: FactoryRecord[], over: Partial<StatusInput> = {}): string[] {
  const set: RecordSet = {
    head: 'r'.repeat(40),
    records: records.map(stored),
    bootstrap: [],
    flagged: [],
  };
  return statusReport({
    set,
    main: 'm'.repeat(40),
    noStories: null,
    stories: [PLANNED],
    hashOnMain: (path) => MAIN_HASHES[path] ?? null,
    now: NOW,
    ...over,
  });
}

const line = (lines: string[], start: string) => lines.find((l) => l.startsWith(start)) ?? '';

describe('status report', () => {
  it('reads a stage claim from a Stage: line, and nothing from prose', () => {
    expect(claimedStage('# s\nStage: Done\n')).toBe('done');
    expect(claimedStage('# s\nThe stage is done.\n')).toBeNull();
  });

  it('does not flag a claim that matches the recorded stage', () => {
    const started = transition('ready', 'in-progress', {
      holder: 'b',
      expiresAt: '2099-01-01T00:00:00Z',
    });
    const lines = report([gate3(), started], {
      stories: [{ ...PLANNED, text: '# s\nStage: in-progress\n' }],
    });
    expect(lines.some((l) => /claims/.test(l))).toBe(false);
  });

  it('says when an in-progress lease has expired', () => {
    const started = transition('ready', 'in-progress', {
      holder: 'b',
      expiresAt: '2026-10-15T06:00:00Z',
    });
    expect(line(report([gate3(), started]), 'story-1:')).toMatch(
      /owner b \(lease expired at 2026-10-15T06:00:00Z\)/,
    );
  });

  it('a verifying story waits on its story approval, then on the merge', () => {
    const verifying = transition('in-progress', 'verifying');
    const before = line(report([gate3(), verifying]), 'story-1:');
    expect(before).toMatch(/verifying.*approve story-1 --pr <n>/);
    expect(before).toContain(verifying.recordId);

    const approved = approval({ kind: 'story', gate: null, story: 'story-1', pullRequest: 21 });
    const after = line(report([gate3(), verifying, approved]), 'story-1:');
    expect(after).toMatch(/merge of pull request 21, approved by .*story finish story-1 --pr 21/);
  });

  it('a done story waits on nothing', () => {
    const done = transition('verifying', 'done');
    expect(line(report([gate3(), done]), 'story-1:')).toMatch(/done, no owner\. Waits on nothing/);
  });

  it('a revoked gate is not approved, naming the approval and its revocation', () => {
    const g3 = gate3();
    const revoked = revocation(g3);
    const lines = report([g3, revoked]);
    expect(line(lines, 'Gate 3:')).toBe(
      `Gate 3: not approved. Its approval ${g3.recordId} was revoked by ${revoked.recordId}; the approver runs "pod-factory approve 3" again to reopen it.`,
    );
    expect(line(lines, 'story-1:')).toMatch(/ready.*a valid gate-3 approval, then .*story start/);
  });

  it('gate 3 says when main no longer holds the plan it approved', () => {
    const drifted = gate(3, { ...MAIN_HASHES, [STORY_1]: 'x'.repeat(64) });
    expect(line(report([drifted]), 'Gate 3:')).toMatch(
      /main no longer holds the plan it approved \(\.factory\/work\/story-1\/story\.md changed\)/,
    );
  });

  it('a ready story outside the gate-3 approval cannot start', () => {
    const other = gate(3, { [PLAN]: MAIN_HASHES[PLAN] as string });
    expect(line(report([other]), 'story-1:')).toMatch(/did not approve .*story-1\/story\.md/);
  });

  it('gate 2 names the lock, or says nothing is locked yet', () => {
    expect(line(report([gate(2)]), 'Gate 2:')).toMatch(/Nothing is locked yet/);
    const locked = lockRecord();
    expect(line(report([gate(2), locked]), 'Gate 2:')).toContain(
      `Lock ${locked.recordId} is in force.`,
    );
  });

  it('lists every flagged record as invalid and ignored, with the reason the reader gave', () => {
    const flagged = [
      { path: 'records/a.json', reason: 'records/a.json was changed after it was first added' },
      { path: 'records/b.json', reason: 'it does not parse' },
    ];
    const lines = report([], {
      set: { head: 'r'.repeat(40), records: [], bootstrap: [], flagged },
    });
    expect(lines).toContain(
      'Invalid and ignored: records/a.json (records/a.json was changed after it was first added).',
    );
    expect(lines).toContain('Invalid and ignored: records/b.json (it does not parse).');
  });

  it('reports a missing records branch, a missing story file and a plan with no stories', () => {
    const lines = report([], {
      set: { head: null, records: [], bootstrap: [], flagged: [] },
      stories: [{ ...PLANNED, text: null }],
    });
    expect(lines[0]).toMatch(/no records branch yet/);
    expect(line(lines, 'story-1:')).toMatch(/main does not have it/);
    expect(line(lines, 'Gate 2:')).toMatch(/not approved/);

    const none = report([], { stories: [], noStories: 'The build plan names no story file.' });
    expect(none).toContain('The build plan names no story file.');
  });
});
