/**
 * Forced attempts, made by rewriting or aborting the page's own request.
 *
 * Frozen at the S4 freeze. Read-only to every builder, S4's own included.
 *
 * Eval plan 1.3, "Forced attempt": in the browser a forced attempt is a
 * legitimate action by the person whose outgoing request has its identity, or
 * its body, rewritten by `page.route`, so that the page's own handler receives
 * the real server's answer. That is the whole point of doing it this way rather
 * than by calling the API directly: the row then observes which modal a person
 * is shown, which is where the difference between a refusal and a rejection is
 * visible (eval plan 1.1).
 *
 * Every helper returns a function that removes the interception again. A row
 * that must then let the same request through (T-012-P5's Retry, T-013-P24's
 * Retry) calls it; a row that holds the interception to the end need not, and
 * the context is thrown away after the test.
 */

/**
 * Playwright reads and writes request headers in lower case, so the blueprint's
 * `X-User-Id` (section 12.2) is this key here. It is the same header.
 */
const IDENTITY = 'x-user-id';

/** Every call the page makes goes through the base `/api` (blueprint 12.7). */
const ANY_API_CALL = '**/api/**';

function pathOf(request) {
  return new URL(request.url()).pathname;
}

/** The list request: the one the page makes at a pick and again at Retry. */
export function theListRequest(request) {
  return request.method() === 'GET' && pathOf(request) === '/api/equipment';
}

/** The Add request. */
export function theAddRequest(request) {
  return request.method() === 'POST' && pathOf(request) === '/api/equipment';
}

/** One action on one item: borrow, return, out-of-service or restore. */
export function theActionRequest(itemId, action) {
  return (request) =>
    request.method() === 'POST' && pathOf(request) === `/api/equipment/${itemId}/${action}`;
}

/** The delete of one item. */
export function theDeleteRequest(itemId) {
  return (request) =>
    request.method() === 'DELETE' && pathOf(request) === `/api/equipment/${itemId}`;
}

/** Any of several matchers. */
export function either(...matchers) {
  return (request) => matchers.some((matches) => matches(request));
}

async function install(page, matches, mutate) {
  const handler = async (route) => {
    if (!matches(route.request())) {
      // Another interception, or none, handles it. With no further handler
      // Playwright performs the request as if it had never been routed, so a
      // row only ever changes the one request it names.
      await route.fallback();
      return;
    }
    await mutate(route);
  };
  await page.route(ANY_API_CALL, handler);
  return async () => {
    await page.unroute(ANY_API_CALL, handler);
  };
}

/**
 * Rewrite the acting identity, the body, or both, of the matching request.
 *
 * `identity` is the string that reaches the server, or `null` to send the
 * request with no identity at all; `body` is sent as JSON. Both are done in one
 * interception on purpose. Two interceptions on the same request would not
 * compose: Playwright hands the request to the most recently added handler, and
 * the first one to continue it ends the chain, so the other rewrite would
 * silently not happen and the row would quietly test something else. T-003-N5
 * needs both at once.
 *
 * On the empty identity: blueprint 5.1.1 records that a proxy may drop an
 * empty-valued header, which turns the case into the missing one, and that both
 * are refused. A row probing it therefore asserts the refusal and never which of
 * the two the API saw.
 */
export async function rewriteRequest(page, matches, { identity, body } = {}) {
  return install(page, matches, async (route) => {
    const options = {};
    if (identity !== undefined) {
      // The header is rebuilt without the identity rather than deleted from a
      // copy, so that `null` really does send a request with no identity at all
      // (REQ-001.6) and not one carrying an empty value (a different case,
      // blueprint 5.1.1).
      const headers = Object.fromEntries(
        Object.entries(route.request().headers()).filter(([name]) => name !== IDENTITY),
      );
      if (identity !== null) {
        headers[IDENTITY] = identity;
      }
      options.headers = headers;
    }
    if (body !== undefined) {
      options.postData = JSON.stringify(body);
    }
    await route.continue(options);
  });
}

/** Rewrite only the acting identity. */
export async function rewriteIdentity(page, matches, value) {
  return rewriteRequest(page, matches, { identity: value });
}

/** Rewrite only the body. */
export async function rewriteBody(page, matches, data) {
  return rewriteRequest(page, matches, { body: data });
}

/**
 * Make the matching request never reach the server, once.
 *
 * Once, not always, because the rows that use it then let the repeat through:
 * REQ-012.8's Retry must send "the same request" and reach the real server. The
 * counter is what makes the second attempt a real one even before the
 * interception is removed.
 */
export async function failNextRequest(page, matches) {
  let aborted = false;
  return install(page, matches, async (route) => {
    if (aborted) {
      await route.fallback();
      return;
    }
    aborted = true;
    await route.abort('failed');
  });
}
