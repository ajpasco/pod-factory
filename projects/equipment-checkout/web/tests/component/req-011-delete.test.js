// REQ-011: delete equipment with confirmation. The seven C rows of S3.
// Frozen with the S3 tests; read-only to every builder.

import { expect, it } from 'vitest';

import { ADA, FakeServer, MIA, SAM, available, onLoan, outOfService } from './_fake-server.js';
import {
  S,
  anyLoader,
  modalTitle,
  pick,
  rowHas,
  rowOf,
  rowsShown,
  screen,
  settle,
  showList,
  testidOf,
  waitFor,
  within,
} from './_harness.js';

const MIXED = () => [available(1, 'Tripod'), onLoan(2, 'Laptop', MIA), outOfService(3, 'Camera')];

it('T-011-P1 REQ-011.1 the Delete x icon is on every row that is not on loan', async () => {
  const server = new FakeServer(MIXED());
  await showList(server, ADA);

  expect(rowHas(1, 'btn-delete')).toBe(true);
  expect(rowHas(3, 'btn-delete')).toBe(true);
});

it('T-011-P2 REQ-011.3 Delete x asks first and removes nothing yet', async () => {
  const server = new FakeServer(MIXED());
  const { user } = await showList(server, ADA);
  server.hold();

  await user.click(within(rowOf(1)).getByTestId('btn-delete'));

  expect(await screen.findByTestId('modal-confirm-delete')).toBeInTheDocument();
  expect(modalTitle('modal-confirm-delete')).toBe(S.confirmDeleteTitle('Tripod'));
  expect(within(rowOf(1)).queryByTestId('row-loader')).toBeNull();
  expect(rowOf(1)).not.toBeNull();

  server.release();
  await settle(server);
  expect(server.find(1)).toMatchObject({ name: 'Tripod' });
});

it('T-011-P3 REQ-011.4 the confirm-delete modal has a Cancel and a Confirm icon and no other button', async () => {
  const server = new FakeServer(MIXED());
  const { user } = await showList(server, ADA);

  await user.click(within(rowOf(1)).getByTestId('btn-delete'));
  const modal = await screen.findByTestId('modal-confirm-delete');

  expect(Array.from(modal.querySelectorAll('button')).map(testidOf).sort()).toEqual([
    'btn-cancel',
    'btn-confirm',
  ]);
});

it('T-011-P4 REQ-011.6 REQ-011.7 Confirm removes the item once the back-end has carried it out', async () => {
  const server = new FakeServer(MIXED()).hold('delete');
  const { user } = await showList(server, ADA);

  await user.click(within(rowOf(1)).getByTestId('btn-delete'));
  await screen.findByTestId('modal-confirm-delete');
  await user.click(screen.getByTestId('btn-confirm'));

  expect(within(rowOf(1)).getByTestId('row-loader')).toBeInTheDocument();
  expect(rowsShown().map((row) => row.id)).toContain(1);

  await settle(server);
  expect(rowsShown().map((row) => row.id)).not.toContain(1);
  expect(rowOf(1)).toBeNull();
});

it('T-011-N1 REQ-011.2 a row on loan offers no Delete x', async () => {
  const server = new FakeServer(MIXED());
  await showList(server, ADA);
  // Found first: the feature exists, on the rows that are not on loan.
  expect(rowHas(1, 'btn-delete')).toBe(true);
  expect(rowHas(3, 'btn-delete')).toBe(true);

  expect(rowHas(2, 'btn-delete')).toBe(false);
});

it('T-011-N2 REQ-011.9 a member is offered no Delete x, though the admin is', async () => {
  const server = new FakeServer(MIXED());
  const { user } = await showList(server, ADA);
  // Found first, for the user who has the feature.
  expect(rowHas(1, 'btn-delete')).toBe(true);
  expect(rowHas(3, 'btn-delete')).toBe(true);

  for (const member of [MIA, SAM]) {
    await pick(user, member);
    await waitFor(() => {
      expect(screen.getAllByTestId('row')).toHaveLength(server.items.length);
    });
    expect(rowHas(1, 'btn-borrow'), member.name).toBe(true);
    for (const row of rowsShown()) {
      expect(rowHas(row.id, 'btn-delete'), `${member.name}, row ${row.id}`).toBe(false);
    }
  }
});

it('T-011-N3 REQ-011.5 Cancel keeps the item and changes nothing', async () => {
  const server = new FakeServer(MIXED());
  const { user } = await showList(server, ADA);
  const rowsBefore = rowsShown();
  expect(rowsBefore).toHaveLength(3);

  await user.click(within(rowOf(1)).getByTestId('btn-delete'));
  await screen.findByTestId('modal-confirm-delete');
  const dataBefore = server.data();
  server.hold();
  await user.click(screen.getByTestId('btn-cancel'));

  expect(screen.queryByTestId('modal-confirm-delete')).toBeNull();
  expect(anyLoader()).toBe(0);

  server.release();
  await settle(server);
  expect(rowsShown()).toEqual(rowsBefore);
  expect(server.data()).toEqual(dataBefore);
});
