import { describe, expect, it } from 'vitest';
import {
  LOCKED_PATTERNS,
  hashText,
  loadRecords,
  recordBase,
  run,
  writeRecord,
  type ApprovalRecord,
  type LockRecord,
} from '../src/index.js';
import {
  CLASSIFICATION_RECORD,
  PROJECT_FILES,
  confirms,
  human,
  project,
} from './support/project.js';
import { sh, type Fixture } from './support/repo.js';

async function approveGate2(f: Fixture): Promise<ApprovalRecord> {
  expect(
    await run(
      ['approve', '2', '--classification', CLASSIFICATION_RECORD],
      human(f.work, confirms('2')),
    ),
  ).toBe(0);
  return latestApproval(f, 'gate');
}

/** The newest approval of `kind`. Records sort by file name, so same-second records may tie. */
function latestApproval(f: Fixture, kind: ApprovalRecord['approval']['kind']): ApprovalRecord {
  const approvals = loadRecords(f.work)
    .records.map((s) => s.record)
    .filter((r): r is ApprovalRecord => r.recordType === 'approval' && r.approval.kind === kind);
  return approvals.at(-1) as ApprovalRecord;
}

function locks(f: Fixture): LockRecord[] {
  return loadRecords(f.work)
    .records.map((s) => s.record)
    .filter((r): r is LockRecord => r.recordType === 'lock');
}

const LOCKED_IN_FIXTURE = [
  '.github/workflows/pr-checks.yml',
  'docs/eval-plan.md',
  'package-lock.json',
  'packages/cli/test/approve.test.ts',
  'packages/cli/test/fixtures/record.json',
  'packages/cli/vitest.config.ts',
];

describe('lock', () => {
  it('T-06-P3 [M0] the lock lists every locked path with its hash, the patterns and the exact commands', async () => {
    const f = project();
    const approval = await approveGate2(f);
    const io = human(f.work);
    expect(await run(['lock'], io)).toBe(0);
    expect(io.errors).toEqual([]);

    const [lock] = locks(f);
    expect(lock?.binds.tree).toBe(approval.binds.tree);
    expect(Object.keys(lock?.binds.files ?? {})).toEqual(LOCKED_IN_FIXTURE);
    for (const path of LOCKED_IN_FIXTURE) {
      expect(lock?.binds.files[path], path).toBe(hashText(PROJECT_FILES[path] as string));
    }
    expect(lock?.binds.files['packages/cli/src/index.ts']).toBeUndefined();
    // Patterns that match nothing yet are still recorded, so a file added there later is caught.
    expect(lock?.lock.patterns).toEqual([...LOCKED_PATTERNS]);
    expect(lock?.lock.patterns).toContain('release/smoke/**');
    expect(lock?.lock.testCommands).toEqual([
      'npm ci',
      'npm exec --workspace packages/cli -- vitest run --config vitest.config.ts',
    ]);
    expect(lock?.refs).toEqual([approval.recordId]);
    expect(lock?.actor.kind).toBe('human');
  });

  it('refuses without a gate-2 approval', async () => {
    const f = project();
    const io = human(f.work);
    expect(await run(['lock'], io)).toBe(1);
    expect(io.errors.join()).toMatch(/no valid, unrevoked gate-2 approval/);
    expect(locks(f)).toEqual([]);
  });

  it('refuses when the gate-2 approval was revoked', async () => {
    const f = project();
    const approval = await approveGate2(f);
    writeRecord(
      f.work,
      {
        ...recordBase({ name: 'Test Human', email: 'human@example.test', kind: 'human' }),
        recordType: 'revocation',
        binds: { tree: null, files: {} },
        outcome: 'revoked',
        refs: [approval.recordId],
        revocation: { revokes: approval.recordId, reason: 'fixture revocation' },
      },
      approval.recordId,
    );
    const io = human(f.work);
    expect(await run(['lock'], io)).toBe(1);
    expect(io.errors.join()).toMatch(/no valid, unrevoked gate-2 approval/);
  });

  it('refuses when main moved after the approval', async () => {
    const f = project();
    await approveGate2(f);
    const moved = f.commitToMain({
      'packages/cli/test/approve.test.ts': "it('changed', () => {});\n",
    });
    const io = human(f.work);
    expect(await run(['lock'], io)).toBe(1);
    expect(io.errors.join()).toMatch(
      new RegExp(`main moved after the gate-2 approval .*commit ${moved.slice(0, 12)}`),
    );
    expect(locks(f)).toEqual([]);
  });

  it('does not lock twice for the same approval', async () => {
    const f = project();
    await approveGate2(f);
    expect(await run(['lock'], human(f.work))).toBe(0);
    const again = human(f.work);
    expect(await run(['lock'], again)).toBe(0);
    expect(again.lines.join()).toMatch(/Already locked/);
    expect(locks(f)).toHaveLength(1);
  });
});

describe('approve amendment', () => {
  async function locked(): Promise<{ f: Fixture; lock: LockRecord }> {
    const f = project();
    await approveGate2(f);
    expect(await run(['lock'], human(f.work))).toBe(0);
    return { f, lock: locks(f)[0] as LockRecord };
  }

  it('binds before hashes from the lock and after hashes from the pull request, null where absent', async () => {
    const { f, lock } = await locked();
    const changed = "it('T-03-N4 [M0] amended', () => {});\n";
    const added = "it('a new locked test', () => {});\n";
    const head = f.pullRequest(9, {
      'packages/cli/test/approve.test.ts': changed,
      'packages/cli/test/new.test.ts': added,
      'packages/cli/test/fixtures/record.json': null,
    });
    const io = human(f.work, confirms('amendment'));
    const paths = [
      'packages/cli/test/approve.test.ts',
      'packages/cli/test/new.test.ts',
      'packages/cli/test/fixtures/record.json',
    ];
    expect(await run(['approve', 'amendment', '--pr', '9', ...paths], io)).toBe(0);

    const amendment = latestApproval(f, 'amendment');
    expect(amendment.approval).toMatchObject({ kind: 'amendment', pullRequest: 9 });
    expect(amendment.binds.tree).toBe(sh(f.remote, ['rev-parse', `${head}^{tree}`]));
    expect(amendment.binds.files).toEqual({
      'packages/cli/test/approve.test.ts': {
        before: lock.binds.files['packages/cli/test/approve.test.ts'],
        after: hashText(changed),
      },
      'packages/cli/test/fixtures/record.json': {
        before: lock.binds.files['packages/cli/test/fixtures/record.json'],
        after: null,
      },
      'packages/cli/test/new.test.ts': { before: null, after: hashText(added) },
    });
    expect(amendment.refs).toEqual([lock.recordId]);
  });

  it('refuses an unlocked path, an unchanged path, and an amendment with no lock', async () => {
    const { f } = await locked();
    f.pullRequest(9, { 'packages/cli/src/index.ts': 'export const x = 1;\n' });
    let io = human(f.work, confirms('amendment'));
    expect(await run(['approve', 'amendment', '--pr', '9', 'packages/cli/src/index.ts'], io)).toBe(
      1,
    );
    expect(io.errors.join()).toMatch(
      /packages\/cli\/src\/index\.ts is not locked, so no amendment is needed/,
    );

    io = human(f.work, confirms('amendment'));
    expect(await run(['approve', 'amendment', '--pr', '9', 'docs/eval-plan.md'], io)).toBe(1);
    expect(io.errors.join()).toMatch(
      /docs\/eval-plan\.md is the same in pull request 9 as in the lock/,
    );

    const unlocked = project();
    unlocked.pullRequest(9, { 'docs/eval-plan.md': 'changed\n' });
    io = human(unlocked.work, confirms('amendment'));
    expect(await run(['approve', 'amendment', '--pr', '9', 'docs/eval-plan.md'], io)).toBe(1);
    expect(io.errors.join()).toMatch(/no valid lock, so there is nothing to amend/);
  });
});
