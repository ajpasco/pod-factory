import { describe, expect, it } from 'vitest';
import {
  effectiveLock,
  hashText,
  loadRecords,
  recordBase,
  type ApprovalRecord,
} from '../src/index.js';
import { CI_FILES, ciProject, plantLock, treeAt } from './support/ci.js';
import { HUMAN, SHA_A, stored } from './support/records.js';

const PATH = 'packages/cli/test/a.test.ts';
const SAME_SECOND = new Date('2026-10-14T03:35:59Z');

function amendment(
  lockId: string,
  pr: number,
  before: string,
  after: string,
  tree: string,
): ApprovalRecord {
  return {
    ...recordBase(HUMAN, SAME_SECOND),
    recordType: 'approval',
    binds: { tree, files: { [PATH]: { before, after } } },
    outcome: 'approved',
    refs: [lockId],
    approval: {
      kind: 'amendment',
      gate: null,
      story: null,
      pullRequest: pr,
      shownHash: SHA_A,
      typedPrefix: SHA_A.slice(0, 8),
      statement: `Amendment for pull request ${pr}`,
    },
  };
}

describe('effective lock', () => {
  it('applies amendments in the order they were added, even when their file names sort otherwise', () => {
    const f = ciProject();
    const lock = plantLock(f);
    const tree = treeAt(f, f.main);
    const h0 = hashText(CI_FILES[PATH] as string);
    const h1 = hashText('first\n');
    const h2 = hashText('second\n');
    const first = amendment(lock.recordId, 9, h0, h1, tree);
    const second = amendment(lock.recordId, 10, h1, h2, tree);
    const [firstPath, firstBytes] = stored(first, 'amendment-pr-9');
    const [secondPath, secondBytes] = stored(second, 'amendment-pr-10');
    expect(secondPath < firstPath).toBe(true);
    f.plant({ [firstPath]: firstBytes }, 'amendment for 9');
    f.plant({ [secondPath]: secondBytes }, 'amendment for 10');

    const state = effectiveLock(loadRecords(f.work));
    expect(state?.amendments.map((a) => a.record.recordId)).toEqual([
      first.recordId,
      second.recordId,
    ]);
    expect(state?.stale).toEqual([]);
    expect(state?.hashes.get(PATH)).toBe(h2);
    expect(state?.held.get(PATH)).toEqual([h0, h1, h2]);
  });
});
