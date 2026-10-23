// Visual structure regression against Claude's reference, not pixel equality of sample content.
// npm run build && node test/theme-layout.mjs
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { createPreparationServer } from '../dist/src/server.js';

const dataDir = await mkdtemp(join(tmpdir(), 'theme-layout-'));
const evidence = new URL('../evidence/theme-ui-alignment/', import.meta.url);
const { server } = await createPreparationServer({ dataDir, providerLabel: 'Layout fixture', provider: {
  async draft() { return { prdMarkdown: '# Reading list\nOpen a sample book.', mockupHtml: '<html><body><h1>Reading list</h1><button>View sample book</button></body></html>', proposals: [], findings: [] }; },
} });
let browser;
const observations = [];
try {
  await mkdir(evidence, { recursive: true });
  await new Promise((done, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', done); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route('https://**/*', route => route.abort()); // Neither page may depend on external font services.
  const app = await context.newPage(), reference = await context.newPage();
  await reference.goto(new URL('../design/mockups/workspace.html', import.meta.url).href);
  // Give the historical reference the same bundled font bytes without editing it or using the network.
  const fonts = [
    ['IBM Plex Sans', '400 600', 'IBMPlexSans-latin.woff2'],
    ['IBM Plex Mono', '400', 'IBMPlexMono-400-latin.woff2'],
    ['IBM Plex Mono', '500', 'IBMPlexMono-500-latin.woff2'],
  ];
  const faces = await Promise.all(fonts.map(async ([family, weight, file]) => {
    const bytes = await readFile(new URL(`../public/fonts/${file}`, import.meta.url));
    return `@font-face { font-family: "${family}"; font-weight: ${weight}; src: url(data:font/woff2;base64,${bytes.toString('base64')}) format('woff2'); }`;
  }));
  await reference.addStyleTag({ content: faces.join('\n') });
  await reference.evaluate(() => show(3));
  await reference.evaluate(() => document.fonts.ready);
  await app.goto(origin);
  const fontProof = async page => page.evaluate(async () => {
    const checks = [];
    for (const [family, weight] of [['IBM Plex Sans', 400], ['IBM Plex Sans', 600], ['IBM Plex Mono', 400], ['IBM Plex Mono', 500]]) {
      const faces = await document.fonts.load(`${weight} 16px "${family}"`, 'Meeting preparation 012345');
      if (!faces.length || faces.some(face => face.status !== 'loaded')) throw new Error(`Font not loaded: ${family} ${weight}`);
      checks.push({ family, weight, loaded: faces.length });
    }
    if (!getComputedStyle(document.body).fontFamily.startsWith('"IBM Plex Sans"')) throw new Error('Graphite body lost IBM Plex Sans');
    const canvas = document.createElement('canvas').getContext('2d');
    const width = font => { canvas.font = font; return canvas.measureText('Meeting preparation WWW iii 012345').width; };
    const actual = width('400 16px "IBM Plex Sans", system-ui');
    const fallback = width('400 16px system-ui');
    if (Math.abs(actual - fallback) < 0.01) throw new Error('Font measurement still matches fallback');
    return { checks, actual, fallback };
  });
  observations.push({ id: 'VIS-04', status: 'PASS', fonts: await fontProof(app) });
  for (const [, , file] of fonts) {
    const response = await fetch(`${origin}/fonts/${file}`);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('content-type'), 'font/woff2');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(new URL(`../public/fonts/${file}`, import.meta.url)));
  }
  for (const path of ['/fonts/missing.woff2', '/fonts/sub/file.woff2', '/fonts/%2e%2e%2fpackage.json']) {
    assert.equal((await fetch(origin + path)).status, 404, path);
  }
  // Negative control: the exact same font assertion must detect unavailable font assets.
  const brokenContext = await browser.newContext();
  try {
    await brokenContext.route('**/fonts/**', route => route.abort());
    const broken = await brokenContext.newPage();
    await broken.goto(origin);
    await assert.rejects(() => fontProof(broken), /font|network/i);
  } finally { await brokenContext.close(); }
  observations.push({ id: 'VIS-05', status: 'PASS', routeBytes: 'match bundled files', invalidPaths: '404', missingFontProbe: 'refused' });
  await app.locator('#idea').fill('A reading list for one reader.');
  await app.locator('#idea-form button[type="submit"]').click();
  await app.locator('#answer').fill('One reader opens a sample book.');
  await app.locator('#answer-form button[type="submit"]').click();
  await app.locator('#draft-button').click();
  await expect(app.locator('#stage')).toHaveText('review');
  await expect(app.frameLocator('#mockup').getByRole('heading', { name: 'Reading list', exact: true })).toBeVisible();
  const geometry = page => page.evaluate(() => {
    const panel = document.querySelector('[data-step="3"]'), rail = document.querySelector('nav[aria-label="Preparation steps"]');
    const a = panel.getBoundingClientRect(), r = rail.getBoundingClientRect(), header = document.querySelector('header').getBoundingClientRect();
    return { panelX: a.x, panelWidth: a.width, railX: r.x, railWidth: r.width, gap: a.x - r.right,
      panelBelowHeader: a.top - header.bottom, railBelowHeader: r.top - header.bottom };
  });
  const actual = await geometry(app), expected = await geometry(reference);
  for (const key of Object.keys(expected)) assert.ok(Math.abs(actual[key] - expected[key]) <= 8, `${key}: app ${actual[key]}, reference ${expected[key]}`);
  observations.push({ id: 'VIS-01', status: 'PASS', actual, reference: expected, tolerancePx: 8 });
  const row = await app.evaluate(() => {
    const revise = document.querySelector('#changes-form button[type="submit"]').getBoundingClientRect();
    const next = document.querySelector('#continue-blueprint').getBoundingClientRect();
    return { reviseTop: revise.top, continueTop: next.top };
  });
  assert.ok(Math.abs(row.reviseTop - row.continueTop) <= 2, 'Revision and continue must share the desktop action row.');
  observations.push({ id: 'VIS-02', status: 'PASS', ...row });
  await app.locator('#mockup').scrollIntoViewIfNeeded();
  await app.screenshot({ path: new URL('app-desktop.png', evidence).pathname, fullPage: true });
  await reference.screenshot({ path: new URL('claude-reference-desktop.png', evidence).pathname, fullPage: true });
  await app.setViewportSize({ width: 390, height: 1000 });
  await expect(app.locator('[data-step="3"]')).toBeVisible();
  const narrow = await app.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
    panelTop: document.querySelector('[data-step="3"]').getBoundingClientRect().top,
    statusTop: document.querySelector('#workspace').getBoundingClientRect().top }));
  assert.ok(narrow.scroll <= narrow.client + 1); assert.ok(narrow.statusTop > narrow.panelTop, 'Routine status must not displace the mobile task panel.');
  observations.push({ id: 'VIS-03', status: 'PASS', ...narrow });
  await app.locator('#mockup').scrollIntoViewIfNeeded();
  await app.screenshot({ path: new URL('app-mobile.png', evidence).pathname, fullPage: true });
} catch (error) {
  observations.push({ id: 'VIS-ERROR', status: 'FAIL', error: error.stack || String(error) }); process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server.listening) await new Promise(done => server.close(done));
  await rm(dataDir, { recursive: true, force: true });
  await mkdir(evidence, { recursive: true });
  await writeFile(new URL('layout-results.json', evidence), JSON.stringify({ evidence: 'Synthetic preparation; reference uses identical bundled font bytes; external fonts blocked; real app font loading and missing-font negative control; no live-state mutation', observations }, null, 2) + '\n');
  console.log(JSON.stringify(observations, null, 2));
}
