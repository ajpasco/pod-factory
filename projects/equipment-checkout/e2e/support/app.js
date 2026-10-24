/**
 * The page, named in the plain-English words the rows use.
 *
 * Frozen at the S4 freeze. Read-only to every builder, S4's own included.
 *
 * Eval plan 1.4 fixes the mapping from a row's words to the blueprint's
 * `data-testid` (blueprint 12.8), and this file is that table in code, so a row
 * reads like its sentence. Eval plan 1.1: a locator is the instrument that
 * observes an outcome and never the thing verified, so no row here asserts that
 * a locator exists for its own sake; each one asserts what a person sees.
 */

import { expect } from '@playwright/test';
import { NO_EQUIPMENT_YET } from './strings.js';

/** Open the app. The stack is already running: C10 starts it, not this config. */
export async function openApp(page) {
  await page.goto('/');
}

export function switcher(page) {
  return page.getByTestId('switcher');
}

/** The switcher's three user entries, in document order, as a person reads them. */
export async function switcherEntries(page) {
  const options = page.locator('[data-testid^="switcher-option-"]');
  await expect(options.first()).toBeAttached();
  return options.allTextContents();
}

/**
 * Pick the acting user. This only picks: it does not wait for the list, because
 * a row whose list request is refused, rejected or aborted (T-013-P22, T-001-N8)
 * never gets one and must still be able to pick.
 */
export async function pickUser(page, userId) {
  await switcher(page).selectOption(String(userId));
}

/**
 * Wait until the list request the page made at the pick has settled and the page
 * shows the person either a list or the empty text.
 *
 * The two waits are in this order on purpose. Waiting for the list or the empty
 * text first is what proves the fetch finished; checking that the indicator is
 * gone first would pass before the fetch had even started, when no indicator has
 * yet been rendered. No fixed pause is used anywhere (eval plan 1.1, no sleeps).
 */
export async function expectListSettled(page) {
  await expect(
    page.getByTestId('equipment-list').or(page.getByTestId('empty-state')),
  ).toBeVisible();
  await expect(page.getByTestId('list-indicator')).toHaveCount(0);
}

export async function openAndPick(page, userId) {
  await openApp(page);
  await pickUser(page, userId);
  await expectListSettled(page);
}

export function rows(page) {
  return page.getByTestId('row');
}

/**
 * The row of one item. Item names are unique per run (support/names.js), so a
 * substring match cannot reach another row, and the row's own name is asserted
 * by `expectListHolds` where a row needs it stated.
 */
export function rowNamed(page, name) {
  return rows(page).filter({ hasText: name });
}

export function statusOf(page, name) {
  return rowNamed(page, name).getByTestId('row-status');
}

export function iconIn(row, testId) {
  return row.getByTestId(testId);
}

/**
 * What the person sees in the list: each row's name and status, in order. The
 * status text carries the borrower for an On loan row (blueprint 12.9), so this
 * is names, statuses and borrowers together, which is what T-013-N5 and the
 * restart rows compare.
 */
export async function listOnScreen(page) {
  await expect(page.getByTestId('equipment-list')).toBeVisible();
  const seen = [];
  for (const row of await rows(page).all()) {
    seen.push({
      name: (await row.getByTestId('row-name').textContent())?.trim() ?? '',
      status: (await row.getByTestId('row-status').textContent())?.trim() ?? '',
    });
  }
  return seen;
}

export function accessDeniedModal(page) {
  return page.getByTestId('modal-access-denied');
}

export function apiFailureModal(page) {
  return page.getByTestId('modal-api-failure');
}

export function borrowerModal(page) {
  return page.getByTestId('modal-borrower');
}

export function confirmDeleteModal(page) {
  return page.getByTestId('modal-confirm-delete');
}

export function emptyText(page) {
  return page.getByText(NO_EQUIPMENT_YET, { exact: true });
}

export function addField(page) {
  return page.getByTestId('add-input');
}

export function addCard(page) {
  return page.getByTestId('add-card');
}

/**
 * Add an item the way the PRD's journey does: type the name and press Enter.
 */
export async function typeAndEnter(page, name) {
  await addField(page).fill(name);
  await addField(page).press('Enter');
}

/**
 * Wait out the Show loading demo without sleeping: the list indicator appears
 * and then disappears (eval plan 1.1). Five seconds is a timeout, not a duration
 * any row asserts; the 900 ms of REQ-013.13 is never measured here.
 */
export async function waitOutTheLoadingDemo(page) {
  const indicator = page.getByTestId('list-indicator');
  await expect(indicator).toBeVisible({ timeout: 5000 });
  await expect(indicator).toHaveCount(0, { timeout: 5000 });
}

/**
 * Every piece of text, `title` and `aria-label` the page shows outside the top
 * bar, for the two rows that assert nothing names the admin who acted
 * (T-004-P7, T-006-P7; REQ-004.9, REQ-006.6).
 *
 * The top bar is excluded because it is where the acting user is *supposed* to
 * be named: it holds "Acting as", the switcher with "Ada Admin (admin)" in it
 * and the role badge (blueprint 12.8.1). Everything else is the interface those
 * criteria speak about. The exclusion is done by removing the top bar from a
 * clone of the body, so a build that renders no top bar does not quietly pass:
 * its switcher text would then be inside what is scanned and the row would fail.
 */
export async function textsOutsideTheTopBar(page) {
  await expect(page.getByTestId('top-bar')).toBeVisible();
  return page.evaluate(() => {
    const body = globalThis.document.body.cloneNode(true);
    const topBar = body.querySelector('[data-testid="top-bar"]');
    if (topBar !== null) {
      topBar.remove();
    }
    const found = [body.textContent ?? ''];
    for (const element of body.querySelectorAll('[title], [aria-label]')) {
      found.push(element.getAttribute('title') ?? '', element.getAttribute('aria-label') ?? '');
    }
    return found;
  });
}
