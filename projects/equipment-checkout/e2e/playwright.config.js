/**
 * The frozen configuration of the J rows (mechanism J, eval plan 1.1 and 7.4).
 *
 * Frozen at the S4 freeze. Read-only to every builder, S4's own included. The
 * builder's own scripts are never used: command C11 passes this file with
 * `--config`, so nothing a builder puts in a `package.json` or another config
 * can change how its own exam is run.
 *
 * What 7.4 requires of this file: the J rows, two browser contexts and the
 * rewriting of a request's identity or body by `page.route`; one worker; JUnit to
 * `e2e/reports/journey.xml`; trace and one screenshot per step.
 *
 * There is deliberately no `webServer`. Command C10 starts the Compose stack
 * before C11 runs, and the production rows stop and start it themselves. A
 * `webServer` here would start a second one, or fight the ones they start.
 */

import { BASE_URL } from './support/base-url.js';

export default {
  testDir: '.',

  /**
   * One worker, and nothing parallel inside a file.
   *
   * This is not a speed setting. Every J row acts on one shared stack with one
   * database, and the production rows take that stack down; two tests at once
   * would see each other's items and each other's restarts.
   */
  workers: 1,
  fullyParallel: false,

  /**
   * No retries. A frozen exam reports what happened the first time: a row that
   * passes only on a second attempt has not shown the behaviour its criterion
   * claims, and a retry would hide exactly the race a J row exists to catch.
   */
  retries: 0,
  forbidOnly: true,

  /** Five seconds for an expectation, which is the timeout T-013-P14 names. */
  expect: { timeout: 5000 },
  timeout: 90_000,

  use: {
    baseURL: BASE_URL,

    /**
     * The trace is kept for every case, passing or failing, and carries a
     * screenshot per action, which is 7.4's "trace and one screenshot per step".
     * `screenshot: 'on'` adds the end-of-test image on top of those, so a
     * failure can be read without opening the trace viewer.
     */
    trace: { mode: 'on', screenshots: true, snapshots: true, sources: true },
    screenshot: 'on',
    video: 'off',
  },

  /**
   * Where the ordering requirement of C11 is kept.
   *
   * The three production rows stop the stack with `docker compose down` and
   * start it again. A test that does that in the middle of the suite destroys
   * every row after it, so they must be last — and "last" must be a guarantee,
   * not a side effect of how the files happen to sort. Playwright does run files
   * in alphabetical order, but nothing in this repository would break if someone
   * renamed a file, and the breakage would not look like a mistake: the
   * production rows would pass and the rows after them would fail for reasons
   * that have nothing to do with the build.
   *
   * `dependencies` is the runner's own ordering contract instead: every test of
   * the `journey` project completes before the first test of `production`
   * starts, whatever the files are called and whichever one a `--grep` selects.
   * The partition is by folder, so a new spec is in the journey project unless
   * it is deliberately put under `production/`.
   *
   * The cost, stated because it is not obvious: when the journey project has a
   * failure, Playwright does not run the dependent project at all. The three
   * production cases are then written into `journey.xml` as skipped rather than
   * as failing. They still fail the freeze, which needs a *passing* case titled
   * with each row's id, and a stack that fails the journey rows could not have
   * evidenced a restart anyway.
   */
  projects: [
    { name: 'journey', testMatch: 'journey/*.spec.js' },
    { name: 'production', testMatch: 'production/*.spec.js', dependencies: ['journey'] },
  ],

  /** 7.4: JUnit to e2e/reports/journey.xml. Both paths are relative to this file. */
  reporter: [['junit', { outputFile: 'reports/journey.xml' }], ['list']],
  outputDir: 'reports/artifacts',
};
