import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  effectiveLock,
  gateCheck,
  hashBytes,
  hashText,
  loadRecords,
  run,
  type CheckResultRecord,
  type FactoryRecord,
} from '../src/index.js';
import {
  CONFIG,
  CONFIG_V0,
  CONFIG_V1,
  TEST_COMMAND,
  amendableProject,
  amendedPullRequest,
  approvedChange,
  ciCheck,
  ciProject,
  job,
  mergeApproval,
  plantApproval,
  plantGate3,
  plantLock,
  plantVerify,
  readManifest,
  subjectAt,
  treeAt,
  type CiFixture,
} from './support/ci.js';
import { CLASSIFICATION_RECORD, confirms, human, project } from './support/project.js';
import { AGENT, revocation, stored } from './support/records.js';
import { RUNNER_EMAIL, sh, tempDir, type Fixture } from './support/repo.js';

const RUN = [
  '--run-id',
  '4242',
  '--run-url',
  'https://github.com/example/project/actions/runs/4242',
];

function verifyRun(f: Fixture, pr: number, head: string, extraEnv: Record<string, string> = {}) {
  const bundle = tempDir();
  const subject = subjectAt(f, pr);
  const result = job(
    f.work,
    ['verify', '--pr', String(pr), '--head', head, '--subject', subject, '--bundle', bundle],
    extraEnv,
  );
  return { ...result, bundle };
}

function verifyRecord(f: Fixture, pr: number, head: string, bundle: string, conclusion: string) {
  return job(f.work, [
    'verify-record',
    '--pr',
    String(pr),
    '--head',
    head,
    '--bundle',
    bundle,
    '--verify-result',
    conclusion,
    ...RUN,
  ]);
}

function checkResults(f: Fixture): CheckResultRecord[] {
  return loadRecords(f.work)
    .records.map((s) => s.record)
    .filter((r): r is CheckResultRecord => r.recordType === 'check-result');
}

const lockGuard = (f: Fixture, pr: number, head: string) =>
  job(f.work, ['lock-guard', '--pr', String(pr), '--head', head]);
const gate = (f: Fixture, pr: number, head: string) =>
  job(f.work, ['gate-check', '--pr', String(pr), '--head', head]);

/** A locked fixture project and one clean pull request against it. */
function lockedWithPullRequest(): { f: CiFixture; head: string; tree: string } {
  const f = ciProject();
  plantLock(f);
  const head = f.pullRequest(7, { 'src/app.js': 'export const app = 1;\n' });
  return { f, head, tree: treeAt(f, head) };
}

describe('ci lock-guard', () => {
  it('T-06-P10 [M0] a pull request that changes no locked path passes', () => {
    const { f, head } = lockedWithPullRequest();
    const result = lockGuard(f, 7, head);
    expect(result.out).toMatch(/enforcing copy: commit [0-9a-f]{40}/);
    expect(result.out).toMatch(
      /lock-guard passes: pull request 7 at [0-9a-f]{12} changes no locked path/,
    );
    expect(result.status).toBe(0);
  });

  it('T-06-N2 [M0] a commit that changes a locked test without an amendment fails, naming the test', () => {
    const f = ciProject();
    plantLock(f);
    const head = f.pullRequest(7, { 'packages/cli/test/a.test.ts': "it('weakened', () => {});\n" });
    const result = lockGuard(f, 7, head);
    expect(result.out).toMatch(
      /packages\/cli\/test\/a\.test\.ts is locked, and pull request 7 changes it without an amendment approval bound to its head tree/,
    );
    expect(result.out).toMatch(
      /pod-factory approve amendment --pr 7 packages\/cli\/test\/a\.test\.ts/,
    );
    expect(result.status).toBe(1);
  });

  it('T-06-N3 [M0] the lockfile, runner configuration and workflows are protected too', () => {
    const f = ciProject();
    plantLock(f);
    const head = f.pullRequest(7, {
      'package-lock.json': '{"lockfileVersion": 3, "packages": {"evil": {}}}\n',
      'packages/cli/vitest.config.ts': 'export default { test: { passWithNoTests: true } };\n',
      '.github/workflows/pr-checks.yml': 'name: pr-checks\non: push\n',
    });
    const result = lockGuard(f, 7, head);
    for (const path of [
      'package-lock.json',
      'packages/cli/vitest.config.ts',
      '.github/workflows/pr-checks.yml',
    ]) {
      expect(result.out).toContain(`${path} is locked, and pull request 7 changes it`);
    }
    expect(result.status).toBe(1);
  });

  it('T-06-N9 [M0] adding a file under a locked folder is a change and fails without an amendment', () => {
    const f = ciProject();
    plantLock(f);
    const head = f.pullRequest(7, { 'packages/cli/test/extra.test.ts': "it('new', () => {});\n" });
    const result = lockGuard(f, 7, head);
    expect(result.out).toMatch(
      /packages\/cli\/test\/extra\.test\.ts is locked, and pull request 7 changes it/,
    );
    expect(result.status).toBe(1);
  });

  it('fails every pull request, naming the path, when main holds locked content nobody approved', () => {
    const { f, head } = lockedWithPullRequest();
    f.commitToMain({ 'packages/cli/test/a.test.ts': "it('pushed past the lock', () => {});\n" });
    const result = lockGuard(f, 7, head);
    expect(result.out).toMatch(
      /packages\/cli\/test\/a\.test\.ts on main holds content that neither the lock nor any amendment approved/,
    );
    expect(result.status).toBe(1);
  });

  it('passes while nothing is locked, saying so', () => {
    const f = ciProject();
    const head = f.pullRequest(7, { 'packages/cli/test/a.test.ts': 'changed\n' });
    const result = lockGuard(f, 7, head);
    expect(result.out).toMatch(
      /lock-guard passes: nothing is locked yet \(no valid lock on the records branch\)/,
    );
    expect(result.status).toBe(0);
  });
});

describe('ci lock-guard with amendments approved through the CLI', () => {
  async function lockedProject(): Promise<Fixture> {
    const f = project();
    expect(
      await run(
        ['approve', '2', '--classification', CLASSIFICATION_RECORD],
        human(f.work, confirms('2')),
      ),
    ).toBe(0);
    expect(await run(['lock'], human(f.work))).toBe(0);
    return f;
  }
  const amend = async (f: Fixture, pr: number, path: string) =>
    run(['approve', 'amendment', '--pr', String(pr), path], human(f.work, confirms('amendment')));

  it('T-06-P7 [M0] an amendment approval bound to the head lets a locked change pass', async () => {
    const f = await lockedProject();
    const path = 'packages/cli/test/approve.test.ts';
    const head = f.pullRequest(9, { [path]: "it('T-03-N4 [M0] amended', () => {});\n" });
    expect(await amend(f, 9, path)).toBe(0);
    const result = lockGuard(f, 9, head);
    expect(result.out).toContain(
      `${path}: changed under an amendment approval bound to this head.`,
    );
    expect(result.status).toBe(0);
  });

  it('T-06-N6 [M0] the same locked change without an amendment fails', async () => {
    const f = await lockedProject();
    const path = 'packages/cli/test/approve.test.ts';
    const head = f.pullRequest(9, { [path]: "it('T-03-N4 [M0] amended', () => {});\n" });
    const result = lockGuard(f, 9, head);
    expect(result.out).toContain(
      `${path} is locked, and pull request 9 changes it without an amendment`,
    );
    expect(result.status).toBe(1);
  });

  it('accepts two amendments to the same path in sequence', async () => {
    const f = await lockedProject();
    const path = 'packages/cli/test/approve.test.ts';
    const first = "it('T-03-N4 [M0] first amendment', () => {});\n";
    const second = "it('T-03-N4 [M0] second amendment', () => {});\n";

    const head9 = f.pullRequest(9, { [path]: first });
    expect(await amend(f, 9, path)).toBe(0);
    expect(lockGuard(f, 9, head9).status).toBe(0);
    f.commitToMain({ [path]: first }, 'merge pull request 9');

    const head10 = f.pullRequest(10, { [path]: second });
    expect(await amend(f, 10, path)).toBe(0);
    const result = lockGuard(f, 10, head10);
    expect(result.out).toMatch(/with 2 amendments applied/);
    expect(result.out).toContain(
      `${path}: changed under an amendment approval bound to this head.`,
    );
    expect(result.status).toBe(0);
  });
});

// The locked-path rule judges what a merge leaves on main (ADR-015): a path the pull request
// changes gates on what is locked now, a path it leaves alone gates on main holding content this
// lock has approved. Each test below pins one half against being unified with the other.
describe('the locked-path rule, changed and untouched paths', () => {
  it('T-06-P12 [M0] an approved amendment whose pull request has not merged does not block a pull request that leaves the path alone', () => {
    const { f, lock } = amendableProject();
    const pending = amendedPullRequest(f, lock, 7, CONFIG_V0, CONFIG_V1);
    expect(effectiveLock(loadRecords(f.work))?.hashes.get(CONFIG)).toBe(hashText(CONFIG_V1));

    const other = approvedChange(f, 9, { 'src/app.js': 'export const app = 9;\n' });
    const guarded = ciCheck(f, 'lock-guard', 9, other);
    expect(guarded.out).toMatch(
      /lock-guard passes: pull request 9 at [0-9a-f]{12} changes no locked path/,
    );
    expect(guarded.status).toBe(0);
    const gated = ciCheck(f, 'gate-check', 9, other);
    expect(gated.out).toMatch(/gate-check passes for pull request 9/);
    expect(gated.status).toBe(0);
    expect(ciCheck(f, 'gate-check', 7, pending.head).status).toBe(0);
  });

  it('T-06-N11 [M0] changing a locked path back to a version the lock once approved, but not what is locked now, still needs an amendment', () => {
    const { f, lock } = amendableProject();
    amendedPullRequest(f, lock, 7, CONFIG_V0, CONFIG_V1);
    f.commitToMain({ 'src/app.js': 'export const app = 7;\n', [CONFIG]: CONFIG_V1 }, 'merge 7');
    const held = effectiveLock(loadRecords(f.work))?.held.get(CONFIG);
    expect(held).toEqual([hashText(CONFIG_V0), hashText(CONFIG_V1)]);

    const older = approvedChange(f, 9, { [CONFIG]: CONFIG_V0 });
    const gated = ciCheck(f, 'gate-check', 9, older);
    expect(gated.out).toContain(
      `${CONFIG} is locked, and pull request 9 changes it without an amendment approval bound to its head tree`,
    );
    expect(gated.out).not.toMatch(/changed to exactly what is locked now/);
    expect(gated.status).toBe(1);
  });
});

describe('ci verify and verify-record', () => {
  it('T-06-P2 [M0] a clean commit passes verify, with evidence tied to that exact content', () => {
    const { f, head, tree } = lockedWithPullRequest();
    const verified = verifyRun(f, 7, head);
    expect(verified.out).toMatch(/verify passes: 1 of 1 commands passed for pull request 7/);
    expect(verified.status).toBe(0);
    const manifest = readManifest(verified.bundle);
    expect(manifest).toMatchObject({
      pullRequest: 7,
      headCommit: head,
      headTree: tree,
      verdict: 'pass',
    });
    expect(manifest.enforcingCommit).toBe(sh(f.work, ['rev-parse', 'HEAD']));
    expect(manifest.reports.map((r) => r.path)).toEqual(['reports/cli.json']);

    const recorded = verifyRecord(f, 7, head, verified.bundle, 'success');
    expect(recorded.out).toMatch(/wrote a passing check result for pull request 7/);
    expect(recorded.status).toBe(0);
    const [result] = checkResults(f);
    expect(result).toMatchObject({ outcome: 'pass', binds: { tree } });
    expect(result?.checkResult.bundleManifestSha256).toBe(
      hashBytes(readFileSync(join(verified.bundle, 'manifest.json'))),
    );
  });

  it('T-06-P4 [M0] the locked command runs exactly as locked', () => {
    const { f, head } = lockedWithPullRequest();
    const verified = verifyRun(f, 7, head);
    const manifest = readManifest(verified.bundle);
    expect(manifest.commands.map((c) => c.command)).toEqual([TEST_COMMAND]);
    expect(readFileSync(join(verified.bundle, 'logs/1.log'), 'utf8')).toContain(
      'ran with --locked; result pass',
    );
    expect(verified.out).toMatch(/Test commands from lock [0-9a-f]{12}, exactly as locked\./);
  });

  it("T-06-N4 [M0] a branch's own test script is ignored", () => {
    const f = ciProject();
    plantLock(f);
    const head = f.pullRequest(7, {
      'package.json': '{"name": "fixture", "scripts": {"test": "echo all good"}}\n',
      'src/result.txt': 'fail\n',
    });
    const verified = verifyRun(f, 7, head);
    expect(readFileSync(join(verified.bundle, 'logs/1.log'), 'utf8')).toContain('result fail');
    expect(verified.out).toMatch(/verify fails: 0 of 1 commands passed/);
    expect(verified.status).toBe(1);
  });

  it('T-09-P9 [M0] the record-writing job pushes the check result, committed as the check runner', () => {
    const { f, head } = lockedWithPullRequest();
    const verified = verifyRun(f, 7, head);
    expect(verifyRecord(f, 7, head, verified.bundle, 'success').status).toBe(0);
    const results = checkResults(f);
    expect(results).toHaveLength(1);
    expect(sh(f.remote, ['log', '-1', '--format=%ce', 'pod-factory/records'])).toBe(RUNNER_EMAIL);
    expect(loadRecords(f.work).flagged).toEqual([]);
  });

  it('T-09-N12 [M0] test code in the verify job sees no token, so it cannot push a check result', () => {
    const { f, head } = lockedWithPullRequest();
    const verified = verifyRun(f, 7, head, {
      GITHUB_TOKEN: 'ghs_example',
      ACTIONS_RUNTIME_TOKEN: 'runtime',
      GH_TOKEN: 'gh_example',
    });
    const log = readFileSync(join(verified.bundle, 'logs/1.log'), 'utf8');
    expect(log).toContain('ran with --locked');
    expect(log).toContain('tokens visible to test code: none');
    expect(checkResults(f)).toEqual([]);
  });

  it("writes a failing record when the verify job failed, even if the bundle's manifest says pass", () => {
    const { f, head } = lockedWithPullRequest();
    const verified = verifyRun(f, 7, head);
    const recorded = verifyRecord(f, 7, head, verified.bundle, 'failure');
    expect(recorded.out).toMatch(/wrote a failing check result/);
    expect(recorded.out).toMatch(/the verify job concluded "failure"/);
    expect(checkResults(f).map((r) => r.outcome)).toEqual(['fail']);
  });

  it('writes a failing record when a bundle file does not match its manifest hash', () => {
    const { f, head } = lockedWithPullRequest();
    const verified = verifyRun(f, 7, head);
    writeFileSync(join(verified.bundle, 'logs/1.log'), 'doctored\n');
    const recorded = verifyRecord(f, 7, head, verified.bundle, 'success');
    expect(recorded.out).toMatch(/logs\/1\.log does not match its hash in the manifest/);
    expect(checkResults(f).map((r) => r.outcome)).toEqual(['fail']);
  });

  it('writes nothing when the verify job left no bundle', () => {
    const { f, head } = lockedWithPullRequest();
    const recorded = verifyRecord(f, 7, head, tempDir(), 'failure');
    expect(recorded.out).toMatch(/left no evidence bundle, so no check result was written/);
    expect(recorded.status).toBe(1);
    expect(checkResults(f)).toEqual([]);
  });

  it('before the first lock, runs the enforcing copy section-4 commands, never the branch scripts', () => {
    const f = ciProject();
    const head = f.pullRequest(7, { 'src/app.js': 'export const app = 1;\n' });
    const verified = verifyRun(f, 7, head);
    expect(verified.out).toMatch(
      /No lock yet: test commands from the enforcing copy's section-4 list/,
    );
    expect(readManifest(verified.bundle).commands.map((c) => c.command)).toEqual(['npm ci']);
  });
});

describe('ci gate-check', () => {
  function approvedAndVerified(kind: 'story' | 'bootstrap' = 'story') {
    const f = ciProject({ story: true });
    plantLock(f);
    plantGate3(f);
    const head = f.pullRequest(7, { 'src/app.js': 'export const app = 1;\n' });
    const tree = treeAt(f, head);
    const approval = plantApproval(f, kind, 7, tree);
    const result = plantVerify(f, 7, tree);
    return { f, head, tree, approval, result };
  }

  it('T-10-P1 [M0] passes with an approval and a passing verify bound to the head tree', () => {
    const { f, head, approval } = approvedAndVerified();
    const result = gate(f, 7, head);
    expect(result.out).toMatch(/gate-check passes for pull request 7/);
    expect(result.out).toContain(`Approval ${approval.recordId} by Test Human`);
    expect(result.status).toBe(0);
  });

  it('T-10-N1 [M0] fails after one more commit, until a new review and approval cover it', () => {
    const { f, approval } = approvedAndVerified();
    const moved = f.pullRequest(7, { 'src/app.js': 'export const app = 2;\n' });
    plantVerify(f, 7, treeAt(f, moved));
    const result = gate(f, 7, moved);
    expect(result.out).toContain(`Approval ${approval.recordId} binds tree`);
    expect(result.out).toMatch(
      /the pull request changed after it was approved, so it needs a new review and approval/,
    );
    expect(result.status).toBe(1);
  });

  it('T-10-P2 [M0] a verify result citing its bundle for this tree is accepted', () => {
    const { f, head, result: verified } = approvedAndVerified();
    const result = gate(f, 7, head);
    expect(result.out).toContain(
      `verify result ${verified.recordId} (run ${verified.checkResult.runUrl}`,
    );
    expect(result.status).toBe(0);
  });

  it('T-10-N2 [M0] "tests passed" with no verify bundle for this tree is rejected, and the claim is named', () => {
    const { f, head, tree } = lockedWithPullRequest();
    plantApproval(f, 'story', 7, tree);
    plantVerify(f, 7, treeAt(f, f.main));
    const forged = plantVerify(f, 7, tree, { by: 'human' });
    const result = gate(f, 7, head);
    expect(result.out).toMatch(
      /There is no verify result for tree [0-9a-f]{12}\. "Tests passed" counts only with the verify run's own evidence bundle/,
    );
    expect(result.out).toMatch(
      new RegExp(
        `${forged.recordId}\\.json is a check result committed by human@example\\.test, not by the check runner`,
      ),
    );
    expect(result.status).toBe(1);
  });

  it('T-10-N3 [M0] no approval, an invalid approval or a foreign approval blocks merge', () => {
    const none = lockedWithPullRequest();
    plantVerify(none.f, 7, none.tree);
    expect(gate(none.f, 7, none.head).out).toMatch(
      /There is no approval for pull request 7 at tree/,
    );
    expect(gate(none.f, 7, none.head).status).toBe(1);

    const invalid = lockedWithPullRequest();
    plantVerify(invalid.f, 7, invalid.tree);
    const agentWritten = { ...mergeApproval('story', 7, invalid.tree), actor: AGENT };
    invalid.f.plant(
      Object.fromEntries([stored(agentWritten as FactoryRecord, 'pr-7')]),
      'agent approval',
    );
    plantApproval(invalid.f, 'story', 7, invalid.tree, { by: 'runner' });
    const invalidRun = gate(invalid.f, 7, invalid.head);
    expect(invalidRun.out).toMatch(/2 flagged records were ignored/);
    expect(invalidRun.out).toMatch(/committed by the check runner/);
    expect(invalidRun.out).toMatch(/There is no approval for pull request 7/);
    expect(invalidRun.status).toBe(1);

    const foreign = lockedWithPullRequest();
    plantVerify(foreign.f, 7, foreign.tree);
    plantApproval(foreign.f, 'story', 8, foreign.tree);
    expect(gate(foreign.f, 7, foreign.head).out).toMatch(/There is no approval for pull request 7/);
    expect(gate(foreign.f, 7, foreign.head).status).toBe(1);
  });

  it('T-10-P3 [M0] when main moves, the approval still holds and verify re-runs without re-review', () => {
    const { f, head } = approvedAndVerified();
    f.commitToMain({ 'docs/notes.md': 'unrelated\n' }, 'main moves');
    sh(f.work, ['pull', '--quiet', 'origin', 'main']);
    expect(verifyRun(f, 7, head).status).toBe(0);
    const result = gate(f, 7, head);
    expect(result.out).toMatch(/gate-check passes for pull request 7/);
    expect(result.status).toBe(0);
  });

  it('T-22-N7 [M0] a run that started before a revocation landed cannot report a pass after it', () => {
    const { f, head, approval } = approvedAndVerified();
    const io = human(f.work);
    const code = gateCheck(['--pr', '7', '--head', head], io, {
      afterRead: (attempt) => {
        if (attempt === 0)
          f.plant(Object.fromEntries([stored(revocation(approval.recordId), approval.recordId)]));
      },
    });
    expect(io.lines.join('\n')).toMatch(
      /The records branch moved from [0-9a-f]{12} to [0-9a-f]{12} during this run; evaluating again\./,
    );
    expect(io.lines.join('\n')).toMatch(/gate-check fails for pull request 7/);
    expect(code).toBe(1);
  });

  it('counts a bootstrap approval before the first lock and not after', () => {
    const f = ciProject();
    const head = f.pullRequest(7, { 'src/app.js': 'export const app = 1;\n' });
    const tree = treeAt(f, head);
    plantApproval(f, 'bootstrap', 7, tree);
    plantVerify(f, 7, tree);
    expect(gate(f, 7, head).status).toBe(0);
    plantLock(f);
    const after = gate(f, 7, head);
    expect(after.out).toMatch(/are bootstrap approvals, which stop counting once the lock exists/);
    expect(after.status).toBe(1);
  });
});

describe('ci jobs without a records branch', () => {
  it('verify, verify-record and gate-check fail closed in plain language; lock-guard passes', () => {
    const f = ciProject({ recordsBranch: false });
    const head = f.pullRequest(7, { 'src/app.js': 'export const app = 1;\n' });
    const closed =
      /fails: the records branch pod-factory\/records does not exist, so there is no approval or check result to check against/;
    expect(gate(f, 7, head).err).toMatch(closed);
    expect(gate(f, 7, head).status).toBe(1);
    expect(verifyRun(f, 7, head).err).toMatch(closed);
    expect(verifyRecord(f, 7, head, tempDir(), 'success').err).toMatch(closed);
    expect(lockGuard(f, 7, head).out).toMatch(
      /nothing is locked yet \(the records branch does not exist\)/,
    );
  });
});
