import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OrcaBridge, OrcaCliTransport, type OrcaTarget, type OrcaTransport, type OrcaVerification } from '../src/orca-bridge.js';
import { PreparationStore } from '../src/store.js';
import type { Preparation } from '../src/types.js';

const target: OrcaTarget = { runtimeId: 'runtime-one', handle: 'terminal-exact', ptyId: 'pty-one', incarnationId: 'incarnation-one',
  worktreeId: 'workspace-one', worktreePath: '/project', executionHostId: 'local', agentIdentity: 'codex' };
const preparation = (revision = 2): Preparation => ({ schemaVersion: 1, id: 'prep-example', revision, stage: 'intake',
  idea: 'PRIVATE IDEA DO NOT NOTIFY', question: { id: 'q', prompt: 'PRIVATE QUESTION', answer: 'PRIVATE ANSWER' },
  confirmedScope: [], proposals: [], findings: [], feedback: ['PRIVATE FEEDBACK'], artifacts: {}, operations: [], blockers: [], nextAction: 'PRIVATE NEXT ACTION' });
async function harness() {
  const dataDir = await mkdtemp(join(tmpdir(), 'orca-bridge-'));
  const store = new PreparationStore(dataDir);
  const sent: string[] = [];
  let verification: OrcaVerification = { target, state: 'ready' };
  let failSend = false;
  let persistedBeforeSend = false;
  const transport: OrcaTransport = {
    async targets() { return [target]; },
    async verify() { return verification; },
    async send(actual, message) {
      assert.deepEqual(actual, target);
      const disk = JSON.parse(await readFile(join(dataDir, 'orca-bridge.json'), 'utf8'));
      persistedBeforeSend = disk.receipts.at(-1).state === 'uncertain' && !!disk.receipts.at(-1).attemptedAt;
      sent.push(message);
      if (failSend) throw new Error('connection lost after input might have been accepted');
      return { accepted: true, requestId: 'request-one', stage: 'input_accepted' };
    },
  };
  const create = () => new OrcaBridge({ store, transport, workspacePath: '/project' });
  const bridge = create();
  return { dataDir, store, bridge, create, transport, sent,
    setVerification(value: OrcaVerification) { verification = value; },
    failSend() { failSend = true; },
    persistedBeforeSend: () => persistedBeforeSend,
    cleanup: () => rm(dataDir, { recursive: true, force: true }) };
}

test('explicit owner receives one pointer after a persisted attempt, without preparation content', async () => {
  const h = await harness();
  try {
    assert.equal(await h.bridge.notify(preparation(), 'answer-saved', 'http://127.0.0.1:4317'), null);
    assert.equal(h.sent.length, 0);
    await h.bridge.attach({ target, directPromptOptIn: true });
    const receipt = await h.bridge.notify(preparation(), 'answer-saved', 'http://127.0.0.1:4317');
    assert.equal(receipt?.state, 'delivered'); assert.equal(receipt?.requestId, 'request-one');
    assert.equal(h.persistedBeforeSend(), true); assert.equal(h.sent.length, 1);
    assert.match(h.sent[0], /prep-example, revision 2, status intake/);
    assert.match(h.sent[0], /Read shared preparation status/); assert.match(h.sent[0], /not user approval/);
    assert.doesNotMatch(h.sent[0], /PRIVATE/);
    await h.bridge.notify(preparation(), 'answer-saved', 'http://127.0.0.1:4317');
    await h.bridge.resume(receipt!.id); assert.equal(h.sent.length, 1);
    assert.equal((await h.create().status()).receipts[0].state, 'delivered'); assert.equal(h.sent.length, 1);
  } finally { await h.cleanup(); }
});

test('busy owner defers without a timer and explicit resume verifies readiness again', async () => {
  const h = await harness();
  try {
    h.setVerification({ target, state: 'busy', reason: 'Agent active.' });
    await h.bridge.attach({ target, directPromptOptIn: true });
    const receipt = await h.bridge.notify(preparation(), 'answer-saved', 'http://127.0.0.1:4317');
    assert.equal(receipt?.state, 'pending'); assert.equal(receipt?.attemptedAt, undefined); assert.equal(h.sent.length, 0);
    h.setVerification({ target, state: 'ready' });
    await h.bridge.notify(preparation(), 'answer-saved', 'http://127.0.0.1:4317'); assert.equal(h.sent.length, 0);
    assert.equal((await h.bridge.resume(receipt!.id)).state, 'delivered'); assert.equal(h.sent.length, 1);
  } finally { await h.cleanup(); }
});

test('wrong incarnation, wrong workspace, dead and permission targets never receive input', async () => {
  const h = await harness();
  try {
    await assert.rejects(h.bridge.attach({ target: { ...target, worktreePath: '/other-project' }, directPromptOptIn: true }), /workspace/);
    await h.bridge.attach({ target, directPromptOptIn: true });
    for (const verification of [
      { target: { ...target, incarnationId: 'replacement' }, state: 'ready' },
      { state: 'unavailable', reason: 'Closed.' },
      { target, state: 'busy', reason: 'Permission dialog.' },
    ] satisfies OrcaVerification[]) {
      h.setVerification(verification);
      const receipt = await h.bridge.notify(preparation((await h.bridge.status()).receipts.length + 2), 'answer-saved', 'http://127.0.0.1:4317');
      assert.equal(receipt?.state, 'pending');
    }
    assert.equal(h.sent.length, 0);
  } finally { await h.cleanup(); }
});

test('uncertain submission survives restart and never automatically or manually resends', async () => {
  const h = await harness();
  try {
    await h.bridge.attach({ target, directPromptOptIn: true }); h.failSend();
    const receipt = await h.bridge.notify(preparation(), 'answer-saved', 'http://127.0.0.1:4317');
    assert.equal(receipt?.state, 'uncertain'); assert.equal(h.sent.length, 1);
    const restarted = h.create();
    assert.equal((await restarted.status()).receipts[0].state, 'uncertain');
    await restarted.notify(preparation(), 'answer-saved', 'http://127.0.0.1:4317');
    await restarted.resume(receipt!.id); assert.equal(h.sent.length, 1);
  } finally { await h.cleanup(); }
});

test('detaching prevents pending delivery and changing ownership requires explicit detach', async () => {
  const h = await harness();
  try {
    await h.bridge.attach({ target, directPromptOptIn: true });
    await assert.rejects(h.bridge.attach({ target: { ...target, handle: 'other' }, directPromptOptIn: true }), /Detach/);
    h.setVerification({ target, state: 'busy' });
    const receipt = await h.bridge.notify(preparation(), 'answer-saved', 'http://127.0.0.1:4317');
    await h.bridge.detach(); h.setVerification({ target, state: 'ready' });
    assert.equal((await h.bridge.resume(receipt!.id)).state, 'pending'); assert.equal(h.sent.length, 0);
  } finally { await h.cleanup(); }
});

test('bounded history refuses overflow while retaining all receipts and duplicate suppression', async () => {
  const h = await harness();
  try {
    await h.bridge.attach({ target, directPromptOptIn: true });
    h.setVerification({ target, state: 'busy' });
    for (let revision = 1; revision <= 100; revision++) await h.bridge.notify(preparation(revision), 'answer-saved', 'http://127.0.0.1:4317');
    await assert.rejects(h.bridge.notify(preparation(101), 'answer-saved', 'http://127.0.0.1:4317'), /limit/);
    assert.equal((await h.bridge.status()).receipts.length, 100);
    h.setVerification({ target, state: 'ready' });
    assert.equal((await h.create().notify(preparation(1), 'answer-saved', 'http://127.0.0.1:4317'))?.state, 'pending');
    assert.equal(h.sent.length, 0);
  } finally { await h.cleanup(); }
});

test('notification cannot be sent unless its attempt is durably recorded', async () => {
  const h = await harness();
  try {
    await h.bridge.attach({ target, directPromptOptIn: true });
    const write = h.store.atomicWrite.bind(h.store);
    h.store.atomicWrite = async (path, value) => {
      if (JSON.parse(value).receipts.some((receipt: { attemptedAt?: string }) => receipt.attemptedAt)) throw new Error('disk full');
      return write(path, value);
    };
    await assert.rejects(h.bridge.notify(preparation(), 'answer-saved', 'http://127.0.0.1:4317'), /disk full/);
    assert.equal(h.sent.length, 0);
  } finally { await h.cleanup(); }
});

test('installed CLI discovery refuses unsupported shell-fallback delivery', async () => {
  const calls: string[][] = [];
  const transport = new OrcaCliTransport(async args => {
    calls.push(args);
    return { ok: true, _meta: { runtimeId: target.runtimeId }, result: args[1] === 'list'
      ? { terminals: [{ ...target, connected: true, writable: true }] }
      : { terminal: { ...target, connected: true, writable: true, orphaned: false, agentWait: null } } };
  });
  assert.deepEqual(await transport.targets(), [target]);
  transport.useWorkspace('/project');
  await transport.targets();
  assert.deepEqual(calls.at(-1), ['terminal', 'list', '--worktree', 'path:/project', '--json']);
  const verification = await transport.verify(target);
  assert.equal(verification.state, 'busy'); assert.match(verification.reason!, /atomic/);
  assert.equal(transport.deliverySupported, false);
  await assert.rejects(transport.send(), /disabled/);
  assert.equal(calls.some(args => args[1] === 'send'), false);
});

test('unsupported installed transport can pair but saves notices as pending without repeated runtime probes', async () => {
  const h = await harness();
  try {
    let probes = 0;
    const transport = new OrcaCliTransport(async () => {
      probes++;
      return { ok: true, _meta: { runtimeId: target.runtimeId }, result: { terminal: { ...target, connected: true, writable: true, orphaned: false, agentWait: null } } };
    });
    const bridge = new OrcaBridge({ store: h.store, transport, workspacePath: '/project' });
    const paired = await bridge.attach({ target, directPromptOptIn: true });
    assert.equal(paired.capabilities.deliverySupported, false);
    const receipt = await bridge.notify(preparation(), 'answer-saved', 'http://127.0.0.1:4317');
    assert.equal(receipt?.state, 'pending'); assert.match(receipt!.reason, /atomic/);
    assert.equal((await bridge.resume(receipt!.id)).state, 'pending');
    assert.equal(probes, 1);
  } finally { await h.cleanup(); }
});

test('task notices require a saved terminal task state, including failures', async () => {
  const h = await harness();
  try {
    await h.bridge.attach({ target, directPromptOptIn: true });
    await assert.rejects(h.bridge.notify(preparation(), 'task-finished', 'http://127.0.0.1:4317'), /finished task/);
    const state = preparation();
    state.task = { id: 'task-one', role: 'product-drafter', operationId: 'op-one', inputRevision: 1, savedRevision: 2,
      inputArtifacts: {}, allowedOutputs: ['prd.md', 'mockup.html'], executionLimitMs: 100, status: 'running', startedAt: new Date().toISOString() };
    await assert.rejects(h.bridge.notify(state, 'task-finished', 'http://127.0.0.1:4317'), /finished task/);
    state.task.status = 'failed'; state.stage = 'failed'; state.task.failure = 'PRIVATE FAILURE';
    assert.equal((await h.bridge.notify(state, 'task-finished', 'http://127.0.0.1:4317'))?.state, 'delivered');
    assert.doesNotMatch(h.sent[0], /PRIVATE/);
  } finally { await h.cleanup(); }
});

test('provider model preferences persist independently of the paired session and send nothing', async () => {
  const h = await harness();
  try {
    const defaults = await h.bridge.status();
    assert.equal(defaults.preferredProvider, 'claude');
    assert.deepEqual(defaults.preferences, { claude: { model: 'claude-opus-5-5', effort: 'medium' }, codex: { model: 'gpt-6.1-sol', effort: 'high' } });
    await h.bridge.attach({ target, directPromptOptIn: true });
    const before = (await h.bridge.status()).attachment;
    const changed = await h.bridge.setPreferences({ provider: 'codex', model: 'gpt-6.1-sol', effort: 'medium' });
    assert.equal(changed.preferredProvider, 'codex');
    assert.deepEqual(changed.preferences.claude, defaults.preferences.claude);
    assert.deepEqual(changed.preferences.codex, { model: 'gpt-6.1-sol', effort: 'medium' });
    assert.deepEqual(changed.attachment, before);
    assert.deepEqual((await h.create().status()).preferences, changed.preferences);
    assert.equal((await h.create().status()).preferredProvider, 'codex');
    for (const model of ['', 'bad\nmodel', 'model with spaces', 'x'.repeat(101)]) await assert.rejects(h.bridge.setPreferences({ provider: 'claude', model, effort: 'high' }), /model identifier/);
    assert.equal(h.sent.length, 0);
  } finally { await h.cleanup(); }
});

test('legacy bridge state reads default preferences without rewriting until explicitly saved', async () => {
  const h = await harness();
  try {
    const path = join(h.dataDir, 'orca-bridge.json');
    const legacy = JSON.stringify({ schemaVersion: 1, attachment: null, receipts: [] });
    await h.store.atomicWrite(path, legacy);
    const bridge = h.create();
    assert.equal((await bridge.status()).preferences.claude.model, 'claude-opus-5-5');
    assert.equal(await readFile(path, 'utf8'), legacy);
    await bridge.setPreferences({ provider: 'claude', model: 'claude-opus-5-5', effort: 'low' });
    assert.equal(JSON.parse(await readFile(path, 'utf8')).preferences.claude.effort, 'low');
    assert.equal(h.sent.length, 0);
  } finally { await h.cleanup(); }
});

test('successful native launch can switch provider only through explicit detach and another start', async () => {
  const h = await harness();
  try {
    let creates = 0;
    h.transport.prepareSession = async (provider, preference) => ({ state: 'uncertain', provider, preference, sessionId: provider + '-session-' + (creates + 1), createParams: { envelope: { clientOperationId: 'operation-' + (creates + 1) } }, optionRequests: [], reason: 'Recorded.' });
    h.transport.launchSession = async launch => {
      creates++;
      return { kind: 'native', sessionId: launch.sessionId, handle: launch.sessionId, runtimeId: target.runtimeId, worktreeId: target.worktreeId, worktreePath: target.worktreePath, executionHostId: 'local', agentIdentity: launch.provider };
    };
    const first = await h.bridge.startSession(); assert.equal(first.attachment?.target.agentIdentity, 'claude');
    await h.bridge.setPreferences({ provider: 'codex', model: 'gpt-6.1-sol', effort: 'high' });
    await h.bridge.startSession(); assert.equal(creates, 1);
    await h.bridge.detach();
    const second = await h.bridge.startSession(); assert.equal(creates, 2);
    assert.equal(second.attachment?.target.agentIdentity, 'codex');
    assert.notEqual(second.attachment?.target.handle, first.attachment?.target.handle);
    assert.equal(h.sent.length, 0);
  } finally { await h.cleanup(); }
});
