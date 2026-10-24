// REQ-013: the list page states, as Chromium lays them out. The three B rows of S3.
// Frozen with the S3 tests; read-only to every builder.

import { ADA, THREE_STATUSES, installFakeApi, showListAs } from './_fake-api.js';
import { S, nameOfLength, placementFacts } from './_look.js';
import { expect, test } from './_pw.js';

async function expectPlacement(page, expectedText) {
  const facts = await placementFacts(page);
  expect(facts.found, 'the Add card, the Add field and the message were all found').toBe(true);
  expect(facts.text).toBe(expectedText);
  expect(facts.insideCardInDom, '(1) a descendant of the Add card').toBe(true);
  expect(facts.afterFieldInDom, '(2) after the Add field in document order').toBe(true);
  expect(
    facts.topNotAboveFieldBottom,
    "(3) its top edge is not above the Add field's lower edge",
  ).toBe(true);
  expect(facts.overlapsField, '(3) the two boxes do not overlap').toBe(false);
  expect(facts.withinCardBox, "(4) its whole box lies within the Add card's box").toBe(true);
}

test('T-013-P6 REQ-013.5 the state demos panel sits above the top bar, the Add card and the list', async ({
  page,
}) => {
  await installFakeApi(page, THREE_STATUSES());
  await showListAs(page, ADA, 3);
  await page.evaluate(() => globalThis.scrollTo(0, 0));

  const panel = await page.getByTestId('state-demos').boundingBox();
  for (const below of ['top-bar', 'add-card', 'equipment-list']) {
    const box = await page.getByTestId(below).boundingBox();
    expect(panel.y, `the panel's top edge is above the top edge of ${below}`).toBeLessThan(box.y);
  }
});

test('T-013-N10 REQ-013.20 an Add with no name from the Show empty list view keeps the view and places its message', async ({
  page,
}) => {
  const attempts = [
    ['Enter with the field empty', '', 'Enter'],
    ['the Add icon with the field empty', '', 'icon'],
    ['Enter with only spaces typed', '   ', 'Enter'],
  ];
  for (const [what, typed, activate] of attempts) {
    await installFakeApi(page, THREE_STATUSES());
    await showListAs(page, ADA, 3);
    await page.getByTestId('demo-empty').click();
    // Found first: the empty view, the Add card and the Add field.
    await expect(page.getByTestId('empty-state'), what).toHaveText(S.empty);
    await expect(page.getByTestId('add-card'), what).toBeVisible();

    const field = page.getByTestId('add-input');
    if (typed !== '') await field.fill(typed);
    if (activate === 'Enter') {
      await field.click();
      await page.keyboard.press('Enter');
    } else {
      await page.getByTestId('btn-add').click();
    }

    await expect(page.getByTestId('add-validation'), what).toBeVisible();
    await expectPlacement(page, S.nameRequired);
    await expect(page.getByTestId('empty-state'), what).toHaveText(S.empty);
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  }
});

test('T-013-N12 REQ-013.21 an over-long name from the Show empty list view keeps the view and places its message', async ({
  page,
}) => {
  await installFakeApi(page, THREE_STATUSES());
  await showListAs(page, ADA, 3);
  await page.getByTestId('demo-empty').click();
  await expect(page.getByTestId('empty-state')).toHaveText(S.empty);
  await expect(page.getByTestId('add-card')).toBeVisible();

  const field = page.getByTestId('add-input');
  await field.fill(nameOfLength(101));
  await field.click();
  await page.keyboard.press('Enter');

  await expect(page.getByTestId('add-validation')).toBeVisible();
  await expectPlacement(page, S.nameTooLong);
  await expect(page.getByTestId('empty-state')).toHaveText(S.empty);
  await expect(page.getByTestId('modal-api-failure')).toHaveCount(0);
});
