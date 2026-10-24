// REQ-010: the out-of-service status. The ten C rows of S3.
// Frozen with the S3 tests; read-only to every builder.

import { expect, it } from 'vitest';

import {
  ADA,
  FakeServer,
  MIA,
  REJECT_ERROR,
  REJECT_STATE,
  SAM,
  available,
  onLoan,
  outOfService,
} from './_fake-server.js';
import {
  S,
  pick,
  rowHas,
  rowOf,
  rowsShown,
  screen,
  settle,
  showList,
  statusOf,
  waitFor,
  within,
} from './_harness.js';

/** Available, On loan to Mia, and Out of service, plus a second Available row. */
const MIXED = () => [
  available(1, 'Projector'),
  onLoan(2, 'Laptop', MIA),
  outOfService(3, 'Camera'),
  available(4, 'Tripod'),
  outOfService(5, 'Stand'),
];

it('T-010-P1 REQ-010.1 every Available row offers the admin Mark out of service', async () => {
  const server = new FakeServer(MIXED());
  await showList(server, ADA);

  for (const id of [1, 4]) {
    expect(rowHas(id, 'btn-out-of-service'), `row ${id}`).toBe(true);
  }
});

it('T-010-P2 REQ-010.4 every Out of service row offers the admin Restore', async () => {
  const server = new FakeServer(MIXED());
  await showList(server, ADA);

  for (const id of [3, 5]) {
    expect(rowHas(id, 'btn-restore'), `row ${id}`).toBe(true);
  }
});

it('T-010-P3 REQ-010.3 marking an item out of service changes its status', async () => {
  const server = new FakeServer([available(1, 'Projector')]);
  const { user } = await showList(server, ADA);

  await user.click(within(rowOf(1)).getByTestId('btn-out-of-service'));
  await settle(server);

  expect(statusOf(1)).toBe(S.outOfService);
});

it('T-010-P4 REQ-010.6 a restored item is available again and offers Mark out of service', async () => {
  const server = new FakeServer([outOfService(1, 'Camera')]);
  const { user } = await showList(server, ADA);

  await user.click(within(rowOf(1)).getByTestId('btn-restore'));
  await settle(server);

  expect(statusOf(1)).toBe(S.available);
  expect(rowHas(1, 'btn-out-of-service')).toBe(true);
  expect(rowHas(1, 'btn-restore')).toBe(false);
});

it('T-010-P9 REQ-010.3 the row loader shows until the Mark out of service is confirmed', async () => {
  const server = new FakeServer([available(1, 'Projector')]).hold('out-of-service');
  const { user } = await showList(server, ADA);

  await user.click(within(rowOf(1)).getByTestId('btn-out-of-service'));
  expect(within(rowOf(1)).getByTestId('row-loader')).toBeInTheDocument();
  expect(statusOf(1)).toBe(S.available);

  await settle(server);
  expect(within(rowOf(1)).queryByTestId('row-loader')).toBeNull();
  expect(statusOf(1)).toBe(S.outOfService);
});

it('T-010-P10 REQ-010.6 the row loader shows until the Restore is confirmed', async () => {
  const server = new FakeServer([outOfService(1, 'Camera')]).hold('restore');
  const { user } = await showList(server, ADA);

  await user.click(within(rowOf(1)).getByTestId('btn-restore'));
  expect(within(rowOf(1)).getByTestId('row-loader')).toBeInTheDocument();
  expect(statusOf(1)).toBe(S.outOfService);

  await settle(server);
  expect(within(rowOf(1)).queryByTestId('row-loader')).toBeNull();
  expect(statusOf(1)).toBe(S.available);
});

it('T-010-N1 REQ-010.2 only an Available row offers Mark out of service', async () => {
  const server = new FakeServer(MIXED());
  await showList(server, ADA);
  // Found first: the feature exists, on the Available row.
  expect(rowHas(1, 'btn-out-of-service')).toBe(true);

  for (const id of [2, 3, 5]) {
    expect(rowHas(id, 'btn-out-of-service'), `row ${id}`).toBe(false);
  }
});

it('T-010-N2 REQ-010.5 only an Out of service row offers Restore', async () => {
  const server = new FakeServer(MIXED());
  await showList(server, ADA);
  // Found first: the feature exists, on the Out of service row.
  expect(rowHas(3, 'btn-restore')).toBe(true);

  for (const id of [1, 2, 4]) {
    expect(rowHas(id, 'btn-restore'), `row ${id}`).toBe(false);
  }
});

it('T-010-N3 REQ-010.7 a member is offered neither Mark out of service nor Restore, though the admin is', async () => {
  const server = new FakeServer(MIXED());
  const { user } = await showList(server, ADA);
  // Found first, for the user who has both features.
  expect(rowHas(1, 'btn-out-of-service')).toBe(true);
  expect(rowHas(3, 'btn-restore')).toBe(true);

  for (const member of [MIA, SAM]) {
    await pick(user, member);
    await waitFor(() => {
      expect(screen.getAllByTestId('row')).toHaveLength(server.items.length);
    });
    // The Available row is found with the control a member does have.
    expect(rowHas(1, 'btn-borrow'), member.name).toBe(true);
    for (const row of rowsShown()) {
      expect(rowHas(row.id, 'btn-out-of-service'), `${member.name}, row ${row.id}`).toBe(false);
      expect(rowHas(row.id, 'btn-restore'), `${member.name}, row ${row.id}`).toBe(false);
    }
  }
});

it('T-010-N5 a failed Mark out of service or Restore opens the API failure modal and keeps the statuses', async () => {
  const server = new FakeServer([available(1, 'Projector'), outOfService(2, 'Camera')]);
  const { user } = await showList(server, ADA);
  // Found first: both rows, in the statuses the row speaks of.
  expect(statusOf(1)).toBe(S.available);
  expect(statusOf(2)).toBe(S.outOfService);

  server.answer('out-of-service', REJECT_STATE);
  await user.click(within(rowOf(1)).getByTestId('btn-out-of-service'));
  let modal = await screen.findByTestId('modal-api-failure');
  expect(within(modal).getByTestId('btn-close')).toBeInTheDocument();
  expect(within(modal).getByTestId('btn-retry')).toBeInTheDocument();
  await user.click(within(modal).getByTestId('btn-close'));

  server.answer('restore', REJECT_ERROR);
  await user.click(within(rowOf(2)).getByTestId('btn-restore'));
  modal = await screen.findByTestId('modal-api-failure');
  expect(within(modal).getByTestId('btn-close')).toBeInTheDocument();
  expect(within(modal).getByTestId('btn-retry')).toBeInTheDocument();
  await user.click(within(modal).getByTestId('btn-close'));

  expect(statusOf(1)).toBe(S.available);
  expect(statusOf(2)).toBe(S.outOfService);
});
