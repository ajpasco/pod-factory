/**
 * REQ-007: the five forced attempts by a member, each refused with the Access
 * denied modal, on the running stack.
 *
 * Frozen at the S4 freeze. Read-only to every builder, S4's own included.
 *
 * Row: T-007-P4.
 */

import { test, expect } from '@playwright/test';
import { createItem, itemNamed, lendTo, readList, takeOutOfService } from '../support/api.js';
import {
  accessDeniedModal,
  addCard,
  apiFailureModal,
  confirmDeleteModal,
  iconIn,
  openAndPick,
  rowNamed,
  statusOf,
  typeAndEnter,
} from '../support/app.js';
import {
  rewriteIdentity,
  theActionRequest,
  theAddRequest,
  theDeleteRequest,
} from '../support/intercept.js';
import { uniqueName } from '../support/names.js';
import {
  ACCESS_DENIED_BODY,
  ADA,
  AVAILABLE,
  MIA,
  OUT_OF_SERVICE,
  SAM,
  onLoanTo,
} from '../support/strings.js';

test('T-007-P4 REQ-007.1 REQ-007.2 REQ-007.3 REQ-007.4 REQ-007.5 REQ-007.6 five actions forced as a member are each refused', async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);

  const onLoan = await createItem(request, uniqueName('Trailer'));
  await lendTo(request, onLoan.id, SAM.id);
  const available = await createItem(request, uniqueName('Jack'));
  const outOfService = await createItem(request, uniqueName('Grinder'));
  await takeOutOfService(request, outOfService.id);

  const refusedName = uniqueName('Hoist');

  await openAndPick(page, ADA.id);

  // The anchor: every control the five actions use is offered to Ada, who may
  // use it, and the three items are in the states the row starts from. Without
  // this a build that renders no icons at all could satisfy the refusals.
  await expect(statusOf(page, onLoan.name)).toHaveText(onLoanTo(SAM.name));
  await expect(statusOf(page, available.name)).toHaveText(AVAILABLE);
  await expect(statusOf(page, outOfService.name)).toHaveText(OUT_OF_SERVICE);
  await expect(iconIn(rowNamed(page, onLoan.name), 'btn-return')).toBeVisible();
  await expect(iconIn(rowNamed(page, available.name), 'btn-delete')).toBeVisible();
  await expect(iconIn(rowNamed(page, available.name), 'btn-out-of-service')).toBeVisible();
  await expect(iconIn(rowNamed(page, outOfService.name), 'btn-restore')).toBeVisible();
  await expect(addCard(page)).toBeVisible();

  /**
   * Each action is Ada's own, legitimate action; only the identity the request
   * carries out of the browser is rewritten to Mia's, so the page's own handler
   * receives the real server's answer to a member's forced attempt (eval plan
   * 1.3, "Forced attempt").
   */
  const asMia = String(MIA.id);

  const forced = [
    {
      what: "a return of another member's loan",
      matches: theActionRequest(onLoan.id, 'return'),
      act: async () => {
        await iconIn(rowNamed(page, onLoan.name), 'btn-return').click();
      },
    },
    {
      what: 'a delete',
      matches: theDeleteRequest(available.id),
      act: async () => {
        await iconIn(rowNamed(page, available.name), 'btn-delete').click();
        await expect(confirmDeleteModal(page)).toBeVisible();
        await confirmDeleteModal(page).getByTestId('btn-confirm').click();
      },
    },
    {
      what: 'an add',
      matches: theAddRequest,
      act: async () => {
        await typeAndEnter(page, refusedName);
      },
    },
    {
      what: 'a mark out of service',
      matches: theActionRequest(available.id, 'out-of-service'),
      act: async () => {
        await iconIn(rowNamed(page, available.name), 'btn-out-of-service').click();
      },
    },
    {
      what: 'a restore',
      matches: theActionRequest(outOfService.id, 'restore'),
      act: async () => {
        await iconIn(rowNamed(page, outOfService.name), 'btn-restore').click();
      },
    },
  ];

  for (const action of forced) {
    const undo = await rewriteIdentity(page, action.matches, asMia);
    await action.act();

    await expect(accessDeniedModal(page), action.what).toBeVisible();
    await expect(accessDeniedModal(page).getByTestId('modal-body')).toContainText(
      ACCESS_DENIED_BODY,
    );
    await expect(apiFailureModal(page)).toHaveCount(0);
    await accessDeniedModal(page).getByTestId('btn-ok').click();
    await expect(accessDeniedModal(page)).toHaveCount(0);
    await undo();
  }

  // A fresh look as Ada: the loan, the items and their statuses unchanged, and
  // no item created.
  await openAndPick(page, ADA.id);
  await expect(statusOf(page, onLoan.name)).toHaveText(onLoanTo(SAM.name));
  await expect(statusOf(page, available.name)).toHaveText(AVAILABLE);
  await expect(statusOf(page, outOfService.name)).toHaveText(OUT_OF_SERVICE);
  await expect(rowNamed(page, refusedName)).toHaveCount(0);

  const kept = await readList(request);
  expect(itemNamed(kept, onLoan.name)?.borrowerId).toBe(SAM.id);
  expect(itemNamed(kept, available.name)?.status).toBe('available');
  expect(itemNamed(kept, outOfService.name)?.status).toBe('out_of_service');
  expect(itemNamed(kept, refusedName)).toBeUndefined();
});
