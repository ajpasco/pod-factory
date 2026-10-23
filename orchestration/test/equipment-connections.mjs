// Connection trial, not an app build or live model/Orca test.
// Run from orchestration: npm run build && node test/equipment-connections.mjs
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, expect } from '@playwright/test';
import { createPreparationServer } from '../dist/src/server.js';

const evidence = fileURLToPath(new URL('../evidence/equipment-connections/', import.meta.url));
const dataDir = await mkdtemp(join(tmpdir(), 'equipment-connections-'));
const cliFile = fileURLToPath(new URL('../dist/src/cli.js', import.meta.url));
const calls = { draft: 0, technical: 0, plan: 0, review: 0 };
const notifications = [], results = [];
const stack = 'React, FastAPI, PostgreSQL';
const idea = `A shared-equipment checkout app using ${stack}.`;
const answer = 'Members borrow and return equipment; administrators add equipment and change availability. Two members cannot hold the same item. No reservations or reminders.';
const requirements = [
  ['EQ-1', 'Two roles with server-side authorization.'],
  ['EQ-2', 'List/detail and checkout/return with one active loan per item.'],
  ['EQ-3', 'Persist committed data in PostgreSQL across restart.'],
  ['EQ-4', 'Loading, empty, error and narrow-screen states.'],
  ['EQ-5', 'No reservations, reminders or other unaccepted features.'],
].map(([id, description]) => ({ id, description, authority: 'Synthetic trial brief; not human-approved production requirements.' }));
const provider = { async draft(input) {
  calls.draft++;
  return { prdMarkdown: `# Equipment checkout\n${input.idea}\n${input.question.answer}\n${input.feedback.join('\n')}`,
    mockupHtml: '<html><body><h1>Equipment checkout</h1><button onclick="document.getElementById(\'detail\').hidden=false">View drill</button><p id="detail" hidden>Drill: available. Sample only.</p></body></html>',
    proposals: [{ id: 'future', description: 'Reservations are an unaccepted suggestion.' }], findings: [] };
} };
const planningProvider = {
  async technical(input) {
    calls.technical++; assert.match(input.prdMarkdown, /Equipment checkout/);
    return { markdown: `# Equipment blueprint\n${stack}\nUI, API/business logic, persistence. Real PostgreSQL integration tests; isolated synthetic data.`, stack, layers: 3, requirements,
      decisions: Object.entries({ architecture: 'React UI, FastAPI business/API code, PostgreSQL.', testability: 'Browser/API/database tests including concurrent checkout.', security: 'Server-side permissions and safe credentials.', configuration: 'Ignored .env and placeholder .env.example.', docker: 'Compose recommended; local PostgreSQL fallback.', production: 'Build/start, migrations, readiness and safe logs must be tested.' }).map(([topic, decision]) => ({ topic, decision, rationale: 'Bounded equipment-checkout trial.' })), findings: [] };
  },
  async plan() {
    calls.plan++;
    const refs = requirements.map(r => r.id);
    return { markdown: '# Equipment build plan\nAcceptance harness first, API/database, then UI integration. This fixture is not an executable test suite.',
      evals: ['correctness', 'restraint', 'production'].map((kind, i) => ({ id: `EQ-E${i + 1}`, requirements: refs, kind, procedure: `Exercise equipment ${kind} against the approved contract.`, expected: 'Actual evidence satisfies each named criterion.', evidence: 'automated' })),
      stories: [{ id: 'story-1', title: 'API and PostgreSQL checkout', requirements: refs, evals: ['EQ-E1', 'EQ-E2', 'EQ-E3'], scope: ['api/**'], dependsOn: [] },
        { id: 'story-2', title: 'React checkout journey', requirements: refs, evals: ['EQ-E1', 'EQ-E2', 'EQ-E3'], scope: ['web/**'], dependsOn: ['story-1'] }],
      coverage: refs.map(requirementId => ({ requirementId, status: 'covered', reason: 'Referenced by fixture evals and stories; semantic review is not demonstrated here.' })), findings: [] };
  },
  async review() { calls.review++; return { findings: [] }; },
};
const target = { kind: 'native', sessionId: 'equipment-fixture', handle: 'equipment-fixture', runtimeId: 'fixture-runtime', worktreeId: 'fixture-worktree', worktreePath: dataDir, executionHostId: 'local', agentIdentity: 'codex' };
const transport = { async targets() { return [target]; }, async verify(value) { return { target: value, state: 'ready' }; },
  async send(value, message) { notifications.push({ target: value, message }); return { accepted: true, requestId: `fixture-${notifications.length}`, stage: 'input_accepted' }; } };
let server, origin, browser;
async function startServer() {
  ({ server } = await createPreparationServer({ dataDir, workspacePath: dataDir, provider, planningProvider, orcaTransport: transport, providerLabel: 'Synthetic equipment connection fixture' }));
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
  origin = `http://127.0.0.1:${server.address().port}`;
}
async function cli(...args) {
  try { const { stdout } = await promisify(execFile)(process.execPath, [cliFile, ...args, '--url', origin], { timeout: 15000 }); return { code: 0, data: JSON.parse(stdout) }; }
  catch (error) { if (!Number.isInteger(error.code)) throw error; return { code: error.code, error: error.stderr, data: error.stdout ? JSON.parse(error.stdout) : null }; }
}
async function state() { const result = await cli('status'); assert.equal(result.code, 0, result.error); return result.data.preparation; }
async function mutate(command, ...args) {
  const saved = await state();
  const result = await cli(command, '--id', saved.id, '--revision', String(saved.revision), '--operation-id', `${command}-${saved.revision}`, ...args);
  assert.equal(result.code, 0, result.error);
  await expect.poll(async () => (await state()).task?.status).not.toBe('running');
  return state();
}
function pass(id, observation) { results.push({ id, status: 'PASS', observation }); }
try {
  await mkdir(evidence, { recursive: true });
  await startServer(); browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  assert.equal((await cli('start', '--text', idea, '--operation-id', 'equipment-start')).code, 0);
  assert.equal((await cli('orca-attach', '--terminal', target.handle)).code, 0);
  const beforeAnswer = await state();
  await page.goto(origin);
  await expect(page.locator('#idea-summary')).toHaveText(idea);
  await page.locator('#answer').fill(answer);
  await page.locator('#answer-form button[type="submit"]').click();
  await expect.poll(async () => (await state()).question.answer).toBe(answer);
  pass('CON-01', 'Real CLI created preparation; browser displayed it and saved answer; CLI read the same answer and identity.');
  await expect.poll(() => notifications.length).toBe(1);
  assert.deepEqual(notifications[0].target, target);
  assert.ok(!notifications[0].message.includes(answer));
  assert.match(notifications[0].message, /not user approval/);
  pass('CON-02', 'Real notification adapter addressed one injected Orca target with a status pointer, not user content or approval. Live Orca delivery is not exercised.');
  const stale = await cli('draft', '--id', beforeAnswer.id, '--revision', String(beforeAnswer.revision), '--operation-id', 'stale-equipment');
  assert.equal(stale.code, 1); assert.match(stale.error, /409/); assert.equal(calls.draft, 0);
  await mutate('draft');
  await page.reload(); await expect(page.locator('#prd')).toContainText(idea);
  await page.frameLocator('#mockup').getByRole('button', { name: 'View drill' }).click();
  await expect(page.frameLocator('#mockup').getByText('Drill: available. Sample only.')).toBeVisible();
  assert.equal(notifications.length, 1, 'CLI continuation must not notify itself');
  pass('CON-03', 'Stale CLI action refused without drafting; current CLI draft reached browser and clickable sandboxed mockup. No notification loop.');
  await mutate('technical', '--text', `${stack}; simple structure, real database tests, .env and Docker Compose recommendation.`);
  assert.equal(calls.plan, 0);
  const technical = (await state()).planning.technical.artifact.digest;
  const saved = await state();
  const wrong = await cli('select-technical', '--id', saved.id, '--revision', String(saved.revision), '--operation-id', 'wrong-digest', '--digest', '0'.repeat(64));
  assert.equal(wrong.code, 1); assert.equal(calls.plan, 0);
  await page.reload(); await expect(page.locator('#technical-summary')).toContainText(stack);
  await page.locator('#select-technical').click();
  await expect.poll(async () => (await state()).planning?.phase).toBe('plan-review');
  assert.equal((await state()).planning.technicalDecision.digest, technical); assert.equal(calls.plan, 1);
  await page.locator('#review-plan').click();
  await expect.poll(async () => (await state()).planning?.phase).toBe('planning-complete');
  const handoffResult = await cli('artifact', '--kind', 'handoff'); assert.equal(handoffResult.code, 0);
  const handoff = JSON.parse(handoffResult.data.content);
  assert.equal(handoff.technical.digest, technical); assert.equal(handoff.authority, 'draft-only'); assert.equal(handoff.dispatchReady, false);
  pass('CON-04', 'Wrong digest refused; browser selected exact blueprint and generated one plan/review; real CLI read matching draft handoff.');
  await writeFile(join(evidence, 'draft-handoff.json'), JSON.stringify(handoff, null, 2) + '\n');
  await page.screenshot({ path: join(evidence, 'draft-handoff.png'), fullPage: true });
  const beforeRestart = await state(), notificationCount = notifications.length;
  await new Promise((done, reject) => server.close(e => e ? reject(e) : done())); await startServer();
  assert.deepEqual(await state(), beforeRestart); await page.goto(origin);
  await expect(page.locator('#stage')).toHaveText('planning complete'); assert.equal(notifications.length, notificationCount);
  pass('CON-05', 'Service restart retained identical preparation and handoff without redelivery or duplicate work.');
  const html = await (await fetch(origin)).text(); const token = /name="preparation-token" content="([^"]+)"/.exec(html)[1];
  for (const route of ['/api/approve', '/api/dispatch']) {
    const response = await fetch(origin + route, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Preparation-Token': token }, body: '{}' });
    assert.equal(response.status, 404); assert.match(await response.text(), /No approval or dispatch action/);
  }
  assert.equal((await cli('approve')).code, 1);
  assert.deepEqual(await state(), beforeRestart);
  pass('CON-06', 'Missing approval/dispatch routes refuse with valid request token; CLI refuses approval; no authority or state was fabricated.');
  results.push({ id: 'FACTORY-01', status: 'BLOCKED', observation: 'No trusted approval, protected executable harness registration or factory dispatch adapter exists in this service.', remainingBlockers: handoff.remainingBlockers });
  await mutate('revise', '--text', 'Rename the sample heading to Team equipment; retain the same checkout scope.');
  assert.equal((await state()).planning, undefined); assert.equal((await fetch(origin + '/api/artifacts/handoff')).status, 404);
  await page.reload(); await expect(page.locator('#plan-section')).toBeHidden();
  pass('CON-07', 'Product revision invalidated downstream plan and handoff in browser and HTTP; old content cannot be dispatched as current.');
  results.push({ id: 'APP-01', status: 'NOT RUN', observation: 'No React/FastAPI/PostgreSQL application was built or exercised. Stack appears in synthetic planning output only.' });
} catch (error) {
  results.push({ id: 'TRIAL-ERROR', status: 'FAIL', observation: error.stack || String(error) }); process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server?.listening) await new Promise(done => server.close(done));
  await rm(dataDir, { recursive: true, force: true });
  const inputHashes = {};
  for (const path of ['test/equipment-connections.mjs', 'public/index.html', 'public/app.js', 'src/server.ts', 'src/workflow.ts', 'src/cli.ts', 'src/orca-bridge.ts']) {
    inputHashes[path] = createHash('sha256').update(await readFile(new URL(`../${path}`, import.meta.url))).digest('hex');
  }
  const report = { recordedAt: new Date().toISOString(), evidenceKind: 'Real local browser/CLI/HTTP/workflow; synthetic model outputs and Orca transport', overallJourney: results.some(r => r.status === 'FAIL') ? 'FAIL' : 'BLOCKED', results, providerCalls: calls, fixtureNotifications: notifications.length, inputHashes };
  await mkdir(evidence, { recursive: true }); await writeFile(join(evidence, 'results.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
