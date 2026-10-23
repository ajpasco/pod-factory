import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPreparationServer } from '../src/server.js';
import type { OrcaTarget, OrcaTransport } from '../src/orca-bridge.js';

test('browser save notifies exact paired owner; CLI, failed mutation and restart do not create notification loops', async () => {
  const dataDir = await mkdtemp(join(tmpdir(), 'orca-http-'));
  const target: OrcaTarget = { runtimeId: 'runtime', handle: 'term-owner', ptyId: 'pty', incarnationId: 'instance', worktreeId: 'worktree', worktreePath: dataDir, executionHostId: 'local', agentIdentity: 'codex' };
  const sent: { target: OrcaTarget; message: string }[] = [];
  const transport: OrcaTransport = { async targets() { return [target]; }, async verify(value) { return { target: value, state: 'ready' }; },
    async send(value, message) { sent.push({ target: value, message }); return { accepted: true, requestId: 'fixture-receipt', stage: 'input_accepted' }; } };
  const provider = { async draft() { return { prdMarkdown: '# Sample scope', mockupHtml: '<html><body>Sample</body></html>', proposals: [], findings: [] }; } };
  async function start() {
    const { server } = await createPreparationServer({ dataDir, workspacePath: dataDir, provider, orcaTransport: transport });
    await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
    const address = server.address(); assert.ok(address && typeof address !== 'string');
    const origin = `http://127.0.0.1:${address.port}`;
    const token = /name="preparation-token" content="([a-f0-9]+)"/.exec(await (await fetch(origin)).text())![1];
    return { get: async (route: string) => (await fetch(origin + route)).json(), post: (route: string, body: object, client = 'browser') => fetch(origin + route, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Preparation-Token': token, 'X-Preparation-Client': client }, body: JSON.stringify(body) }), close: () => new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done())) };
  }
  let app = await start();
  try {
    assert.equal((await app.get('/api/orca')).attachment, null);
    await app.post('/api/preparation', { idea: 'Private product idea', operationId: 'create' });
    assert.equal((await app.get('/api/orca')).receipts.length, 0);
    assert.equal((await app.post('/api/orca/attach', { target, directPromptOptIn: true })).status, 200);
    let state = (await app.get('/api/preparation')).preparation;
    const answer = { revision: state.revision, answer: 'One private reader needs a private sample outcome.', operationId: 'answer' };
    assert.equal((await app.post('/api/answer', answer)).status, 200);
    let connection = await app.get('/api/orca');
    assert.equal(connection.receipts[0].state, 'delivered'); assert.equal(sent.length, 1);
    assert.deepEqual(sent[0].target, target); assert.doesNotMatch(sent[0].message, /Private product|private reader/);
    assert.match(sent[0].message, /not user approval/);
    assert.equal((await app.post('/api/answer', answer)).status, 409);
    assert.equal(sent.length, 1);
    state = (await app.get('/api/preparation')).preparation;
    await app.post('/api/draft', { revision: state.revision, operationId: 'cli-draft' }, 'cli');
    for (let n = 0; n < 100; n++) { state = (await app.get('/api/preparation')).preparation; if (state.task?.status === 'completed') break; await new Promise(done => setTimeout(done, 5)); }
    assert.equal(sent.length, 1, 'CLI activity must not notify its own session');
    await app.post('/api/changes', { revision: state.revision, feedback: 'Change the title.', operationId: 'browser-change' });
    for (let n = 0; n < 100; n++) { connection = await app.get('/api/orca'); if (connection.receipts.length === 2) break; await new Promise(done => setTimeout(done, 5)); }
    assert.equal(connection.receipts[1].eventType, 'task-finished'); assert.equal(sent.length, 2);
    const before = connection;
    await app.close(); app = await start();
    assert.deepEqual(await app.get('/api/orca'), before); assert.equal(sent.length, 2);
    await app.post('/api/orca/detach', {});
    state = (await app.get('/api/preparation')).preparation;
    await app.post('/api/changes', { revision: state.revision, feedback: 'Another title.', operationId: 'unpaired-change' });
    for (let n = 0; n < 100 && (await app.get('/api/preparation')).preparation.task?.status === 'running'; n++) await new Promise(done => setTimeout(done, 5));
    assert.equal(sent.length, 2);
  } finally { await app.close(); await rm(dataDir, { recursive: true, force: true }); }
});
