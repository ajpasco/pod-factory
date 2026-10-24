// The shared harness of the C rows (eval plan 1.3). Frozen; read-only to every builder.
//
// `src/App.jsx` is imported here, at module level, and every test file imports this
// module. That placement is required, not stylistic: eval plan 1.2 expects each C test
// file to *fail to load* on the baseline because the client is absent, so that no row can
// be reported as passing by absence. An import inside a helper would let a file load and
// its cases report something else.
//
// The page is only ever `<App />` with the global `fetch` replaced (blueprint 12.7). The
// locators of blueprint 12.8 are the instrument a row observes an outcome through; no row
// asserts a locator, a module or a file name as the thing under test (eval plan 1.1).
//
// `globalThis.document` and `globalThis.window` are written out in full rather than used
// bare because these files are linted by the repository's root ESLint configuration, which
// declares Node's globals only.

import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement } from 'react';
import { expect, vi } from 'vitest';

import App from '../../src/App.jsx';

export { screen, waitFor, within };

// JSX is deliberately not used in these files: the root ESLint configuration parses them
// as plain JavaScript, and the client's own JSX transform is the builder's business.
export const page = () => createElement(App);

// -- the strings blueprint 12.9 pins --------------------------------------------------

export const S = {
  pageTitle: 'Shared Equipment',
  actingAs: 'Acting as',
  switcherPlaceholder: 'Choose a user',
  switcherEntry: (user) => `${user.name} (${user.role})`,
  stateDemosHeading: 'State demos:',
  addHeading: 'Add equipment',
  listHeading: 'Equipment',
  addPlaceholder: 'Equipment name, then press Enter',
  nameRequired: 'Name is required.',
  nameTooLong: 'Name must be 100 characters or fewer.',
  available: 'Available',
  // "\u2013" is U+2013 (eval plan 1.1, the string rule).
  onLoan: (name) => `On loan \u2013 ${name}`,
  outOfService: 'Out of service',
  // "\u2026" is U+2026.
  loading: 'Loading equipment\u2026',
  empty: 'No equipment yet',
  borrowerTitle: 'Who is borrowing?',
  borrowerBody: (itemName) => `Choose a member for ${itemName}.`,
  confirmDeleteTitle: (itemName) => `Delete ${itemName}?`,
  confirmDeleteBody: 'This removes the equipment from the list.',
  apiFailureTitle: 'Request failed',
  apiFailureBody: 'The server returned an error. Nothing was changed.',
  accessDeniedTitle: 'Access denied',
  accessDeniedBody: 'You do not have permission',
  memberButtonLabel: (user) => `Borrow for ${user.name}`,
};

/** The eleven icon controls and their pinned tooltip and label (blueprint 12.8.2). */
export const ELEVEN_ICON_CONTROLS = [
  { testid: 'btn-borrow', text: 'Borrow' },
  { testid: 'btn-return', text: 'Return' },
  { testid: 'btn-out-of-service', text: 'Mark out of service' },
  { testid: 'btn-restore', text: 'Restore' },
  { testid: 'btn-delete', text: 'Delete' },
  { testid: 'btn-add', text: 'Add equipment' },
  { testid: 'btn-close', text: 'Close' },
  { testid: 'btn-retry', text: 'Retry' },
  { testid: 'btn-ok', text: 'OK' },
  { testid: 'btn-cancel', text: 'Cancel' },
  { testid: 'btn-confirm', text: 'Confirm delete' },
];

/** The four state demos: their tooltip and their accessible label differ (12.8.2). */
export const FOUR_DEMOS = [
  { testid: 'demo-loading', tooltip: 'Loading', label: 'Show loading' },
  { testid: 'demo-empty', tooltip: 'Empty list', label: 'Show empty list' },
  { testid: 'demo-api-failure', tooltip: 'API failure', label: 'Show API failure' },
  { testid: 'demo-access-denied', tooltip: 'Access denied', label: 'Show access denied' },
];

/** The fifteen icon buttons: the eleven and the four demos. */
export const FIFTEEN_ICON_BUTTONS = [
  ...ELEVEN_ICON_CONTROLS.map((each) => ({ testid: each.testid, label: each.text })),
  ...FOUR_DEMOS.map((each) => ({ testid: each.testid, label: each.label })),
];

/** Every selector that can hold something a person operates (blueprint 12.8.3). */
export const CONTROL_SELECTOR = 'button, input, select, a, textarea, [tabindex], [role="button"]';

/** The data-testids the control inventory of REQ-017.18 allows. */
export const ALLOWED_CONTROL_TESTIDS = [
  'switcher',
  'add-input',
  ...ELEVEN_ICON_CONTROLS.map((each) => each.testid),
  ...FOUR_DEMOS.map((each) => each.testid),
  'member-button-2',
  'member-button-3',
];

// -- rendering and acting ---------------------------------------------------------------

/**
 * Replace the global `fetch` with the fake server and render the page. Returns the
 * rendering plus a `user` that drives the page with no timer of its own, so that a row
 * which controls the page's clock is never advanced by the typing itself.
 */
export function renderPage(server) {
  vi.stubGlobal('fetch', server.fetch);
  const user = userEvent.setup({ delay: null });
  const utils = render(page());
  return { ...utils, user, server };
}

/** Pick a user in the switcher. The page sends its list request on every pick. */
export async function pick(user, actingUser) {
  await user.selectOptions(screen.getByTestId('switcher'), String(actingUser.id));
}

/** Render, pick the user and wait until the rows the fake server holds are shown. */
export async function showList(server, actingUser) {
  const rendered = renderPage(server);
  await pick(rendered.user, actingUser);
  await waitFor(() => {
    expect(screen.getAllByTestId('row').length).toBe(server.items.length);
  });
  return rendered;
}

/** Render, pick the user and wait until the empty text is shown. */
export async function showEmpty(server, actingUser) {
  const rendered = renderPage(server);
  await pick(rendered.user, actingUser);
  expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
  return rendered;
}

// -- reading the page -------------------------------------------------------------------

/** Text as a person reads it: runs of whitespace collapsed, ends trimmed. */
export const textOf = (element) =>
  element === null ? null : element.textContent.replace(/\s+/g, ' ').trim();

export const rows = () => screen.queryAllByTestId('row');

/** The row of an item, by the `data-item-id` blueprint 12.8.1 pins. */
export const rowOf = (itemId) =>
  globalThis.document.querySelector(`[data-testid="row"][data-item-id="${itemId}"]`);

export const statusOf = (itemId) => textOf(within(rowOf(itemId)).getByTestId('row-status'));

export const nameOf = (itemId) => textOf(within(rowOf(itemId)).getByTestId('row-name'));

/** Does that row offer the control? */
export const rowHas = (itemId, testid) => within(rowOf(itemId)).queryByTestId(testid) !== null;

/** Every row as a person sees it: its name and its one status, in document order. */
export const rowsShown = () =>
  rows().map((row) => ({
    id: Number(row.getAttribute('data-item-id')),
    name: textOf(within(row).getByTestId('row-name')),
    status: textOf(within(row).getByTestId('row-status')),
  }));

/** The icon buttons: the fifteen, as blueprint 12.8.3 selects them. */
export const iconButtons = (root = globalThis.document.body) =>
  Array.from(root.querySelectorAll('button:not([data-testid^="member-button-"])'));

export const memberButtons = (root = globalThis.document.body) =>
  Array.from(root.querySelectorAll('[data-testid^="member-button-"]'));

/** Every control on the page now, whatever kind. */
export const everyControl = (root = globalThis.document.body) =>
  Array.from(root.querySelectorAll(CONTROL_SELECTOR));

/** The testid of a control, or a description of it when it has none. */
export const testidOf = (element) =>
  element.getAttribute('data-testid') ??
  `<${element.tagName.toLowerCase()}> with no data-testid: ${textOf(element)}`;

export const anyModal = () => globalThis.document.querySelector('[role="alertdialog"]');

export const modalBody = (testid) =>
  textOf(within(screen.getByTestId(testid)).getByTestId('modal-body'));

export const modalTitle = (testid) =>
  textOf(within(screen.getByTestId(testid)).getByTestId('modal-title'));

/** Is any loader or the list indicator showing? */
export const anyLoader = () =>
  screen.queryAllByTestId('row-loader').length +
  screen.queryAllByTestId('add-loader').length +
  screen.queryAllByTestId('list-indicator').length;

/**
 * Settled (eval plan 1.3): every held answer has been released and the page shows no
 * loader. A row that reads the data after an action waits for this first, so that it never
 * reads a half-applied page.
 */
export async function settle(server) {
  if (server !== undefined) server.release();
  await waitFor(() => {
    expect(anyLoader()).toBe(0);
  });
}

// -- the checks a row applies -----------------------------------------------------------

/**
 * Checks (1) and (2) of the inline-message placement (eval plan 1.1, blueprint 12.8.1):
 * the message is a descendant of the Add card, and it comes after the Add field in
 * document order. Checks (3) and (4) are geometry and belong to the B rows: jsdom has no
 * layout engine, so a C row that measured a box would read zeroes and pass on anything.
 *
 * The message is not a modal, so no element with the alertdialog role exists while it
 * shows.
 */
export function expectPlacementInDocument(expectedText) {
  const card = screen.getByTestId('add-card');
  const field = screen.getByTestId('add-input');
  const message = screen.getByTestId('add-validation');

  if (expectedText !== undefined) {
    expect(textOf(message)).toBe(expectedText);
  } else {
    expect(textOf(message)).not.toBe('');
  }

  // (1) a descendant of the Add card.
  expect(card.contains(message)).toBe(true);
  // (2) after the Add field in document order. Node.compareDocumentPosition reports
  // DOCUMENT_POSITION_FOLLOWING (4) when the other node comes later.
  expect(field.compareDocumentPosition(message) & 4).toBe(4);
  // It is not a modal.
  expect(anyModal()).toBeNull();
  return message;
}

/** A name of exactly `count` code points, as a person would type it. */
export const nameOfLength = (count) => 'E'.repeat(count);

/**
 * Everything a person can read on the page now: its text, and the `title`, `aria-label`
 * and `placeholder` values, which a person reads through a pointer or a screen reader.
 * Rows that claim a word appears nowhere scan this.
 */
export function readableText(root = globalThis.document.body) {
  const parts = [root.textContent ?? ''];
  for (const element of root.querySelectorAll('[title], [aria-label], [placeholder]')) {
    parts.push(element.getAttribute('title') ?? '');
    parts.push(element.getAttribute('aria-label') ?? '');
    parts.push(element.getAttribute('placeholder') ?? '');
  }
  return parts.join('\n');
}

/**
 * Everything a person can read on the page except inside the top bar. Several rows say
 * that the acting admin's name appears nowhere but there, where the switcher and the role
 * badge legitimately show it. The page is cloned and the top bar taken out of the copy, so
 * the row never alters the page it is reading.
 */
export function readableTextOutsideTopBar() {
  const copy = globalThis.document.body.cloneNode(true);
  for (const bar of copy.querySelectorAll('[data-testid="top-bar"]')) bar.remove();
  return readableText(copy);
}

/**
 * Everything a person can read on the page except inside the equipment list and the
 * modals. REQ-012.4 and REQ-012.15 say that a confirmed action shows its result in the
 * list and says nothing anywhere else, so the row compares this before and after.
 */
export function readableTextOutsideListAndModals() {
  const copy = globalThis.document.body.cloneNode(true);
  for (const part of copy.querySelectorAll(
    '[data-testid="equipment-list"], [role="alertdialog"]',
  )) {
    part.remove();
  }
  return readableText(copy).replace(/\s+/g, ' ').trim();
}

/**
 * Watch every render until `stop` is called, recording for each rendered page that holds
 * the API failure modal how many loaders it held. REQ-012.14 is about the *first* such
 * page, which a check made after the fact cannot see.
 */
export function watchLoadersWhileFailureShows() {
  const seen = [];
  const observer = new globalThis.MutationObserver(() => {
    const modal = globalThis.document.querySelector('[data-testid="modal-api-failure"]');
    if (modal === null) return;
    seen.push(
      globalThis.document.querySelectorAll('[data-testid="row-loader"], [data-testid="add-loader"]')
        .length,
    );
  });
  observer.observe(globalThis.document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  });
  return {
    seen,
    stop: () => observer.disconnect(),
  };
}

/**
 * The elements holding a word, searched in the text and in the readable attributes. Used
 * by the rows that allow a word in one place only (a word that is an item's name is data).
 */
export function elementsHolding(word, root = globalThis.document.body) {
  const wanted = word.toLowerCase();
  const found = [];
  for (const element of root.querySelectorAll('*')) {
    const own = Array.from(element.childNodes)
      .filter((node) => node.nodeType === 3)
      .map((node) => node.textContent)
      .join('');
    const attributes = [
      element.getAttribute('title') ?? '',
      element.getAttribute('aria-label') ?? '',
      element.getAttribute('placeholder') ?? '',
      element.getAttribute('value') ?? '',
    ].join('\n');
    if (`${own}\n${attributes}`.toLowerCase().includes(wanted)) found.push(element);
  }
  return found;
}
