// REQ-002: show name and status on every row. The four C rows of S3.
// Frozen with the S3 tests; read-only to every builder.

import { fireEvent } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { FakeServer, MIA, available, onLoan, outOfService } from './_fake-server.js';
import {
  ALLOWED_CONTROL_TESTIDS,
  S,
  anyModal,
  elementsHolding,
  everyControl,
  readableText,
  rowOf,
  rowsShown,
  screen,
  showList,
  testidOf,
  textOf,
  within,
} from './_harness.js';
import { THREE_STATUSES, eachState } from './_states.js';

it('T-002-P1 REQ-002.1 REQ-002.2 REQ-002.3 each row shows its name and exactly one status', async () => {
  const server = new FakeServer([
    available(1, 'Projector'),
    onLoan(2, 'Laptop', MIA),
    outOfService(3, 'Camera'),
  ]);
  await showList(server, MIA);

  const rows = screen.getAllByTestId('row');
  expect(rows).toHaveLength(3);
  for (const row of rows) {
    // Exactly one status on the row: two badges would make "its status" ambiguous.
    expect(within(row).getAllByTestId('row-status')).toHaveLength(1);
    expect(within(row).getAllByTestId('row-name')).toHaveLength(1);
  }
  expect(rowsShown()).toEqual([
    { id: 1, name: 'Projector', status: S.available },
    { id: 2, name: 'Laptop', status: S.onLoan(MIA.name) },
    { id: 3, name: 'Camera', status: S.outOfService },
  ]);
});

it('T-002-N1 REQ-002.4 a row and its name are not controls: activating them opens nothing and goes nowhere', async () => {
  const server = new FakeServer(THREE_STATUSES());
  const { user } = await showList(server, MIA);
  // Found first: the three rows with their names and statuses.
  expect(rowsShown()).toHaveLength(3);

  const where = globalThis.window.location.href;
  const depth = globalThis.window.history.length;

  for (const row of screen.getAllByTestId('row')) {
    const name = within(row).getByTestId('row-name');
    await user.click(row);
    await user.click(name);
    // By keyboard too. A row and a name are not focusable, so the key events are
    // dispatched on them directly: that is the only way a person could reach them if a
    // build had wrongly made them operable.
    for (const target of [row, name]) {
      fireEvent.keyDown(target, { key: 'Enter' });
      fireEvent.keyUp(target, { key: 'Enter' });
      fireEvent.keyDown(target, { key: ' ' });
      fireEvent.keyUp(target, { key: ' ' });
    }
  }

  for (const control of everyControl()) {
    expect(ALLOWED_CONTROL_TESTIDS).toContain(testidOf(control));
  }
  // No Details button anywhere, by any name.
  expect(
    screen.queryAllByRole('button', { name: /details/i }),
    'a Details button exists',
  ).toHaveLength(0);
  expect(globalThis.document.querySelectorAll('a')).toHaveLength(0);
  expect(anyModal()).toBeNull();
  expect(globalThis.window.location.href).toBe(where);
  expect(globalThis.window.history.length).toBe(depth);
});

it('T-002-N2 REQ-002.1 a name that looks like markup is shown as text and does nothing', async () => {
  const odd = '<img src=x onerror=alert(1)><button>Delete</button>';
  const alerted = vi.fn();
  vi.stubGlobal('alert', alerted);
  const server = new FakeServer([
    available(1, 'Projector'),
    available(2, odd),
    outOfService(3, 'Camera'),
  ]);
  await showList(server, MIA);

  // Found first: the three rows.
  expect(screen.getAllByTestId('row')).toHaveLength(3);

  const oddRow = rowOf(2);
  expect(textOf(within(oddRow).getByTestId('row-name'))).toBe(odd);
  expect(oddRow.querySelectorAll('img')).toHaveLength(0);
  expect(globalThis.document.querySelectorAll('img')).toHaveLength(0);
  // The odd row offers the same buttons as an ordinary Available row and no extra one.
  const buttonsOf = (row) => Array.from(row.querySelectorAll('button')).map(testidOf).sort();
  expect(buttonsOf(oddRow)).toEqual(buttonsOf(rowOf(1)));
  // The row's text was never executed: nothing asked the page to alert.
  expect(alerted).not.toHaveBeenCalled();
});

it('T-002-N3 REQ-002.5 the word "Borrowed" appears nowhere, and when an item is named with it, only in that name', async () => {
  const visited = await eachState(MIA, ({ label }) => {
    expect(readableText().toLowerCase(), `"borrowed" in: ${label}`).not.toContain('borrowed');
  });
  expect(visited.length).toBeGreaterThanOrEqual(9);

  const server = new FakeServer([...THREE_STATUSES(), available(4, 'Borrowed Camera')]);
  await showList(server, MIA);
  // Found first: the four rows with their statuses.
  expect(rowsShown()).toHaveLength(4);

  const holders = elementsHolding('Borrowed');
  expect(holders.length).toBeGreaterThan(0);
  const theName = within(rowOf(4)).getByTestId('row-name');
  for (const element of holders) {
    expect(element === theName || theName.contains(element)).toBe(true);
  }
});
