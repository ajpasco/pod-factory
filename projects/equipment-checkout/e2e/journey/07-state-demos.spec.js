/**
 * The four state demos on the real stack, and an Add made from the Show empty
 * list view.
 *
 * Frozen at the S4 freeze. Read-only to every builder, S4's own included.
 *
 * Rows: T-013-P14, T-013-N5, T-013-P17, T-013-P19.
 *
 * No row here pauses for a fixed time (eval plan 1.1). The 900 ms of REQ-013.13
 * is never measured: the row waits for the list indicator to appear and then to
 * disappear, each wait with a timeout, which is not a duration it asserts.
 */

import { test, expect } from '@playwright/test';
import { createItem, itemNamed, lendTo, readList } from '../support/api.js';
import {
  addCard,
  emptyText,
  apiFailureModal,
  accessDeniedModal,
  expectListSettled,
  listOnScreen,
  openAndPick,
  pickUser,
  openApp,
  rowNamed,
  statusOf,
  typeAndEnter,
  waitOutTheLoadingDemo,
} from '../support/app.js';
import { uniqueName } from '../support/names.js';
import { ADA, AVAILABLE, MIA, NO_EQUIPMENT_YET } from '../support/strings.js';

test('T-013-P14 REQ-013.13 Show loading ends by itself and the real list comes back', async ({
  page,
  request,
}) => {
  const item = await createItem(request, uniqueName('Pump'));

  await openAndPick(page, ADA.id);
  await expect(rowNamed(page, item.name)).toBeVisible();
  const before = await listOnScreen(page);

  await page.getByTestId('demo-loading').click();

  // Appear, then disappear, with no further action by the person.
  await waitOutTheLoadingDemo(page);

  expect(await listOnScreen(page)).toEqual(before);
});

test('T-013-N5 REQ-013.12 no state demo changes anything that is kept', async ({
  page,
  request,
}) => {
  const plain = await createItem(request, uniqueName('Vice'));
  const lent = await createItem(request, uniqueName('Clamp'));
  await lendTo(request, lent.id, MIA.id);

  await openAndPick(page, ADA.id);
  await expect(rowNamed(page, plain.name)).toBeVisible();
  await expect(rowNamed(page, lent.name)).toBeVisible();
  const before = await listOnScreen(page);

  // Each of the four demos in turn, with no Add and no other action: the two
  // modals are closed with their own controls and Show empty list is left by
  // Show loading, which is the only way out of it (blueprint 12.7, D-21).
  await page.getByTestId('demo-loading').click();
  await waitOutTheLoadingDemo(page);

  await page.getByTestId('demo-api-failure').click();
  await expect(apiFailureModal(page)).toBeVisible();
  await apiFailureModal(page).getByTestId('btn-close').click();
  await expect(apiFailureModal(page)).toHaveCount(0);

  await page.getByTestId('demo-access-denied').click();
  await expect(accessDeniedModal(page)).toBeVisible();
  await accessDeniedModal(page).getByTestId('btn-ok').click();
  await expect(accessDeniedModal(page)).toHaveCount(0);

  await page.getByTestId('demo-empty').click();
  await expect(emptyText(page)).toBeVisible();
  await page.getByTestId('demo-loading').click();
  await waitOutTheLoadingDemo(page);

  // Reloaded and picked again, so what is read is what the application kept and
  // not what one page had in memory.
  await openApp(page);
  await pickUser(page, ADA.id);
  await expectListSettled(page);
  expect(await listOnScreen(page)).toEqual(before);
});

test('T-013-P17 REQ-013.18 an Add made from the Show empty list view is kept', async ({
  page,
  request,
}) => {
  const first = await createItem(request, uniqueName('Spade'));
  const second = await createItem(request, uniqueName('Bucket'));

  await openAndPick(page, ADA.id);
  await expect(rowNamed(page, first.name)).toBeVisible();
  await expect(rowNamed(page, second.name)).toBeVisible();

  await page.getByTestId('demo-empty').click();
  // "No equipment yet" first found, as the row says, with the Add card above it.
  await expect(emptyText(page)).toBeVisible();
  await expect(addCard(page)).toBeVisible();

  const added = uniqueName('Sieve');
  // The page is reloaded next, so the Add's own answer has to have arrived first. A
  // navigation that commits while the POST is still in flight cancels it, and whether
  // the item survives then depends on how the API treats a client disconnect, which no
  // requirement pins: a correct build could lose it and fail this row. Neither the
  // status nor the body is read here — this waits, it does not assert. That a confirmed
  // Add ends the view is REQ-013.19, which is T-013-P19's claim and not this row's.
  const posted = page.waitForResponse(
    (answer) => answer.request().method() === 'POST' && answer.url().includes('/api/equipment'),
  );
  await typeAndEnter(page, added);
  await posted;

  await openApp(page);
  await pickUser(page, ADA.id);
  await expectListSettled(page);
  await expect(rowNamed(page, added)).toBeVisible();
  await expect(statusOf(page, added)).toHaveText(AVAILABLE);
  expect(itemNamed(await readList(request), added)?.status).toBe('available');
});

test('T-013-P19 REQ-013.19 a confirmed Add from the Show empty list view ends the view', async ({
  page,
  request,
}) => {
  const first = await createItem(request, uniqueName('Chisel'));
  const second = await createItem(request, uniqueName('Plane'));

  await openAndPick(page, ADA.id);
  await expect(rowNamed(page, first.name)).toBeVisible();
  await expect(rowNamed(page, second.name)).toBeVisible();

  await page.getByTestId('demo-empty').click();
  await expect(emptyText(page)).toBeVisible();

  const added = uniqueName('Rasp');
  await typeAndEnter(page, added);

  // The list the person now sees holds the two items it held before the Add and
  // the new one as Available, and the empty text is gone.
  await expect(rowNamed(page, added)).toBeVisible();
  await expect(statusOf(page, added)).toHaveText(AVAILABLE);
  await expect(rowNamed(page, first.name)).toBeVisible();
  await expect(rowNamed(page, second.name)).toBeVisible();
  await expect(page.getByText(NO_EQUIPMENT_YET, { exact: true })).toHaveCount(0);
});
