/**
 * Two browser contexts on one stack: one person acts while the other still sees
 * an older list, and the second request is rejected.
 *
 * Frozen at the S4 freeze. Read-only to every builder, S4's own included.
 *
 * Rows: T-008-N11, T-008-N12, T-011-N9, T-012-N10.
 *
 * Two contexts rather than two tabs of one context, because the acting user is
 * held in the page's memory (blueprint DD-08) and each context must have its own
 * picked user and its own list (eval plan 1.3, "Two contexts"). Every row here
 * shows the API failure modal and not the Access denied modal: the second person
 * is allowed to do what they asked, and the item is simply no longer in the
 * state they were looking at. That is a rejection, not a refusal (eval plan 1.1).
 */

import { test, expect } from '@playwright/test';
import { createItem, itemNamed, readList } from '../support/api.js';
import {
  accessDeniedModal,
  apiFailureModal,
  borrowerModal,
  confirmDeleteModal,
  iconIn,
  openAndPick,
  rowNamed,
  statusOf,
} from '../support/app.js';
import { BASE_URL } from '../support/base-url.js';
import { uniqueName } from '../support/names.js';
import { ADA, AVAILABLE, MIA, OUT_OF_SERVICE, SAM, onLoanTo } from '../support/strings.js';

/** A second browser context with its own page, its own pick and its own list. */
async function secondContext(browser, userId) {
  const context = await browser.newContext({ baseURL: BASE_URL });
  const page = await context.newPage();
  await openAndPick(page, userId);
  return { context, page };
}

test('T-008-N11 REQ-008.6 REQ-008.8 a borrow of an item another person has just taken is rejected', async ({
  page,
  browser,
  request,
}) => {
  const item = await createItem(request, uniqueName('Camera'));

  await openAndPick(page, ADA.id);
  const stale = await secondContext(browser, SAM.id);

  // Both contexts list it Available: the stale view is real, not assumed.
  await expect(statusOf(page, item.name)).toHaveText(AVAILABLE);
  await expect(statusOf(stale.page, item.name)).toHaveText(AVAILABLE);

  await iconIn(rowNamed(page, item.name), 'btn-borrow').click();
  await expect(borrowerModal(page)).toBeVisible();
  await page.getByTestId(`member-button-${MIA.id}`).click();
  await expect(statusOf(page, item.name)).toHaveText(onLoanTo(MIA.name));

  // Sam's context still shows Available, and Sam is a member, so this is his own
  // borrow with no modal to choose a borrower in.
  await iconIn(rowNamed(stale.page, item.name), 'btn-borrow').click();
  await expect(apiFailureModal(stale.page)).toBeVisible();
  await expect(accessDeniedModal(stale.page)).toHaveCount(0);

  // A fresh look: still on loan to Mia, and to no other borrower.
  const kept = itemNamed(await readList(request), item.name);
  expect(kept?.status).toBe('on_loan');
  expect(kept?.borrowerId).toBe(MIA.id);
  expect(kept?.borrowerName).toBe(MIA.name);
  await openAndPick(page, ADA.id);
  await expect(statusOf(page, item.name)).toHaveText(onLoanTo(MIA.name));

  await stale.context.close();
});

test('T-008-N12 REQ-008.7 a borrow of an item just taken out of service is rejected', async ({
  page,
  browser,
  request,
}) => {
  const item = await createItem(request, uniqueName('Projector'));

  await openAndPick(page, ADA.id);
  const stale = await secondContext(browser, SAM.id);

  await expect(statusOf(page, item.name)).toHaveText(AVAILABLE);
  await expect(statusOf(stale.page, item.name)).toHaveText(AVAILABLE);

  await iconIn(rowNamed(page, item.name), 'btn-out-of-service').click();
  await expect(statusOf(page, item.name)).toHaveText(OUT_OF_SERVICE);

  // The second context still lists it Available, so the Borrow icon is there.
  await expect(statusOf(stale.page, item.name)).toHaveText(AVAILABLE);
  await iconIn(rowNamed(stale.page, item.name), 'btn-borrow').click();
  await expect(apiFailureModal(stale.page)).toBeVisible();

  const kept = itemNamed(await readList(request), item.name);
  expect(kept?.status).toBe('out_of_service');
  expect(kept?.borrowerId).toBeNull();
  await openAndPick(page, ADA.id);
  await expect(statusOf(page, item.name)).toHaveText(OUT_OF_SERVICE);

  await stale.context.close();
});

test('T-011-N9 REQ-011.8 a delete of an item just borrowed by someone else is rejected', async ({
  page,
  browser,
  request,
}) => {
  const item = await createItem(request, uniqueName('Megaphone'));

  await openAndPick(page, ADA.id);
  // Ada's context lists it with Delete offered: the anchor for the rejection.
  await expect(statusOf(page, item.name)).toHaveText(AVAILABLE);
  await expect(iconIn(rowNamed(page, item.name), 'btn-delete')).toBeVisible();

  const borrower = await secondContext(browser, MIA.id);
  await iconIn(rowNamed(borrower.page, item.name), 'btn-borrow').click();
  await expect(statusOf(borrower.page, item.name)).toHaveText(onLoanTo(MIA.name));

  await iconIn(rowNamed(page, item.name), 'btn-delete').click();
  await expect(confirmDeleteModal(page)).toBeVisible();
  await confirmDeleteModal(page).getByTestId('btn-confirm').click();

  await expect(apiFailureModal(page)).toBeVisible();
  await expect(accessDeniedModal(page)).toHaveCount(0);

  const kept = itemNamed(await readList(request), item.name);
  expect(kept?.status).toBe('on_loan');
  expect(kept?.borrowerId).toBe(MIA.id);
  await openAndPick(page, ADA.id);
  await expect(rowNamed(page, item.name)).toBeVisible();
  await expect(statusOf(page, item.name)).toHaveText(onLoanTo(MIA.name));

  await borrower.context.close();
});

test('T-012-N10 REQ-012.16 an action on an item someone else has deleted is rejected', async ({
  page,
  browser,
  request,
}) => {
  const item = await createItem(request, uniqueName('Easel'));

  await openAndPick(page, ADA.id);
  const other = await secondContext(browser, ADA.id);

  await expect(statusOf(page, item.name)).toHaveText(AVAILABLE);
  await expect(statusOf(other.page, item.name)).toHaveText(AVAILABLE);

  await iconIn(rowNamed(other.page, item.name), 'btn-delete').click();
  await expect(confirmDeleteModal(other.page)).toBeVisible();
  await confirmDeleteModal(other.page).getByTestId('btn-confirm').click();
  await expect(rowNamed(other.page, item.name)).toHaveCount(0);

  // The first context still lists it, so its Mark out of service is a real
  // action on an item that is no longer there.
  await iconIn(rowNamed(page, item.name), 'btn-out-of-service').click();

  await expect(apiFailureModal(page)).toBeVisible();
  await expect(apiFailureModal(page).getByTestId('btn-close')).toBeVisible();
  await expect(apiFailureModal(page).getByTestId('btn-retry')).toBeVisible();

  // Its row is unchanged: found first, then read.
  await expect(rowNamed(page, item.name)).toBeVisible();
  await expect(statusOf(page, item.name)).toHaveText(AVAILABLE);

  // A fresh look: the item is gone.
  expect(itemNamed(await readList(request), item.name)).toBeUndefined();
  await openAndPick(page, ADA.id);
  await expect(rowNamed(page, item.name)).toHaveCount(0);

  await other.context.close();
});
