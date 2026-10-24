// REQ-008: one active loan per item. The one C row of S3.
// Frozen with the S3 tests; read-only to every builder.

import { expect, it } from 'vitest';

import { FakeServer, MIA, REJECT_STATE, available, onLoan } from './_fake-server.js';
import { S, rowOf, rowsShown, screen, settle, showList, statusOf, within } from './_harness.js';

it('T-008-P2 REQ-008.5 a Borrow of an item that is no longer available fails and changes nothing', async () => {
  const server = new FakeServer([available(1, 'Projector'), onLoan(2, 'Laptop', MIA)]).answer(
    'borrow',
    REJECT_STATE,
  );
  const { user } = await showList(server, MIA);
  // Found first: the Available row the person is about to borrow.
  const rowsBefore = rowsShown();
  expect(statusOf(1)).toBe(S.available);
  const dataBefore = server.data();

  await user.click(within(rowOf(1)).getByTestId('btn-borrow'));

  const modal = await screen.findByTestId('modal-api-failure');
  expect(within(modal).getByTestId('btn-close')).toBeInTheDocument();
  expect(within(modal).getByTestId('btn-retry')).toBeInTheDocument();

  await settle(server);
  expect(rowsShown()).toEqual(rowsBefore);
  expect(statusOf(1)).toBe(S.available);
  expect(server.data()).toEqual(dataBefore);
  expect(server.find(1).borrowerId).toBeNull();
});
