/**
 * A request that never reaches the server, the modal it opens, and Retry, on the
 * running stack.
 *
 * Frozen at the S4 freeze. Read-only to every builder, S4's own included.
 *
 * Rows: T-012-P5, T-013-P22, T-013-P24.
 *
 * Nothing here asserts what the page shows behind the modal or after Close.
 * Blueprint 12.11 records that as unpinned (GAP-1): whether the list indicator
 * is removed when the modal of a failed list fetch appears, and what is behind
 * it, are silences the rows must not fill (eval plan 9.3).
 */

import { test, expect } from '@playwright/test';
import { createItem, itemNamed, readList } from '../support/api.js';
import {
  accessDeniedModal,
  apiFailureModal,
  expectListSettled,
  iconIn,
  openAndPick,
  openApp,
  pickUser,
  rowNamed,
  statusOf,
} from '../support/app.js';
import { failNextRequest, theActionRequest, theListRequest } from '../support/intercept.js';
import { uniqueName } from '../support/names.js';
import { ADA, MIA, onLoanTo } from '../support/strings.js';

test('T-012-P5 REQ-012.8 Retry repeats a borrow that never reached the server', async ({
  page,
  request,
}) => {
  const item = await createItem(request, uniqueName('Trolley'));

  await openAndPick(page, MIA.id);
  const row = rowNamed(page, item.name);
  await expect(iconIn(row, 'btn-borrow')).toBeVisible();

  const undo = await failNextRequest(page, theActionRequest(item.id, 'borrow'));
  await iconIn(row, 'btn-borrow').click();

  await expect(apiFailureModal(page)).toBeVisible();
  await expect(apiFailureModal(page).getByTestId('btn-close')).toBeVisible();
  await expect(apiFailureModal(page).getByTestId('btn-retry')).toBeVisible();

  await undo();
  await apiFailureModal(page).getByTestId('btn-retry').click();

  // The repeat reached the real server and the loan is Mia's own.
  await expect(statusOf(page, item.name)).toHaveText(onLoanTo(MIA.name));
  const kept = itemNamed(await readList(request), item.name);
  expect(kept?.status).toBe('on_loan');
  expect(kept?.borrowerId).toBe(MIA.id);
});

test('T-013-P22 REQ-013.23 a failed fetch of the list opens the API failure modal', async ({
  page,
  request,
}) => {
  await createItem(request, uniqueName('Beacon'));

  await openApp(page);
  await failNextRequest(page, theListRequest);
  await pickUser(page, ADA.id);

  await expect(apiFailureModal(page)).toBeVisible();
  await expect(apiFailureModal(page).getByTestId('btn-close')).toBeVisible();
  await expect(apiFailureModal(page).getByTestId('btn-retry')).toBeVisible();

  // A failed list fetch is a failure, not a refusal: a refused one would show
  // the Access denied modal instead (eval plan 1.1, D-24 against D-25).
  await expect(accessDeniedModal(page)).toHaveCount(0);
});

test('T-013-P24 REQ-013.25 Retry after a failed fetch shows the real list', async ({
  page,
  request,
}) => {
  const item = await createItem(request, uniqueName('Buoy'));

  await openApp(page);
  const undo = await failNextRequest(page, theListRequest);
  await pickUser(page, ADA.id);
  await expect(apiFailureModal(page)).toBeVisible();

  await undo();
  await apiFailureModal(page).getByTestId('btn-retry').click();

  await expectListSettled(page);
  await expect(rowNamed(page, item.name)).toBeVisible();
  await expect(apiFailureModal(page)).toHaveCount(0);
});
