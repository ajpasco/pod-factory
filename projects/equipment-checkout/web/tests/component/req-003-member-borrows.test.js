// REQ-003: a member borrows for themselves. The six C rows of S3.
// Frozen with the S3 tests; read-only to every builder.

import { expect, it } from 'vitest';

import { ADA, FakeServer, MIA, REFUSE, SAM, available, onLoan } from './_fake-server.js';
import {
  S,
  anyModal,
  memberButtons,
  modalBody,
  pick,
  rowHas,
  rowOf,
  screen,
  settle,
  showList,
  statusOf,
  waitFor,
  within,
} from './_harness.js';

it('T-003-P1 REQ-003.1 every Available row offers the member the Borrow icon', async () => {
  const server = new FakeServer([
    available(1, 'Projector'),
    available(2, 'Microphone'),
    onLoan(3, 'Laptop', SAM),
    available(4, 'Tripod'),
  ]);
  await showList(server, MIA);

  for (const id of [1, 2, 4]) {
    expect(rowHas(id, 'btn-borrow'), `the Borrow icon on row ${id}`).toBe(true);
  }
});

it('T-003-P2 REQ-003.2 REQ-003.3 one activation is the whole of a member Borrow', async () => {
  const server = new FakeServer([available(1, 'Projector')]).hold('borrow');
  const { user } = await showList(server, MIA);

  await user.click(within(rowOf(1)).getByTestId('btn-borrow'));

  // No further step is asked of her, and the request has started.
  expect(anyModal()).toBeNull();
  expect(memberButtons()).toHaveLength(0);
  expect(within(rowOf(1)).getByTestId('row-loader')).toBeInTheDocument();

  await settle(server);
  expect(server.find(1)).toMatchObject({
    status: 'on_loan',
    borrowerId: MIA.id,
    borrowerName: MIA.name,
  });
  expect(statusOf(1)).toBe(S.onLoan(MIA.name));
});

it('T-003-P3 REQ-003.4 the row names the member who borrowed', async () => {
  for (const member of [MIA, SAM]) {
    const server = new FakeServer([available(1, 'Projector')]).hold('borrow');
    const { user, unmount } = await showList(server, member);
    await user.click(within(rowOf(1)).getByTestId('btn-borrow'));
    await settle(server);
    expect(statusOf(1), `the row after ${member.name} borrowed`).toBe(S.onLoan(member.name));
    unmount();
  }
});

it('T-003-P8 REQ-003.7 REQ-003.8 a member may hold more than one item at a time', async () => {
  const server = new FakeServer([
    onLoan(1, 'Laptop', MIA),
    available(2, 'Projector'),
    available(3, 'Tripod'),
  ]);
  const { user } = await showList(server, MIA);

  expect(rowHas(2, 'btn-borrow')).toBe(true);
  expect(rowHas(3, 'btn-borrow')).toBe(true);

  await user.click(within(rowOf(2)).getByTestId('btn-borrow'));
  await settle(server);

  expect(statusOf(2)).toBe(S.onLoan(MIA.name));
  expect(statusOf(1)).toBe(S.onLoan(MIA.name));
});

it('T-003-N1 REQ-003.5 a member is never asked who the borrower is, though an admin is', async () => {
  const server = new FakeServer([available(1, 'Projector'), available(2, 'Tripod')]);
  const { user } = await showList(server, ADA);

  // First, for the user who has the feature: Ada's Borrow asks who is borrowing.
  await user.click(within(rowOf(1)).getByTestId('btn-borrow'));
  expect(await screen.findByTestId('modal-borrower')).toBeInTheDocument();
  expect(screen.getByTestId(`member-button-${MIA.id}`)).toBeInTheDocument();
  expect(screen.getByTestId(`member-button-${SAM.id}`)).toBeInTheDocument();
  await user.click(screen.getByTestId('btn-close'));

  await pick(user, MIA);
  await waitFor(() => {
    expect(screen.getAllByTestId('row')).toHaveLength(2);
  });

  server.hold('borrow');
  await user.click(within(rowOf(1)).getByTestId('btn-borrow'));
  // Her own Borrow has started, so the absence below is not the absence of everything.
  expect(within(rowOf(1)).getByTestId('row-loader')).toBeInTheDocument();

  expect(memberButtons()).toHaveLength(0);
  const selects = Array.from(globalThis.document.querySelectorAll('select'));
  expect(selects).toEqual([screen.getByTestId('switcher')]);
  expect(globalThis.document.querySelectorAll('input[type="text"], textarea')).toHaveLength(0);
  await settle(server);
});

it('T-003-N4 REQ-003.6 a refused Borrow shows the Access denied modal and changes nothing', async () => {
  const server = new FakeServer([available(1, 'Projector')]).answer('borrow', REFUSE);
  const { user } = await showList(server, MIA);
  expect(rowHas(1, 'btn-borrow')).toBe(true);

  await user.click(within(rowOf(1)).getByTestId('btn-borrow'));

  expect(await screen.findByTestId('modal-access-denied')).toBeInTheDocument();
  expect(modalBody('modal-access-denied')).toBe(S.accessDeniedBody);
  expect(statusOf(1)).toBe(S.available);
  expect(rowHas(1, 'btn-borrow')).toBe(true);
  expect(within(rowOf(1)).queryByTestId('row-loader')).toBeNull();
});
