import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { WorkflowService, WorkflowError, type DraftProvider, type InterviewInput, type InterviewOutput } from '../src/workflow.js';

const draft: DraftProvider['draft'] = async input => ({ prdMarkdown: '# PRD\n' + input.confirmedScope.join('\n'), mockupHtml: '<!doctype html><button>Borrow</button>', proposals: [], findings: [] });
const question = (text = 'How should members identify themselves?'): InterviewOutput => ({ question: text, reason: 'Permissions depend on knowing the member.', summary: '' });
const ready: InterviewOutput = { question: null, reason: 'The material product decisions are supplied.', summary: 'Members borrow and return equipment. Seeded users only. No reminders.' };
const code = (value: string) => (error: unknown) => error instanceof WorkflowError && error.code === value;
async function setup(t: { after: (fn: () => Promise<void>) => void }, provider: DraftProvider, executionLimitMs = 1000) {
  const dataDir = await mkdtemp(join(tmpdir(), 'interview-test-')); t.after(() => rm(dataDir, { recursive: true, force: true }));
  return { dataDir, service: new WorkflowService({ dataDir, provider, executionLimitMs }) };
}

test('adaptive questions preserve answers across restart; draft waits for completion and explicit request', async t => {
  const seen: InterviewInput[] = []; let drafts = 0;
  const provider: DraftProvider = { draft: async input => { drafts++; return draft(input, new AbortController().signal); }, interview: async input => { seen.push(input); return input.answers.length ? ready : question(); } };
  const { service, dataDir } = await setup(t, provider);
  let state = await service.create({ idea: 'Equipment loans with React, FastAPI and Postgres. No reminders.', operationId: 'create' });
  await assert.rejects(service.draft(state.id, { expectedRevision: state.revision, operationId: 'early' }), code('INTERVIEW_REQUIRED'));
  state = await service.interview(state.id, { expectedRevision: state.revision, operationId: 'interview-1' });
  assert.equal(state.interview?.status, 'asking'); assert.match(state.question.prompt, /identify/);
  await assert.rejects(service.interview(state.id, { expectedRevision: state.revision, operationId: 'skip' }), code('ANSWER_REQUIRED'));
  state = await service.answer(state.id, { answer: 'A seeded-user switcher for this local trial; no passwords.', expectedRevision: state.revision, operationId: 'answer' });
  const restarted = new WorkflowService({ dataDir, provider });
  state = await restarted.interview(state.id, { expectedRevision: state.revision, operationId: 'interview-2' });
  assert.equal(state.interview?.status, 'ready'); assert.equal(drafts, 0);
  assert.equal(seen[1].answers[0].answer, 'A seeded-user switcher for this local trial; no passwords.');
  assert.equal(state.confirmedScope.includes(ready.summary), false, 'generated summary is not new authority');
  state = await restarted.draft(state.id, { expectedRevision: state.revision, operationId: 'draft' });
  assert.equal(drafts, 1); assert.match(await restarted.readArtifact(state.id, 'prd'), /seeded-user switcher/);
});

test('complete supplied scope needs no redundant answer; model summary never enters confirmed scope', async t => {
  const { service } = await setup(t, { draft, interview: async () => ready });
  let state = await service.create({ idea: 'Complete initial product description.', operationId: 'create' });
  state = await service.interview(state.id, { expectedRevision: state.revision, operationId: 'interview' });
  assert.equal(state.interview?.status, 'ready'); assert.deepEqual(state.confirmedScope, [state.idea]);
  state = await service.draft(state.id, { expectedRevision: state.revision, operationId: 'draft' });
  assert.equal(state.task?.status, 'completed');
});

test('existing draft can enter interview; answering invalidates current artifact pointers but retains saved bytes', async t => {
  const { dataDir, service } = await setup(t, { draft });
  let state = await service.create({ idea: 'Equipment loans', operationId: 'create' });
  state = await service.answer(state.id, { expectedRevision: state.revision, operationId: 'answer', answer: 'Members borrow and return their own equipment.' });
  state = await service.draft(state.id, { expectedRevision: state.revision, operationId: 'draft' });
  const prior = state.artifacts.prd!;
  const upgraded = new WorkflowService({ dataDir, provider: { draft, interview: async input => { assert.equal(input.answers.length, 1); return question(); } } });
  state = await upgraded.interview(state.id, { expectedRevision: state.revision, operationId: 'interview' });
  assert.deepEqual(state.artifacts.prd, prior, 'review alone preserves the draft');
  await assert.rejects(upgraded.draft(state.id, { expectedRevision: state.revision, operationId: 'early' }), code('INTERVIEW_REQUIRED'));
  await assert.rejects(upgraded.acceptTechnical(state.id, { expectedRevision: state.revision, operationId: 'select', digest: 'old' }), code('INTERVIEW_REQUIRED'));
  state = await upgraded.answer(state.id, { expectedRevision: state.revision, operationId: 'answer-2', answer: 'Use a seeded-user switcher.' });
  assert.deepEqual(state.artifacts, {}); assert.equal(state.reviewPacket, undefined); assert.equal(state.planning, undefined);
  assert.match(await readFile(join(dataDir, prior.path), 'utf8'), /Members borrow/);
});

test('duplicate questions and malformed responses fail without losing user answers or inventing scope', async t => {
  let calls = 0;
  const { service } = await setup(t, { draft, interview: async () => ++calls < 3 ? question() : { ...ready, summary: '' } });
  let state = await service.create({ idea: 'Equipment loans', operationId: 'create' });
  state = await service.interview(state.id, { expectedRevision: state.revision, operationId: 'i1' });
  state = await service.answer(state.id, { expectedRevision: state.revision, operationId: 'a1', answer: 'Seeded users.' });
  state = await service.interview(state.id, { expectedRevision: state.revision, operationId: 'i2' });
  assert.equal(state.task?.status, 'failed'); assert.match(state.task!.failure!, /repeated/); assert.equal(state.interview?.answers.length, 1);
  state = await service.interview(state.id, { expectedRevision: state.revision, operationId: 'i3' });
  assert.equal(state.task?.status, 'failed'); assert.equal(state.interview?.status, 'needed'); assert.equal(state.confirmedScope.length, 2);
});

test('running interview is durable, duplicate operation refused, timeout never retries', async t => {
  let calls = 0;
  const provider: DraftProvider = { draft, interview: async () => { calls++; return new Promise(() => {}); } };
  const { service, dataDir } = await setup(t, provider, 30);
  const initial = await service.create({ idea: 'Equipment loans', operationId: 'create' });
  const work = service.interview(initial.id, { expectedRevision: initial.revision, operationId: 'i1' });
  let running = await service.get(initial.id);
  assert.equal(running.task?.role, 'product-interviewer'); assert.equal(running.task?.status, 'running');
  await assert.rejects(service.interview(initial.id, { expectedRevision: running.revision, operationId: 'i1' }), code('DUPLICATE_OPERATION'));
  const result = await work; assert.equal(result.task?.status, 'interrupted');
  running = await new WorkflowService({ dataDir, provider }).get(initial.id);
  assert.equal(running.task?.status, 'interrupted'); assert.equal(calls, 1);
});
