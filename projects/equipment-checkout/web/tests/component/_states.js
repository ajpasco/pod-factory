// The page states the restraint and inventory rows sweep. Frozen; read-only to a builder.
//
// Several rows say "given the page rendered in each state ... for Ada and for Mia". They
// mean the states eval plan 1.2 and blueprint 12.8 describe: before a user is picked, the
// list being fetched, a list with all three statuses, the empty list, each of the four
// modals, and the page after each of the four state demos. Driving each of those by hand
// in every row would be nine copies of the same sequence, and a row that drifted from the
// others would weaken the sweep without saying so. They are built once, here.
//
// Each state gets its own fresh render, because leaving one state for another is itself
// behaviour some other row verifies and must not be assumed here.
//
// Every state carries the positive anchor eval plan 1.1 requires before any absence
// assertion: the switcher with its three user entries is found, and once a user is picked
// the top bar and the list, the empty text or the list indicator are found. A row that
// sweeps the states therefore cannot pass on a page that renders nothing.

import { cleanup } from '@testing-library/react';
import { expect } from 'vitest';

import {
  FakeServer,
  MIA,
  REFUSE,
  REJECT_ERROR,
  available,
  onLoan,
  outOfService,
} from './_fake-server.js';
import { pick, renderPage, rowOf, screen, waitFor, within } from './_harness.js';

/** A list holding one item of each of the three statuses, the loan being Mia's. */
export const THREE_STATUSES = () => [
  available(1, 'Projector'),
  onLoan(2, 'Laptop', MIA),
  outOfService(3, 'Camera'),
];

/** Open the borrower modal on a row and choose a member (an admin's Borrow). */
export async function lendTo(user, itemId, member) {
  await user.click(within(rowOf(itemId)).getByTestId('btn-borrow'));
  await user.click(screen.getByTestId(`member-button-${member.id}`));
}

const anchorState = async (actingUser, picked) => {
  const switcher = screen.getByTestId('switcher');
  expect(switcher).toBeInTheDocument();
  for (const id of [1, 2, 3]) {
    expect(screen.getByTestId(`switcher-option-${id}`)).toBeInTheDocument();
  }
  if (!picked) return;
  expect(screen.getByTestId('top-bar')).toBeInTheDocument();
  const shown =
    screen.queryByTestId('equipment-list') ??
    screen.queryByTestId('empty-state') ??
    screen.queryByTestId('list-indicator');
  expect(shown).not.toBeNull();
};

/**
 * Drive the page through each state for `actingUser` and call `visit` in each one.
 *
 * `visit` is given `{ label, user, server }`. The returned array of labels lets a row
 * assert that the sweep really ran, which is the anchor for the absences it then claims.
 */
export async function eachState(actingUser, visit, options = {}) {
  const items = options.items ?? THREE_STATUSES;
  const isAdmin = actingUser.role === 'admin';
  const visited = [];

  const run = async (label, startingItems, drive) => {
    cleanup();
    const server = new FakeServer(startingItems);
    const rendered = renderPage(server);
    await drive(rendered, server);
    await anchorState(actingUser, label !== 'before a user is picked');
    await visit({ label, ...rendered, server });
    visited.push(label);
  };

  if (options.includeUnpicked !== false) {
    await run('before a user is picked', items(), async () => {});
  }

  await run('the list being fetched', items(), async ({ user }, server) => {
    server.hold('list');
    await pick(user, actingUser);
    expect(await screen.findByTestId('list-indicator')).toBeInTheDocument();
  });

  await run('a list with all three statuses', items(), async ({ user }, server) => {
    await pick(user, actingUser);
    await waitFor(() => {
      expect(screen.getAllByTestId('row').length).toBe(server.items.length);
    });
  });

  await run('the empty list', [], async ({ user }) => {
    await pick(user, actingUser);
    expect(await screen.findByTestId('empty-state')).toBeInTheDocument();
  });

  if (isAdmin) {
    await run('the borrower modal', items(), async ({ user }) => {
      await pick(user, actingUser);
      await screen.findAllByTestId('row');
      await user.click(within(rowOf(1)).getByTestId('btn-borrow'));
      expect(await screen.findByTestId('modal-borrower')).toBeInTheDocument();
    });

    await run('the confirm-delete modal', items(), async ({ user }) => {
      await pick(user, actingUser);
      await screen.findAllByTestId('row');
      await user.click(within(rowOf(1)).getByTestId('btn-delete'));
      expect(await screen.findByTestId('modal-confirm-delete')).toBeInTheDocument();
    });
  }

  await run('the API failure modal', items(), async ({ user }, server) => {
    await pick(user, actingUser);
    await screen.findAllByTestId('row');
    server.answer('borrow', REJECT_ERROR);
    if (isAdmin) {
      await lendTo(user, 1, MIA);
    } else {
      await user.click(within(rowOf(1)).getByTestId('btn-borrow'));
    }
    expect(await screen.findByTestId('modal-api-failure')).toBeInTheDocument();
  });

  await run('the Access denied modal', items(), async ({ user }, server) => {
    await pick(user, actingUser);
    await screen.findAllByTestId('row');
    server.answer('borrow', REFUSE);
    if (isAdmin) {
      await lendTo(user, 1, MIA);
    } else {
      await user.click(within(rowOf(1)).getByTestId('btn-borrow'));
    }
    expect(await screen.findByTestId('modal-access-denied')).toBeInTheDocument();
  });

  const demos = [
    ['after Show loading', 'demo-loading', 'list-indicator'],
    ['after Show empty list', 'demo-empty', 'empty-state'],
    ['after Show API failure', 'demo-api-failure', 'modal-api-failure'],
    ['after Show access denied', 'demo-access-denied', 'modal-access-denied'],
  ];
  for (const [label, control, shows] of demos) {
    await run(label, items(), async ({ user }) => {
      await pick(user, actingUser);
      await screen.findAllByTestId('row');
      await user.click(screen.getByTestId(control));
      expect(await screen.findByTestId(shows)).toBeInTheDocument();
    });
  }

  // The last state's render is taken down here, so that a row which renders the page
  // again after the sweep does not find two of everything.
  cleanup();
  return visited;
}
