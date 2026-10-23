import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPreparationServer } from '../dist/src/server.js';

const dataDir = await mkdtemp(join(tmpdir(), 'preparation-browser-'));
// Explicit fixture provider. Real CLI generation is demonstrated separately.
const provider = { async draft(input) {
  const changed = input.feedback.length > 0;
  const title = changed ? 'My next book' : 'Reading list';
  return { prdMarkdown: `# ${title}\n${input.idea}\n${input.question.answer}\n${input.feedback.join('\n')}`,
    mockupHtml: `<!doctype html><html><body><h1>${title}</h1><button onclick="document.getElementById('detail').hidden=false">View sample book</button><p id="detail" hidden>Sample book details</p></body></html>`,
    proposals: [{ id: 'optional', description: 'Optional sharing stays unaccepted.' }], findings: [] };
} };
let planCalls = 0, reviewCalls = 0;
let releaseBlueprint;
const blueprintWait = new Promise(resolve => { releaseBlueprint = resolve; });
const planningProvider = {
  async technical() { await blueprintWait; return {
    markdown: '# Blueprint\nOne browser UI layer. Select a sample book and read its details. No services or credentials.', stack: 'TypeScript, native browser DOM', layers: 1,
    requirements: [{ id: 'R1', description: 'Open a sample book detail.', authority: 'Saved scope answer and PRD journey' }],
    decisions: ['architecture', 'testability', 'security', 'configuration', 'docker', 'production'].map(topic => ({ topic, decision: `${topic}: proportionate single-page implementation`, rationale: 'The authorized sample journey has no external service.' })), findings: [],
  }; },
  async plan() { planCalls++; return {
    markdown: '# Plan\nAcceptance checks before implementation. One builder owns src/main.ts. Verify the combined candidate.',
    evals: ['correctness', 'restraint', 'production'].map((kind, index) => ({ id: `E${index + 1}`, requirements: ['R1'], kind, procedure: `Review ${kind} against the sample journey`, expected: `${kind} meets the contract`, evidence: 'review' })),
    stories: [{ id: 'story-1', title: 'Implement sample details', requirements: ['R1'], evals: ['E1', 'E2', 'E3'], scope: ['src/main.ts'], dependsOn: [] }],
    coverage: [{ requirementId: 'R1', status: 'covered', reason: 'E1 and story-1 address the journey.' }], findings: [],
  }; },
  async review() { return ++reviewCalls === 1 ? { findings: [{ id: 'order', severity: 'blocking', resolution: 'plan-correction', description: 'Put the final journey verification after the test harness is available.', basis: 'The plan orders verification before its prerequisite.' }] } : { findings: [] }; },
};
const orcaTarget = { runtimeId: 'fixture-runtime', handle: 'term-fixture', ptyId: 'fixture-pty', incarnationId: 'fixture-incarnation', worktreeId: 'fixture-worktree', worktreePath: dataDir, executionHostId: 'local', agentIdentity: 'codex' };
const notifications = [];
let nativeStarts = 0, workspaceCreates = 0, chatReveals = 0, terminalReveals = 0;
const projectDir = join(dataDir, 'equipment-worktree');
const orcaTransport = {
  useWorkspace(path) { assert.equal(path, projectDir); orcaTarget.worktreePath = path; },
  async prepareWorkspace(name) { return { state: 'uncertain', name, sourcePath: dataDir, runtimeId: 'fixture-runtime', repoId: 'fixture-repo', createParams: {}, reason: 'Fixture create' }; },
  async createWorkspace(workspace) { workspaceCreates++; Object.assign(workspace, { state: 'ready', path: projectDir, id: 'fixture-worktree', reason: 'Created and revealed.' }); },
  async targets() { return [orcaTarget]; }, async verify(target) { return { target, state: 'ready' }; },
  async reveal(target) { if (target.kind === 'native') { assert.equal(target.sessionId, 'native-fixture'); chatReveals++; } else { assert.equal(target.handle, orcaTarget.handle); terminalReveals++; } },
  async send(target, message) { notifications.push({ target, message }); return { accepted: true, requestId: 'fixture', stage: 'input_accepted' }; },
  async prepareSession(provider, preference) { return { state: 'uncertain', provider, preference, sessionId: 'native-fixture', createParams: {}, optionRequests: [], reason: 'Fixture launch' }; },
  async launchSession(launch) {
    nativeStarts++; assert.equal(launch.provider, 'codex'); assert.deepEqual(launch.preference, { model: 'gpt-6.1-sol', effort: 'high' });
    return { kind: 'native', sessionId: 'native-fixture', handle: 'native-fixture', runtimeId: 'fixture-runtime', worktreeId: 'fixture-worktree', worktreePath: projectDir, executionHostId: 'local', agentIdentity: launch.provider };
  },
};
const { server } = await createPreparationServer({ dataDir, workspacePath: dataDir, provider, planningProvider, orcaTransport, providerLabel: 'test fixture' });
await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(origin);
  await page.locator('#session-toggle').click();
  await expect(page.locator('#orca-model')).toHaveValue('claude-opus-5-5');
  await page.locator('#orca-provider').selectOption('codex');
  await expect(page.locator('#orca-model')).toHaveValue('gpt-6.1-sol');
  await expect(page.locator('#orca-effort')).toHaveValue('high');
  await page.getByRole('button', { name: 'Save agent preferences', exact: true }).click();
  await expect(page.locator('#orca-preferences-saved')).toContainText('Saved: codex');
  await page.reload();
  await page.locator('#session-toggle').click();
  await expect(page.locator('#orca-provider')).toHaveValue('codex');
  await expect(page.locator('#orca-model')).toHaveValue('gpt-6.1-sol');
  await page.locator('#orca-workspace-name').fill('Equipment Checkout');
  await page.getByRole('button', { name: 'Start workspace + codex · gpt-6.1-sol · high', exact: true }).click();
  await expect(page.locator('#orca-status')).toContainText('native-fixture');
  await expect(page.locator('#orca-launch')).toContainText('no initial prompt');
  assert.equal(nativeStarts, 1); assert.equal(workspaceCreates, 1); assert.equal(notifications.length, 0);
  await expect(page.locator('#orca-workspace-status')).toContainText('Equipment Checkout: ready');
  await page.reload(); await page.locator('#session-toggle').click();
  await expect(page.locator('#orca-workspace-name')).toHaveValue('Equipment Checkout');
  await expect(page.locator('#orca-start')).toBeDisabled();
  await page.getByRole('button', { name: 'Open connected chat', exact: true }).click();
  await expect.poll(() => chatReveals).toBe(1);
  assert.equal(workspaceCreates, 1); assert.equal(nativeStarts, 1);
  await page.getByRole('button', { name: 'Find sessions in this workspace' }).click();
  await page.getByRole('button', { name: 'Open selected session', exact: true }).click();
  await expect.poll(() => terminalReveals).toBe(1);
  await expect(page.locator('#orca-status')).toContainText('native-fixture');
  assert.equal(nativeStarts, 1); assert.equal(notifications.length, 0);
  await mkdir('evidence', { recursive: true });
  await page.screenshot({ path: 'evidence/orca-connection-fixture.png', fullPage: true });
  await page.getByRole('button', { name: 'Disconnect session', exact: true }).click();
  await page.getByRole('button', { name: 'Find sessions in this workspace' }).click();
  await page.getByRole('button', { name: 'Pair this session for notifications' }).click();
  await expect(page.locator('#orca-status')).toContainText('term-fixture');
  await page.getByLabel('Describe the audience, problem, and outcome you have in mind.').fill('A reading list for one reader.');
  await page.getByRole('button', { name: 'Start preparation' }).click();
  await page.getByLabel('Your answer', { exact: true }).fill('One reader finds a sample book and opens its details.');
  await page.getByRole('button', { name: 'Save answer' }).click();
  await page.locator('[data-step-target="2"]').click();
  await expect(page.locator('#saved-answer')).toContainText('One reader');
  await expect(page.locator('#orca-receipt')).toContainText('delivered');
  assert.equal(notifications.length, 1);
  assert.equal(notifications[0].target.handle, 'term-fixture');
  assert.ok(!notifications[0].message.includes('One reader finds'), 'notification contains a state pointer, not the user answer');
  await page.locator('[data-step-target="3"]').click();
  await page.getByRole('button', { name: 'Create the drafts' }).click();
  await expect(page.locator('#stage')).toHaveText('review');
  await page.getByRole('tab', { name: 'PRD', exact: true }).click();
  await expect(page.locator('#prd')).toContainText('Reading list');
  await page.getByRole('tab', { name: 'Experience', exact: true }).click();
  await page.frameLocator('#mockup').getByRole('button', { name: 'View sample book' }).click();
  await expect(page.frameLocator('#mockup').getByText('Sample book details')).toBeVisible();
  await page.getByLabel('Describe the changes to make.').fill('Use the heading My next book.');
  await page.getByRole('button', { name: 'Revise the drafts' }).click();
  await page.getByRole('tab', { name: 'PRD', exact: true }).click();
  await expect(page.locator('#prd')).toContainText('My next book');
  await page.getByRole('tab', { name: 'Experience', exact: true }).click();
  await expect(page.frameLocator('#mockup').getByRole('heading', { name: 'My next book' })).toBeVisible();
  const packet = await (await page.request.get(origin + '/api/artifacts/packet')).json();
  assert.equal(packet.authority, 'draft-only');
  assert.ok(packet.requiredReviews.every(review => review.status === 'not-performed'));
  assert.ok(!packet.confirmedScope.some(item => /sharing/.test(item)));
  await page.reload();
  await page.locator('[data-step-target="2"]').click();
  await expect(page.locator('#saved-answer')).toContainText('One reader');
  await page.locator('[data-step-target="3"]').click();
  await page.getByRole('tab', { name: 'PRD', exact: true }).click();
  await expect(page.locator('#prd')).toContainText('My next book');
  await expect(page.locator('#artifact-revision')).toContainText('PRD revision 2');
  await expect(page.getByRole('button', { name: /approve|dispatch/i })).toHaveCount(0);
  console.log('PASS browser journey: idea → answer → draft pair → clickable mockup → coordinated change → reload. Proposals remain unaccepted; gate reviews remain unperformed. Fixture-provider evidence only.');
  await page.getByRole('button', { name: 'These look right — continue', exact: true }).click();
  await page.getByLabel('Stack preferences and technical constraints').fill('Use TypeScript with one browser UI layer. No backend or Docker for the sample journey.');
  await page.getByRole('button', { name: 'Prepare the blueprint', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Preparing blueprint…', exact: true })).toBeDisabled();
  await expect(page.locator('[data-task-feedback="4"]')).toBeVisible();
  await expect(page.locator('[data-task-feedback="4"]')).toContainText('updates automatically');
  await page.reload();
  await expect(page.locator('[data-task-feedback="4"]')).toBeVisible();
  await expect(page.locator('[data-task-feedback="4"]')).toContainText('elapsed');
  releaseBlueprint();
  await expect(page.locator('#stage')).toHaveText('technical review');
  await expect(page.locator('[data-task-feedback="4"]')).toContainText('complete');
  await expect(page.locator('#technical-summary')).toContainText('TypeScript');
  assert.equal(planCalls, 0, 'plan must wait for a local technical choice');
  await page.getByRole('button', { name: 'Use this blueprint', exact: true }).click();
  await expect(page.locator('#stage')).toHaveText('plan review');
  await expect(page.locator('#plan-evals')).toContainText('restraint');
  await expect(page.locator('#plan-stories')).toContainText('src/main.ts');
  assert.equal(planCalls, 1, 'explicit selection continues routine plan generation once');
  await page.getByRole('button', { name: 'Review the package for gaps' }).click();
  await expect(page.locator('#stage')).toHaveText('planning complete');
  await expect(page.locator('#planning-correction')).toContainText('corrected and independently re-reviewed');
  assert.equal(planCalls, 2); assert.equal(reviewCalls, 2);
  await expect(page.locator('#handoff-title')).toContainText('builder dispatch is blocked');
  const handoff = await (await page.request.get(origin + '/api/artifacts/handoff')).json();
  assert.equal(handoff.dispatchReady, false); assert.equal(handoff.authority, 'draft-only');
  await page.reload();
  await expect(page.locator('#stage')).toHaveText('planning complete');
  await page.locator('[data-step-target="4"]').click();
  await expect(page.locator('#technical-preferences')).toHaveValue('Use TypeScript with one browser UI layer. No backend or Docker for the sample journey.');
  await page.locator('[data-step-target="3"]').click();
  await page.getByRole('tab', { name: 'Experience', exact: true }).click();
  await expect(page.frameLocator('#mockup').getByRole('heading', { name: 'My next book' })).toBeVisible();
  await mkdir('evidence', { recursive: true });
  await page.screenshot({ path: 'evidence/prebuild-browser-fixture.png', fullPage: true });
  await page.getByLabel('Describe the changes to make.').fill('Change the title again.');
  await page.getByRole('button', { name: 'Revise the drafts' }).click();
  await expect(page.locator('#stage')).toHaveText('review');
  await expect(page.locator('#plan-section')).toBeHidden();
  assert.equal((await page.request.get(origin + '/api/artifacts/handoff')).status(), 404);
  console.log('PASS prebuild browser journey: technical preferences → blueprint → explicit local selection → evals/stories → independent fixture review → draft handoff → reload → upstream-change invalidation. No factory approval or executed eval claimed.');
  await page.goto(origin + '/walkthrough');
  await expect(page.locator('#stage-title')).toBeVisible();
  await page.locator('[data-stage="5"]').click();
  await expect(page.locator('#continue')).toBeDisabled();
  await expect(page.locator('#stage-title')).toContainText('honest limits');
  const recoveryDir = await mkdtemp(join(tmpdir(), 'preparation-browser-recovery-'));
  let calls = 0;
  const recovery = await createPreparationServer({ dataDir: recoveryDir, executionLimitMs: 40,
    provider: { draft() { calls++; return new Promise(() => {}); } }, providerLabel: 'hanging test fixture' });
  await new Promise((done, reject) => { recovery.server.once('error', reject); recovery.server.listen(0, '127.0.0.1', done); });
  try {
    await page.goto(`http://127.0.0.1:${recovery.server.address().port}`);
    await page.getByLabel('Describe the audience, problem, and outcome you have in mind.').fill('Original idea kept after interruption.');
    await page.getByRole('button', { name: 'Start preparation', exact: true }).click();
    await page.getByLabel('Your answer', { exact: true }).fill('One reader opens a sample book.');
    await page.getByRole('button', { name: 'Save answer' }).click();
    await page.locator('[data-step-target="2"]').click();
    await expect(page.locator('#saved-answer')).toContainText('One reader');
    await page.locator('[data-step-target="3"]').click();
    await page.getByRole('button', { name: 'Create the drafts' }).click();
    await expect(page.locator('#stage')).toHaveText('interrupted');
    await page.locator('[data-step-target="3"]').click();
    await expect(page.getByRole('button', { name: 'Create the drafts' })).toBeDisabled();
    await expect(page.locator('#recovery-info')).toBeVisible();
    await page.locator('[data-step-target="1"]').click();
    await expect(page.getByLabel('Describe the audience, problem, and outcome you have in mind.')).toHaveValue('Original idea kept after interruption.');
    await page.getByLabel('Describe the audience, problem, and outcome you have in mind.').fill('A separate explicit preparation.');
    await page.getByRole('button', { name: 'Start separate preparation', exact: true }).click();
    await expect(page.locator('#stage')).toHaveText('intake');
    await page.locator('[data-step-target="1"]').click();
    await expect(page.locator('#idea-summary')).toHaveText('A separate explicit preparation.');
    assert.equal(calls, 1);
    console.log('PASS browser recovery: interrupted task stays unresolved; user explicitly starts a separate preparation without a hidden model retry.');
  } finally {
    await new Promise((done, reject) => recovery.server.close(error => error ? reject(error) : done()));
    await rm(recoveryDir, { recursive: true, force: true });
  }
} finally {
  await browser.close();
  await new Promise((done, reject) => server.close(error => error ? reject(error) : done()));
  await rm(dataDir, { recursive: true, force: true });
}
