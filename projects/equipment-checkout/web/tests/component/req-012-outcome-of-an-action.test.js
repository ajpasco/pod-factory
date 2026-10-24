// REQ-012: the outcome of a server-call action. The fourteen C rows of S3.
// Frozen with the S3 tests; read-only to every builder.
//
// Several rows name more than one action ("each of the six actions ... with its answer
// held"). Whether the client allows two such requests to be in flight at the same time is
// not pinned (blueprint 12.11), so each action is driven on its own page: the row asserts
// what a person sees of one action at a time and never assumes concurrency the contract
// does not require.

import { expect, it } from 'vitest';

import {
  ADA,
  EVERY_REJECTION,
  FakeServer,
  MIA,
  OFFLINE,
  REFUSE,
  REJECT_ERROR,
  SAM,
  available,
  onLoan,
  outOfService,
} from './_fake-server.js';
import {
  S,
  anyLoader,
  readableTextOutsideListAndModals,
  rowOf,
  rowsShown,
  screen,
  settle,
  showList,
  statusOf,
  textOf,
  waitFor,
  watchLoadersWhileFailureShows,
  within,
} from './_harness.js';
import { lendTo } from './_states.js';

const FOUR_ITEMS = () => [
  available(1, 'Projector'),
  onLoan(2, 'Laptop', MIA),
  available(3, 'Tripod'),
  outOfService(4, 'Camera'),
];

/**
 * The four actions of REQ-012.1 to REQ-012.3, each as the person performs it, with the
 * row it affects and the status that row should read once the action is confirmed.
 */
const FOUR_ACTIONS = [
  {
    what: "a member's Borrow",
    actingUser: MIA,
    itemId: 1,
    holds: 'borrow',
    run: async (user) => {
      await user.click(within(rowOf(1)).getByTestId('btn-borrow'));
    },
    then: () => expect(statusOf(1)).toBe(S.onLoan(MIA.name)),
  },
  {
    what: "an admin's Borrow after choosing Mia Member",
    actingUser: ADA,
    itemId: 1,
    holds: 'borrow',
    run: async (user) => {
      await lendTo(user, 1, MIA);
    },
    then: () => expect(statusOf(1)).toBe(S.onLoan(MIA.name)),
  },
  {
    what: 'a Return',
    actingUser: ADA,
    itemId: 2,
    holds: 'return',
    run: async (user) => {
      await user.click(within(rowOf(2)).getByTestId('btn-return'));
    },
    then: () => expect(statusOf(2)).toBe(S.available),
  },
  {
    what: 'a Delete after Confirm',
    actingUser: ADA,
    itemId: 3,
    holds: 'delete',
    run: async (user) => {
      await user.click(within(rowOf(3)).getByTestId('btn-delete'));
      await screen.findByTestId('modal-confirm-delete');
      await user.click(screen.getByTestId('btn-confirm'));
    },
    then: () => expect(rowOf(3)).toBeNull(),
  },
];

/** The six actions of REQ-012.5, REQ-012.14 and the failure rows. */
const SIX_ACTIONS = [
  ...FOUR_ACTIONS.filter((each) => each.what !== "an admin's Borrow after choosing Mia Member"),
  {
    what: 'an Add',
    actingUser: ADA,
    itemId: null,
    holds: 'add',
    run: async (user) => {
      await user.type(screen.getByTestId('add-input'), 'Lectern');
      await user.keyboard('{Enter}');
    },
  },
  {
    what: 'a Mark out of service',
    actingUser: ADA,
    itemId: 1,
    holds: 'out-of-service',
    run: async (user) => {
      await user.click(within(rowOf(1)).getByTestId('btn-out-of-service'));
    },
  },
  {
    what: 'a Restore',
    actingUser: ADA,
    itemId: 4,
    holds: 'restore',
    run: async (user) => {
      await user.click(within(rowOf(4)).getByTestId('btn-restore'));
    },
  },
];

const loaderFor = (action) =>
  action.itemId === null
    ? screen.queryByTestId('add-loader')
    : within(rowOf(action.itemId)).queryByTestId('row-loader');

it('T-012-P1 REQ-012.1 REQ-012.2 each action shows its loader and changes nothing until the answer arrives', async () => {
  for (const action of FOUR_ACTIONS) {
    const server = new FakeServer(FOUR_ITEMS()).hold(action.holds);
    const { user, unmount } = await showList(server, action.actingUser);
    const rowsBefore = rowsShown();

    await action.run(user);

    expect(loaderFor(action), action.what).not.toBeNull();
    expect(rowsShown(), action.what).toEqual(rowsBefore);

    server.release();
    unmount();
  }
});

it('T-012-P2 REQ-012.3 once confirmed, the list shows the new state', async () => {
  for (const action of FOUR_ACTIONS) {
    const server = new FakeServer(FOUR_ITEMS()).hold(action.holds);
    const { user, unmount } = await showList(server, action.actingUser);

    await action.run(user);
    await settle(server);

    action.then();
    unmount();
  }
});

it('T-012-P3 REQ-012.6 a rejected Borrow, Return or Delete opens the API failure modal with Close and Retry', async () => {
  const three = FOUR_ACTIONS.filter(
    (each) => each.what !== "an admin's Borrow after choosing Mia Member",
  );
  for (const action of three) {
    for (const rejection of EVERY_REJECTION) {
      const where = `${action.what}, rejected: ${rejection}`;
      const server = new FakeServer(FOUR_ITEMS()).answer(action.holds, rejection);
      const { user, unmount } = await showList(server, action.actingUser);

      await action.run(user);

      const modal = await screen.findByTestId('modal-api-failure');
      expect(within(modal).getByTestId('btn-close'), where).toBeInTheDocument();
      expect(within(modal).getByTestId('btn-retry'), where).toBeInTheDocument();
      unmount();
    }
  }
});

it('T-012-P4 REQ-012.8 Retry repeats the same request, and the result is the one that request would give', async () => {
  const lendToSam = new FakeServer(FOUR_ITEMS()).answer('borrow', REJECT_ERROR);
  const first = await showList(lendToSam, ADA);
  const otherItemsBefore = lendToSam.data().filter((each) => each.id !== 1);
  await lendTo(first.user, 1, SAM);
  await screen.findByTestId('modal-api-failure');
  lendToSam.answer('borrow', 'confirm');
  await first.user.click(screen.getByTestId('btn-retry'));
  await settle(lendToSam);
  expect(statusOf(1)).toBe(S.onLoan(SAM.name));
  expect(lendToSam.data().filter((each) => each.id !== 1)).toEqual(otherItemsBefore);
  first.unmount();

  const returning = new FakeServer(FOUR_ITEMS()).answer('return', REJECT_ERROR);
  const second = await showList(returning, ADA);
  await second.user.click(within(rowOf(2)).getByTestId('btn-return'));
  await screen.findByTestId('modal-api-failure');
  returning.answer('return', 'confirm');
  await second.user.click(screen.getByTestId('btn-retry'));
  await settle(returning);
  expect(statusOf(2)).toBe(S.available);
  second.unmount();

  const deleting = new FakeServer(FOUR_ITEMS()).answer('delete', REJECT_ERROR);
  const third = await showList(deleting, ADA);
  await third.user.click(within(rowOf(3)).getByTestId('btn-delete'));
  await third.user.click(screen.getByTestId('btn-confirm'));
  await screen.findByTestId('modal-api-failure');
  deleting.answer('delete', 'confirm');
  await third.user.click(screen.getByTestId('btn-retry'));
  await settle(deleting);
  expect(rowOf(3)).toBeNull();
});

it('T-012-P6 REQ-012.9 REQ-012.10 REQ-012.11 an Add, a Mark out of service and a Restore each show their loader and then their result', async () => {
  const server = new FakeServer([available(1, 'Projector'), outOfService(2, 'Camera')]);
  const { user } = await showList(server, ADA);

  server.hold('add');
  await user.type(screen.getByTestId('add-input'), 'Lectern');
  await user.keyboard('{Enter}');
  expect(screen.getByTestId('add-loader')).toBeInTheDocument();
  expect(rowsShown().some((row) => row.name === 'Lectern')).toBe(false);
  expect(statusOf(1)).toBe(S.available);
  expect(statusOf(2)).toBe(S.outOfService);
  await settle(server);
  expect(rowsShown().filter((row) => row.name === 'Lectern')).toEqual([
    { id: expect.any(Number), name: 'Lectern', status: S.available },
  ]);

  server.hold('out-of-service');
  await user.click(within(rowOf(1)).getByTestId('btn-out-of-service'));
  expect(within(rowOf(1)).getByTestId('row-loader')).toBeInTheDocument();
  expect(statusOf(1)).toBe(S.available);
  await settle(server);
  expect(statusOf(1)).toBe(S.outOfService);

  server.hold('restore');
  await user.click(within(rowOf(2)).getByTestId('btn-restore'));
  expect(within(rowOf(2)).getByTestId('row-loader')).toBeInTheDocument();
  expect(statusOf(2)).toBe(S.outOfService);
  await settle(server);
  expect(statusOf(2)).toBe(S.available);
});

it('T-012-P8 REQ-012.12 a failed Add, Mark out of service or Restore opens the API failure modal and changes nothing', async () => {
  const cases = [
    ['an Add', 'add', REJECT_ERROR],
    ['a Mark out of service', 'out-of-service', REJECT_ERROR],
    ['a Restore', 'restore', REJECT_ERROR],
    ['a Mark out of service', 'out-of-service', 'reject:state'],
    ['a Restore', 'restore', 'reject:state'],
  ];
  for (const [what, action, rejection] of cases) {
    const where = `${what}, rejected: ${rejection}`;
    const server = new FakeServer([available(1, 'Projector'), outOfService(2, 'Camera')]).answer(
      action,
      rejection,
    );
    const { user, unmount } = await showList(server, ADA);
    const rowsBefore = rowsShown();
    expect(statusOf(1), where).toBe(S.available);
    expect(statusOf(2), where).toBe(S.outOfService);

    if (action === 'add') {
      await user.type(screen.getByTestId('add-input'), 'Lectern');
      await user.keyboard('{Enter}');
    } else if (action === 'out-of-service') {
      await user.click(within(rowOf(1)).getByTestId('btn-out-of-service'));
    } else {
      await user.click(within(rowOf(2)).getByTestId('btn-restore'));
    }

    const modal = await screen.findByTestId('modal-api-failure');
    expect(within(modal).getByTestId('btn-close'), where).toBeInTheDocument();
    expect(within(modal).getByTestId('btn-retry'), where).toBeInTheDocument();
    expect(rowsShown(), where).toEqual(rowsBefore);
    unmount();
  }
});

it('T-012-P9 REQ-012.13 Retry repeats an Add, a Mark out of service and a Restore', async () => {
  const adding = new FakeServer([available(1, 'Projector')]).answer('add', REJECT_ERROR);
  const first = await showList(adding, ADA);
  await first.user.type(screen.getByTestId('add-input'), 'Lectern');
  await first.user.keyboard('{Enter}');
  await screen.findByTestId('modal-api-failure');
  adding.answer('add', 'confirm');
  await first.user.click(screen.getByTestId('btn-retry'));
  await settle(adding);
  expect(rowsShown().filter((row) => row.name === 'Lectern')).toEqual([
    { id: expect.any(Number), name: 'Lectern', status: S.available },
  ]);
  first.unmount();

  const marking = new FakeServer([available(1, 'Projector')]).answer(
    'out-of-service',
    REJECT_ERROR,
  );
  const second = await showList(marking, ADA);
  await second.user.click(within(rowOf(1)).getByTestId('btn-out-of-service'));
  await screen.findByTestId('modal-api-failure');
  marking.answer('out-of-service', 'confirm');
  await second.user.click(screen.getByTestId('btn-retry'));
  await settle(marking);
  expect(statusOf(1)).toBe(S.outOfService);
  second.unmount();

  const restoring = new FakeServer([outOfService(1, 'Camera')]).answer('restore', REJECT_ERROR);
  const third = await showList(restoring, ADA);
  await third.user.click(within(rowOf(1)).getByTestId('btn-restore'));
  await screen.findByTestId('modal-api-failure');
  restoring.answer('restore', 'confirm');
  await third.user.click(screen.getByTestId('btn-retry'));
  await settle(restoring);
  expect(statusOf(1)).toBe(S.available);
});

it('T-012-N1 REQ-012.4 a confirmed action changes the list and says nothing anywhere else', async () => {
  for (const action of FOUR_ACTIONS.filter(
    (each) => each.what !== "an admin's Borrow after choosing Mia Member",
  )) {
    const server = new FakeServer(FOUR_ITEMS());
    const { user, unmount } = await showList(server, action.actingUser);
    // Found first: the rows, and the page's text outside the list and the modals.
    expect(rowsShown().length, action.what).toBeGreaterThan(0);
    const textBefore = readableTextOutsideListAndModals();

    await action.run(user);
    await settle(server);

    action.then();
    expect(readableTextOutsideListAndModals(), action.what).toBe(textBefore);
    expect(globalThis.document.querySelectorAll('[role="alertdialog"]')).toHaveLength(0);
    unmount();
  }
});

it('T-012-N2 REQ-012.5 every rejection of every action shows the API failure modal and changes nothing', async () => {
  for (const action of SIX_ACTIONS) {
    for (const rejection of [...EVERY_REJECTION, OFFLINE]) {
      const where = `${action.what}, answered: ${rejection}`;
      const server = new FakeServer(FOUR_ITEMS()).hold(action.holds);
      const { user, unmount } = await showList(server, action.actingUser);
      const rowsBefore = rowsShown();

      await action.run(user);
      // Found first, while the answer is held: the action is under way.
      expect(loaderFor(action), where).not.toBeNull();

      server.answer(action.holds, rejection).release();

      expect(await screen.findByTestId('modal-api-failure'), where).toBeInTheDocument();
      expect(screen.queryByTestId('modal-access-denied'), where).toBeNull();
      expect(rowsShown(), where).toEqual(rowsBefore);
      unmount();
    }
  }
});

it('T-012-N3 REQ-012.7 Close on the API failure modal changes nothing', async () => {
  const server = new FakeServer(FOUR_ITEMS()).answer('return', REJECT_ERROR);
  const { user } = await showList(server, ADA);
  const rowsBefore = rowsShown();
  expect(rowsBefore).toHaveLength(4);

  await user.click(within(rowOf(2)).getByTestId('btn-return'));
  await screen.findByTestId('modal-api-failure');

  const dataBefore = server.data();
  server.hold();
  await user.click(screen.getByTestId('btn-close'));

  expect(screen.queryByTestId('modal-api-failure')).toBeNull();
  expect(anyLoader()).toBe(0);

  server.release();
  await settle(server);
  expect(rowsShown()).toEqual(rowsBefore);
  expect(server.data()).toEqual(dataBefore);
});

it('T-012-N4 REQ-012.6 a refused request shows the Access denied modal and no API failure modal at all', async () => {
  const server = new FakeServer(FOUR_ITEMS()).answer('return', REFUSE);
  const { user } = await showList(server, ADA);
  expect(rowsShown()).toHaveLength(4);

  await user.click(within(rowOf(2)).getByTestId('btn-return'));

  expect(await screen.findByTestId('modal-access-denied')).toBeInTheDocument();
  expect(screen.queryByTestId('modal-api-failure')).toBeNull();
  expect(screen.queryByTestId('btn-close')).toBeNull();
  expect(screen.queryByTestId('btn-retry')).toBeNull();
});

it('T-012-N6 REQ-012.14 the page that first shows the API failure modal shows no loader', async () => {
  for (const action of SIX_ACTIONS) {
    const server = new FakeServer(FOUR_ITEMS()).hold(action.holds);
    const { user, unmount } = await showList(server, action.actingUser);

    await action.run(user);
    // Found first, while the answer is held.
    expect(loaderFor(action), action.what).not.toBeNull();

    const watch = watchLoadersWhileFailureShows();
    server.answer(action.holds, REJECT_ERROR).release();
    await screen.findByTestId('modal-api-failure');
    watch.stop();

    expect(watch.seen.length, action.what).toBeGreaterThan(0);
    expect(watch.seen[0], `${action.what}: the first page with the modal`).toBe(0);
    expect(watch.seen, `${action.what}: every page with the modal`).toEqual(
      watch.seen.map(() => 0),
    );
    expect(anyLoader(), action.what).toBe(0);
    unmount();
  }
});

it('T-012-N7 REQ-012.15 a confirmed Add, Mark out of service or Restore leaves no note on the page', async () => {
  const server = new FakeServer([available(1, 'Projector'), outOfService(2, 'Camera')]);
  const { user } = await showList(server, ADA);
  const textBefore = readableTextOutsideListAndModals();

  await user.type(screen.getByTestId('add-input'), 'Lectern');
  await user.keyboard('{Enter}');
  await settle(server);
  await user.click(within(rowOf(1)).getByTestId('btn-out-of-service'));
  await settle(server);
  await user.click(within(rowOf(2)).getByTestId('btn-restore'));
  await settle(server);

  // Found first: the three new states.
  expect(rowsShown().some((row) => row.name === 'Lectern')).toBe(true);
  expect(statusOf(1)).toBe(S.outOfService);
  expect(statusOf(2)).toBe(S.available);

  expect(readableTextOutsideListAndModals()).toBe(textBefore);
  const whole = textOf(globalThis.document.body);
  expect(whole).not.toContain('Added Lectern');
  expect(whole).not.toContain('Projector marked out of service');
  expect(whole).not.toContain('Camera restored');
});

it('T-012-N9 REQ-012.16 an action on an item that is no longer there fails without a refusal', async () => {
  const actions = [
    ['Borrow', 'borrow', 1],
    ['Return', 'return', 2],
    ['Delete after Confirm', 'delete', 3],
    ['Mark out of service', 'out-of-service', 1],
    ['Restore', 'restore', 4],
  ];
  for (const [what, action, itemId] of actions) {
    const server = new FakeServer(FOUR_ITEMS()).answer(action, 'reject:missing');
    const { user, unmount } = await showList(server, ADA);
    const rowsBefore = rowsShown();

    if (action === 'borrow') {
      await lendTo(user, itemId, MIA);
    } else if (action === 'delete') {
      await user.click(within(rowOf(itemId)).getByTestId('btn-delete'));
      await user.click(screen.getByTestId('btn-confirm'));
    } else {
      const control = {
        return: 'btn-return',
        'out-of-service': 'btn-out-of-service',
        restore: 'btn-restore',
      }[action];
      await user.click(within(rowOf(itemId)).getByTestId(control));
    }

    const modal = await screen.findByTestId('modal-api-failure');
    await waitFor(() => {
      expect(anyLoader()).toBe(0);
    });
    expect(within(modal).getByTestId('btn-close'), what).toBeInTheDocument();
    expect(within(modal).getByTestId('btn-retry'), what).toBeInTheDocument();
    expect(screen.queryByTestId('modal-access-denied'), what).toBeNull();
    expect(rowsShown(), what).toEqual(rowsBefore);
    unmount();
  }
});
