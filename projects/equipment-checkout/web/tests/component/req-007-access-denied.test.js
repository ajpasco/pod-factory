// REQ-007: refuse unauthorized actions with the Access denied modal. The four C rows of S3.
// Frozen with the S3 tests; read-only to every builder.

import { expect, it } from 'vitest';

import { ADA, FakeServer, MIA, REFUSE, available, onLoan, outOfService } from './_fake-server.js';
import {
  S,
  anyLoader,
  iconButtons,
  modalBody,
  modalTitle,
  rowOf,
  rowsShown,
  screen,
  settle,
  showList,
  statusOf,
  testidOf,
  within,
} from './_harness.js';

const THREE = () => [
  available(1, 'Projector'),
  onLoan(2, 'Laptop', MIA),
  outOfService(3, 'Camera'),
];

it('T-007-P1 REQ-007.6 every refused action shows the Access denied modal and changes nothing', async () => {
  const server = new FakeServer(THREE());
  const { user } = await showList(server, ADA);
  // Found first: the three rows in their three statuses.
  const rowsBefore = rowsShown();
  expect(rowsBefore).toHaveLength(3);
  const dataBefore = server.data();

  const refusalShows = async (what) => {
    expect(await screen.findByTestId('modal-access-denied'), what).toBeInTheDocument();
    expect(modalTitle('modal-access-denied'), what).toBe(S.accessDeniedTitle);
    expect(modalBody('modal-access-denied'), what).toBe(S.accessDeniedBody);
    await user.click(screen.getByTestId('btn-ok'));
  };

  server.answer('return', REFUSE);
  await user.click(within(rowOf(2)).getByTestId('btn-return'));
  await refusalShows('a refused Return');

  server.answer('delete', REFUSE);
  await user.click(within(rowOf(1)).getByTestId('btn-delete'));
  await user.click(screen.getByTestId('btn-confirm'));
  await refusalShows('a refused Delete');

  server.answer('add', REFUSE);
  await user.type(screen.getByTestId('add-input'), 'Lectern');
  await user.click(screen.getByTestId('btn-add'));
  await refusalShows('a refused Add');

  server.answer('out-of-service', REFUSE);
  await user.click(within(rowOf(1)).getByTestId('btn-out-of-service'));
  await refusalShows('a refused Mark out of service');

  server.answer('restore', REFUSE);
  await user.click(within(rowOf(3)).getByTestId('btn-restore'));
  await refusalShows('a refused Restore');

  await settle(server);
  expect(rowsShown()).toEqual(rowsBefore);
  expect(server.data()).toEqual(dataBefore);
});

it('T-007-P2 REQ-007.7 the Access denied modal has one button, its OK icon', async () => {
  const server = new FakeServer(THREE()).answer('return', REFUSE);
  const { user } = await showList(server, ADA);

  await user.click(within(rowOf(2)).getByTestId('btn-return'));
  const modal = await screen.findByTestId('modal-access-denied');

  expect(within(modal).getByTestId('btn-ok')).toBeInTheDocument();
  expect(Array.from(modal.querySelectorAll('button')).map(testidOf)).toEqual(['btn-ok']);
  expect(within(modal).queryByTestId('btn-close')).toBeNull();
  expect(within(modal).queryByTestId('btn-retry')).toBeNull();
});

it('T-007-P3 REQ-007.8 OK closes the Access denied modal and changes nothing', async () => {
  const server = new FakeServer(THREE()).answer('return', REFUSE);
  const { user } = await showList(server, ADA);
  const rowsBefore = rowsShown();
  expect(rowsBefore).toHaveLength(3);

  await user.click(within(rowOf(2)).getByTestId('btn-return'));
  await screen.findByTestId('modal-access-denied');

  const dataBefore = server.data();
  server.hold();
  await user.click(screen.getByTestId('btn-ok'));

  expect(screen.queryByTestId('modal-access-denied')).toBeNull();
  expect(rowsShown()).toEqual(rowsBefore);
  expect(anyLoader()).toBe(0);

  server.release();
  await settle(server);
  expect(server.data()).toEqual(dataBefore);
});

it('T-007-N8 REQ-007.6 an allowed action never shows the Access denied modal', async () => {
  const server = new FakeServer([available(1, 'Projector'), onLoan(2, 'Laptop', MIA)]);
  const { user } = await showList(server, MIA);
  // Found first: the Available row and her own loan.
  expect(statusOf(1)).toBe(S.available);
  expect(statusOf(2)).toBe(S.onLoan(MIA.name));
  expect(screen.queryByTestId('modal-access-denied')).toBeNull();

  await user.click(within(rowOf(1)).getByTestId('btn-borrow'));
  await settle(server);
  expect(statusOf(1)).toBe(S.onLoan(MIA.name));
  expect(screen.queryByTestId('modal-access-denied')).toBeNull();

  await user.click(within(rowOf(2)).getByTestId('btn-return'));
  await settle(server);
  expect(statusOf(2)).toBe(S.available);
  expect(screen.queryByTestId('modal-access-denied')).toBeNull();

  expect(iconButtons().length).toBeGreaterThan(0);
});
