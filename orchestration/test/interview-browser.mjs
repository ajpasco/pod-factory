import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPreparationServer } from '../dist/src/server.js';

const dataDir = await mkdtemp(join(tmpdir(), 'interview-browser-'));
let calls = 0, drafts = 0;
const inputs = [];
let releaseFirst;
const firstWait = new Promise(resolve => { releaseFirst = resolve; });
const provider = {
  async interview(input) {
    inputs.push(input); calls++;
    if (calls === 1) { await firstWait; return { question: 'How should members identify themselves?', reason: 'Borrow and return permissions need a member identity.', summary: '' }; }
    if (calls === 2) return { question: 'What should happen when two members borrow the same item at once?', reason: 'Define the losing request’s visible result.', summary: '' };
    return { question: null, reason: 'The supplied business decisions are complete.', summary: 'Seeded users borrow and return equipment. A concurrent loser sees unavailable. No reminders.' };
  },
  async draft(input) { drafts++; return { prdMarkdown: '# Equipment\n' + input.confirmedScope.join('\n'), mockupHtml: '<!doctype html><button>Borrow</button>', proposals: [], findings: [] }; },
};
const { server } = await createPreparationServer({ dataDir, provider });
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.goto(origin);
  await page.getByLabel('Describe the audience, problem, and outcome you have in mind.').fill('Equipment checkout for a small team. React, FastAPI, Postgres. No reminders.');
  await page.getByRole('button', { name: 'Start preparation', exact: true }).click();
  await expect(page.locator('[data-task-feedback="2"]')).toBeVisible();
  await expect(page.locator('[data-task-feedback="2"]')).toContainText('Reviewing your requirements');
  assert.equal(drafts, 0);
  releaseFirst();
  await expect(page.locator('#question-prompt')).toContainText('identify themselves');
  await page.getByLabel('Your answer', { exact: true }).fill('Use a seeded-user switcher for this local trial. No passwords.');
  await page.getByRole('button', { name: 'Save answer', exact: true }).click();
  await expect(page.locator('#question-prompt')).toContainText('two members');
  await expect(page.getByLabel('Your answer', { exact: true })).toHaveValue('');
  await page.reload();
  await expect(page.locator('#question-prompt')).toContainText('two members');
  await expect(page.locator('#interview-history')).toContainText('No passwords');
  assert.equal(drafts, 0);
  await page.getByLabel('Your answer', { exact: true }).fill('Exactly one succeeds. The other sees that it is unavailable.');
  await page.getByRole('button', { name: 'Save answer', exact: true }).click();
  await expect(page.locator('#interview-summary')).toContainText('No reminders');
  await expect(page.locator('#answer-form')).not.toBeVisible();
  assert.equal(drafts, 0, 'completion must not draft automatically');
  assert.equal(inputs[2].answers.length, 2);
  await page.getByRole('button', { name: 'Review scope and continue to drafts' }).click();
  await page.getByRole('button', { name: 'Create the drafts', exact: true }).click();
  await expect(page.locator('#stage')).toHaveText('review');
  assert.equal(drafts, 1); assert.equal(calls, 3);
  await page.getByRole('tab', { name: 'PRD', exact: true }).click();
  await expect(page.locator('#prd')).toContainText('Exactly one succeeds');
  await expect(page.locator('#prd')).toContainText('No passwords');
  console.log('PASS adaptive interview: automatic start, two material questions, reload with answers preserved, no automatic draft, explicit draft includes answers. Fixture-provider evidence.');
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); await rm(dataDir, { recursive: true, force: true }); }
