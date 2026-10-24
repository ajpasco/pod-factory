// REQ-017: restraint on the non-goals. The five C rows of S3 (T-017-P2 is a B row).
// Frozen with the S3 tests; read-only to every builder.

import { expect, it } from 'vitest';

import {
  ADA,
  FakeServer,
  MIA,
  REFUSE,
  REJECT_ERROR,
  SAM,
  available,
  onLoan,
  outOfService,
} from './_fake-server.js';
import {
  ALLOWED_CONTROL_TESTIDS,
  S,
  everyControl,
  readableText,
  rowOf,
  rowsShown,
  screen,
  settle,
  showList,
  testidOf,
  textOf,
  within,
} from './_harness.js';
import { eachState, lendTo } from './_states.js';

/**
 * Items in every status, several of them named after a feature the PRD rules out. A row
 * named "Settings" is data: it must never become a control, a heading or a second view.
 */
const FEATURE_NAMED = () => [
  available(1, 'Settings'),
  onLoan(2, 'Search', MIA),
  outOfService(3, 'Edit'),
  available(4, 'Details'),
  available(5, 'Reserve'),
  outOfService(6, 'Borrowed'),
];

/** The controls a given user may have at all (blueprint 12.8.3 and REQ-017.18). */
const forbiddenFor = (actingUser) =>
  actingUser.role === 'admin'
    ? []
    : [
        'add-input',
        'btn-add',
        'btn-out-of-service',
        'btn-restore',
        'btn-delete',
        'member-button-2',
        'member-button-3',
      ];

/**
 * Everything a person can read outside the structures the PRD specifies for a message:
 * the row statuses, the empty text, the list indicator, the row and Add loaders, the
 * inline validation message, the tooltips and the four modals. What is left is the page's
 * static chrome, and REQ-017.3 to REQ-017.5 say no message of any kind appears in it.
 */
function chromeText() {
  const copy = globalThis.document.body.cloneNode(true);
  for (const part of copy.querySelectorAll(
    '[data-testid="equipment-list"], [role="alertdialog"], [data-testid="add-card"],' +
      ' [data-testid="list-indicator"], [data-testid="empty-state"]',
  )) {
    part.remove();
  }
  return readableText(copy).replace(/\s+/g, ' ').trim();
}

const ALLOWED_HEADINGS = [
  S.pageTitle,
  S.stateDemosHeading,
  S.addHeading,
  S.listHeading,
  S.borrowerTitle,
  S.confirmDeleteBody,
  S.apiFailureTitle,
  S.accessDeniedTitle,
];

const headings = () => Array.from(globalThis.document.querySelectorAll('h1, h2, h3, h4, h5, h6'));

it('T-017-P1 REQ-017.1 REQ-017.2 REQ-017.8 REQ-017.9 REQ-017.10 REQ-017.11 REQ-017.12 REQ-017.14 REQ-017.15 REQ-017.16 REQ-017.18 the page holds no control the PRD does not name', async () => {
  for (const actingUser of [ADA, MIA, SAM]) {
    const forbidden = forbiddenFor(actingUser);
    const visited = await eachState(
      actingUser,
      ({ label }) => {
        const where = `${actingUser.name}, ${label}`;
        for (const control of everyControl()) {
          const testid = testidOf(control);
          expect(ALLOWED_CONTROL_TESTIDS, `${where}: ${testid}`).toContain(testid);
          expect(forbidden, `${where}: ${testid}`).not.toContain(testid);
        }
        // An item named after a feature is data: its name is never a control.
        for (const row of rowsShown()) {
          const name = within(rowOf(row.id)).getByTestId('row-name');
          expect(name.closest('button, a, [role="button"]'), `${where}: ${row.name}`).toBeNull();
        }
      },
      { items: FEATURE_NAMED },
    );
    expect(visited.length, actingUser.name).toBeGreaterThanOrEqual(9);
  }
});

it('T-017-N1 REQ-017.3 REQ-017.4 REQ-017.5 REQ-017.17 no message appears outside the structures the PRD specifies', async () => {
  const server = new FakeServer([
    available(1, 'Projector'),
    onLoan(2, 'Laptop', MIA),
    available(3, 'Tripod'),
    outOfService(4, 'Camera'),
    available(5, 'Stand'),
    available(6, 'Cable'),
  ]);
  const { user } = await showList(server, ADA);
  // Found first: the rows and the page's chrome around them.
  expect(rowsShown()).toHaveLength(6);
  const chromeBefore = chromeText();

  await lendTo(user, 1, MIA);
  await settle(server);
  await user.click(within(rowOf(1)).getByTestId('btn-return'));
  await settle(server);
  await user.type(screen.getByTestId('add-input'), 'Lectern');
  await user.keyboard('{Enter}');
  await settle(server);
  await user.click(within(rowOf(3)).getByTestId('btn-out-of-service'));
  await settle(server);
  await user.click(within(rowOf(3)).getByTestId('btn-restore'));
  await settle(server);
  await user.click(within(rowOf(5)).getByTestId('btn-delete'));
  await user.click(screen.getByTestId('btn-confirm'));
  await settle(server);
  await user.click(within(rowOf(6)).getByTestId('btn-delete'));
  await user.click(screen.getByTestId('btn-cancel'));
  // One failure and one refusal.
  server.answer('out-of-service', REJECT_ERROR);
  await user.click(within(rowOf(6)).getByTestId('btn-out-of-service'));
  await user.click(await screen.findByTestId('btn-close'));
  server.answer('out-of-service', REFUSE);
  await user.click(within(rowOf(6)).getByTestId('btn-out-of-service'));
  await user.click(await screen.findByTestId('btn-ok'));
  await settle(server);

  expect(chromeText()).toBe(chromeBefore);
  // No region whose purpose is to announce something.
  expect(
    globalThis.document.querySelectorAll(
      '[role="status"], [role="alert"], [role="log"], [aria-live], output',
    ),
  ).toHaveLength(0);
  // No date, time or due-date element or input, on an item or anywhere else.
  expect(
    globalThis.document.querySelectorAll(
      'input[type="date"], input[type="time"], input[type="datetime-local"],' +
        ' input[type="month"], input[type="week"], time',
    ),
  ).toHaveLength(0);
  const whole = textOf(globalThis.document.body);
  expect(whole).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  expect(whole).not.toMatch(/\d{1,2}:\d{2}/);
  expect(whole.toLowerCase()).not.toContain('due');
  expect(whole.toLowerCase()).not.toContain('remind');
});

it('T-017-N2 REQ-017.6 REQ-017.7 there is one view only, with no history and no second list', async () => {
  const server = new FakeServer([available(1, 'Projector'), available(2, 'Tripod')]);
  const { user } = await showList(server, ADA);

  // A borrow and its return, so that a history of loans would have something to show.
  await lendTo(user, 1, MIA);
  await settle(server);
  await user.click(within(rowOf(1)).getByTestId('btn-return'));
  await settle(server);
  expect(rowsShown()).toHaveLength(2);

  const where = globalThis.window.location.href;
  const depth = globalThis.window.history.length;

  for (const row of screen.getAllByTestId('row')) {
    await user.click(row);
    await user.click(within(row).getByTestId('row-name'));
  }

  // Each modal opened and closed.
  await user.click(within(rowOf(1)).getByTestId('btn-borrow'));
  await screen.findByTestId('modal-borrower');
  expect(
    headings()
      .map(textOf)
      .every((text) => ALLOWED_HEADINGS.includes(text)),
  ).toBe(true);
  await user.click(screen.getByTestId('btn-close'));

  await user.click(within(rowOf(1)).getByTestId('btn-delete'));
  await screen.findByTestId('modal-confirm-delete');
  expect(
    headings()
      .map(textOf)
      .every(
        (text) => ALLOWED_HEADINGS.includes(text) || text === S.confirmDeleteTitle('Projector'),
      ),
  ).toBe(true);
  await user.click(screen.getByTestId('btn-cancel'));

  for (const [demo, closes] of [
    ['demo-api-failure', 'btn-close'],
    ['demo-access-denied', 'btn-ok'],
  ]) {
    await user.click(screen.getByTestId(demo));
    expect(
      headings()
        .map(textOf)
        .every((text) => ALLOWED_HEADINGS.includes(text)),
    ).toBe(true);
    await user.click(screen.getByTestId(closes));
  }

  // The switcher and the remaining demos, each state left by picking a user or by Show
  // loading.
  await user.click(screen.getByTestId('demo-empty'));
  await screen.findByTestId('empty-state');
  await user.click(screen.getByTestId('demo-loading'));
  await screen.findByTestId('list-indicator');

  expect(globalThis.window.location.href).toBe(where);
  expect(globalThis.window.history.length).toBe(depth);
  expect(globalThis.document.querySelectorAll('a')).toHaveLength(0);
  expect(screen.queryAllByTestId('equipment-list').length).toBeLessThanOrEqual(1);
  for (const heading of headings()) {
    expect(ALLOWED_HEADINGS, `the heading "${textOf(heading)}"`).toContain(textOf(heading));
  }
});

it('T-017-N5 REQ-017.13 no other service is offered in the interface', async () => {
  for (const actingUser of [ADA, MIA]) {
    const visited = await eachState(actingUser, ({ label }) => {
      const where = `${actingUser.name}, ${label}`;
      expect(globalThis.document.querySelectorAll('a'), where).toHaveLength(0);
      expect(
        globalThis.document.querySelectorAll('iframe, frame, embed, object, portal'),
        where,
      ).toHaveLength(0);
      expect(
        globalThis.document.querySelectorAll('form[action], [formaction]'),
        where,
      ).toHaveLength(0);
    });
    expect(visited.length, actingUser.name).toBeGreaterThanOrEqual(9);
  }
});

it('T-017-N10 REQ-017.19 nothing on the page says that the app is a trial', async () => {
  const forbidden = ['trial', 'mockup', 'sample data', 'nothing is saved'];

  for (const actingUser of [ADA, MIA]) {
    const visited = await eachState(actingUser, ({ label }) => {
      const text = readableText().toLowerCase();
      for (const word of forbidden) {
        expect(text, `"${word}" in: ${actingUser.name}, ${label}`).not.toContain(word);
      }
    });
    expect(visited.length, actingUser.name).toBeGreaterThanOrEqual(9);
  }
});
