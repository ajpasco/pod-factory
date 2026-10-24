// REQ-005: admins cannot borrow for themselves. The two C rows of S3.
// Frozen with the S3 tests; read-only to every builder.

import { expect, it } from 'vitest';

import { ADA, FakeServer, MIA, SAM, available, outOfService } from './_fake-server.js';
import {
  S,
  memberButtons,
  pick,
  rowOf,
  rowsShown,
  screen,
  settle,
  showList,
  statusOf,
  testidOf,
  waitFor,
  within,
} from './_harness.js';
import { lendTo } from './_states.js';

const memberButtonIds = () => memberButtons().map(testidOf).sort();

it('T-005-N1 REQ-005.1 the borrower modal never offers the admin, on any row or after switching back', async () => {
  const server = new FakeServer([
    available(1, 'Projector'),
    available(2, 'Tripod'),
    available(3, 'Microphone'),
  ]);
  const { user } = await showList(server, ADA);

  const openAndCheck = async (id, where) => {
    await user.click(within(rowOf(id)).getByTestId('btn-borrow'));
    await screen.findByTestId('modal-borrower');
    // Found first: the two members are offered, so the absence below is not of
    // everything.
    expect(memberButtonIds(), where).toEqual(['member-button-2', 'member-button-3']);
    expect(screen.queryByTestId(`member-button-${ADA.id}`), where).toBeNull();
    await user.click(screen.getByTestId('btn-close'));
  };

  for (const id of [1, 2, 3]) await openAndCheck(id, `row ${id}`);

  await pick(user, MIA);
  await waitFor(() => {
    expect(screen.getAllByTestId('row')).toHaveLength(3);
  });
  await pick(user, ADA);
  await waitFor(() => {
    expect(screen.getAllByTestId('row')).toHaveLength(3);
  });

  await openAndCheck(1, 'after switching to Mia and back to Ada');
});

it('T-005-N2 REQ-005.2 no admin action ever leaves an item on loan to the admin', async () => {
  const server = new FakeServer([
    available(1, 'Projector'),
    available(2, 'Tripod'),
    available(3, 'Microphone'),
    available(4, 'Stand'),
    available(5, 'Cable'),
    outOfService(6, 'Camera'),
  ]);
  const { user } = await showList(server, ADA);

  const noLoanToAda = async (step) => {
    await settle(server);
    // Found first at every step: the rows are there to be read.
    expect(rowsShown().length, step).toBeGreaterThan(0);
    for (const row of rowsShown()) {
      expect(row.status, `${step}: row ${row.id}`).not.toBe(S.onLoan(ADA.name));
    }
    for (const held of server.data()) {
      expect(held.borrowerId, `${step}: item ${held.id} in the data`).not.toBe(ADA.id);
      expect(held.borrowerName, `${step}: item ${held.id} in the data`).not.toBe(ADA.name);
    }
  };

  await noLoanToAda('before any action');

  // Lends one item to Mia Member.
  await lendTo(user, 1, MIA);
  await noLoanToAda('after lending to Mia');
  expect(statusOf(1)).toBe(S.onLoan(MIA.name));

  // Returns it.
  await user.click(within(rowOf(1)).getByTestId('btn-return'));
  await noLoanToAda('after the return');
  expect(statusOf(1)).toBe(S.available);

  // Lends another to Sam Member.
  await lendTo(user, 2, SAM);
  await noLoanToAda('after lending to Sam');
  expect(statusOf(2)).toBe(S.onLoan(SAM.name));

  // Marks a third out of service and restores it.
  await user.click(within(rowOf(3)).getByTestId('btn-out-of-service'));
  await noLoanToAda('after marking out of service');
  await user.click(within(rowOf(3)).getByTestId('btn-restore'));
  await noLoanToAda('after the restore');

  // Adds an item.
  await user.type(screen.getByTestId('add-input'), 'Lectern');
  await user.click(screen.getByTestId('btn-add'));
  await noLoanToAda('after the Add');

  // Cancels one delete and confirms another.
  await user.click(within(rowOf(4)).getByTestId('btn-delete'));
  await user.click(screen.getByTestId('btn-cancel'));
  await noLoanToAda('after the cancelled delete');
  await user.click(within(rowOf(5)).getByTestId('btn-delete'));
  await user.click(screen.getByTestId('btn-confirm'));
  await noLoanToAda('after the confirmed delete');

  expect(server.find(5)).toBeUndefined();
  expect(server.named('Lectern')).toHaveLength(1);
});
