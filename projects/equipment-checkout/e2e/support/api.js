/**
 * The stack's own API, used as an instrument and never as the thing verified.
 *
 * Frozen at the S4 freeze. Read-only to every builder, S4's own included.
 *
 * Eval plan 1.1, the assertion rule: an API operation may be the instrument
 * that observes an outcome, and is never the thing verified. These helpers do
 * two jobs, both of them instrumental:
 *
 *   1. They build the items a row needs ("tests create the items they need
 *      through the API as Ada and name them uniquely", 1.3).
 *   2. They are the "read back" and the "fresh look" of 1.3: the equipment list
 *      or the user list read as Ada, so a row can say what the application kept
 *      rather than only what one browser page happens to be showing.
 *
 * **No function here reads a status code**, and that placement is required
 * rather than stylistic. The assertion rule forbids a status code as the thing
 * verified *and as the instrument that recognises an outcome class*, so a helper
 * that checked `response.ok()` would put a forbidden instrument inside every row
 * that calls it. Instead each helper parses the body and requires it to be the
 * resource the blueprint pins (section 12.2): an array of users, an array of
 * items, or one item with the id, name and status it should now have. A refusal,
 * a rejection or an error therefore fails here by not being that resource, which
 * is the same evidence a person has, and the thrown message says what was asked
 * for and what came back.
 */

import { SEEDED_USERS } from './strings.js';

const USERS = '/api/users';
const EQUIPMENT = '/api/equipment';

function headers(userId) {
  // Blueprint 12.2 and 5.1: the acting identity is the decimal id of a seeded
  // user, carried in X-User-Id on every request.
  return { 'X-User-Id': String(userId) };
}

async function body(response, what) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `${what}: the stack did not answer with JSON. It answered with ${text.length} ` +
        `character(s): ${JSON.stringify(text.slice(0, 200))}`,
    );
  }
}

function asItem(value, what) {
  const ok =
    value !== null &&
    typeof value === 'object' &&
    typeof value.id === 'number' &&
    typeof value.name === 'string' &&
    typeof value.status === 'string';
  if (!ok) {
    throw new Error(`${what}: expected one equipment item, got ${JSON.stringify(value)}`);
  }
  return value;
}

function asArray(value, what) {
  if (!Array.isArray(value)) {
    throw new Error(`${what}: expected a JSON array, got ${JSON.stringify(value)}`);
  }
  return value;
}

/** The user list as the API holds it, read with the given identity. */
export async function readUsers(request, userId) {
  const response = await request.get(USERS, { headers: headers(userId) });
  return asArray(await body(response, 'GET /api/users'), 'GET /api/users');
}

/** The "read back" of 1.3: every item's id, name, status and borrower, as Ada. */
export async function readList(request, userId = SEEDED_USERS[0].id) {
  const response = await request.get(EQUIPMENT, { headers: headers(userId) });
  return asArray(await body(response, 'GET /api/equipment'), 'GET /api/equipment');
}

/** One item of the read-back list, by name, or undefined. Names are unique per run. */
export function itemNamed(list, name) {
  return list.find((item) => item.name === name);
}

/** Create an item as Ada and return it. The row's own actions come later. */
export async function createItem(request, name) {
  const response = await request.post(EQUIPMENT, {
    headers: headers(SEEDED_USERS[0].id),
    data: { name },
  });
  const item = asItem(await body(response, `POST /api/equipment ${name}`), `creating ${name}`);
  if (item.name !== name) {
    throw new Error(`creating ${name}: the stack stored the name ${JSON.stringify(item.name)}`);
  }
  return item;
}

/** Lend an item to a member as Ada, so a row can start from a loan it did not make. */
export async function lendTo(request, itemId, memberId) {
  const response = await request.post(`${EQUIPMENT}/${itemId}/borrow`, {
    headers: headers(SEEDED_USERS[0].id),
    data: { borrowerId: memberId },
  });
  const item = asItem(await body(response, `borrow ${itemId}`), `lending item ${itemId}`);
  if (item.status !== 'on_loan' || item.borrowerId !== memberId) {
    throw new Error(
      `lending item ${itemId} to user ${memberId}: the stack holds ${JSON.stringify(item)}`,
    );
  }
  return item;
}

/** Take an item out of service as Ada, for a row that must start from one. */
export async function takeOutOfService(request, itemId) {
  const response = await request.post(`${EQUIPMENT}/${itemId}/out-of-service`, {
    headers: headers(SEEDED_USERS[0].id),
  });
  const item = asItem(await body(response, `out-of-service ${itemId}`), `item ${itemId}`);
  if (item.status !== 'out_of_service') {
    throw new Error(
      `taking item ${itemId} out of service: the stack holds ${JSON.stringify(item)}`,
    );
  }
  return item;
}
