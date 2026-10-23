import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OrcaBridge, type OrcaTransport } from '../src/orca-bridge.js';
import { OrcaNativeTransport, type OrcaRpc } from '../src/orca-native.js';
import { PreparationStore } from '../src/store.js';

async function fixture(failure = '') {
  const dataDir = await mkdtemp(join(tmpdir(), 'orca-workspace-'));
  const store = new PreparationStore(dataDir);
  const calls: { method: string; params: any }[] = [];
  let created = false;
  const source = { id: 'repo::/source', path: '/source', repoId: 'repo', hostId: 'local' };
  const project = { id: 'repo::/equipment', path: '/equipment', repoId: 'repo', hostId: 'local' };
  const rpc: OrcaRpc = async (method, params, options) => {
    calls.push({ method, params });
    const reply = (result: any) => ({ ok: true, _meta: { runtimeId: 'runtime' }, result });
    if (method === 'worktree.show') return reply({ worktree: params.worktree === 'path:/source' ? source : { ...project, ...(failure === 'verify' ? { id: 'replacement' } : {}) } });
    if (method === 'repo.show') return reply({ repo: { id: 'repo', kind: 'git', worktreeBaseRef: 'main' } });
    if (method === 'worktree.create') {
      const saved = JSON.parse(await readFile(join(dataDir, 'orca-bridge.json'), 'utf8'));
      assert.equal(saved.workspace.state, 'uncertain');
      assert.deepEqual(saved.workspace.createParams, params);
      assert.equal(params.activate, true); assert.equal(params.navigation, 'host');
      assert.equal(params.setupDecision, 'skip'); assert.equal(params.runHooks, false);
      assert.equal(params.noParent, true); assert.equal(params.baseBranch, 'main');
      assert.equal(params.startupAgent, undefined); assert.equal(params.startupPrompt, undefined);
      if (failure === 'create') throw new Error('Disconnected after possible creation');
      return reply({ worktree: { ...project, ...(failure === 'wrong-repo' ? { repoId: 'other' } : {}) } });
    }
    if (method === 'agentSession.createSupport') { assert.equal(params.worktree, 'path:/equipment'); return reply({ supported: true }); }
    if (method === 'agentSession.create') {
      assert.equal(params.worktree, 'path:/equipment');
      created = true; return reply({ ok: true, fence: 1, value: { sessionId: 'codex_equipment' } });
    }
    if (method === 'agentSession.setOption') return reply({ ok: true, fence: params.envelope.expectedRuntimeFence + 1, value: { key: params.key, value: params.value } });
    if (method === 'agentSession.reveal') return reply({ ok: failure !== 'reveal', sessionId: 'codex_equipment', workspaceId: project.id, agent: 'codex', readable: true });
    if (method === 'agentSession.options') return reply({ current: { model: 'gpt-6.1-sol', effort: 'high' } });
    if (method === 'session.tabs.list') return reply({ worktree: params.worktree === 'path:/source' ? source.id : project.id,
      tabs: created && params.worktree === 'path:/equipment' ? [{ type: 'agent-session', sessionId: 'codex_equipment', agent: 'codex' }] : [] });
    if (method === 'terminal.show') return reply({ terminal: { handle: 'service-sender', worktreeId: source.id, worktreePath: source.path } });
    if (method === 'orchestration.send') return reply({ message: { id: 'message' }, mutation: { requestId: options?.orchestrationRequestId } });
    throw new Error('Unexpected RPC ' + method);
  };
  const fallback: OrcaTransport = { async targets() { return []; }, async verify() { return { state: 'unavailable' }; }, async send() { throw new Error('No terminal fallback'); } };
  const make = () => {
    const transport = new OrcaNativeTransport({ workspacePath: '/source', rpc, terminalTransport: fallback, senderHandle: 'service-sender', builders: {
      create(agent, workspace) { return { envelope: { sessionId: 'codex_equipment' }, worktree: 'path:' + workspace, agent }; },
      option(sessionId, key, value, fence) { return { envelope: { sessionId, expectedRuntimeFence: fence }, key, value }; },
    } });
    return { bridge: new OrcaBridge({ store, transport, workspacePath: '/source' }), transport };
  };
  const initial = make();
  await initial.bridge.setPreferences({ provider: 'codex', model: 'gpt-6.1-sol', effort: 'high' });
  return { ...initial, make, calls, store, cleanup: () => rm(dataDir, { recursive: true, force: true }) };
}

test('named workspace is created once, revealed, then used for chat, discovery and restart', async () => {
  const h = await fixture();
  try {
    const state = await h.bridge.startSession({ workspaceName: 'Equipment Checkout' });
    assert.equal(state.workspace?.state, 'ready'); assert.equal(state.workspacePath, '/equipment');
    assert.equal(state.attachment?.target.worktreePath, '/equipment'); assert.equal(state.launch?.state, 'paired');
    assert.equal(state.workspace?.name, 'Equipment Checkout');
    assert.ok(h.calls.findIndex(c => c.method === 'worktree.create') < h.calls.findIndex(c => c.method === 'agentSession.create'));
    await h.bridge.startSession({ workspaceName: 'Equipment Checkout' });
    const restarted = h.make();
    await restarted.bridge.startSession({ workspaceName: 'Equipment Checkout' });
    assert.equal((await restarted.bridge.targets())[0].worktreePath, '/equipment');
    assert.equal(h.calls.filter(c => c.method === 'worktree.create').length, 1);
    assert.equal(h.calls.filter(c => c.method === 'agentSession.create').length, 1);
    assert.equal(h.calls.filter(c => c.method === 'agentSession.reveal').length, 1);
    await restarted.bridge.reveal();
    assert.equal(h.calls.filter(c => c.method === 'agentSession.reveal').length, 2);
    assert.equal(h.calls.some(c => /send|close|remove/.test(c.method)), false);
    await assert.rejects(h.bridge.startSession({ workspaceName: 'Other' }), /already has a workspace/);
  } finally { await h.cleanup(); }
});

for (const failure of ['create', 'wrong-repo', 'verify']) {
  test(`workspace ${failure} leaves durable uncertainty with no chat, retry or replacement`, async () => {
    const h = await fixture(failure);
    try {
      const state = await h.bridge.startSession({ workspaceName: 'Equipment Checkout' });
      assert.equal(state.workspace?.state, 'uncertain'); assert.equal(state.attachment, null);
      const before = h.calls.length;
      await h.make().bridge.startSession({ workspaceName: 'Equipment Checkout' });
      assert.equal(h.calls.length, before); assert.equal(h.calls.some(c => c.method === 'agentSession.create'), false);
    } finally { await h.cleanup(); }
  });
}

test('cross-workspace notification still verifies the original service sender and exact new recipient', async () => {
  const h = await fixture();
  try {
    const state = await h.bridge.startSession({ workspaceName: 'Equipment Checkout' });
    const result = await h.transport.send(state.attachment!.target, 'Saved state pointer; not approval', 'request-one');
    assert.equal(result.accepted, true);
    const send = h.calls.find(c => c.method === 'orchestration.send')!;
    assert.equal(send.params.from, 'service-sender'); assert.equal(send.params.to, 'orca_session_id:codex_equipment');
  } finally { await h.cleanup(); }
});

test('invalid names are refused before worktree effects', async () => {
  const h = await fixture();
  try {
    for (const workspaceName of ['', '../escape', 'a\ncommand', '-flag']) await assert.rejects(h.bridge.startSession({ workspaceName }), /workspace name/);
    assert.equal(h.calls.length, 0);
  } finally { await h.cleanup(); }
});

test('an existing owner must be explicitly disconnected, not silently replaced', async () => {
  const h = await fixture();
  try {
    const saved = await h.bridge.status();
    const target = { kind: 'native', sessionId: 'old-chat', handle: 'old-chat', runtimeId: 'runtime', worktreeId: 'repo::/source', worktreePath: '/source', executionHostId: 'local', agentIdentity: 'codex' };
    await h.store.atomicWrite(join(h.store.dataDir, 'orca-bridge.json'), JSON.stringify({ ...saved, attachment: { target, directPromptOptIn: true, attachedAt: 'fixture' } }));
    await assert.rejects(h.make().bridge.startSession({ workspaceName: 'Equipment Checkout' }), /Disconnect/);
    assert.equal(h.calls.length, 0);
  } finally { await h.cleanup(); }
});


test('failed chat reveal retains the created chat without automatic replacement', async () => {
  const h = await fixture('reveal');
  try {
    const state = await h.bridge.startSession({ workspaceName: 'Equipment Checkout' });
    assert.equal(state.workspace?.state, 'ready'); assert.equal(state.launch?.state, 'partial');
    assert.equal(state.attachment, null); assert.match(state.launch!.reason, /revealing/);
    await h.make().bridge.startSession({ workspaceName: 'Equipment Checkout' });
    assert.equal(h.calls.filter(c => c.method === 'agentSession.create').length, 1);
    assert.equal(h.calls.filter(c => c.method === 'worktree.create').length, 1);
  } finally { await h.cleanup(); }
});
