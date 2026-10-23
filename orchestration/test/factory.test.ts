import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { BuildPlanOutput, DraftProvider, PlanningInput, PlanningProvider, Preparation, TechnicalOutput, WorkflowError, WorkflowService } from '../src/workflow.js';
import { buildExportPackage, evaluateDispatch, sha256Lf } from '../src/factory.js';
import type { DispatchLedgerEntry, DispatchRequest, FactoryExportPackage } from '../src/factory.js';
import { FakeFactoryRoute, PREREQUISITE_IDS } from './factory-fake.js';

const draft: DraftProvider = { async draft(input) { return { prdMarkdown: `# Equipment checkout\n${input.confirmedScope.join('\n')}`, mockupHtml: '<html><body><h1>Equipment</h1><button>Borrow</button></body></html>', proposals: [{ id: 'reservations', description: 'Reservations stay unaccepted.' }], findings: [] }; } };

function technical(input: PlanningInput): TechnicalOutput {
  return { markdown: '# Blueprint\nReact client, FastAPI service, PostgreSQL.', stack: 'React, FastAPI, PostgreSQL', layers: 3,
    requirements: [
      { id: 'EQ-06', description: 'A member borrows an available item; borrower and time are recorded.', authority: 'Confirmed scope; PRD checkout journey' },
      { id: 'EQ-09', description: 'Two concurrent checkouts leave exactly one active loan.', authority: 'Confirmed scope; PRD conflict clause' },
    ],
    decisions: (['architecture', 'testability', 'security', 'configuration', 'docker', 'production'] as const).map(topic => ({ topic, decision: `${topic}: proportionate to one internal app`, rationale: 'The confirmed scope has one database and no external service.' })), findings: [] };
}
function plan(input: PlanningInput): BuildPlanOutput {
  const requirements = input.technical!.requirements.map(r => r.id);
  return { markdown: '# Plan\nOne builder owns the loan endpoint.',
    evals: (['correctness', 'restraint', 'production'] as const).map((kind, i) => ({ id: `E${i + 1}`, requirements, kind, procedure: 'Exercise the checkout journey against the API and the database.', expected: 'One active loan; the second request conflicts.', evidence: 'automated' as const })),
    stories: [{ id: 'story-7', title: 'Checkout and return', requirements, evals: ['E1', 'E2', 'E3'], scope: ['api/loans.py', 'web/src/Loan.tsx'], dependsOn: [] }],
    coverage: requirements.map(requirementId => ({ requirementId, status: 'covered' as const, reason: 'story-7 and E1 to E3 exercise this requirement.' })), findings: [] };
}
const provider: PlanningProvider = { async technical(input) { return technical(input); }, async plan(input) { return plan(input); }, async review() { return { findings: [] }; } };
const mutate = (state: Preparation, operationId: string) => ({ expectedRevision: state.revision, operationId });

async function prepared(t: { after(fn: () => Promise<void>): void }, planningProvider = provider) {
  const dataDir = await mkdtemp(join(tmpdir(), 'factory-export-')); t.after(() => rm(dataDir, { recursive: true, force: true }));
  const service = new WorkflowService({ dataDir, provider: draft, planningProvider, executionLimitMs: 2000 });
  const created = await service.create({ idea: 'A shared-equipment checkout app', operationId: 'create' });
  const answered = await service.answer(created.id, { ...mutate(created, 'answer'), answer: 'A team member borrows one shared item and returns it.' });
  const drafted = await service.draft(created.id, mutate(answered, 'draft'));
  const authored = await service.technical(created.id, { ...mutate(drafted, 'technical'), preferences: 'React, FastAPI, PostgreSQL' });
  const selection = await service.acceptTechnical(created.id, { ...mutate(authored, 'select'), digest: authored.planning!.technical!.artifact.digest });
  const planned = await service.plan(created.id, mutate(selection, 'plan'));
  const completed = await service.reviewPlan(created.id, mutate(planned, 'review'));
  return { service, dataDir, state: completed };
}
const request = (pkg: FactoryExportPackage, operationId: string, story = 'story-7'): DispatchRequest =>
  ({ operationId, preparationRevision: pkg.preparationRevision, packageDigest: pkg.manifestDigest, story });
const code = (expected: string) => (error: unknown) => error instanceof WorkflowError && error.code === expected;

// 1. The exact reviewed package crosses the boundary, with nothing dropped.
test('export carries every requirement, eval, coverage row and story scope entry, and binds its own bytes', async t => {
  const { state } = await prepared(t);
  const pkg = buildExportPackage(state);
  assert.equal(pkg.authority, 'draft-only');
  assert.equal(pkg.approvalStatus, 'approval-channel-not-implemented');
  assert.deepEqual(pkg.requirements.map(r => r.id), ['EQ-06', 'EQ-09']);
  assert.deepEqual(pkg.evals.map(e => e.id), ['E1', 'E2', 'E3']);
  assert.deepEqual(pkg.coverage.map(c => c.requirementId), ['EQ-06', 'EQ-09']);
  assert.deepEqual(pkg.stories[0].scope, ['api/loans.py', 'web/src/Loan.tsx']);
  assert.deepEqual(pkg.stories[0].evals, ['E1', 'E2', 'E3']);
  assert.equal(pkg.decisions.length, 6);
  assert.deepEqual(pkg.sources, state.planning!.sources);
  assert.equal(pkg.artifacts.handoff.digest, state.planning!.handoff!.digest);
  assert.equal(pkg.technicalDecision.authority, 'local-review-only');
  // Planned procedures are declared as plans inside the package itself.
  assert.deepEqual(pkg.harness, { executableTestsAuthored: false, baselineRun: false, protectedByLock: false, note: pkg.harness.note });
  assert.match(pkg.harness.note, /planned procedures/i);
  // The manifest digest is a function of the content, recomputable by a reviewer.
  const { manifestDigest, ...body } = pkg;
  assert.equal(manifestDigest, sha256Lf(JSON.stringify(body, null, 2) + '\n'));
  assert.notEqual(manifestDigest, sha256Lf(JSON.stringify({ ...body, stack: 'Something else' }, null, 2) + '\n'));
});

// 1b. A package that would quietly lose scope or coverage is refused instead of exported.
test('export refuses a story without scope, a requirement without coverage, and an unresolved gap', async t => {
  // The existing plan validator already refuses an empty story scope, so planning never completes.
  const noScope: PlanningProvider = { ...provider, async plan(input) { const base = plan(input); return { ...base, stories: [{ ...base.stories[0], scope: [] }] }; } };
  await assert.rejects(() => prepared(t, noScope), code('PLAN_REQUIRED'));

  const { state } = await prepared(t);
  const widened = structuredClone(state);
  widened.planning!.plan!.stories[0].scope = [];
  assert.throws(() => buildExportPackage(widened), code('EXPORT_INCOMPLETE'));
  const missingCoverage = structuredClone(state);
  missingCoverage.planning!.plan!.coverage = missingCoverage.planning!.plan!.coverage.filter(row => row.requirementId !== 'EQ-09');
  assert.throws(() => buildExportPackage(missingCoverage), code('EXPORT_INCOMPLETE'));

  const gap = structuredClone(state);
  gap.planning!.plan!.coverage[0] = { requirementId: 'EQ-06', status: 'gap', reason: 'No decision about repeat requests.' };
  assert.throws(() => buildExportPackage(gap), code('EXPORT_INCOMPLETE'));

  const unreviewed = structuredClone(state);
  delete unreviewed.planning!.review;
  assert.throws(() => buildExportPackage(unreviewed), code('EXPORT_NOT_READY'));
  const interviewing = structuredClone(state);
  interviewing.interview = { status: 'needed', answers: [] };
  assert.throws(() => buildExportPackage(interviewing), code('EXPORT_NOT_READY'));
});

// 2. A missing approval or an unprotected harness refuses before anything is launched.
test('missing gate-3 approval or unprotected harness refuses, and launches nothing', async t => {
  const { state } = await prepared(t);
  const pkg = buildExportPackage(state);

  const noGate3 = new FakeFactoryRoute({ satisfied: PREREQUISITE_IDS.filter(id => id !== 'gate-3-approval' && id !== 'story-authorized') });
  const first = await noGate3.requestDispatch(request(pkg, 'op-1'), pkg);
  assert.equal(first.decision.outcome, 'waiting-for-user');
  assert.deepEqual(first.decision.blockedBy.map(p => p.id), ['gate-3-approval', 'story-authorized']);
  assert.equal(noGate3.executions.length, 0);

  const noHarness = new FakeFactoryRoute({ satisfied: PREREQUISITE_IDS.filter(id => id !== 'harness-authored') });
  const second = await noHarness.requestDispatch(request(pkg, 'op-2'), pkg);
  assert.equal(second.decision.outcome, 'blocked');
  assert.deepEqual(second.decision.blockedBy.map(p => p.id), ['harness-authored']);
  assert.equal(noHarness.executions.length, 0);

  const noLock = new FakeFactoryRoute({ satisfied: PREREQUISITE_IDS.filter(id => id !== 'harness-protected' && id !== 'test-command-locked') });
  const third = await noLock.requestDispatch(request(pkg, 'op-3'), pkg);
  assert.equal(third.decision.outcome, 'waiting-for-user');
  assert.equal(noLock.executions.length, 0);
  assert.match(third.decision.blockedBy.map(p => p.humanAction).join(' '), /harness-protected|test-command-locked/);
});

// 3. Changed bytes invalidate the authorization rather than riding on the old review.
test('a changed package, revision or story refuses, and a later revision cannot reuse the old digest', async t => {
  const { service, state } = await prepared(t);
  const pkg = buildExportPackage(state);
  const route = new FakeFactoryRoute();

  const wrongDigest = await route.requestDispatch({ ...request(pkg, 'op-digest'), packageDigest: sha256Lf('something else') }, pkg);
  assert.equal(wrongDigest.decision.outcome, 'blocked');
  assert.match(wrongDigest.decision.reasons.join(' '), /does not match the reviewed package/);

  const wrongRevision = await route.requestDispatch({ ...request(pkg, 'op-revision'), preparationRevision: pkg.preparationRevision + 1 }, pkg);
  assert.equal(wrongRevision.decision.outcome, 'blocked');
  assert.match(wrongRevision.decision.reasons.join(' '), /revision/);

  const unknownStory = await route.requestDispatch(request(pkg, 'op-story', 'story-99'), pkg);
  assert.equal(unknownStory.decision.outcome, 'blocked');
  assert.match(unknownStory.decision.reasons.join(' '), /no story story-99/);
  assert.equal(route.executions.length, 0);

  // A real upstream change clears planning, so the old package can no longer be produced at all.
  const revised = await service.requestChanges(state.id, { ...mutate(state, 'changes'), feedback: 'Add an out-of-service state to the detail screen.' });
  assert.equal(revised.planning, undefined);
  assert.throws(() => buildExportPackage(revised), code('EXPORT_NOT_READY'));
  const afterChange = await route.requestDispatch(request(pkg, 'op-after-change'), pkg);
  assert.equal(afterChange.decision.outcome, 'ready', 'the fixture route still authorizes the old package');
  assert.equal(route.executions.length, 1, 'which is exactly why the service must refuse to export it');
});

// 4. One authorized request is one execution; a replay or an unresolved attempt adds none.
test('one request yields one execution, a replay reports the same result, and an uncertain attempt refuses a retry', async t => {
  const { state } = await prepared(t);
  const pkg = buildExportPackage(state);

  const route = new FakeFactoryRoute();
  const first = await route.requestDispatch(request(pkg, 'op-once'), pkg);
  assert.equal(first.decision.outcome, 'ready');
  assert.equal(route.executions.length, 1);
  const replay = await route.requestDispatch(request(pkg, 'op-once'), pkg);
  assert.equal(route.executions.length, 1, 'a replayed operation id must not start a second builder');
  assert.equal(replay.decision.existing?.factoryRef, first.entry!.factoryRef);
  assert.match(replay.decision.reasons.join(' '), /already requested/);

  const uncertain = new FakeFactoryRoute({ result: 'uncertain' });
  const attempt = await uncertain.requestDispatch(request(pkg, 'op-uncertain'), pkg);
  assert.equal(attempt.decision.outcome, 'uncertain');
  assert.equal(uncertain.executions.length, 1);
  const retry = await uncertain.requestDispatch(request(pkg, 'op-retry'), pkg);
  assert.equal(retry.decision.outcome, 'uncertain');
  assert.equal(uncertain.executions.length, 1, 'a retry while an attempt is unresolved must reconcile, not dispatch');
  assert.match(retry.decision.reasons.join(' '), /Reconcile it against the factory/);
});

// 5. Failure is reported as failure; success cites the factory's own reference.
test('failure is reported as failure and success cites the factory reference and candidate', async t => {
  const { state } = await prepared(t);
  const pkg = buildExportPackage(state);

  const failing = new FakeFactoryRoute({ result: 'failed' });
  const failed = await failing.requestDispatch(request(pkg, 'op-fail'), pkg);
  assert.equal(failed.decision.outcome, 'failed');
  assert.equal(failed.entry!.status, 'failed');
  assert.match(failed.decision.reasons.join(' '), /failed on candidate/);

  const passing = new FakeFactoryRoute({ result: 'succeeded', candidate: 'cand-abcdef123456' });
  const ok = await passing.requestDispatch(request(pkg, 'op-pass'), pkg);
  assert.equal(ok.decision.outcome, 'ready');
  assert.equal(ok.entry!.factoryRef, 'fixture-run-1');
  assert.match(ok.decision.reasons.join(' '), /cand-abcdef123456/);
  assert.match(ok.decision.reasons.join(' '), /not from an agent's account/);
});

// The decision function on its own, with no adapter at all.
test('evaluateDispatch refuses by default and never reports ready on an unproven route', async t => {
  const { state } = await prepared(t);
  const pkg = buildExportPackage(state);
  const ready = await new FakeFactoryRoute().inspect('story-7');
  const ledger: DispatchLedgerEntry[] = [];

  assert.equal(evaluateDispatch({ state: ready, pkg, request: request(pkg, 'op'), ledger }).outcome, 'ready');
  assert.equal(evaluateDispatch({ state: { ...ready, outcome: 'uncertain', summary: 'records unreadable' }, pkg, request: request(pkg, 'op'), ledger }).outcome, 'uncertain');
  assert.equal(evaluateDispatch({ state: { ...ready, outcome: 'failed', summary: 'git failed' }, pkg, request: request(pkg, 'op'), ledger }).outcome, 'failed');

  const succeeded: DispatchLedgerEntry[] = [{ operationId: 'earlier', packageDigest: sha256Lf('older package'), story: 'story-7', requestedAt: '2026-10-19T00:00:00Z', status: 'succeeded', factoryRef: 'run-0' }];
  const changed = evaluateDispatch({ state: ready, pkg, request: request(pkg, 'op-new'), ledger: succeeded });
  assert.equal(changed.outcome, 'blocked');
  assert.match(changed.reasons.join(' '), /already ran against a different reviewed package/);
});

test('tampered package content with matching claimed digests refuses before any fixture execution', async t => {
  const { state } = await prepared(t);
  const pkg = buildExportPackage(state);
  const altered = structuredClone(pkg);
  altered.stories[0].scope.push('unapproved/**');
  const route = new FakeFactoryRoute();
  const refused = await route.requestDispatch(request(altered, 'tampered-scope'), altered);
  assert.equal(altered.manifestDigest, pkg.manifestDigest, 'the original digest claim is retained');
  assert.equal(refused.decision.outcome, 'blocked');
  assert.match(refused.decision.reasons.join(' '), /content does not match its manifest digest/);
  assert.equal(route.executions.length, 0);
});

test('blocked and waiting routes cannot fall through to ready with empty or satisfied prerequisites', async t => {
  const { state } = await prepared(t);
  const pkg = buildExportPackage(state);
  const ready = await new FakeFactoryRoute().inspect('story-7');
  for (const outcome of ['blocked', 'waiting-for-user'] as const) {
    for (const prerequisites of [[], ready.prerequisites]) {
      const decision = evaluateDispatch({ state: { ...ready, outcome, prerequisites, summary: `route says ${outcome}` }, pkg, request: request(pkg, outcome), ledger: [] });
      assert.equal(decision.outcome, outcome);
      assert.match(decision.reasons.join(' '), new RegExp(`route says ${outcome}`));
    }
  }
  const nonAuthority = evaluateDispatch({ state: { ...ready, authority: 'non-authoritative' }, pkg, request: request(pkg, 'cached'), ledger: [] });
  assert.equal(nonAuthority.outcome, 'blocked', 'cached diagnostics cannot become permission even if mislabeled ready');
});
