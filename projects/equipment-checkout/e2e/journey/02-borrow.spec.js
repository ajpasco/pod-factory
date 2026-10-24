/**
 * REQ-003 to REQ-005, borrowing, on the running stack.
 *
 * Frozen at the S4 freeze. Read-only to every builder, S4's own included.
 *
 * Rows: T-003-P5, T-003-N5, T-004-P7, T-004-N9, T-005-N5, T-005-N7.
 *
 * The four negative rows all make a forced attempt the same way (eval plan 1.3)
 * and differ only in what is rewritten and which modal a person is then shown.
 * That difference is the thing verified: an unusable identity or a member acting
 * beyond their role is a refusal and shows the Access denied modal; a borrower
 * the request may not name is a rejection and shows the API failure modal
 * (eval plan 1.1).
 */

import { test, expect } from '@playwright/test';
import { createItem, itemNamed, readList } from '../support/api.js';
import {
  accessDeniedModal,
  apiFailureModal,
  borrowerModal,
  iconIn,
  openAndPick,
  rowNamed,
  rows,
  statusOf,
  textsOutsideTheTopBar,
} from '../support/app.js';
import { rewriteRequest, theActionRequest } from '../support/intercept.js';
import { uniqueName } from '../support/names.js';
import { ACCESS_DENIED_BODY, ADA, AVAILABLE, MIA, SAM, onLoanTo } from '../support/strings.js';

test('T-003-P5 REQ-003.4 a member borrows for herself and the row names her', async ({
  page,
  request,
}) => {
  const item = await createItem(request, uniqueName('Rope'));

  await openAndPick(page, MIA.id);
  const row = rowNamed(page, item.name);
  await expect(iconIn(row, 'btn-borrow')).toBeVisible();
  await iconIn(row, 'btn-borrow').click();

  await expect(statusOf(page, item.name)).toHaveText(onLoanTo(MIA.name));
});

test("T-003-N5 REQ-003.6 a member's forced borrow for someone else is refused", async ({
  page,
  request,
}) => {
  const item = await createItem(request, uniqueName('Mallet'));
  await openAndPick(page, ADA.id);

  /**
   * Both variants are a member's request, which is what REQ-003.6 is about.
   * Eval plan section 2, item 6: the blueprint does not say whose identity
   * accompanies the rewritten body, and the plan takes the reading that keeps
   * both a member's request, so the identity is Sam in both. An admin naming Ada
   * is REQ-005.4 and is T-005-N7, below.
   */
  const variants = [
    { what: 'made as Sam', rewrite: { identity: String(SAM.id) } },
    {
      what: 'made as Sam and naming Ada as the borrower',
      rewrite: { identity: String(SAM.id), body: { borrowerId: ADA.id } },
    },
  ];

  for (const variant of variants) {
    const row = rowNamed(page, item.name);
    await expect(iconIn(row, 'btn-borrow')).toBeVisible();
    await iconIn(row, 'btn-borrow').click();
    await expect(borrowerModal(page)).toBeVisible();

    const undo = await rewriteRequest(page, theActionRequest(item.id, 'borrow'), variant.rewrite);
    await page.getByTestId(`member-button-${MIA.id}`).click();

    await expect(accessDeniedModal(page), variant.what).toBeVisible();
    await expect(accessDeniedModal(page).getByTestId('modal-body')).toContainText(
      ACCESS_DENIED_BODY,
    );
    await expect(apiFailureModal(page)).toHaveCount(0);
    await accessDeniedModal(page).getByTestId('btn-ok').click();
    await undo();

    // A fresh look as Ada: still Available, and nobody holds it.
    await openAndPick(page, ADA.id);
    await expect(rowNamed(page, item.name)).toBeVisible();
    await expect(statusOf(page, item.name)).toHaveText(AVAILABLE);
    const kept = itemNamed(await readList(request), item.name);
    expect(kept?.status).toBe('available');
    expect(kept?.borrowerId).toBeNull();
  }
});

test('T-004-P7 REQ-004.6 REQ-004.9 an admin lends for a member and nothing says who did it', async ({
  page,
  request,
}) => {
  const item = await createItem(request, uniqueName('Tent'));

  await openAndPick(page, ADA.id);
  const row = rowNamed(page, item.name);
  await expect(iconIn(row, 'btn-borrow')).toBeVisible();
  await iconIn(row, 'btn-borrow').click();
  await expect(borrowerModal(page)).toBeVisible();
  await page.getByTestId(`member-button-${MIA.id}`).click();

  await expect(statusOf(page, item.name)).toHaveText(onLoanTo(MIA.name));

  // The loan is the positive anchor; only then is the absence claimed.
  for (const text of await textsOutsideTheTopBar(page)) {
    expect(text).not.toContain('Ada');
    expect(text).not.toContain('Admin');
  }
});

test("T-004-N9 REQ-004.11 REQ-004.12 an admin's borrow naming nobody or a non-member is rejected", async ({
  page,
  request,
}) => {
  const item = await createItem(request, uniqueName('Stove'));
  await openAndPick(page, ADA.id);

  const variants = [
    { what: 'naming nobody', body: {} },
    { what: 'naming a user who is not a seeded member', body: { borrowerId: 4 } },
  ];

  for (const variant of variants) {
    const row = rowNamed(page, item.name);
    await expect(iconIn(row, 'btn-borrow')).toBeVisible();
    await iconIn(row, 'btn-borrow').click();
    await expect(borrowerModal(page)).toBeVisible();

    const undo = await rewriteRequest(page, theActionRequest(item.id, 'borrow'), {
      body: variant.body,
    });
    await page.getByTestId(`member-button-${MIA.id}`).click();

    // A rejection, not a refusal: the API failure modal and not Access denied.
    await expect(apiFailureModal(page), variant.what).toBeVisible();
    await expect(accessDeniedModal(page)).toHaveCount(0);
    await apiFailureModal(page).getByTestId('btn-close').click();
    await undo();

    await openAndPick(page, ADA.id);
    await expect(rowNamed(page, item.name)).toBeVisible();
    await expect(statusOf(page, item.name)).toHaveText(AVAILABLE);
    const kept = itemNamed(await readList(request), item.name);
    expect(kept?.status).toBe('available');
    expect(kept?.borrowerId).toBeNull();
  }
});

test("T-005-N5 REQ-005.2 no sequence of an admin's actions ever puts a loan in her own name", async ({
  page,
  request,
}) => {
  const lent = await createItem(request, uniqueName('Lantern'));
  await createItem(request, uniqueName('Compass'));

  await openAndPick(page, ADA.id);

  /** The rows are found first, then the absence is claimed of them. */
  const noLoanToTheAdmin = async () => {
    await expect(rows(page).first()).toBeVisible();
    await expect(rows(page).filter({ hasText: onLoanTo(ADA.name) })).toHaveCount(0);
  };

  await noLoanToTheAdmin();

  for (const member of [MIA, SAM]) {
    const row = rowNamed(page, lent.name);
    await expect(iconIn(row, 'btn-borrow')).toBeVisible();
    await iconIn(row, 'btn-borrow').click();

    // The modal first listed the member buttons for Mia and Sam, which is the
    // row's own Given. That no third member button exists is REQ-005.1's claim
    // and belongs to the rows that bracket it (T-004-P8, T-004-P9, story S3), so
    // it is deliberately not asserted here: this row's criterion is REQ-005.2.
    await expect(borrowerModal(page)).toBeVisible();
    await expect(borrowerModal(page).getByTestId(`member-button-${MIA.id}`)).toBeVisible();
    await expect(borrowerModal(page).getByTestId(`member-button-${SAM.id}`)).toBeVisible();

    await borrowerModal(page).getByTestId(`member-button-${member.id}`).click();
    await expect(statusOf(page, lent.name)).toHaveText(onLoanTo(member.name));
    await noLoanToTheAdmin();

    await iconIn(rowNamed(page, lent.name), 'btn-return').click();
    await expect(statusOf(page, lent.name)).toHaveText(AVAILABLE);
    await noLoanToTheAdmin();
  }
});

test("T-005-N7 REQ-005.4 an admin's borrow naming an admin is rejected", async ({
  page,
  request,
}) => {
  const item = await createItem(request, uniqueName('Shovel'));
  await openAndPick(page, ADA.id);

  const row = rowNamed(page, item.name);
  await expect(iconIn(row, 'btn-borrow')).toBeVisible();
  await iconIn(row, 'btn-borrow').click();
  await expect(borrowerModal(page)).toBeVisible();

  // Ada's own request, with the body rewritten to name Ada. The identity is not
  // touched: this is an admin naming an admin, which is a rejection, where a
  // member naming the admin would be a refusal (T-003-N5).
  await rewriteRequest(page, theActionRequest(item.id, 'borrow'), { body: { borrowerId: ADA.id } });
  await page.getByTestId(`member-button-${MIA.id}`).click();

  await expect(apiFailureModal(page)).toBeVisible();
  await expect(accessDeniedModal(page)).toHaveCount(0);
  await apiFailureModal(page).getByTestId('btn-close').click();

  await openAndPick(page, ADA.id);
  await expect(rowNamed(page, item.name)).toBeVisible();
  await expect(statusOf(page, item.name)).toHaveText(AVAILABLE);
  const kept = itemNamed(await readList(request), item.name);
  expect(kept?.status).toBe('available');
  expect(kept?.borrowerId).toBeNull();
});
