// REQ-017: the control inventory, in the production build. The one B row of S3.
// Frozen with the S3 tests; read-only to every builder.

import {
  ADA,
  MIA,
  REFUSE,
  REJECT_ERROR,
  available,
  installFakeApi,
  onLoan,
  outOfService,
  rowOf,
  showListAs,
} from './_fake-api.js';
import { ALLOWED_CONTROL_TESTIDS, controlTestIds } from './_look.js';
import { expect, test } from './_pw.js';

/**
 * Items in every status, several named after a feature the PRD rules out. A row named
 * "Settings" is data: it must never become a control.
 */
const ITEMS = () => [
  available(1, 'Settings'),
  onLoan(2, 'Search', MIA),
  outOfService(3, 'Edit'),
  available(4, 'Details'),
  available(5, 'Reserve'),
  outOfService(6, 'Borrowed'),
];

/** Controls a member may not have at all (blueprint 12.8.3 read with REQ-017.18). */
const FORBIDDEN_FOR_A_MEMBER = [
  'add-input',
  'btn-add',
  'btn-out-of-service',
  'btn-restore',
  'btn-delete',
  'member-button-2',
  'member-button-3',
];

test('T-017-P2 REQ-017.1 REQ-017.2 REQ-017.8 REQ-017.9 REQ-017.10 REQ-017.11 REQ-017.12 REQ-017.14 REQ-017.15 REQ-017.16 REQ-017.18 the production build holds no control the PRD does not name', async ({
  page,
}) => {
  for (const actingUser of [ADA, MIA]) {
    const isAdmin = actingUser.role === 'admin';

    const inventory = async (where) => {
      const found = await controlTestIds(page);
      for (const testid of found) {
        expect(ALLOWED_CONTROL_TESTIDS, `${actingUser.name}, ${where}: ${testid}`).toContain(
          testid,
        );
        if (!isAdmin) {
          expect(FORBIDDEN_FOR_A_MEMBER, `${actingUser.name}, ${where}: ${testid}`).not.toContain(
            testid,
          );
        }
      }
      // An item named after a feature is data: its name is never a control.
      const asControls = await page.locator(
        '[data-testid="row-name"] button, button [data-testid="row-name"],' +
          ' a [data-testid="row-name"], [role="button"] [data-testid="row-name"]',
      );
      expect(await asControls.count(), `${actingUser.name}, ${where}: a name as a control`).toBe(0);
    };

    // The list.
    const server = await installFakeApi(page, ITEMS());
    await showListAs(page, actingUser, 6);
    // Found first: the switcher, the rows and the controls this user is meant to have.
    await expect(page.getByTestId('switcher')).toBeVisible();
    await expect(page.getByTestId('row')).toHaveCount(6);
    await expect(rowOf(page, 1).getByTestId('btn-borrow')).toBeVisible();
    if (isAdmin) await expect(page.getByTestId('add-input')).toBeVisible();
    await inventory('the list');

    // The empty state.
    await page.getByTestId('demo-empty').click();
    await expect(page.getByTestId('empty-state')).toBeVisible();
    await inventory('the empty state');
    // Left by Show loading, as REQ-013.16 says.
    await page.getByTestId('demo-loading').click();
    await expect(page.getByTestId('row').first()).toBeVisible();

    if (isAdmin) {
      await rowOf(page, 1).getByTestId('btn-borrow').click();
      await expect(page.getByTestId('modal-borrower')).toBeVisible();
      await expect(page.getByTestId('member-button-2')).toBeVisible();
      await inventory('the borrower modal');
      await page.getByTestId('modal-borrower').getByTestId('btn-close').click();

      await rowOf(page, 1).getByTestId('btn-delete').click();
      await expect(page.getByTestId('modal-confirm-delete')).toBeVisible();
      await inventory('the confirm-delete modal');
      await page.getByTestId('btn-cancel').click();
    }

    // The API failure modal, from a failed action rather than the demo.
    server.answer('borrow', REJECT_ERROR);
    if (isAdmin) {
      await rowOf(page, 4).getByTestId('btn-borrow').click();
      await page.getByTestId('member-button-2').click();
    } else {
      await rowOf(page, 4).getByTestId('btn-borrow').click();
    }
    await expect(page.getByTestId('modal-api-failure')).toBeVisible();
    await inventory('the API failure modal');
    await page.getByTestId('modal-api-failure').getByTestId('btn-close').click();

    // The Access denied modal, from a refused action.
    server.answer('borrow', REFUSE);
    if (isAdmin) {
      await rowOf(page, 5).getByTestId('btn-borrow').click();
      await page.getByTestId('member-button-2').click();
    } else {
      await rowOf(page, 5).getByTestId('btn-borrow').click();
    }
    await expect(page.getByTestId('modal-access-denied')).toBeVisible();
    await inventory('the Access denied modal');
    await page.getByTestId('btn-ok').click();

    await page.unrouteAll({ behavior: 'ignoreErrors' });
  }
});
