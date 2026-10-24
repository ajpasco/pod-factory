// The fake server of the C rows (eval plan 1.3, "Page" and "Answers of the fake server").
// Frozen with the C rows; read-only to every builder.
//
// It is a stateful in-memory stand-in for the contract of blueprint 12.3. It acts for the
// identity each request carries and applies what the page sends, so a wrong request shows
// as a wrong result: that is what lets a row assert an outcome instead of asserting that a
// particular call was made, which eval plan 1.1 forbids.
//
// A test chooses an answer by its *class* — confirm, refuse, reject (of four kinds), or
// the request never reaches the server. The mapping from a class to one of the answers of
// blueprint 12.3.1 lives here and nowhere else, because no row may assert which answer a
// class uses (eval plan 1.1, blueprint 4.1.1).
//
// "Held" is how "the request was not sent" becomes "nothing changed" (eval plan 1.1): a
// held request is one the server would accept and whose answer it keeps back, so after
// `release()` the data either shows the change or shows that none was ever asked for.

/** The three seeded users, fixed by blueprint 12.2. */
export const USERS = [
  { id: 1, name: 'Ada Admin', role: 'admin' },
  { id: 2, name: 'Mia Member', role: 'member' },
  { id: 3, name: 'Sam Member', role: 'member' },
];

export const ADA = USERS[0];
export const MIA = USERS[1];
export const SAM = USERS[2];

/** The answer classes a test may choose. */
export const CONFIRM = 'confirm';
export const REFUSE = 'refuse';
/** Rejections, by the four kinds eval plan 1.3 names. */
export const REJECT_STATE = 'reject:state'; // the item is no longer in the right state
export const REJECT_MISSING = 'reject:missing'; // the item is no longer there
export const REJECT_ERROR = 'reject:error'; // a server error
export const REJECT_NAME = 'reject:name'; // (Add only) the name is not acceptable
/** The request never reaches the server: the call itself fails. */
export const OFFLINE = 'offline';

/** Every kind of rejection, for the rows that sweep all of them. */
export const EVERY_REJECTION = [REJECT_STATE, REJECT_MISSING, REJECT_ERROR];

/**
 * The answer each class uses, from blueprint 12.3.1. Private to this module: a row that
 * read these values would be asserting a status code, which eval plan 1.1 forbids.
 */
const STATUS_OF = {
  [CONFIRM]: 200,
  [REFUSE]: 403,
  [REJECT_STATE]: 409,
  [REJECT_MISSING]: 404,
  [REJECT_ERROR]: 500,
  [REJECT_NAME]: 422,
};

/**
 * A stand-in for the browser's Response, holding only what blueprint 12.7 says the client
 * reads: the status, and the JSON body of a success. Written out rather than taken from
 * the environment so that the C rows do not depend on which globals jsdom happens to
 * define.
 */
class FakeResponse {
  #body;

  constructor(status, body) {
    this.status = status;
    this.ok = status >= 200 && status < 300;
    this.#body = body;
    const type = body === undefined ? null : 'application/json';
    this.headers = {
      get: (name) => (String(name).toLowerCase() === 'content-type' ? type : null),
    };
  }

  async json() {
    if (this.#body === undefined) {
      throw new SyntaxError('the answer has no body');
    }
    return structuredClone(this.#body);
  }

  async text() {
    return this.#body === undefined ? '' : JSON.stringify(this.#body);
  }
}

const ROUTES = [
  { action: 'users', method: 'GET', pattern: /^\/api\/users$/ },
  { action: 'list', method: 'GET', pattern: /^\/api\/equipment$/ },
  { action: 'add', method: 'POST', pattern: /^\/api\/equipment$/ },
  { action: 'borrow', method: 'POST', pattern: /^\/api\/equipment\/([^/]+)\/borrow$/ },
  { action: 'return', method: 'POST', pattern: /^\/api\/equipment\/([^/]+)\/return$/ },
  {
    action: 'out-of-service',
    method: 'POST',
    pattern: /^\/api\/equipment\/([^/]+)\/out-of-service$/,
  },
  { action: 'restore', method: 'POST', pattern: /^\/api\/equipment\/([^/]+)\/restore$/ },
  { action: 'delete', method: 'DELETE', pattern: /^\/api\/equipment\/([^/]+)$/ },
];

/** Every action the eight routes of blueprint 12.3 carry. */
export const EVERY_ACTION = ROUTES.map((route) => route.action);

const headerOf = (init, name) => {
  const headers = init?.headers;
  if (!headers) return null;
  if (typeof headers.get === 'function') return headers.get(name);
  const wanted = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === wanted) return value;
  }
  return null;
};

/**
 * Build an item for the fake server's data. `status` is one of the three of blueprint
 * 12.2; a borrower is given as a seeded user.
 */
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

export class FakeServer {
  /** @param {object[]} items the data the server starts with, in id order. */
  constructor(items = []) {
    this.items = items.map((each) => ({ ...each }));
    this.users = USERS.map((each) => ({ ...each }));
    /** Per-action answer: a class, or a function of the request returning one. */
    this.answers = {};
    /** Actions whose answer is kept back until `release()`. */
    this.held = new Set();
    this.pending = [];
    this.fetch = this.fetch.bind(this);
  }

  // -- what the test sets -------------------------------------------------------------

  /** Answer every request of `action` (or of every action) with `outcome`. */
  answer(action, outcome) {
    if (outcome === undefined) {
      for (const each of EVERY_ACTION) this.answers[each] = action;
      return this;
    }
    for (const each of [].concat(action)) this.answers[each] = outcome;
    return this;
  }

  /**
   * Confirm `action` only when the request carries `identityId`, and refuse any other
   * (eval plan 1.3, for the list request).
   */
  answerOnlyFor(action, identityId, outcome = CONFIRM) {
    return this.answer(action, (request) => (request.actorId === identityId ? outcome : REFUSE));
  }

  /** Keep back the answer to `action`, or to every action when called with no argument. */
  hold(action) {
    for (const each of action === undefined ? EVERY_ACTION : [].concat(action)) {
      this.held.add(each);
    }
    return this;
  }

  /** How many answers are being kept back right now. */
  get heldCount() {
    return this.pending.length;
  }

  /**
   * Release what is being kept back. Every held answer is released, so that a row can say
   * "once everything held is released" and then read the data (eval plan 1.3, "Settled").
   */
  release(action) {
    const releasing =
      action === undefined
        ? this.pending.splice(0)
        : this.pending.filter((each) => [].concat(action).includes(each.action));
    if (action !== undefined) {
      this.pending = this.pending.filter((each) => !releasing.includes(each));
      for (const each of [].concat(action)) this.held.delete(each);
    } else {
      this.held.clear();
    }
    for (const each of releasing) each.go();
    return releasing.length;
  }

  /** Stop keeping answers back, without releasing what is already held. */
  releaseLater(action) {
    for (const each of action === undefined ? EVERY_ACTION : [].concat(action)) {
      this.held.delete(each);
    }
    return this;
  }

  // -- what the test reads ------------------------------------------------------------

  /**
   * A snapshot of the data: every item's name, status and borrower. Rows compare two
   * snapshots to say "unchanged" (eval plan 1.3).
   */
  data() {
    return this.items.map((each) => ({ ...each }));
  }

  /** The item of that id in the data, or undefined. */
  find(id) {
    const found = this.items.find((each) => each.id === id);
    return found ? { ...found } : undefined;
  }

  /** The items whose name is exactly `name`. */
  named(name) {
    return this.items.filter((each) => each.name === name).map((each) => ({ ...each }));
  }

  // -- the server ---------------------------------------------------------------------

  async fetch(url, init = {}) {
    const request = this.#read(url, init);
    if (request === null) {
      // A path or method the contract does not define. Blueprint 12.3 answers 404 or 405;
      // either way the page sees a non-200 and the data is untouched.
      return new FakeResponse(404, undefined);
    }

    if (this.held.has(request.action)) {
      const answer = await new Promise((resolve) => {
        this.pending.push({ action: request.action, go: () => resolve(null) });
      });
      void answer;
    }

    return this.#answer(request);
  }

  #read(url, init) {
    const method = (init.method ?? 'GET').toUpperCase();
    const path = String(url);
    for (const route of ROUTES) {
      const found = route.pattern.exec(path);
      if (found && route.method === method) {
        let body;
        if (typeof init.body === 'string') {
          try {
            body = JSON.parse(init.body);
          } catch {
            body = undefined;
          }
        }
        const raw = headerOf(init, 'X-User-Id');
        return {
          action: route.action,
          itemId: found[1] === undefined ? null : Number(found[1]),
          actorId: /^[1-9][0-9]{0,8}$/.test(String(raw ?? '')) ? Number(raw) : null,
          body,
        };
      }
    }
    return null;
  }

  #answer(request) {
    const actor = this.users.find((each) => each.id === request.actorId);
    if (actor === undefined) {
      // Every route of blueprint 12.3 requires a usable identity. A page that sends none,
      // or an unknown one, is refused whatever the test chose, so the wrong request shows
      // as the wrong result rather than silently passing.
      return new FakeResponse(STATUS_OF[REFUSE], undefined);
    }

    const chosen = this.answers[request.action] ?? CONFIRM;
    const outcome = typeof chosen === 'function' ? chosen(request) : chosen;

    if (outcome !== CONFIRM) {
      if (outcome === OFFLINE) {
        throw new TypeError('the request never reached the server');
      }
      return new FakeResponse(STATUS_OF[outcome], undefined);
    }

    return this.#carryOut(request, actor);
  }

  #carryOut(request, actor) {
    if (request.action === 'users') {
      return new FakeResponse(
        200,
        this.users.map((each) => ({ ...each })),
      );
    }
    if (request.action === 'list') {
      return new FakeResponse(200, this.data());
    }
    if (request.action === 'add') {
      const name = request.body?.name;
      if (typeof name !== 'string') {
        // The page sent something the contract does not allow. Blueprint 12.3 rejects it;
        // the page then shows the inline message, which is the wrong result for a row that
        // asked for a confirmation.
        return new FakeResponse(STATUS_OF[REJECT_NAME], undefined);
      }
      const added = item(this.#nextId(), name);
      this.items.push(added);
      return new FakeResponse(200, { ...added });
    }

    const index = this.items.findIndex((each) => each.id === request.itemId);
    if (index === -1) {
      // The page named an item the server does not hold.
      return new FakeResponse(STATUS_OF[REJECT_MISSING], undefined);
    }
    const target = this.items[index];

    if (request.action === 'borrow') {
      // The borrower the page asked for: a member's own request names nobody and lends to
      // the acting member, an admin's names the member. A request that names someone else
      // is applied as sent, so the row reads the borrower the page actually asked for.
      const namedId = request.body?.borrowerId;
      const borrowerId = namedId === undefined || namedId === null ? actor.id : namedId;
      const borrower = this.users.find((each) => each.id === borrowerId) ?? null;
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
      this.items.splice(index, 1);
      return new FakeResponse(200, removed);
    }

    return new FakeResponse(200, { ...target });
  }

  #nextId() {
    return this.items.reduce((highest, each) => Math.max(highest, each.id), 0) + 1;
  }
}
