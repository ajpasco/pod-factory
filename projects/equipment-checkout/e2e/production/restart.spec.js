/**
 * The production rows: first start, a restart that keeps what was committed, and
 * a second restart that does not seed the users again.
 *
 * Frozen at the S4 freeze. Read-only to every builder, S4's own included.
 *
 * Rows: T-016-P3, T-016-P4, T-016-N3 (kind `production`, eval plan 1.1).
 *
 * **Why this file is in its own Playwright project.** Every row here stops the
 * stack with `docker compose down` and starts it again, from the repository root
 * and with the same `--env-file` as command C10 (eval plan 7.2, C11). A test
 * that does that in the middle of the suite destroys every row after it, so the
 * configuration makes the `production` project depend on the `journey` one and
 * the runner guarantees the order. See the comment on `projects` in
 * `playwright.config.js` for why that, and not the file's name, is what holds.
 *
 * The three rows run in the order they are declared, which Playwright keeps
 * within a file. T-016-N3's Given is "the changes of T-016-P4", so it reads the
 * names T-016-P4 made from `madeByTheRestartRow` below. They are deliberately
 * not re-created: a second row that made its own changes would no longer be
 * asking whether the first restart kept them.
 */

import { test, expect } from '@playwright/test';
import { createItem, itemNamed, readList, readUsers } from '../support/api.js';
import {
  addCard,
  confirmDeleteModal,
  borrowerModal,
  expectListSettled,
  iconIn,
  openAndPick,
  openApp,
  pickUser,
  rowNamed,
  statusOf,
  switcherEntries,
  typeAndEnter,
} from '../support/app.js';
import { compose, waitForTheStack } from '../support/stack.js';
import { uniqueName } from '../support/names.js';
import {
  ADA,
  AVAILABLE,
  MIA,
  OUT_OF_SERVICE,
  SEEDED_USERS,
  onLoanTo,
  switcherEntry,
} from '../support/strings.js';

/** What T-016-P4 did, for T-016-N3 to look for again. */
const madeByTheRestartRow = { added: null, deleted: null, marked: null, lent: null };

/**
 * The three seeded users, each once and no other: what REQ-016.1 and REQ-016.3
 * ask of the real user list. The expectation is written here as literals and is
 * never read from the application, so a server that seeded nobody, seeded a
 * fourth user or seeded one twice cannot define its own pass mark.
 */
async function expectExactlyTheThreeSeededUsers(page, request) {
  // The switcher's entries are read first, as both rows say.
  const entries = await switcherEntries(page);

  // The switcher is a constant of the client (blueprint DD-07), so the row reads
  // the real list through the stack's own address as well: that is the only part
  // of this a failed or repeated seed can show up in.
  const users = await readUsers(request, ADA.id);
  expect(users).toEqual(
    SEEDED_USERS.map((user) =>
      expect.objectContaining({ id: user.id, name: user.name, role: user.role }),
    ),
  );
  expect(users).toHaveLength(SEEDED_USERS.length);

  expect(entries).toEqual(users.map((user) => switcherEntry(user)));
}

test('T-016-P3 REQ-016.1 a first start seeds one admin and two members, each once', async ({
  page,
  request,
}) => {
  test.setTimeout(600_000);

  // No database volume from an earlier run: the row is about a first start.
  await compose('down', '-v');
  await compose('up', '-d', '--build', '--wait', '--wait-timeout', '300');
  await waitForTheStack(request);

  await openApp(page);
  await expectExactlyTheThreeSeededUsers(page, request);
});

test('T-016-P4 REQ-016.2 every committed change survives a restart', async ({ page, request }) => {
  test.setTimeout(600_000);

  const toDelete = await createItem(request, uniqueName('Barrow'));
  const toMark = await createItem(request, uniqueName('Sieve'));
  const toLend = await createItem(request, uniqueName('Trowel'));

  await openAndPick(page, ADA.id);
  await expect(addCard(page)).toBeVisible();

  const added = uniqueName('Dibber');
  await typeAndEnter(page, added);
  await expect(statusOf(page, added)).toHaveText(AVAILABLE);

  await iconIn(rowNamed(page, toDelete.name), 'btn-delete').click();
  await expect(confirmDeleteModal(page)).toBeVisible();
  await confirmDeleteModal(page).getByTestId('btn-confirm').click();
  await expect(rowNamed(page, toDelete.name)).toHaveCount(0);

  await iconIn(rowNamed(page, toMark.name), 'btn-out-of-service').click();
  await expect(statusOf(page, toMark.name)).toHaveText(OUT_OF_SERVICE);

  await iconIn(rowNamed(page, toLend.name), 'btn-borrow').click();
  await expect(borrowerModal(page)).toBeVisible();
  await page.getByTestId(`member-button-${MIA.id}`).click();
  await expect(statusOf(page, toLend.name)).toHaveText(onLoanTo(MIA.name));

  madeByTheRestartRow.added = added;
  madeByTheRestartRow.deleted = toDelete.name;
  madeByTheRestartRow.marked = toMark.name;
  madeByTheRestartRow.lent = toLend.name;

  // Stopped without -v, so the named volume the data directory lives on is kept.
  await compose('down');
  await compose('up', '-d');
  await waitForTheStack(request);

  await openApp(page);
  await pickUser(page, ADA.id);
  await expectListSettled(page);
  await expectTheChangesAreStillThere(page, request);
});

test('T-016-N3 REQ-016.3 a second restart does not seed the users again', async ({
  page,
  request,
}) => {
  test.setTimeout(600_000);

  if (madeByTheRestartRow.added === null) {
    throw new Error(
      'T-016-N3 begins from the changes T-016-P4 made, and T-016-P4 did not make them. ' +
        'The row cannot be judged and is not passed by default.',
    );
  }

  await compose('down');
  await compose('up', '-d');
  await waitForTheStack(request);

  await openApp(page);
  await expectExactlyTheThreeSeededUsers(page, request);

  await pickUser(page, ADA.id);
  await expectListSettled(page);
  await expectTheChangesAreStillThere(page, request);
});

/**
 * The four changes of T-016-P4, as a person sees them and as the application
 * holds them. The three that are present are asserted first, so "B is absent"
 * is never claimed of a page or a store that holds nothing at all.
 */
async function expectTheChangesAreStillThere(page, request) {
  const { added, deleted, marked, lent } = madeByTheRestartRow;

  await expect(rowNamed(page, added)).toBeVisible();
  await expect(statusOf(page, added)).toHaveText(AVAILABLE);
  await expect(statusOf(page, marked)).toHaveText(OUT_OF_SERVICE);
  await expect(statusOf(page, lent)).toHaveText(onLoanTo(MIA.name));
  await expect(rowNamed(page, deleted)).toHaveCount(0);

  const kept = await readList(request);
  expect(itemNamed(kept, added)?.status).toBe('available');
  expect(itemNamed(kept, marked)?.status).toBe('out_of_service');
  expect(itemNamed(kept, lent)?.borrowerId).toBe(MIA.id);
  expect(itemNamed(kept, deleted)).toBeUndefined();
}
