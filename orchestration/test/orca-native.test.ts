import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OrcaBridge, type OrcaNativeTarget, type OrcaTerminalTarget, type OrcaTransport } from '../src/orca-bridge.js';
import { OrcaNativeTransport, type OrcaRpc, type OrcaNativeBuilders } from '../src/orca-native.js';
import { PreparationStore } from '../src/store.js';
import type { Preparation } from '../src/types.js';

const target: OrcaNativeTarget = { kind: 'native', sessionId: 'claude_native_one', handle: 'claude_native_one', runtimeId: 'runtime-one',
  worktreeId: 'workspace-one', worktreePath: '/project', agentIdentity: 'claude', executionHostId: 'local' };
const terminalTransport: OrcaTransport = { deliverySupported: false, unsupportedReason: 'Terminal fallback disabled.', async targets() { return []; }, async verify() { return { state: 'unavailable' }; }, async send() { throw new Error('No terminal sends.'); } };
const builders: OrcaNativeBuilders = {
  create(agent, workspace) { return { envelope: { sessionId: target.sessionId, clientOperationId: 'create-op', expectedRuntimeFence: null, payloadFingerprint: 'create-fingerprint' }, worktree: 'path:' + workspace, agent }; },
  option(sessionId, key, value, fence) { return { envelope: { sessionId, clientOperationId: randomUUID(), expectedRuntimeFence: fence, payloadFingerprint: key + value }, key, value }; },
};
async function harness() {
  const dataDir = await mkdtemp(join(tmpdir(), 'orca-native-'));
  const store = new PreparationStore(dataDir);
  let listed = false, runtimeId = target.runtimeId, provider = 'claude';
  let mismatch = false, idleAlias = false, failOption = false, failCreate = false, senderMismatch = false, createCount = 0;
  let current = { model: 'unset', effort: 'unset', confirmed: [] as string[] };
  const calls: { method: string; params: Record<string, any>; options?: Record<string, any> }[] = [];
  const rpc: OrcaRpc = async (method, params, options) => {
    calls.push({ method, params: structuredClone(params), options });
    const envelope = (result: any) => ({ ok: true, _meta: { runtimeId }, result });
    if (method === 'agentSession.createSupport') return envelope({ supported: true });
    if (method === 'session.tabs.list') return envelope({ worktree: target.worktreeId, tabs: listed ? [{ type: 'agent-session', id: 'tab-one', sessionId: target.sessionId, agent: provider }] : [] });
    if (method === 'agentSession.create') {
      createCount++;
      const durable = JSON.parse(await readFile(join(dataDir, 'orca-bridge.json'), 'utf8'));
      assert.deepEqual(durable.launch.createParams, params, 'the entire create request must precede the effect');
      assert.equal(durable.launch.state, 'uncertain');
      if (failCreate) throw new Error('connection lost after possible create');
      listed = true;
      return envelope({ ok: true, fence: 1, value: { sessionId: target.sessionId, fence: 1 } });
    }
    if (method === 'agentSession.setOption') {
      const durable = JSON.parse(await readFile(join(dataDir, 'orca-bridge.json'), 'utf8'));
      assert.deepEqual(durable.launch.optionRequests.at(-1).params, params, 'each options request must precede the effect');
      assert.equal(durable.launch.sessionId, target.sessionId);
      if (failOption) throw new Error('configuration outcome uncertain');
      current = { ...current, [params.key]: params.value, confirmed: [...current.confirmed, params.key] };
      return envelope({ ok: true, fence: params.envelope.expectedRuntimeFence + 1, value: { key: params.key, value: mismatch && params.key === 'model' ? 'wrong-model' : params.value } });
    }
    if (method === 'agentSession.reveal') return envelope({ ok: true, sessionId: target.sessionId, workspaceId: target.worktreeId, agent: provider, readable: true });
    if (method === 'agentSession.options') return envelope({ current: idleAlias ? { model: 'opus', effort: 'medium', confirmed: ['effort', 'fastMode'] } : current });
    if (method === 'terminal.show') return envelope({ terminal: { handle: params.terminal, worktreeId: senderMismatch ? 'another-workspace' : target.worktreeId, worktreePath: '/project' } });
    if (method === 'orchestration.send') {
      assert.equal(params.from, 'actual-service-sender'); assert.equal(params.to, 'orca_session_id:' + target.sessionId);
      const durable = JSON.parse(await readFile(join(dataDir, 'orca-bridge.json'), 'utf8'));
      assert.equal(durable.receipts.at(-1).requestId, options?.orchestrationRequestId);
      assert.equal(durable.receipts.at(-1).state, 'uncertain');
      return envelope({ message: { id: 'mail-one' }, mutation: { requestId: options?.orchestrationRequestId, replayed: false } });
    }
    throw new Error('Unexpected RPC method ' + method);
  };
  const transport = new OrcaNativeTransport({ workspacePath: '/project', terminalTransport, rpc, builders, senderHandle: 'actual-service-sender' });
  const create = () => new OrcaBridge({ store, transport, workspacePath: '/project' });
  return { dataDir, store, rpc, transport, bridge: create(), create, calls, createCount: () => createCount,
    setListed(value: boolean) { listed = value; }, setRuntime(value: string) { runtimeId = value; }, setProvider(value: string) { provider = value; },
    mismatchOptions() { mismatch = true; }, idleModelAlias() { idleAlias = true; }, failOption() { failOption = true; }, failCreate() { failCreate = true; }, mismatchSender() { senderMismatch = true; },
    cleanup: () => rm(dataDir, { recursive: true, force: true }) };
}
const preparation: Preparation = { schemaVersion: 1, id: 'prep-native', revision: 2, stage: 'intake', idea: 'PRIVATE IDEA', question: { id: 'q', prompt: 'PRIVATE', answer: 'PRIVATE' },
  confirmedScope: [], proposals: [], findings: [], feedback: [], artifacts: {}, operations: [], blockers: [], nextAction: 'PRIVATE' };

test('open an existing CLI uses its exact incarnation and host navigation without sending or creating', async () => {
  const terminal: OrcaTerminalTarget = { ...target, kind: 'terminal', handle: 'term-one', ptyId: 'pty-one', incarnationId: 'inc-one' };
  const calls: string[] = []; let stale = false, visible = true;
  const rpc: OrcaRpc = async (method, params) => {
    calls.push(method);
    if (method === 'terminal.show') return { ok: true, _meta: { runtimeId: target.runtimeId }, result: { terminal: { ...terminal, connected: true, incarnationId: stale ? 'replacement' : terminal.incarnationId } } };
    if (method === 'session.tabs.list') return { ok: true, _meta: { runtimeId: target.runtimeId }, result: { tabs: [{ type: 'terminal', terminal: terminal.handle, incarnationId: terminal.incarnationId, isActive: visible }] } };
    assert.equal(method, 'terminal.focus'); assert.equal(params.navigation, 'host');
    assert.equal(params.expectedIncarnationId, terminal.incarnationId);
    return { ok: true, _meta: { runtimeId: target.runtimeId }, result: { focus: { handle: terminal.handle, worktreeId: terminal.worktreeId } } };
  };
  const transport = new OrcaNativeTransport({ workspacePath: '/project', terminalTransport, rpc });
  await transport.reveal(terminal); assert.deepEqual(calls, ['terminal.show', 'terminal.focus', 'session.tabs.list']);
  visible = false;
  await assert.rejects(transport.reveal(terminal), /did not confirm.*visible/);
  stale = true;
  await assert.rejects(transport.reveal(terminal), /session changed/);
  await assert.rejects(transport.reveal({ ...terminal, worktreePath: '/other' }), /another workspace/);
  assert.equal(calls.filter(c => c === 'terminal.focus').length, 2);
});

test('explicit native start persists create/options, accepts defaults and pairs without a prompt', async () => {
  const h = await harness();
  try {
    const status = await h.bridge.startSession();
    assert.equal(status.launch?.state, 'paired'); assert.deepEqual(status.attachment?.target, target);
    assert.equal(status.launch?.modelConfirmation, 'pending-provider-turn');
    assert.equal(status.capabilities.deliverySupported, true); assert.equal(status.capabilities.startSupported, true);
    assert.deepEqual(h.calls.filter(call => call.method === 'agentSession.setOption').map(call => [call.params.key, call.params.value]), [['model', 'claude-opus-5-5'], ['effort', 'medium']]);
    assert.equal(h.calls.some(call => /send/i.test(call.method)), false);
    await h.bridge.startSession(); await h.create().startSession(); assert.equal(h.createCount(), 1);
    assert.equal((await h.create().status()).launch?.state, 'paired');
    assert.equal(h.calls.filter(call => call.method === 'agentSession.reveal').length, 1);
    await h.bridge.reveal(); assert.equal(h.createCount(), 1);
    assert.equal(h.calls.filter(call => call.method === 'agentSession.reveal').length, 2);
  } finally { await h.cleanup(); }
});

test('mismatched model mutation acknowledgement leaves the exact created session partial and never creates another', async () => {
  const h = await harness();
  try {
    h.mismatchOptions(); const status = await h.bridge.startSession();
    assert.equal(status.attachment, null); assert.equal(status.launch?.state, 'partial');
    assert.equal(status.launch?.sessionId, target.sessionId); assert.match(status.launch!.reason, /did not confirm/);
    await h.create().startSession(); assert.equal(h.createCount(), 1);
    assert.equal(h.calls.filter(call => call.method === 'agentSession.setOption').length, 1);
  } finally { await h.cleanup(); }
});

test('idle Claude family alias pairs after exact requested model receipts with provider confirmation pending', async () => {
  const h = await harness();
  try {
    h.idleModelAlias();
    const status = await h.bridge.startSession();
    assert.equal(status.launch?.state, 'paired'); assert.equal(status.launch?.modelConfirmation, 'pending-provider-turn');
    assert.equal(status.launch?.preference.model, 'claude-opus-5-5');
    assert.match(status.launch!.reason, /provider model confirmation awaits a turn/);
    assert.deepEqual(status.attachment?.target, target);
    assert.equal(h.calls.some(call => /send/i.test(call.method)), false);
  } finally { await h.cleanup(); }
});

test('uncertain create and partial configuration retain requests across restart without retry', async () => {
  for (const failure of ['create', 'option']) {
    const h = await harness();
    try {
      if (failure === 'create') h.failCreate(); else h.failOption();
      const status = await h.bridge.startSession();
      assert.equal(status.attachment, null); assert.equal(status.launch?.state, failure === 'create' ? 'uncertain' : 'partial');
      assert.equal(status.launch?.sessionId, target.sessionId);
      const count = h.calls.length; await h.create().startSession(); assert.equal(h.calls.length, count); assert.equal(h.createCount(), 1);
    } finally { await h.cleanup(); }
  }
});

test('native inventory rejects missing, stale runtime, wrong provider and wrong workspace targets', async () => {
  const h = await harness();
  try {
    assert.equal((await h.transport.verify(target)).state, 'unavailable');
    h.setListed(true); assert.equal((await h.transport.verify(target)).state, 'ready');
    h.setRuntime('replacement-runtime'); assert.equal((await h.transport.verify(target)).state, 'unavailable');
    h.setRuntime(target.runtimeId); h.setProvider('codex'); assert.equal((await h.transport.verify(target)).state, 'unavailable');
    h.setProvider('claude'); assert.equal((await h.transport.verify({ ...target, worktreePath: '/another-project' })).state, 'unavailable');
    assert.equal(h.calls.some(call => /create$|setOption|send$/.test(call.method)), false);
  } finally { await h.cleanup(); }
});

test('native notice uses exact mailbox and real captured sender, and delivered means durable enqueue only', async () => {
  const h = await harness();
  try {
    await h.bridge.startSession();
    const receipt = await h.bridge.notify(preparation, 'answer-saved', 'http://127.0.0.1:4317');
    assert.equal(receipt?.state, 'delivered'); assert.equal(receipt?.stage, 'durable_enqueue'); assert.match(receipt!.reason, /durably enqueued/);
    assert.doesNotMatch(h.calls.find(call => call.method === 'orchestration.send')!.params.body, /PRIVATE/);
    await h.bridge.notify(preparation, 'answer-saved', 'http://127.0.0.1:4317'); await h.create().resume(receipt!.id);
    assert.equal(h.calls.filter(call => call.method === 'orchestration.send').length, 1);
  } finally { await h.cleanup(); }
});

test('absent sender stays pending and wrong sender workspace never enqueues', async () => {
  const h = await harness();
  try {
    h.setListed(true);
    const noSender = new OrcaNativeTransport({ workspacePath: '/project', terminalTransport, rpc: h.rpc, builders, senderHandle: '' });
    const bridge = new OrcaBridge({ store: h.store, transport: noSender, workspacePath: '/project' });
    await bridge.attach({ target, directPromptOptIn: true });
    assert.equal((await bridge.notify(preparation, 'answer-saved', 'http://127.0.0.1:4317'))?.state, 'pending');
    assert.equal(noSender.capabilities(target).deliverySupported, false);
    h.mismatchSender(); await assert.rejects(h.transport.send(target, 'notice', randomUUID()), /sender cannot be verified/);
    assert.equal(h.calls.some(call => call.method === 'orchestration.send'), false);
  } finally { await h.cleanup(); }
});
