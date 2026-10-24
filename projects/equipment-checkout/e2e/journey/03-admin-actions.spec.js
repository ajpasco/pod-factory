/**
 * The admin's own actions of the PRD's journey, on the running stack: return,
 * add, mark out of service, restore and delete.
 *
 * Frozen at the S4 freeze. Read-only to every builder, S4's own included.
 *
 * Rows: T-006-P7, T-009-P5, T-010-P7, T-011-P7, T-012-P7.
 */

import { test, expect } from '@playwright/test';
import { createItem, itemNamed, lendTo, readList, takeOutOfService } from '../support/api.js';
import {
  addCard,
  iconIn,
  confirmDeleteModal,
  openAndPick,
  rowNamed,
  statusOf,
  textsOutsideTheTopBar,
  typeAndEnter,
} from '../support/app.js';
import { uniqueName } from '../support/names.js';
import { ADA, AVAILABLE, MIA, OUT_OF_SERVICE, onLoanTo } from '../support/strings.js';

test('T-006-P7 REQ-006.5 REQ-006.6 an admin returns a loan and nothing says who returned it', async ({
  page,
  request,
}) => {
  const item = await createItem(request, uniqueName('Harness'));
  await lendTo(request, item.id, MIA.id);

  await openAndPick(page, ADA.id);
  const row = rowNamed(page, item.name);
  await expect(statusOf(page, item.name)).toHaveText(onLoanTo(MIA.name));
  await expect(iconIn(row, 'btn-return')).toBeVisible();
  await iconIn(row, 'btn-return').click();

  await expect(statusOf(page, item.name)).toHaveText(AVAILABLE);

  // The return is the positive anchor; only then is the absence claimed.
  for (const text of await textsOutsideTheTopBar(page)) {
    expect(text).not.toContain('Ada');
    expect(text).not.toContain('Admin');
  }
});

test('T-009-P5 REQ-009.2 a typed name and Enter adds an Available item', async ({
  page,
  request,
}) => {
  await openAndPick(page, ADA.id);
  await expect(addCard(page)).toBeVisible();

  const name = uniqueName('Ladder');
  await typeAndEnter(page, name);

  await expect(rowNamed(page, name)).toBeVisible();
  await expect(statusOf(page, name)).toHaveText(AVAILABLE);

  // What the application kept, not only what this page is showing.
  expect(itemNamed(await readList(request), name)?.status).toBe('available');
});

test('T-010-P7 REQ-010.3 REQ-010.6 an item goes out of service and comes back', async ({
  page,
  request,
}) => {
  const item = await createItem(request, uniqueName('Drill'));

  await openAndPick(page, ADA.id);
  const row = rowNamed(page, item.name);

  // Before the first step: the row offered Mark out of service.
  await expect(statusOf(page, item.name)).toHaveText(AVAILABLE);
  await expect(iconIn(row, 'btn-out-of-service')).toBeVisible();
  await iconIn(row, 'btn-out-of-service').click();

  await expect(statusOf(page, item.name)).toHaveText(OUT_OF_SERVICE);
  await expect(iconIn(rowNamed(page, item.name), 'btn-restore')).toBeVisible();
  await iconIn(rowNamed(page, item.name), 'btn-restore').click();

  await expect(statusOf(page, item.name)).toHaveText(AVAILABLE);
});

test('T-011-P7 REQ-011.7 a confirmed delete takes the item out of the list', async ({
  page,
  request,
}) => {
  const item = await createItem(request, uniqueName('Crate'));

  await openAndPick(page, ADA.id);
  const row = rowNamed(page, item.name);

  // The row and its Delete icon are found first, so "no longer in the list" is
  // not claimed on a page that never listed it.
  await expect(row).toBeVisible();
  await expect(iconIn(row, 'btn-delete')).toBeVisible();
  await iconIn(row, 'btn-delete').click();

  await expect(confirmDeleteModal(page)).toBeVisible();
  await confirmDeleteModal(page).getByTestId('btn-confirm').click();

  await expect(rowNamed(page, item.name)).toHaveCount(0);
  expect(itemNamed(await readList(request), item.name)).toBeUndefined();
});

test('T-012-P7 REQ-012.11 a confirmed add, mark and restore each show the new state', async ({
  page,
  request,
}) => {
  const toMark = await createItem(request, uniqueName('Pulley'));
  const toRestore = await createItem(request, uniqueName('Winch'));
  await takeOutOfService(request, toRestore.id);

  await openAndPick(page, ADA.id);
  await expect(addCard(page)).toBeVisible();

  const added = uniqueName('Anchor');
  await typeAndEnter(page, added);
  await expect(statusOf(page, added)).toHaveText(AVAILABLE);

  await expect(statusOf(page, toMark.name)).toHaveText(AVAILABLE);
  await iconIn(rowNamed(page, toMark.name), 'btn-out-of-service').click();
  await expect(statusOf(page, toMark.name)).toHaveText(OUT_OF_SERVICE);

  await expect(statusOf(page, toRestore.name)).toHaveText(OUT_OF_SERVICE);
  await iconIn(rowNamed(page, toRestore.name), 'btn-restore').click();
  await expect(statusOf(page, toRestore.name)).toHaveText(AVAILABLE);
});
