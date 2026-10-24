// The faked API of the B rows (eval plan 1.3, "Browser page"): every `/api` request the
// production bundle makes is answered by `page.route`. Frozen with the B rows.
//
// It answers by the same classes as the C rows' fake server — confirm, refuse, reject of
// four kinds, and a request that never reaches the server — and keeps the mapping from a
// class to one of the answers of blueprint 12.3.1 private, because no row may assert which
// answer a class uses (eval plan 1.1).

export const USERS = [
  { id: 1, name: 'Ada Admin', role: 'admin' },
  { id: 2, name: 'Mia Member', role: 'member' },
  { id: 3, name: 'Sam Member', role: 'member' },
];

export const ADA = USERS[0];
export const MIA = USERS[1];
export const SAM = USERS[2];

export const CONFIRM = 'confirm';
export const REFUSE = 'refuse';
export const REJECT_STATE = 'reject:state';
export const REJECT_MISSING = 'reject:missing';
export const REJECT_ERROR = 'reject:error';
export const REJECT_NAME = 'reject:name';
export const OFFLINE = 'offline';

const STATUS_OF = {
  [CONFIRM]: 200,
  [REFUSE]: 403,
  [REJECT_STATE]: 409,
  [REJECT_MISSING]: 404,
  [REJECT_ERROR]: 500,
  [REJECT_NAME]: 422,
};

export const item = (id, name, status = 'available', borrower = null) => ({
  id,
  name,
  status,
  borrowerId: borrower ? borrower.id : null,
  borrowerName: borrower ? borrower.name : null,
});

export const available = (id, name) => item(id, name, 'available');
export const onLoan = (id, name, borrower) => item(id, name, 'on_loan', borrower);
export const outOfService = (id, name) => item(id, name, 'out_of_service');

/** Available, On loan to Mia, and Out of service. */
export const THREE_STATUSES = () => [
  available(1, 'Projector'),
  onLoan(2, 'Laptop', MIA),
  outOfService(3, 'Camera'),
];

const ROUTES = [
  { action: 'users', method: 'GET', pattern: /\/api\/users$/ },
  { action: 'list', method: 'GET', pattern: /\/api\/equipment$/ },
  { action: 'add', method: 'POST', pattern: /\/api\/equipment$/ },
  { action: 'borrow', method: 'POST', pattern: /\/api\/equipment\/([^/]+)\/borrow$/ },
  { action: 'return', method: 'POST', pattern: /\/api\/equipment\/([^/]+)\/return$/ },
  {
    action: 'out-of-service',
    method: 'POST',
    pattern: /\/api\/equipment\/([^/]+)\/out-of-service$/,
  },
  { action: 'restore', method: 'POST', pattern: /\/api\/equipment\/([^/]+)\/restore$/ },
  { action: 'delete', method: 'DELETE', pattern: /\/api\/equipment\/([^/]+)$/ },
];

/**
 * Answer every `/api` request the page makes. Returns the controller a row uses to choose
 * an answer, to keep one back and to read the data back.
 */
export async function installFakeApi(page, startingItems = THREE_STATUSES()) {
  const server = {
    items: startingItems.map((each) => ({ ...each })),
    answers: {},
    held: new Set(),
    pending: [],

    answer(action, outcome) {
      for (const each of [].concat(action)) server.answers[each] = outcome;
      return server;
    },
    hold(action) {
      for (const each of [].concat(action)) server.held.add(each);
      return server;
    },
    release(action) {
      const releasing =
        action === undefined
          ? server.pending.splice(0)
          : server.pending.filter((each) => [].concat(action).includes(each.action));
      if (action === undefined) server.held.clear();
      else {
        server.pending = server.pending.filter((each) => !releasing.includes(each));
        for (const each of [].concat(action)) server.held.delete(each);
      }
      for (const each of releasing) each.go();
      return releasing.length;
    },
    data: () => server.items.map((each) => ({ ...each })),
    find: (id) => server.items.find((each) => each.id === id),
  };

  const read = (request) => {
    const url = new URL(request.url());
    const method = request.method().toUpperCase();
    for (const route of ROUTES) {
      const found = route.pattern.exec(url.pathname);
      if (found && route.method === method) {
        let body;
        const raw = request.postData();
        if (typeof raw === 'string') {
          try {
            body = JSON.parse(raw);
          } catch {
            body = undefined;
          }
        }
        const identity = request.headers()['x-user-id'];
        return {
          action: route.action,
          itemId: found[1] === undefined ? null : Number(found[1]),
          actorId: /^[1-9][0-9]{0,8}$/.test(String(identity ?? '')) ? Number(identity) : null,
          body,
        };
      }
    }
    return null;
  };

  /** Carry the request out on the data. Returns {status, body} as the contract says. */
  const carryOut = (request, actor) => {
    const ok = (body) => ({ status: 200, body });
    if (request.action === 'users') return ok(USERS);
    if (request.action === 'list') return ok(server.data());
    if (request.action === 'add') {
      const name = request.body?.name;
      // The page sent something the contract does not allow; blueprint 12.3 rejects it.
      if (typeof name !== 'string') return { status: STATUS_OF[REJECT_NAME], body: null };
      const nextId = server.items.reduce((high, each) => Math.max(high, each.id), 0) + 1;
      const added = item(nextId, name);
      server.items.push(added);
      return ok({ ...added });
    }
    const index = server.items.findIndex((each) => each.id === request.itemId);
    // The page named an item the server does not hold.
    if (index === -1) return { status: STATUS_OF[REJECT_MISSING], body: null };
    const target = server.items[index];
    if (request.action === 'borrow') {
      // Applied as the page asked: a member's request names nobody and lends to the
      // acting member, an admin's names the member. A request naming someone else is
      // applied as sent, so a wrong request shows a wrong result.
      const named = request.body?.borrowerId;
      const borrowerId = named === undefined || named === null ? actor.id : named;
      const borrower = USERS.find((each) => each.id === borrowerId) ?? null;
      target.status = 'on_loan';
      target.borrowerId = borrower ? borrower.id : null;
      target.borrowerName = borrower ? borrower.name : null;
    } else if (request.action === 'return' || request.action === 'restore') {
      target.status = 'available';
      target.borrowerId = null;
      target.borrowerName = null;
    } else if (request.action === 'out-of-service') {
      target.status = 'out_of_service';
      target.borrowerId = null;
      target.borrowerName = null;
    } else if (request.action === 'delete') {
      const removed = { ...target };
      server.items.splice(index, 1);
      return ok(removed);
    }
    return ok({ ...target });
  };

  await page.route('**/api/**', async (route) => {
    const request = read(route.request());
    if (request === null) {
      await route.fulfill({ status: 404, body: '' });
      return;
    }
    if (server.held.has(request.action)) {
      await new Promise((resolve) => {
        server.pending.push({ action: request.action, go: () => resolve(null) });
      });
    }

    const actor = USERS.find((each) => each.id === request.actorId);
    if (actor === undefined) {
      // Every route of blueprint 12.3 needs a usable identity, so a page that sends none
      // is refused whatever the row chose, and the wrong request shows a wrong result.
      await route.fulfill({ status: STATUS_OF[REFUSE], body: '' });
      return;
    }

    const chosen = server.answers[request.action] ?? CONFIRM;
    const outcome = typeof chosen === 'function' ? chosen(request) : chosen;
    if (outcome === OFFLINE) {
      await route.abort('failed');
      return;
    }
    if (outcome !== CONFIRM) {
      await route.fulfill({ status: STATUS_OF[outcome], body: '' });
      return;
    }

    const answer = carryOut(request, actor);
    if (answer.status !== 200) {
      await route.fulfill({ status: answer.status, body: '' });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(answer.body),
    });
  });

  return server;
}

/** Open the page and pick a user; the page then fetches the list. */
export async function openAs(page, actingUser) {
  await page.goto('/');
  await page.getByTestId('switcher').selectOption(String(actingUser.id));
}

/** Open the page, pick the user and wait for the rows. */
export async function showListAs(page, actingUser, expectedRows) {
  await openAs(page, actingUser);
  const rows = page.getByTestId('row');
  await rows.first().waitFor();
  if (expectedRows !== undefined) {
    await rows.nth(expectedRows - 1).waitFor();
  }
  return rows;
}

/** The row of one item, by the `data-item-id` blueprint 12.8.1 pins. */
export const rowOf = (page, itemId) =>
  page.locator(`[data-testid="row"][data-item-id="${itemId}"]`);
