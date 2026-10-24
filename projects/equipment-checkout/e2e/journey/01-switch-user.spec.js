/**
 * REQ-001, switching the acting user, on the running stack.
 *
 * Frozen at the S4 freeze. Read-only to every builder, S4's own included.
 *
 * Rows: T-001-P5, T-001-N8 (eval plan section 3, owner story S4).
 */

import { test, expect } from '@playwright/test';
import { createItem, itemNamed, readList, readUsers } from '../support/api.js';
import {
  accessDeniedModal,
  apiFailureModal,
  expectListSettled,
  iconIn,
  listOnScreen,
  openApp,
  pickUser,
  rowNamed,
  statusOf,
  switcherEntries,
} from '../support/app.js';
import { rewriteIdentity, theActionRequest, theListRequest } from '../support/intercept.js';
import { uniqueName } from '../support/names.js';
import {
  ACCESS_DENIED_BODY,
  ADA,
  AVAILABLE,
  MIA,
  onLoanTo,
  switcherEntry,
} from '../support/strings.js';

test('T-001-P5 REQ-001.1 REQ-001.4 the switcher offers the seeded users and Mia borrows as herself', async ({
  page,
  request,
}) => {
  const item = await createItem(request, uniqueName('Tripod'));

  await openApp(page);

  // First the entries, as the row says: they equal the users the application
  // actually holds, each reading "<name> (<role>)". Read from the API rather
  // than written down here, so a client whose switcher is a constant that no
  // longer matches the seed (blueprint DD-07) is caught.
  const users = await readUsers(request, ADA.id);
  expect(await switcherEntries(page)).toEqual(users.map((user) => switcherEntry(user)));

  await pickUser(page, ADA.id);
  await expectListSettled(page);
  await pickUser(page, MIA.id);
  await expectListSettled(page);

  const row = rowNamed(page, item.name);
  await expect(iconIn(row, 'btn-borrow')).toBeVisible();
  await iconIn(row, 'btn-borrow').click();

  await expect(statusOf(page, item.name)).toHaveText(onLoanTo(MIA.name));
});

/**
 * The probes of REQ-001.6 to REQ-001.8 that the wire can carry.
 *
 * Blueprint 5.1.1 is the authority for which of them a browser, nginx and
 * uvicorn deliver unaltered. The padded values (a leading or trailing space, a
 * tab, a line break) and two identity headers are deliberately absent: a field
 * value excludes surrounding whitespace before it is evaluated and `fetch` joins
 * repeated headers, so the API would receive a valid `1` or the value `1,2`.
 * Those cases are claimed in-process by the S2 rows and are not claimed here.
 */
const PROBES = [
  { what: 'no acting identity', value: null },
  { what: 'an identity that is not a seeded user', value: '4' },
  ...['0', '01', '-1', '+2', '1.0', '1,2', 'abc', '1a', '1234567890', ''].map((value) => ({
    what: `the malformed identity ${JSON.stringify(value)}`,
    value,
  })),
];

test('T-001-N8 REQ-001.6 REQ-001.7 REQ-001.8 an unusable identity is refused on every request the page makes', async ({
  page,
  request,
}) => {
  // Twelve probes, each on two of the page's own requests, each followed by a
  // fresh look. The work is page loads, not waiting, so the budget is raised
  // rather than the row narrowed.
  test.setTimeout(600_000);

  const item = await createItem(request, uniqueName('Kettle'));

  await openApp(page);
  await pickUser(page, ADA.id);
  await expectListSettled(page);

  // The anchor for every "unchanged" below: the list is shown, the item is in
  // it, and it is Available. A build that renders nothing cannot reach here.
  await expect(rowNamed(page, item.name)).toBeVisible();
  await expect(statusOf(page, item.name)).toHaveText(AVAILABLE);
  const before = await listOnScreen(page);

  /** The fresh look as Ada of eval plan 1.3, asserting the anchor first. */
  const freshLook = async () => {
    await openApp(page);
    await pickUser(page, ADA.id);
    await expectListSettled(page);
    await expect(rowNamed(page, item.name)).toBeVisible();
    await expect(statusOf(page, item.name)).toHaveText(AVAILABLE);
    expect(await listOnScreen(page)).toEqual(before);
  };

  /**
   * The Access denied modal, and not the API failure modal.
   *
   * This is the difference a person sees between a refusal and a rejection
   * (eval plan 1.1), and it is the whole point of making these attempts through
   * the page. The modal is found first, so the absence of the other one is not
   * claimed on a page that shows no modal at all.
   */
  const expectAccessDenied = async () => {
    await expect(accessDeniedModal(page)).toBeVisible();
    await expect(accessDeniedModal(page).getByTestId('modal-body')).toContainText(
      ACCESS_DENIED_BODY,
    );
    await expect(apiFailureModal(page)).toHaveCount(0);
    await accessDeniedModal(page).getByTestId('btn-ok').click();
    await expect(accessDeniedModal(page)).toHaveCount(0);
  };

  for (const probe of PROBES) {
    // The list request the page makes at a pick.
    await openApp(page);
    const onTheList = await rewriteIdentity(page, theListRequest, probe.value);
    await pickUser(page, ADA.id);
    await expectAccessDenied();
    await onTheList();
    await freshLook();

    // A Mark out of service of that item.
    const onTheAction = await rewriteIdentity(
      page,
      theActionRequest(item.id, 'out-of-service'),
      probe.value,
    );
    const row = rowNamed(page, item.name);
    await expect(iconIn(row, 'btn-out-of-service')).toBeVisible();
    await iconIn(row, 'btn-out-of-service').click();
    await expectAccessDenied();
    await onTheAction();
    await freshLook();
  }

  // What the application kept, read as Ada: nothing any probe did survived.
  const kept = itemNamed(await readList(request), item.name);
  expect(kept?.status).toBe('available');
  expect(kept?.borrowerId).toBeNull();
});
