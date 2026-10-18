# Meeting modal TypeScript trial blueprint

Version 0.9 · TypeScript/browser direction selected by Jay on 2026-10-17 · Factory approval not yet recorded

## 1. Scope and authority

Build one browser page listing a snapshot of upcoming items from the Google Calendar named **Meetings**. Claude obtains the snapshot through its configured MCP connection. Clicking an item opens its title, start/end and calendar name in a modal with Close. Display the snapshot’s fetched time; no automatic refresh or reminders.

Jay explicitly selected TypeScript and dropped Xcode for this trial. This supersedes the native implementation plan. The active [PRD](PRD.md) defines the same browser-modal trial. The [future reminder PRD](FUTURE-REMINDER-PRD.md) preserves the larger product idea and adds no scope to this build. The trial proves a working browser UI and, only if evidenced, the factory process used to build it. It does not prove native Mac interruption.

## 2. Architecture and stack

Use plain TypeScript, HTML and CSS, with Vite for the local server/build and Playwright for browser acceptance tests. No frontend framework or runtime library is needed. Use the existing Node 22.23.2/npm 10.9.8 environment as the preparation baseline; select compatible dependency versions and preserve them in package-lock.json before approval/locking. Vite supports a [vanilla TypeScript project](https://vite.dev/guide/).

One UI layer is sufficient. The HTML defines the list and one standard `<dialog>`; TypeScript reads a same-origin snapshot, renders its items and wires item selection to `showModal()` and Close to `close()`; CSS provides readable spacing and visible focus. Use the browser's dialog behavior rather than a custom modal manager. Give the dialog its accessible name through its heading. These APIs and built-in modal behavior are documented in the [dialog reference](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/dialog).

Planned application root: `web/` beside this spec. Paths relative to that root:

```text
index.html                     Page, list, dialog markup and entry point
src/main.ts                    Snapshot rendering and modal event handlers
src/style.css                  Minimal presentation and focus styles
package.json, package-lock.json Tool versions and fixed scripts
tsconfig.json                 Strict TypeScript checks
playwright.config.ts           Chromium, server and evidence configuration
test/modal.spec.ts             Independent acceptance tests
public/meetings.json            Synthetic snapshot only; never real calendar data
.gitignore                     Generated build/test output excluded from Git
```

Keep application code direct and understandable. No services, storage layer, state framework, dependency-injection system or future-feature scaffolding. Tests drive the real page; production code must not detect tests or render a substitute UI for them.

Security: no browser credentials, third-party services, analytics or external assets. Render calendar text as text, never HTML. Automated fixtures are synthetic; live meeting data is a local runtime input, never committed or uploaded in CI evidence. Serve locally on 127.0.0.1. Local page/asset requests are expected; no external application requests are needed. `.env` is not applicable because this test has no configurable secrets or environments. Docker is not applicable because there are no backend/database services.

## 3. Calendar snapshot and behavior

Claude uses its existing MCP host connection; the page is not an MCP client. Use read operations only. List calendars, resolve the exact display name **Meetings**, and use the returned calendar ID for every event read. If no calendar matches or multiple calendars match, report that condition and ask Jay to identify the intended calendar. Do not select Primary, fuzzy-match another name or combine calendars. Do not treat a tool error as an empty calendar.

For a bounded trial snapshot, read events starting in the next seven days, following pagination and expanding recurring occurrences when the connected tool supports it. Record the actual time window and fetched time. If the tool cannot express that query, report its limit rather than claiming complete results. No new attendee/link eligibility heuristic is added to this list trial. Use the event’s provided dates for all-day items and instants for timed items.

The snapshot contains `calendar: {id, name}`, `fetchedAt`, `window: {from, to}`, and `events: [{id, title, start, end}]`. Preserve date-only values for all-day items; timed values include an offset. Display the timezone alongside timed event values, plus the queried window and fetched time. No descriptions, attendee lists, tokens or full MCP responses are needed. Missing titles display “Untitled meeting.” Validate the snapshot shape and calendar name before rendering; malformed/unavailable data produces a visible error, while a valid empty list shows “No upcoming meetings.” The source ID’s correctness is checked against the MCP read evidence, not inferred from a label alone.

Preparation must verify that `dist/`, `node_modules/`, `test-results/` and `playwright-report/` are ignored before writing live data or browser evidence. Preparation supplies a synthetic snapshot at `public/meetings.json`. The page fetches `/meetings.json` once on load. After building for a private live demo, Claude may replace the ignored `dist/meetings.json` with the real snapshot; do not put real data in `public/`, source or fixtures. Never publish that local dist folder or include it in shared artifacts. A rebuild restores the synthetic fixture, so the fetched timestamp/source must stay visible. Production code is identical for synthetic and live data. No file-import UI, backend, credential bridge or sync service is needed.

This runtime-data handoff is Claude’s job, not a manual copying task for Jay. The live snapshot is not part of the approved source tree; code evidence binds the source revision and synthetic tests, and private live verification identifies its source calendar ID and fetched time separately.

## 4. Behavior and eval mapping

| Criterion | Required behavior | Eval |
| --- | --- | --- |
| TR-01 Initial state/opening | Snapshot items are available; modal is initially hidden. Clicking an item opens exactly one modal showing that event’s details. | MOD-01 |
| TR-02 Closing | Close hides the modal, leaves the page usable and schedules no return. | MOD-02, MOD-05, RST-03 |
| TR-03 Reopening | Clicking an item again opens it once; selecting another item shows its own details. | MOD-03 |
| TR-04 Accessibility | Keyboard operation, named controls/dialog, visible focus, focus inside the modal while open and returned to the selected item after closing. | MOD-04, MOD-06 |
| TR-05 Scope and structure | Only the specified behavior, one UI layer and declared dependencies. | MOD-05, RST-02, RST-03, RST-04 |
| TR-06 Delivery | Typecheck/build and browser evals pass; Jay can open the local URL and try the built page. | MOD-06 |
| TR-07 Calendar source | Exact Meetings calendar ID, read-only MCP acquisition, source/fetched time, correct empty/error states. | CAL-01, CAL-02, CAL-03, RST-01 |

No browser Google/MCP integration, calendar writes, background synchronization, timers, sounds, repeating reminders, Join/Skip controls, settings, wake handling, login startup, overlap/reminder coordination, desktop wrapper or native integration. Events with overlapping times still appear as ordinary snapshot items; no coordination or reminder behavior is added. Existing mockup screens do not expand this scope. The broader mockup's previous passing tests do not count as tests of this deliverable.

## 5. Preparation and one builder story

| Phase | Owner/output | Exit |
| --- | --- | --- |
| Contract/test preparation | Spec/eval author creates the minimal web baseline, pinned tooling and independently authored acceptance tests. A separate reviewer checks their validity. | Baseline loads; tests detect missing modal behavior for expected assertion reasons rather than setup errors. Actual factory route and protected inputs are identified, then approved/locked through the supported process. |
| MODAL-1 implementation | One builder implements the three application files below. | Required checks pass for the candidate and the builder supplies its revision, results and handoff. |
| Verification/acceptance | Independent reviewer checks scope and evidence; Jay tries the local page. | Correctness and restraint evals (MOD, CAL and RST) have passing evidence and no blocking finding remains. |

There is only one application story. Parallel builders would overlap the same small UI, so implementation is sequential. These phases reuse the existing workflow, not new gates.

**Story MODAL-1 — show and dismiss the meeting modal.** Authority: Jay’s TypeScript/browser choice and accepted MCP snapshot demo using Meetings. Inputs: approved spec/eval contract, reviewed acceptance tests, runnable baseline and actual factory authorization. Builder scope: `index.html`, `src/main.ts`, `src/style.css`, relative to `web/`. Output: the behavior in sections 3–4 and evidence for the candidate revision.

Synthetic fixtures, test/configuration files, dependency manifests/lockfile and this contract are outside builder scope and must be protected through the actual factory mechanism. The builder may report a defective test or needed configuration change, but cannot silently change tests, discovery, scripts, dependencies, architecture or scope to pass. Optional additions stay in the backlog.

## 6. Commands and evidence

Preparation creates and verifies these scripts: `build` = `tsc --noEmit && vite build`; `preview` = `vite preview`; `dev` = `vite`; `test:e2e` = `playwright test`. Use strict TypeScript checking. Playwright's Chromium project must serve the freshly built `dist/` through `preview` at 127.0.0.1:4173, with strict port handling and no reuse of an unrelated running server. Its [webServer support](https://playwright.dev/docs/test-webserver) manages that lifecycle.

From `web/`, the verification sequence is:

```sh
npm ci
npx --no-install playwright install chromium
npm run build
npm run test:e2e
```

Provision required browser system libraries in CI if absent. Keep browser setup separate from behavior results. Tests must exercise the current built artifact, not a stale dist folder or the earlier mockup. Preserve test identities/counts, JSON results, failure traces/screenshots, command exits and the candidate revision. MOD-01 through MOD-04, CAL-02/CAL-03 and the automated RST-02/RST-03 checks must all execute and pass without skips or retries masking an initial failure. Zero-test success is not a pass. Record the RST agent/source reviews separately: automated browser observations do not prove unobserved agent choices or architectural simplicity.

For Jay's click-through after a passing build:

```sh
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

Open http://127.0.0.1:4173 in Orca's browser or a local browser. The commands and paths are the intended contract; the web project has not been generated or run in this documentation update.

## 7. Readiness and stop

Browser implementation and acceptance-test source still need preparation. Earlier Swift/XCTest files in `app/` are retained as superseded work and are not builder inputs. No Xcode installation, Apple account, native signing or Mac UI runner is required for this trial.

[Factory readiness](FACTORY-READINESS.md) distinguishes browser compatibility from a verified factory route. TypeScript alone does not make existing Vitest commands execute Playwright or protect arbitrary paths. Establish that route before dispatch; report a concrete blocker rather than inventing records, bypassing protections or resuming the parked migration.

Stop when the built browser modal meets [the eval contract](EVAL-PLAN.md) and Jay can try it. No deployment, independent sync or reminder expansion is part of this story. Jay confirmed that Claude successfully read Meetings through MCP. Preserve that run’s calendar ID, fetched time and query window for CAL-01; a successful read alone does not demonstrate the browser UI.

What changed: specified the exact Meetings calendar and the minimal MCP-to-local-snapshot handoff; kept one implementation story.
What was checked: spec/eval/PRD consistency and official tooling documentation; Node/npm versions observed locally.
What remains uncertain: prepared web harness/results and actual factory binding. MCP access to Meetings is confirmed by Jay’s report of Claude’s successful read.
What approval authorizes: Jay selected TypeScript/browser; this edit creates no factory approval or lock record.
