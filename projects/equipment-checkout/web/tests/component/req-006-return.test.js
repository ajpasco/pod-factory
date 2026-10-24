// REQ-006: return a loaned item. The five C rows of S3.
// Frozen with the S3 tests; read-only to every builder.

import { expect, it } from 'vitest';

import { ADA, FakeServer, MIA, SAM, onLoan } from './_fake-server.js';
import {
  S,
  anyModal,
  readableTextOutsideTopBar,
  rowHas,
  rowOf,
  rowsShown,
  settle,
  showList,
  statusOf,
  within,
} from './_harness.js';

it('T-006-P1 REQ-006.1 a member sees Return on the item on loan to her', async () => {
  const server = new FakeServer([onLoan(1, 'Laptop', MIA), onLoan(2, 'Camera', SAM)]);
  await showList(server, MIA);

  expect(rowsShown()).toHaveLength(2);
  expect(rowHas(1, 'btn-return')).toBe(true);
});

it('T-006-P2 REQ-006.2 an admin sees Return on every loan', async () => {
  const server = new FakeServer([onLoan(1, 'Laptop', MIA), onLoan(2, 'Camera', SAM)]);
  await showList(server, ADA);

  expect(rowsShown()).toHaveLength(2);
  expect(rowHas(1, 'btn-return')).toBe(true);
  expect(rowHas(2, 'btn-return')).toBe(true);
});

it('T-006-P3 REQ-006.4 REQ-006.5 a Return shows the row loader and ends with the item available', async () => {
  const server = new FakeServer([onLoan(1, 'Laptop', MIA)]).hold('return');
  const { user } = await showList(server, MIA);

  await user.click(within(rowOf(1)).getByTestId('btn-return'));
  expect(within(rowOf(1)).getByTestId('row-loader')).toBeInTheDocument();
  expect(statusOf(1)).toBe(S.onLoan(MIA.name));

  await settle(server);
  expect(statusOf(1)).toBe(S.available);
});

it("T-006-N1 REQ-006.3 another member's loan offers her no control at all", async () => {
  const server = new FakeServer([onLoan(1, 'Camera', SAM), onLoan(2, 'Laptop', MIA)]);
  await showList(server, MIA);

  // Found first: both rows, with their status text.
  expect(statusOf(1)).toBe(S.onLoan(SAM.name));
  expect(statusOf(2)).toBe(S.onLoan(MIA.name));

  expect(rowOf(1).querySelectorAll('button')).toHaveLength(0);
  expect(rowHas(2, 'btn-return')).toBe(true);
});

it('T-006-N6 REQ-006.6 a return by the admin names nobody outside the top bar', async () => {
  const server = new FakeServer([onLoan(1, 'Laptop', MIA)]);
  const { user } = await showList(server, ADA);

  await user.click(within(rowOf(1)).getByTestId('btn-return'));
  await settle(server);

  expect(statusOf(1)).toBe(S.available);
  expect(anyModal()).toBeNull();

  const outside = readableTextOutsideTopBar().toLowerCase();
  expect(outside).not.toContain('ada');
  expect(outside).not.toContain('admin');
});
