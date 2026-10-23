import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { handoffCli, listHandoffTargets, parseHandoff, sendHandoff, type CliResponse, type HandoffRequest, type HandoffTarget, type OrcaExecutor } from '../src/session-handoff.js';

// LABELED FAKE: every send below is an in-memory Orca executor, never the installed transport.
const recipient: HandoffTarget = { runtimeId: 'runtime-one', handle: 'term_recipient', ptyId: 'pty-one', incarnationId: 'incarnation-one', worktreeId: 'workspace-one', worktreePath: '/project', executionHostId: 'local', agentIdentity: 'claude' };
const sender: HandoffTarget = { ...recipient, handle: 'term_sender', ptyId: 'pty-sender', incarnationId: 'incarnation-sender', agentIdentity: 'codex' };
const request = (): HandoffRequest => ({ schemaVersion: 1, messageId: 'test-handoff-1', from: 'codex', recipient, returnAddress: sender, text: 'Review this evidence.\nArtifact: /project/report.txt\tPlease reply once.' });
const response = (result: Record<string, unknown>): CliResponse => ({ ok: true, _meta: { runtimeId: recipient.runtimeId }, result });
async function harness() {
  const dir = await mkdtemp(join(tmpdir(), 'handoff-fake-'));
  const calls: { method: string; params: Record<string, any> }[] = [];
  let show = 0, send = 0;
  let current: Record<string, unknown> = { ...recipient, connected: true, writable: true, orphaned: false, agentWait: null };
  let busy = false;
  let hook: (method: string, params: Record<string, any>, count: number) => Promise<CliResponse | undefined> = async () => undefined;
  const run: OrcaExecutor = async (method, params) => {
    calls.push({ method, params });
    const count = method === 'terminal.show' ? ++show : method === 'terminal.send' ? ++send : 0;
    const custom = await hook(method, params, count); if (custom) return custom;
    if (method === 'status.get') return response({ runtimeId: recipient.runtimeId, appVersion: '1.4.224' });
    if (method === 'terminal.list') return response({ terminals: [current], truncated: false });
    if (method === 'terminal.show') return response({ terminal: current });
    if (method === 'terminal.wait') return response({ wait: { handle: recipient.handle, condition: 'tui-idle', status: 'running', satisfied: !busy } });
    assert.equal(method, 'terminal.send');
    const disk = JSON.parse(await readFile(join(dir, request().messageId + '.json'), 'utf8'));
    assert.equal(disk[params.enter ? 'submit' : 'text'], 'uncertain', 'ambiguity fence must precede BOTH writes');
    assert.equal(params.requireAgentStatus, 'sendable'); assert.equal(params.requireWriteSettlement, true);
    assert.deepEqual(params.client, { id: 'session-handoff', type: 'desktop' });
    assert.equal(params.terminal, recipient.handle); assert.equal('agentPrompt' in params, false);
    assert.equal(!!params.text && !!params.enter, false, 'guarded combined prompts are forbidden');
    return response({ send: { handle: recipient.handle, accepted: true, writeSettlement: { outcome: 'accepted' } } });
  };
  return { dir, calls, run, current,
    hook(value: typeof hook) { hook = value; }, busy() { busy = true; },
    writes: () => calls.filter(c => c.method === 'terminal.send'),
    cleanup: () => rm(dir, { recursive: true, force: true }) };
}

test('fake executor: read-only inventory returns exact target identity, never focus/title or send', async () => {
  const h = await harness(); try {
    assert.deepEqual(await listHandoffTargets('/project', h.run), [recipient]);
    assert.deepEqual(h.calls, [{ method: 'terminal.list', params: { worktree: 'path:/project' } }]);
    await assert.rejects(listHandoffTargets('relative', h.run), /absolute/);
    h.hook(async method => method === 'terminal.list' ? response({ terminals: [recipient], truncated: true }) : undefined);
    await assert.rejects(listHandoffTargets('/project', h.run), /Complete/);
  } finally { await h.cleanup(); }
});

test('fake executor: exact identity and durable evidence precede each guarded phase; truthful receipt', async () => {
  const h = await harness(); try {
    const result = await sendHandoff(request(), h.dir, h.run);
    assert.equal(result.delivery, 'submitted'); assert.equal(result.text, 'accepted'); assert.equal(result.submit, 'accepted');
    assert.equal(result.turnStarted, 'unknown'); assert.equal(result.reply, 'unknown'); assert.equal(result.completion, 'unknown'); assert.equal(result.humanApproval, false);
    assert.deepEqual(h.calls.map(c => c.method), ['status.get', 'terminal.show', 'terminal.wait', 'status.get', 'terminal.show', 'terminal.send', 'terminal.wait', 'status.get', 'terminal.show', 'terminal.send']);
    const text = h.writes()[0].params.text as string;
    assert.doesNotMatch(text, /[\x00-\x1f\x7f-\x9f]/); assert.match(text, /Agent-origin/); assert.match(text, /not a human approval/);
    const data = JSON.parse(text); assert.equal(data.messageId, request().messageId); assert.deepEqual(data.returnAddress, sender); assert.equal(data.text, request().text);
    assert.equal('text' in h.writes()[1].params, false); assert.equal(h.writes()[1].params.enter, true);
    assert.deepEqual(JSON.parse(await readFile(join(h.dir, result.messageId + '.json'), 'utf8')), result);
    // A new invocation returns evidence, including after a rejected or uncertain attempt.
    assert.deepEqual(await sendHandoff(request(), h.dir, async () => { throw new Error('must not contact Orca'); }), result);
    await assert.rejects(sendHandoff({ ...request(), text: 'different' }, h.dir, h.run), /conflicting/);
    assert.equal(h.writes().length, 2);
  } finally { await h.cleanup(); }
});

test('missing, guessed, nonlocal and control-bearing requests fail before any runtime call', async () => {
  const h = await harness(); try {
    for (const bad of [undefined, {}, { ...request(), recipient: { handle: recipient.handle } },
      { ...request(), recipient: { ...recipient, handle: 'current' } }, { ...request(), recipient: { ...recipient, executionHostId: 'remote' } },
      { ...request(), returnAddress: recipient }, { ...request(), from: 'claude' }, { ...request(), messageId: '../escape' },
      { ...request(), text: 'x'.repeat(8001) }, ...['\x1b[2J', '\r', '\x00', '\x7f', '\x9b'].map(text => ({ ...request(), text }))]) {
      await assert.rejects(sendHandoff(bad, h.dir, h.run));
    }
    assert.equal(h.calls.length, 0);
    assert.equal(parseHandoff(request()).text, request().text, 'ordinary newline/tab are data');
  } finally { await h.cleanup(); }
});

for (const change of [{ incarnationId: 'replacement' }, { ptyId: 'replacement' }, { worktreePath: '/other' }, { agentIdentity: 'codex' }, { handle: 'term_other' }, { connected: false }, { writable: false }, { orphaned: true }, { agentWait: { kind: 'permission' } }, { agentWait: undefined }]) {
  test(`fake executor: wrong/closed/waiting recipient ${JSON.stringify(change)} cannot receive input`, async () => {
    const h = await harness(); try { Object.assign(h.current, change); await assert.rejects(sendHandoff(request(), h.dir, h.run)); assert.equal(h.writes().length, 0); } finally { await h.cleanup(); }
  });
}

test('fake executor: busy or unreachable recipient is never submitted', async () => {
  const h = await harness(); try {
    h.busy(); await assert.rejects(sendHandoff(request(), h.dir, h.run), /busy/); assert.equal(h.writes().length, 0);
    h.hook(async () => { throw new Error('unreachable'); }); await assert.rejects(sendHandoff(request(), h.dir, h.run), /unreachable/); assert.equal(h.writes().length, 0);
  } finally { await h.cleanup(); }
});

for (const [label, mutate] of [
  ['agent exits', (t: Record<string, unknown>) => { t.agentIdentity = undefined; }],
  ['permission appears', (t: Record<string, unknown>) => { t.agentWait = { kind: 'permission' }; }],
  ['incarnation changes', (t: Record<string, unknown>) => { t.incarnationId = 'new-incarnation'; }],
] as const) {
  test(`fake executor: ${label} after text prevents Enter and leaves partial evidence`, async () => {
    const h = await harness(); try {
      h.hook(async (method, _, count) => { if (method === 'terminal.show' && count === 3) mutate(h.current); return undefined; });
      const receipt = await sendHandoff(request(), h.dir, h.run);
      assert.equal(receipt.delivery, 'partial'); assert.equal(receipt.text, 'accepted'); assert.equal(receipt.submit, 'not-attempted');
      assert.equal(h.writes().length, 1); assert.equal(h.calls.some(c => c.params.enter), false);
      await sendHandoff(request(), h.dir, h.run); assert.equal(h.writes().length, 1);
    } finally { await h.cleanup(); }
  });
}

for (const phase of [1, 2]) {
  for (const outcome of ['refused', 'unverifiable', 'missing', 'throw', 'wrong-runtime'] as const) {
    test(`fake executor: phase ${phase} ${outcome} stops without retry, completion or approval`, async () => {
      const h = await harness(); try {
        h.hook(async (method, _, count) => {
          if (method !== 'terminal.send' || count !== phase) return undefined;
          if (outcome === 'throw') throw new Error('lost after possible acceptance');
          const result = response({ send: { handle: recipient.handle, accepted: outcome !== 'refused', ...(outcome === 'missing' ? {} : { writeSettlement: { outcome: outcome === 'wrong-runtime' ? 'accepted' : outcome } }) } });
          if (outcome === 'wrong-runtime') result._meta!.runtimeId = 'replacement-runtime';
          return result;
        });
        const receipt = await sendHandoff(request(), h.dir, h.run);
        assert.equal(receipt.delivery, phase === 2 ? 'partial' : outcome === 'refused' ? 'refused' : 'uncertain');
        assert.equal(receipt[phase === 1 ? 'text' : 'submit'], outcome === 'refused' ? 'refused' : 'uncertain');
        assert.equal(receipt.turnStarted, 'unknown'); assert.equal(receipt.completion, 'unknown'); assert.equal(receipt.humanApproval, false);
        assert.equal(h.writes().length, phase);
        await sendHandoff(request(), h.dir, h.run); assert.equal(h.writes().length, phase);
      } finally { await h.cleanup(); }
    });
  }
}

test('fake executor: corrupt/preexisting attempt evidence fails closed; duplicate concurrent calls cannot duplicate writes', async () => {
  const h = await harness(); try {
    await writeFile(join(h.dir, request().messageId + '.json'), 'crash-truncated');
    await assert.rejects(sendHandoff(request(), h.dir, h.run)); assert.equal(h.calls.length, 0);
    await rm(join(h.dir, request().messageId + '.json'));
    const results = await Promise.allSettled([sendHandoff(request(), h.dir, h.run), sendHandoff(request(), h.dir, h.run)]);
    assert.equal(results.some(r => r.status === 'fulfilled'), true); assert.equal(h.writes().length, 2);
  } finally { await h.cleanup(); }
});

test('CLI rejects unknown/retry/interrupt/send omission and can list without any send', async () => {
  const h = await harness(); try {
    for (const args of [[], ['send'], ['list', '--workspace', '/project', '--interrupt', 'yes'], ['send', '--retry-request', 'id'], ['list', '--workspace', '/project', '--workspace', '/other']]) await assert.rejects(handoffCli(args, h.run));
    assert.equal(h.calls.length, 0); assert.deepEqual(await handoffCli(['list', '--workspace', '/project'], h.run), { targets: [recipient] }); assert.equal(h.writes().length, 0);
  } finally { await h.cleanup(); }
});


test('fake executor: busy transition after text never presses Enter', async () => {
  const h = await harness(); try {
    h.hook(async (method, _, count) => { if (method === 'terminal.send' && count === 1) h.busy(); return undefined; });
    const receipt = await sendHandoff(request(), h.dir, h.run);
    assert.equal(receipt.delivery, 'partial'); assert.equal(receipt.submit, 'not-attempted'); assert.equal(h.writes().length, 1);
  } finally { await h.cleanup(); }
});

test('fake executor: final identity check before text catches a replacement after readiness', async () => {
  const h = await harness(); try {
    h.hook(async (method, _, count) => { if (method === 'terminal.show' && count === 2) h.current.incarnationId = 'replacement'; return undefined; });
    const receipt = await sendHandoff(request(), h.dir, h.run);
    assert.equal(receipt.delivery, 'refused'); assert.equal(receipt.text, 'not-attempted'); assert.equal(h.writes().length, 0);
  } finally { await h.cleanup(); }
});


test('fake executor: unsupported/missing host guard version refuses before any terminal input', async () => {
  const h = await harness(); try {
    for (const appVersion of [undefined, '1.4.223', '1.4.225']) {
      h.hook(async method => method === 'status.get' ? response({ runtimeId: recipient.runtimeId, appVersion }) : undefined);
      await assert.rejects(sendHandoff(request(), h.dir, h.run), /Unsupported/);
    }
    assert.equal(h.writes().length, 0);
  } finally { await h.cleanup(); }
});
