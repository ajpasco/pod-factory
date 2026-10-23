import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { get as httpGet } from 'node:http';
import { createPreparationServer } from '../src/server.js';
import type { DraftProvider, Preparation } from '../src/types.js';

// Explicit fixture provider: transport/state proof, not model-generation evidence.
const provider: DraftProvider = { async draft(input) { return {
  prdMarkdown: `# Fixture draft\n${input.idea}\n${input.question.answer}\n${input.feedback.join('\n')}`,
  mockupHtml: `<html><body><button>Sample journey</button><p>${input.feedback.join('\n')}</p></body></html>`,
  proposals: [{ id: 'later', description: 'Optional sharing, not confirmed.' }], findings: [],
}; } };

async function harness(dataDir: string, draftProvider = provider, executionLimitMs?: number) {
  const app = await createPreparationServer({ dataDir, provider: draftProvider, providerLabel: 'test fixture', executionLimitMs });
  await new Promise<void>(done => app.server.listen(0, '127.0.0.1', done));
  const address = app.server.address(); assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  const html = await (await fetch(origin)).text();
  const token = /name="preparation-token" content="([a-f0-9]+)"/.exec(html)?.[1]; assert.ok(token);
  const post = (route: string, input: unknown, headers = {}) => fetch(origin + route, { method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Preparation-Token': token, ...headers }, body: JSON.stringify(input) });
  const get = async (): Promise<Preparation> => (await (await fetch(origin + '/api/preparation')).json()).preparation;
  const close = () => new Promise<void>((done, reject) => app.server.close(error => error ? reject(error) : done()));
  return { ...app, origin, post, get, close };
}

test('HTTP journey retains answers, revises both artifacts and resumes after server restart', async () => {
  const data = await mkdtemp(join(tmpdir(), 'preparation-http-'));
  let app = await harness(data);
  try {
    assert.equal((await app.post('/api/preparation', { idea: 'A small reading list.' })).status, 201);
    let state = await app.get();
    assert.equal((await app.post('/api/answer', { answer: 'One reader records a book they want to read.', revision: state.revision })).status, 200);
    state = await app.get();
    assert.equal((await app.post('/api/draft', { revision: state.revision })).status, 202);
    for (let n = 0; n < 100 && (await app.get()).task?.status === 'running'; n++) await new Promise(done => setTimeout(done, 10));
    state = await app.get(); assert.equal(state.stage, 'review');
    const oldDigest = state.artifacts.prd!.digest;
    assert.equal((await app.post('/api/changes', { revision: state.revision, feedback: 'Use the heading My next book.' })).status, 202);
    for (let n = 0; n < 100 && (await app.get()).task?.status === 'running'; n++) await new Promise(done => setTimeout(done, 10));
    state = await app.get(); assert.equal(state.stage, 'review'); assert.notEqual(state.artifacts.prd!.digest, oldDigest);
    for (const kind of ['prd', 'mockup']) assert.match(await (await fetch(app.origin + '/api/artifacts/' + kind)).text(), /My next book/);
    const packet = await (await fetch(app.origin + '/api/artifacts/packet')).json();
    assert.equal(packet.authority, 'draft-only'); assert.equal(packet.artifacts.prd.digest, state.artifacts.prd!.digest);
    assert.deepEqual(state.confirmedScope.filter(s => /sharing/.test(s)), []);
    await app.close(); app = await harness(data);
    assert.deepEqual(await app.get(), state);
    assert.equal((await app.post('/api/changes', { revision: 1, feedback: 'Stale edit.' })).status, 409);
    assert.equal((await app.get()).revision, state.revision);
  } finally { await app.close(); await rm(data, { recursive: true, force: true }); }
});

test('simultaneous starts retain exactly one active preparation and explicitly refuse the other', async () => {
  const data = await mkdtemp(join(tmpdir(), 'preparation-create-race-'));
  const app = await harness(data);
  try {
    const results = await Promise.all([
      app.post('/api/preparation', { idea: 'First idea.' }),
      app.post('/api/preparation', { idea: 'Second idea.' }),
    ]);
    assert.deepEqual(results.map(r => r.status).sort(), [201, 409]);
    const winner = await results.find(r => r.status === 201)!.json();
    assert.equal((await app.get()).id, winner.preparation.id);
    assert.equal((await readdir(data)).filter(name => name.startsWith('prep-')).length, 1);
  } finally { await app.close(); await rm(data, { recursive: true, force: true }); }
});

test('timeout allows an explicit separate preparation, preserving the unresolved original without rerunning it', async () => {
  const data = await mkdtemp(join(tmpdir(), 'preparation-timeout-'));
  let calls = 0;
  const hanging: DraftProvider = { draft() { calls++; return new Promise(() => {}); } };
  const app = await harness(data, hanging, 30);
  try {
    await app.post('/api/preparation', { idea: 'Original idea.' });
    let old = await app.get();
    await app.post('/api/answer', { answer: 'One person completes one sample journey.', revision: old.revision });
    old = await app.get();
    await app.post('/api/draft', { revision: old.revision });
    for (let n = 0; n < 100 && (await app.get()).task?.status === 'running'; n++) await new Promise(done => setTimeout(done, 5));
    old = await app.get(); assert.equal(old.task?.status, 'interrupted');
    assert.equal((await app.post('/api/draft', { revision: old.revision })).status, 409);
    assert.equal((await app.post('/api/preparation', { idea: 'A separate explicit attempt.' })).status, 201);
    assert.notEqual((await app.get()).id, old.id);
    assert.deepEqual(JSON.parse(await readFile(join(data, old.id, 'preparation.json'), 'utf8')), old);
    assert.equal(calls, 1, 'starting a new preparation must not call the model');
  } finally { await app.close(); await rm(data, { recursive: true, force: true }); }
});

test('HTTP refuses cross-origin/missing-token mutations, has no authority endpoints and isolates mockups', async () => {
  const data = await mkdtemp(join(tmpdir(), 'preparation-boundary-'));
  const app = await harness(data);
  try {
    assert.equal((await app.post('/api/preparation', { idea: 'X' }, { Origin: 'https://another.example' })).status, 403);
    assert.equal((await app.post('/api/preparation', { idea: 'X' }, { 'X-Preparation-Token': '' })).status, 403);
    assert.equal((await app.post('/api/approve', {})).status, 404);
    assert.equal((await app.post('/api/dispatch', {})).status, 404);
    assert.deepEqual(await readdir(data), []);
    // Node fetch normalizes Host; use HTTP directly to actually send the hostile header.
    const hostileStatus = await new Promise<number | undefined>((done, reject) => {
      httpGet(app.origin + '/api/preparation', { headers: { Host: 'attacker.example' } }, response => {
        response.resume(); done(response.statusCode);
      }).on('error', reject);
    });
    assert.equal(hostileStatus, 403);
    await app.post('/api/preparation', { idea: 'A sample form.' });
    let state = await app.get(); await app.post('/api/answer', { answer: 'One person submits a sample entry.', revision: state.revision });
    state = await app.get(); await app.post('/api/draft', { revision: state.revision });
    for (let n = 0; n < 100 && (await app.get()).task?.status === 'running'; n++) await new Promise(done => setTimeout(done, 10));
    const mockup = await fetch(app.origin + '/api/artifacts/mockup');
    assert.match(mockup.headers.get('content-security-policy')!, /sandbox allow-scripts/);
    assert.match(mockup.headers.get('content-security-policy')!, /connect-src 'none'/);
    assert.match(await (await fetch(app.origin)).text(), /sandbox="allow-scripts"/);
  } finally { await app.close(); await rm(data, { recursive: true, force: true }); }
});
