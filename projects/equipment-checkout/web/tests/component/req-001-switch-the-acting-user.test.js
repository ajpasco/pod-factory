// REQ-001: switch the acting user. The eight C rows eval plan 8.1 assigns to S3.
// Frozen with the S3 tests; read-only to every builder.

import { expect, it } from 'vitest';

import { ADA, FakeServer, MIA, SAM, available, onLoan } from './_fake-server.js';
import {
  S,
  pick,
  renderPage,
  rowsShown,
  screen,
  settle,
  showList,
  statusOf,
  textOf,
  anyModal,
  readableText,
  waitFor,
} from './_harness.js';
import { eachState } from './_states.js';

/** The user entries of the switcher, in document order. */
const userEntries = () =>
  Array.from(screen.getByTestId('switcher').querySelectorAll('[data-testid^="switcher-option-"]'));

it('T-001-P1 REQ-001.1 REQ-001.2 the switcher has exactly the three seeded users, in order, each with its role', async () => {
  renderPage(new FakeServer([available(1, 'Projector')]));

  const entries = userEntries();
  expect(entries).toHaveLength(3);
  expect(entries.map((entry) => entry.getAttribute('data-testid'))).toEqual([
    'switcher-option-1',
    'switcher-option-2',
    'switcher-option-3',
  ]);
  expect(entries.map((entry) => entry.value)).toEqual(['1', '2', '3']);
  // Each entry names its user and shows that user's role.
  expect(entries.map(textOf)).toEqual([
    S.switcherEntry(ADA),
    S.switcherEntry(MIA),
    S.switcherEntry(SAM),
  ]);
  // No fourth user entry. The entries were found first, so this cannot pass on a page
  // that renders no switcher.
  expect(screen.queryByTestId('switcher-option-4')).toBeNull();
});

it('T-001-P2 REQ-001.4 a Borrow by the picked member lends the item to her', async () => {
  const server = new FakeServer([available(1, 'Projector')]);
  const { user } = await showList(server, MIA);

  await user.click(screen.getByTestId('btn-borrow'));
  await settle(server);

  expect(statusOf(1)).toBe(S.onLoan(MIA.name));
});

it('T-001-P3 REQ-001.5 after switching from Ada to Mia the Borrow is made as Mia', async () => {
  // The fake server acts for the identity each request carries, so a Borrow still sent
  // as Ada would lend the item to Ada and this row would read that.
  const server = new FakeServer([available(1, 'Projector')]);
  const { user } = await showList(server, ADA);
  await pick(user, MIA);
  await waitFor(() => {
    expect(screen.getAllByTestId('row')).toHaveLength(1);
  });

  await user.click(screen.getByTestId('btn-borrow'));
  await settle(server);

  expect(statusOf(1)).toBe(S.onLoan(MIA.name));
  expect(anyModal()).toBeNull();
  expect(server.find(1)).toMatchObject({
    status: 'on_loan',
    borrowerId: MIA.id,
    borrowerName: MIA.name,
  });
  expect(server.find(1).borrowerName).not.toBe(ADA.name);
});

it('T-001-P6 REQ-001.10 before a pick the switcher shows its placeholder, which is not a user entry', async () => {
  renderPage(new FakeServer([available(1, 'Projector')]));

  const placeholder = screen.getByTestId('switcher-placeholder');
  expect(textOf(placeholder)).toBe(S.switcherPlaceholder);
  expect(placeholder.value).toBe('');
  expect(userEntries()).toHaveLength(3);
  expect(userEntries()).not.toContain(placeholder);
});

it('T-001-P7 REQ-001.11 the three user entries read name and role exactly', async () => {
  renderPage(new FakeServer([]));

  expect(userEntries().map(textOf)).toEqual([
    'Ada Admin (admin)',
    'Mia Member (member)',
    'Sam Member (member)',
  ]);
});

it('T-001-N1 REQ-001.3 no sign-in surface exists in any state, for an admin or a member', async () => {
  const forbidden = ['sign in', 'sign up', 'log in', 'register', 'password'];

  for (const actingUser of [ADA, MIA]) {
    const visited = await eachState(actingUser, ({ label }) => {
      const body = globalThis.document.body;
      expect(
        body.querySelectorAll('input[type="password"]'),
        `a password input in: ${label}`,
      ).toHaveLength(0);
      expect(body.querySelectorAll('a'), `a link in: ${label}`).toHaveLength(0);
      const text = readableText().toLowerCase();
      for (const word of forbidden) {
        expect(text, `"${word}" in: ${label}`).not.toContain(word);
      }
    });
    // The anchor: the sweep really visited every state for this user.
    expect(visited.length).toBeGreaterThanOrEqual(actingUser === ADA ? 11 : 9);
  }
});

it('T-001-N2 REQ-001.5 picking a member takes the admin-only Add field away', async () => {
  const server = new FakeServer([available(1, 'Projector'), onLoan(2, 'Laptop', MIA)]);
  const { user } = await showList(server, ADA);
  // Found first: the Add field exists for the admin and the two rows are shown.
  expect(screen.getByTestId('add-input')).toBeInTheDocument();
  expect(rowsShown()).toHaveLength(2);

  await pick(user, MIA);
  await waitFor(() => {
    expect(screen.getAllByTestId('row')).toHaveLength(2);
  });

  expect(rowsShown()).toHaveLength(2);
  expect(screen.queryByTestId('add-input')).toBeNull();
});

it('T-001-N5 REQ-001.9 before a pick the page shows no list, no indicator, no empty text and no Add card', async () => {
  renderPage(new FakeServer([available(1, 'Projector')]));

  // Found first: the switcher, its placeholder and its three user entries.
  expect(textOf(screen.getByTestId('switcher-placeholder'))).toBe(S.switcherPlaceholder);
  expect(userEntries()).toHaveLength(3);

  expect(screen.queryByTestId('equipment-list')).toBeNull();
  expect(screen.queryAllByTestId('row')).toHaveLength(0);
  expect(screen.queryByTestId('list-indicator')).toBeNull();
  expect(screen.queryByTestId('empty-state')).toBeNull();
  expect(screen.queryByTestId('add-card')).toBeNull();
});
