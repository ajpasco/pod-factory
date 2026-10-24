/**
 * Stopping and starting the Compose stack, for the three production rows.
 *
 * Frozen at the S4 freeze. Read-only to every builder, S4's own included.
 *
 * Eval plan 7.2, C11: the production rows T-016-P3, T-016-P4 and T-016-N3 "run
 * last, because they stop and recreate the stack with `docker compose down` and
 * `up` from the repository root and the same `--env-file`". The same file means
 * `harness/e2e/eval.env` (7.4), so the stack a restart row brings back is
 * configured identically to the one C10 started; a row that started it from a
 * developer's own `.env` would be testing a different stack.
 *
 * On "the repository root". Every path in the eval plan's command sequence is
 * relative to the equipment-checkout project folder (`api/tests/unit`, `web/`,
 * `e2e/`, `harness/`), and `docker-compose.yml` is one of S4's files inside that
 * folder, so the root the commands mean is the project folder. It is resolved
 * from this file's own location rather than written down, so moving the project
 * cannot leave a path behind.
 */

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { expect } from '@playwright/test';
import { readUsers } from './api.js';
import { SEEDED_USERS } from './strings.js';

const support = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(support, '../..');
const envFile = 'harness/e2e/eval.env';

/**
 * One `docker compose` call. A non-zero exit throws, with the command and the
 * output in the message: a restart that did not happen must not leave a row
 * asserting against the stack it was trying to replace.
 */
export function compose(...args) {
  const argv = ['compose', '--env-file', envFile, ...args];
  const result = spawnSync('docker', argv, {
    cwd: projectRoot,
    encoding: 'utf8',
    timeout: 360_000,
  });
  const shown = `docker ${argv.join(' ')}`;
  if (result.error) {
    throw new Error(`${shown} could not start: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `${shown} exited ${result.status}\n${result.stdout ?? ''}\n${result.stderr ?? ''}`.trim(),
    );
  }
  return result.stdout ?? '';
}

/**
 * Wait until the stack answers again, without pausing for a fixed time.
 *
 * `docker compose up -d` returns as soon as the containers are created, which is
 * before PostgreSQL accepts connections and before the API has run its start-up,
 * so the rows that quote that command (T-016-P4, T-016-N3) need a condition to
 * wait on. The condition is the one thing every restart row needs to be true
 * anyway: the user list reads as the three seeded users. It is a readiness probe
 * and no row's assertion: each row reads the list again itself and says what it
 * found.
 */
export async function waitForTheStack(request) {
  await expect
    .poll(
      async () => {
        try {
          const users = await readUsers(request, SEEDED_USERS[0].id);
          return users.length;
        } catch {
          return 0;
        }
      },
      { timeout: 300_000, intervals: [500, 1000, 2000] },
    )
    .toBe(SEEDED_USERS.length);
}
