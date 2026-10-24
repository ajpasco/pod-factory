/**
 * The two restraint rows of the browser surfaces (eval plan section 6): browser
 * storage, and where the page's requests go.
 *
 * Frozen at the S4 freeze. Read-only to every builder, S4's own included.
 *
 * Rows: T-017-N3, T-017-N4.
 *
 * Both assert structure and not wording, and both carry their positive anchor:
 * a page that rendered nothing stores nothing and calls nobody, so the rows
 * first show the interface working and every described action made.
 */

import { test, expect } from '@playwright/test';
import { createItem, lendTo, takeOutOfService } from '../support/api.js';
import {
  accessDeniedModal,
  addCard,
  addField,
  apiFailureModal,
  borrowerModal,
  confirmDeleteModal,
  emptyText,
  expectListSettled,
  iconIn,
  listOnScreen,
  openAndPick,
  openApp,
  pickUser,
  rowNamed,
  rows,
  statusOf,
  typeAndEnter,
  waitOutTheLoadingDemo,
} from '../support/app.js';
import { BASE_URL } from '../support/base-url.js';
import { uniqueName } from '../support/names.js';
import { ADA, AVAILABLE, MIA, OUT_OF_SERVICE, onLoanTo } from '../support/strings.js';

/**
 * Every action the PRD describes, made through the interface as the PRD's own
 * journey makes them. Returns nothing: the rows that call it assert afterwards.
 */
async function everyDescribedAction(page, request) {
  const toBorrow = await createItem(request, uniqueName('Sander'));
  const toMark = await createItem(request, uniqueName('Router'));
  const toRestore = await createItem(request, uniqueName('Clamp'));
  await takeOutOfService(request, toRestore.id);
  const toDelete = await createItem(request, uniqueName('Scraper'));
  const toKeep = await createItem(request, uniqueName('Gouge'));

  // Switching users: a member acts, then the admin.
  await openAndPick(page, MIA.id);
  await iconIn(rowNamed(page, toBorrow.name), 'btn-borrow').click();
  await expect(statusOf(page, toBorrow.name)).toHaveText(onLoanTo(MIA.name));

  await pickUser(page, ADA.id);
  await expectListSettled(page);

  // Return.
  await iconIn(rowNamed(page, toBorrow.name), 'btn-return').click();
  await expect(statusOf(page, toBorrow.name)).toHaveText(AVAILABLE);

  // Add.
  await expect(addCard(page)).toBeVisible();
  const added = uniqueName('Brace');
  await typeAndEnter(page, added);
  await expect(statusOf(page, added)).toHaveText(AVAILABLE);

  // Mark out of service, then restore the other one.
  await iconIn(rowNamed(page, toMark.name), 'btn-out-of-service').click();
  await expect(statusOf(page, toMark.name)).toHaveText(OUT_OF_SERVICE);
  await iconIn(rowNamed(page, toRestore.name), 'btn-restore').click();
  await expect(statusOf(page, toRestore.name)).toHaveText(AVAILABLE);

  // A delete cancelled, then a delete confirmed.
  await iconIn(rowNamed(page, toKeep.name), 'btn-delete').click();
  await expect(confirmDeleteModal(page)).toBeVisible();
  await confirmDeleteModal(page).getByTestId('btn-cancel').click();
  await expect(rowNamed(page, toKeep.name)).toBeVisible();

  await iconIn(rowNamed(page, toDelete.name), 'btn-delete').click();
  await expect(confirmDeleteModal(page)).toBeVisible();
  await confirmDeleteModal(page).getByTestId('btn-confirm').click();
  await expect(rowNamed(page, toDelete.name)).toHaveCount(0);

  // An admin lends on behalf of a member, which is the remaining described
  // action, and one the API cannot be used for here because it is the modal's
  // own path.
  await iconIn(rowNamed(page, toKeep.name), 'btn-borrow').click();
  await expect(borrowerModal(page)).toBeVisible();
  await page.getByTestId(`member-button-${MIA.id}`).click();
  await expect(statusOf(page, toKeep.name)).toHaveText(onLoanTo(MIA.name));
}

test('T-017-N3 the browser keeps nothing after a session in which every action was made', async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);

  await everyDescribedAction(page, request);

  // The anchor: rows are shown. Only then is the absence claimed.
  await expect(rows(page).first()).toBeVisible();

  const kept = await page.evaluate(async () => {
    const scope = globalThis;
    const canListDatabases = typeof scope.indexedDB?.databases === 'function';
    const canListWorkers = typeof scope.navigator?.serviceWorker?.getRegistrations === 'function';
    return {
      canListDatabases,
      canListWorkers,
      localStorageKeys: scope.localStorage.length,
      sessionStorageKeys: scope.sessionStorage.length,
      databases: canListDatabases
        ? (await scope.indexedDB.databases()).map((one) => one.name ?? '')
        : [],
      serviceWorkers: canListWorkers
        ? (await scope.navigator.serviceWorker.getRegistrations()).length
        : 0,
    };
  });

  // Cookies are read from the browser context, not from `document.cookie`. That is
  // required, not a preference: a cookie marked HttpOnly — which is the kind a server
  // sets, and so the kind this row is most likely to catch — is invisible to
  // `document.cookie`, so reading it there would pass on a build that keeps one.
  const cookies = await page.context().cookies();

  // A browser that cannot report its databases or its service workers would
  // make the two assertions below vacuous, so the row fails instead of passing
  // on an unanswered question.
  expect(kept.canListDatabases).toBe(true);
  expect(kept.canListWorkers).toBe(true);

  expect(kept.localStorageKeys).toBe(0);
  expect(kept.sessionStorageKeys).toBe(0);
  expect(cookies).toEqual([]);
  expect(kept.databases).toEqual([]);
  expect(kept.serviceWorkers).toBe(0);
});

test('T-017-N4 REQ-017.13 every request goes to the stack and the idle steps change nothing', async ({
  page,
  request,
}) => {
  test.setTimeout(240_000);

  const item = await createItem(request, uniqueName('Awl'));
  const lent = await createItem(request, uniqueName('Bodkin'));
  await lendTo(request, lent.id, MIA.id);

  /**
   * Where every request went, including the document, the bundle and anything
   * the page asked for by itself.
   */
  const asked = [];
  page.on('request', (sent) => asked.push(sent.url()));

  await openApp(page);
  await pickUser(page, ADA.id);
  await expectListSettled(page);

  // The page's first load is first seen with its rows shown.
  await expect(rows(page).first()).toBeVisible();
  const before = await listOnScreen(page);

  // The steps that must change nothing.
  await pickUser(page, MIA.id);
  await expectListSettled(page);
  await pickUser(page, ADA.id);
  await expectListSettled(page);

  await iconIn(rowNamed(page, item.name), 'btn-borrow').click();
  await expect(borrowerModal(page)).toBeVisible();
  await borrowerModal(page).getByTestId('btn-close').click();
  await expect(borrowerModal(page)).toHaveCount(0);

  await iconIn(rowNamed(page, item.name), 'btn-delete').click();
  await expect(confirmDeleteModal(page)).toBeVisible();
  await confirmDeleteModal(page).getByTestId('btn-cancel').click();
  await expect(confirmDeleteModal(page)).toHaveCount(0);

  // A validation failure: a name that is only whitespace, which the client does
  // not send (blueprint 12.7); the row asserts the message is shown, not how.
  await addField(page).fill('   ');
  await addField(page).press('Enter');
  await expect(page.getByTestId('add-validation')).toBeVisible();
  await addField(page).fill('');

  await page.getByTestId('demo-loading').click();
  await waitOutTheLoadingDemo(page);
  await page.getByTestId('demo-api-failure').click();
  await expect(apiFailureModal(page)).toBeVisible();
  await apiFailureModal(page).getByTestId('btn-close').click();
  await page.getByTestId('demo-access-denied').click();
  await expect(accessDeniedModal(page)).toBeVisible();
  await accessDeniedModal(page).getByTestId('btn-ok').click();
  await page.getByTestId('demo-empty').click();
  await expect(emptyText(page)).toBeVisible();
  await page.getByTestId('demo-loading').click();
  await waitOutTheLoadingDemo(page);

  // A fresh look as Ada: the list exactly as it was before those steps.
  await openApp(page);
  await pickUser(page, ADA.id);
  await expectListSettled(page);
  expect(await listOnScreen(page)).toEqual(before);

  // And then every described action.
  await everyDescribedAction(page, request);

  /**
   * Every request goes to the stack's own address and to no other.
   *
   * A `data:`, `blob:` or `about:` URL is checked by scheme rather than by
   * origin, because it reaches no service at all: it is content the page already
   * holds. Any other scheme is read as an address and must be the stack's.
   */
  const inPage = ['data:', 'blob:', 'about:'];
  const elsewhere = asked.filter(
    (url) => !url.startsWith(`${BASE_URL}/`) && !inPage.some((scheme) => url.startsWith(scheme)),
  );
  expect(elsewhere, `requests that did not go to ${BASE_URL}`).toEqual([]);
});
