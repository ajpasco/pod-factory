// REQ-009: where the inline validation message sits. The two B rows of S3.
// Frozen with the S3 tests; read-only to every builder.
//
// These rows exist because jsdom has no layout engine: the C rows can apply only checks
// (1) and (2) of the placement, and checks (3) and (4) are geometry. Chromium has a layout
// engine, so all four are applied here (eval plan 1.1, blueprint 12.8.1).

import { ADA, THREE_STATUSES, installFakeApi, showListAs } from './_fake-api.js';
import { S, nameOfLength, placementFacts } from './_look.js';
import { expect, test } from './_pw.js';

/** Assert the four checks, each named, on the message now showing. */
async function expectPlacement(page, expectedText) {
  const facts = await placementFacts(page);
  expect(facts.found, 'the Add card, the Add field and the message were all found').toBe(true);
  if (expectedText !== undefined) expect(facts.text).toBe(expectedText);
  else expect(facts.text).not.toBe('');
  expect(facts.insideCardInDom, '(1) a descendant of the Add card').toBe(true);
  expect(facts.afterFieldInDom, '(2) after the Add field in document order').toBe(true);
  expect(
    facts.topNotAboveFieldBottom,
    "(3) its top edge is not above the Add field's lower edge",
  ).toBe(true);
  expect(facts.overlapsField, '(3) the two boxes do not overlap').toBe(false);
  expect(facts.withinCardBox, "(4) its whole box lies within the Add card's box").toBe(true);
  // The message is not a modal.
  expect(facts.alertdialogs, 'no element with the alertdialog role exists').toBe(0);
}

test('T-009-N14 REQ-009.4 REQ-009.5 an empty name shows the required message in its place, by Enter and by the icon', async ({
  page,
}) => {
  for (const activate of ['Enter', 'the Add icon']) {
    await installFakeApi(page, THREE_STATUSES());
    await showListAs(page, ADA, 3);
    // Found first: the Add card and the Add field.
    await expect(page.getByTestId('add-card')).toBeVisible();
    await expect(page.getByTestId('add-input')).toBeVisible();

    if (activate === 'Enter') {
      await page.getByTestId('add-input').click();
      await page.keyboard.press('Enter');
    } else {
      await page.getByTestId('btn-add').click();
    }

    await expect(page.getByTestId('add-validation')).toBeVisible();
    await expectPlacement(page, S.nameRequired);
    // The next case starts on a freshly loaded page.
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  }
});

test('T-009-N15 REQ-009.8 REQ-009.11 every name the client will not send shows its message in the same place', async ({
  page,
}) => {
  const attempts = [
    ['an empty field', '', S.nameRequired],
    ['only spaces', '   ', S.nameRequired],
    ['101 characters after trimming', nameOfLength(101), S.nameTooLong],
  ];
  for (const [what, typed, expected] of attempts) {
    await installFakeApi(page, THREE_STATUSES());
    await showListAs(page, ADA, 3);
    await expect(page.getByTestId('add-card')).toBeVisible();

    const field = page.getByTestId('add-input');
    await field.click();
    if (typed !== '') await field.fill(typed);
    await page.keyboard.press('Enter');

    await expect(page.getByTestId('add-validation'), what).toBeVisible();
    await expectPlacement(page, expected);
    await expect(page.getByTestId('modal-api-failure'), what).toHaveCount(0);
    await page.unrouteAll({ behavior: 'ignoreErrors' });
  }
});
