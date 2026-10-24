// REQ-014: every control is operable by keyboard alone. The four B rows of S3.
// Frozen with the S3 tests; read-only to every builder.
//
// "Operable by keyboard alone" is a browser fact: it needs real focus order and real key
// handling, which jsdom does not give. Each row takes one control at a time, on its own
// freshly loaded page where the row says so, so that one activation cannot stand in for
// another.

import {
  ADA,
  MIA,
  REJECT_ERROR,
  SAM,
  available,
  installFakeApi,
  onLoan,
  outOfService,
  rowOf,
  showListAs,
} from './_fake-api.js';
import { S } from './_look.js';
import { expect, test } from './_pw.js';

const ITEMS = () => [
  available(1, 'Projector'),
  onLoan(2, 'Laptop', MIA),
  outOfService(3, 'Camera'),
];

/** Start the focus order at the beginning of the document. */
const startFromTheTop = (page) =>
  page.evaluate(() => {
    const active = globalThis.document.activeElement;
    if (active !== null && typeof active.blur === 'function') active.blur();
  });

/** The data-testid of whatever has the focus now, or a description of it. */
const focused = (page) =>
  page.evaluate(() => {
    const active = globalThis.document.activeElement;
    if (active === null) return null;
    return active.getAttribute('data-testid') ?? active.tagName.toLowerCase();
  });

/**
 * Press Tab until the control has the focus. Returns the testids the focus passed
 * through, so that a failure says what the keyboard could reach instead.
 */
async function tabTo(page, testid, limit = 40) {
  await startFromTheTop(page);
  const passed = [];
  for (let step = 0; step < limit; step += 1) {
    await page.keyboard.press('Tab');
    const now = await focused(page);
    passed.push(now);
    if (now === testid) return { reached: true, passed };
  }
  return { reached: false, passed };
}

/**
 * Every testid the focus passes through in `limit` presses of Tab. The walk is not cut
 * short at the first repeat: several controls share a data-testid across rows, so a repeat
 * is not the end of the order.
 */
async function tabOrder(page, limit = 40) {
  await startFromTheTop(page);
  const passed = [];
  for (let step = 0; step < limit; step += 1) {
    await page.keyboard.press('Tab');
    passed.push(await focused(page));
  }
  return passed;
}

test('T-014-P5 REQ-014.5 Tab reaches every icon button in every modal and Enter or Space works it', async ({
  page,
}) => {
  // Reachability, modal by modal.
  const modals = [
    ['modal-borrower', ['btn-close']],
    ['modal-confirm-delete', ['btn-cancel', 'btn-confirm']],
    ['modal-api-failure', ['btn-close', 'btn-retry']],
    ['modal-access-denied', ['btn-ok']],
  ];
  for (const [which, buttons] of modals) {
    const server = await installFakeApi(page, ITEMS());
    await showListAs(page, ADA, 3);
    if (which === 'modal-borrower') {
      await rowOf(page, 1).getByTestId('btn-borrow').click();
    } else if (which === 'modal-confirm-delete') {
      await rowOf(page, 1).getByTestId('btn-delete').click();
    } else if (which === 'modal-api-failure') {
      server.answer('return', REJECT_ERROR);
      await rowOf(page, 2).getByTestId('btn-return').click();
    } else {
      await page.getByTestId('demo-access-denied').click();
    }
    // Found first: the modal and its buttons.
    await expect(page.getByTestId(which)).toBeVisible();
    for (const button of buttons) {
      await expect(page.getByTestId(which).getByTestId(button)).toBeVisible();
    }

    const order = await tabOrder(page);
    for (const button of buttons) {
      expect(order, `${which}: Tab reaches ${button}; it passed ${order.join(', ')}`).toContain(
        button,
      );
    }
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  }

  // The normal effect of each, one control to a page, half by Enter and half by Space.
  const closes = [
    ['modal-borrower', 'btn-close', 'Enter'],
    ['modal-confirm-delete', 'btn-cancel', ' '],
    ['modal-api-failure', 'btn-close', 'Enter'],
    ['modal-access-denied', 'btn-ok', ' '],
  ];
  for (const [which, button, key] of closes) {
    const server = await installFakeApi(page, ITEMS());
    await showListAs(page, ADA, 3);
    if (which === 'modal-borrower') {
      await rowOf(page, 1).getByTestId('btn-borrow').click();
    } else if (which === 'modal-confirm-delete') {
      await rowOf(page, 1).getByTestId('btn-delete').click();
    } else if (which === 'modal-api-failure') {
      server.answer('return', REJECT_ERROR);
      await rowOf(page, 2).getByTestId('btn-return').click();
    } else {
      await page.getByTestId('demo-access-denied').click();
    }
    await expect(page.getByTestId(which)).toBeVisible();

    const walk = await tabTo(page, button);
    expect(walk.reached, `${which}: ${button} reached by Tab`).toBe(true);
    await page.keyboard.press(key === ' ' ? 'Space' : key);

    await expect(page.getByTestId(which), `${which} closed by ${button}`).toHaveCount(0);
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  }

  // Retry repeats the request.
  {
    const server = await installFakeApi(page, ITEMS());
    await showListAs(page, ADA, 3);
    server.answer('return', REJECT_ERROR);
    await rowOf(page, 2).getByTestId('btn-return').click();
    await expect(page.getByTestId('modal-api-failure')).toBeVisible();
    server.answer('return', 'confirm');

    const walk = await tabTo(page, 'btn-retry');
    expect(walk.reached, 'btn-retry reached by Tab').toBe(true);
    await page.keyboard.press('Enter');

    await expect(rowOf(page, 2).getByTestId('row-status')).toHaveText(S.available);
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  }

  // Confirm deletes the item.
  {
    await installFakeApi(page, ITEMS());
    await showListAs(page, ADA, 3);
    await rowOf(page, 1).getByTestId('btn-delete').click();
    await expect(page.getByTestId('modal-confirm-delete')).toBeVisible();

    const walk = await tabTo(page, 'btn-confirm');
    expect(walk.reached, 'btn-confirm reached by Tab').toBe(true);
    await page.keyboard.press('Space');

    await expect(rowOf(page, 1)).toHaveCount(0);
  }
});

test('T-014-P6 REQ-014.6 Tab reaches every row control and the Add icon, and Enter or Space works it', async ({
  page,
}) => {
  const controls = [
    ['btn-borrow', 1, 'Enter', 'borrow'],
    ['btn-return', 2, 'Space', 'return'],
    ['btn-out-of-service', 1, 'Enter', 'out-of-service'],
    ['btn-restore', 3, 'Space', 'restore'],
    ['btn-delete', 1, 'Enter', 'delete'],
    ['btn-add', null, 'Space', 'add'],
  ];

  for (const [control, itemId, key, action] of controls) {
    // Each control on its own freshly loaded page, with the real list showing and no
    // state demo activated.
    const server = await installFakeApi(page, ITEMS());
    await showListAs(page, ADA, 3);
    await expect(page.getByTestId('equipment-list')).toBeVisible();
    server.hold(action);

    if (control === 'btn-add') {
      await page.getByTestId('add-input').fill('Lectern');
    }
    const walk = await tabTo(page, control);
    expect(walk.reached, `${control} reached by Tab; passed ${walk.passed.join(', ')}`).toBe(true);
    await page.keyboard.press(key);

    if (control === 'btn-borrow') {
      await expect(page.getByTestId('modal-borrower'), control).toBeVisible();
    } else if (control === 'btn-delete') {
      await expect(page.getByTestId('modal-confirm-delete'), control).toBeVisible();
    } else if (control === 'btn-add') {
      await expect(page.getByTestId('add-loader'), control).toBeVisible();
    } else {
      await expect(rowOf(page, itemId).getByTestId('row-loader'), control).toBeVisible();
    }
    server.release();
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  }
});

test('T-014-P8 REQ-014.7 Tab reaches each member button and Enter or Space starts that member’s borrow', async ({
  page,
}) => {
  for (const [member, key] of [
    [MIA, 'Enter'],
    [SAM, 'Space'],
  ]) {
    const server = await installFakeApi(page, ITEMS());
    await showListAs(page, ADA, 3);
    await rowOf(page, 1).getByTestId('btn-borrow').click();
    // Found first: the member buttons.
    await expect(page.getByTestId('member-button-2')).toBeVisible();
    await expect(page.getByTestId('member-button-3')).toBeVisible();

    server.hold('borrow');
    const walk = await tabTo(page, `member-button-${member.id}`);
    expect(walk.reached, `member-button-${member.id} reached by Tab`).toBe(true);
    await page.keyboard.press(key);

    await expect(rowOf(page, 1).getByTestId('row-loader'), member.name).toBeVisible();
    server.release();
    await expect(rowOf(page, 1).getByTestId('row-status')).toHaveText(S.onLoan(member.name));
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  }
});

test('T-014-P12 REQ-014.6 Tab reaches each state-demo control and Enter or Space works it', async ({
  page,
}) => {
  const demos = [
    ['demo-loading', 'Enter', 'list-indicator'],
    ['demo-empty', 'Space', 'empty-state'],
    ['demo-api-failure', 'Enter', 'modal-api-failure'],
    ['demo-access-denied', 'Space', 'modal-access-denied'],
  ];
  for (const [control, key, shows] of demos) {
    // Each on its own freshly loaded page, with the real list showing and nothing else
    // activated. Neither the Add field nor the Add icon is used on any of these pages.
    await installFakeApi(page, ITEMS());
    await showListAs(page, ADA, 3);
    await expect(page.getByTestId('equipment-list')).toBeVisible();

    const walk = await tabTo(page, control);
    expect(walk.reached, `${control} reached by Tab; passed ${walk.passed.join(', ')}`).toBe(true);
    await page.keyboard.press(key);

    await expect(page.getByTestId(shows), control).toBeVisible();
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  }
});
