import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer as createPortProbe } from 'node:net';
import { fileURLToPath } from 'node:url';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import { createPreparationServer } from '../src/server.js';
import type { BuildPlanOutput, DraftProvider, PlanningInput, PlanningProvider, TechnicalOutput } from '../src/types.js';
import { runCli } from '../src/cli.js';
import type { FactoryDiagnosticsConfig } from '../src/factory.js';
import { FakeFactoryRoute, PREREQUISITE_IDS } from './factory-fake.js';

const draft: DraftProvider = { async draft() { return { prdMarkdown: '# Equipment checkout\nBorrow and return one item.', mockupHtml: '<html><body><button>Borrow</button></body></html>', proposals: [], findings: [] }; } };
const technical = (input: PlanningInput): TechnicalOutput => ({ markdown: '# Blueprint', stack: 'React, FastAPI, PostgreSQL', layers: 3,
  requirements: [{ id: 'EQ-06', description: 'A member borrows an available item.', authority: 'PRD checkout journey' }],
  decisions: (['architecture', 'testability', 'security', 'configuration', 'docker', 'production'] as const).map(topic => ({ topic, decision: 'proportionate', rationale: 'one database, no external service' })), findings: [] });
const plan = (input: PlanningInput): BuildPlanOutput => ({ markdown: '# Plan',
  evals: (['correctness', 'restraint', 'production'] as const).map((kind, i) => ({ id: `E${i + 1}`, requirements: ['EQ-06'], kind, procedure: 'Exercise checkout.', expected: 'One loan.', evidence: 'automated' as const })),
  stories: [{ id: 'story-7', title: 'Checkout', requirements: ['EQ-06'], evals: ['E1', 'E2', 'E3'], scope: ['api/loans.py'], dependsOn: [] }],
  coverage: [{ requirementId: 'EQ-06', status: 'covered' as const, reason: 'story-7 covers it.' }], findings: [] });
const planningProvider: PlanningProvider = { async technical(input) { return technical(input); }, async plan(input) { return plan(input); }, async review() { return { findings: [] }; } };

async function serve(t: { after(fn: () => Promise<void>): void }, factoryRoute?: FakeFactoryRoute, factoryDiagnostics?: FactoryDiagnosticsConfig) {
  const dataDir = await mkdtemp(join(tmpdir(), 'factory-http-'));
  const { server, service } = await createPreparationServer({ dataDir, workspacePath: dataDir, provider: draft, planningProvider, orcaTransport: { async targets() { return []; }, async verify(target) { return { target, state: 'ready' }; }, async send() { return { accepted: true, requestId: 'fixture', stage: 'input_accepted' }; }, async prepareSession(provider, preference) { return { state: 'uncertain', provider, preference, sessionId: 'f', createParams: {}, optionRequests: [], reason: 'fixture' }; }, async launchSession() { throw new Error('not used'); } }, providerLabel: 'test fixture', ...(factoryRoute === undefined ? {} : { factoryRoute }), factoryDiagnostics });
  await new Promise<void>((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', () => done()); });
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  t.after(async () => { await new Promise<void>(done => server.close(() => done())); await rm(dataDir, { recursive: true, force: true }); });
  const token = /content="([a-f0-9]{64})"/.exec(await (await fetch(`${origin}/`)).text())![1];
  const post = (path: string, body: object) => fetch(origin + path, { method: 'POST', headers: { 'content-type': 'application/json', 'x-preparation-token': token }, body: JSON.stringify(body) });
  const read = async () => (await (await fetch(`${origin}/api/preparation`)).json()).preparation;
  // Draft/plan responses only acknowledge the task, exactly as the CLI documents; wait for the save.
  const step = async (path: string, body: object) => {
    const response = await post(path, body);
    assert.ok(response.ok, `${path} -> ${response.status} ${await response.text()}`);
    for (let attempt = 0; attempt < 200; attempt++) {
      const current = await read();
      if (current !== null && current.task?.status !== 'running') return current;
      await new Promise(done => setTimeout(done, 10));
    }
    throw new Error(`${path} never settled`);
  };
  return { origin, service, post, read, step };
}

test('GET /api/factory reports the route read-only and refuses to export before the review completes', async t => {
  const route = new FakeFactoryRoute({ satisfied: PREREQUISITE_IDS.filter(id => id !== 'harness-authored') });
  const { origin, post, read, step } = await serve(t, route);
  await post('/api/preparation', { idea: 'A shared-equipment checkout app', operationId: 'create' });

  const early = await (await fetch(`${origin}/api/factory`)).json();
  assert.equal(early.package, null);
  assert.match(early.exportRefusal, /Complete the planning review/);
  assert.equal(early.route.readOnly, true);
  assert.equal(early.dispatch.implemented, false);

  const state = await read();
  let current = await step('/api/answer', { revision: state.revision, operationId: 'answer', answer: 'One member borrows one item.' });
  current = await step('/api/draft', { revision: current.revision, operationId: 'draft' });
  current = await step('/api/technical', { revision: current.revision, operationId: 'tech', preferences: 'React, FastAPI, PostgreSQL' });
  current = await step('/api/select-technical', { revision: current.revision, operationId: 'select', digest: current.planning.technical.artifact.digest });
  current = await step('/api/plan', { revision: current.revision, operationId: 'plan' });
  current = await step('/api/review-plan', { revision: current.revision, operationId: 'review' });
  assert.equal(current.planning.phase, 'planning-complete');

  const ready = await (await fetch(`${origin}/api/factory?story=story-7`)).json();
  assert.equal(ready.story, 'story-7');
  assert.match(ready.package.manifestDigest, /^[a-f0-9]{64}$/);
  assert.deepEqual(ready.package.stories, ['story-7']);
  assert.equal(ready.route.outcome, 'blocked');
  assert.deepEqual(ready.route.prerequisites.filter((p: { satisfied: boolean }) => !p.satisfied).map((p: { id: string }) => p.id), ['harness-authored']);

  const full = await (await fetch(`${origin}/api/factory?include=package`)).json();
  assert.equal(full.manifestDigest, ready.package.manifestDigest);
  assert.equal(full.authority, 'draft-only');
  assert.deepEqual(full.stories[0].scope, ['api/loans.py']);
});

test('the service still has no approval or dispatch action, and the factory route is read-only', async t => {
  const { origin, post } = await serve(t, new FakeFactoryRoute());
  for (const path of ['/api/approve', '/api/factory/dispatch', '/api/dispatch', '/api/factory']) {
    const response = await post(path, {});
    assert.equal(response.status, 404, `${path} must not accept a POST`);
    assert.match((await response.json()).error, /No approval or dispatch action is available here|does not exist/);
  }
  assert.equal((await fetch(`${origin}/api/factory`)).status, 404, 'with no preparation there is nothing to report');
});


test('HTTP and CLI report absent/partial diagnostics and never choose a story automatically', async t => {
  for (const [config, expected] of [[undefined, 'unconfigured'], [{ repoPath: '/explicit/repo' }, 'invalid'], [{ repoPath: '/missing/repo', harnessRoot: 'docs/projects/equipment-checkout' }, 'configured']] as const) {
    const { origin, post } = await serve(t, undefined, config);
    await post('/api/preparation', { idea: 'Equipment checkout', operationId: 'create' });
    const noStory = await runCli(['factory', '--url', origin]) as any;
    assert.equal(noStory.story, null);
    assert.equal(noStory.configuration.status, expected);
    assert.equal(noStory.route.outcome, 'blocked');
    assert.equal(noStory.route.source, 'none');
    assert.equal(noStory.route.packageBinding, 'unverified');
    const explicit = await runCli(['factory', '--story', 'story-2', '--url', origin]) as any;
    assert.equal(explicit.route.outcome, expected === 'configured' ? 'uncertain' : 'blocked');
    assert.equal(explicit.route.authority, 'non-authoritative');
    assert.equal(explicit.dispatch.implemented, false);
    assert.equal((await fetch(`${origin}/api/factory?story=bad`)).status, 400);
    const font = await fetch(`${origin}/fonts/IBMPlexSans-latin.woff2`);
    assert.equal(font.status, 200);
    assert.equal(font.headers.get('content-type'), 'font/woff2');
    assert.equal(Buffer.from(await font.arrayBuffer()).subarray(0, 4).toString(), 'wOF2');
    for (const path of ['/fonts/missing.woff2', '/fonts/sub/dir.woff2']) assert.equal((await fetch(origin + path)).status, 404);
  }
});


test('normal server entry point uses explicit environment diagnostics configuration', async t => {
  const dataDir = await mkdtemp(join(tmpdir(), 'factory-startup-'));
  const probe = createPortProbe();
  await new Promise<void>(done => probe.listen(0, '127.0.0.1', done));
  const port = (probe.address() as AddressInfo).port;
  await new Promise<void>(done => probe.close(() => done()));
  const child = spawn(process.execPath, [fileURLToPath(new URL('../src/server.js', import.meta.url))], {
    env: { ...process.env, ORCH_DATA_DIR: dataDir, ORCH_PORT: String(port), ORCH_FACTORY_REPO: dataDir, ORCH_FACTORY_HARNESS_ROOT: 'docs/projects/equipment-checkout', ORCH_FACTORY_REMOTE: 'origin' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  t.after(async () => {
    if (child.exitCode === null && child.signalCode === null) await new Promise<void>(done => { child.once('exit', () => done()); child.kill(); });
    await rm(dataDir, { recursive: true, force: true });
  });
  await new Promise<void>((done, reject) => {
    const timeout = setTimeout(() => reject(new Error('normal startup did not listen')), 10_000);
    child.once('error', error => { clearTimeout(timeout); reject(error); });
    child.stdout.on('data', chunk => { if (chunk.toString().includes('Preparation:')) { clearTimeout(timeout); done(); } });
    child.once('exit', code => { clearTimeout(timeout); reject(new Error(`server exited ${code}`)); });
  });
  const origin = `http://127.0.0.1:${port}`;
  await runCli(['start', '--text', 'Equipment checkout', '--operation-id', 'normal-startup', '--url', origin]);
  const result = await runCli(['factory', '--story', 'story-2', '--url', origin]) as any;
  assert.equal(result.configuration.status, 'configured');
  assert.equal(result.route.source, 'locally-cached-factory-records');
  assert.equal(result.route.outcome, 'uncertain', 'the explicit directory has no cached factory refs');
  assert.equal(result.route.packageBinding, 'unverified');
  assert.equal(result.dispatch.implemented, false);
});
