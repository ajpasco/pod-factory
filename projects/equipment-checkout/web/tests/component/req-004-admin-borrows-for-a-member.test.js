// REQ-004: an admin borrows on behalf of a member. The ten C rows of S3.
// Frozen with the S3 tests; read-only to every builder.

import { expect, it } from 'vitest';

import {
  ADA,
  EVERY_REJECTION,
  FakeServer,
  MIA,
  OFFLINE,
  SAM,
  available,
  onLoan,
} from './_fake-server.js';
import {
  S,
  anyModal,
  memberButtons,
  readableTextOutsideTopBar,
  rowOf,
  rowsShown,
  screen,
  settle,
  showList,
  statusOf,
  testidOf,
  textOf,
  within,
} from './_harness.js';
import { lendTo } from './_states.js';

const memberButtonIds = () => memberButtons().map(testidOf).sort();

it("T-004-P1 REQ-004.1 an admin's Borrow asks who is borrowing and starts nothing yet", async () => {
  const server = new FakeServer([available(1, 'Projector')]);
  const { user } = await showList(server, ADA);
  server.hold();

  await user.click(within(rowOf(1)).getByTestId('btn-borrow'));

  expect(await screen.findByTestId('modal-borrower')).toBeInTheDocument();
  expect(within(rowOf(1)).queryByTestId('row-loader')).toBeNull();
  expect(statusOf(1)).toBe(S.available);

  server.release();
  await settle(server);
  expect(server.find(1)).toMatchObject({
    status: 'available',
    borrowerId: null,
    borrowerName: null,
  });
});

it('T-004-P2 REQ-004.2 the borrower modal offers exactly the two members and a Close icon', async () => {
  const server = new FakeServer([available(1, 'Projector')]);
  const { user } = await showList(server, ADA);

  await user.click(within(rowOf(1)).getByTestId('btn-borrow'));
  const modal = await screen.findByTestId('modal-borrower');

  expect(memberButtonIds()).toEqual(['member-button-2', 'member-button-3']);
  expect(within(modal).getByTestId('btn-close')).toBeInTheDocument();
  expect(screen.queryByTestId(`member-button-${ADA.id}`)).toBeNull();
  expect(screen.queryByTestId('member-button-4')).toBeNull();
});

it('T-004-P3 REQ-004.5 choosing the member is the whole of the request', async () => {
  const server = new FakeServer([available(1, 'Projector')]);
  const { user } = await showList(server, ADA);
  await user.click(within(rowOf(1)).getByTestId('btn-borrow'));
  await screen.findByTestId('modal-borrower');

  server.hold('borrow');
  await user.click(screen.getByTestId(`member-button-${MIA.id}`));

  expect(within(rowOf(1)).getByTestId('row-loader')).toBeInTheDocument();
  expect(statusOf(1)).toBe(S.available);

  await settle(server);
  expect(server.find(1)).toMatchObject({
    status: 'on_loan',
    borrowerId: MIA.id,
    borrowerName: MIA.name,
  });
});

it('T-004-P4 REQ-004.6 the row names the member the admin chose', async () => {
  for (const member of [MIA, SAM]) {
    const server = new FakeServer([available(1, 'Projector')]).hold('borrow');
    const { user, unmount } = await showList(server, ADA);
    await lendTo(user, 1, member);
    await settle(server);
    expect(statusOf(1), `the row after Ada lent it to ${member.name}`).toBe(S.onLoan(member.name));
    unmount();
  }
});

it('T-004-P8 REQ-004.7 a member who already holds an item is offered just as before', async () => {
  const freeServer = new FakeServer([available(1, 'Projector')]);
  const free = await showList(freeServer, ADA);
  await free.user.click(within(rowOf(1)).getByTestId('btn-borrow'));
  await screen.findByTestId('modal-borrower');
  const whenNobodyHolds = memberButtonIds();
  const labelsWhenNobodyHolds = memberButtons().map((each) => [
    each.getAttribute('title'),
    each.getAttribute('aria-label'),
  ]);
  free.unmount();

  const server = new FakeServer([onLoan(1, 'Laptop', MIA), available(2, 'Projector')]);
  const { user } = await showList(server, ADA);
  await user.click(within(rowOf(2)).getByTestId('btn-borrow'));
  await screen.findByTestId('modal-borrower');

  expect(memberButtonIds()).toEqual(whenNobodyHolds);
  expect(
    memberButtons().map((each) => [each.getAttribute('title'), each.getAttribute('aria-label')]),
  ).toEqual(labelsWhenNobodyHolds);
  for (const member of [MIA, SAM]) {
    const button = screen.getByTestId(`member-button-${member.id}`);
    expect(button.getAttribute('title')).toBe(S.memberButtonLabel(member));
    expect(button.getAttribute('aria-label')).toBe(S.memberButtonLabel(member));
  }
});

it('T-004-P9 REQ-004.8 a second loan to the same member leaves her first one standing', async () => {
  const server = new FakeServer([onLoan(1, 'Laptop', MIA), available(2, 'Projector')]).hold(
    'borrow',
  );
  const { user } = await showList(server, ADA);

  await lendTo(user, 2, MIA);
  expect(within(rowOf(2)).getByTestId('row-loader')).toBeInTheDocument();

  await settle(server);
  expect(statusOf(2)).toBe(S.onLoan(MIA.name));
  expect(statusOf(1)).toBe(S.onLoan(MIA.name));
});

it('T-004-N1 REQ-004.3 the admin is never offered as a borrower, on any row', async () => {
  const server = new FakeServer([
    available(1, 'Projector'),
    available(2, 'Tripod'),
    available(3, 'Microphone'),
  ]);
  const { user } = await showList(server, ADA);

  for (const id of [1, 2, 3]) {
    await user.click(within(rowOf(id)).getByTestId('btn-borrow'));
    const modal = await screen.findByTestId('modal-borrower');
    // Found first: the two members are offered.
    expect(memberButtonIds()).toEqual(['member-button-2', 'member-button-3']);
    expect(screen.queryByTestId(`member-button-${ADA.id}`)).toBeNull();
    expect(textOf(modal)).not.toContain(ADA.name);
    await user.click(within(modal).getByTestId('btn-close'));
  }

  for (const row of rowsShown()) {
    expect(row.status).not.toBe(S.onLoan(ADA.name));
  }
});

it('T-004-N2 REQ-004.4 closing the borrower modal changes nothing', async () => {
  const server = new FakeServer([
    available(1, 'Projector'),
    onLoan(2, 'Laptop', MIA),
    available(3, 'Tripod'),
  ]);
  const { user } = await showList(server, ADA);
  const before = server.data();
  const rowsBefore = rowsShown();
  expect(rowsBefore).toHaveLength(3);

  await user.click(within(rowOf(1)).getByTestId('btn-borrow'));
  await screen.findByTestId('modal-borrower');
  server.hold();
  await user.click(screen.getByTestId('btn-close'));

  expect(screen.queryByTestId('modal-borrower')).toBeNull();
  expect(screen.queryAllByTestId('row-loader')).toHaveLength(0);

  server.release();
  await settle(server);
  expect(server.data()).toEqual(before);
  expect(rowsShown()).toEqual(rowsBefore);
});

it('T-004-N3 REQ-004.9 the page never names the admin who set the loan outside the top bar', async () => {
  const server = new FakeServer([available(1, 'Projector')]);
  const { user } = await showList(server, ADA);

  await lendTo(user, 1, MIA);
  await settle(server);

  // Found first: the loan is shown, so the page is in the state the row speaks of.
  expect(statusOf(1)).toBe(S.onLoan(MIA.name));
  expect(anyModal()).toBeNull();

  const outside = readableTextOutsideTopBar().toLowerCase();
  expect(outside).not.toContain('ada');
  expect(outside).not.toContain('admin');
});

it('T-004-N8 REQ-004.11 REQ-004.12 a rejected admin Borrow shows the API failure modal, never Access denied', async () => {
  for (const rejection of [...EVERY_REJECTION, OFFLINE]) {
    const server = new FakeServer([available(1, 'Projector')]);
    const { user, unmount } = await showList(server, ADA);
    server.answer('borrow', rejection);

    await lendTo(user, 1, MIA);

    const modal = await screen.findByTestId('modal-api-failure');
    expect(within(rowOf(1)).queryByTestId('row-loader'), rejection).toBeNull();
    expect(within(modal).getByTestId('btn-close')).toBeInTheDocument();
    expect(within(modal).getByTestId('btn-retry')).toBeInTheDocument();
    expect(screen.queryByTestId('modal-access-denied'), rejection).toBeNull();
    expect(statusOf(1), rejection).toBe(S.available);
    unmount();
  }
});
