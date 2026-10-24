/**
 * The one place the stack's address is decided.
 *
 * Frozen at the S4 freeze. Read-only to every builder, S4's own included.
 *
 * Blueprint section 6 gives `E2E_BASE_URL` the default `http://localhost:8080`,
 * and command C11 exports it. The Playwright configuration and the rows that
 * open a second browser context both read it from here, so a run cannot end up
 * with two different addresses in it, which would make a "two contexts on the
 * same stack" row (eval plan 1.3) quietly false.
 */
export const BASE_URL = process.env.E2E_BASE_URL ?? 'http://localhost:8080';
