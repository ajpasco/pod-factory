import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPreparationServer } from '../src/server.js';
import type { DraftProvider } from '../src/types.js';
import type { OrcaTransport } from '../src/orca-bridge.js';

const executable = fileURLToPath(new URL('../src/cli.js', import.meta.url));
function cli(args: string[]) {
  return new Promise<{ code: number; out: any; err: any }>(done => {
    execFile(process.execPath, [executable, ...args], (error, stdout, stderr) => done({
      code: error ? Number(error.code) || 1 : 0,
      out: stdout ? JSON.parse(stdout) : null, err: stderr ? JSON.parse(stderr) : null,
    }));
  });
}
async function setup(provider: DraftProvider, executionLimitMs?: number, orcaTransport?: OrcaTransport) {
  const dataDir = await mkdtemp(join(tmpdir(), 'preparation-cli-'));
  const { server } = await createPreparationServer({ dataDir, provider, executionLimitMs, orcaTransport });
  await new Promise<void>(done => server.listen(0, '127.0.0.1', done));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const url = `http://127.0.0.1:${address.port}`;
  return { url, run: (...args: string[]) => cli([...args, '--url', url]), async close() {
    await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done()));
    await rm(dataDir, { recursive: true, force: true });
  } };
}
const fixture: DraftProvider = { async draft(input) { return {
  prdMarkdown: `# Fixture\n${input.idea}\n${input.feedback.join('\n')}`,
  mockupHtml: `<html><body>Fixture ${input.feedback.join('\n')}</body></html>`, proposals: [], findings: [],
}; } };

test('CLI and browser share one workflow, reject stale/duplicate actions, and produce draft-only artifacts', async () => {
  const app = await setup(fixture);
  try {
    const created = await app.run('start', '--text', 'A reading list.', '--operation-id', 'create-one');
    assert.equal(created.code, 0); let state = created.out.preparation;
    assert.equal((await (await fetch(app.url + '/api/preparation')).json()).preparation.id, state.id);
    const token = /name="preparation-token" content="([a-f0-9]+)"/.exec(await (await fetch(app.url)).text())![1];
    // A browser answers; a CLI continues from the very same saved revision.
    const answered = await fetch(app.url + '/api/answer', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Preparation-Token': token },
      body: JSON.stringify({ revision: state.revision, answer: 'One reader chooses a book to read.', operationId: 'browser-answer' }) });
    assert.equal(answered.status, 200);
    const stale = await app.run('draft', '--id', state.id, '--revision', String(state.revision), '--operation-id', 'stale-draft');
    assert.equal(stale.code, 1); assert.match(stale.err.error, /409/);
    state = (await app.run('status')).out.preparation;
    const wrongId = await app.run('draft', '--id', 'another-preparation', '--revision', String(state.revision), '--operation-id', 'wrong-id');
    assert.equal(wrongId.code, 1); assert.match(wrongId.err.error, /active preparation changed/);
    assert.equal((await app.run('draft', '--id', state.id, '--revision', String(state.revision), '--operation-id', 'draft-one')).code, 0);
    state = (await app.run('status')).out.preparation; assert.equal(state.stage, 'review');
    assert.equal((await app.run('draft', '--id', state.id, '--revision', String(state.revision), '--operation-id', 'draft-one')).code, 1);
    assert.equal((await app.run('revise', '--id', state.id, '--revision', String(state.revision), '--operation-id', 'revision-one', '--text', 'Heading: My next book.')).code, 0);
    state = (await app.run('status')).out.preparation; assert.equal(state.artifacts.prd.revision, 2);
    for (const kind of ['prd', 'mockup']) assert.match((await app.run('artifact', '--kind', kind)).out.content, /My next book/);
    const packet = await app.run('packet'); assert.equal(packet.out.authority, 'draft-only');
    assert.equal(packet.out.approvalStatus, 'approval-channel-not-implemented');
    assert.deepEqual((await (await fetch(app.url + '/api/preparation')).json()).preparation, state);
  } finally { await app.close(); }
});

test('CLI reports interrupted tasks as failure and never automatically retries them', async () => {
  let calls = 0;
  const app = await setup({ draft() { calls++; return new Promise(() => {}); } }, 25);
  try {
    let state = (await app.run('start', '--text', 'A sample journey.', '--operation-id', 'start')).out.preparation;
    state = (await app.run('answer', '--id', state.id, '--revision', String(state.revision), '--operation-id', 'answer', '--text', 'One person chooses a sample.')).out.preparation;
    await app.run('draft', '--id', state.id, '--revision', String(state.revision), '--operation-id', 'draft');
    const result = await app.run('status'); assert.equal(result.code, 1); assert.equal(result.out.preparation.stage, 'interrupted');
    assert.equal(calls, 1);
    const retry = await app.run('draft', '--id', state.id, '--revision', String(result.out.preparation.revision), '--operation-id', 'retry');
    assert.equal(retry.code, 1); assert.equal(calls, 1);
  } finally { await app.close(); }
});

test('CLI refuses authority commands, remote origins and incomplete mutation options before connecting', async () => {
  for (const args of [['approve'], ['status', '--url', 'https://example.com'], ['draft'], ['start', '--text', 'Idea']]) {
    const result = await cli(args); assert.equal(result.code, 1); assert.ok(result.err.error);
  }
  assert.equal((await cli(['--help'])).code, 0);
});

test('CLI saves independent Claude and Codex preferences without starting or pairing a session', async () => {
  const app = await setup(fixture);
  try {
    let state = (await app.run('orca-status')).out;
    assert.equal(state.preferredProvider, 'claude');
    assert.deepEqual(state.preferences.claude, { model: 'claude-opus-5-5', effort: 'medium' });
    const changed = await app.run('orca-preferences', '--provider', 'codex');
    assert.equal(changed.code, 0); state = changed.out;
    assert.equal(state.preferredProvider, 'codex');
    assert.deepEqual(state.preferences.codex, { model: 'gpt-6.1-sol', effort: 'high' });
    assert.equal(state.attachment, null); assert.equal(state.receipts.length, 0);
    assert.equal((await app.run('orca-preferences', '--provider', 'codex', '--effort', 'unsupported')).code, 1);
    assert.equal((await app.run('orca-status')).out.preferences.codex.effort, 'high');
    assert.equal((await app.run('orca-preferences', '--provider', 'claude', '--model', 'custom-model')).code, 0);
    state = (await app.run('orca-status')).out;
    assert.equal(state.preferences.claude.model, 'custom-model');
    assert.equal(state.preferences.codex.model, 'gpt-6.1-sol');
    assert.equal(state.attachment, null); assert.equal(state.launch ?? null, null);
  } finally { await app.close(); }
});

test('CLI reports uncertain native creation as failure and a repeated request does not create again', async () => {
  let creates = 0;
  const transport: OrcaTransport = {
    async targets() { return []; }, async verify() { return { state: 'unavailable' }; }, async send() { throw new Error('No send expected'); },
    async prepareSession(provider, preference) { return { state: 'uncertain', provider, preference, sessionId: 'native-test', createParams: {}, optionRequests: [], reason: 'Not confirmed' }; },
    async launchSession() { creates++; throw new Error('Create outcome uncertain'); },
  };
  const app = await setup(fixture, undefined, transport);
  try {
    const first = await app.run('orca-start');
    assert.equal(first.code, 1); assert.equal(first.out.launch.state, 'uncertain'); assert.equal(first.out.attachment, null);
    assert.equal((await app.run('orca-start')).code, 1); assert.equal(creates, 1);
  } finally { await app.close(); }
});
