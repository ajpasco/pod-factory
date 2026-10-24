// REQ-013: the list page states and the four state demos. The thirty C rows of S3
// (T-013-P6, T-013-N10 and T-013-N12 are B rows).
// Frozen with the S3 tests; read-only to every builder.
//
// Three rows name a duration. They take the page's clock under the test's control and
// advance it (eval plan 1.3 and 1.1, "No row sleeps"). While that clock is installed, the
// rows make no use of React Testing Library's `waitFor`, which polls on a timer: a faked
// timer would never fire it. They advance the clock inside `act` instead, which is
// deterministic and needs no pause at all.

import { act, cleanup, fireEvent } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';

import {
  ADA,
  CONFIRM,
  FakeServer,
  MIA,
  OFFLINE,
  REFUSE,
  REJECT_ERROR,
  REJECT_MISSING,
  REJECT_STATE,
  SAM,
  available,
  onLoan,
  outOfService,
} from './_fake-server.js';
import {
  FOUR_DEMOS,
  S,
  anyLoader,
  anyModal,
  everyControl,
  expectPlacementInDocument,
  modalBody,
  nameOfLength,
  pick,
  renderPage,
  rowsShown,
  screen,
  settle,
  showEmpty,
  showList,
  testidOf,
  textOf,
  waitFor,
  within,
} from './_harness.js';

const THREE = () => [
  available(1, 'Projector'),
  onLoan(2, 'Laptop', MIA),
  outOfService(3, 'Camera'),
];

/** Is this element the first element in the document, with nothing before it? */
function isFirstInDocument(element) {
  let step = element;
  while (step !== null && step !== globalThis.document.body) {
    if (step.previousElementSibling !== null) return false;
    step = step.parentElement;
  }
  return step === globalThis.document.body;
}

const comesBefore = (first, second) => (first.compareDocumentPosition(second) & 4) === 4;

/** Show the Show empty list view for that user over a real list. */
async function showEmptyListView(server, actingUser) {
  const rendered = await showList(server, actingUser);
  await rendered.user.click(screen.getByTestId('demo-empty'));
  expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
  return rendered;
}

afterEach(() => {
  vi.useRealTimers();
});

it('T-013-P1 REQ-013.1 while the list is being fetched the page says so', async () => {
  const server = new FakeServer(THREE()).hold('list');
  const { user } = renderPage(server);
  await pick(user, ADA);

  const indicator = await screen.findByTestId('list-indicator');
  expect(textOf(indicator)).toBe(S.loading);
  await settle(server);
});

it('T-013-P2 REQ-013.2 an empty list says so', async () => {
  const server = new FakeServer([]);
  await showEmpty(server, MIA);

  expect(textOf(screen.getByTestId('empty-state'))).toBe(S.empty);
});

it('T-013-P3 REQ-013.3 the Add field comes before the empty text', async () => {
  const server = new FakeServer([]);
  await showEmpty(server, ADA);

  expect(comesBefore(screen.getByTestId('add-input'), screen.getByTestId('empty-state'))).toBe(
    true,
  );
});

it('T-013-P5 REQ-013.5 the state demos panel is the first thing in the document', async () => {
  const server = new FakeServer(THREE());
  await showList(server, ADA);

  const panel = screen.getByTestId('state-demos');
  expect(isFirstInDocument(panel)).toBe(true);
  for (const after of ['top-bar', 'add-card', 'equipment-list']) {
    expect(comesBefore(panel, screen.getByTestId(after)), after).toBe(true);
  }
});

it('T-013-P7 REQ-013.6 the state demos panel holds exactly the four demo controls', async () => {
  for (const actingUser of [ADA, MIA, SAM]) {
    const server = new FakeServer(THREE());
    const { unmount } = await showList(server, actingUser);
    const panel = screen.getByTestId('state-demos');

    const buttons = Array.from(panel.querySelectorAll('button'));
    expect(buttons, actingUser.name).toHaveLength(4);
    expect(buttons.map(testidOf)).toEqual(FOUR_DEMOS.map((each) => each.testid));
    expect(buttons.map((each) => each.getAttribute('aria-label'))).toEqual([
      'Show loading',
      'Show empty list',
      'Show API failure',
      'Show access denied',
    ]);
    expect(everyControl(panel).map(testidOf), actingUser.name).toEqual(
      FOUR_DEMOS.map((each) => each.testid),
    );
    unmount();
  }
});

it('T-013-P8 REQ-013.7 Show loading shows the list indicator at once', async () => {
  const server = new FakeServer(THREE());
  const { user } = await showList(server, ADA);

  await user.click(screen.getByTestId('demo-loading'));

  // Read at once, with no waiting and no clock advanced.
  expect(screen.getByTestId('list-indicator')).toBeInTheDocument();
});

it('T-013-P9 REQ-013.8 Show empty list shows the empty text, with the Add field only for the admin', async () => {
  const adminServer = new FakeServer(THREE());
  const admin = await showList(adminServer, ADA);
  await admin.user.click(screen.getByTestId('demo-empty'));
  const emptyText = await screen.findByTestId('empty-state');
  expect(textOf(emptyText)).toBe(S.empty);
  expect(comesBefore(screen.getByTestId('add-input'), emptyText)).toBe(true);
  admin.unmount();

  const memberServer = new FakeServer(THREE());
  const member = await showList(memberServer, MIA);
  await member.user.click(screen.getByTestId('demo-empty'));
  expect(textOf(await screen.findByTestId('empty-state'))).toBe(S.empty);
  expect(screen.queryByTestId('add-input')).toBeNull();
});

it('T-013-P10 REQ-013.9 Show API failure opens the API failure modal with Close and Retry', async () => {
  const server = new FakeServer(THREE());
  const { user } = await showList(server, ADA);

  await user.click(screen.getByTestId('demo-api-failure'));

  const modal = await screen.findByTestId('modal-api-failure');
  expect(within(modal).getByTestId('btn-close')).toBeInTheDocument();
  expect(within(modal).getByTestId('btn-retry')).toBeInTheDocument();
});

it('T-013-P11 REQ-013.10 Show access denied opens the Access denied modal with one OK icon', async () => {
  const server = new FakeServer(THREE());
  const { user } = await showList(server, ADA);

  await user.click(screen.getByTestId('demo-access-denied'));

  const modal = await screen.findByTestId('modal-access-denied');
  expect(modalBody('modal-access-denied')).toBe(S.accessDeniedBody);
  expect(Array.from(modal.querySelectorAll('button')).map(testidOf)).toEqual(['btn-ok']);
});

it('T-013-P12 REQ-013.13 the loading demo ends by itself and the real list returns', async () => {
  const server = new FakeServer(THREE());
  const { user } = await showList(server, ADA);
  const rowsBefore = rowsShown();

  await user.click(screen.getByTestId('demo-loading'));

  // Waited for, never slept through: it appears, then it goes.
  expect(screen.getByTestId('list-indicator')).toBeInTheDocument();
  await waitFor(
    () => {
      expect(screen.queryByTestId('list-indicator')).toBeNull();
    },
    { timeout: 5000 },
  );
  expect(rowsShown()).toEqual(rowsBefore);
});

it('T-013-P13 REQ-013.13 the loading demo lasts 900 ms of the page clock', async () => {
  const server = new FakeServer(THREE());
  await showList(server, ADA);
  const rowsBefore = rowsShown();

  vi.useFakeTimers();
  // With the page's clock under the test's control, the demo is activated with a
  // dispatched click rather than through the pointer helper: that helper waits on a
  // timer of its own, which a controlled clock would never run.
  fireEvent.click(screen.getByTestId('demo-loading'));
  expect(screen.getByTestId('list-indicator')).toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(899);
  });
  expect(screen.getByTestId('list-indicator')).toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(1);
  });
  expect(screen.queryByTestId('list-indicator')).toBeNull();
  expect(rowsShown()).toEqual(rowsBefore);
});

it('T-013-P15 REQ-013.15 picking a user leaves the Show empty list view', async () => {
  const server = new FakeServer(THREE());
  const { user } = await showEmptyListView(server, ADA);
  // Found first: the empty view is showing.
  expect(screen.getByTestId('empty-state')).toBeInTheDocument();

  await pick(user, MIA);
  await waitFor(() => {
    expect(screen.getAllByTestId('row')).toHaveLength(3);
  });

  expect(screen.queryByTestId('empty-state')).toBeNull();
  expect(rowsShown().map((row) => row.id)).toEqual([1, 2, 3]);
});

it('T-013-P16 REQ-013.18 an Add made from the Show empty list view is carried out and kept', async () => {
  for (const activate of ['Enter', 'the Add icon']) {
    const server = new FakeServer(THREE());
    const { user } = await showEmptyListView(server, ADA);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();

    await user.type(screen.getByTestId('add-input'), 'Lectern');
    if (activate === 'Enter') await user.keyboard('{Enter}');
    else await user.click(screen.getByTestId('btn-add'));
    await settle(server);

    expect(server.named('Lectern'), activate).toEqual([
      {
        id: expect.any(Number),
        name: 'Lectern',
        status: 'available',
        borrowerId: null,
        borrowerName: null,
      },
    ]);

    // A fresh render reads the list the server now holds.
    cleanup();
    await showList(server, ADA);
    expect(
      rowsShown().filter((row) => row.name === 'Lectern'),
      activate,
    ).toEqual([{ id: expect.any(Number), name: 'Lectern', status: S.available }]);
    cleanup();
  }
});

it('T-013-P18 REQ-013.19 a confirmed Add from the Show empty list view ends the view and shows the whole list', async () => {
  const server = new FakeServer([available(1, 'Projector'), outOfService(2, 'Camera')]);
  const { user } = await showEmptyListView(server, ADA);
  server.hold('add');

  await user.type(screen.getByTestId('add-input'), 'Lectern');
  await user.keyboard('{Enter}');

  expect(screen.getByTestId('add-loader')).toBeInTheDocument();
  expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  expect(screen.queryByTestId('equipment-list')).toBeNull();

  await settle(server);
  expect(screen.queryByTestId('empty-state')).toBeNull();
  expect(rowsShown()).toEqual([
    { id: 1, name: 'Projector', status: S.available },
    { id: 2, name: 'Camera', status: S.outOfService },
    { id: 3, name: 'Lectern', status: S.available },
  ]);
  cleanup();

  const bare = new FakeServer([]);
  const second = await showEmpty(bare, ADA);
  await second.user.click(screen.getByTestId('demo-empty'));
  await second.user.type(screen.getByTestId('add-input'), 'Lectern');
  await second.user.keyboard('{Enter}');
  await settle(bare);
  expect(rowsShown()).toEqual([{ id: 1, name: 'Lectern', status: S.available }]);
});

it('T-013-P20 REQ-013.22 Retry repeats an Add made from the Show empty list view', async () => {
  const server = new FakeServer([available(1, 'Projector'), outOfService(2, 'Camera')]);
  const { user } = await showEmptyListView(server, ADA);
  server.answer('add', REJECT_ERROR);

  await user.type(screen.getByTestId('add-input'), 'Lectern');
  await user.keyboard('{Enter}');
  // Found first: the failure modal with its Retry icon.
  const modal = await screen.findByTestId('modal-api-failure');
  expect(within(modal).getByTestId('btn-retry')).toBeInTheDocument();

  server.answer('add', CONFIRM);
  await user.click(within(modal).getByTestId('btn-retry'));
  await settle(server);

  expect(screen.queryByTestId('empty-state')).toBeNull();
  expect(rowsShown()).toEqual([
    { id: 1, name: 'Projector', status: S.available },
    { id: 2, name: 'Camera', status: S.outOfService },
    { id: 3, name: 'Lectern', status: S.available },
  ]);
});

it('T-013-P21 REQ-013.23 a failed list fetch opens the API failure modal with Close and Retry', async () => {
  for (const failure of [REJECT_ERROR, REJECT_MISSING, OFFLINE]) {
    const server = new FakeServer(THREE()).answer('list', failure);
    const { user, unmount } = renderPage(server);
    await pick(user, ADA);

    const modal = await screen.findByTestId('modal-api-failure');
    expect(within(modal).getByTestId('btn-close'), failure).toBeInTheDocument();
    expect(within(modal).getByTestId('btn-retry'), failure).toBeInTheDocument();
    unmount();
  }
});

it('T-013-P23 REQ-013.25 Retry fetches the list again and shows what comes back', async () => {
  const server = new FakeServer(THREE()).answer('list', REJECT_ERROR);
  const { user } = renderPage(server);
  await pick(user, ADA);
  // Found first: the failure modal with Close and Retry.
  const modal = await screen.findByTestId('modal-api-failure');
  expect(within(modal).getByTestId('btn-close')).toBeInTheDocument();
  expect(within(modal).getByTestId('btn-retry')).toBeInTheDocument();

  // The repeat must carry the same identity, or the fake server refuses it and the
  // Access denied modal would show instead of the list.
  server.answerOnlyFor('list', ADA.id, CONFIRM).hold('list');
  await user.click(within(modal).getByTestId('btn-retry'));

  expect(await screen.findByTestId('list-indicator')).toBeInTheDocument();
  await settle(server);
  expect(screen.queryByTestId('modal-access-denied')).toBeNull();
  expect(rowsShown().map((row) => row.id)).toEqual([1, 2, 3]);
  cleanup();

  const bare = new FakeServer([]).answer('list', REJECT_ERROR);
  const second = renderPage(bare);
  await pick(second.user, ADA);
  await screen.findByTestId('modal-api-failure');
  bare.answerOnlyFor('list', ADA.id, CONFIRM);
  await second.user.click(screen.getByTestId('btn-retry'));
  expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
});

it('T-013-P25 REQ-013.26 a Retry that fails again opens the API failure modal again', async () => {
  const server = new FakeServer(THREE()).answer('list', REJECT_ERROR);
  const { user } = renderPage(server);
  await pick(user, ADA);
  await screen.findByTestId('modal-api-failure');

  server.hold('list');
  await user.click(screen.getByTestId('btn-retry'));
  expect(await screen.findByTestId('list-indicator')).toBeInTheDocument();

  server.release();
  const modal = await screen.findByTestId('modal-api-failure');
  expect(within(modal).getByTestId('btn-close')).toBeInTheDocument();
  expect(within(modal).getByTestId('btn-retry')).toBeInTheDocument();
});

it('T-013-N1 REQ-013.1 REQ-013.2 a list being fetched is not an empty list', async () => {
  const server = new FakeServer(THREE()).hold('list');
  const { user } = renderPage(server);
  await pick(user, ADA);

  // Found first: the indicator.
  expect(await screen.findByTestId('list-indicator')).toBeInTheDocument();
  expect(screen.queryByTestId('empty-state')).toBeNull();

  await settle(server);
  await waitFor(() => {
    expect(screen.getAllByTestId('row')).toHaveLength(3);
  });
  expect(screen.queryByTestId('empty-state')).toBeNull();
  expect(screen.queryByTestId('list-indicator')).toBeNull();
});

it('T-013-N2 REQ-013.4 a member sees the empty text without the Add, though the admin sees both', async () => {
  const server = new FakeServer([]);
  const { user } = await showEmpty(server, ADA);
  // Found first, for the user who has the feature: the Add above the empty text.
  const emptyText = screen.getByTestId('empty-state');
  expect(screen.getByTestId('add-card')).toBeInTheDocument();
  expect(comesBefore(screen.getByTestId('add-input'), emptyText)).toBe(true);

  for (const member of [MIA, SAM]) {
    await pick(user, member);
    expect(await screen.findByTestId('empty-state'), member.name).toBeInTheDocument();
    expect(screen.queryByTestId('add-input'), member.name).toBeNull();
    expect(screen.queryByTestId('add-card'), member.name).toBeNull();
  }
});

it('T-013-N3 REQ-013.11 the state demos appear only once a user is picked', async () => {
  const server = new FakeServer(THREE());
  const { user } = renderPage(server);
  // Found first: the switcher.
  expect(screen.getByTestId('switcher')).toBeInTheDocument();

  expect(screen.queryByTestId('state-demos')).toBeNull();
  expect(screen.queryByTestId('equipment-list')).toBeNull();

  for (const actingUser of [ADA, MIA, SAM]) {
    await pick(user, actingUser);
    await waitFor(() => {
      expect(screen.getAllByTestId('row')).toHaveLength(3);
    });
    const panel = screen.getByTestId('state-demos');
    expect(Array.from(panel.querySelectorAll('button')).map(testidOf)).toEqual(
      FOUR_DEMOS.map((each) => each.testid),
    );
  }
});

it('T-013-N4 REQ-013.12 no state demo changes the data', async () => {
  const server = new FakeServer(THREE());
  const { user } = await showList(server, ADA);
  const dataBefore = server.data();
  const rowsBefore = rowsShown();
  expect(rowsBefore).toHaveLength(3);

  await user.click(screen.getByTestId('demo-api-failure'));
  await user.click(screen.getByTestId('btn-close'));
  expect(server.data(), 'after Show API failure').toEqual(dataBefore);

  await user.click(screen.getByTestId('demo-access-denied'));
  await user.click(screen.getByTestId('btn-ok'));
  expect(server.data(), 'after Show access denied').toEqual(dataBefore);

  await user.click(screen.getByTestId('demo-empty'));
  await screen.findByTestId('empty-state');
  expect(server.data(), 'after Show empty list').toEqual(dataBefore);

  // The empty view is left by Show loading, which is also the fourth demo.
  await user.click(screen.getByTestId('demo-loading'));
  expect(screen.getByTestId('list-indicator')).toBeInTheDocument();
  await waitFor(
    () => {
      expect(screen.queryByTestId('list-indicator')).toBeNull();
    },
    { timeout: 5000 },
  );
  expect(server.data(), 'after Show loading').toEqual(dataBefore);

  cleanup();
  await showList(server, ADA);
  expect(rowsShown()).toEqual(rowsBefore);
  expect(server.data()).toEqual(dataBefore);
});

it('T-013-N6 REQ-013.14 the Show empty list view does not end by itself', async () => {
  const server = new FakeServer(THREE());
  await showList(server, ADA);

  // The clock is installed before the view is activated, not after, and the view is
  // therefore activated here rather than through `showEmptyListView`. The placement is
  // required: a timer the client sets when Show empty list is activated would otherwise
  // be a real timer, created before the fake clock existed, which `advanceTimersByTime`
  // cannot fire — so a build whose empty view ends by itself (by copying Show loading's
  // 900 ms timer, say) would pass the one row written to catch exactly that. Dispatched
  // rather than driven by the pointer helper, which waits on a timer the controlled
  // clock would never run: see T-013-P13.
  vi.useFakeTimers();
  fireEvent.click(screen.getByTestId('demo-empty'));
  // The anchor: the view is shown. Only then is it claimed not to end.
  expect(screen.getByTestId('empty-state')).toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(10 * 60 * 1000);
  });

  expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  expect(screen.queryByTestId('equipment-list')).toBeNull();
  expect(screen.queryAllByTestId('row')).toHaveLength(0);
});

it('T-013-N7 REQ-013.16 Show loading ends the Show empty list view for good', async () => {
  const server = new FakeServer(THREE());
  await showEmptyListView(server, ADA);

  vi.useFakeTimers();
  // Dispatched rather than driven by the pointer helper: see T-013-P13.
  fireEvent.click(screen.getByTestId('demo-loading'));
  expect(screen.getByTestId('list-indicator')).toBeInTheDocument();

  act(() => {
    vi.advanceTimersByTime(900);
  });
  expect(screen.queryByTestId('list-indicator')).toBeNull();
  expect(screen.queryByTestId('empty-state')).toBeNull();
  expect(screen.getAllByTestId('row')).toHaveLength(3);

  act(() => {
    vi.advanceTimersByTime(10 * 60 * 1000);
  });
  expect(screen.queryByTestId('empty-state')).toBeNull();
  expect(screen.getAllByTestId('row')).toHaveLength(3);
});

it('T-013-N8 REQ-013.17 Retry in the demo failure modal starts nothing', async () => {
  const server = new FakeServer(THREE());
  const { user } = await showList(server, ADA);
  const dataBefore = server.data();
  const rowsBefore = rowsShown();

  await user.click(screen.getByTestId('demo-api-failure'));
  // Found first: the modal the demo opened.
  const modal = await screen.findByTestId('modal-api-failure');
  expect(within(modal).getByTestId('btn-retry')).toBeInTheDocument();

  await user.click(within(modal).getByTestId('btn-retry'));

  expect(screen.queryByTestId('modal-api-failure')).toBeNull();
  expect(anyLoader()).toBe(0);
  expect(server.data()).toEqual(dataBefore);
  expect(rowsShown()).toEqual(rowsBefore);
});

it('T-013-N9 REQ-013.20 an Add with no name from the Show empty list view keeps the view and adds nothing', async () => {
  const server = new FakeServer(THREE());
  const { user } = await showEmptyListView(server, ADA);
  // Found first: the empty text, the Add card and the Add field.
  expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  expect(screen.getByTestId('add-card')).toBeInTheDocument();
  const field = screen.getByTestId('add-input');
  const dataBefore = server.data();

  const attempts = [
    [
      'Enter with the field empty',
      async () => {
        await user.click(field);
        await user.keyboard('{Enter}');
      },
    ],
    [
      'the Add icon with the field empty',
      async () => {
        await user.click(screen.getByTestId('btn-add'));
      },
    ],
    [
      'Enter with only spaces and a tab',
      async () => {
        fireEvent.change(field, { target: { value: ' \t ' } });
        await user.click(field);
        await user.keyboard('{Enter}');
      },
    ],
  ];

  for (const [what, attempt] of attempts) {
    server.hold();
    await attempt();
    expectPlacementInDocument(S.nameRequired);
    expect(anyModal(), what).toBeNull();
    expect(screen.getByTestId('empty-state'), what).toBeInTheDocument();
    expect(screen.queryByTestId('equipment-list'), what).toBeNull();
    server.release();
    await settle(server);
    expect(server.data(), what).toEqual(dataBefore);
  }

  // The anchor: a valid name typed in the same view is carried out.
  fireEvent.change(field, { target: { value: 'Lectern' } });
  await user.click(screen.getByTestId('btn-add'));
  await settle(server);
  expect(rowsShown().filter((row) => row.name === 'Lectern')).toEqual([
    { id: expect.any(Number), name: 'Lectern', status: S.available },
  ]);
});

it('T-013-N11 REQ-013.21 an over-long name from the Show empty list view keeps the view and adds nothing', async () => {
  const tooLong = nameOfLength(101);
  const hundred = nameOfLength(100);
  const server = new FakeServer(THREE());
  const { user } = await showEmptyListView(server, ADA);
  const field = screen.getByTestId('add-input');
  const dataBefore = server.data();

  for (const activate of ['Enter', 'the Add icon']) {
    fireEvent.change(field, { target: { value: tooLong } });
    server.hold();
    if (activate === 'Enter') {
      await user.click(field);
      await user.keyboard('{Enter}');
    } else {
      await user.click(screen.getByTestId('btn-add'));
    }
    expectPlacementInDocument(S.nameTooLong);
    expect(anyModal(), activate).toBeNull();
    expect(screen.getByTestId('empty-state'), activate).toBeInTheDocument();
    server.release();
    await settle(server);
    expect(server.data(), activate).toEqual(dataBefore);
  }

  // A name the server will not take for its name shows the inline message in the same
  // place, and never the failure modal.
  server.answer('add', 'reject:name');
  fireEvent.change(field, { target: { value: hundred } });
  await user.click(screen.getByTestId('btn-add'));
  await waitFor(() => {
    expect(screen.getByTestId('add-validation')).toBeInTheDocument();
  });
  expectPlacementInDocument();
  expect(screen.queryByTestId('modal-api-failure')).toBeNull();

  // The anchor: the same field holding 100 characters is added.
  server.answer('add', CONFIRM);
  await user.click(screen.getByTestId('btn-add'));
  await settle(server);
  expect(rowsShown().filter((row) => row.name === hundred)).toEqual([
    { id: expect.any(Number), name: hundred, status: S.available },
  ]);
});

it('T-013-N13 REQ-013.22 a failed Add from the Show empty list view keeps the view and the modal says so', async () => {
  for (const failure of [REJECT_ERROR, REJECT_STATE, OFFLINE]) {
    const server = new FakeServer(THREE());
    const { user, unmount } = await showEmptyListView(server, ADA);
    const dataBefore = server.data();
    server.answer('add', failure);

    await user.type(screen.getByTestId('add-input'), 'Lectern');
    await user.keyboard('{Enter}');

    const modal = await screen.findByTestId('modal-api-failure');
    expect(within(modal).getByTestId('btn-close'), failure).toBeInTheDocument();
    expect(within(modal).getByTestId('btn-retry'), failure).toBeInTheDocument();
    expect(screen.queryByTestId('modal-access-denied'), failure).toBeNull();
    expect(server.data(), failure).toEqual(dataBefore);
    expect(screen.getByTestId('empty-state'), failure).toBeInTheDocument();
    expect(screen.queryByTestId('equipment-list'), failure).toBeNull();

    await user.click(within(modal).getByTestId('btn-close'));
    expect(screen.queryByTestId('modal-api-failure'), failure).toBeNull();
    expect(screen.getByTestId('empty-state'), failure).toBeInTheDocument();
    unmount();
  }
});

it('T-013-N14 REQ-013.23 a refused list fetch is not a failure: the Access denied modal shows', async () => {
  const server = new FakeServer(THREE()).answer('list', REFUSE);
  const { user } = renderPage(server);
  await pick(user, ADA);

  const modal = await screen.findByTestId('modal-access-denied');
  expect(modalBody('modal-access-denied')).toBe(S.accessDeniedBody);
  expect(Array.from(modal.querySelectorAll('button')).map(testidOf)).toEqual(['btn-ok']);
  expect(screen.queryByTestId('modal-api-failure')).toBeNull();
  expect(screen.queryByTestId('btn-close')).toBeNull();
  expect(screen.queryByTestId('btn-retry')).toBeNull();
});

it('T-013-N15 REQ-013.24 Close after a failed list fetch starts no new fetch', async () => {
  const server = new FakeServer(THREE()).answer('list', REJECT_ERROR);
  const { user } = renderPage(server);
  await pick(user, ADA);
  // Found first: the failure modal with Close and Retry.
  const modal = await screen.findByTestId('modal-api-failure');
  expect(within(modal).getByTestId('btn-close')).toBeInTheDocument();
  expect(within(modal).getByTestId('btn-retry')).toBeInTheDocument();

  // Any further list request is held, so a repeated fetch would be visible as the
  // indicator and would stay visible.
  server.answer('list', CONFIRM).hold('list');
  await user.click(within(modal).getByTestId('btn-close'));

  expect(screen.queryByTestId('modal-api-failure')).toBeNull();
  expect(screen.queryByTestId('list-indicator')).toBeNull();

  server.release();
  await waitFor(() => {
    expect(server.heldCount).toBe(0);
  });
  expect(screen.queryByTestId('list-indicator')).toBeNull();
});
