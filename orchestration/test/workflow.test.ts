import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { DraftInput, DraftOutput, DraftProvider, Preparation, WorkflowError, WorkflowService } from '../src/workflow.js';
import { digest } from '../src/store.js';

// Deliberate fixture provider: these tests exercise deterministic service semantics, not model quality.
function fixture(input: DraftInput): DraftOutput {
  const scope = input.confirmedScope.join('\n');
  return { prdMarkdown: `# Product requirements\n${scope}\n## Non-goals\nOptional proposals remain excluded.`,
    mockupHtml: `<!doctype html><html><body><h1>Sample workspace</h1><p>${scope}</p><button onclick="this.textContent='Done'">Complete example</button></body></html>`,
    proposals: [{ id: 'optional-analytics', description: 'Optional analytics dashboard' }], findings: [] };
}
const provider: DraftProvider = { async draft(input) { return fixture(input); } };
async function setup(t: { after: (fn: () => Promise<void>) => void }, draftProvider = provider, executionLimitMs = 1000) {
  const dataDir = await mkdtemp(join(tmpdir(), 'orchestration-workflow-')); t.after(() => rm(dataDir, { recursive: true, force: true }));
  return { dataDir, service: new WorkflowService({ dataDir, provider: draftProvider, executionLimitMs }) };
}
async function answered(service: WorkflowService): Promise<Preparation> {
  const initial = await service.create({ idea: 'A study session planner', operationId: 'create' });
  return service.answer(initial.id, { answer: 'Students must schedule one study session.', expectedRevision: initial.revision, operationId: 'answer' });
}
const code = (expected: string) => (error: unknown) => error instanceof WorkflowError && error.code === expected;

test('saved answer and coordinated artifact revisions survive restart; packet binds exact current bytes', async t => {
  const { dataDir, service } = await setup(t); const initial = await answered(service);
  const first = await service.draft(initial.id, { expectedRevision: initial.revision, operationId: 'draft' });
  assert.equal(first.stage, 'review'); assert.equal(first.artifacts.prd!.revision, 1);
  assert.equal(first.reviewPacket!.authority, 'draft-only');
  assert.equal(first.reviewPacket!.approvalStatus, 'approval-channel-not-implemented');
  const restarted = new WorkflowService({ dataDir, provider }); const resumed = await restarted.get(first.id);
  assert.equal(resumed.question.answer, initial.question.answer);
  const changed = await restarted.requestChanges(first.id, { feedback: 'Add a visible session duration selector.', expectedRevision: resumed.revision, operationId: 'change' });
  assert.equal(changed.artifacts.prd!.revision, 2); assert.equal(changed.artifacts.mockup!.revision, 2);
  const prd = await restarted.readArtifact(first.id, 'prd'), mockup = await restarted.readArtifact(first.id, 'mockup');
  assert.match(prd, /visible session duration selector/); assert.match(mockup, /visible session duration selector/);
  assert.doesNotMatch(prd, /Optional analytics dashboard/); assert.doesNotMatch(mockup, /Optional analytics dashboard/);
  assert.equal(changed.confirmedScope.some(scope => scope.includes('analytics')), false);
  assert.equal(digest(prd), changed.reviewPacket!.artifacts.prd.digest); assert.equal(digest(mockup), changed.reviewPacket!.artifacts.mockup.digest);
  const packet = await restarted.readArtifact(first.id, 'packet');
  assert.equal(digest(packet), changed.reviewPacket!.digest);
  assert.equal(JSON.parse(packet).preparationRevision, changed.revision);
  assert.equal(JSON.parse(packet).reviewStatus.includes('not been performed'), true);
  assert.deepEqual(changed.reviewPacket!.requiredReviews.map(review => review.role), ['skeptical founder', 'security reviewer', 'operations engineer', 'feasibility reviewer']);
  assert.equal(changed.reviewPacket!.requiredReviews.every(review => review.status === 'not-performed'), true);
});

test('silence and encouragement cannot answer the material question; stale mutations and duplicate operations refuse', async t => {
  const { service } = await setup(t); const initial = await service.create({ idea: 'Study planner', operationId: 'create' });
  await assert.rejects(service.answer(initial.id, { answer: '   ', expectedRevision: 1, operationId: 'blank' }), code('INVALID_INPUT'));
  await assert.rejects(service.answer(initial.id, { answer: 'looks good', expectedRevision: 1, operationId: 'encourage' }), code('MATERIAL_ANSWER_REQUIRED'));
  await assert.rejects(service.draft(initial.id, { expectedRevision: 1, operationId: 'draft' }), code('ANSWER_REQUIRED'));
  await assert.rejects(service.create({ idea: 'Study planner', operationId: 'create' }), code('DUPLICATE_OPERATION'));
  const state = await service.answer(initial.id, { answer: 'Students schedule study sessions.', expectedRevision: 1, operationId: 'answer' });
  await assert.rejects(service.answer(initial.id, { answer: 'Different answer', expectedRevision: 1, operationId: 'answer' }), code('DUPLICATE_OPERATION'));
  await assert.rejects(service.draft(initial.id, { expectedRevision: 1, operationId: 'stale' }), code('STALE_REVISION'));
  const result = await service.draft(initial.id, { expectedRevision: state.revision, operationId: 'draft' });
  await assert.rejects(service.draft(initial.id, { expectedRevision: result.revision, operationId: 'draft' }), code('DUPLICATE_OPERATION'));
});

test('task identity and exact inputs persist before provider execution; polling keeps own task running', async t => {
  let release!: (value: DraftOutput) => void; let started!: () => void; let captured!: DraftInput;
  const ready = new Promise<void>(resolve => { started = resolve; });
  const slow: DraftProvider = { async draft(input) { captured = input; started(); return new Promise(resolve => { release = resolve; }); } };
  const { dataDir, service } = await setup(t, slow); const state = await answered(service);
  const pending = service.draft(state.id, { expectedRevision: state.revision, operationId: 'draft' }); await ready;
  const running = await service.get(state.id); assert.equal(running.task!.status, 'running');
  const saved = JSON.parse(await readFile(join(dataDir, state.id, 'preparation.json'), 'utf8'));
  assert.equal(saved.task.id, captured.taskId); assert.equal(saved.task.inputRevision, state.revision);
  const input = JSON.parse(await readFile(join(dataDir, state.id, 'tasks', `${captured.taskId}.input.json`), 'utf8'));
  assert.equal(input.question.answer, state.question.answer);
  await assert.rejects(service.draft(state.id, { expectedRevision: running.revision, operationId: 'second' }), code('TASK_UNRESOLVED'));
  release(fixture(captured)); assert.equal((await pending).task!.status, 'completed');
});

test('restart preserves unresolved execution and refuses stale output from old instance', async t => {
  let release!: (value: DraftOutput) => void; let started!: () => void; let captured!: DraftInput;
  const ready = new Promise<void>(resolve => { started = resolve; });
  const slow: DraftProvider = { async draft(input) { captured = input; started(); return new Promise(resolve => { release = resolve; }); } };
  const { dataDir, service } = await setup(t, slow); const state = await answered(service);
  const pending = service.draft(state.id, { expectedRevision: state.revision, operationId: 'draft' }); await ready;
  const restarted = new WorkflowService({ dataDir, provider }); const unresolved = await restarted.get(state.id);
  assert.equal(unresolved.stage, 'interrupted'); assert.match(unresolved.blockers[0], /outcome unresolved/);
  await assert.rejects(restarted.draft(state.id, { expectedRevision: unresolved.revision, operationId: 'retry' }), code('TASK_UNRESOLVED'));
  release(fixture(captured)); await assert.rejects(pending, code('STALE_OUTPUT'));
  assert.equal((await restarted.get(state.id)).artifacts.prd, undefined);
  assert.equal((await restarted.get(state.id)).question.answer, state.question.answer);
});

test('matching durable result reconciles after interrupted state commit', async t => {
  const { dataDir, service } = await setup(t); const state = await answered(service);
  let running!: string; let captured!: DraftInput;
  const recovering: DraftProvider = { async draft(input) {
    captured = input; running = await readFile(join(dataDir, state.id, 'preparation.json'), 'utf8'); return fixture(input);
  } };
  const runner = new WorkflowService({ dataDir, provider: recovering });
  const completed = await runner.draft(state.id, { expectedRevision: state.revision, operationId: 'draft' });
  assert.equal(completed.task!.id, captured.taskId);
  await writeFile(join(dataDir, state.id, 'preparation.json'), running);
  const resumed = await new WorkflowService({ dataDir, provider }).get(state.id);
  assert.equal(resumed.task!.status, 'completed'); assert.equal(resumed.reviewPacket!.digest, completed.reviewPacket!.digest);
});

test('provider failure is durable and explicitly retryable; timeout stays unresolved', async t => {
  let calls = 0;
  const failing: DraftProvider = { async draft(input) { if (++calls === 1) throw new Error('CLI process failed: exit 2'); return fixture(input); } };
  const { dataDir, service } = await setup(t, failing); const state = await answered(service);
  const failed = await service.draft(state.id, { expectedRevision: state.revision, operationId: 'draft' });
  assert.equal(failed.stage, 'failed'); assert.match(failed.task!.failure!, /exit 2/);
  assert.equal((await new WorkflowService({ dataDir, provider }).get(state.id)).stage, 'failed');
  const success = await service.draft(state.id, { expectedRevision: failed.revision, operationId: 'retry' }); assert.equal(success.stage, 'review');
  const bounded = await setup(t, { draft: () => new Promise(() => {}) }, 10); const answer = await answered(bounded.service);
  const timed = await bounded.service.draft(answer.id, { expectedRevision: answer.revision, operationId: 'draft' });
  assert.equal(timed.stage, 'interrupted'); assert.equal((await bounded.service.get(answer.id)).stage, 'interrupted');
  assert.equal((await new WorkflowService({ dataDir: bounded.dataDir, provider }).get(answer.id)).stage, 'interrupted');
  await assert.rejects(bounded.service.draft(answer.id, { expectedRevision: timed.revision, operationId: 'retry' }), code('TASK_UNRESOLVED'));
});

test('artifact tampering and unreadable saved state refuse with actionable errors', async t => {
  const { dataDir, service } = await setup(t); const state = await answered(service);
  const drafted = await service.draft(state.id, { expectedRevision: state.revision, operationId: 'draft' });
  await writeFile(join(dataDir, drafted.artifacts.prd!.path), 'changed bytes');
  await assert.rejects(service.readArtifact(state.id, 'prd'), code('ARTIFACT_CHANGED'));
  await assert.rejects(service.requestChanges(state.id, { expectedRevision: drafted.revision, operationId: 'change', feedback: 'Add session duration.' }), code('ARTIFACT_CHANGED'));
  await writeFile(join(dataDir, state.id, 'preparation.json'), '{broken');
  await assert.rejects(service.get(state.id), error => error instanceof WorkflowError && error.code === 'INVALID_STATE' && /Restore/.test(error.message));
});
