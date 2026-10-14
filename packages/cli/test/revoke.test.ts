import { describe, expect, it } from 'vitest';
import {
  effectiveLock,
  hashText,
  loadRecords,
  recordBase,
  run,
  type ApprovalRecord,
  type CheckResultRecord,
  type InvocationContext,
  type LockRecord,
  type RevocationRecord,
} from '../src/index.js';
import { runFlowChild } from './support/child.js';
import {
  CI_FILES,
  ciProject,
  job,
  plantApproval,
  plantGate3,
  plantLock,
  plantVerify,
  treeAt,
  type CiFixture,
} from './support/ci.js';
import { fakeGitHub, type FakeGitHub } from './support/gh.js';
import { HUMAN, SHA_A, stored } from './support/records.js';
import {
  CLASSIFICATION_RECORD,
  confirms,
  human,
  project,
  shownHash,
  type ScriptedIO,
} from './support/project.js';

const RELAY_RUN = [
  '--run-id',
  '777',
  '--run-url',
  'https://github.com/example/project/actions/runs/777',
];

/** A human at a terminal whose PATH finds the fake gh. */
function at(
  f: CiFixture | { work: string },
  github: FakeGitHub,
  answer: (io: ScriptedIO) => string = confirms('revoke'),
): ScriptedIO {
  const ctx: InvocationContext = { env: github.env, stdinIsTTY: true, stdoutIsTTY: true };
  return human(f.work, answer, ctx);
}

const revokeCmd = (id: string, ...rest: string[]) => [
  'revoke',
  id,
  '--reason',
  'approved the wrong content',
  '--wait',
  '0',
  ...rest,
];

function revocations(f: { work: string }): RevocationRecord[] {
  return loadRecords(f.work)
    .records.map((s) => s.record)
    .filter((r): r is RevocationRecord => r.recordType === 'revocation');
}

/** An open pull request 7 with a bootstrap approval and a passing verify, both for its head. */
function approvedPullRequest() {
  const f = ciProject();
  const head = f.pullRequest(7, { 'src/app.js': 'export const app = 1;\n' });
  const tree = treeAt(f, head);
  const approval = plantApproval(f, 'bootstrap', 7, tree);
  plantVerify(f, 7, tree);
  const github = fakeGitHub({ pulls: { '7': { state: 'OPEN', head } } });
  return { f, head, tree, approval, github };
}

const relayRun = (f: CiFixture, github: FakeGitHub) =>
  job(f.work, ['records-validate', '--relay', ...RELAY_RUN], github.env);

describe('revoke', () => {
  it('T-22-P1 [M0] writes a revocation record with the human as its actor', async () => {
    const { f, approval, github } = approvedPullRequest();
    const io = at(f, github);
    expect(await run(revokeCmd(approval.recordId), io)).toBe(0);
    const [revocation] = revocations(f);
    expect(revocation).toMatchObject({
      actor: { name: 'Test Human', email: 'human@example.test', kind: 'human' },
      refs: [approval.recordId],
      revocation: { revokes: approval.recordId, reason: 'approved the wrong content' },
    });
    expect(io.lines.join('\n')).toContain(`Revoked. Record records/`);
    expect(github.calls()).toContainEqual([
      'workflow',
      'run',
      'records-validate.yml',
      '--ref',
      'main',
    ]);
  });

  it('T-03-P4 [M0] revoking the gate-2 approval opens gate 2, and the lock stays in force', async () => {
    const f = ciProject();
    const lock = plantLock(f);
    const github = fakeGitHub();
    const io = at(f, github);
    expect(await run(revokeCmd(lock.refs[0] as string), io)).toBe(0);
    expect(revocations(f)).toHaveLength(1);
    const out = io.lines.join('\n');
    expect(out).toContain(
      'Gate 2 is open again. The lock stays in force until a new gate-2 approval and lock.',
    );
    expect(out).toContain(
      'No pull request merges on this record, so there is nothing for CI to block.',
    );
    expect(effectiveLock(loadRecords(f.work))?.lock.record.recordId).toBe(lock.recordId);
  });

  it('T-03-N6 [M0] a revoked approval no longer satisfies gate-check', async () => {
    const { f, head, approval, github } = approvedPullRequest();
    expect(job(f.work, ['gate-check', '--pr', '7', '--head', head]).status).toBe(0);
    expect(await run(revokeCmd(approval.recordId), at(f, github))).toBe(0);
    const after = job(f.work, ['gate-check', '--pr', '7', '--head', head]);
    expect(after.out).toMatch(/There is no approval for pull request 7/);
    expect(after.status).toBe(1);
  });

  it('T-22-N6 [M0] reports pending until CI confirms the open pull request is blocked, never earlier', async () => {
    const { f, head, approval, github } = approvedPullRequest();
    const io = at(f, github);
    expect(await run(revokeCmd(approval.recordId), io)).toBe(0);
    const first = io.lines.join('\n');
    expect(first).toContain('Pending: CI has not yet confirmed that pull request 7 is blocked.');
    expect(first).not.toMatch(/Enforced/);

    const relayed = relayRun(f, github);
    expect(relayed.out).toMatch(/Relay: posted a failing gate-check on pull request 7/);
    expect(relayed.status).toBe(0);
    const post = github.calls().find((c) => c.includes('POST'));
    expect(post).toEqual(
      expect.arrayContaining(['name=gate-check', `head_sha=${head}`, 'conclusion=failure']),
    );

    const again = at(f, github);
    expect(await run(['revoke', approval.recordId, '--wait', '0'], again)).toBe(0);
    const second = again.lines.join('\n');
    expect(second).toMatch(/was already revoked by [0-9a-f]{12}\. Nothing was written\./);
    expect(second).toMatch(
      /Enforced: CI posted a failing gate-check on pull request 7 at [0-9a-f]{12} \(https:\/\/github\.com\/example\/project\/actions\/runs\/777\)/,
    );
    expect(revocations(f)).toHaveLength(1);

    github.set({ fail: true, pulls: {} });
    const unreachable = at(f, github);
    expect(await run(['revoke', approval.recordId, '--wait', '0'], unreachable)).toBe(0);
    expect(unreachable.lines.join('\n')).toMatch(
      /Pending: pod-factory cannot ask GitHub whether pull request 7 is blocked/,
    );
  });

  it('names every path a lock revocation unlocks before the hash is typed', async () => {
    const f = ciProject();
    const lock = plantLock(f);
    const github = fakeGitHub();
    const wrong = at(f, github, () => 'revoke 00000000');
    expect(await run(revokeCmd(lock.recordId), wrong)).toBe(1);
    const shown = wrong.lines.join('\n');
    expect(shown).toMatch(/This is the one revocation that loosens: 4 paths stop being locked:/);
    for (const path of Object.keys(lock.binds.files)) expect(shown).toContain(`  ${path}`);
    expect(wrong.errors.join()).toMatch(
      /Not revoked: you typed "revoke 00000000".*Nothing was written\./,
    );
    expect(revocations(f)).toEqual([]);

    const io = at(f, github);
    expect(await run(revokeCmd(lock.recordId), io)).toBe(0);
    expect(io.lines.join('\n')).toContain('4 paths are no longer locked.');
    expect(effectiveLock(loadRecords(f.work))).toBeNull();
  });

  it('refuses from an agent session, for an unknown record, and without a reason', async () => {
    const { f, approval, github } = approvedPullRequest();
    const agent = human(f.work, confirms('revoke'), {
      env: { ...github.env, CLAUDECODE: '1' },
      stdinIsTTY: true,
      stdoutIsTTY: true,
    });
    expect(await run(revokeCmd(approval.recordId), agent)).toBe(1);
    expect(agent.errors.join()).toMatch(/revoke refused: agent session marker CLAUDECODE=1 is set/);

    const unknown = at(f, github);
    expect(await run(revokeCmd('abcdefabcdef'), unknown)).toBe(1);
    expect(unknown.errors.join()).toMatch(
      /There is no valid record abcdefabcdef on the records branch/,
    );

    const noReason = at(f, github);
    expect(await run(['revoke', approval.recordId], noReason)).toBe(1);
    expect(noReason.errors.join()).toMatch(/revoke needs --reason/);
    expect(revocations(f)).toEqual([]);
  });

  it('revokes a bootstrap record by file name, and approve 2 then refuses it', async () => {
    const f = project();
    const github = fakeGitHub();
    const io = human(f.work, (io) => `revoke ${shownHash(io).slice(0, 8)}`, {
      env: github.env,
      stdinIsTTY: true,
      stdoutIsTTY: true,
    });
    expect(await run(revokeCmd(CLASSIFICATION_RECORD), io)).toBe(0);
    expect(revocations(f)[0]?.revocation.revokes).toBe(CLASSIFICATION_RECORD);
    expect(loadRecords(f.work).flagged).toEqual([]);
    const gate = human(f.work, confirms('2'));
    expect(await run(['approve', '2', '--classification', CLASSIFICATION_RECORD], gate)).toBe(1);
    expect(gate.errors.join()).toMatch(
      /classification record records\/bootstrap\/0005-classification-gate-2\.json has been revoked/,
    );
  });
});

describe('the revocation relay', () => {
  it('blocks each affected open pull request once, and records it as the check runner', async () => {
    const { f, approval, github } = approvedPullRequest();
    expect(await run(revokeCmd(approval.recordId), at(f, github))).toBe(0);
    expect(relayRun(f, github).status).toBe(0);
    const again = relayRun(f, github);
    expect(again.out).toMatch(/pull request 7 at [0-9a-f]{12} is already blocked/);
    expect(github.calls().filter((c) => c.includes('POST'))).toHaveLength(1);
    const relays = loadRecords(f.work)
      .records.map((s) => s.record)
      .filter(
        (r): r is CheckResultRecord =>
          r.recordType === 'check-result' && r.checkResult.check === 'gate-check',
      );
    expect(relays).toHaveLength(1);
    expect(relays[0]).toMatchObject({ outcome: 'fail', actor: { kind: 'check-runner' } });
  });

  it('leaves closed pull requests and ones that moved past the revoked record alone', async () => {
    const { f, approval, github } = approvedPullRequest();
    expect(await run(revokeCmd(approval.recordId), at(f, github))).toBe(0);
    github.set({ pulls: { '7': { state: 'CLOSED', head: 'f'.repeat(40) } } });
    expect(relayRun(f, github).out).not.toMatch(/posted/);
    const moved = f.pullRequest(7, { 'src/app.js': 'export const app = 2;\n' });
    github.set({ pulls: { '7': { state: 'OPEN', head: moved } } });
    expect(relayRun(f, github).out).not.toMatch(/posted/);
    expect(github.calls().filter((c) => c.includes('POST'))).toEqual([]);
  });

  it('asks GitHub nothing when no revocation names a pull request, and fails when it cannot list them', async () => {
    const quiet = ciProject();
    const github = fakeGitHub();
    const none = relayRun(quiet, github);
    expect(none.out).toMatch(/Relay: no revocation names a record a pull request merges on/);
    expect(github.calls()).toEqual([]);

    const { f, approval, github: down } = approvedPullRequest();
    expect(await run(revokeCmd(approval.recordId), at(f, down))).toBe(0);
    down.set({ fail: true, pulls: {} });
    const failed = relayRun(f, down);
    expect(failed.out).toMatch(/Relay failed: gh api --paginate failed: fake gh: not logged in/);
    expect(failed.status).toBe(1);
  });
});

const CONFIG = 'packages/cli/vitest.config.ts';
const CONFIG_V0 = CI_FILES[CONFIG] as string;
const CONFIG_V1 = 'export default { amended: 1 };\n';
const CONFIG_V2 = 'export default { amended: 2 };\n';

/** A locked project whose story one may change the locked runner configuration. */
function amendableProject(): { f: CiFixture; lock: LockRecord } {
  const story = [
    '# story-1: the app',
    '',
    'Tests:',
    '- packages/cli/test/a.test.ts',
    '',
    'Scope:',
    '- src/**',
    `- ${CONFIG}`,
    '',
    'Inputs:',
    '- package.json',
    '',
  ].join('\n');
  const files = {
    '.factory/work/plan/build-plan.md': '# Build plan\n\n1. .factory/work/story-1/story.md\n',
    '.factory/work/story-1/story.md': story,
  };
  const f = ciProject();
  f.commitToMain(files, 'build plan');
  const lock = plantLock(f);
  plantGate3(f, files);
  return { f, lock };
}

/** An amendment approval for the runner configuration, as `approve amendment` writes it. */
function plantAmendment(
  f: CiFixture,
  lock: LockRecord,
  pr: number,
  tree: string,
  before: string,
  after: string,
): ApprovalRecord {
  const amendment: ApprovalRecord = {
    ...recordBase(HUMAN),
    recordType: 'approval',
    binds: { tree, files: { [CONFIG]: { before: hashText(before), after: hashText(after) } } },
    outcome: 'approved',
    refs: [lock.recordId],
    approval: {
      kind: 'amendment',
      gate: null,
      story: null,
      pullRequest: pr,
      shownHash: SHA_A,
      typedPrefix: SHA_A.slice(0, 8),
      statement: `Amendment: a change to locked ${CONFIG} as pull request ${pr} stands, against lock ${lock.recordId}.`,
    },
  };
  f.plant(Object.fromEntries([stored(amendment, `amendment-pr-${pr}`)]), 'amendment');
  return amendment;
}

/** Pull request `pr` changing the configuration from `before` to `after`, amended, approved and verified. */
function amendedPullRequest(
  f: CiFixture,
  lock: LockRecord,
  pr: number,
  before: string,
  after: string,
): { head: string; amendment: ApprovalRecord } {
  const head = f.pullRequest(pr, { 'src/app.js': `export const app = ${pr};\n`, [CONFIG]: after });
  const tree = treeAt(f, head);
  const amendment = plantAmendment(f, lock, pr, tree, before, after);
  plantApproval(f, 'story', pr, tree);
  plantVerify(f, pr, tree);
  return { head, amendment };
}

const check = (f: CiFixture, name: 'gate-check' | 'lock-guard', pr: number, head: string) =>
  job(f.work, [name, '--pr', String(pr), '--head', head]);

describe('revoking an amendment', () => {
  // gate-check applies the locked-path rule itself. lock-guard's earlier green check run and the
  // relay's red one are both GitHub check runs a re-run supersedes, so neither decides the merge.
  it('T-22-N8 [M0] a revoked amendment no longer satisfies gate-check, which names the amendment and the revocation', async () => {
    const { f, lock } = amendableProject();
    const { head, amendment } = amendedPullRequest(f, lock, 7, CONFIG_V0, CONFIG_V1);
    const github = fakeGitHub({ pulls: { '7': { state: 'OPEN', head } } });

    const guarded = check(f, 'lock-guard', 7, head);
    expect(guarded.out).toContain(
      `${CONFIG}: changed under an amendment approval bound to this head.`,
    );
    expect(guarded.status).toBe(0);
    const before = check(f, 'gate-check', 7, head);
    expect(before.out).toMatch(/gate-check passes for pull request 7/);
    expect(before.status).toBe(0);

    expect(await run(revokeCmd(amendment.recordId), at(f, github))).toBe(0);
    const [revoked] = revocations(f);
    const sentence = `${CONFIG} is locked, and amendment ${amendment.recordId}, which let pull request 7 change it, was revoked by ${revoked?.recordId} (reason: approved the wrong content).`;

    const after = check(f, 'gate-check', 7, head);
    expect(after.out).toMatch(/gate-check fails for pull request 7/);
    expect(after.out).toContain(sentence);
    expect(after.out).toMatch(/and verify result [0-9a-f]{12} .*, and neither is revoked\./);
    expect(after.status).toBe(1);
    const guardedAfter = check(f, 'lock-guard', 7, head);
    expect(guardedAfter.out).toContain(sentence);
    expect(guardedAfter.status).toBe(1);
  });

  it('T-22-N9 [M0] revoking the first of two chained amendments to one locked path fails the second closed', async () => {
    const { f, lock } = amendableProject();
    const first = amendedPullRequest(f, lock, 7, CONFIG_V0, CONFIG_V1);
    expect(check(f, 'gate-check', 7, first.head).status).toBe(0);
    f.commitToMain({ 'src/app.js': 'export const app = 7;\n', [CONFIG]: CONFIG_V1 }, 'merge 7');
    const second = amendedPullRequest(f, lock, 8, CONFIG_V1, CONFIG_V2);
    expect(check(f, 'lock-guard', 8, second.head).out).toMatch(/with 2 amendments applied/);
    expect(check(f, 'gate-check', 8, second.head).status).toBe(0);

    const github = fakeGitHub({ pulls: { '7': { state: 'MERGED', head: first.head } } });
    expect(await run(revokeCmd(first.amendment.recordId), at(f, github))).toBe(0);

    const after = check(f, 'gate-check', 8, second.head);
    expect(after.status).toBe(1);
  });
});

describe('an interrupted revoke', () => {
  it('T-22-N10 [M0] a revoke stopped after its record landed starts the relay when run again, and writes no second revocation', async () => {
    const { f, approval, github } = approvedPullRequest();
    const dispatches = () => github.calls().filter((c) => c[0] === 'workflow' && c[1] === 'run');
    const killed = runFlowChild(
      f.work,
      'human',
      'revoke',
      revokeCmd(approval.recordId),
      'after-record-write',
      github.env,
    );
    expect(killed.signal).toBe('SIGKILL');
    expect(revocations(f)).toHaveLength(1);
    expect(dispatches()).toEqual([]);

    const rerun = () =>
      runFlowChild(
        f.work,
        'human',
        'revoke',
        ['revoke', approval.recordId, '--wait', '0'],
        undefined,
        github.env,
      );
    const again = rerun();
    expect(again.stdout).toMatch(/was already revoked by [0-9a-f]{12}\. Nothing was written\./);
    expect(again.stdout).toContain(
      'records-validate was started so CI blocks any open pull request that relied on it.',
    );
    expect(again.status).toBe(0);
    expect(dispatches()).toHaveLength(1);
    expect(revocations(f)).toHaveLength(1);

    expect(relayRun(f, github).status).toBe(0);
    const enforced = rerun();
    expect(enforced.stdout).toMatch(/Enforced: CI posted a failing gate-check on pull request 7/);
    expect(enforced.stdout).not.toMatch(/records-validate was started/);
    expect(dispatches()).toHaveLength(1);
    expect(revocations(f)).toHaveLength(1);
  });
});
