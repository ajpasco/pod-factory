// Synthetic presentation acceptance only. Run from orchestration:
// npm run build && node test/theme-review.mjs
import { chromium, expect as baseExpect } from '@playwright/test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPreparationServer } from '../dist/src/server.js';

const expect = baseExpect.configure({ timeout: 2500 });
const results = [];
const themes = ['graphite', 'orca', 'clay', 'indigo'];
const grounds = { graphite: '#f2f3f2', orca: '#fafafa', clay: '#faf8f4', indigo: '#f3f4f8' };
const shellCsp = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";
let browser;
async function check(id, name, run) {
  const start = Date.now();
  try { await run(); results.push({ id, name, status: 'pass', durationMs: Date.now() - start }); }
  catch (error) {
    const detail = error.stack || String(error);
    const failureKind = /Fixture HTTP|fetch failed|ECONN|EADDR|ENOENT|browserType\.launch|Target page, context or browser has been closed/.test(detail) ? 'infrastructure' : 'acceptance';
    results.push({ id, name, status: 'fail', failureKind, durationMs: Date.now() - start, error: detail });
  }
}
async function fixture(options = {}) {
  const dataDir = await mkdtemp(join(tmpdir(), 'preparation-theme-'));
  const calls = { draft: 0, technical: 0, plan: 0, review: 0, send: 0, start: 0 };
  const provider = { async draft(input) {
    calls.draft++;
    if (options.interrupt) return new Promise(() => {});
    if (options.fail) throw new Error('Synthetic drafting failure');
    const title = input.feedback.length ? 'Revised reading list' : 'Reading list';
    return { prdMarkdown: `# ${title}\n${input.idea}\n${input.question.answer}`,
      mockupHtml: `<!doctype html><html><body><h1>${title}</h1><button onclick="document.getElementById('detail').hidden=false">View sample book</button><p id="detail" hidden>Sample book details</p></body></html>`,
      proposals: [{ id: 'optional', description: 'Optional sharing remains unaccepted.' }], findings: [] };
  } };
  const planningProvider = {
    async technical() { calls.technical++; return { markdown: '# Blueprint\nOne browser UI layer with sample book details.', stack: 'TypeScript, native DOM', layers: 1,
      requirements: [{ id: 'R1', description: 'Open sample book details.', authority: 'Saved scope answer and PRD journey' }],
      decisions: ['architecture', 'testability', 'security', 'configuration', 'docker', 'production'].map(topic => ({ topic, decision: 'Use the proportionate single-page implementation.', rationale: 'The sample journey needs no service.' })), findings: [] }; },
    async plan() { calls.plan++; return { markdown: '# Plan\nCheck sample details before implementation.',
      evals: ['correctness', 'restraint', 'production'].map((kind, n) => ({ id: `E${n + 1}`, requirements: ['R1'], kind, procedure: `Inspect ${kind}`, expected: `${kind} meets the contract`, evidence: 'review' })),
      stories: [{ id: 'story-1', title: 'Implement sample details', requirements: ['R1'], evals: ['E1', 'E2', 'E3'], scope: ['src/main.ts'], dependsOn: [] }],
      coverage: [{ requirementId: 'R1', status: 'covered', reason: 'Checks and story cover sample details.' }], findings: [] }; },
    async review() { calls.review++; return { findings: [] }; },
  };
  const target = { runtimeId: 'fixture-runtime', handle: 'fixture-handle', ptyId: 'fixture-pty', incarnationId: 'fixture-incarnation', worktreeId: 'fixture-worktree', worktreePath: dataDir, executionHostId: 'local', agentIdentity: 'codex' };
  // Always injected: these tests never discover or launch real Orca agents.
  const fakeOrca = {
    async targets() { return [target]; }, async verify(value) { return { target: value, state: 'ready' }; },
    async send() { calls.send++; return { accepted: true, requestId: 'fixture', stage: 'input_accepted' }; },
    async prepareSession(provider, preference) { return { state: 'uncertain', provider, preference, sessionId: 'fixture-session', createParams: {}, optionRequests: [], reason: 'Synthetic fixture only' }; },
    async launchSession(launch) { calls.start++; return { ...target, kind: 'native', sessionId: 'fixture-session', agentIdentity: launch.provider }; },
  };
  const { server } = await createPreparationServer({ dataDir, workspacePath: dataDir, provider, ...(options.noPlanning ? {} : { planningProvider }), orcaTransport: fakeOrca, providerLabel: 'synthetic theme fixture', executionLimitMs: options.interrupt ? 40 : 5000 });
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  const response = await fetch(origin);
  const token = (await response.text()).match(/name="preparation-token" content="([^"]+)"/)[1];
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.setDefaultTimeout(2500);
  const posts = [], external = [], pageErrors = [];
  page.on('request', req => { if (req.method() === 'POST') posts.push({ path: new URL(req.url()).pathname, body: req.postDataJSON() }); if (!req.url().startsWith(origin) && !req.url().startsWith('data:')) external.push(req.url()); });
  page.on('pageerror', error => pageErrors.push(error.message));
  const state = async () => (await (await fetch(origin + '/api/preparation')).json()).preparation;
  async function post(path, body = {}) {
    const saved = await state();
    const res = await fetch(origin + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Preparation-Token': token }, body: JSON.stringify({ ...(saved ? { preparationId: saved.id, revision: saved.revision } : {}), operationId: randomUUID(), ...body }) });
    assert.ok(res.ok, `Fixture HTTP ${path}: ${res.status} ${res.ok ? '' : await res.text()}`);
    await expect.poll(async () => (await state())?.task?.status, { timeout: 6000 }).not.toBe('running');
    return state();
  }
  async function seed(stage = 'draft') {
    await post('/api/preparation', { idea: 'A reading list for one reader.' });
    if (stage === 'idea') return;
    await post('/api/answer', { answer: 'One reader opens sample book details.' });
    if (stage === 'answer') return;
    await post('/api/draft');
    if (stage === 'draft') return;
    await post('/api/technical', { preferences: 'Use TypeScript and native DOM. No external services.' });
    if (stage === 'technical') return;
    await post('/api/select-technical', { digest: (await state()).planning.technical.artifact.digest });
    if (stage === 'selected') return;
    await post('/api/plan');
    if (stage === 'plan') return;
    await post('/api/review-plan');
  }
  return { page, context, origin, state, post, seed, posts, calls, external, pageErrors, csp: response.headers.get('content-security-policy'),
    async open() { await page.goto(origin); await expect.poll(async () => page.locator('#revision').textContent()).not.toBeNull(); },
    async close() { await context.close(); await new Promise((done, reject) => server.close(error => error ? reject(error) : done())); await rm(dataDir, { recursive: true, force: true }); } };
}
async function using(options, run) { const f = await fixture(options); try { await run(f); } finally { await f.close(); } }
const rail = page => page.getByRole('navigation', { name: 'Preparation steps', exact: true });
const step = (page, n) => rail(page).locator(`[data-step-target="${n}"]`);
async function panel(page, n) {
  await expect(page.locator('[data-step]')).toHaveCount(6);
  await expect(page.locator('[data-step]:visible')).toHaveCount(1);
  await expect(page.locator(`[data-step="${n}"]`)).toBeVisible();
  await expect(rail(page).locator('[aria-current="step"]')).toHaveCount(1);
  await expect(step(page, n)).toHaveAttribute('aria-current', 'step');
}
async function reach(page, n) { await step(page, n).click(); await panel(page, n); }
async function unchanged(f, action) {
  const saved = await f.state(), count = f.posts.length;
  await action();
  assert.equal(f.posts.length, count, 'Presentation interaction issued a POST');
  assert.deepEqual(await f.state(), saved, 'Presentation interaction changed saved preparation');
}
async function openSession(page) {
  await page.locator('#session-toggle').click();
  await expect(page.locator('#session-toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#orca-connection')).toBeVisible();
}

try {
  browser = await chromium.launch({ headless: true });
  await check('TUI-C01', 'Saved progress derives six-panel navigation before drafting', async () => {
    await using({}, async f => {
      await f.open(); await panel(f.page, 1);
      for (let n = 2; n <= 6; n++) await expect(step(f.page, n)).toBeDisabled();
      await f.page.locator('#idea').fill('A reading list for one reader.');
      await f.page.locator('#idea-form button[type="submit"]').click();
      await panel(f.page, 2); await f.page.reload(); await panel(f.page, 2);
      await expect(step(f.page, 3)).toBeDisabled();
      await f.page.locator('#answer').fill('One reader opens sample book details.');
      await f.page.locator('#answer-form button[type="submit"]').click();
      await panel(f.page, 3);
      assert.equal(f.calls.draft, 0, 'Saving the answer must not generate drafts');
      await expect(step(f.page, 4)).toBeDisabled();
      await f.page.reload(); await panel(f.page, 3);
    });
  });
  await check('TUI-C02', 'Artifact gates require viewed blueprint and explicit exact-digest selection', async () => {
    await using({}, async f => {
      await f.seed('draft'); await f.open(); await reach(f.page, 4);
      await expect(step(f.page, 5)).toBeDisabled(); await expect(step(f.page, 6)).toBeDisabled();
      await unchanged(f, () => f.page.locator('#technical-preferences').fill('Use TypeScript and native DOM. No external services.'));
      await f.page.locator('#technical-button').click();
      await expect(f.page.locator('#technical-content')).toContainText('One browser UI layer');
      await expect(step(f.page, 5)).toBeDisabled(); assert.equal(f.calls.plan, 0);
      await f.page.reload(); await panel(f.page, 4);
      // The inline blueprint must be exposed to the user before selection; details may wrap it.
      const details = f.page.locator('details').filter({ has: f.page.locator('#technical-content') });
      if (await details.count() && !await f.page.locator('#technical-content').isVisible()) await details.locator('summary').click();
      await expect(f.page.locator('#technical-content')).toBeVisible();
      const digest = (await f.state()).planning.technical.artifact.digest;
      await f.page.locator('#select-technical').click();
      await expect.poll(() => f.calls.plan).toBe(1);
      await expect.poll(async () => Boolean((await f.state()).planning.plan)).toBe(true);
      const selection = f.posts.filter(p => p.path === '/api/select-technical');
      assert.equal(selection.length, 1); assert.equal(selection[0].body.digest, digest);
      assert.equal((await f.state()).planning.technicalDecision.digest, digest);
      assert.ok(f.posts.findIndex(p => p.path === '/api/select-technical') < f.posts.findIndex(p => p.path === '/api/plan'));
      await expect(step(f.page, 6)).toBeEnabled();
    });
  });
  await check('TUI-C03', 'Plan review and handoff preserve every authority boundary', async () => {
    await using({}, async f => {
      await f.seed('plan'); await f.open(); await panel(f.page, 5);
      await expect(step(f.page, 6)).toBeEnabled();
      assert.equal((await f.state()).planning.handoff, undefined);
      assert.equal((await fetch(f.origin + '/api/artifacts/handoff')).status, 404);
      await f.page.locator('#review-plan').click();
      await expect.poll(async () => (await f.state()).planning.phase).toBe('planning-complete');
      await panel(f.page, 6);
      await expect(f.page.locator('#handoff-title')).toContainText('builder dispatch is blocked');
      const handoff = await (await fetch(f.origin + '/api/artifacts/handoff')).json();
      const packet = await (await fetch(f.origin + '/api/artifacts/packet')).json();
      for (const artifact of [handoff, packet]) {
        assert.equal(artifact.authority, 'draft-only'); assert.equal(artifact.approvalStatus, 'approval-channel-not-implemented');
      }
      assert.equal(packet.requiredReviews.length, 4); assert.ok(packet.requiredReviews.every(r => r.status === 'not-performed'));
      assert.equal(handoff.remainingBlockers.length, 4); assert.equal(handoff.dispatchReady, false);
      assert.ok(!packet.confirmedScope.some(value => /sharing/.test(value)));
      await expect(f.page.getByRole('button', { name: /^(approve|dispatch|start build|run evals)/i })).toHaveCount(0);
      assert.equal(f.calls.start, 0); assert.equal(f.calls.send, 0);
    });
  });
  await check('TUI-C04', 'Revisiting and reloading retain completed workflow without hidden writes', async () => {
    await using({}, async f => {
      await f.seed('complete'); await f.open();
      await unchanged(f, async () => {
        for (const n of [6, 2, 1, 3, 4, 5, 6]) await reach(f.page, n);
        await f.page.reload(); await panel(f.page, 6);
        for (let n = 1; n <= 6; n++) await expect(step(f.page, n)).toBeEnabled();
      });
    });
  });
  await check('TUI-C05', 'Upstream artifact revision invalidates planning and relocks downstream navigation', async () => {
    await using({}, async f => {
      await f.seed('complete'); await f.open(); await reach(f.page, 3);
      await unchanged(f, () => f.page.locator('#feedback').fill('Change the reading list heading.'));
      await f.page.locator('#changes-form button[type="submit"]').click();
      await expect.poll(async () => (await f.state()).artifacts.prd.revision).toBe(2);
      await panel(f.page, 3);
      const saved = await f.state(); assert.equal(saved.planning, undefined);
      for (const n of [5, 6]) await expect(step(f.page, n)).toBeDisabled();
      assert.equal((await fetch(f.origin + '/api/artifacts/handoff')).status, 404);
      await f.page.reload(); await panel(f.page, 3);
      await expect(step(f.page, 4)).toBeEnabled();
    });
  });
  await check('TUI-C06', 'Session drawer retains controls, labels, and connection behavior', async () => {
    await using({}, async f => {
      await f.open();
      await expect(f.page.locator('#session-toggle')).toHaveAttribute('aria-controls', 'orca-connection');
      await expect(f.page.locator('#session-toggle')).toHaveAttribute('aria-expanded', 'false');
      await unchanged(f, async () => { await openSession(f.page); await f.page.locator('#session-toggle').click(); await openSession(f.page); });
      for (const id of ['orca-preferences-form', 'orca-provider', 'orca-model', 'orca-effort', 'orca-start', 'orca-discover', 'orca-attach-form', 'orca-target', 'orca-detach', 'orca-resume', 'orca-status', 'orca-receipt', 'theme']) await expect(f.page.locator(`#orca-connection #${id}`)).toHaveCount(1);
      await unchanged(f, async () => {
        await f.page.locator('#theme').focus(); await f.page.keyboard.press('Escape');
        await expect(f.page.locator('#session-toggle')).toHaveAttribute('aria-expanded', 'false');
        await expect(f.page.locator('#session-toggle')).toBeFocused(); await openSession(f.page);
      });
      await expect(f.page.locator('#orca-connection')).toContainText('Pairing selects a recipient; it grants no approval or build authority.');
      await f.page.locator('#orca-provider').selectOption('codex');
      await expect(f.page.locator('#orca-model')).toHaveValue('gpt-6.1-sol');
      await f.page.locator('#orca-preferences-form button[type="submit"]').click();
      await expect(f.page.locator('#orca-preferences-saved')).toContainText('Saved: codex');
      await f.page.locator('#orca-discover').click();
      await expect(f.page.locator('#orca-target option')).toHaveCount(1);
      assert.equal(f.calls.start, 0); assert.equal(f.calls.send, 0);
    });
  });
  await check('TUI-C07', 'Artifact tabs implement keyboard, roving focus, and linked panels without writes', async () => {
    await using({}, async f => {
      await f.seed(); await f.open(); await reach(f.page, 3);
      await unchanged(f, async () => {
        const tabs = f.page.getByRole('tablist').getByRole('tab');
        assert.deepEqual((await tabs.allTextContents()).map(text => text.trim()), ['Experience', 'PRD', 'Review packet']);
        for (const [index, key] of [[0, 'Home'], [1, 'ArrowRight'], [2, 'End'], [0, 'ArrowRight'], [2, 'ArrowLeft']]) {
          if (key === 'Home') await tabs.first().focus();
          await f.page.keyboard.press(key);
          await expect(tabs.nth(index)).toBeFocused();
          await expect(tabs.nth(index)).toHaveAttribute('aria-selected', 'true');
          await expect(tabs.nth(index)).toHaveAttribute('tabindex', '0');
          await expect(f.page.getByRole('tabpanel')).toHaveCount(1);
          for (let i = 0; i < 3; i++) {
            const tab = tabs.nth(i), target = await tab.getAttribute('aria-controls');
            assert.ok(target); await expect(f.page.locator(`[id="${target}"]`)).toHaveAttribute('role', 'tabpanel');
            await expect(f.page.locator(`[id="${target}"]`)).toHaveAttribute('aria-labelledby', await tab.getAttribute('id'));
            if (i !== index) await expect(tab).toHaveAttribute('tabindex', '-1');
          }
        }
        await tabs.first().click();
        await f.page.frameLocator('#mockup').getByRole('button', { name: 'View sample book' }).click();
        await expect(f.page.frameLocator('#mockup').getByText('Sample book details')).toBeVisible();
        await f.page.locator('#feedback').focus(); await expect(f.page.locator('#feedback')).toBeFocused();
      });
    });
  });
  await check('TUI-C08', 'All themes fit 390px and expose visible keyboard focus', async () => {
    await using({}, async f => {
      await f.seed('complete'); await f.open(); await f.page.setViewportSize({ width: 390, height: 844 });
      await openSession(f.page);
      for (const theme of themes) {
        await f.page.locator('#theme').selectOption(theme);
        await expect(f.page.locator('html')).toHaveAttribute('data-theme', theme);
        await f.page.locator('#session-toggle').click();
        for (let n = 1; n <= 6; n++) {
          await reach(f.page, n);
          const dimensions = await f.page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
          assert.ok(dimensions.scroll <= dimensions.width + 1, `${theme} panel${n} overflows: ${JSON.stringify(dimensions)}`);
        }
        await step(f.page, 6).focus(); await f.page.keyboard.press('Tab');
        const focus = await f.page.evaluate(() => { const el = document.activeElement, css = getComputedStyle(el); return { tag: el.tagName, style: css.outlineStyle, width: parseFloat(css.outlineWidth), offset: parseFloat(css.outlineOffset) }; });
        assert.notEqual(focus.tag, 'BODY'); assert.notEqual(focus.style, 'none'); assert.ok(focus.width >= 2 && focus.offset >= 2, JSON.stringify(focus));
        await openSession(f.page);
      }
    });
  });
  await check('TUI-C09', 'Interruption and failure remain visible across navigation without retries', async () => {
    for (const mode of ['interrupt', 'fail']) await using({ [mode]: true }, async f => {
      await f.seed('answer'); await f.post('/api/draft'); await f.open();
      const saved = await f.state(); assert.equal(saved.task.status, mode === 'interrupt' ? 'interrupted' : 'failed');
      await expect(f.page.locator('#task-status')).toBeVisible(); await expect(f.page.locator('#blockers-section')).toBeVisible();
      await unchanged(f, async () => { await reach(f.page, 1); await expect(f.page.locator('#task-status')).toBeVisible(); await expect(f.page.locator('#blockers-section')).toBeVisible(); await f.page.reload(); });
      assert.equal(f.calls.draft, 1);
      if (mode === 'interrupt') {
        await panel(f.page, 1); await expect(f.page.locator('#recovery-info')).toBeVisible(); await expect(f.page.locator('#draft-button')).toBeDisabled();
        await f.page.locator('#idea').fill('A separate explicit reading preparation.');
        await f.page.locator('#idea-form button[type="submit"]').click();
        await panel(f.page, 2); assert.notEqual((await f.state()).id, saved.id);
        assert.equal((await f.state()).idea, 'A separate explicit reading preparation.'); assert.equal(f.calls.draft, 1);
      }
    });
  });
  await check('TUI-R01', 'Themes use one local key, persist, tolerate blocked storage, and make no mutations', async () => {
    await using({}, async f => {
      await f.seed('complete'); await f.open(); await openSession(f.page);
      await f.page.evaluate(() => localStorage.setItem('preparation-theme', 'unknown-theme'));
      await f.page.reload(); await expect(f.page.locator('html')).toHaveAttribute('data-theme', 'graphite'); await openSession(f.page);
      await unchanged(f, async () => {
        for (const theme of themes) {
          await f.page.locator('#theme').selectOption(theme);
          await expect(f.page.locator('html')).toHaveAttribute('data-theme', theme);
          await f.page.reload(); await openSession(f.page);
          await expect(f.page.locator('#theme')).toHaveValue(theme);
          assert.equal(await f.page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--ground').trim().toLowerCase()), grounds[theme], 'Theme must change the rendered palette');
          assert.deepEqual(await f.page.evaluate(() => Object.keys(localStorage)), ['preparation-theme']);
          assert.equal(await f.page.evaluate(() => localStorage.getItem('preparation-theme')), theme);
        }
        const blocked = await f.context.browser().newContext();
        try {
          await blocked.addInitScript(() => { for (const method of ['getItem', 'setItem', 'removeItem']) Storage.prototype[method] = function () { throw new DOMException('Blocked by synthetic fixture', 'SecurityError'); }; });
          const page = await blocked.newPage(); const errors = [], writes = [];
          page.on('pageerror', e => errors.push(e.message)); page.on('request', r => { if (r.method() === 'POST') writes.push(r.url()); });
          await page.goto(f.origin); await expect(page.locator('html')).toHaveAttribute('data-theme', 'graphite'); await panel(page, 6);
          await openSession(page); await page.locator('#theme').selectOption('indigo');
          await expect(page.locator('html')).toHaveAttribute('data-theme', 'indigo');
          await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-theme', 'graphite');
          assert.deepEqual(errors, []); assert.deepEqual(writes, []);
        } finally { await blocked.close(); }
      });
      assert.deepEqual(f.pageErrors, []); assert.deepEqual(f.external, []);
    });
  });
  await check('TUI-R02', 'Unavailable planning stays gated; shell CSP and external resource boundary stay intact', async () => {
    await using({ noPlanning: true }, async f => {
      await f.seed(); await f.open(); await panel(f.page, 3);
      for (const n of [4, 5, 6]) await expect(step(f.page, n)).toBeDisabled();
      await expect(f.page.locator('#technical-button')).toBeDisabled();
      assert.equal(f.csp, shellCsp); assert.deepEqual(f.external, []);
      const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
      assert.match(html, /<html[^>]+data-theme="graphite"/);
      assert.doesNotMatch(html, /(?:src|href)=["']https?:\/\//i, 'Remote fonts/scripts/styles are out of scope');
      assert.equal(f.calls.technical, 0); assert.equal(f.calls.plan, 0); assert.equal(f.calls.start, 0);
    });
  });
} catch (error) {
  results.push({ id: 'TUI-INFRA', name: 'Browser/harness infrastructure', status: 'fail', failureKind: 'infrastructure', error: error.stack || String(error) });
} finally {
  if (browser) await browser.close();
  console.log(JSON.stringify({ suite: 'theme-ui', evidenceKind: 'synthetic-fixture-only', passed: results.filter(r => r.status === 'pass').length, failed: results.filter(r => r.status === 'fail').length, results }, null, 2));
  process.exitCode = results.some(r => r.status === 'fail') ? 1 : 0;
}
