// REQ-015: the Apple-style look and the uniform rows. The twelve B rows of S3.
// Frozen with the S3 tests; read-only to every builder.
//
// Every row here measures what Chromium computed and laid out. The three qualities the PRD
// leaves to judgement (REQ-015.4 to REQ-015.6, translucency, rounding and shadows) are not
// measured anywhere: they are the user's review rows, T-015-P5 to T-015-P7, which belong
// to S4.

import {
  ADA,
  MIA,
  SAM,
  available,
  installFakeApi,
  onLoan,
  outOfService,
  rowOf,
  showListAs,
} from './_fake-api.js';
import {
  FIFTEEN_ICON_BUTTONS,
  S,
  computedOf,
  cornerRadius,
  cornerRadiusInPixels,
  fontFamilies,
} from './_look.js';
import { expect, test } from './_pw.js';

/** Available, On loan to Sam, Out of service: as Mia, two of the three offer her nothing. */
const ITEMS = () => [
  available(1, 'Projector'),
  onLoan(2, 'Laptop', SAM),
  outOfService(3, 'Camera'),
];

const rowHeights = async (page) => {
  const rows = page.getByTestId('row');
  const count = await rows.count();
  const heights = [];
  for (let index = 0; index < count; index += 1) {
    const box = await rows.nth(index).boundingBox();
    heights.push(box.height);
  }
  return heights;
};

test('T-015-P1 REQ-015.1 every row has the same height, whatever its status, icons, viewer or loader', async ({
  page,
}) => {
  for (const actingUser of [ADA, MIA]) {
    await installFakeApi(page, ITEMS());
    await showListAs(page, actingUser, 3);
    const heights = await rowHeights(page);
    // Found first: the three rows, counted in this view.
    expect(heights, actingUser.name).toHaveLength(3);
    expect(new Set(heights).size, `${actingUser.name}: one height for every row`).toBe(1);
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  }

  // Once more with a row loader showing.
  const server = await installFakeApi(page, ITEMS());
  await showListAs(page, MIA, 3);
  server.hold('borrow');
  await rowOf(page, 1).getByTestId('btn-borrow').click();
  await expect(rowOf(page, 1).getByTestId('row-loader')).toBeVisible();
  const withLoader = await rowHeights(page);
  expect(withLoader, 'the three rows while a loader shows').toHaveLength(3);
  expect(new Set(withLoader).size, 'one height for every row while a loader shows').toBe(1);
  server.release();
});

test('T-015-P3 REQ-015.2 every row is 48px high', async ({ page }) => {
  for (const actingUser of [ADA, MIA]) {
    await installFakeApi(page, ITEMS());
    await showListAs(page, actingUser, 3);
    const heights = await rowHeights(page);
    expect(heights, actingUser.name).toHaveLength(3);
    for (const height of heights) {
      expect(height, `${actingUser.name}: the row's height without its margin`).toBe(48);
    }
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  }
});

test('T-015-P4 REQ-015.3 all text on the page is in the system font', async ({ page }) => {
  await installFakeApi(page, ITEMS());
  await showListAs(page, ADA, 3);
  await page.getByTestId('add-input').fill('Lectern');
  await rowOf(page, 1).getByTestId('btn-borrow').click();
  await expect(page.getByTestId('modal-borrower')).toBeVisible();

  const places = [
    ['the page body', page.locator('body')],
    ['the switcher', page.getByTestId('switcher')],
    ['the Add field', page.getByTestId('add-input')],
    ['a button', page.getByTestId('demo-loading')],
    ['a row name', rowOf(page, 1).getByTestId('row-name')],
    ['a status badge', rowOf(page, 1).getByTestId('row-status')],
    ['a modal title', page.getByTestId('modal-borrower').getByTestId('modal-title')],
    ['a modal body', page.getByTestId('modal-borrower').getByTestId('modal-body')],
  ];
  const pinned = fontFamilies(S.fontStack);
  for (const [what, locator] of places) {
    const computed = await computedOf(locator, 'font-family');
    expect(fontFamilies(computed), `${what}: computed "${computed}"`).toEqual(pinned);
  }
});

test('T-015-P8 REQ-015.7 every status badge and the role badge are pill-shaped', async ({
  page,
}) => {
  await installFakeApi(page, ITEMS());
  await showListAs(page, ADA, 3);

  const badges = page.getByTestId('row-status');
  const count = await badges.count();
  expect(count).toBe(3);
  for (let index = 0; index < count; index += 1) {
    const badge = badges.nth(index);
    const box = await badge.boundingBox();
    const radius = await cornerRadiusInPixels(badge);
    expect(radius, `the status badge of row ${index + 1}`).toBeGreaterThanOrEqual(box.height / 2);
  }
  const role = page.getByTestId('role-badge');
  const roleBox = await role.boundingBox();
  expect(await cornerRadiusInPixels(role), 'the role badge').toBeGreaterThanOrEqual(
    roleBox.height / 2,
  );
});

test('T-015-P9 REQ-015.8 all fifteen icon buttons are round, wherever each appears', async ({
  page,
}) => {
  const server = await installFakeApi(page, ITEMS());
  await showListAs(page, ADA, 3);

  const everFound = new Set();
  const measureAll = async (where) => {
    for (const testid of FIFTEEN_ICON_BUTTONS) {
      const found = page.getByTestId(testid);
      const count = await found.count();
      for (let index = 0; index < count; index += 1) {
        everFound.add(testid);
        const button = found.nth(index);
        const box = await button.boundingBox();
        expect(box.width, `${testid} in ${where}: as wide as it is tall`).toBe(box.height);
        expect(await cornerRadius(button), `${testid} in ${where}`).toBe('50%');
      }
    }
  };

  // The rows, the Add panel and the state demos.
  await measureAll('the list');

  await rowOf(page, 1).getByTestId('btn-borrow').click();
  await expect(page.getByTestId('modal-borrower')).toBeVisible();
  await measureAll('the borrower modal');
  await page.getByTestId('modal-borrower').getByTestId('btn-close').click();

  await rowOf(page, 1).getByTestId('btn-delete').click();
  await expect(page.getByTestId('modal-confirm-delete')).toBeVisible();
  await measureAll('the confirm-delete modal');
  await page.getByTestId('btn-cancel').click();

  await page.getByTestId('demo-api-failure').click();
  await expect(page.getByTestId('modal-api-failure')).toBeVisible();
  await measureAll('the API failure modal');
  await page.getByTestId('modal-api-failure').getByTestId('btn-close').click();

  await page.getByTestId('demo-access-denied').click();
  await expect(page.getByTestId('modal-access-denied')).toBeVisible();
  await measureAll('the Access denied modal');
  await page.getByTestId('btn-ok').click();

  // One of the fifteen never found at all fails the row.
  expect(Array.from(everFound).sort()).toEqual([...FIFTEEN_ICON_BUTTONS].sort());
  expect(server.data()).toHaveLength(3);
});

test('T-015-P10 REQ-015.9 the top bar blurs what is behind it by 20px', async ({ page }) => {
  await installFakeApi(page, ITEMS());
  await showListAs(page, ADA, 3);

  const filter = await computedOf(page.getByTestId('top-bar'), 'backdrop-filter');
  expect(filter).toContain('blur(20px)');
});

test('T-015-P11 REQ-015.10 every card has a corner radius of 12px', async ({ page }) => {
  const measureCards = async (where) => {
    const cards = page.locator('.card');
    const count = await cards.count();
    expect(count, `${where}: at least one card`).toBeGreaterThan(0);
    for (let index = 0; index < count; index += 1) {
      expect(await cornerRadiusInPixels(cards.nth(index)), `card ${index} in ${where}`).toBe(12);
    }
  };

  const server = await installFakeApi(page, ITEMS());
  await showListAs(page, ADA, 3);
  // The list and the Add card.
  await measureCards('the list and the Add card');

  // The list indicator, while a list request is held.
  server.hold('list');
  await page.getByTestId('switcher').selectOption(String(MIA.id));
  await expect(page.getByTestId('list-indicator')).toBeVisible();
  await measureCards('the list indicator');
  server.release();
  await expect(page.getByTestId('row').first()).toBeVisible();

  // The empty text.
  await page.getByTestId('demo-empty').click();
  await expect(page.getByTestId('empty-state')).toBeVisible();
  await measureCards('the empty text');
});

test('T-015-P12 REQ-015.11 every modal has a corner radius of 16px', async ({ page }) => {
  await installFakeApi(page, ITEMS());
  await showListAs(page, ADA, 3);

  const measure = async (which) => {
    expect(await cornerRadiusInPixels(page.getByTestId(which)), which).toBe(16);
  };

  await rowOf(page, 1).getByTestId('btn-borrow').click();
  await expect(page.getByTestId('modal-borrower')).toBeVisible();
  await measure('modal-borrower');
  await page.getByTestId('modal-borrower').getByTestId('btn-close').click();

  await rowOf(page, 1).getByTestId('btn-delete').click();
  await expect(page.getByTestId('modal-confirm-delete')).toBeVisible();
  await measure('modal-confirm-delete');
  await page.getByTestId('btn-cancel').click();

  await page.getByTestId('demo-api-failure').click();
  await measure('modal-api-failure');
  await page.getByTestId('modal-api-failure').getByTestId('btn-close').click();

  await page.getByTestId('demo-access-denied').click();
  await measure('modal-access-denied');
});

test('T-015-P13 REQ-015.12 the switcher and the Add field have a corner radius of 8px', async ({
  page,
}) => {
  await installFakeApi(page, ITEMS());
  await showListAs(page, ADA, 3);

  expect(await cornerRadiusInPixels(page.getByTestId('switcher')), 'the switcher').toBe(8);
  expect(await cornerRadiusInPixels(page.getByTestId('add-input')), 'the Add field').toBe(8);
});

test('T-015-P14 REQ-015.13 each member button has a corner radius of 10px', async ({ page }) => {
  await installFakeApi(page, ITEMS());
  await showListAs(page, ADA, 3);
  await rowOf(page, 1).getByTestId('btn-borrow').click();
  await expect(page.getByTestId('modal-borrower')).toBeVisible();

  for (const member of [MIA, SAM]) {
    const button = page.getByTestId(`member-button-${member.id}`);
    await expect(button).toBeVisible();
    expect(await cornerRadiusInPixels(button), member.name).toBe(10);
  }
});

test('T-015-P15 REQ-015.14 the state demos panel has a corner radius of 12px', async ({ page }) => {
  await installFakeApi(page, ITEMS());
  await showListAs(page, ADA, 3);

  expect(await cornerRadiusInPixels(page.getByTestId('state-demos'))).toBe(12);
});

test('T-015-N1 REQ-015.1 a row loader never changes a row height', async ({ page }) => {
  const server = await installFakeApi(page, ITEMS());
  await showListAs(page, MIA, 3);
  // Found first: the three rows, counted.
  const before = await rowHeights(page);
  expect(before).toHaveLength(3);

  server.hold('borrow');
  await rowOf(page, 1).getByTestId('btn-borrow').click();
  await expect(rowOf(page, 1).getByTestId('row-loader')).toBeVisible();
  const during = await rowHeights(page);

  server.release();
  await expect(rowOf(page, 1).getByTestId('row-loader')).toHaveCount(0);
  await expect(rowOf(page, 1).getByTestId('row-status')).toHaveText(S.onLoan(MIA.name));
  const after = await rowHeights(page);

  expect(during, 'while the loader showed').toEqual(before);
  expect(after, 'once the loader had gone').toEqual(before);
});
