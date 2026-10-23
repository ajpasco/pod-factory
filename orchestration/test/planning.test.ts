import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { BuildPlanOutput, DraftProvider, PlanningInput, PlanningProvider, Preparation, TechnicalOutput, WorkflowError, WorkflowService } from '../src/workflow.js';
import { validateBuildPlan } from '../src/planning.js';

const draft: DraftProvider = { async draft(input) { return { prdMarkdown: `# Requirements\n${input.confirmedScope.join('\n')}`, mockupHtml: '<html><button>Open modal</button></html>', proposals: [], findings: [] }; } };
function technical(input: PlanningInput): TechnicalOutput {
  return { markdown: '# Blueprint\nOne local browser page.', stack: input.preferences || 'TypeScript browser page', layers: 1,
    requirements: input.confirmedScope.map((description, i) => ({ id: `R${i + 1}`, description, authority: `Confirmed scope ${i + 1}; PRD` })),
    decisions: ['architecture', 'testability', 'security', 'configuration', 'docker', 'production'].map(topic => ({ topic: topic as TechnicalOutput['decisions'][number]['topic'], decision: 'One local page; no services or secrets.', rationale: 'Proportionate to the confirmed modal scope.' })), findings: [] };
}
function plan(input: PlanningInput): BuildPlanOutput {
  const requirements = input.technical!.requirements.map(r => r.id);
  return { markdown: '# Plan\nImplement and review the modal.',
    evals: ['correctness', 'restraint', 'production'].map((kind, i) => ({ id: `E${i + 1}`, requirements, kind: kind as BuildPlanOutput['evals'][number]['kind'], procedure: 'Open the page and exercise the confirmed modal journey.', expected: 'The modal works, has no unrequested scope, and needs no services.', evidence: 'review' })),
    stories: [{ id: 'S1', title: 'Build the modal', requirements, evals: ['E1', 'E2', 'E3'], scope: ['src/index.ts'], dependsOn: [] }],
    coverage: requirements.map(requirementId => ({ requirementId, status: 'covered', reason: 'Story S1 and its evals exercise this requirement.' })), findings: [] };
}
const provider: PlanningProvider = { async technical(input) { return technical(input); }, async plan(input) { return plan(input); }, async review() { return { findings: [] }; } };
async function setup(t: { after(fn: () => Promise<void>): void }, planningProvider = provider) {
  const dataDir = await mkdtemp(join(tmpdir(), 'orchestration-planning-')); t.after(() => rm(dataDir, { recursive: true, force: true }));
  const service = new WorkflowService({ dataDir, provider: draft, planningProvider, executionLimitMs: 1000 });
  const created = await service.create({ idea: 'A modal demonstration', operationId: 'create' });
  const answered = await service.answer(created.id, { expectedRevision: created.revision, operationId: 'answer', answer: 'A visitor opens and closes one modal.' });
  const state = await service.draft(created.id, { expectedRevision: answered.revision, operationId: 'draft' });
  return { service, dataDir, state };
}
const mutate = (state: Preparation, operationId: string) => ({ expectedRevision: state.revision, operationId });
async function selected(service: WorkflowService, state: Preparation) {
  const authored = await service.technical(state.id, { ...mutate(state, 'technical'), preferences: 'TypeScript, one page' });
  return service.acceptTechnical(state.id, { ...mutate(authored, 'select'), digest: authored.planning!.technical!.artifact.digest });
}
const code = (expected: string) => (error: unknown) => error instanceof WorkflowError && error.code === expected;

test('technical selection, eval/story plan and independent review yield draft-only handoff bound to exact sources', async t => {
  const inputs: { kind: string; input: PlanningInput }[] = [];
  const capturing: PlanningProvider = { async technical(input) { inputs.push({ kind: 'technical', input }); return technical(input); }, async plan(input) { inputs.push({ kind: 'plan', input }); return plan(input); }, async review(input) { inputs.push({ kind: 'review', input }); return { findings: [] }; } };
  const { service, dataDir, state } = await setup(t, capturing);
  const selection = await selected(service, state);
  assert.equal(selection.planning!.technicalDecision!.authority, 'local-review-only');
  const planned = await service.plan(state.id, mutate(selection, 'plan'));
  assert.equal(planned.planning!.phase, 'plan-review'); assert.equal(planned.planning!.handoff, undefined);
  const completed = await service.reviewPlan(state.id, mutate(planned, 'review'));
  assert.equal(completed.planning!.phase, 'planning-complete'); assert.equal(completed.stage, 'review');
  const handoff = JSON.parse(await service.readArtifact(state.id, 'handoff'));
  assert.equal(handoff.authority, 'draft-only'); assert.equal(handoff.dispatchReady, false); assert.equal(handoff.approvalStatus, 'approval-channel-not-implemented');
  assert.deepEqual(handoff.sources.prd, state.artifacts.prd); assert.deepEqual(handoff.sources.mockup, state.artifacts.mockup);
  assert.equal(handoff.technical.digest, selection.planning!.technicalDecision!.digest);
  assert.equal(handoff.remainingBlockers.length, 4); assert.match(completed.blockers.join(' '), /acceptance test|Trusted gate|dispatch/);
  assert.equal(inputs[2].kind, 'review'); assert.ok(inputs[2].input.plan); assert.equal(inputs[2].input.feedback, undefined);
  assert.deepEqual(inputs[0].input.confirmedScope, state.confirmedScope); assert.equal(inputs[0].input.prdMarkdown, await service.readArtifact(state.id, 'prd'));
  const restarted = new WorkflowService({ dataDir, provider: draft, planningProvider: provider });
  assert.equal((await restarted.get(state.id)).planning!.phase, 'planning-complete');
  assert.match(await restarted.readArtifact(state.id, 'technical'), /Structured planning evidence/);
});

test('selection refuses wrong digest, no selection refuses planning, and PRD changes invalidate all planning', async t => {
  const { service, state } = await setup(t);
  await assert.rejects(service.plan(state.id, mutate(state, 'early-plan')), code('TECHNICAL_REQUIRED'));
  const authored = await service.technical(state.id, { ...mutate(state, 'technical'), preferences: '' });
  await assert.rejects(service.plan(state.id, mutate(authored, 'unselected')), code('TECHNICAL_SELECTION_REQUIRED'));
  await assert.rejects(service.acceptTechnical(state.id, { ...mutate(authored, 'bad-selection'), digest: '0'.repeat(64) }), code('STALE_TECHNICAL'));
  const selection = await service.acceptTechnical(state.id, { ...mutate(authored, 'selection'), digest: authored.planning!.technical!.artifact.digest });
  const oldPlan = await service.plan(state.id, mutate(selection, 'old-plan'));
  const oldComplete = await service.reviewPlan(state.id, mutate(oldPlan, 'old-review'));
  const changed = await service.requestChanges(state.id, { ...mutate(oldComplete, 'scope-change'), feedback: 'Add a visible close label.' });
  assert.equal(changed.planning, undefined);
  await assert.rejects(service.readArtifact(state.id, 'handoff'), code('ARTIFACT_NOT_FOUND'));
  await assert.rejects(service.readArtifact(state.id, 'build-plan'), code('ARTIFACT_NOT_FOUND'));
  await assert.rejects(service.plan(state.id, mutate(changed, 'stale-plan')), code('TECHNICAL_REQUIRED'));
  const newBlueprint = await service.technical(state.id, { ...mutate(changed, 'new-blueprint'), preferences: '' });
  const newSelection = await service.acceptTechnical(state.id, { ...mutate(newBlueprint, 'new-selection'), digest: newBlueprint.planning!.technical!.artifact.digest });
  const newPlan = await service.plan(state.id, mutate(newSelection, 'new-plan'));
  const added = newPlan.planning!.technical!.requirements.find(r => r.description.includes('visible close label'))!;
  assert.ok(added);
  assert.deepEqual(newPlan.planning!.sources.prd, changed.artifacts.prd);
  assert.notEqual(newPlan.planning!.sources.prd.digest, oldComplete.planning!.sources.prd.digest);
  assert.ok(newPlan.planning!.plan!.evals.some(e => e.requirements.includes(added.id)));
  assert.ok(newPlan.planning!.plan!.stories.some(story => story.requirements.includes(added.id)));
});

test('regenerating technical blueprint resets selection, plan and review without promoting preferences to scope', async t => {
  const { service, state } = await setup(t); const selection = await selected(service, state);
  const planned = await service.plan(state.id, mutate(selection, 'plan'));
  const complete = await service.reviewPlan(state.id, mutate(planned, 'review'));
  const revised = await service.technical(state.id, { ...mutate(complete, 'new-stack'), preferences: 'Prefer plain JavaScript.' });
  assert.equal(revised.planning!.technicalDecision, undefined); assert.equal(revised.planning!.plan, undefined); assert.equal(revised.planning!.review, undefined); assert.equal(revised.planning!.handoff, undefined);
  assert.deepEqual(revised.confirmedScope, state.confirmedScope);
  assert.notEqual(revised.planning!.technical!.artifact.digest, selection.planning!.technicalDecision!.digest);
  await assert.rejects(service.acceptTechnical(state.id, { ...mutate(revised, 'stale-selection'), digest: selection.planning!.technicalDecision!.digest }), code('STALE_TECHNICAL'));
});

test('overlayer blueprint fails durably; invalid eval refs and missing coverage fail without a handoff', async t => {
  for (const defect of ['layers', 'reference', 'missing-coverage'] as const) {
    const broken: PlanningProvider = { ...provider, async technical(input) { const out = technical(input); if (defect === 'layers') out.layers = 4; return out; }, async plan(input) { const out = plan(input); if (defect === 'reference') out.stories[0].evals = ['unknown']; if (defect === 'missing-coverage') out.coverage.pop(); return out; } };
    const { service, state, dataDir } = await setup(t, broken);
    if (defect === 'layers') { const failed = await service.technical(state.id, { ...mutate(state, 'technical'), preferences: '' }); assert.equal(failed.task!.status, 'failed'); assert.match(failed.task!.failure!, /three responsibility layers/); }
    else { const selection = await selected(service, state); const failed = await service.plan(state.id, mutate(selection, 'plan')); assert.equal(failed.task!.status, 'failed'); assert.equal(failed.planning!.handoff, undefined); assert.equal((await new WorkflowService({ dataDir, provider: draft, planningProvider: provider }).get(state.id)).task!.status, 'failed'); }
  }
});

test('explicit requirement gaps and independent blocking findings prevent handoff; retry receives review findings', async t => {
  let reviewing = 0; let retryInput: PlanningInput | undefined;
  const reviewingProvider: PlanningProvider = { ...provider, async plan(input) { retryInput = input; return plan(input); }, async review() { return ++reviewing === 1 ? { findings: [{ id: 'F1', description: 'Close journey missing a failure case.', severity: 'blocking', basis: 'R2: confirmed close journey lacks failure evidence.' }] } : { findings: [] }; } };
  const { service, state } = await setup(t, reviewingProvider); const selection = await selected(service, state); const planned = await service.plan(state.id, mutate(selection, 'plan'));
  const blocked = await service.reviewPlan(state.id, mutate(planned, 'review'));
  assert.equal(blocked.planning!.handoff, undefined); assert.equal(blocked.planning!.phase, 'plan-review'); assert.match(blocked.blockers[0], /failure case/);
  const replanned = await service.plan(state.id, mutate(blocked, 'replan')); assert.equal(retryInput!.feedback![0].id, 'F1');
  const complete = await service.reviewPlan(state.id, mutate(replanned, 'rereview')); assert.equal(complete.planning!.phase, 'planning-complete');
  const gapProvider: PlanningProvider = { ...provider, async plan(input) { const out = plan(input); out.coverage[0] = { ...out.coverage[0], status: 'gap', reason: 'Acceptance procedure remains undefined.' }; return out; } };
  const gapSetup = await setup(t, gapProvider); const gapSelection = await selected(gapSetup.service, gapSetup.state); const gapPlan = await gapSetup.service.plan(gapSelection.id, mutate(gapSelection, 'plan'));
  const gapReviewed = await gapSetup.service.reviewPlan(gapSelection.id, mutate(gapPlan, 'review'));
  assert.equal(gapReviewed.planning!.handoff, undefined); assert.match(gapReviewed.blockers.join(' '), /Acceptance procedure remains undefined/);
});

test('dependency cycles, shared parallel scope, fictitious deferrals and self-resolved findings refuse', () => {
  const input = { confirmedScope: ['modal'] } as PlanningInput; input.technical = technical(input);
  for (const defect of ['cycle', 'parallel', 'deferral', 'resolved'] as const) {
    const out = plan(input);
    if (defect === 'cycle') out.stories[0].dependsOn = ['S1'];
    if (defect === 'parallel') { out.stories[0].parallelGroup = 'A'; out.stories.push({ ...out.stories[0], id: 'S2' }); }
    if (defect === 'deferral') out.coverage[0] = { ...out.coverage[0], status: 'not-applicable', reason: 'Deferred to a later release.' };
    if (defect === 'resolved') out.findings = [{ id: 'F', description: 'Missing close journey.', severity: 'blocking', resolved: true }];
    assert.throws(() => validateBuildPlan(out, input), code('INVALID_PLANNING_OUTPUT'));
  }
});

test('planning input and task are durable before invocation; matching result recovers after missed state commit', async t => {
  let running!: string; let captured!: PlanningInput;
  const { service, state, dataDir } = await setup(t);
  const recoveryProvider: PlanningProvider = { ...provider, async technical(input) { captured = input; running = await readFile(join(dataDir, state.id, 'preparation.json'), 'utf8'); const evidence = JSON.parse(await readFile(join(dataDir, state.id, 'tasks', `${input.taskId}.input.json`), 'utf8')); assert.deepEqual(evidence.sources, input.sources); return technical(input); } };
  const runner = new WorkflowService({ dataDir, provider: draft, planningProvider: recoveryProvider });
  const completed = await runner.technical(state.id, { ...mutate(state, 'technical'), preferences: '' });
  assert.equal(completed.task!.id, captured.taskId); assert.equal(JSON.parse(running).task.role, 'technical-author');
  await writeFile(join(dataDir, state.id, 'preparation.json'), running);
  const resumed = await service.get(state.id); assert.equal(resumed.task!.status, 'completed'); assert.equal(resumed.planning!.technical!.artifact.digest, completed.planning!.technical!.artifact.digest);
});

test('tampered structured technical evidence cannot be selected even if artifact markdown remains unchanged', async t => {
  const { service, state, dataDir } = await setup(t);
  const authored = await service.technical(state.id, { ...mutate(state, 'technical'), preferences: '' });
  authored.planning!.technical!.stack = 'A different unreviewed stack';
  await writeFile(join(dataDir, state.id, 'preparation.json'), JSON.stringify(authored));
  await assert.rejects(service.acceptTechnical(state.id, { ...mutate(authored, 'select'), digest: authored.planning!.technical!.artifact.digest }), code('INVALID_TASK_EVIDENCE'));
});

test('review cannot block on an uncited preference or claim to resolve its own finding', async t => {
  const uncited: PlanningProvider = { ...provider, async review() { return { findings: [{ id: 'preference', severity: 'blocking', description: 'Use my preferred framework.' }] }; } };
  const { service, state } = await setup(t, uncited); const selection = await selected(service, state); const planned = await service.plan(state.id, mutate(selection, 'plan'));
  const failed = await service.reviewPlan(state.id, mutate(planned, 'review'));
  assert.equal(failed.task!.status, 'failed'); assert.match(failed.task!.failure!, /cite a requirement/); assert.equal(failed.planning!.handoff, undefined);
});

test('planning serializes with product drafting and restart refuses unresolved old-instance output', async t => {
  let release!: (value: TechnicalOutput) => void; let started!: () => void; let captured!: PlanningInput;
  const ready = new Promise<void>(resolve => { started = resolve; });
  const slow: PlanningProvider = { ...provider, async technical(input) { captured = input; started(); return new Promise(resolve => { release = resolve; }); } };
  const { service, state, dataDir } = await setup(t, slow);
  const pending = service.technical(state.id, { ...mutate(state, 'technical'), preferences: '' }); await ready;
  const running = await service.get(state.id); assert.equal(running.task!.status, 'running');
  await assert.rejects(service.draft(state.id, mutate(running, 'concurrent-draft')), code('TASK_UNRESOLVED'));
  const restarted = new WorkflowService({ dataDir, provider: draft, planningProvider: provider });
  const interrupted = await restarted.get(state.id); assert.equal(interrupted.task!.status, 'interrupted'); assert.equal(interrupted.planning!.phase, 'interrupted');
  await assert.rejects(restarted.technical(state.id, { ...mutate(interrupted, 'retry'), preferences: '' }), code('TASK_UNRESOLVED'));
  release(technical(captured)); await assert.rejects(pending, code('STALE_OUTPUT'));
  assert.equal((await restarted.get(state.id)).planning!.technical, undefined);
});

test('planning timeout remains unresolved across restart and never emits handoff', async t => {
  const { state, dataDir } = await setup(t);
  const timed = new WorkflowService({ dataDir, provider: draft, planningProvider: { ...provider, technical: () => new Promise(() => {}) }, executionLimitMs: 10 });
  const interrupted = await timed.technical(state.id, { ...mutate(state, 'technical'), preferences: '' });
  assert.equal(interrupted.task!.status, 'interrupted'); assert.equal(interrupted.planning!.handoff, undefined);
  const restarted = new WorkflowService({ dataDir, provider: draft, planningProvider: provider }); const saved = await restarted.get(state.id);
  assert.equal(saved.planning!.phase, 'interrupted');
  await assert.rejects(restarted.technical(state.id, { ...mutate(saved, 'retry'), preferences: '' }), code('TASK_UNRESOLVED'));
});


test('story-local coverage fails despite global eval coverage; explicit retry receives the defect', async t => {
  let calls = 0; let retryInput: PlanningInput | undefined;
  const author: PlanningProvider = { ...provider, async plan(input) {
    calls++; retryInput = input; const out = plan(input);
    if (calls === 1) {
      out.evals[0].requirements = [input.technical!.requirements[0].id];
      out.stories[0].evals = [out.evals[0].id];
    }
    return out;
  } };
  const { service, state } = await setup(t, author);
  const choice = await selected(service, state);
  const failed = await service.plan(state.id, mutate(choice, 'plan'));
  assert.equal(failed.task!.status, 'failed');
  assert.match(failed.task!.failure!, /Story S1 has no linked eval for: R2/);
  assert.equal(failed.planning!.plan, undefined); assert.equal(calls, 1);
  const repaired = await service.plan(state.id, mutate(failed, 'explicit-retry'));
  assert.match(retryInput!.feedback![0].description, /Story S1.*R2/);
  assert.deepEqual(retryInput!.sources, choice.planning!.sources);
  assert.equal(repaired.task!.status, 'completed'); assert.equal(calls, 2);
});

test('review corrects plan-only defects once and independently re-reviews unchanged authority', async t => {
  let plans = 0, reviews = 0; let correctionInput: PlanningInput | undefined;
  const author: PlanningProvider = { ...provider,
    async plan(input) { plans++; if (plans === 2) correctionInput = input; return plan(input); },
    async review() { reviews++; return reviews === 1 ? { findings: [{ id: 'order', severity: 'blocking', resolution: 'plan-correction', description: 'Move combined verification after its harness exists.', basis: 'S1 verification precedes the harness story.' }] } : { findings: [] }; },
  };
  const { service, state } = await setup(t, author); const selection = await selected(service, state);
  const planned = await service.plan(state.id, mutate(selection, 'plan'));
  const result = await service.reviewPlan(state.id, mutate(planned, 'review'));
  assert.equal(plans, 2); assert.equal(reviews, 2); assert.equal(result.planning!.phase, 'planning-complete');
  assert.equal(result.planning!.correction!.status, 'completed');
  assert.equal(correctionInput!.feedback![0].id, 'order');
  assert.deepEqual(result.artifacts, planned.artifacts); assert.deepEqual(result.planning!.technicalDecision, planned.planning!.technicalDecision);
  assert.equal(result.planning!.technical!.artifact.digest, planned.planning!.technical!.artifact.digest);
  assert.ok(await service.readArtifact(state.id, 'handoff'));
});

test('persistent defects stop after one correction; product and blueprint decisions never auto-change', async t => {
  for (const resolution of ['plan-correction', 'user-decision', 'blueprint-change', undefined] as const) {
    let plans = 0, reviews = 0;
    const author: PlanningProvider = { ...provider, async plan(input) { plans++; return plan(input); }, async review() { reviews++; return { findings: [{ id: 'f', severity: 'blocking', resolution, description: 'Unresolved finding.', basis: 'R1 needs a concrete correction.' }] }; } };
    const { service, state } = await setup(t, author); const selection = await selected(service, state);
    const planned = await service.plan(state.id, mutate(selection, 'plan'));
    const result = await service.reviewPlan(state.id, mutate(planned, 'review'));
    assert.equal(plans, resolution === 'plan-correction' ? 2 : 1); assert.equal(reviews, resolution === 'plan-correction' ? 2 : 1);
    assert.equal(result.planning!.correction!.status, 'stopped'); assert.equal(result.planning!.handoff, undefined);
    assert.deepEqual(result.artifacts, planned.artifacts); assert.deepEqual(result.planning!.technicalDecision, planned.planning!.technicalDecision);
  }
});

test('automatic correction failure does not loop or erase the source review evidence', async t => {
  let plans = 0, reviews = 0;
  const author: PlanningProvider = { ...provider, async plan(input) { if (++plans === 2) throw new Error('Provider unavailable'); return plan(input); }, async review() { reviews++; return { findings: [{ id: 'order', severity: 'blocking', resolution: 'plan-correction', description: 'Fix story order.', basis: 'S1 requires later harness.' }] }; } };
  const { service, state, dataDir } = await setup(t, author); const selection = await selected(service, state);
  const planned = await service.plan(state.id, mutate(selection, 'plan'));
  const result = await service.reviewPlan(state.id, mutate(planned, 'review'));
  assert.equal(plans, 2); assert.equal(reviews, 1); assert.equal(result.task!.status, 'failed');
  assert.equal(result.planning!.correction!.status, 'stopped'); assert.match(result.task!.failure!, /Provider unavailable/);
  const input = JSON.parse(await readFile(join(dataDir, state.id, 'tasks', `${result.task!.id}.input.json`), 'utf8'));
  assert.equal(input.feedback[0].id, 'order'); assert.equal(result.planning!.handoff, undefined);
});

test('an explicit second review starts a new correction status instead of retaining the stopped run', async t => {
  let reviews = 0; let inspect: (() => Promise<void>) | undefined;
  const author: PlanningProvider = { ...provider, async review() {
    if (++reviews === 1) return { findings: [{ id: 'choice', severity: 'blocking', resolution: 'user-decision', description: 'Confirm the choice.', basis: 'User decision required.' }] };
    await inspect!(); return { findings: [] };
  } };
  const { service, state } = await setup(t, author); const selection = await selected(service, state);
  const planned = await service.plan(state.id, mutate(selection, 'plan'));
  const stopped = await service.reviewPlan(state.id, mutate(planned, 'first-review'));
  assert.equal(stopped.planning!.correction!.status, 'stopped');
  inspect = async () => {
    const running = await service.get(state.id);
    assert.equal(running.planning!.correction!.operationId, 'second-review');
    assert.equal(running.planning!.correction!.status, 'running');
  };
  const result = await service.reviewPlan(state.id, mutate(stopped, 'second-review'));
  assert.equal(result.planning!.correction!.status, 'completed');
  assert.equal(result.planning!.correction!.operationId, 'second-review');
});
