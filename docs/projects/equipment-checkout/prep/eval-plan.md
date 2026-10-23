# Eval plan and stories: Shared Equipment Checkout (Trial)

Status: revision 4 by the preparation drafter, for the orchestrator's check against `docs/orchestrator/rubrics/eval-plan.md`, including its sections "What a test may assert" and "Rows verified by a person". Nothing here has been run, and no implementation exists.

Inputs, and only these: `prep/PRD.md` (amended 2026-10-20 for the third round: REQ-001 to REQ-017, 182 labelled criteria, each stated as a business outcome and none naming a status code; no question open), `prep/TECH-SPEC.md` (the blueprint: the 182-row verification register in its section 4, the concurrency table in its section 8, the four-story split in its section 9, GAP-1 and OP-3 in its section 11, the pinned interface contract in its section 12), `prep/inputs/decisions-20261020.md` (D-01 to D-27) and the rubric. This plan creates, changes and renumbers no requirement ID.

What revision 4 changes, in one paragraph: the nine criteria the third round added (REQ-013.18 to REQ-013.26: an Add made from the Show empty list view, D-26, and a failed list fetch, D-25) are covered at the levels the register names (section 4.5); the four review rows are now the two steps of D-27, an agent pre-review and then the user's record, with the record alone as the pass condition (T-015-P5 to T-015-P7, T-017-N9; section 1.5); the blueprint's four-check placement of the inline validation message replaces "by the Add field" and gets its browser rows (T-009-N14, T-009-N15, T-013-N10, T-013-N12); three anchors that a build implementing nothing could satisfy are tied to the feature itself (T-003-N1, T-010-N3, T-013-N2); the two journey rows that could not fail on a server that failed to seed now read the real user list (T-016-P3, T-016-N3); T-014-P6 is split and its controls isolated (new T-014-P12); titles are test ID first, labels second, and the concurrency-pair tests carry no label (DD-24); REQ-005.3 is read as an admin's request only; and the stale quotations of blueprint sentences are gone, the conflict over the rules-level rows being recorded as settled (1.1 and 9.5). Revision 3's own record stays in sections 4.1 to 4.4.

---

## 1. Conventions and baseline

### 1.1 IDs, kinds, P and N, and the rules every row follows

- A test ID is `T-<req>-P<n>` or `T-<req>-N<n>`, with `<req>` the PRD's own number. IDs are stable and never reused. A test of the previous revision keeps its ID where it survives; a test that no longer survives is listed in section 4.2 and its ID is not given to another test. Numbers therefore are not continuous: the missing numbers are exactly the retired ones in 4.2.
- **P** (positive): the behaviour the requirement describes happens. **N** (negative): a prohibition, refusal or boundary holds, or something that must not appear does not.
- **Kinds** follow the rubric, mapped from the blueprint's mechanisms (blueprint 4.1):

| Mechanism | Kind in this plan | Story | Report it writes |
|---|---|---|---|
| U: the decisions of the rules layer taken one at a time, no database, no HTTP | `unit` | S1 | `api/reports/unit.xml` |
| D: the data store written to directly, real PostgreSQL 16: what it holds and what it will not hold | `integration` | S1 | `api/reports/db.xml` |
| I: `TestClient` on `app.main:app` against real PostgreSQL 16, with threads for concurrency, a direct call into the application for header values no HTTP parser would deliver, and a dump of everything the database holds | `integration`; `restraint` for the data-store check KD | S2 | `api/reports/integration.xml` |
| C: Vitest, React Testing Library, jsdom, global `fetch` faked, rendering `src/App.jsx` | `unit`; `restraint` where it scans for what must not exist | S3 | `web/reports/component.xml` |
| B: Playwright and Chromium on the production build served by `vite preview`, API faked with `page.route` | `e2e`; `restraint` for the control inventory | S3 | `web/reports/browser.xml` |
| J: Playwright and Chromium on the running Compose stack, with two browser contexts and request rewriting | `e2e`; `production` where the test stops and starts the stack; `restraint` for browser storage and origins | S4 | `e2e/reports/journey.xml` |
| R1: mockup comparison review; R2: non-goal walk-through. Each is two steps: an agent pre-review, then the user's review (D-27; blueprint 4.1.3; section 1.5) | `review` | S4 | The user's records, which are the evidence: `evidence/review/mockup-comparison.md`, `evidence/review/non-goal-walkthrough.md`. The pre-review reports are inputs to them and never evidence: `evidence/review/mockup-comparison-prereview.md`, `evidence/review/non-goal-walkthrough-prereview.md` |

- Each Given / When / Then is one sentence in plain English. It ends with the labelled criteria it checks in square brackets, for example `[REQ-004.1]`. Section 5 is derived from those brackets. A test whose brackets are empty checks no labelled criterion; its sentence says what it checks instead and why it exists.
- **The assertion rule.** A Then asserts what a business requirement claims: what a person sees or is shown, what the application does or refuses to do, and what it keeps. No row asserts an HTTP status code, a table or column shape, a log line's format, a module, function, file or locator name as the thing under test, whether a particular call was or was not made, or the presence of a library, framework or build tool. A locator, an API operation or a dump of the data store may be the instrument that observes an outcome; it is never the thing verified. Three consequences:
  - **What class a row may state depends on what it drives (blueprint 4.1.1).** An **integration row**, which drives the HTTP API, asserts that the action was carried out or was not, and that nothing changed. "Confirmed" is the PRD's word (the back-end has carried the action out and reports success); "not confirmed" means it was not carried out and a read-back shows the list exactly as before. An integration row never says which code answered, never recognises an outcome by a code, and never says which class of refusal or rejection it was. A **rules-level (unit) row** drives the rules layer, whose output is the decision itself, and **may state the class of decision it returned**, in the PRD's section 4 words: "refuses" where the PRD's Refused applies (no usable identity, or a role that may not make the request) and "rejects" where its Rejected applies (any other reason), never the other way round. It states no code and does not name the type that carries the class; it never asserts that a function was called or that checks ran in an order. The difference a person sees between a refusal and a rejection is the Access denied modal against the API failure modal. It is asserted in the C, B and J rows, where it is observable (T-007-P1, T-007-P4, T-004-N8, T-004-N9, T-005-N7, T-008-N11, T-008-N12, T-011-N9, T-012-N4, T-012-N9, T-012-N10, T-001-N8, T-003-N4, T-003-N5, T-013-P21, T-013-N14, T-013-P22).
  - **"The request was not sent" is asserted as "nothing changed".** A C row with a fake server that would accept the request and holds every answer checks that, once the held answers are released, the data and the rows are as before.
  - **"Nothing is recorded about who did it"** (REQ-004.10, REQ-006.7) and "nothing is stored that the PRD does not describe" (REQ-017.3 to REQ-017.6) read the data store and assert about values, never about the names of tables or columns (T-004-N5, T-006-N4, T-017-N7).
- **Where this plan and the blueprint now agree.** Blueprint 4.1.1 and 4.4 now say what this plan asserts: a row that drives the HTTP API asserts only that the action was carried out or was not and that nothing changed, with no status code as the thing verified or as an instrument; a rules-level row may state the class of decision the rules layer returned, with no code. The earlier conflict over the rules-level rows was settled in this plan's favour: a rules row may state the class, an integration row may not. Section 9.5 records the settlement; nothing in the blueprint is left to correct.
- **REQ-005.3 is an admin's request only.** The blueprint reads REQ-005.3 as covering an admin's Borrow that names an admin (rejected). A member's Borrow that names the admin is a refusal and is verified once, under REQ-003.6 (T-003-N2, T-003-N3, T-003-N4, T-003-N5). T-005-N3 and T-005-N4 are an admin's requests; no REQ-005 row sends a member's.
- **The bracket rule.** A row is bracketed only with criteria it can observe. An API row may carry a criterion that states a result in the data (an item on loan to Mia, an item gone from the list); the row reading is the client's rendering of that data and is checked by the C row. A criterion about what the interface shows (an icon, a modal, an inline message, a loader) is never bracketed on an API or rules row alone; the C, B or J row carries it. A rules-level row whose only candidate was such a criterion carries no bracket.
- **The anchor rule.** A sentence that asserts something is absent, hidden, unchanged or not sent first asserts, with the word "first", that the surrounding thing was found: the rows were found, the list was rendered, the controls were enumerated, the modal was open. An absence assertion without that anchor passes on an application that renders nothing, so none is written. Where a build that renders rows and implements nothing could still satisfy the anchor, the anchor is the feature itself, shown working in the same row (T-003-N1, T-009-N4, T-010-N3, T-011-N2, T-012-N1, T-012-N2, T-013-N2). In each, the feature whose absence is claimed for the viewer is first found working for a user who has it: the borrower selection and its member buttons for Ada (T-003-N1), the Mark out of service and Restore icons for Ada (T-010-N3), the Delete x icon for Ada (T-011-N2), the Add field and Add card for Ada (T-009-N4, T-013-N2).
- **The string rule.** Text is asserted exactly only where the blueprint pins it in section 12.9, with "–" as U+2013 and "…" as U+2026. No row asserts text that no source pins. The three strings of D-22 are asserted in T-001-P6 ("Choose a user"), T-001-P7 (the entry format) and T-009-P11 ("Name must be 100 characters or fewer."; also in T-009-N15 and T-013-N11).
- **Titles (blueprint DD-24).** In code, each test title begins with the test ID, then the labels of the criteria the test checks, then a description, for example `T-008-N3 REQ-008.1 REQ-008.4 REQ-008.8 two simultaneous borrows`. The labels are the run of `REQ-nnn.m` tokens that follows the ID; a label mentioned later in the description is a cross-reference and is not read as a label. A concurrency-pair test that blueprint section 8 does not tie to a criterion carries the ID, then `CONC` and the pair, and **no criterion label**, for example `T-010-N8 CONC return/mark`: these are T-006-N7, T-008-N8, T-008-N10, T-009-N12, T-010-N6, T-010-N7, T-010-N8, T-010-N9 and T-011-N8 (the table in 5.3 names each pair). A test with no labelled criterion that is not a pair test carries the ID and its description. This keeps the rubric's rule (the title starts with the ID) and the blueprint's evidence rule (a criterion is evidenced by a passing case whose title carries its label in the named report). **In Python the title is a function name**, which cannot hold a hyphen and must begin with `test_`, so the ID and the labels are spelled with underscores and the name opens with the ID: `test_T_008_N4_REQ_008_2_REQ_008_3_REQ_008_6_REQ_008_7_an_on_loan_or_out_of_service_item_cannot_be_borrowed`. The frozen `api/tests/conftest.py` recovers the canonical `T-008-N4` and `REQ-008.2` forms from the name and writes them into the JUnit report as the properties `row` and `criterion`, so the register is read from those properties and never from a transliterated function name. A name whose ID does not open it is refused by that same file, and the four reports of the other mechanisms carry the labels in their own titles, where a hyphen is allowed.
- **The placement of the inline validation message (blueprint 12.8.1, from PRD section 4).** "By the Add field" is not a check. A row that shows the message applies the blueprint's four checks: (1) the message is a descendant of the Add card; (2) it comes after the Add field in document order; (3) laid out, the top edge of its box is not above the lower edge of the Add field's box and the two boxes do not overlap; (4) its whole box lies within the Add card's box. A C row runs in jsdom, which has no layout, and applies checks (1) and (2) only; a B row runs in Chromium and applies all four. The message is not a modal: no element with the alertdialog role exists when it shows. This is the placement in T-009-N1, T-009-N2, T-009-N8, T-009-N11, T-009-N14, T-009-N15, T-013-N9, T-013-N10, T-013-N11 and T-013-N12.
- **No row sleeps.** A row that concerns the 900 ms Show loading demo waits for the list indicator to appear and then to disappear (C and J), or advances a clock the test controls (C). No row pauses for a fixed time.

### 1.2 Baseline, and what each report holds on it

The baseline is a checkout that holds the frozen tests and the frozen harness (section 7.4) and none of the application: no `api/app/`, `api/requirements.txt`, `api/pyproject.toml`; no `web/package.json`, `web/index.html`, `web/vite.config.js`, `web/src/`; no `docker-compose.yml`, `.env.example`, Dockerfile, `web/nginx.conf`; no review record. The frozen test directories `api/tests/`, `web/tests/`, `web/playwright.config.js`, `e2e/` and the folder `harness/` do exist, because they are frozen files.

The command list (section 7) runs every step whatever an earlier step did, so a row's state is what its own report holds on the baseline. What each report holds:

- **`unit.xml`.** The unit modules import the rules module at module level (7.4) and the application is absent, so pytest reports one collection error per test module: an error entry named after the module, and no case per row. A row is `fails` by absence: the freeze requires a passing case titled with the row's ID, and none exists.
- **`db.xml` and `integration.xml`.** The frozen conftest files import the application only inside fixtures, and the first statement of each such fixture is that import (7.4). pytest therefore does **not** fail at collection: it collects every case, and each case errors at setup when its fixture imports `app` and raises `ModuleNotFoundError`. The report holds **one case per row, each carrying an error entry** (not a failure and not a pass), and no collection error. The error is the same whether or not PostgreSQL is running. Every such row is `fails`: no passing case titled with its ID exists.
- **`component.xml`.** Vitest loads each test file; the import of `src/App.jsx` cannot be resolved; Vitest marks the file failed and reports no case for its rows. A row is `fails` by absence.
- **`browser.xml`.** The frozen `web/playwright.config.js` starts its web server (a production build of `web/`, then `vite preview`). Without `web/package.json` the server cannot start and Playwright stops before any test runs. The report holds no case. A row is `fails` by absence.
- **`journey.xml`.** The stack is started by a separate step, not by the config. Each case runs: its first page load finds nothing on port 8080, or its first `docker compose` call finds no file, and the case fails. One failing case per row.
- **Review records.** Neither the pre-review reports nor the user's records exist. See `cannot run` below.

The three state values:

- `fails:` the step runs and the report shows the row failing, erroring or absent, as the row's cell says.
- `cannot run:` used for the four review rows only. A review is done in two steps on a built candidate, an agent pre-review and then the user's review (1.5); on the baseline there is no candidate, so neither step can run. Each names the story that creates what it needs.
- `passes:` is not used. Every absence assertion carries a positive anchor (1.1), and the anchor fails on the baseline. No honest vacuous pass exists.

### 1.3 Harness vocabulary

- **Page** (C rows): `<App />` from `web/src/App.jsx` (default export, no props), rendered with `globalThis.fetch` replaced by a **fake server**: a stateful in-memory stand-in for the contract of blueprint 12.3. It acts for the identity each request carries and applies what the page sends, so a wrong request shows as a wrong result. No row asserts what the page sent.
- **Answers of the fake server.** A test sets what the fake server does with a request: it *confirms* it (carries it out on its data and returns the item); it *refuses* it (a permission refusal, nothing changes); it *rejects* it (not carried out, nothing changes) in one of four kinds: the item is no longer in the right state, the item is no longer there, a server error, or (for an Add) the name is not acceptable; or the request *never reaches the server* (the call itself fails). A request can be *held*: the fake server keeps its answer back until the test *releases* it. The harness maps these classes to the answers of blueprint 12.3.1; no row asserts which answer a class uses. "Pick X" is selecting the switcher option whose value is X's id. For the **list request** (the request the page makes when a user is picked and again at Retry after a failed list fetch) the fake server may *confirm* it, *refuse* it, *reject* it as a server error or as a missing resource, or the request may *never reach the server*; it may be *held* like any other; and it may be set to confirm a list request only when it carries a given identity and to refuse any other. A list request that is refused is not a failure (PRD section 4, List fetch): the page shows the Access denied modal.
- **Settled** (C rows): every held answer has been released and the page shows no loader. **Unchanged** (C rows): once settled, every item's name, status and borrower in the fake server's data, and every row, are as they were before the action.
- **The page's clock** (C rows): where a row names a duration, the test controls the page's clock and advances it; it never pauses for real time.
- **Browser page** (B rows): the production build in Chromium with every `/api` request answered by `page.route`. **Stack** (J rows): the Compose stack at `http://localhost:8080` with the real API and database; tests create the items they need through the API as Ada and name them uniquely, and none assumes an empty list. **Two contexts** (J rows): two browser pages on the same stack, each with its own picked user and its own list, so that one acts while the other still shows an older list.
- **As Ada, as Mia, as Sam.** The request carries `X-User-Id` 1, 2 or 3 (blueprint 12.2). A request "with no identity", "with a malformed identity" or "with an unknown identity" follows blueprint 5.1. The malformed values are the blueprint's probe set (DD-23, 5.1.1); padded and doubled values (a leading or trailing space, a tab, a line break, two identity headers) are delivered by a direct call into the application, because no HTTP parser would deliver them, and are not claimed over the wire.
- **Forced attempt.** The PRD defines the term and does not say how one is made. At the API level this plan makes it a direct request through `TestClient` that carries a member's `X-User-Id`. In the browser (J) it is a legitimate action by Ada whose outgoing request has its identity, or its body, rewritten by `page.route`, so the page's own handler receives the real server's answer.
- **Fresh database.** The fixture drops both tables and lets `db.initialise` rebuild them, so ids start again and exactly the three seeded users exist. A row never assumes an item id; it reads ids from responses.
- **Read back.** The equipment list read as Ada after the action: every item's id, name, status and borrower. **Dump.** Everything the application's database holds, read table by table without assuming which tables exist; a row asserts about the values in it, never about the names of tables or columns.
- **Lent to Mia** means an admin borrowed the item for Mia. The list order is by `id` ascending (DD-18); rows do not depend on it except where they say so.
- **Decisions** (U rows) are the rules layer's decisions taken one at a time. A row speaks of "the decision", never of a function. "Refused" and "rejected" in a U row are the PRD's section 4 words (refused: there is no usable identity or the actor may not; rejected: any other reason) and state the class of decision the rules layer returned (blueprint 4.1.1); they are never the name of the type that carries the class and never a code.
- **Show empty list view.** What the page shows after Show empty list: the text "No equipment yet" (with the Add card above it for an admin) and no list of rows, held until the acting user changes, Show loading is activated, or an Add made from it is confirmed (D-21, D-26). An Add made from it is an ordinary Add.
- **Placement** (of the inline validation message) is the four checks of 1.1, applied by a C row in the DOM (checks 1 and 2) and by a B row in Chromium (all four).

### 1.4 Plain-English names and their pinned locators

Rows use the left column. The right column is the blueprint's `data-testid` (12.8). `<id>` is a user id.

| In a row | Locator | In a row | Locator |
|---|---|---|---|
| the switcher; its placeholder; its user entries | `switcher`; `switcher-placeholder`; `switcher-option-<id>` | row; row name; row status | `row`; `row-name`; `row-status` |
| the state demos panel | `state-demos` | row loader | `row-loader` |
| the top bar; the role badge | `top-bar`; `role-badge` | list indicator | `list-indicator` |
| the equipment list | `equipment-list` | empty text | `empty-state` |
| the Add card (Add panel); Add field; Add icon | `add-card`; `add-input`; `btn-add` | Add loader; inline validation message | `add-loader`; `add-validation` |
| Borrow, Return, Mark out of service, Restore, Delete x icons | `btn-borrow`, `btn-return`, `btn-out-of-service`, `btn-restore`, `btn-delete` | Close, Retry, OK, Cancel, Confirm icons | `btn-close`, `btn-retry`, `btn-ok`, `btn-cancel`, `btn-confirm` |
| the four demo controls | `demo-loading`, `demo-empty`, `demo-api-failure`, `demo-access-denied` | a member button | `member-button-<id>` |
| borrower, confirm-delete, API failure, Access denied modal | `modal-borrower`, `modal-confirm-delete`, `modal-api-failure`, `modal-access-denied` | modal title; modal body | `modal-title`; `modal-body` |

"The eleven icon controls" are Borrow, Return, Mark out of service, Restore, Delete x, Add, Close, Retry, OK, Cancel and Confirm. "The fifteen icon buttons" are the eleven and the four demo controls; they are `button:not([data-testid^="member-button-"])` (blueprint 12.8.2 and 12.8.3).

### 1.5 The review rows: two steps, and what counts as recorded

The four review rows (T-015-P5, T-015-P6, T-015-P7, T-017-N9) follow D-27 and blueprint 4.1.3. The rubric's section "Rows verified by a person" says what a review row states, and each row states it in its own cell. This section holds the definitions the rows share.

- **Step 1, the agent pre-review, runs first.** An agent in a session started for that task, **never the agent that built the candidate**. It is given the candidate (the merged candidate, by its commit hash), the criteria the review judges, the mockup (R1) or the non-goals of PRD section 7 (R2), and the whole conversation trail. **The trail is the list in blueprint 4.1.3, which is the one authoritative list. This plan does not restate it and gives no other.** The blueprint names there the files that hold each part of the trail and the PRD sections that restate them, and says that these documents are the preparation's own record and not a verbatim transcript. A row uses the trail in one way only: it names it, by this reference, as an input the pre-review is given.
- **What the pre-review report must contain.** The candidate commit hash it read; the date and time; each input it was given, named; the session it ran in, so that the user can see it is not the session that built the candidate; each gap it found, traced to the criterion it bears on and to the place in the trail the expectation came from, saying where in the build the difference shows; **a gap it cannot trace to a criterion or to a place in the trail, which it does not drop and to which it gives no invented trace, but reports as its own observation, labelled as such (blueprint 4.1.3)**; and a section **"What I could not judge"**, always present. An observation it could not trace changes no pass condition: like any other gap it is an input to the person's judgement and fails nothing. It gives no verdict: it does not use `matches`, `does not match` or `found none` as a verdict on any criterion. A report with no such section, or one that says only that it found nothing, is incomplete.
- **Step 2, the user's review, is the evidence.** The user reads the report alongside the build (for R1, the mockup too, in the same screen state) and records the verdict in the record file. The record opens with one line naming the report the user read: its path and the candidate commit hash the report records.
- **A valid report for the candidate's hash** is one that sits at the path the opening line names, records the commit hash of the candidate under review, and holds the section "What I could not judge". A record whose opening line is missing, or names a report that records another hash or lacks that section, does not name a valid report for the candidate's hash. It counts as not recorded: no entry of that record counts as recorded and every criterion of the row fails, as an unrecorded entry does. That is a fault in how the review was done and not a verdict of the report.
- **The report is an input, never a result the row asserts.** It can neither pass nor fail a criterion: a gap in it fails nothing, and the agent's "found none" closes nothing. The user may find what the agent missed, which is why the user reads the build and not only the report. **The pass condition of every review row is the user's record alone**: a verdict of `does not match`, a described finding, or a record that is missing or incomplete fails, and a row never passes by default.
- **The reviewer is the user (D-27)**, a person other than the author of the build; D-27 supersedes the blueprint's earlier default, DD-12, which named Allan Pasco as reviewer as the drafter's choice and not one the user had stated. If the user had authored any part of the build the condition would fail, and nobody else may record the verdict in the user's place.
- **Who writes what.** The pre-review report is written by the pre-reviewing agent and the record by the user. The S4 builder writes neither and runs neither step (blueprint 4.1.3 and 9.2).
- **The practical open point** of step 1 is OP-3 (section 2, item 7). The rows do not wait on it; step 1 cannot run until the means exist.

---

## 2. What the inputs still leave unpinned

The blueprint pins the mechanisms, report paths, test directories, JSON shapes, routes, module and callable names, the ASGI path, the locators, the strings and the version lines. What remains is only this; none is decided here beyond a proposal that the commands need.

| # | Needed by | What the inputs state | What is missing | Effect if it stays missing |
|---|---|---|---|---|
| 1 | The commands (section 7) | Test directories, report paths and tool version lines; `api/pyproject.toml`, `web/vite.config.js` and `web/package.json` belong to the builder | Where the freeze keeps the hash-pinned tool lists and the frozen pytest and Vitest configuration, so that the builder's own configuration is never used | Proposed: a folder `harness/` (7.4), owned by the story whose steps it gates (8.1). Only the commands change if it is placed elsewhere |
| 2 | Installation | Version lines, major.minor (12.10), chosen without checking registries (OP-2) | Patch versions and hashes | Recorded and hash-pinned at the freeze. A line that cannot be installed is reported and 12.10 is amended |
| 3 | D, I, B, J rows | Build environment (OP-1) is not stated | Docker Engine 24 or later with Compose v2, permission to stop and start containers, PostgreSQL 16, Chromium | The commands provision each (7.1); where the machine cannot, those rows have no evidence |
| 4 | C rows | Vitest 2.1, jsdom 25, React 18.3, one `App` default export | How the frozen Vitest configuration gives the tests one copy of React while the tools come from `harness/` | A harness-construction detail, checked when the harness is built; behaviour is unaffected |
| 5 | File names | Directories and report paths | File names inside the pinned test directories | The plan fixes directories and titles only |
| 6 | J rows of the two-context and rewriting scenarios | Blueprint 4.1 names two contexts and rewriting by `page.route` | The blueprint's wording for REQ-003.6 ("Ada chooses Mia, the identity is rewritten to Sam; the body is rewritten to name Ada") does not say whose identity accompanies the rewritten body | T-003-N5 takes the reading that keeps both variants a member's request (identity rewritten to Sam in both); an admin naming Ada is REQ-005.4 and has its own row |
| 7 | Step 1 of the four review rows (T-015-P5, T-015-P6, T-015-P7, T-017-N9) | D-27 fixes the condition: an agent in a session started for that task, never the agent that built the candidate, with the whole conversation trail as input. Blueprint 4.1.3 fixes what the report must say. The blueprint's OP-3 records the rest as open | OP-3, the practical point: how such a session is started; where the conversation behind the trail documents of blueprint 4.1.3 is held and how all of it is handed to the agent; and **whether the pre-reviewing agent can drive the running build** (open the page as Ada Admin and as Mia Member) **or can only read the candidate and its evidence** | Step 1 cannot run until the means exist. It blocks no story's code and no other row. No answer is given here. Where the agent cannot drive the build, its report says so under "What I could not judge", and the user's review goes on the build itself (1.5) |

---

## 3. The test table

Columns: ID, Given / When / Then, kind, owner story, state before the build. Owner stories are in section 8. The state cells say what the report holds on the baseline (1.2). "Collection error" means one error entry for the test module and no case for the row; "errors at setup" means the row's case exists in the report and carries an error entry.

### REQ-001: Switch the acting user

| ID | Given / When / Then | Kind | Owner story | State before the build |
|---|---|---|---|---|
| T-001-P1 | Given the app opened with no user picked, when the person reads the switcher's entries, then it first has exactly three user entries, for ids 1, 2 and 3, for Ada Admin, Mia Member and Sam Member in that order, each naming its user and showing that user's role (admin or member), and no fourth user entry. [REQ-001.1, REQ-001.2] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-001-P2 | Given Mia Member picked, an Available item in the list and the fake server confirming a Borrow with the item on loan to Mia, when Mia activates the Borrow icon on that row, then the row's status reads "On loan – Mia Member". [REQ-001.4] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-001-P3 | Given a fake server that acts for the identity each request carries, an Available row, and Ada Admin picked and then Mia Member picked, when Mia activates the Borrow icon, then the row reads "On loan – Mia Member", no modal appears, and the fake server's data holds the item on loan to Mia Member and not to Ada Admin. [REQ-001.5] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-001-P4 | Given a fresh database, when the user list is read as Ada, as Mia and as Sam in turn, then each read returns the same list of exactly three users in id order: 1 Ada Admin with role admin, 2 Mia Member with role member, 3 Sam Member with role member. [no labelled criterion; the seeded-user table of PRD section 3 and the usable identity of D-01, as the positive counterpart of T-001-N3, T-001-N4 and T-001-N7] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-001-P5 | Given the stack and an Available item created by Ada, when the person opens the app, reads the switcher, picks Ada Admin, then Mia Member, and activates the Borrow icon on that item, then the switcher's entries first equal the users the API lists (each entry reading "<name> (<role>)") and the row then reads "On loan – Mia Member". [REQ-001.1, REQ-001.4] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |
| T-001-P6 | Given the app opened with no user picked, when the page is shown, then the switcher shows the placeholder "Choose a user" and still lists exactly its three user entries, the placeholder not being one of them. [REQ-001.10] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-001-P7 | Given the app opened, when the person reads the three user entries of the switcher, then they read exactly "Ada Admin (admin)", "Mia Member (member)" and "Sam Member (member)". [REQ-001.11] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-001-N1 | Given the page rendered in each state (before a user is picked, loading, a list with all three statuses, empty, each of the four modals, and after each of the four demo controls) for Ada and for Mia, with the switcher and its three user entries found and, once a user is picked, the top bar and the list or the empty text found first, when every form field, link and text is scanned, then no password input and no link exists and no text reads sign in, sign up, log in, register or password in any letter case. [REQ-001.3] | restraint | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-001-N2 | Given Ada Admin picked with the Add field and two rows found, when the person picks Mia Member and the fake server answers the new list request, then the two rows are first found again and the Add field is no longer shown. [REQ-001.5] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-001-N3 | Given a fresh database holding one Available item, when every operation the API offers (list users, list equipment, add, borrow, return, mark out of service, restore, delete) and one path it does not define is sent with each of GET, POST, PUT, DELETE and OPTIONS and with no identity, then in every case nothing is returned to the caller, the item and the three users are unchanged, and, as the anchor, the equipment list read as Ada returns that item. [REQ-001.6] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-001-N4 | Given a fresh database holding one Available item, when every operation the API offers is sent with the identities `4` and `999999999` (well formed, no such user), then in every case nothing is returned to the caller, nothing has changed, and, as the anchor, the equipment list read as Ada returns the item. [REQ-001.8] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-001-N5 | Given the app opened and no user picked, when the page is shown, then the switcher is first found showing "Choose a user" with its three user entries, and then no equipment list, no row, no list indicator, no empty text and no Add card exists. [REQ-001.9] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-001-N6 | Given the check applied to an acting identity, when it is given no value, two values, and each single value that is empty, `0`, `01`, `-1`, `+2`, `1.0`, a leading space, a trailing space, `1` and a tab, `1` and a line break, `1,2`, `abc`, `1a` and `1234567890`, then each is refused as an acting identity, and first the values `1`, `2`, `3` and `999999999` are each accepted as the identity of that user number. [REQ-001.7] | unit | S1 | fails: no case in `unit.xml`; module collection error (`ModuleNotFoundError: app`) |
| T-001-N7 | Given a fresh database holding one Available item, when every operation the API offers is sent with each malformed identity (empty, `0`, `01`, `-1`, `+2`, `1.0`, a leading space, a trailing space, `1` and a tab, `1` and a line break, `1,2`, `abc`, `1a`, ten digits) and with two identity headers, the padded and doubled values delivered by a direct call into the application, then in every case nothing is returned to the caller, nothing has changed, and, as the anchor, the equipment list read with identity `1` returns the item. [REQ-001.7] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-001-N8 | Given the stack, Ada Admin picked and an Available item listed, when the identity on a request the page makes (the list request at a pick, and a Mark out of service of that item) is in turn removed, rewritten to `4`, and rewritten to each value the wire can carry (`0`, `01`, `-1`, `+2`, `1.0`, `1,2`, `abc`, `1a`, `1234567890`, and empty), then each time the Access denied modal appears reading "You do not have permission", and a fresh look as Ada shows the list and the item's status unchanged (padded and doubled values cannot reach the server over HTTP and are not claimed here). [REQ-001.6, REQ-001.7, REQ-001.8] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |

### REQ-002: Show name and status on every row

| ID | Given / When / Then | Kind | Owner story | State before the build |
|---|---|---|---|---|
| T-002-P1 | Given the fake server returning three items, one Available, one On loan to Mia Member and one Out of service, and Mia Member picked, when the list is shown, then there are exactly three rows, each showing its item's name and exactly one status, reading "Available", "On loan – Mia Member" and "Out of service" respectively. [REQ-002.1, REQ-002.2, REQ-002.3] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-002-N1 | Given Mia Member picked and rows in each of the three statuses, found first with their names and statuses, when the person activates each row and each row's name by mouse and by keyboard, then every button, link and input on the page is still one of the controls REQ-017.18 lists, none is a Details button, no row is a link, no dialog opens, and the page's URL and history length are unchanged. [REQ-002.4] | restraint | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-002-N2 | Given Mia Member picked and three items, one named `<img src=x onerror=alert(1)><button>Delete</button>`, when the list is shown, then the three rows are first found, the odd row's name reads exactly that text, and no image element, no extra button (the row has the same buttons as an ordinary Available row) and no call to `alert` comes from it. [REQ-002.1] | restraint | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-002-N3 | Given Mia Member picked and items in each status, none named with the word, found first as rows with their statuses, when each page state is rendered (list, loading, empty, each modal), then no element contains the word "Borrowed" in any letter case; and given one more item named "Borrowed Camera", the only element containing the word is inside that item's row name. [REQ-002.5] | restraint | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |

### REQ-003: Member borrows for themselves

| ID | Given / When / Then | Kind | Owner story | State before the build |
|---|---|---|---|---|
| T-003-P1 | Given Mia Member picked and several Available rows, when the list is shown, then every Available row shows the Borrow icon. [REQ-003.1] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-003-P2 | Given Mia Member picked, an Available row and the fake server holding its answer, when she activates the Borrow icon once and does nothing more, then no modal opens and no borrower choice appears, that row shows its row loader at once, and when the held answer is released as confirmed the fake server's data and the row show the item on loan to Mia Member, so the one activation was the whole of the request. [REQ-003.2, REQ-003.3] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-003-P3 | Given a Borrow held after Mia activated it on an Available row, when the answer is released as confirmed with the item on loan to Mia, then the row reads "On loan – Mia Member"; and when Sam Member is picked instead and does the same, the row reads "On loan – Sam Member". [REQ-003.4] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-003-P4 | Given a fresh database with one Available item, when Mia borrows it for herself (her identity, naming nobody), then the Borrow is confirmed with the item on loan to Mia Member, and the equipment list shows it so. [REQ-003.4] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-003-P5 | Given the stack and an Available item created by Ada, when the person opens the app, picks Mia Member and activates the Borrow icon on that item, then the row reads "On loan – Mia Member". [REQ-003.4] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |
| T-003-P6 | Given Mia as the acting member, when the application decides who the borrower is with nobody named and then with Mia's own id named, then the borrower is Mia both times. [no labelled criterion; the positive counterpart of T-003-N3. A decision-level check cannot see a row reading] | unit | S1 | fails: no case in `unit.xml`; module collection error (`ModuleNotFoundError: app`) |
| T-003-P7 | Given a fresh database with five Available items, when Mia borrows them one after another for herself, then all five Borrows are confirmed and all five items are on loan to Mia, because no limit applies. [REQ-003.8] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-003-P8 | Given Mia Member picked, one row On loan to Mia and two Available rows, when the list is shown, then both Available rows show the Borrow icon, and when she activates Borrow on one and the fake server confirms, that row reads "On loan – Mia Member" and her earlier loan row still reads the same. [REQ-003.7, REQ-003.8] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-003-N1 | Given Ada Admin picked first with Available rows found, when she activates the Borrow icon on one, then the borrower modal opens and its member buttons for Mia and Sam are found (so a borrower selection exists), and after she closes it and Mia Member is picked with Available rows found, when Mia activates the Borrow icon on one and the answer is held, then the row first shows its row loader (her own Borrow has started) and no borrower selection appears for a member's own Borrow: no member button, no select other than the switcher, and no text input exists on the page. [REQ-003.5] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-003-N2 | Given a fresh database with Available items, when Mia's identity sends a Borrow naming Sam, then one naming Ada, then one naming id 999 (no such user), then none is confirmed and the item is still Available with no borrower after each, and, as the anchor, a Borrow naming Mia's own id on another item is confirmed and that item reads On loan to Mia Member. [REQ-003.6] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-003-N3 | Given Mia as the acting member, when the application decides on a Borrow that names the other member, then one that names the admin, then one that names an id that names nobody, then each is refused, the unknown id in the same way as the other member, and first Mia's own id is accepted and the borrower is Mia. [REQ-003.6] | unit | S1 | fails: no case in `unit.xml`; module collection error (`ModuleNotFoundError: app`) |
| T-003-N4 | Given Mia Member picked and an Available row found, when she activates the Borrow icon and the fake server refuses it, then the Access denied modal appears with the body "You do not have permission", and the row still reads "Available", still shows the Borrow icon and shows no row loader. [REQ-003.6] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-003-N5 | Given the stack, Ada Admin picked and an Available item, when Ada chooses Mia Member in the borrower modal and the outgoing request is rewritten so that it is made as Sam, and again so that it is made as Sam and names Ada as the borrower, then each time the Access denied modal appears reading "You do not have permission", and a fresh look as Ada shows the item still Available with no borrower. [REQ-003.6] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |

### REQ-004: Admin borrows on behalf of a member

| ID | Given / When / Then | Kind | Owner story | State before the build |
|---|---|---|---|---|
| T-004-P1 | Given Ada Admin picked, an Available row and the fake server set to hold every answer it is given, when she activates the Borrow icon, then the borrower modal opens and the row shows no row loader and still reads "Available", and once everything held is released the fake server's item is still Available with no borrower. [REQ-004.1] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-004-P2 | Given Ada Admin picked, no member holding an item and the borrower modal open, when its buttons are read, then it has exactly two member buttons, for Mia Member (id 2) and Sam Member (id 3), and a Close icon, and no member button for any other user. [REQ-004.2] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-004-P3 | Given the borrower modal open on an Available row and the fake server holding its answer, when Ada chooses Mia Member and does nothing more, then that row shows its row loader at once and still reads "Available", and once the answer is released as confirmed the fake server's data holds the item on loan to Mia Member, so the choice was the whole of the request. [REQ-004.5] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-004-P4 | Given that held borrow, when the answer is released as confirmed with the item on loan to Mia, then the row reads "On loan – Mia Member", and choosing Sam Member the same way gives "On loan – Sam Member". [REQ-004.6] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-004-P5 | Given a fresh database with one Available item, when Ada's identity sends a Borrow naming Mia (borrower id 2), then the Borrow is confirmed and the item is on loan to Mia Member (borrower id 2, name Mia Member). [REQ-004.6] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-004-P6 | Given an admin as the acting user and a member named as borrower, when the application decides who the borrower is, then the borrower is that member. [no labelled criterion; the positive counterpart of T-005-N4 and T-004-N6. A decision-level check cannot see the modal or a row] | unit | S1 | fails: no case in `unit.xml`; module collection error (`ModuleNotFoundError: app`) |
| T-004-P7 | Given the stack and an Available item created by Ada, when Ada Admin picks herself, activates Borrow and chooses Mia Member in the borrower modal, then the row reads "On loan – Mia Member" and, in the same page, no text, `title` or `aria-label` outside the top bar contains "Ada" or "Admin". [REQ-004.6, REQ-004.9] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |
| T-004-P8 | Given Ada Admin picked, Mia Member holding one item and an Available row, when she activates the Borrow icon, then the borrower modal lists member buttons for Mia Member and Sam Member alike, each with the tooltip and label "Borrow for <name>", exactly as when no member holds an item. [REQ-004.7] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-004-P9 | Given the same page, when Ada chooses Mia Member, who holds one item, and the answer is held, then the row shows its row loader, and once the answer is released as confirmed the row reads "On loan – Mia Member" and Mia's earlier loan row still does too. [REQ-004.8] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-004-P10 | Given a fresh database in which Mia holds one item and a second item is Available, when Ada's identity lends the second item to Mia, then the Borrow is confirmed and both items are on loan to Mia. [REQ-004.8] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-004-N1 | Given Ada Admin picked and several Available rows found, when the borrower modal is opened on each in turn, then each time the member buttons for Mia and Sam are first found, and no member button for Ada (id 1) exists, no text "Ada Admin" appears in the modal, and no row reads "On loan – Ada Admin" afterwards. [REQ-004.3] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-004-N2 | Given the borrower modal open on an Available row, the list rows found and the fake server set to hold every answer it is given, when Ada activates its Close icon, then the modal is gone, no row shows a row loader, and once everything held is released the fake server's data is unchanged: every row's name, status and borrower are as before. [REQ-004.4] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-004-N3 | Given Ada Admin picked and an Available row, when she lends it to Mia Member and the fake server confirms, then the row first reads "On loan – Mia Member", no modal is open, and outside the top bar no text, `title` attribute or `aria-label` anywhere on the page contains "Ada" or "Admin" in any letter case. [REQ-004.9] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-004-N5 | Given a fresh database and two items of the same name, P and Q, when Mia borrows P for herself and Ada lends Q to Mia, then both items are first found on loan to Mia Member, in a dump of every value in every table the application's database holds the rows of P and Q are equal except for the item id and nothing else differs between the two, in the answers the application gives to Ada, to Mia and to Sam the entries for P and Q are equal except for the item id, and the name "Ada Admin" occurs in the dump and in the answers only as the name of the user Ada Admin; so no stored value the application keeps or can show names the admin as the person who set the loan. [REQ-004.10] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-004-N6 | Given an admin as the acting user, when the application decides who the borrower is with nobody named and with an id that names no seeded member (`4`, `999999999`), then each is rejected (not refused) and no borrower is chosen, and first a named member is accepted and returned. [REQ-004.11, REQ-004.12] | unit | S1 | fails: no case in `unit.xml`; module collection error (`ModuleNotFoundError: app`) |
| T-004-N7 | Given a fresh database with two Available items, when Ada's identity sends a Borrow for the first that names nobody (with no body, with an empty object and with a null borrower) and then ones that name `4` and `999999999`, then none is confirmed and the first item is still Available with no borrower after each, and, as the anchor, Ada's Borrow of the second item naming Mia is confirmed and that item reads On loan to Mia Member. [REQ-004.11, REQ-004.12] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-004-N8 | Given Ada Admin picked, an Available row and the borrower modal open on it, when she chooses Mia Member and the fake server rejects the Borrow (in turn because the item is no longer in the right state, because the item is no longer there, as a server error, and because the request never reaches the server), then each time the row loader is gone, the API failure modal appears with a Close icon and a Retry icon, the Access denied modal does not, and the row still reads "Available". [REQ-004.11, REQ-004.12] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-004-N9 | Given the stack, Ada Admin picked and an Available item, when Ada chooses Mia Member in the borrower modal and the body of the outgoing request is rewritten to name nobody, and again to name `4`, then each time the API failure modal appears (not the Access denied modal), and a fresh look as Ada shows the item still Available with no borrower. [REQ-004.11, REQ-004.12] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |

### REQ-005: Admins cannot borrow for themselves

| ID | Given / When / Then | Kind | Owner story | State before the build |
|---|---|---|---|---|
| T-005-P1 | Given a fresh database with one Available item, when Ada's identity sends a Borrow naming Sam (borrower id 3), then the Borrow is confirmed, the item is on loan to Sam Member, and no item in the list is on loan to Ada Admin. [REQ-005.2] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-005-N1 | Given Ada Admin picked and several Available rows, when the borrower modal is opened on each of them, and again after switching to Mia and back to Ada, then each time the member buttons for Mia and Sam are first found and no member button for Ada exists. [REQ-005.1] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-005-N2 | Given the fake server and Ada Admin picked, when she lends one item to Mia Member, returns it, lends another to Sam Member, marks a third out of service, restores it, adds an item, cancels one delete and confirms another, then after each step the rows are first found, the lends read "On loan – Mia Member" and "On loan – Sam Member", and at no step does any row read "On loan – Ada Admin" or does the fake server's data hold an item on loan to Ada. [REQ-005.2] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-005-N3 | Given a fresh database with two Available items, when Ada's identity sends a Borrow naming Ada (borrower id 1) for the first, then it is not confirmed and that item is still Available with no borrower, and, as the anchor, a Borrow naming Mia for the second is confirmed and that item reads On loan to Mia Member. [REQ-005.3, REQ-005.4] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-005-N4 | Given an admin as the acting user, when the application decides who the borrower is with the admin named, then the Borrow is rejected (not refused) and an admin is not accepted as a borrower, and first a named member is accepted and returned. [REQ-005.3, REQ-005.4] | unit | S1 | fails: no case in `unit.xml`; module collection error (`ModuleNotFoundError: app`) |
| T-005-N5 | Given the stack with two Available items, when Ada Admin lends one to Mia Member, returns it, lends it to Sam Member and returns it, then the borrower modal first listed the member buttons for Mia and Sam each time, and at every step of the journey no row read "On loan – Ada Admin". [REQ-005.2] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |
| T-005-N6 | Given a fresh database with one item On loan to Mia and one Available item, when Ada's identity sends a Borrow naming Ada for the loaned item and another naming Ada for item id 999999 (no such item), then neither is confirmed, the loaned item is still on loan to Mia and no item was created or changed, and, as the anchor, Ada's Borrow of the Available item naming Sam is confirmed and that item reads On loan to Sam Member. [REQ-005.4] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-005-N7 | Given the stack, Ada Admin picked and an Available item, when Ada chooses Mia Member in the borrower modal and the body of the outgoing request is rewritten to name Ada, then the API failure modal appears (not the Access denied modal), and a fresh look as Ada shows the item still Available with no borrower. [REQ-005.4] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |

### REQ-006: Return a loaned item

| ID | Given / When / Then | Kind | Owner story | State before the build |
|---|---|---|---|---|
| T-006-P1 | Given Mia Member picked and rows On loan to Mia Member and to Sam Member, when the list is shown, then both rows are found and Mia sees the Return icon on the row On loan to her. [REQ-006.1] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-006-P2 | Given Ada Admin picked and rows On loan to Mia Member and to Sam Member, both set by an admin, when the list is shown, then both rows are found and Ada sees the Return icon on both. [REQ-006.2] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-006-P3 | Given a Return activated on a loaned row and the answer held, when the answer is released as confirmed, then the row showed its row loader until then, and afterwards its status reads "Available". [REQ-006.4, REQ-006.5] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-006-P4 | Given an item On loan to Mia Member, when Mia returns it (her identity), then the Return is confirmed and the returned item is Available with no borrower. [REQ-006.5] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-006-P5 | Given an item On loan to Mia Member that Ada set, when Ada's identity returns it, then the Return is confirmed and the returned item is Available with no borrower. The Return icon of REQ-006.2 is checked by T-006-P2. [REQ-006.5] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-006-P6 | Given an On loan item, when the application decides on a return by its borrower and then by an admin, then both are allowed. [no labelled criterion; the positive counterpart of T-006-N2. A decision-level check cannot see a Return icon] | unit | S1 | fails: no case in `unit.xml`; module collection error (`ModuleNotFoundError: app`) |
| T-006-P7 | Given the stack and an item lent to Mia Member, when Ada Admin activates Return on it, then the row reads "Available" and, in the same page, no text, `title` or `aria-label` outside the top bar contains "Ada" or "Admin". [REQ-006.5, REQ-006.6] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |
| T-006-N1 | Given Mia Member picked and a row On loan to Sam Member found first with its status text, beside Mia's own loan row, when the list is shown, then Sam's row has no button of any kind while Mia's row has the Return icon. [REQ-006.3] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-006-N2 | Given an On loan item and a member who is not its borrower, when the application decides on the return, then it is refused, and first its borrower and an admin are allowed. [no labelled criterion; the decision behind REQ-006.3, which a decision-level check cannot see as a row. REQ-007.1 is covered by T-007-N1 and T-007-N6] | unit | S1 | fails: no case in `unit.xml`; module collection error (`ModuleNotFoundError: app`) |
| T-006-N4 | Given a fresh database and two items of the same name, R and T, each on loan to Mia and both set by the same route, when Mia returns R herself and Ada returns T, then both items are first found Available with no borrower, in a dump of every value in every table the application's database holds the rows of R and T are equal except for the item id, in the answers the application gives to Ada, to Mia and to Sam the entries for R and T are equal except for the item id, and the name "Ada Admin" occurs in the dump and in the answers only as the name of the user Ada Admin; so no stored value the application keeps or can show names the person who performed the return. [REQ-006.7] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-006-N6 | Given Ada Admin picked and a row On loan to Mia Member, when she activates Return and the fake server confirms, then the row first reads "Available", no modal is open, and outside the top bar no text, `title` attribute or `aria-label` on the page contains "Ada" or "Admin" in any letter case. [REQ-006.6] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-006-N7 | Given an item On loan to Mia, when Ada's and Mia's returns arrive in each serial order and, 20 times with a fresh loan each time, released together, then each time exactly one of the two is confirmed and the other is not, and the item ends Available with no borrower; and given a loan to Mia that Ada returned and Sam then borrowed, Mia's late return is not confirmed and the item is still on loan to Sam, while Ada's late return is confirmed and the item ends Available. [no labelled criterion; blueprint section 8, return / return, where no label is created] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |

### REQ-007: Refuse unauthorized actions with the Access denied modal

| ID | Given / When / Then | Kind | Owner story | State before the build |
|---|---|---|---|---|
| T-007-P1 | Given Ada Admin picked and rows Available, Out of service and On loan found, when for each of the five actions (Return on the loaned row, Delete x then Confirm, Add with a typed name, Mark out of service, Restore) the fake server refuses the request, then each time the Access denied modal appears with the title "Access denied" and the body "You do not have permission", and the list, each status and each borrower are as before. [REQ-007.6] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-007-P2 | Given the Access denied modal open, when its buttons are read, then it first has its OK icon, exactly one button in all, and no Close icon and no Retry icon. [REQ-007.7] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-007-P3 | Given the Access denied modal open over rows found first with their statuses and the fake server set to hold every answer it is given, when the person activates OK, then the modal closes, every row is as before, no row shows a loader, and once everything held is released the fake server's data is unchanged. [REQ-007.8] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-007-P4 | Given the stack with an item lent to Sam Member, an Available item and an Out of service item, when Ada Admin performs each of five actions (Return on the loan, Delete x then Confirm on the Available item, Add, Mark out of service on the Available item, Restore on the Out of service item) and each request leaves the browser with its identity rewritten to Mia's id, then the Access denied modal appears each time reading "You do not have permission", and a fresh look as Ada shows the loan, the items and their statuses unchanged and no item created. [REQ-007.1, REQ-007.2, REQ-007.3, REQ-007.4, REQ-007.5, REQ-007.6] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |
| T-007-N1 | Given two items On loan to Mia Member, when Sam's identity requests the return of the first, then it is not confirmed and the first is still On loan to Mia Member, and, as the anchor, Mia's own return of the second is confirmed and the second reads Available. [REQ-007.1] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-007-N2 | Given two Available items, when Mia's identity requests the delete of the first, then it is not confirmed and the first is still in the list, and, as the anchor, Ada's delete of the second is confirmed and the second is gone. [REQ-007.2] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-007-N3 | Given a list of known size, when Mia's identity requests an add with a valid name, then it is not confirmed, no item with that name exists and the list has the same size, and, as the anchor, Ada's add of that name is confirmed and the item appears Available. [REQ-007.3] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-007-N4 | Given two Available items, when Mia's identity requests the mark out of service of the first, then it is not confirmed and the first is still Available, and, as the anchor, Ada's request for the second is confirmed and the second reads Out of service. [REQ-007.4] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-007-N5 | Given two Out of service items, when Mia's identity requests the restore of the first, then it is not confirmed and the first is still Out of service, and, as the anchor, Ada's request for the second is confirmed and the second reads Available. [REQ-007.5] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-007-N6 | Given a member as the acting user, when the application decides on returning another member's loan, deleting, adding, marking out of service and restoring, then each is refused, and first an admin is allowed each of the five and a borrower is allowed to return their own loan. [REQ-007.1, REQ-007.2, REQ-007.3, REQ-007.4, REQ-007.5] | unit | S1 | fails: no case in `unit.xml`; module collection error (`ModuleNotFoundError: app`) |
| T-007-N8 | Given Mia Member picked with an Available row and a row On loan to her found first, when her Borrow and then her Return are each confirmed by the fake server, then the rows read "On loan – Mia Member" and "Available" and no Access denied modal appeared at any point. [REQ-007.6] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-007-N9 | Given a fresh database with one item On loan to Mia, one Available item and one Out of service item, when Mia's identity requests an add with an empty name, a delete of the On loan item, a mark out of service of item id 999999 (no such item) and a restore of the Available item, then none is confirmed and nothing has changed (no item created, the three items as before), and, as the anchor, Ada's add of a valid name is confirmed and the item appears Available. [REQ-007.2, REQ-007.3, REQ-007.4, REQ-007.5] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |

### REQ-008: One active loan per item

| ID | Given / When / Then | Kind | Owner story | State before the build |
|---|---|---|---|---|
| T-008-P1 | Given an Available item, when Mia borrows it, then the Borrow is confirmed and every later listing shows exactly one borrower for it, Mia Member. [REQ-008.1] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-008-P2 | Given Mia Member picked and an Available row found, when she activates Borrow and the fake server rejects it because the item is no longer Available, then the API failure modal appears with a Close icon and a Retry icon, and the row, the list and the borrower are unchanged. [REQ-008.5] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-008-N1 | Given an item On loan to Mia Member and an Available item, when Sam requests a Borrow of the loaned item, then it is not confirmed and the item is still on loan to Mia with no other borrower, and, as the anchor, the same request for the Available item is confirmed and that item reads On loan to Sam Member. [REQ-008.2, REQ-008.6] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-008-N2 | Given an Out of service item and an Available item, when Mia requests a Borrow of the Out of service item, then it is not confirmed and the item is still Out of service with no borrower, and, as the anchor, the same request for the Available item is confirmed and that item reads On loan to Mia Member. [REQ-008.3, REQ-008.7] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-008-N3 | Given a fresh Available item for each of 20 rounds and each serial order once, when two Borrows for it are released at the same moment by a barrier (Mia against Sam, Ada for Mia against Sam, Ada for Sam against Mia), then in every round exactly one is confirmed and the other is not, the item has exactly one borrower afterwards, that borrower is the one named in the confirmed request, and after every round each item has at most one borrower. [REQ-008.1, REQ-008.4, REQ-008.8] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-008-N4 | Given an On loan item and an Out of service item, when the application decides whether each can be borrowed, then neither can: both are rejected (not refused), and first an Available item can be borrowed. [REQ-008.2, REQ-008.3, REQ-008.6, REQ-008.7] | unit | S1 | fails: no case in `unit.xml`; module collection error (`ModuleNotFoundError: app`) |
| T-008-N6 | Given an item On loan to Mia, an Out of service item and an Available item, when Ada's identity requests a Borrow naming Sam for each, then the first two are not confirmed and their items are unchanged, and, as the anchor, the third is confirmed and reads On loan to Sam Member. [REQ-008.6, REQ-008.7] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-008-N7 | Given a data store holding the three users and no items, when an item recorded as On loan with no borrower, and an item recorded with a borrower but not On loan, are each written directly, then the store refuses to hold each, and first an item recorded as On loan with a borrower and an item recorded as Available with none are accepted. [REQ-008.1] | integration | S1 | fails: its case in `db.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-008-N8 | Given an item On loan to X and, separately, an Available item, when a borrow and a return for the same item arrive in each serial order and, 20 times for each starting state, released together, then every pair of outcomes is one the blueprint's table allows (On loan: return confirmed then borrow confirmed, or borrow not confirmed then return confirmed; Available: return not confirmed then borrow confirmed, or borrow confirmed then return confirmed), the final state is the one the table gives, and at no point does an item have two borrowers. [no labelled criterion; blueprint section 8, borrow / return, which ties no label and whose title carries `CONC` and the pair. REQ-008.1 is evidenced by T-008-P1, T-008-N3 and, in the data store, T-008-N7] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-008-N9 | Given an Available item, when a borrow and a mark out of service for it arrive in each serial order and, 20 times, released together, then exactly one of the two is confirmed and the other is not, the item ends On loan or Out of service and never both, and a borrow of the marked item is not confirmed. [REQ-008.7] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-008-N10 | Given an Out of service item, when a borrow and a restore for it arrive in each serial order and, 20 times, released together, then the outcomes are restore confirmed then borrow confirmed (the item ends On loan to the borrower), or borrow not confirmed (the item is Out of service) then restore confirmed (the item ends Available), the final state equals one of the two serial orders, and a loan is never written to an Out of service item. [no labelled criterion; blueprint section 8, borrow / restore, which ties no label and whose title carries `CONC` and the pair. REQ-008.3 is evidenced by T-008-N4 and T-008-N2] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-008-N11 | Given the stack and an Available item that two browser contexts (Ada's and Sam's) both list as Available, when Ada's Borrow for Mia is confirmed in the first context and then Sam activates Borrow in the second, then the second shows the API failure modal (not the Access denied modal), and a fresh look shows the item still on loan to Mia Member and to no other borrower. [REQ-008.6, REQ-008.8] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |
| T-008-N12 | Given the stack and an Available item that two browser contexts both list as Available, when Ada marks it out of service in the first context and then Sam activates Borrow in the second, which still lists it Available, then the second shows the API failure modal and a fresh look shows the item still Out of service. [REQ-008.7] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |

### REQ-009: Add equipment

| ID | Given / When / Then | Kind | Owner story | State before the build |
|---|---|---|---|---|
| T-009-P1 | Given Ada Admin picked and a list with items, when the page is shown, then the rows are first found and the Add field comes before the equipment list in the document. [REQ-009.1] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-009-P2 | Given Ada Admin picked and a name typed in the Add field, when she presses Enter and the fake server confirms with the new item, then an item with that name appears in the list as "Available". [REQ-009.2] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-009-P3 | Given Ada Admin picked and a name typed in the Add field, when she activates the Add icon and the fake server confirms, then the result is the same as pressing Enter: the item appears in the list as "Available". [REQ-009.3] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-009-P4 | Given a fresh database, when Ada's identity adds the name "Projector", then the Add is confirmed with an item named "Projector", Available and with no borrower, and the equipment list contains one such item. [REQ-009.2] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-009-P5 | Given the stack and Ada Admin picked, when she types a unique name in the Add field and presses Enter, then an item of that name appears in the list with the status "Available". [REQ-009.2] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |
| T-009-P6 | Given Ada Admin picked and a name typed, when she presses Enter and the answer is held, then the Add loader is shown and the new item is not yet in the list, and once the answer is released as confirmed the Add loader is gone and the item appears as "Available". [REQ-009.2] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-009-P7 | Given the check applied to an equipment name, when it is given a name of exactly 100 characters, the same name with spaces and tabs around it, and a name of 100 code points that includes characters outside the Basic Multilingual Plane, then each is accepted and returned trimmed, and first a short name is accepted. [REQ-009.12] | unit | S1 | fails: no case in `unit.xml`; module collection error (`ModuleNotFoundError: app`) |
| T-009-P8 | Given a fresh database, when Ada's identity adds a name of exactly 100 characters, then the Add is confirmed and the item is listed with that name, Available. [REQ-009.12] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-009-P9 | Given Ada Admin picked, when she types a name of exactly 100 characters with spaces around it and presses Enter and the fake server confirms, then the item appears as "Available" with the trimmed 100-character name and no inline validation message. [REQ-009.12] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-009-P10 | Given Ada Admin picked and a list holding an item named "Projector", when she adds another named "Projector" and the fake server confirms, then the list shows two rows named "Projector", the new one reading "Available". [REQ-009.9] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-009-P11 | Given Ada Admin picked and a name of 101 characters after trimming typed in the Add field, when she presses Enter and, separately, activates the Add icon, then the inline validation message reads exactly "Name must be 100 characters or fewer." each time. [REQ-009.15] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-009-P12 | Given Ada Admin picked, a name typed and the fake server holding its answer, when she presses Enter, then in the Add panel the Add loader is shown and the Add icon is not shown, and once the answer is released as confirmed the Add loader is gone. [REQ-009.13] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-009-N1 | Given Ada Admin picked with the Add card and the Add field found first and a fake server that would accept any Add, when she presses Enter with the field empty, then an inline validation message reading "Name is required." appears inside the Add card and after the Add field in document order (checks 1 and 2 of the placement, 1.1; the layout checks are T-009-N14 and T-009-N15), no element with the alertdialog role exists, and once everything held is released no item was created: no row was added and the fake server's data is unchanged. [REQ-009.4, REQ-009.8] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-009-N2 | Given Ada Admin picked with the Add card and the Add field found first and a fake server that would accept any Add, when she activates the Add icon with the field empty, then an inline validation message reading "Name is required." appears inside the Add card and after the Add field in document order (checks 1 and 2 of the placement, 1.1; the layout checks are T-009-N14 and T-009-N15), no element with the alertdialog role exists, and no item was created: no row was added and the fake server's data is unchanged. [REQ-009.5, REQ-009.8] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-009-N3 | Given Ada Admin picked, the Add field found and a fake server that would accept any Add, when she types only spaces and presses Enter, and then types only a tab and activates the Add icon, then each time "Name is required." appears and no item was created: no row was added and the fake server's data is unchanged. [REQ-009.6] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-009-N4 | Given the list rendered first with items and then with none, and Ada Admin picked first with the Add card and Add field found (so the feature exists), when Mia Member and then Sam Member are picked, then each time the rows or the empty text are first found, and no Add field, no Add icon and no Add card exists. [REQ-009.7] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-009-N5 | Given a fresh database, when Ada's identity adds an empty name and then a name of only whitespace, then neither is confirmed and the list has gained no item, and, as the anchor, a valid name is confirmed and the item appears. [REQ-009.6] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-009-N7 | Given a fresh database, when Ada's identity adds a name of 101 characters after trimming, and another of 101 characters surrounded by spaces, then neither is confirmed and no item is created, and, as the anchor, a name of 100 characters is confirmed and the item appears. [REQ-009.10] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-009-N8 | Given Ada Admin picked and a name typed, when the fake server rejects the Add because of its name, then a non-empty inline validation message appears inside the Add card and after the Add field in document order (checks 1 and 2 of the placement, 1.1), no API failure modal and no Add loader appear and the list is unchanged; and, as the anchor, the same Add rejected as a server error opens the API failure modal instead. [REQ-009.11] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-009-N9 | Given an item already named "Projector", when Ada's identity adds another named "Projector", then the Add is confirmed, the list holds two items with that name and different ids, and the new one is Available. [REQ-009.9] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-009-N10 | Given the check applied to an equipment name, when it is given an empty name, only spaces, only a tab, a value that is not text (nothing, a number), a name of 101 characters after trimming and a name of 101 code points outside the Basic Multilingual Plane, then each is rejected (not refused) as an equipment name, and first a name of 100 characters is accepted. [REQ-009.6, REQ-009.10] | unit | S1 | fails: no case in `unit.xml`; module collection error (`ModuleNotFoundError: app`) |
| T-009-N11 | Given Ada Admin picked, a name of 101 characters after trimming typed and a fake server that would accept any Add, when she presses Enter and then activates the Add icon, then each time an inline validation message appears inside the Add card and after the Add field in document order (checks 1 and 2 of the placement, 1.1; the layout checks are T-009-N15), no API failure modal appears and no item was created: no row was added and the fake server's data is unchanged; and, as the anchor, the same field holding 100 characters is added and the item appears as "Available". [REQ-009.11] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-009-N12 | Given a fresh database, when two adds of the same name arrive in each serial order and, 20 times, released together, then both are confirmed each time and two items with that name exist afterwards. [no labelled criterion; blueprint section 8, add / add, where no label is created] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-009-N13 | Given Ada Admin picked, a name typed and the fake server holding its answer to the Add, when she presses Enter, finds the Add loader shown, and then presses Enter again with the name still typed and again with the field cleared (the Add icon is replaced by the loader, so Enter is the only activation left), then no inline validation message and no modal appears, and once the answer is released as confirmed exactly one new row is in the list. [REQ-009.14] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-009-N14 | Given the production build in Chromium, Ada Admin picked, rows found and the Add card and the Add field found first, when she presses Enter with the field empty and, on a freshly loaded page, activates the Add icon with the field empty, then each time an inline validation message reading "Name is required." appears and passes all four checks of the placement (1.1): it is inside the Add card, after the Add field in document order, its top edge is not above the lower edge of the Add field and the two boxes do not overlap, and its whole box lies within the Add card's box; and no element with the alertdialog role exists. [REQ-009.4, REQ-009.5] | e2e | S3 | fails: no case in `browser.xml`; Playwright's web server cannot start (no `web/package.json`) |
| T-009-N15 | Given the same page as T-009-N14, when she presses Enter on a freshly loaded page with the field empty, again with only spaces typed, and again with a name of 101 characters after trimming typed, then each time the inline validation message appears (reading "Name is required." for the first two and "Name must be 100 characters or fewer." for the third), it passes all four checks of the placement (1.1), no element with the alertdialog role exists and the API failure modal does not appear. [REQ-009.8, REQ-009.11] | e2e | S3 | fails: no case in `browser.xml`; Playwright's web server cannot start (no `web/package.json`) |

### REQ-010: Out-of-service status of equipment

| ID | Given / When / Then | Kind | Owner story | State before the build |
|---|---|---|---|---|
| T-010-P1 | Given Ada Admin picked and rows in all three statuses, when the list is shown, then every Available row shows the Mark out of service icon. [REQ-010.1] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-010-P2 | Given Ada Admin picked and rows in all three statuses, when the list is shown, then every Out of service row shows the Restore icon. [REQ-010.4] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-010-P3 | Given Ada Admin picked and an Available row, when she activates Mark out of service and the fake server confirms, then the row's status reads "Out of service". [REQ-010.3] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-010-P4 | Given Ada Admin picked and an Out of service row, when she activates Restore and the fake server confirms, then the row's status reads "Available", it shows the Mark out of service icon and it shows no Restore icon. [REQ-010.6] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-010-P5 | Given an Available item, when Ada's identity marks it out of service, then the request is confirmed and the read-back shows the item as Out of service. [REQ-010.3] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-010-P6 | Given an Out of service item, when Ada's identity restores it, then the request is confirmed and the read-back shows the item as Available with no borrower. [REQ-010.6] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-010-P7 | Given the stack and an Available item with a unique name, when Ada Admin marks it out of service and then restores it, then before the first step the row offered the Mark out of service icon, after it the row reads "Out of service" and offers the Restore icon, and after the second step the row reads "Available". [REQ-010.3, REQ-010.6] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |
| T-010-P8 | Given an admin as the acting user, when the application decides on marking an Available item out of service and on restoring an Out of service item, then both are allowed. [no labelled criterion; the positive counterpart of T-010-N4. A decision-level check cannot see a row reading] | unit | S1 | fails: no case in `unit.xml`; module collection error (`ModuleNotFoundError: app`) |
| T-010-P9 | Given Ada Admin picked and an Available row, when she activates Mark out of service and the answer is held, then the row shows its row loader and still reads "Available", and once the answer is released as confirmed the loader is gone and the row reads "Out of service". [REQ-010.3] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-010-P10 | Given Ada Admin picked and an Out of service row, when she activates Restore and the answer is held, then the row shows its row loader and still reads "Out of service", and once the answer is released as confirmed the loader is gone and the row reads "Available". [REQ-010.6] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-010-P11 | Given an Out of service item, when Ada's identity restores it, then the request is confirmed, the list shows it Available, and, as the proof that it is Available, Mia then borrows it and the Borrow is confirmed with the item on loan to Mia Member. [REQ-010.6] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-010-N1 | Given Ada Admin picked and rows in all three statuses, with the Available row found first showing the Mark out of service icon, when the list is shown, then no On loan row and no Out of service row shows a Mark out of service icon. [REQ-010.2] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-010-N2 | Given Ada Admin picked and rows in all three statuses, with the Out of service row found first showing the Restore icon, when the list is shown, then no Available row and no On loan row shows a Restore icon. [REQ-010.5] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-010-N3 | Given rows in all three statuses and Ada Admin picked first, with the Mark out of service icon found on the Available row and the Restore icon found on the Out of service row (so both features exist), when Mia Member and then Sam Member are picked, then each time the Available row is first found showing the Borrow icon and no row shows a Mark out of service icon or a Restore icon. [REQ-010.7] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-010-N4 | Given an admin as the acting user, when the application decides on marking out of service an On loan item and an Out of service item, and on restoring an Available item and an On loan item, then all four are rejected (not refused), and first marking an Available item and restoring an Out of service item are allowed. [no labelled criterion; the decision behind REQ-010.2 and REQ-010.5, which are icon criteria a decision-level check cannot see] | unit | S1 | fails: no case in `unit.xml`; module collection error (`ModuleNotFoundError: app`) |
| T-010-N5 | Given Ada Admin picked with an Available row and an Out of service row found, when Mark out of service is rejected because the item is no longer in the right state and, separately, Restore is rejected as a server error, then the API failure modal appears each time with a Close icon and a Retry icon and both rows keep their statuses. [no labelled criterion; REQ-010 defers failure handling to REQ-012.12 to REQ-012.14, which T-012-P8 and T-012-N6 check] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-010-N6 | Given an Available item and, separately, an Out of service item, when a mark out of service and a restore for the same item arrive in each serial order and, 20 times for each starting state, released together, then every pair of outcomes is one the blueprint's table allows (Available: mark confirmed then restore confirmed, or restore not confirmed then mark confirmed; Out of service: restore confirmed then mark confirmed, or mark not confirmed then restore confirmed), the final status equals one of the two serial orders, and two marks (or two restores) together give exactly one confirmed and one not. [no labelled criterion; blueprint section 8, mark / restore, mark / mark and restore / restore] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-010-N7 | Given an Available item and, separately, an Out of service item, when a delete and a mark (respectively a restore) for the same item arrive in each serial order and, 20 times, released together, then the outcomes are delete confirmed then mark (restore) not confirmed, or mark (restore) confirmed then delete confirmed, and a deleted item never reappears with a status. [no labelled criterion; blueprint section 8, delete / mark and delete / restore] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-010-N8 | Given an item On loan to Mia, when a return and a mark out of service for it arrive in each serial order and, 20 times with a fresh loan each time, released together, then the outcomes are return confirmed then mark confirmed (the item ends Out of service), or mark not confirmed (the item is On loan) then return confirmed (the item ends Available), the final state equals one of the two serial orders, and an On loan item is never marked out of service. [no labelled criterion; blueprint section 8, return / mark, where no label is created] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-010-N9 | Given an item On loan to Mia and, separately, an Out of service item, when a return and a restore for the same item arrive in each serial order and, 20 times for each starting state, released together, then from On loan exactly one of the two is confirmed (return confirmed then restore not confirmed because the item is now Available, or restore not confirmed because the item is On loan then return confirmed) and the item ends Available, and from Out of service the restore is confirmed and the return is not confirmed in both orders and the item ends Available. [no labelled criterion; blueprint section 8, return / restore from both start states] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |

### REQ-011: Delete equipment with confirmation

| ID | Given / When / Then | Kind | Owner story | State before the build |
|---|---|---|---|---|
| T-011-P1 | Given Ada Admin picked and rows in all three statuses, when the list is shown, then every Available row and every Out of service row shows the Delete x icon. [REQ-011.1] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-011-P2 | Given Ada Admin picked, an Available row named "Tripod" and the fake server set to hold every answer it is given, when she activates its Delete x icon, then the confirm-delete modal opens with the title "Delete Tripod?", the row shows no row loader and is still in the list, and once everything held is released the item is still in the fake server's data. [REQ-011.3] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-011-P3 | Given the confirm-delete modal open, when its buttons are read, then it has a Cancel icon and a Confirm icon and no other button. [REQ-011.4] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-011-P4 | Given the confirm-delete modal open on a row, when Ada activates the Confirm icon and the answer is held, then the row shows its row loader and the item is still in the list, and once the answer is released as confirmed the item is no longer in the list. [REQ-011.6, REQ-011.7] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-011-P5 | Given an Available item and an Out of service item, when Ada's identity deletes each, then each delete is confirmed and neither item is in the list afterwards. [REQ-011.7] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-011-P6 | Given an admin as the acting user, when the application decides on deleting an Available item and an Out of service item, then both are allowed. [no labelled criterion; the positive counterpart of T-011-N5. A decision-level check cannot see a Delete x icon] | unit | S1 | fails: no case in `unit.xml`; module collection error (`ModuleNotFoundError: app`) |
| T-011-P7 | Given the stack and an Available item with a unique name, when Ada Admin activates its Delete x icon and then the Confirm icon, then the item is no longer in the list. [REQ-011.7] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |
| T-011-N1 | Given Ada Admin picked and rows in all three statuses, with the Available and Out of service rows found first showing the Delete x icon, when the list is shown, then the On loan row shows no Delete x icon. [REQ-011.2] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-011-N2 | Given rows in all three statuses and Ada Admin picked first, with the Delete x icon found on the Available row and on the Out of service row (so the feature exists), when Mia Member and then Sam Member are picked, then each time the Available row is first found showing the Borrow icon and no row shows a Delete x icon. [REQ-011.9] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-011-N3 | Given the confirm-delete modal open with the rows found and the fake server set to hold every answer it is given, when Ada activates the Cancel icon, then the modal closes, no row shows a row loader, and once everything held is released the item is still in the list and every row's name, status and borrower are as before. [REQ-011.5] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-011-N4 | Given an item On loan to Mia Member and an Available item, when Ada's identity requests the delete of the loaned item, then it is not confirmed and the item is still in the list and still On loan to Mia Member, and, as the anchor, the delete of the Available item is confirmed and that item is gone. [REQ-011.8] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-011-N5 | Given an On loan item, when the application decides on deleting it for an admin, then the delete is rejected (not refused: the admin may delete), and first an Available item is allowed. [REQ-011.8] | unit | S1 | fails: no case in `unit.xml`; module collection error (`ModuleNotFoundError: app`) |
| T-011-N7 | Given an Available item and an item On loan to Mia, when a borrow and a delete of the Available item, and a return and a delete of the loaned item, each arrive in both serial orders and, 20 times each, released together, then the outcomes are borrow confirmed then delete not confirmed, or delete confirmed then borrow not confirmed; and return confirmed then delete confirmed, or delete not confirmed then return confirmed; a loaned item is never deleted. [REQ-011.8] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-011-N8 | Given an Available item, when two deletes of it arrive in each order and, 20 times with a fresh item each time, released together, then exactly one is confirmed and the other is not each time, and the item is gone. [no labelled criterion; blueprint section 8, delete / delete] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-011-N9 | Given the stack and an Available item that Ada's context lists with Delete offered, when Mia borrows it in a second context and then Ada confirms the delete, then Ada's context shows the API failure modal (not the Access denied modal), and a fresh look shows the item still listed and still On loan to Mia Member. [REQ-011.8] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |

### REQ-012: Outcome of a server-call action

| ID | Given / When / Then | Kind | Owner story | State before the build |
|---|---|---|---|---|
| T-012-P1 | Given each of a member's Borrow, an admin's Borrow after choosing Mia Member, a Return, and a Delete after Confirm, when the request is made and its answer is held, then the affected row first shows its row loader and, until the answer is released, the row's status and the list contents are as they were before the request. [REQ-012.1, REQ-012.2] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-012-P2 | Given those four held requests, when each answer is released as confirmed, then the list shows the new state: "On loan – <member name>" after a Borrow, "Available" after a Return, and the item gone after a Delete. [REQ-012.3] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-012-P3 | Given a Borrow, a Return and a Delete each requested, when the fake server rejects it (as a server error, separately because the item is no longer there, and separately because the item is no longer in the right state), then the API failure modal appears with a Close icon and a Retry icon. [REQ-012.6] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-012-P4 | Given an admin's Borrow of an item for Sam Member rejected as a server error and the API failure modal open, when the person activates Retry, then the same request is repeated (same item, same action, same chosen member) and, once the fake server confirms it, the row reads "On loan – Sam Member" and no other item changed; a failed Return and a failed Delete retry the same way and end Available and gone. [REQ-012.8] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-012-P5 | Given the stack and an Available item, when Mia Member activates Borrow and the first request is aborted by route interception, then the API failure modal appears with a Close icon and a Retry icon, and when she activates Retry with interception removed, the same request reaches the real server and the row reads "On loan – Mia Member". [REQ-012.8] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |
| T-012-P6 | Given Ada Admin picked, a name typed, an Available row and an Out of service row, when she adds the name, marks the Available row out of service and restores the Out of service row, each answer held, then the Add loader is shown for the Add and a row loader on the affected row for each of the others, and until the answers arrive the new item is not in the list, the first row still reads "Available" and the second still reads "Out of service"; and once each answer is released as confirmed the added item is listed as "Available", the first row reads "Out of service" and the second reads "Available". [REQ-012.9, REQ-012.10, REQ-012.11] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-012-P7 | Given the stack, when Ada Admin adds a uniquely named item, marks an Available item out of service and restores an Out of service item, then the added item appears as "Available", the marked row reads "Out of service" and the restored row reads "Available". [REQ-012.11] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |
| T-012-P8 | Given Ada Admin picked with an Available row and an Out of service row found, when an Add, a Mark out of service and a Restore are each rejected as a server error, and Mark and Restore also because the item is no longer in the right state, then each time the API failure modal appears with a Close icon and a Retry icon, and the list and every status are as before. [REQ-012.12] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-012-P9 | Given an Add rejected as a server error and the API failure modal open, when Ada activates Retry, then the add is repeated with the same name and, once the fake server confirms it, the item appears as "Available" with that name; a failed Mark out of service and a failed Restore retry the same action on the same item and, once confirmed, show "Out of service" and "Available". [REQ-012.13] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-012-N1 | Given a Borrow, a Return and a Delete each confirmed by the fake server, with the rows and the page's text outside the list and the modals found first, when the answers arrive, then each row has its new state ("On loan – Mia Member", "Available", the item gone), so the actions took effect, and the page's text outside the list and the modals is the same as before the answers: no banner, toast, status message or dialog appeared. [REQ-012.4] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-012-N2 | Given each of the six actions (Borrow, Return, Delete after Confirm, Add, Mark out of service, Restore) requested with its answer held, the row loader (the Add loader for the Add) found first while held, when the answer is released as a rejection of each kind (the item no longer in the right state, the item no longer there, a server error) and, separately, the request never reaches the server (never a refusal), then each time the API failure modal is shown, so the action was attempted and failed, and every row's status and the list contents are as before the request. [REQ-012.5] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-012-N3 | Given the API failure modal open after a failed request, with the rows found first and the fake server set to hold every answer it is given, when the person activates Close, then the modal closes, no loader is shown, and once everything held is released nothing in the list has changed. [REQ-012.7] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-012-N4 | Given a request refused by the fake server, with the rows found first, when the answer arrives, then the Access denied modal appears and the API failure modal does not exist, so no Close icon and no Retry icon is present. [REQ-012.6] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-012-N6 | Given each of the six actions (Borrow, Return, Delete after Confirm, Add, Mark out of service, Restore) held and then rejected as a server error, with the loader found first while held, when the answer arrives, then the first rendered page that contains the API failure modal contains no row loader and no Add loader, and none appears while the modal is shown. [REQ-012.14] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-012-N7 | Given an Add, a Mark out of service and a Restore each confirmed, with the new states found first, when the answers arrive, then the page's text outside the list and the modals is unchanged, and no text "Added <name>", "<name> marked out of service" or "<name> restored" exists anywhere on the page. [REQ-012.15] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-012-N8 | Given a fresh database with one item that Ada has deleted, one Available item, and the id 999999 that never existed, when Mia's identity requests a Borrow, and Ada's identity requests a Return, a Delete, a Mark out of service and a Restore, each for the deleted item and for the id that never existed, then none is confirmed, nothing is created or changed (the read-back is the same and the deleted item has not reappeared), and, as the anchor, Mia's Borrow of the Available item is confirmed and that item reads On loan to Mia Member. [REQ-012.16] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-012-N9 | Given Ada Admin picked with an Available row, an On loan row and an Out of service row found, when she activates Borrow (choosing Mia Member), Return, Delete after Confirm, Mark out of service and Restore on rows of the right status and the fake server rejects each because the item is no longer there, then each time the row loader is gone, the API failure modal appears with a Close icon and a Retry icon (the Access denied modal does not), and the list is as before. [REQ-012.16] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-012-N10 | Given the stack and an item that two browser contexts both list, when the second context deletes it and then the first context activates Mark out of service on it, then the first context shows the API failure modal with a Close icon and a Retry icon and its row is unchanged, and a fresh look shows the item gone. [REQ-012.16] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |

### REQ-013: List page states

| ID | Given / When / Then | Kind | Owner story | State before the build |
|---|---|---|---|---|
| T-013-P1 | Given Ada Admin picked and the equipment request held, when the page is shown, then the list indicator is shown, reading "Loading equipment…". [REQ-013.1] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-P2 | Given the fake server returning no items, when the page is shown, then it shows the text "No equipment yet". [REQ-013.2] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-P3 | Given Ada Admin picked and no items, when the page is shown, then the Add field comes before the text "No equipment yet" in the document. [REQ-013.3] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-P5 | Given Ada Admin picked and rows found, when the page is shown, then the state demos panel is found and is the first element in the document, before the top bar, the Add card and the list. [REQ-013.5] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-P6 | Given the production build in Chromium, Ada Admin picked and rows found, when the page is at scroll position 0, then the state demos panel's top edge is above the top edge of the top bar, the Add card and the list. [REQ-013.5] | e2e | S3 | fails: no case in `browser.xml`; Playwright's web server cannot start (no `web/package.json`) |
| T-013-P7 | Given Ada, Mia and Sam picked in turn, when the state demos panel is read, then it has exactly four buttons, the ones named "Show loading", "Show empty list", "Show API failure" and "Show access denied", and no other control. [REQ-013.6] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-P8 | Given Ada Admin picked with rows found, when she activates Show loading, then the list indicator is shown (read at once, without waiting for any time to pass). [REQ-013.7] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-P9 | Given Ada Admin picked with rows found, when she activates Show empty list, then "No equipment yet" is shown with the Add field above it; and when Mia Member is picked with rows found and activates it, "No equipment yet" is shown and no Add field exists. [REQ-013.8] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-P10 | Given Ada Admin picked with rows found, when she activates Show API failure, then the API failure modal opens with a Close icon and a Retry icon. [REQ-013.9] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-P11 | Given Ada Admin picked with rows found, when she activates Show access denied, then the Access denied modal opens with the body "You do not have permission" and a single OK icon. [REQ-013.10] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-P12 | Given Ada Admin picked with rows found, when she activates Show loading and does nothing more, then the test waits for the list indicator to appear and then for it to disappear, with no fixed pause, and the real list is shown again with the same rows. [REQ-013.13] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-P13 | Given Ada Admin picked with rows found and the page's clock under the test's control, when she activates Show loading, then after 899 ms of that clock the list indicator is still shown and after 900 ms it is gone and the real list is shown. [REQ-013.13] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-P14 | Given the stack and Ada Admin picked with the real list shown, when she activates Show loading and does nothing more, then the list indicator is waited for until it appears and then until it disappears, each wait with a timeout of five seconds (a timeout, not a duration the row asserts), and the real list is shown again with the same rows. [REQ-013.13] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |
| T-013-P15 | Given Ada Admin picked, rows found and the Show empty list view showing ("No equipment yet" first found), when the person picks Mia Member and the fake server returns Mia's list, then the page shows the real list for Mia, her rows, and no longer shows "No equipment yet". [REQ-013.15] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-P16 | Given Ada Admin picked with rows found, the Show empty list view showing ("No equipment yet" first found) and a fake server that confirms an Add, when she types a name of 100 characters or fewer and presses Enter and, in a second case, types a name and activates the Add icon, then each time the fake server's data holds one new item with that name, Available and with no borrower, and a fresh render with Ada picked shows that item in the real list as "Available", so the Add was carried out and kept. [REQ-013.18] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-P17 | Given the stack, Ada Admin picked and two items created by Ada with unique names, when Ada activates Show empty list ("No equipment yet" first found), types a unique name of 100 characters or fewer, presses Enter, and the page is then reloaded and Ada is picked again, then the real list holds the new item as "Available". [REQ-013.18] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |
| T-013-P18 | Given the fake server holding two items, Ada Admin picked with the Show empty list view showing ("No equipment yet" first found) and a name typed, when she presses Enter and the Add's answer is held, then the Add loader is shown while "No equipment yet" is still shown and no list of rows is, and once the answer is released as confirmed the list shows the two items and the new one as "Available" and "No equipment yet" is no longer shown; and with the fake server holding no item at all, the same Add ends with the list showing the new item alone. [REQ-013.19] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-P19 | Given the stack, Ada Admin picked and two items created by Ada with unique names, when Ada activates Show empty list ("No equipment yet" first found), types a unique name and presses Enter, then the list shows the two items and the new one as "Available" and "No equipment yet" is not shown. [REQ-013.19] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |
| T-013-P20 | Given Ada Admin picked in the Show empty list view with a name typed and the Add failed by the fake server as a server error, so that the API failure modal is found open with its Retry icon, when she activates Retry and the fake server now confirms the repeated Add, then the list shows an item with that same name as "Available" together with every item the fake server held before, and "No equipment yet" is no longer shown. [REQ-013.22] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-P21 | Given Ada Admin picked and the fake server answering the list request with a failure (in turn a server error, a missing resource, and a request that never reaches the server), when the page is shown, then each time the API failure modal appears with a Close icon and a Retry icon. [REQ-013.23] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-P22 | Given the stack, when Ada Admin is picked and the list request the page makes after the pick is aborted by route interception, then the API failure modal appears with a Close icon and a Retry icon. [REQ-013.23] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |
| T-013-P23 | Given Ada Admin picked, the first list request failed so that the API failure modal is found with its Close and Retry icons, and a fake server that confirms a list request only when it carries Ada's identity and refuses any other, when she activates Retry and the repeated request is held, then the list indicator is shown while it is held, and once the answer is released as confirmed the list shows the fake server's items; and with the fake server holding no item, the same Retry ends with "No equipment yet" shown. [REQ-013.25] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-P24 | Given the stack and an item created by Ada, when Ada Admin is picked, the list request the page makes after the pick is aborted by route interception so that the API failure modal appears, and she activates Retry with the interception removed, then the real list shows, holding the item. [REQ-013.25] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |
| T-013-P25 | Given Ada Admin picked and a fake server that fails the first list request and also the repeat, with the API failure modal found after the first failure, when she activates Retry, then the list indicator is shown while the repeated request is held, and once the held answer is released as a failure the API failure modal appears, with a Close icon and a Retry icon. [REQ-013.26] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-N1 | Given the equipment request held, first with the list indicator found, and then answered with items, when the page is shown in each case, then "No equipment yet" is shown in neither, and once the rows have arrived the list indicator is gone. [REQ-013.1, REQ-013.2] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-N2 | Given Ada Admin picked first and the fake server holding no items, with "No equipment yet" found and the Add card and Add field found above it (so the Add exists), when Mia Member and then Sam Member are picked and the fake server answers each new list request with no items, then each time "No equipment yet" is first found and no Add field and no Add card exists. [REQ-013.4] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-N3 | Given the app opened with no user picked and the switcher found first, when the page is shown, then no state demos and no equipment list exist; and once Ada, then Mia, then Sam is picked, the state demos are found with their four controls each time. [REQ-013.11] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-N4 | Given Ada Admin picked with rows found, when each of the four state demos is activated in turn (the two modals closed after opening, and Show empty list left by activating Show loading; no Add and no other action is made in the row, because an Add made after a demo changes the list and is REQ-013.18, not this criterion), then the fake server's data is identical after each demo, and a fresh render with the same user picked shows the same items with the same names, statuses and borrowers. [REQ-013.12] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-N5 | Given the stack and Ada Admin picked with the real list shown and noted, when each of the four state demos is activated in turn (the two modals closed, Show empty list left by Show loading; no Add and no other action is made), the page is reloaded and Ada is picked again, then the list equals the list noted before: the same items with the same names, statuses and borrowers. [REQ-013.12] | e2e | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |
| T-013-N6 | Given Ada Admin picked with rows found and the page's clock under the test's control, when she activates Show empty list ("No equipment yet" first found) and ten minutes pass on that clock with no action, then the page is still showing "No equipment yet" and no list of rows is shown. [REQ-013.14] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-N7 | Given the Show empty list view showing for Ada Admin ("No equipment yet" first found) and the page's clock under the test's control, when she activates Show loading, then the list indicator is shown and, once 900 ms have passed on that clock, the real list is shown, and ten minutes later the Show empty list view has not returned. [REQ-013.16] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-N8 | Given Ada Admin picked with rows found and the API failure modal opened by Show API failure (found first), when she activates Retry in it, then the modal closes, no row loader, no Add loader and no list indicator is shown, and the fake server's data and the rows are as before. [REQ-013.17] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-N9 | Given Ada Admin picked in the Show empty list view ("No equipment yet", the Add card and the Add field first found) and a fake server that would accept any Add, when she presses Enter with the field empty, then activates the Add icon with the field empty, then types only spaces and a tab and presses Enter, then each time an inline validation message reading "Name is required." appears inside the Add card and after the Add field in document order (checks 1 and 2 of the placement, 1.1), no modal appears, "No equipment yet" is still shown and no list of rows is, and once everything held is released no item was created: the fake server's data is unchanged; and, as the anchor, a valid name then typed in the same view and added is carried out and the list shows it as "Available". [REQ-013.20] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-N10 | Given the production build in Chromium, Ada Admin picked, the Show empty list view showing and the Add card and the Add field found first, when she presses Enter with the field empty, on a freshly loaded page activates the Add icon with the field empty, and on a third freshly loaded page types only spaces and presses Enter (each time in the Show empty list view), then each time an inline validation message reading "Name is required." appears and passes all four checks of the placement (1.1), and "No equipment yet" is still shown. [REQ-013.20] | e2e | S3 | fails: no case in `browser.xml`; Playwright's web server cannot start (no `web/package.json`) |
| T-013-N11 | Given Ada Admin picked in the Show empty list view ("No equipment yet" first found) and a fake server that would accept any Add, when she types a name of 101 characters after trimming and presses Enter, and then activates the Add icon, then each time the inline validation message reads exactly "Name must be 100 characters or fewer." inside the Add card and after the Add field in document order (checks 1 and 2 of the placement, 1.1; the layout checks are T-013-N12), no modal opens, "No equipment yet" is still shown, and once everything held is released no item was created: the fake server's data is unchanged; and when the fake server rejects the Add of a name of 100 characters because of its name, a non-empty inline validation message appears in the same place and the API failure modal does not; and, as the anchor, the field then holding 100 characters is added and the list shows the new item as "Available". [REQ-013.21] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-N12 | Given the production build in Chromium, Ada Admin picked, the Show empty list view showing and the Add card and the Add field found first, when she types a name of 101 characters after trimming and presses Enter, then the inline validation message reading "Name must be 100 characters or fewer." appears and passes all four checks of the placement (1.1), "No equipment yet" is still shown and the API failure modal does not appear. [REQ-013.21] | e2e | S3 | fails: no case in `browser.xml`; Playwright's web server cannot start (no `web/package.json`) |
| T-013-N13 | Given Ada Admin picked in the Show empty list view ("No equipment yet" first found) with a name typed, when the fake server fails the Add (in turn as a server error, as a rejection of the kind the item is no longer in the right state, and as a request that never reaches the server), then each time the API failure modal appears with a Close icon and a Retry icon, the Access denied modal does not, the fake server's data holds no new item, and "No equipment yet" is still shown with no list of rows; and when she activates Close the modal closes and "No equipment yet" is still shown. [REQ-013.22] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-N14 | Given Ada Admin picked and the fake server refusing the list request, when the page is shown, then the Access denied modal appears with the body "You do not have permission" and a single OK icon, and the API failure modal does not exist, so no Close icon and no Retry icon is present: a refused list fetch is not a failure. [REQ-013.23] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-013-N15 | Given Ada Admin picked, the first list request failed so that the API failure modal is found with its Close and Retry icons, and any second list request held by the fake server so that a repeated fetch would show the list indicator, when she activates Close, then the modal closes, the list indicator is not shown, and it is still not shown once everything held is released. [REQ-013.24] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |

### REQ-014: Labelled icon buttons and operable modals

| ID | Given / When / Then | Kind | Owner story | State before the build |
|---|---|---|---|---|
| T-014-P1 | Given the page in each state for Ada and for Mia (list, empty, and each of the four modals), when each of the eleven icon controls is found wherever it appears, modals included, then each is a button whose only content is one inline graphic. [REQ-014.1] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-014-P2 | Given the same states, when every icon button is read, then its tooltip, the `title` attribute, is the pinned text of its control: Borrow, Return, Mark out of service, Restore, Delete, Add equipment, Close, Retry, OK, Cancel, Confirm delete, and for the four demo controls Loading, Empty list, API failure, Access denied. [REQ-014.2] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-014-P3 | Given the same states, when each of the fifteen icon buttons is looked up by role button and its accessible name, then each is found by the pinned text of its control and its `aria-label` equals that text. [REQ-014.3] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-014-P4 | Given the borrower modal, the confirm-delete modal, the API failure modal and the Access denied modal each opened in turn, when its role is read, then every one has the role alertdialog. [REQ-014.4] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-014-P5 | Given the production build in Chromium and each of the four modals opened in turn, with its buttons found first, when the person uses the keyboard alone, then Tab reaches every icon button in the modal and Enter or Space activates it with its normal effect (Close, Cancel and OK close the modal, Retry repeats the request, Confirm deletes the item). [REQ-014.5] | e2e | S3 | fails: no case in `browser.xml`; Playwright's web server cannot start (no `web/package.json`) |
| T-014-P6 | Given the production build in Chromium with Ada Admin picked and rows in all three statuses found, when the person uses the keyboard alone and takes each of the row buttons (Borrow, Return, Mark out of service, Restore, Delete x) and the Add icon in turn, each on its own freshly loaded page with the real list showing and no state demo activated, then Tab reaches that control and Enter or Space activates it with its normal effect: a Borrow opens the borrower modal; a Return, Mark out of service or Restore starts, so its row loader shows; a Delete x opens the confirm-delete modal; the Add icon, with a name typed, starts the Add, so the Add loader shows. The four state-demo controls are T-014-P12. [REQ-014.6] | e2e | S3 | fails: no case in `browser.xml`; Playwright's web server cannot start (no `web/package.json`) |
| T-014-P8 | Given the production build in Chromium and the borrower modal open, with its member buttons found first, when the person uses the keyboard alone, then Tab reaches each member button and Enter or Space activates it, starting the borrow for that member. [REQ-014.7] | e2e | S3 | fails: no case in `browser.xml`; Playwright's web server cannot start (no `web/package.json`) |
| T-014-P9 | Given the borrower modal open, when each member button is read, then it holds one inline graphic and the member's name as text, and, as the anchor, the eleven icon controls elsewhere hold no text. [REQ-014.8] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-014-P10 | Given the borrower modal open, when each member button is read, then its tooltip and its accessible label are "Borrow for Mia Member" and "Borrow for Sam Member". [REQ-014.9] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-014-P11 | Given Ada Admin picked, when the four state-demo controls are read, then their tooltips are "Loading", "Empty list", "API failure" and "Access denied" and their accessible labels are "Show loading", "Show empty list", "Show API failure" and "Show access denied". [REQ-014.10] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-014-P12 | Given the production build in Chromium with Ada Admin picked and rows found, when the person uses the keyboard alone and takes each of the four state-demo controls in turn, each on its own freshly loaded page with the real list showing and nothing else activated on that page, then Tab reaches that control and Enter or Space activates it with its normal effect: Show loading shows the list indicator, Show empty list shows "No equipment yet", Show API failure opens the API failure modal and Show access denied opens the Access denied modal. Neither the Add field nor the Add icon is used on any of these pages, so no Add is ever made from the Show empty list view here; that behaviour has its own rows (T-013-P16 to T-013-N13). [REQ-014.6] | e2e | S3 | fails: no case in `browser.xml`; Playwright's web server cannot start (no `web/package.json`) |
| T-014-N1 | Given the same states as T-014-P1, with the eleven icon controls found first, when the content of each is read, then none holds a text node or any content other than its one inline graphic, so no caption sits inside or in place of an icon (the status badge and the row name beside a row's icons are not part of any button). [REQ-014.1] | unit | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |

### REQ-015: Apple-style look with uniform rows

| ID | Given / When / Then | Kind | Owner story | State before the build |
|---|---|---|---|---|
| T-015-P1 | Given the production build in Chromium with rows Available, On loan and Out of service, when the page is measured as Ada Admin (more icons) and as Mia Member (fewer icons, some rows none), and once with a Borrow answer held so that a row loader shows, then the three rows are first counted in each view and every row has the same height, whatever its status, icons, viewer or loader. [REQ-015.1] | e2e | S3 | fails: no case in `browser.xml`; Playwright's web server cannot start (no `web/package.json`) |
| T-015-P3 | Given the same rows and views, when each row's height is measured, then every row is 48px high, the height of the row without its 6px margin. [REQ-015.2] | e2e | S3 | fails: no case in `browser.xml`; Playwright's web server cannot start (no `web/package.json`) |
| T-015-P4 | Given the same views with a modal open, when the computed font family is read on the page body, the switcher, the Add field, a button, a row name, a status badge, a modal title and a modal body, then each equals the pinned stack `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", system-ui, sans-serif`. [REQ-015.3] | e2e | S3 | fails: no case in `browser.xml`; Playwright's web server cannot start (no `web/package.json`) |
| T-015-P5 | Review in two steps (D-27; 1.5; blueprint 4.1.3), for the translucency of the top bar. **Step 1, the agent pre-review, runs first.** An agent in a session started for this task, never the agent that built the candidate, is given the merged candidate by its commit hash, REQ-015.4 to REQ-015.6, `mockup-rev14.html`, and the conversation trail (the list of blueprint 4.1.3; 1.5). It compares the build's top bar with the mockup's, the list scrolled beneath it in both, in the same screen state, and writes `evidence/review/mockup-comparison-prereview.md`. That report must record the candidate commit hash it read, the date and time, each input named and the session it ran in; list each gap, traced to the criterion and to the place in the trail the expectation came from, and report a gap it cannot trace as its own observation, labelled as such, neither dropped nor given an invented trace; and hold the section "What I could not judge"; it gives no verdict. **Step 2, the user's review.** The user reads that report alongside the build and the mockup, side by side in the same screen state with the list scrolled beneath the top bar, and records in `evidence/review/mockup-comparison.md` an opening line naming the report read (its path and the candidate commit hash it records) and the entry REQ-015.4: `matches` or `does not match`, a build screenshot, a mockup screenshot of the same state, the user's name, the date and the candidate commit hash. **The pass condition is the user's record alone.** The row passes only when the entry reads `matches`, is complete, and the opening line names a valid report for the candidate's hash. It fails when the entry reads `does not match`, and fails, never passing by default, when the entry is missing, reads any other token, lacks a screenshot, a name or a date, carries a hash that is not the candidate's, or sits in a record that does not name a valid report for the candidate's hash (that counts as not recorded). The report is an input and never a result this row asserts: a gap in it fails nothing, and the agent's "found none" closes nothing. [REQ-015.4] | review | S4 | cannot run: no merged candidate exists to pre-review or to compare with the mockup, and neither the pre-review report nor the user's record exists (S4 builds the stack and holds the directory; needs S2 and S3; the means to start the pre-review session are OP-3, section 2) |
| T-015-P6 | Review in the same two steps and with the same two files as T-015-P5, for the rounding of the cards' corners. **Step 1, run first:** an agent in a session started for this task, never the agent that built the candidate, is given the merged candidate by its commit hash, REQ-015.5, `mockup-rev14.html` and the conversation trail (the list of blueprint 4.1.3; 1.5). Its report `evidence/review/mockup-comparison-prereview.md` records the candidate commit hash it read, the date and time, each input and its session, lists each gap traced to the criterion and to the place in the trail, reports a gap it cannot trace as its own observation labelled as such (neither dropped nor given an invented trace), holds the section "What I could not judge", and gives no verdict. **Step 2:** the user reads that report alongside the build's cards and the mockup's, in the same screen state, and records in `evidence/review/mockup-comparison.md`, under the opening line that names the report read (its path and the candidate commit hash it records), the entry REQ-015.5: `matches` or `does not match`, a build screenshot, a mockup screenshot of the same state, the user's name, the date and the candidate commit hash. **The pass condition is the user's record alone**: the row fails on `does not match`, and fails, never passing by default, when the entry is missing, reads any other token, lacks a screenshot, a name or a date, carries a hash that is not the candidate's, or sits in a record that does not name a valid report for the candidate's hash (that counts as not recorded). The report is an input and never a result this row asserts; the agent's "found none" closes nothing. [REQ-015.5] | review | S4 | cannot run: no merged candidate exists to pre-review or to compare with the mockup, and neither the pre-review report nor the user's record exists (S4 builds the stack and holds the directory; needs S2 and S3; OP-3, section 2) |
| T-015-P7 | Review in the same two steps and with the same two files as T-015-P5, for the subtlety of the cards' shadows. **Step 1, run first:** an agent in a session started for this task, never the agent that built the candidate, is given the merged candidate by its commit hash, REQ-015.6, `mockup-rev14.html` and the conversation trail (the list of blueprint 4.1.3; 1.5). Its report `evidence/review/mockup-comparison-prereview.md` records the candidate commit hash it read, the date and time, each input and its session, lists each gap traced to the criterion and to the place in the trail, reports a gap it cannot trace as its own observation labelled as such (neither dropped nor given an invented trace), holds the section "What I could not judge", and gives no verdict. **Step 2:** the user reads that report alongside the build's cards and the mockup's, in the same screen state, and records in `evidence/review/mockup-comparison.md`, under the opening line that names the report read (its path and the candidate commit hash it records), the entry REQ-015.6: `matches` or `does not match`, a build screenshot, a mockup screenshot of the same state, the user's name, the date and the candidate commit hash. **The pass condition is the user's record alone**: the row fails on `does not match`, and fails, never passing by default, when the entry is missing, reads any other token, lacks a screenshot, a name or a date, carries a hash that is not the candidate's, or sits in a record that does not name a valid report for the candidate's hash (that counts as not recorded). The report is an input and never a result this row asserts; the agent's "found none" closes nothing. [REQ-015.6] | review | S4 | cannot run: no merged candidate exists to pre-review or to compare with the mockup, and neither the pre-review report nor the user's record exists (S4 builds the stack and holds the directory; needs S2 and S3; OP-3, section 2) |
| T-015-P8 | Given the production build in Chromium with rows in all three statuses and Ada Admin picked, when the status badge of every row and the role badge are measured, then each has at least as large a computed corner radius as half its height. [REQ-015.7] | e2e | S3 | fails: no case in `browser.xml`; Playwright's web server cannot start (no `web/package.json`) |
| T-015-P9 | Given the production build in Chromium as Ada Admin with rows in all three statuses, each of the four modals opened in turn and the state demos shown, when each of the fifteen icon buttons (Borrow, Return, Mark out of service, Restore, Delete x, Add, Close, Retry, OK, Cancel, Confirm and the four state-demo controls) is looked for wherever it appears (rows, the Add panel, modals, the state demos), then every one of the fifteen is found at least once (one never found fails the row) and every instance found is as wide as it is tall and has a computed corner radius of 50%; the member buttons are not measured here (REQ-015.13). [REQ-015.8] | e2e | S3 | fails: no case in `browser.xml`; Playwright's web server cannot start (no `web/package.json`) |
| T-015-P10 | Given the same page, when the top bar's computed backdrop filter is read, then it contains `blur(20px)`. [REQ-015.9] | e2e | S3 | fails: no case in `browser.xml`; Playwright's web server cannot start (no `web/package.json`) |
| T-015-P11 | Given the same page with the list, the Add card, the list indicator and the empty text each shown in turn, when every element of class `card` is measured, then each has a corner radius of 12px. [REQ-015.10] | e2e | S3 | fails: no case in `browser.xml`; Playwright's web server cannot start (no `web/package.json`) |
| T-015-P12 | Given the same page with each of the four modals opened in turn, when each modal element is measured, then each has a corner radius of 16px. [REQ-015.11] | e2e | S3 | fails: no case in `browser.xml`; Playwright's web server cannot start (no `web/package.json`) |
| T-015-P13 | Given the same page, when the switcher and the Add field are measured, then each has a corner radius of 8px. [REQ-015.12] | e2e | S3 | fails: no case in `browser.xml`; Playwright's web server cannot start (no `web/package.json`) |
| T-015-P14 | Given the same page with the borrower modal open, when each member button is measured, then each has a corner radius of 10px. [REQ-015.13] | e2e | S3 | fails: no case in `browser.xml`; Playwright's web server cannot start (no `web/package.json`) |
| T-015-P15 | Given the same page, when the state demos panel is measured, then it has a corner radius of 12px. [REQ-015.14] | e2e | S3 | fails: no case in `browser.xml`; Playwright's web server cannot start (no `web/package.json`) |
| T-015-N1 | Given the same rows and a Borrow request held, when the row loader appears on a row and then disappears, then the three rows were first counted and that row's height and every other row's height are the same before, during and after. [REQ-015.1] | e2e | S3 | fails: no case in `browser.xml`; Playwright's web server cannot start (no `web/package.json`) |

### REQ-016: Committed data persists across restart

| ID | Given / When / Then | Kind | Owner story | State before the build |
|---|---|---|---|---|
| T-016-P1 | Given an empty database, when the application starts for the first time, then the user list read as Ada holds exactly one admin, Ada Admin, and two members, Mia Member and Sam Member, with ids 1, 2 and 3. [REQ-016.1] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-016-P2 | Given Ada Admin has added items "A" and "B", deleted "B", marked "C" out of service, lent "D" to Mia Member and lent "E" to Sam Member then returned it, when the application is stopped and started again on the same database, then "A" is listed, "B" is absent, "C" is out of service, "D" is still on loan to Mia Member and "E" is available. The restart of the database itself is T-016-P4. [REQ-016.2] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-016-P3 | Given a machine with no database volume from an earlier run (`docker compose down -v` first), when the stack is started with `docker compose up -d --build --wait` and the app opened, then the switcher's entries are first read, and the user list read as Ada through the stack's address holds exactly Ada Admin (id 1, admin), Mia Member (id 2, member) and Sam Member (id 3, member), each once and no other user, and the switcher's entries equal those users. The switcher is a constant of the client (blueprint DD-07), so the row reads the real list: a server that failed to seed, or seeded a user twice, fails it. [REQ-016.1] | production | S4 | fails: its case in `journey.xml` fails at its first `docker compose` call (no `docker-compose.yml`) |
| T-016-P4 | Given the stack in which Ada Admin added "A", deleted "B", marked "C" out of service and lent "D" to Mia Member (with unique names), when the stack is stopped with `docker compose down` (volume kept) and started with `docker compose up -d`, and the page is reloaded and a user picked again, then "A" is listed, "B" is absent, "C" reads "Out of service" and "D" reads "On loan – Mia Member". [REQ-016.2] | production | S4 | fails: its case in `journey.xml` fails at its first `docker compose` call (no `docker-compose.yml`) |
| T-016-N1 | Given the committed changes of T-016-P2, when the application is started two more times on the same database, then the user list still holds exactly three users with no duplicate and the same equipment is listed. [REQ-016.3] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-016-N2 | Given a delete of a loaned item and a borrow of a loaned item, neither confirmed, when the application is stopped and started again, then the item is first found still on loan to its original borrower and the list is as before: the requests that were not confirmed left no committed change. [REQ-016.2] | integration | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-016-N3 | Given the changes of T-016-P4 and a second `docker compose down` and `docker compose up -d`, when the app is opened and a user picked, then the user list read as Ada through the stack's address first holds exactly the three users, each once, with no duplicate and no further user, the switcher's entries equal them, and the changes of T-016-P4 are still present. The switcher is a constant of the client (blueprint DD-07), so the row reads the real list: a restart that seeded again and duplicated users fails it. [REQ-016.3] | production | S4 | fails: its case in `journey.xml` fails at its first `docker compose` call (no `docker-compose.yml`) |

### REQ-017: Restraint on non-goals

| ID | Given / When / Then | Kind | Owner story | State before the build |
|---|---|---|---|---|
| T-017-P1 | Given the page for each of the three users with items in every status, including items named "Settings", "Search", "Edit", "Details", "Reserve" and "Borrowed" (data, not controls), in each state (list, empty, loading, each of the four modals, each demo state) and the switcher, the rows and the controls expected for that user and state found first, when every `button`, `input`, `select`, `a` and `textarea` and every element with a `tabindex` or a button role is enumerated, then each is one of the controls REQ-017.18 lists and no other exists: the switcher; the Add field with its Add icon, for Ada only; the eleven icon controls where the role and status allow them (for Mia and Sam only Borrow on Available rows and Return on their own loans); the member buttons of the borrower modal, which only Ada's modal has; and the four state-demo controls, which are exempt by name (D-16) and are the only exemption. A demo state is left here by picking a user or by Show loading; an Add made from the Show empty list view has its own rows (T-013-P16 to T-013-N13). [REQ-017.1, REQ-017.2, REQ-017.8, REQ-017.9, REQ-017.10, REQ-017.11, REQ-017.12, REQ-017.14, REQ-017.15, REQ-017.16, REQ-017.18] | restraint | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-017-P2 | Given the production build in Chromium with the same data, when the same enumeration is made for Ada and for Mia on the list, the empty state and each modal, with the rows and expected controls found first, then the set is again exactly the controls REQ-017.18 lists with only the four state demos exempt, and no other control exists. [REQ-017.1, REQ-017.2, REQ-017.8, REQ-017.9, REQ-017.10, REQ-017.11, REQ-017.12, REQ-017.14, REQ-017.15, REQ-017.16, REQ-017.18] | restraint | S3 | fails: no case in `browser.xml`; Playwright's web server cannot start (no `web/package.json`) |
| T-017-N1 | Given the page after each described action has been run (borrow, return, add, mark out of service, restore, delete confirmed, delete cancelled, one failure, one refusal), with the rows and the specified structures found first, when the page is scanned, then nothing outside the specified structures carries a message (the specified structures are the row statuses, the empty text, the list indicator, the row and Add loaders, the inline validation message, the tooltips and the four modals): no toast, banner or notification region, no reminder, no success note after an Add, a Mark out of service or a Restore, and no date, time or due-date element or input on any item or loan. [REQ-017.3, REQ-017.4, REQ-017.5, REQ-017.17] | restraint | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-017-N2 | Given the page with an item borrowed and then returned, so that a history would have something to show, and the rows found first, when every row, every row name, the switcher and the demo controls are activated (each demo left by picking a user or by Show loading), each modal is opened and closed, and the page's history is read, then there is one view only: the URL and the history length are unchanged, no `a` element exists, there is exactly one equipment list, and every heading on the page carries a text pinned in blueprint 12.9 (for example Shared Equipment, State demos:, Add equipment, Equipment, or a modal title), so no panel of past loans, no item details and no second list exists. [REQ-017.6, REQ-017.7] | restraint | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-017-N3 | Given the stack and a session in which rows were shown and every described action was run (switching users, borrow, return, add, mark out of service, restore, delete confirmed, delete cancelled), when the browser's local storage, session storage, cookies, IndexedDB databases and service-worker registrations are read, then each is empty. [no labelled criterion; the rubric rule that nothing is stored that the PRD does not describe, with blueprint 5.4 and DD-08: the picked user is held in page memory only] | restraint | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |
| T-017-N4 | Given the stack with the browser recording where each request goes, when first the steps that change nothing are run (switching users, opening and closing each modal, cancelling a delete, a validation failure and the four state demos) and then every described action, then the page's first load is first seen with its rows shown, every request goes to the stack's own address (`http://localhost:8080`) and to no other, and a fresh look as Ada after the first group of steps shows the list exactly as it was before them. [REQ-017.13] | restraint | S4 | fails: its case in `journey.xml` fails at the first page load (connection refused, port 8080) |
| T-017-N5 | Given the page for Ada and for Mia in each state (before a pick, loading, list, empty, each modal, each demo), with the switcher, the row statuses and the empty text found first, when the page is scanned, then no link, no frame, no embedded content and no form leading to an address outside the application exists, so no other service is offered in the interface. [REQ-017.13] | restraint | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |
| T-017-N7 | Given a fresh database and the application after each write operation has been exercised as its allowed role (add, borrow for a member, return, mark out of service, restore, delete), when a dump of every value in every table the application's database holds is taken and the answers to every read are taken as Ada, as Mia and as Sam, then the dump first holds the three seeded users and the exercised items, every value in the dump and in the answers is an item's id, name, status or borrower, or a user's id, name or role, so no date, time, address or note, and no reminder, notification, reservation, due date or history entry, is kept or shown, and a Borrow followed by its Return, and a Mark followed by its Restore, leave the dump exactly as it was before. [REQ-017.3, REQ-017.4, REQ-017.5, REQ-017.6] | restraint | S2 | fails: its case in `integration.xml` errors at setup (`ModuleNotFoundError: app` in the fixture) |
| T-017-N9 | Review in two steps (D-27; 1.5; blueprint 4.1.3), the non-goal walk-through. **Step 1, the agent pre-review, runs first.** An agent in a session started for this task, never the agent that built the candidate, is given the merged candidate running as the stack, by its commit hash; the fourteen criteria REQ-017.2 to REQ-017.6, REQ-017.8 to REQ-017.11, REQ-017.13 to REQ-017.16 and REQ-017.19 and the non-goals of PRD section 7; and the conversation trail (the list of blueprint 4.1.3; 1.5). It examines the build against the fourteen criteria and writes `evidence/review/non-goal-walkthrough-prereview.md`. That report must record the candidate commit hash it read, the date and time, each input named and the session it ran in; list each gap, traced to the criterion and to the place in the trail the expectation came from, and report a gap it cannot trace as its own observation, labelled as such, neither dropped nor given an invented trace; and hold the section "What I could not judge"; it gives no verdict and does not use `found none` as one. **Step 2, the user's review.** The user reads that report alongside the build, goes through the interface as Ada Admin and as Mia Member once for each non-goal, and records in `evidence/review/non-goal-walkthrough.md` an opening line naming the report read (its path and the candidate commit hash it records) and one line for each of the fourteen criteria, each reading `found none` or describing the finding, with the screens visited as Ada Admin and as Mia Member, the user's name, the date and the candidate commit hash. **The pass condition is the user's record alone.** The candidate fails the criterion of any line that describes a finding; a missing line, name, date or hash, or a record whose opening line does not name a valid report for the candidate's hash, counts as not recorded and fails in the same way, never passing by default. The report is an input and never a result this row asserts: a gap in it fails nothing, and the agent's "found none" closes nothing, because the user may find what the agent missed. [REQ-017.2, REQ-017.3, REQ-017.4, REQ-017.5, REQ-017.6, REQ-017.8, REQ-017.9, REQ-017.10, REQ-017.11, REQ-017.13, REQ-017.14, REQ-017.15, REQ-017.16, REQ-017.19] | review | S4 | cannot run: no merged candidate exists to pre-review or to walk through, and neither the pre-review report nor the user's record exists (S4 builds the stack and holds the directory; needs S2 and S3; OP-3, section 2) |
| T-017-N10 | Given the page in each state (before a pick, loading, list, empty, each modal, each demo state) for Ada and for Mia, with the switcher, the row statuses and the empty text found first, when all text, `title` and `aria-label` values are scanned, then none contains "trial", "mockup", "sample data" or "nothing is saved" in any letter case. [REQ-017.19] | restraint | S3 | fails: no case in `component.xml`; test file fails to load (`src/App.jsx` not found) |

---

## 4. Record of the revisions

Nothing is blocked. The PRD has no open question (its former N4 was closed by D-26), so no row waits on one. The one silence that remains is the blueprint's GAP-1, about the page around the failed-list-fetch modal (9.3); no row asserts anything it leaves open.

Sections 4.1 to 4.4 are the record of revision 3, kept as written because the retired IDs in 4.2 must stay listed and are never reused. Section 4.5 is the record of revision 4.

### 4.1 The 22 rows rewritten or dropped under the assertion rule (revision 3)

| ID | What it asserted | What it does now |
|---|---|---|
| T-005-N4 | A refusal "of the kind the routes answer with" a status code | The Borrow naming an admin is rejected (not refused); a named member is accepted |
| T-007-N1, T-007-N4, T-007-N5 | A status code, an empty body, and an anchor code | Not confirmed and unchanged on read-back; the anchor is confirmed and reads its new state |
| T-007-N9 | Codes in a fixed order, to show that the permission check precedes the others | Not confirmed and nothing changed. The order of checks is not asserted (9.4) |
| T-008-N4 | "Wrong-state refusal (the kind the routes answer with)" a code | Both items are rejected (not refused); an Available item can be borrowed |
| T-009-N7 | A status code for an over-long name | Not confirmed, no item created; the 100-character anchor is confirmed |
| T-009-N10 | "Invalid request (the kind the routes answer with)" a code | Rejected (not refused) as an equipment name |
| T-010-N6, T-010-N7 | Pairs of status codes | Pairs of confirmed and not confirmed, with the final state |
| T-011-N5 | "Wrong-state refusal and not a permission refusal" by code kind | Rejected (not refused: the admin may delete) |
| T-011-N8 | One code and another | Exactly one delete confirmed, the item gone |
| T-004-N5 | A catalog of two tables and their columns, and a log-line form | The attribution check, loan case: the two same-name items, one lent by Ada and one borrowed by Mia, are equal in the dump and in every answer except for the item id; "Ada Admin" occurs only as the admin user |
| T-006-N4 | The same catalog and log-line form | The attribution check, return case: one item returned by Mia and one by Ada are indistinguishable except for the item id |
| T-004-N4 | A catalog check that the schema has exactly two tables and these columns | Retired (4.2); the business outcome is held by T-004-N5 |
| T-006-N5 | The same catalog check "kept so that REQ-006.7 has its own case" | Retired (4.2); held by T-006-N4 |
| T-017-N7 | The catalog of the `public` schema | The kept-data check: every stored and shown value is an item's id, name, status or borrower or a user's id, name or role, and a Borrow with its Return, and a Mark with its Restore, leave the dump as it was |
| T-009-N1, T-009-N2, T-009-N3, T-009-N11 | "No add call was recorded" | "No item was created": no row added and the fake server's data unchanged once everything held is released |
| T-017-N5 | `fetch` recorded: every URL under the base and no write call | The page offers no link, frame, embedded content or form to another address (REQ-017.13); the "no write" half is carried as "nothing changed" by T-013-N4, T-013-N5 and T-017-N4 |

### 4.2 Retired tests (their IDs are not reused)

A test is retired when the blueprint's verification register assigns its criteria a different mechanism and the criteria are covered by the rows named, when the PRD or a decision no longer supports it, or, in revision 3, when it asserted something the assertion rule forbids and its business outcome is held elsewhere.

| ID | Why retired | Criteria still covered by |
|---|---|---|
| T-002-P2 | REQ-002 has no J mechanism in the register | T-002-P1 |
| T-006-N3 | REQ-006.3 is a C criterion | T-006-N1 |
| T-007-P5 | REQ-007.7 and REQ-007.8 are C criteria | T-007-P2, T-007-P3 |
| T-007-N7 | It asserted resistance to a forged role claim. D-19 and NFR-5 put resistance to misuse outside the PRD, and the claim's header name is not pinned | T-007-N3, T-007-N6, T-007-N9 |
| T-008-N5 | Two-browser concurrency: REQ-008.4 is an I criterion and REQ-008.5 a C criterion | T-008-N3, T-008-P2 (the two-context scenario is now T-008-N11, T-008-N12) |
| T-009-N6 | REQ-009.4, .5 and .8 are C criteria | T-009-N1, T-009-N2 |
| T-011-N6 | REQ-011.2 and REQ-011.5 are C criteria | T-011-N1, T-011-N3 |
| T-012-N5 | REQ-012.4 is a C criterion | T-012-N1, T-012-N7 |
| T-013-P4 | REQ-013.1 to REQ-013.3 are C criteria | T-013-P1, T-013-P2, T-013-P3 |
| T-014-P7 | A tooltip is the `title` attribute and the browser's drawing of it is not observed (blueprint 4.1); keyboard operation is mechanism B; the register has no review for REQ-014 | T-014-P2, T-014-P5, T-014-P6, T-014-P8 |
| T-015-P2 | One review row for six qualities. D-17 splits them: REQ-015.4 to .6 by review, the rest measured | T-015-P5, T-015-P6, T-015-P7, T-015-P4, T-015-P8, T-015-P9 |
| T-004-N4 | Revision 3: it asserted that the schema has exactly two tables with these columns, which is a table and column shape. Blueprint 4.4 verifies no schema | T-004-N5 (REQ-004.10) |
| T-006-N5 | Revision 3: the same catalog check, repeated for REQ-006.7 | T-006-N4 (REQ-006.7) |
| T-017-N6 | Revision 3: it listed the registered routes and asked the documentation, health and history paths. The route set is a build instruction and blueprint 4.4 says no test lists it | T-017-N7 (REQ-017.3, .6), T-017-N4 and T-017-N5 (REQ-017.13); REQ-017.3 and REQ-017.6 also T-017-N1, T-017-N2 |
| T-017-N8 | Revision 3: it asserted the list of services in the Compose file, which is a deployment tool's configuration, and REQ-017.13 concerns the interface | T-017-N4, T-017-N5, T-017-N9 (REQ-017.13). This retirement is a judgment; section 12 names it |

### 4.3 Other rows changed, and the four anchors

**Codes removed from rows that keep their outcome.** API rows no longer say which code answered; they say confirmed or not confirmed and what the read-back shows: T-001-P4, T-001-N3, T-001-N4, T-001-N7, T-003-P4, T-003-P7, T-003-N2, T-004-P5, T-004-P10, T-005-P1, T-005-N3, T-005-N6, T-006-P4, T-006-P5, T-006-N7, T-007-N2, T-007-N3, T-008-P1, T-008-N1, T-008-N2, T-008-N3, T-008-N6, T-008-N8, T-008-N9, T-009-P4, T-009-P8, T-009-N5, T-009-N9, T-009-N12, T-010-P5, T-010-P6, T-010-P11, T-011-P5, T-011-N4, T-011-N7, T-016-N2. C rows name the fake server's answer by class (confirms, refuses, rejects in a named kind, never reaches the server), never by code: T-001-P2, T-003-N4, T-007-P1, T-008-P2, T-009-N8, T-010-N5, T-012-P3, T-012-P4, T-012-P8, T-012-P9, T-012-N4, T-012-N6. T-007-P4 (J) no longer says what the server answered; it says the Access denied modal appears.

**Call records removed from rows that keep their outcome** (the outcome is read from the data and the rows): T-001-P3, T-001-N5, T-003-P2, T-003-N1, T-004-P1, T-004-P3, T-004-P9, T-004-N2, T-007-P3, T-011-P2, T-011-P4, T-011-N3, T-012-P4, T-012-N3.

**The four anchors.** Each anchored only on "the rows were found", which a build that renders rows and implements nothing would satisfy.

| ID | Criterion | The anchor now |
|---|---|---|
| T-012-N2 | REQ-012.5 | For each of the six actions the loader is first found while the answer is held and the API failure modal is then shown for the failure; nothing can hold unless the action exists. It now also covers Add, Mark out of service and Restore, which REQ-012.5 names |
| T-011-N2 | REQ-011.9 | Ada is picked first and the Delete x icon is found on the Available and the Out of service row; as a member, the Available row is first found showing the Borrow icon |
| T-009-N4 | REQ-009.7 | Ada is picked first and the Add card and Add field are found; as a member the rows or the empty text are first found |
| T-012-N1 | REQ-012.4 | The three confirmed actions are first seen to take effect ("On loan – Mia Member", "Available", the item gone); only then is the page text outside the list and the modals compared |

**Other changes.** T-001-P1 and T-001-P7: the entry format moved to its own row. T-014-P1 and T-014-N1: N1's undefinable "no visible text caption beside or instead of its icon" is replaced by the observable form P1 uses (a button's content is its one graphic and no text node), since a status badge and a row name always sit beside a row's icons. T-014-P3: widened to the fifteen icon buttons (REQ-014.3 says every icon button). T-015-P9: widened to all fifteen icon buttons, wherever each appears (REQ-015.8). T-015-P5 to T-015-P7 and T-017-N9: the blueprint's pass conditions (4.1.3). T-016-P3: no longer asserts that three services run; it asserts the switcher. T-017-N4: origin only; the route list and the write-request count are gone. T-017-P1, T-017-P2, T-002-N1: refer to REQ-017.18 rather than to a locator inventory.

### 4.4 New tests: the criteria the amended PRD added, and the blueprint's added coverage

| ID | Covers | Why |
|---|---|---|
| T-001-P6, T-001-P7 | REQ-001.10, REQ-001.11 | The switcher placeholder and the entry format (D-22) |
| T-001-N8, T-003-N5, T-004-N9, T-005-N7, T-008-N11, T-008-N12, T-011-N9, T-012-N10 | REQ-001.6 to .8, REQ-003.6, REQ-004.11, .12, REQ-005.4, REQ-008.6 to .8, REQ-011.8, REQ-012.16 | The journey mechanism the amended register names for these: the person-visible difference between the Access denied modal and the API failure modal |
| T-004-N6, T-004-N7, T-004-N8, T-004-N9 | REQ-004.11, REQ-004.12 | An admin's Borrow naming nobody or a non-member: the decision, the API, the page, the journey |
| T-009-P11, T-009-P12, T-009-N13 | REQ-009.15, REQ-009.13, REQ-009.14 | The over-length message, the Add loader replacing the Add icon, and Enter doing nothing while it shows |
| T-012-N8, T-012-N9, T-012-N10 | REQ-012.16 | An action on an item that is no longer there: the API, the page, the journey |
| T-013-N3 | REQ-013.11 | The demos are absent before a pick and present after |
| T-013-N4, T-013-N5 | REQ-013.12 | A demo changes nothing kept: the fake server, then the real stack after a reload |
| T-013-P12, T-013-P13, T-013-P14 | REQ-013.13 | Show loading for 900 ms and back by itself: waiting for the indicator to appear and disappear (C and J), and the page's clock for the 900 ms boundary (C). Nothing sleeps |
| T-013-N6, T-013-P15, T-013-N7, T-013-N8 | REQ-013.14, REQ-013.15, REQ-013.16, REQ-013.17 | Show empty list holds; picking a user leaves it; Show loading leaves it for good; Retry in the demo failure modal only closes it |
| T-008-N10, T-010-N8, T-010-N9 | blueprint section 8 | The three concurrency pairs the blueprint added: borrow against restore from Out of service, return against mark from On loan, return against restore from both start states |

### 4.5 Revision 4: the third round (D-24 to D-27) and the defects a review found

No test of revision 3 is retired and no ID changes; 20 tests are added (237 to 257).

**New tests.**

| ID | Covers | Mechanism | Why |
|---|---|---|---|
| T-013-P16, T-013-P17 | REQ-013.18 | C, J | An admin's Add from the Show empty list view is made and kept (D-26): the fake server's data and a fresh render; the real stack after a reload |
| T-013-P18, T-013-P19 | REQ-013.19 | C, J | A confirmed Add ends the view and shows the real list with the new item and every item it held; until then the view stays and the Add loader shows |
| T-013-N9, T-013-N10 | REQ-013.20 | C, B | An Add of an empty or whitespace-only name from the view is not carried out and the view stays; the message's placement in Chromium |
| T-013-N11, T-013-N12 | REQ-013.21 | C, B | An Add of a name over 100 characters from the view: the exact message, no item, no failure modal, the view stays; the placement in Chromium |
| T-013-N13, T-013-P20 | REQ-013.22 | C | A failing Add from the view: the failure modal, no item, the view stays, Close; then Retry repeats the Add with the same name and the real list shows it |
| T-013-P21, T-013-N14, T-013-P22 | REQ-013.23 | C, C, J | A failed list fetch shows the API failure modal with Close and Retry (D-25); a refused one shows the Access denied modal instead; the real stack with the list request aborted |
| T-013-N15 | REQ-013.24 | C | Close closes the modal and the list indicator is not shown |
| T-013-P23, T-013-P24 | REQ-013.25 | C, J | Retry repeats the fetch for the same identity, the indicator shows meanwhile, then the list or the empty text; the real stack |
| T-013-P25 | REQ-013.26 | C | A second failure shows the modal again |
| T-009-N14, T-009-N15 | REQ-009.4, .5, .8, .11 | B | The register's browser row for the placement of the inline validation message: the four checks in Chromium, for an empty name (Enter and the Add icon), a whitespace-only name and a name of 101 characters |
| T-014-P12 | REQ-014.6 | B | The split of T-014-P6, below |

**The four review rows are two-step.** T-015-P5, T-015-P6, T-015-P7 and T-017-N9 no longer say that a named reviewer compares or walks through. Each now states the agent pre-review that runs first and what it is given (the candidate by its hash, the criteria, the mockup or the non-goals, and the conversation trail, by the list of blueprint 4.1.3); what the report must contain (the build it read, the date and time, its inputs, its session, each gap with its criterion and its place in the trail, a gap it cannot trace reported as its own observation and labelled as such, and the section "What I could not judge"); what the user reads; what the user records; and a pass condition that is the user's record alone, with the report named as an input and the agent's "found none" closing nothing. A record that does not name a valid report for the candidate's hash counts as not recorded. The reviewer is the user, which D-27 settles in place of the blueprint's earlier default, DD-12, a reviewer the user had not chosen (1.5). The owner of the directory, S4, writes neither the reports nor the records (8.1).

**The three anchors strengthened.** Each was anchored on something a build that renders rows and implements nothing would satisfy. Each is now anchored on the feature itself, shown working in the same row, as T-011-N2 is.

| ID | Criterion | The anchor before | The anchor now |
|---|---|---|---|
| T-010-N3 | REQ-010.7 | The Available row's Borrow icon, while the row asserts that no row shows Mark out of service or Restore for a member. A build with neither feature passed | Ada is picked first and the Mark out of service icon is found on the Available row and the Restore icon on the Out of service row; as each member, the Available row is first found showing the Borrow icon and no row shows either icon |
| T-013-N2 | REQ-013.4 | The empty text, while the row asserts that a member sees no Add field. A build with no Add passed | Ada is picked first with no items and the Add card and Add field are found above "No equipment yet"; as each member, the empty text is first found and no Add field and no Add card exists |
| T-003-N1 | REQ-003.5 | The row loader, while the row asserts that no borrower selection exists for a member. A build with no admin borrower modal passed | Ada is picked first, activates Borrow and the borrower modal with its member buttons is found; as Mia, the row loader is found and no member button, no select other than the switcher and no text input exists |

**The two journey rows that could not fail.** T-016-P3 and T-016-N3 asserted that the switcher lists the three seeded users. The switcher is a constant of the client (blueprint DD-07), so neither could fail on a server that failed to seed or that duplicated users. Chosen: make each assert something that can fail. Each now reads the real list through the stack's address as Ada, requires exactly the three users once each in id order, and requires the switcher's entries to equal them. They are no longer rows that only corroborate T-016-P1, T-016-N1 and T-001-P5; the seed is verified in the real stack as well as in the API.

**The placement of the validation message** is the blueprint's four checks (1.1), which replace "by the Add field" in T-009-N1, T-009-N2, T-009-N8 and T-009-N11 (C: checks 1 and 2, which a DOM can apply) and are applied in full by the new B rows T-009-N14, T-009-N15, T-013-N10 and T-013-N12. T-013-N9 and T-013-N11 apply checks 1 and 2 in the Show empty list view.

**T-014-P6 is split.** It activated the Add icon and all four state-demo controls on one page with no order stated, so an Add icon activated while the Show empty list view showed would have touched REQ-013.18 to REQ-013.22 and not the keyboard criterion. T-014-P6 keeps the row buttons and the Add icon; the four state-demo controls are the new T-014-P12. In both, each control is taken on its own freshly loaded page, so no activation carries into another, and no Add is ever made from a demo view in either row.

**Titles and REQ-005.3.** Titles are test ID, then labels, then description (DD-24), and the concurrency-pair tests that the blueprint does not tie to a criterion carry `CONC` and the pair and no label. T-008-N8 (borrow / return) and T-008-N10 (borrow / restore) lost the labels REQ-008.1 and REQ-008.3 on that account; both criteria keep their evidence in other rows (5.1). REQ-005.3 is an admin's request only; a member naming the admin is verified once under REQ-003.6 (1.1).

**Stale quotations deleted.** The bullet in 1.1 and section 9.5 quoted blueprint sentences that no longer exist. Both are replaced by what the blueprint now says, and they record that the conflict over the rules-level rows was settled in this plan's favour: a rules row may state the class, an integration row may not.

**GAP-1 and OP-3** are recorded: GAP-1 in 9.3 and OP-3 in section 2, item 7. No answer is given to either.

---

## 5. Coverage, checked in both directions

### 5.1 Criterion to test: all 182 labelled criteria, with the register's mechanisms

"Tests" are listed by the mechanism they run. A row marked "review" is covered by a review row, which cannot run before a candidate exists. A criterion with an additional supporting row lists it in brackets.

| Criterion | Register mechanisms | Tests | Status |
|---|---|---|---|
| REQ-001.1 | C, J | C: T-001-P1; J: T-001-P5 | covered |
| REQ-001.2 | C | T-001-P1 | covered |
| REQ-001.3 | C | T-001-N1 | covered |
| REQ-001.4 | C, J | C: T-001-P2; J: T-001-P5 | covered |
| REQ-001.5 | C | T-001-P3, T-001-N2 | covered |
| REQ-001.6 | I, J | I: T-001-N3; J: T-001-N8 | covered |
| REQ-001.7 | U, I, J | U: T-001-N6; I: T-001-N7; J: T-001-N8 | covered |
| REQ-001.8 | I, J | I: T-001-N4; J: T-001-N8 | covered |
| REQ-001.9 | C | T-001-N5 | covered |
| REQ-001.10 | C | T-001-P6 | covered |
| REQ-001.11 | C | T-001-P7 | covered |
| REQ-002.1 | C | T-002-P1, T-002-N2 | covered |
| REQ-002.2 | C | T-002-P1 | covered |
| REQ-002.3 | C | T-002-P1 | covered |
| REQ-002.4 | C | T-002-N1 | covered |
| REQ-002.5 | C | T-002-N3 | covered |
| REQ-003.1 | C | T-003-P1 | covered |
| REQ-003.2 | C | T-003-P2 | covered |
| REQ-003.3 | C | T-003-P2 | covered |
| REQ-003.4 | C, J | C: T-003-P3; J: T-003-P5 (also I: T-003-P4) | covered |
| REQ-003.5 | C | T-003-N1 | covered |
| REQ-003.6 | U, I, C, J | U: T-003-N3; I: T-003-N2; C: T-003-N4; J: T-003-N5 | covered |
| REQ-003.7 | C | T-003-P8 | covered |
| REQ-003.8 | I, C | I: T-003-P7; C: T-003-P8 | covered |
| REQ-004.1 | C | T-004-P1 | covered |
| REQ-004.2 | C | T-004-P2 | covered |
| REQ-004.3 | C | T-004-N1 | covered |
| REQ-004.4 | C | T-004-N2 | covered |
| REQ-004.5 | C | T-004-P3 | covered |
| REQ-004.6 | C, J | C: T-004-P4; J: T-004-P7 (also I: T-004-P5) | covered |
| REQ-004.7 | C | T-004-P8 | covered |
| REQ-004.8 | C, I | C: T-004-P9; I: T-004-P10 | covered |
| REQ-004.9 | C, J | C: T-004-N3; J: T-004-P7 | covered |
| REQ-004.10 | I | I: T-004-N5 | covered |
| REQ-004.11 | U, I, C, J | U: T-004-N6; I: T-004-N7; C: T-004-N8; J: T-004-N9 | covered |
| REQ-004.12 | U, I, C, J | U: T-004-N6; I: T-004-N7; C: T-004-N8; J: T-004-N9 | covered |
| REQ-005.1 | C | T-005-N1 | covered |
| REQ-005.2 | C, J | C: T-005-N2; J: T-005-N5 (also I: T-005-P1) | covered |
| REQ-005.3 | U, I | U: T-005-N4; I: T-005-N3 (an admin's request only; a member naming the admin is verified once, under REQ-003.6) | covered |
| REQ-005.4 | U, I, J | U: T-005-N4; I: T-005-N3, T-005-N6; J: T-005-N7 | covered |
| REQ-006.1 | C | T-006-P1 | covered |
| REQ-006.2 | C | T-006-P2 | covered |
| REQ-006.3 | C | T-006-N1 | covered |
| REQ-006.4 | C | T-006-P3 | covered |
| REQ-006.5 | C, J | C: T-006-P3; J: T-006-P7 (also I: T-006-P4, T-006-P5) | covered |
| REQ-006.6 | C, J | C: T-006-N6; J: T-006-P7 | covered |
| REQ-006.7 | I | I: T-006-N4 | covered |
| REQ-007.1 | U, I | U: T-007-N6; I: T-007-N1 | covered |
| REQ-007.2 | U, I | U: T-007-N6; I: T-007-N2, T-007-N9 | covered |
| REQ-007.3 | U, I | U: T-007-N6; I: T-007-N3, T-007-N9 | covered |
| REQ-007.4 | U, I | U: T-007-N6; I: T-007-N4, T-007-N9 | covered |
| REQ-007.5 | U, I | U: T-007-N6; I: T-007-N5, T-007-N9 | covered |
| REQ-007.6 | C, J | C: T-007-P1, T-007-N8; J: T-007-P4 | covered |
| REQ-007.7 | C | T-007-P2 | covered |
| REQ-007.8 | C | T-007-P3 | covered |
| REQ-008.1 | D, I | D: T-008-N7 (the store refuses an item On loan with no borrower, and a borrower on an item not On loan); I: T-008-P1 (after a confirmed Borrow, exactly one borrower), T-008-N3 (after each of twenty rounds of two simultaneous Borrows, each item has at most one borrower and the contested item exactly one). These three are the labelled evidence. No mixed sequence of actions is claimed, and no check after the other concurrency tests of section 8 (the borrow / return pair T-008-N8 also asserts "never two borrowers" but carries no label, 1.1) | covered |
| REQ-008.2 | U, I | U: T-008-N4; I: T-008-N1 | covered |
| REQ-008.3 | U, I | U: T-008-N4; I: T-008-N2 (the borrow / restore pair T-008-N10 carries no label, 1.1) | covered |
| REQ-008.4 | I | T-008-N3 | covered |
| REQ-008.5 | C | T-008-P2 | covered |
| REQ-008.6 | U, I, J | U: T-008-N4; I: T-008-N1, T-008-N6; J: T-008-N11 | covered |
| REQ-008.7 | U, I, J | U: T-008-N4; I: T-008-N2, T-008-N6, T-008-N9; J: T-008-N12 | covered |
| REQ-008.8 | I, J | I: T-008-N3; J: T-008-N11 | covered |
| REQ-009.1 | C | T-009-P1 | covered |
| REQ-009.2 | C, J | C: T-009-P2, T-009-P6; J: T-009-P5 (also I: T-009-P4) | covered |
| REQ-009.3 | C | T-009-P3 | covered |
| REQ-009.4 | C, B | C: T-009-N1; B: T-009-N14 | covered |
| REQ-009.5 | C, B | C: T-009-N2; B: T-009-N14 | covered |
| REQ-009.6 | U, C, I | U: T-009-N10; C: T-009-N3; I: T-009-N5 | covered |
| REQ-009.7 | C | T-009-N4 | covered |
| REQ-009.8 | C, B | C: T-009-N1, T-009-N2; B: T-009-N15 | covered |
| REQ-009.9 | I, C | I: T-009-N9; C: T-009-P10 | covered |
| REQ-009.10 | U, I | U: T-009-N10; I: T-009-N7 | covered |
| REQ-009.11 | C, B | C: T-009-N8, T-009-N11; B: T-009-N15 | covered |
| REQ-009.12 | U, I, C | U: T-009-P7; I: T-009-P8; C: T-009-P9 | covered |
| REQ-009.13 | C | T-009-P12 | covered |
| REQ-009.14 | C | T-009-N13 | covered |
| REQ-009.15 | C | T-009-P11 | covered |
| REQ-010.1 | C | T-010-P1 | covered |
| REQ-010.2 | C | T-010-N1 | covered |
| REQ-010.3 | C, I, J | C: T-010-P3, T-010-P9; I: T-010-P5; J: T-010-P7 | covered |
| REQ-010.4 | C | T-010-P2 | covered |
| REQ-010.5 | C | T-010-N2 | covered |
| REQ-010.6 | C, I, J | C: T-010-P4, T-010-P10; I: T-010-P6, T-010-P11; J: T-010-P7 | covered |
| REQ-010.7 | C | T-010-N3 | covered |
| REQ-011.1 | C | T-011-P1 | covered |
| REQ-011.2 | C | T-011-N1 | covered |
| REQ-011.3 | C | T-011-P2 | covered |
| REQ-011.4 | C | T-011-P3 | covered |
| REQ-011.5 | C | T-011-N3 | covered |
| REQ-011.6 | C | T-011-P4 | covered |
| REQ-011.7 | C, J | C: T-011-P4; J: T-011-P7 (also I: T-011-P5) | covered |
| REQ-011.8 | U, I, J | U: T-011-N5; I: T-011-N4, T-011-N7; J: T-011-N9 | covered |
| REQ-011.9 | C | T-011-N2 | covered |
| REQ-012.1 | C | T-012-P1 | covered |
| REQ-012.2 | C | T-012-P1 | covered |
| REQ-012.3 | C | T-012-P2 | covered |
| REQ-012.4 | C | T-012-N1 | covered |
| REQ-012.5 | C | T-012-N2 | covered |
| REQ-012.6 | C | T-012-P3, T-012-N4 | covered |
| REQ-012.7 | C | T-012-N3 | covered |
| REQ-012.8 | C, J | C: T-012-P4; J: T-012-P5 | covered |
| REQ-012.9 | C | T-012-P6 | covered |
| REQ-012.10 | C | T-012-P6 | covered |
| REQ-012.11 | C, J | C: T-012-P6; J: T-012-P7 | covered |
| REQ-012.12 | C | T-012-P8 | covered |
| REQ-012.13 | C | T-012-P9 | covered |
| REQ-012.14 | C | T-012-N6 | covered |
| REQ-012.15 | C | T-012-N7 | covered |
| REQ-012.16 | I, C, J | I: T-012-N8; C: T-012-N9; J: T-012-N10 | covered |
| REQ-013.1 | C | T-013-P1, T-013-N1 | covered |
| REQ-013.2 | C | T-013-P2, T-013-N1 | covered |
| REQ-013.3 | C | T-013-P3 | covered |
| REQ-013.4 | C | T-013-N2 | covered |
| REQ-013.5 | C, B | C: T-013-P5; B: T-013-P6 | covered |
| REQ-013.6 | C | T-013-P7 | covered |
| REQ-013.7 | C | T-013-P8 | covered |
| REQ-013.8 | C | T-013-P9 | covered |
| REQ-013.9 | C | T-013-P10 | covered |
| REQ-013.10 | C | T-013-P11 | covered |
| REQ-013.11 | C | T-013-N3 | covered |
| REQ-013.12 | C, J | C: T-013-N4; J: T-013-N5 | covered |
| REQ-013.13 | C, J | C: T-013-P12, T-013-P13; J: T-013-P14 | covered |
| REQ-013.14 | C | T-013-N6 | covered |
| REQ-013.15 | C | T-013-P15 | covered |
| REQ-013.16 | C | T-013-N7 | covered |
| REQ-013.17 | C | T-013-N8 | covered |
| REQ-013.18 | C, J | C: T-013-P16; J: T-013-P17 | covered |
| REQ-013.19 | C, J | C: T-013-P18; J: T-013-P19 | covered |
| REQ-013.20 | C, B | C: T-013-N9; B: T-013-N10 | covered |
| REQ-013.21 | C, B | C: T-013-N11; B: T-013-N12 | covered |
| REQ-013.22 | C | T-013-N13, T-013-P20 | covered |
| REQ-013.23 | C, J | C: T-013-P21, T-013-N14; J: T-013-P22 | covered |
| REQ-013.24 | C | T-013-N15 | covered |
| REQ-013.25 | C, J | C: T-013-P23; J: T-013-P24 | covered |
| REQ-013.26 | C | T-013-P25 | covered |
| REQ-014.1 | C | T-014-P1, T-014-N1 | covered |
| REQ-014.2 | C | T-014-P2 | covered |
| REQ-014.3 | C | T-014-P3 | covered |
| REQ-014.4 | C | T-014-P4 | covered |
| REQ-014.5 | B | T-014-P5 | covered |
| REQ-014.6 | B | T-014-P6 (row buttons and the Add icon), T-014-P12 (the four state-demo controls) | covered |
| REQ-014.7 | B | T-014-P8 | covered |
| REQ-014.8 | C | T-014-P9 | covered |
| REQ-014.9 | C | T-014-P10 | covered |
| REQ-014.10 | C | T-014-P11 | covered |
| REQ-015.1 | B | T-015-P1, T-015-N1 | covered |
| REQ-015.2 | B | T-015-P3 | covered |
| REQ-015.3 | B | T-015-P4 | covered |
| REQ-015.4 | R1 | T-015-P5 | review |
| REQ-015.5 | R1 | T-015-P6 | review |
| REQ-015.6 | R1 | T-015-P7 | review |
| REQ-015.7 | B | T-015-P8 | covered |
| REQ-015.8 | B | T-015-P9 | covered |
| REQ-015.9 | B | T-015-P10 | covered |
| REQ-015.10 | B | T-015-P11 | covered |
| REQ-015.11 | B | T-015-P12 | covered |
| REQ-015.12 | B | T-015-P13 | covered |
| REQ-015.13 | B | T-015-P14 | covered |
| REQ-015.14 | B | T-015-P15 | covered |
| REQ-016.1 | I, J | I: T-016-P1; J: T-016-P3 (reads the real user list) | covered |
| REQ-016.2 | J, I | J: T-016-P4; I: T-016-P2, T-016-N2 | covered |
| REQ-016.3 | I, J | I: T-016-N1; J: T-016-N3 (reads the real user list) | covered |
| REQ-017.1 | C | T-017-P1 (REQ-001.3 is also checked by T-001-N1) | covered |
| REQ-017.2 | C, R2 | C: T-017-P1; R2: T-017-N9 | covered; review part cannot run |
| REQ-017.3 | C, I, R2 | C: T-017-N1; I: T-017-N7; R2: T-017-N9 | covered; review part cannot run |
| REQ-017.4 | C, I, R2 | C: T-017-N1; I: T-017-N7; R2: T-017-N9 | covered; review part cannot run |
| REQ-017.5 | C, I, R2 | C: T-017-N1; I: T-017-N7; R2: T-017-N9 | covered; review part cannot run |
| REQ-017.6 | C, I, R2 | C: T-017-N2; I: T-017-N7; R2: T-017-N9 | covered; review part cannot run |
| REQ-017.7 | C | T-017-N2 | covered |
| REQ-017.8 | C, R2 | C: T-017-P1; R2: T-017-N9 | covered; review part cannot run |
| REQ-017.9 | C, R2 | C: T-017-P1; R2: T-017-N9 | covered; review part cannot run |
| REQ-017.10 | C, R2 | C: T-017-P1; R2: T-017-N9 | covered; review part cannot run |
| REQ-017.11 | C, R2 | C: T-017-P1; R2: T-017-N9 | covered; review part cannot run |
| REQ-017.12 | C | T-017-P1 | covered |
| REQ-017.13 | C, R2 | C: T-017-N5; R2: T-017-N9 (also J: T-017-N4) | covered; review part cannot run |
| REQ-017.14 | C, R2 | C: T-017-P1; R2: T-017-N9 | covered; review part cannot run |
| REQ-017.15 | C, R2 | C: T-017-P1; R2: T-017-N9 | covered; review part cannot run |
| REQ-017.16 | C, R2 | C: T-017-P1; R2: T-017-N9 | covered; review part cannot run |
| REQ-017.17 | C | T-017-N1 | covered |
| REQ-017.18 | C, B | C: T-017-P1; B: T-017-P2 | covered |
| REQ-017.19 | C, R2 | C: T-017-N10; R2: T-017-N9 | covered; review part cannot run |

### 5.2 Test to requirement

Every test in section 3 names exactly one requirement, the number in its ID, and that requirement exists in the PRD. Every bracket cites criteria of that requirement only. Nineteen tests carry no labelled criterion, and each says why in its own sentence: T-001-P4, T-003-P6, T-004-P6, T-006-P6, T-006-N2, T-006-N7, T-008-N8, T-008-N10, T-009-N12, T-010-P8, T-010-N4, T-010-N5, T-010-N6, T-010-N7, T-010-N8, T-010-N9, T-011-P6, T-011-N8 and T-017-N3. None of them is counted as covering a criterion in 5.1. Nine of the nineteen are concurrency-pair tests whose titles carry `CONC` and the pair (1.1, 5.3).

### 5.3 The concurrency table of blueprint section 8

The blueprint asks for two serial-order tests and one released-together test (20 rounds) for every pair it lists. Each pair is one row, holding all three. **Pairs the blueprint does not list are governed by the row-lock rule and the transition rule of its section 8 (the result always equals one of the two serial orders) and are not separately tested.**

Under DD-24 the title of each test begins with its ID. The blueprint (section 8, "How it is verified") ties a label to three of the pair tests only: the borrow / borrow test (REQ-008.4 and REQ-008.8, with the invariant check REQ-008.1), the delete pairs that delete an On loan item (REQ-011.8), and the borrow / mark pair (REQ-008.7). Every other pair test carries `CONC` and the pair, and no label.

| Pair (blueprint section 8) | Test | The title after the ID carries |
|---|---|---|
| borrow / borrow, Available | T-008-N3 | `REQ-008.1 REQ-008.4 REQ-008.8` |
| borrow / return, On loan and Available | T-008-N8 | `CONC borrow/return` |
| borrow / delete, Available | T-011-N7 | `REQ-011.8` |
| borrow / mark, Available | T-008-N9 | `REQ-008.7` |
| borrow / restore, Out of service (added) | T-008-N10 | `CONC borrow/restore` |
| return / mark, On loan (added) | T-010-N8 | `CONC return/mark` |
| return / restore, from On loan and from Out of service (added) | T-010-N9 | `CONC return/restore` |
| return / return | T-006-N7 | `CONC return/return` |
| return / delete | T-011-N7 | `REQ-011.8` |
| delete / mark and delete / restore | T-010-N7 | `CONC delete/mark delete/restore` |
| mark / restore, from Available and from Out of service; mark / mark; restore / restore | T-010-N6 | `CONC mark/restore mark/mark restore/restore` |
| delete / delete | T-011-N8 | `CONC delete/delete` |
| add / add | T-009-N12 | `CONC add/add` |

### 5.4 PRD Journey and the forced paths, step by step

| Journey step | Tests |
|---|---|
| 1. Open the app and choose a seeded user | T-001-P5 |
| 2 and 3. Ada clicks Borrow; the modal lists Mia and Sam; choose Mia; "On loan – Mia Member" | T-004-P7 |
| 4. Ada clicks Return; Available | T-006-P7 |
| 5. Ada types a name and presses Enter; it appears as Available | T-009-P5, T-012-P7 |
| 6. Ada marks an item out of service and restores it | T-010-P7, T-012-P7 |
| 7. Ada clicks x; confirm; the item is gone (cancel is T-011-N3) | T-011-P7 |
| 8. Mia borrows with no modal; a failed request shows a modal with Close and Retry | T-003-P5, T-012-P5 |
| Forced refusals (return another's loan, delete, add, mark, restore) | T-007-P4 |
| Refusals of a missing, unknown or malformed identity, and of a borrow forced by a member | T-001-N8, T-003-N5 |
| Rejections shown by the API failure modal (a borrow naming nobody, a non-member or the admin; a stale second context; an item deleted meanwhile) | T-004-N9, T-005-N7, T-008-N11, T-008-N12, T-011-N9, T-012-N10 |
| State demos on the real stack | T-013-P14, T-013-N5 |
| An Add made from the Show empty list view on the real stack (D-26) | T-013-P17, T-013-P19 |
| A failed list fetch on the real stack: the modal, and Retry (D-25) | T-013-P22, T-013-P24 |
| Restart persistence through Compose | T-016-P3, T-016-P4, T-016-N3 |

---

## 6. Restraint tests by surface

The rubric asks for at least one restraint test per surface. Each sentence asserts structure, not wording, and carries its positive anchor (1.1). A row named "Settings" or "Borrowed Camera" is data. A request-level restraint ("no write request the PRD does not describe") is asserted as an outcome: the steps that must change nothing are followed by a read showing nothing changed.

| Surface | Rubric rule it asserts | Tests |
|---|---|---|
| Web page, controls | No control outside the places the PRD names, and no unnamed control anywhere | T-017-P1 (C), T-017-P2 (B), T-002-N1, T-003-N1 |
| Web page, text and messages | Nothing is shown that the PRD does not specify (messages, dates, history, details, success notes, trial labels) | T-017-N1, T-017-N2, T-017-N10, T-001-N1, T-002-N3, T-012-N1, T-012-N7 |
| Web page, data as text | Text that comes from data is never treated as a control or executed | T-002-N2, T-017-P1 (feature-named items are data) |
| Web page, other services | No integration with another service is offered | T-017-N5 |
| Network from the page | No request to an origin the blueprint does not name, and no write request the PRD does not describe | T-017-N4 (J: origin and "nothing changed" by the steps that must change nothing); also T-013-N4, T-013-N5 (a demo changes nothing), T-004-N2, T-011-N3, T-012-N3 (Close and Cancel change nothing) |
| Browser storage | Nothing is stored that the PRD does not describe | T-017-N3 |
| HTTP API | The API shows nothing the PRD does not describe | T-017-N7 (every field of every answer), T-004-N5, T-006-N4 |
| Data store | Nothing is stored that the PRD does not describe (no history, due date, notification, attribution) | T-017-N7, T-004-N5, T-006-N4 |
| Whole interface, by a person | A walk-through for each non-goal, after an agent pre-review; the pass condition is the user's record alone | T-017-N9 (review, two steps) |

---

## 7. Commands

### 7.1 What must be present

| Needed | For | Provisioned how |
|---|---|---|
| Python 3.12 | U, D, I | Must be installed; C1 checks the version. The plan does not install it |
| Node.js 22 LTS and npm | C, B, J | Must be installed; C1 checks |
| Docker Engine 24 or later with Compose v2 and a running daemon, with permission to stop and start containers | The PostgreSQL 16 container for D and I; the stack for J | Must be installed. The images `postgres:16` and `nginx:1.27-alpine` and the stack's built images are pulled and built by the commands |
| Chromium, from Playwright 1.48 | B and J | `playwright install chromium` downloads it |
| Network access | pip, npm, Docker image and browser downloads | Must be available |
| The user, who is the reviewer (D-27; a person other than the build's author), and an agent session for the pre-review (started for that task, never the agent that built the candidate) | R1 and R2 | C12: the agent session does step 1 and the user does step 2 against the running candidate. The plan cannot provision either; how the agent session is started and handed the conversation trail is OP-3 (section 2, item 7) |

### 7.2 The sequence

The branch's own scripts (`npm test`, `package.json` scripts, `pyproject.toml` or `pytest.ini` under `api/`, `web/vite.config.js`'s test block) are never used; each command calls the tool directly with the frozen configuration of 7.4. Run from the repository root, in this order. The freeze check runs every step whatever an earlier step did, so that each row's outcome is read from its report (on the baseline C3, C5, C6, C8, C9, C10 and C11 are expected to exit non-zero); C7 and C13 always run. Nothing here has been run.

```
# C0  report folders (git-ignored output). The pre-review reports and the review records are
#     written by the pre-reviewing agent and by the user, not here
mkdir -p api/reports web/reports e2e/reports evidence/review

# C1  preconditions; absence of any of these stops the run
python3.12 --version
node --version
docker --version
docker compose version
# The host port C4 publishes must be free. Without this check a container that fails to bind
# leaves an earlier database of someone else's listening there, and the D rows then pass or
# fail against the wrong store with no error to show for it. Observed, not hypothetical.
! (command -v lsof >/dev/null && lsof -nP -iTCP:55432 -sTCP:LISTEN) \
  || { echo "port 55432 is in use; C4 cannot bind it" >&2; exit 1; }

# C2  API tools in a clean environment: the application's own packages when its list exists,
#     then the frozen, hash-pinned test tools (pytest 8.3, httpx 0.27 and their dependencies).
#     --force-reinstall is load-bearing, not hygiene: pip does not hash-verify a distribution
#     that is already satisfied at the pinned version, and the builder's own list is installed
#     first into the same environment. Without it, a builder that names pytest, pluggy or any
#     other pinned test package in api/requirements.txt supplies the runner of its own exam,
#     and the frozen line reports "Requirement already satisfied" and exits 0.
#     It reaches substitution of a pinned package and nothing further. A package the builder
#     ADDS, carrying a pytest11 entry point, is loaded by pytest's plugin autoload however the
#     pinned tools were installed, and one such hook can swallow every failure: a build
#     implementing nothing then reports all of S1 green. That is why every pytest command below
#     sets PYTEST_DISABLE_PLUGIN_AUTOLOAD=1, and why a command needing a third-party plugin must
#     name it explicitly with -p rather than rely on discovery.
python3.12 -m venv .eval-venv
. .eval-venv/bin/activate
if [ -f api/requirements.txt ]; then python -m pip install -r api/requirements.txt; fi
python -m pip install --require-hashes --force-reinstall -r harness/api/requirements-eval.txt

# C3  U: the unit tree, with no database and no application setting in the environment
export PYTHONPATH="$PWD/api"
env -u DATABASE_URL -u TEST_DATABASE_URL PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 \
  python -m pytest -c harness/api/pytest.ini --rootdir api \
  api/tests/unit -q --junitxml=api/reports/unit.xml

# C4  a real PostgreSQL 16, test-only credentials, wait for the second "ready" line
docker rm -f eval-pg 2>/dev/null || true
docker run -d --name eval-pg -e POSTGRES_USER=eval -e POSTGRES_PASSWORD=eval-only \
  -e POSTGRES_DB=equipment_eval -p 127.0.0.1:55432:5432 postgres:16
until [ "$(docker logs eval-pg 2>&1 | grep -c 'ready to accept connections')" -ge 2 ]; do sleep 1; done
export TEST_DATABASE_URL='postgresql+psycopg://eval:eval-only@127.0.0.1:55432/equipment_eval'

# C5  D: the data store written to directly
env PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 \
  python -m pytest -c harness/api/pytest.ini --rootdir api api/tests/db -q --junitxml=api/reports/db.xml

# C6  I: TestClient on app.main:app, including the threaded concurrency tests.
#     -p anyio is explicit because autoload is off (C2); if an I row needs no async plugin the
#     entry is harmless, and if one does, discovery must not be what supplies it.
env PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 \
  python -m pytest -c harness/api/pytest.ini --rootdir api -p anyio api/tests/api -q \
  --junitxml=api/reports/integration.xml

# C7  tear down the test database and the environment
docker rm -f eval-pg
deactivate

# C8  C: Vitest, React Testing Library, jsdom, with the frozen tools and configuration
if [ -f web/package.json ]; then npm --prefix web ci; fi
npm --prefix harness/web ci
harness/web/node_modules/.bin/vitest run --root web --config harness/web/vitest.config.js \
  --reporter=junit --outputFile="$PWD/web/reports/component.xml"

# C9  B: Chromium on the production build served by vite preview, the API faked with page.route.
#     The frozen web/playwright.config.js starts its own web server and writes web/reports/browser.xml
harness/web/node_modules/.bin/playwright install chromium
harness/web/node_modules/.bin/playwright test --config web/playwright.config.js

# C10 the Compose stack from the frozen values file
docker compose --env-file harness/e2e/eval.env up -d --build --wait --wait-timeout 300

# C11 J: Chromium on the running stack. The production rows (T-016-P3, T-016-P4, T-016-N3) run last,
#     because they stop and recreate the stack with docker compose down and up from the repository root
#     and the same --env-file. Output: e2e/reports/journey.xml, traces and one screenshot per step
npm --prefix e2e ci
(cd e2e && npx playwright install chromium \
  && E2E_BASE_URL=http://localhost:8080 npx playwright test --config playwright.config.js)

# C12 R1 and R2, in two steps on the running candidate, in this order. Neither is run by a command:
#     step 1  an agent in a session started for the task (never the build's agent) writes
#             evidence/review/mockup-comparison-prereview.md and
#             evidence/review/non-goal-walkthrough-prereview.md, given the candidate's hash,
#             the criteria, the mockup and the conversation trail (the list of blueprint
#             4.1.3); inputs, not evidence
#     step 2  the user reads each report alongside the build and writes the records that are the
#             evidence: evidence/review/mockup-comparison.md (T-015-P5, T-015-P6, T-015-P7) and
#             evidence/review/non-goal-walkthrough.md (T-017-N9)

# C13 tear down the stack and its volume
docker compose --env-file harness/e2e/eval.env down -v
```

What each step requires of the build. C3 needs `api/app/rules.py` (S1). C5 needs `api/app/db.py` (S1). C6 needs `api/app/` complete (S1, S2). C8 needs `web/src/App.jsx` and `web/package.json` (S3). C9 needs the same and a production build (S3). C10 and C11 need `docker-compose.yml`, `.env.example`, the two Dockerfiles and `web/nginx.conf` (S4), and, to build, S1 to S3. C12 needs the merged candidate for both steps, and OP-3 for step 1. On the baseline none exists, and the reports hold what section 1.2 says.

### 7.3 Mechanisms and the commands that carry them

| Mechanism | Command | Report |
|---|---|---|
| U | C3 | `api/reports/unit.xml` |
| D | C5 | `api/reports/db.xml` |
| I | C6 | `api/reports/integration.xml` |
| C | C8 | `web/reports/component.xml` |
| B | C9 | `web/reports/browser.xml` |
| J | C10, then C11 | `e2e/reports/journey.xml` |
| R1, R2 | C12, in two steps | The user's records, which are the evidence: `evidence/review/mockup-comparison.md`, `evidence/review/non-goal-walkthrough.md`. Inputs to them, never evidence: `evidence/review/mockup-comparison-prereview.md`, `evidence/review/non-goal-walkthrough-prereview.md` |

The evidence of an automated row is the passing case in its report whose title begins with the row's ID and carries the criterion label after it (1.1, DD-24); a concurrency-pair test with no label carries `CONC` and the pair. A review row passes only when the user's record meets the pass condition written in the row (blueprint 4.1.3, 1.5): an entry or line that is missing, incomplete, or a finding fails the row, and so does a record that does not name a valid report for the candidate's hash. The pre-review report is never the evidence. The blueprint's optional container variant of the API tests is not used: the builder owns the images, and the tests need pytest and the frozen configuration outside them.

### 7.4 Frozen harness files

These are written at the freeze, committed with the tests, and not changeable by any builder. The blueprint pins the test directories and report paths. Only the `harness/` folder is this plan's proposal (section 2, item 1). Every frozen path has an owner story (last column); the ownership rule is stated in 8.1.

| Path | Holds | Owner story (the first whose steps it gates) |
|---|---|---|
| `harness/api/requirements-eval.txt`, `harness/api/pytest.ini` | Hash-pinned test tools; the frozen pytest configuration, which ignores `api/pyproject.toml`. It gates every pytest step: C3 and C5 directly, C6 through S2's dependency on S1 | S1 |
| `api/tests/conftest.py` | Only things safe for every tree: the title convention helper. **It holds no fixture that touches a database and imports nothing from `app`** | S1 |
| `api/tests/unit/**` | The U rows. Each module imports the rules module at module level, so on the baseline pytest reports a collection error per module (1.2). **The unit tree needs no database and no application start-up**: it has no `conftest.py` fixtures and runs in C3 with no database setting in the environment | S1 |
| `api/tests/db/conftest.py`, `api/tests/db/**` | The D rows. A fixture reads `TEST_DATABASE_URL`, drops both tables and builds them through `app.db`; **it imports `app.db` inside the fixture, as its first statement**, so on the baseline each case errors at setup (1.2) | S1 |
| `api/tests/api/conftest.py`, `api/tests/api/**` | The I rows. Fixtures set `DATABASE_URL` from `TEST_DATABASE_URL`, drop the tables, enter `with TestClient(app)` (importing `app.main` inside the fixture, as the first statement), hold the seeded ids 1 to 3, provide the barrier helper for concurrent rows, a helper for the direct call into the application that delivers padded and doubled identity values, and the dump reader (it reads every value in every table without assuming which tables exist). It captures and reads no log | S2 |
| `harness/web/package.json`, `harness/web/package-lock.json`, `harness/web/vitest.config.js` | Vitest 2.1, jsdom 25, React Testing Library 16, user-event 14, jest-dom 6, `@playwright/test` 1.48; a configuration with one copy of React 18.3, jsdom, `VITE_API_BASE_URL=/api` and the JUnit reporter | S3 |
| `web/tests/component/**` | The C rows, with the fake server | S3 |
| `web/tests/browser/**`, `web/playwright.config.js` | The B rows; the configuration builds the production bundle, starts `vite preview`, uses Chromium only and writes `web/reports/browser.xml` and traces | S3 |
| `e2e/package.json`, `e2e/package-lock.json`, `e2e/playwright.config.js`, `e2e/**` specs | The J rows, including two browser contexts and the rewriting of a request's identity or body by `page.route`; one worker; JUnit to `e2e/reports/journey.xml`; trace and one screenshot per step | S4 |
| `harness/e2e/eval.env` | The six keys of the blueprint's settings table with local test values: `POSTGRES_USER=eval`, `POSTGRES_PASSWORD=eval-only`, `POSTGRES_DB=equipment`, `DATABASE_URL=postgresql+psycopg://eval:eval-only@db:5432/equipment`, `WEB_PORT=8080`, `VITE_API_BASE_URL=/api` | S4 |

The conftest rule that keeps the story order honest: a unit row needs only S1's `rules.py`, a D row only S1's `db.py`, and an I row S1 and S2. No fixture shared across the trees reaches a file of a later story.

---

## 8. Stories

### 8.1 The split, and who owns a frozen file

This plan adopts the blueprint's four-story split and its file ownership (blueprint 9.1), and adds an owner for the `harness/` folder, which the previous revision left in no story's list while it gated every pytest step.

**The rule for frozen files.** A frozen file (a test, a test configuration, a harness file) is written at the freeze, committed with the tests, and read-only to every builder, the owning story's builder included. "Owns" for such a file means that the story's steps are gated by it and that no other story may list it. It is assigned to the first story whose steps it gates, so that no story's tests depend on a file a later story creates: all frozen files exist at the freeze, and none is created by a story. `harness/api/**` gates every pytest step and goes to S1; S2 reads it through its dependency on S1. `harness/web/**` gates C and B and goes to S3. `harness/e2e/**` gates J and goes to S4.

| Story | Owns these files | Depends on | Tests it must turn green |
|---|---|---|---|
| S1 Database, rules and seed | `api/pyproject.toml`, `api/requirements.txt` (S2 does not own it, so it lists the whole API stack: FastAPI 0.115, Uvicorn 0.32, SQLAlchemy 2.0, psycopg 3.2), `api/app/__init__.py`, `api/app/db.py`, `api/app/rules.py`. Frozen, gating: `harness/api/**`, `api/tests/conftest.py`, `api/tests/unit/**`, `api/tests/db/**` | none | 17 tests. T-001: N6; T-003: P6 N3; T-004: P6 N6; T-005: N4; T-006: P6 N2; T-007: N6; T-008: N4 N7; T-009: P7 N10; T-010: P8 N4; T-011: P6 N5 |
| S2 API routes and start-up | `api/app/config.py`, `api/app/routes.py`, `api/app/main.py`. Frozen, gating: `api/tests/api/**` | S1 | 55 tests. T-001: P4 N3 N4 N7; T-003: P4 P7 N2; T-004: P5 P10 N5 N7; T-005: P1 N3 N6; T-006: P4 P5 N4 N7; T-007: N1 N2 N3 N4 N5 N9; T-008: P1 N1 N2 N3 N6 N8 N9 N10; T-009: P4 P8 N5 N7 N9 N12; T-010: P5 P6 P11 N6 N7 N8 N9; T-011: P5 N4 N7 N8; T-012: N8; T-016: P1 P2 N1 N2; T-017: N7 |
| S3 The whole web client | `web/package.json`, `web/package-lock.json`, `web/index.html`, `web/vite.config.js`, everything under `web/src/`. Frozen, gating: `harness/web/**`, `web/tests/component/**`, `web/tests/browser/**`, `web/playwright.config.js` | none for code (it builds against blueprint section 12 and mocks `fetch`) | 151 tests. T-001: P1 P2 P3 P6 P7 N1 N2 N5; T-002: P1 N1 N2 N3; T-003: P1 P2 P3 P8 N1 N4; T-004: P1 P2 P3 P4 P8 P9 N1 N2 N3 N8; T-005: N1 N2; T-006: P1 P2 P3 N1 N6; T-007: P1 P2 P3 N8; T-008: P2; T-009: P1 P2 P3 P6 P9 P10 P11 P12 N1 N2 N3 N4 N8 N11 N13 N14 N15; T-010: P1 P2 P3 P4 P9 P10 N1 N2 N3 N5; T-011: P1 P2 P3 P4 N1 N2 N3; T-012: P1 P2 P3 P4 P6 P8 P9 N1 N2 N3 N4 N6 N7 N9; T-013: P1 P2 P3 P5 P6 P7 P8 P9 P10 P11 P12 P13 P15 P16 P18 P20 P21 P23 P25 N1 N2 N3 N4 N6 N7 N8 N9 N10 N11 N12 N13 N14 N15; T-014: P1 P2 P3 P4 P5 P6 P8 P9 P10 P11 P12 N1; T-015: P1 P3 P4 P8 P9 P10 P11 P12 P13 P14 P15 N1; T-017: P1 P2 N1 N2 N5 N10 |
| S4 Compose and the journey | `docker-compose.yml`, `.env.example`, `.gitignore`, `api/Dockerfile`, `api/.dockerignore`, `web/Dockerfile`, `web/nginx.conf`, `web/.dockerignore`, `evidence/review/**` (the directory only: the two pre-review reports are written by the pre-reviewing agent and the two records by the user, never by the S4 builder; blueprint 4.1.3 and 9.1). Frozen, gating: `harness/e2e/**`, `e2e/**` | S2, S3 (S1 through S2) | 34 tests. T-001: P5 N8; T-003: P5 N5; T-004: P7 N9; T-005: N5 N7; T-006: P7; T-007: P4; T-008: N11 N12; T-009: P5; T-010: P7; T-011: P7 N9; T-012: P5 P7 N10; T-013: P14 P17 P19 P22 P24 N5; T-015: P5 P6 P7; T-016: P3 P4 N3; T-017: N3 N4 N9 |

Scope is disjoint: the four sets above share no file, and the shared folders `api/`, `web/` and `harness/` are split file by file or by subfolder (`harness/api` S1, `harness/web` S3, `harness/e2e` S4). Generated report folders (`api/reports/`, `web/reports/`, `e2e/reports/`) and the virtual environment `.eval-venv/` are git-ignored output owned by nobody. S3 owns every path under `web/` except the three files named under S4. The four review rows are S4's to turn green, but S4's builder cannot turn them green: they pass only on the user's record, which follows an agent pre-review that the S4 builder also does not run (1.5).

### 8.2 Dependency check

| Test group | Owner | Executes files created by | Latest story needed |
|---|---|---|---|
| U rows (`api/tests/unit`) | S1 | S1 (`rules.py`) | S1 |
| D rows (`api/tests/db`) | S1 | S1 (`db.py`) | S1 |
| I rows (`api/tests/api`) | S2 | S1, S2 | S2 |
| C rows (`web/tests/component`) and B rows (`web/tests/browser`) | S3 | S3 | S3 |
| J, production and the browser restraint rows (`e2e/`) | S4 | S1, S2, S3, S4 | S4 |
| Review rows | S4 | the merged candidate: S2, S3, S4 | S4 |
| Frozen harness (`harness/api`, `harness/web`, `harness/e2e`) | S1, S3, S4 | none: written at the freeze | n/a |

No row needs a file from a story later than its owner. The unit tree and the database tree of S1 use fixtures that touch no S2 file (7.4). The seed's tests (REQ-016.1 and .3) belong to S2 because the seed is observable only once start-up wires it (blueprint 9.2). Every row has exactly one owner story.

---

## 9. Gaps

### 9.1 Acceptance criteria with no test in section 3

**None.** Each of the 182 criteria appears in at least one test's Given / When / Then (5.1). Two kinds of coverage deserve a plain statement:

- REQ-015.4, REQ-015.5 and REQ-015.6 are covered by review rows only (T-015-P5, T-015-P6, T-015-P7), as D-17, D-27 and the blueprint's register require. No automated check backs them. Each review row is two steps, an agent pre-review and then the user's record, and passes on the user's record alone. Each can fail: it fails on `does not match`, on a missing or incomplete entry, and on a record that does not name a valid report for the candidate's hash (1.5; blueprint 4.1.3).
- Fourteen REQ-017 criteria have an automated part and a review part (T-017-N9), the review part being the same two steps. It cannot run before a candidate exists, and it fails, never passes by default, on a finding, a missing line, or a record that does not name a valid report for the candidate's hash.

### 9.2 What the tests do not observe

- The browser's drawing of a tooltip. The tests assert the `title` attribute (blueprint 4.1).
- REQ-016.2 as "a restart of the API and the database" together: only T-016-P4 restarts both. T-016-P2 restarts the application on the same database.
- Resistance to misuse. D-19 and NFR-5 accept the posture as unproven, so no row claims it.
- REQ-001.7 over HTTP for the padded and doubled values (a leading or trailing space, a tab, a line break, two identity headers). The wire does not deliver them (blueprint 5.1.1), so they are tested in the application (T-001-N6, T-001-N7) and the journey row T-001-N8 carries only the values the wire can carry. No test claims otherwise.
- The server's access log. It is operational, not a record (PRD section 4, D-23), and no row reads it.
- The exact millisecond of the 900 ms demo on a real stack. T-013-P14 waits for the indicator to appear and disappear; the 900 ms boundary is checked with the page's clock under the test's control (T-013-P13).

### 9.3 PRD points open, and silences the rows must not fill

**No PRD question is open, so no row waits on one.** N1 to N4 are closed: N1 (the Add loader) by D-20, N2 (a member's Borrow naming the admin) without a decision, N3 (what the demos do and for how long) by D-21, and N4 (an Add made from the Show empty list view) by D-26. They are carried by REQ-009.13, REQ-009.14, REQ-013.11 to REQ-013.22 and REQ-003.6 / REQ-005.4, and have rows in section 3.

One silence remains, recorded by the blueprint and not decided here:

- **GAP-1, the page around the API failure modal of a failed list fetch.** REQ-013.23 to REQ-013.26 (D-25) say that the modal appears with Close and Retry; that Close does not repeat the fetch and the list indicator is not shown again; that Retry repeats the fetch with the list indicator shown while it is in progress and then shows the list, or "No equipment yet" when there are no items; and that a second failure shows the modal again. **The PRD is silent on whether the list indicator is removed when the modal appears, on what the page shows behind the modal, and on what the page shows after Close** other than that the list indicator is not shown again. **No row asserts any of it.** The rows of REQ-013.23 to REQ-013.26 (T-013-P21, T-013-N14, T-013-P22, T-013-N15, T-013-P23, T-013-P24, T-013-P25) assert only what the PRD states: the modal and its two icons; the Access denied modal instead for a refused fetch; after Close, that the list indicator is not shown (the PRD's own words, REQ-013.24); during Retry, that the list indicator is shown and afterwards the list or the empty text; and after a second failure, the modal. None asserts the state of the list indicator while the modal is showing, nor what the page shows behind it or after Close. If the person-visible behaviour matters, the PRD must say it, and then the blueprint adds the pin and this plan adds the rows.

### 9.4 Blueprint behaviours with no requirement in the PRD

The rubric says a test that needs a requirement the PRD does not number is a gate-3 failure to be reported, not numbered here. No requirement was numbered. The orchestrator decides whether to amend the PRD or leave these unproven.

- The order of the blueprint's checks (identity, then permission, then validation, then existence, then state: blueprint 5.3). That a member's forced request is refused, rather than rejected, even when it would also be invalid or in the wrong state is visible to a person only as the Access denied modal against the API failure modal. T-007-P4 checks the five forced actions on valid requests; T-007-N9 checks that the same combined requests change nothing. The combined case through the modal is not separately tested, because it would need a stale second-context scenario the blueprint does not list.
- Input validation of the API beyond the PRD's criteria: an item id outside the valid range or not a number, unknown request fields, an Add body of the wrong shape, a Return of an item that is not On loan, a Mark of an item that is not Available, a Restore of an item that is not Out of service. They appear only inside the concurrency rows and as anchors; no row asserts them alone and no row asserts which code answers them.
- Start-up configuration: a missing or malformed `DATABASE_URL` stops the process with a message that names the setting and not its value (blueprint 6 and 12.4).
- Deployment hygiene: a non-root `api` container, `.env` git-ignored, `.env.example` placeholders only, the Compose health checks, and the set of services in the Compose file (T-017-N8 is retired, 4.2).
- Design defaults not asserted: focus moving to a modal's first button and Escape doing nothing (DD-19), no polling (DD-17), the list ordered by id (DD-18), a reload returning to the switcher (DD-08), the identity header's name and parsing pattern (blueprint 4.4), and whether, after a confirmed Add made from the Show empty list view, the client appends the item or reads the list again (DD-25; the rows observe the list the person sees). The failed list fetch is no longer a default: it is REQ-013.23 to REQ-013.26 (D-25).
- The blueprint's route set (the eight routes and nothing else) and the documentation and health paths it switches off. A build instruction; blueprint 4.4 says no test lists them.

### 9.5 Where the plan and the blueprint now agree, and the conflict that was settled

Revision 3 listed blueprint sentences that this plan said needed correcting. The blueprint has since been revised, and none of those sentences remains, so none is quoted here. What the blueprint now says, and where the plan relies on it:

- **Blueprint 4.1.1, "Confirmed, Refused, Rejected".** What a row may say about the class depends on what it drives. A row that drives the HTTP API (mechanism I) asserts only that the action was carried out or was not and that nothing changed, never recognises an outcome by its status code, as an instrument or otherwise, and never says which kind of refusal or rejection it was. A rules-level row (mechanism U) may state the class of decision the rules layer returned, "refuses" where the PRD's Refused applies and "rejects" where its Rejected applies, and asserts no code and no order of checks.
- **Blueprint 4.4, first bullet.** No acceptance test asserts a response code, as the thing verified or as an instrument. A row that drives the API asserts only that the action was carried out or was not; a rules-level row may state the class and asserts no code. The difference a person sees between a refusal and a rejection is asserted in the component, browser and journey rows.
- **Blueprint 12.3.1 and section 8.** The ledger's codes are the design's decisions, recorded and not verified; a row that drives the API asserts whether each request was carried out, and the final state.
- **Blueprint DD-24.** Test titles begin with the test ID, then the criterion labels, then a description, and the concurrency-pair tests that section 8 does not tie to a criterion carry `CONC` and the pair and no label (1.1, 5.3).
- **Blueprint 4.1.3, 12.8.1 and 10.2.** The two-step human reviews, the four-check placement of the inline validation message, and the reading of REQ-005.3 as an admin's request only are as 1.5, 1.1 and 1.1 carry them.

**The conflict that was settled.** In revision 3 the plan recorded a departure from the blueprint: the blueprint then let an API-level row recognise a class by the code, and the plan did not. The plan's own text was also not clean on the rules-level rows: it said that no API or rules-level row says which kind of refusal or rejection it was, while its unit rows said "refused" and "rejected" in the PRD's sense. The blueprint now settles both in the plan's favour: **a rules row may state the class, an integration row may not.** No integration row of this plan states a class, and every unit row that does state one uses the PRD's two words and no code (1.1).

Nothing in the blueprint is left for this plan to correct. The log stays unread (blueprint 4.4), and the attribution check NA and the kept-data check KD (blueprint 4.1.2) are used as written.

---

## 10. Untestable as written

Each criterion below cannot be checked exactly as the PRD states it. The PRD is not changed here and no definition is invented.

| Criterion | Why it cannot be checked as written | Wording that would make it testable | What this plan does |
|---|---|---|---|
| REQ-014.2 | The browser's drawing of a tooltip cannot be observed by automation | "Every icon button has a `title` attribute whose text names its action" | T-014-P2 asserts the attribute |
| REQ-001.3, REQ-017.1, .2, .8 to .12, .14 to .16, .18 | "Anywhere in the app" cannot be exhausted | "In each state of the interface listed in PRD section 2.3, for each of the three users" | The states are enumerated (T-001-N1, T-017-P1, T-017-P2) |
| REQ-017.13 | "Offered in the interface" is not defined | "The interface offers no link, frame, embedded content or form that leads to another service, and the page contacts no origin but its own" | Tested as written here (T-017-N5, T-017-N4) |
| REQ-017.19 | "Says that the app is a trial" is open-ended | "No text, title or label contains 'trial', 'mockup', 'sample data' or 'nothing is saved'" | That wording is tested (T-017-N10), plus the walk-through (T-017-N9) |
| REQ-004.10, REQ-006.7 | "Nothing the application keeps or can show names the person" is a universal over every stored and shown value | "In a loan the admin set and the same loan the member made, nothing the application keeps or can show differs except the item" (and the same for a return) | The comparison is tested (T-004-N5, T-006-N4); browser storage by T-017-N3 |
| REQ-005.2, REQ-008.1, REQ-016.2 | "After any sequence", "at no time" and "every committed change" are universal | "After the sequence named" (REQ-005.2); "after a confirmed Borrow the item has exactly one borrower, and after each of the twenty rounds of two simultaneous Borrows each item read back has at most one borrower and the contested item exactly one" (REQ-008.1); "for an added, a deleted, a status-changed and a borrowed item" (REQ-016.2) | A named sequence is used for REQ-005.2. For REQ-008.1 the labelled evidence is T-008-P1, T-008-N3 (twenty rounds of two simultaneous Borrows) and T-008-N7 (the store refuses an inconsistent item); no mixed sequence of actions and no check after the other concurrency tests is claimed. One change of each type is used for REQ-016.2 |
| REQ-008.4 | "At the same time" cannot be guaranteed | "When two Borrow requests are released together by a barrier, and in each serial order" | Both are used (T-008-N3) |
| REQ-009.14 | "Activating the Add icon does nothing" while the Add loader shows, yet REQ-009.13 says the loader replaces the Add icon, so there is no Add icon to activate | "While the Add loader is shown, pressing Enter does nothing, and the Add panel offers no Add icon to activate" | T-009-P12 asserts the replacement and T-009-N13 presses Enter |
| REQ-013.13 | "For 900ms" cannot be measured to the millisecond on a real stack without a wall-clock timer, which D-21 rules out | "The list indicator appears and then, with no action by the person, disappears and the real list returns" | T-013-P12 and T-013-P14 wait for the indicator to appear and disappear; the 900 ms boundary is checked in T-013-P13 with the page's clock under the test's control. Nothing sleeps |
| REQ-013.14 | "However long the person waits" is unbounded | "Ten minutes of the page's clock after Show empty list, the view is still showing" | T-013-N6 uses ten minutes of a clock the test controls |
| REQ-013.24 | "Does not repeat the fetch" asserts that a call was not made, which the rubric forbids a row to assert. The criterion states its own observable consequence: the list indicator is not shown again | "After Close the modal is closed and, with any second list request held, the list indicator is not shown" | T-013-N15 asserts that consequence, with a second list request held so that a repeat would show the indicator; it asserts nothing about a call, and nothing about the page behind the modal (GAP-1, 9.3) |
| REQ-007.1 to REQ-007.6 | "Forced attempt" is defined but how one is made is not | "A forced attempt is a direct request carrying a member's `X-User-Id`, or a legitimate action whose request header is rewritten to a member's id" | Both are used (1.3) |

---

## 11. Counts

Section 3 holds every test. Nothing is blocked. The counts below were checked against the file with a search that counts the table rows of section 3 by letter, by kind, by story and by state.

**Overall:** 257 tests: 134 positive and 123 negative. By kind: unit 136, integration 55, e2e 46, restraint 13, production 3, review 4. Expected before the build: 253 fail, 4 cannot run (the review rows T-015-P5, T-015-P6, T-015-P7 and T-017-N9), 0 pass. Nineteen tests carry no labelled criterion (5.2); 238 do. Revision 3 held 237 tests; this revision keeps all 237 IDs, retires none and adds 20 (4.5). All 182 criteria are covered (5.1); none is in the gaps.

Per requirement:

| Requirement | P | N | Total | unit | integration | e2e | restraint | production | review | fails | cannot run | passes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| REQ-001 | 7 | 8 | 15 | 8 | 4 | 2 | 1 | 0 | 0 | 15 | 0 | 0 |
| REQ-002 | 1 | 3 | 4 | 1 | 0 | 0 | 3 | 0 | 0 | 4 | 0 | 0 |
| REQ-003 | 8 | 5 | 13 | 8 | 3 | 2 | 0 | 0 | 0 | 13 | 0 | 0 |
| REQ-004 | 10 | 8 | 18 | 12 | 4 | 2 | 0 | 0 | 0 | 18 | 0 | 0 |
| REQ-005 | 1 | 7 | 8 | 3 | 3 | 2 | 0 | 0 | 0 | 8 | 0 | 0 |
| REQ-006 | 7 | 5 | 12 | 7 | 4 | 1 | 0 | 0 | 0 | 12 | 0 | 0 |
| REQ-007 | 4 | 8 | 12 | 5 | 6 | 1 | 0 | 0 | 0 | 12 | 0 | 0 |
| REQ-008 | 2 | 11 | 13 | 2 | 9 | 2 | 0 | 0 | 0 | 13 | 0 | 0 |
| REQ-009 | 12 | 14 | 26 | 17 | 6 | 3 | 0 | 0 | 0 | 26 | 0 | 0 |
| REQ-010 | 11 | 9 | 20 | 12 | 7 | 1 | 0 | 0 | 0 | 20 | 0 | 0 |
| REQ-011 | 7 | 8 | 15 | 9 | 4 | 2 | 0 | 0 | 0 | 15 | 0 | 0 |
| REQ-012 | 9 | 9 | 18 | 14 | 1 | 3 | 0 | 0 | 0 | 18 | 0 | 0 |
| REQ-013 | 24 | 15 | 39 | 30 | 0 | 9 | 0 | 0 | 0 | 39 | 0 | 0 |
| REQ-014 | 11 | 1 | 12 | 8 | 0 | 4 | 0 | 0 | 0 | 12 | 0 | 0 |
| REQ-015 | 14 | 1 | 15 | 0 | 0 | 12 | 0 | 0 | 3 | 12 | 3 | 0 |
| REQ-016 | 4 | 3 | 7 | 0 | 4 | 0 | 0 | 3 | 0 | 7 | 0 | 0 |
| REQ-017 | 2 | 8 | 10 | 0 | 0 | 0 | 9 | 0 | 1 | 9 | 1 | 0 |
| **Total** | **134** | **123** | **257** | **136** | **55** | **46** | **13** | **3** | **4** | **253** | **4** | **0** |

Per owner story:

| Owner story | Tests | unit | integration | e2e | restraint | production | review | fails | cannot run |
|---|---|---|---|---|---|---|---|---|---|
| S1 | 17 | 16 | 1 | 0 | 0 | 0 | 0 | 17 | 0 |
| S2 | 55 | 0 | 54 | 0 | 1 | 0 | 0 | 55 | 0 |
| S3 | 151 | 120 | 0 | 21 | 10 | 0 | 0 | 151 | 0 |
| S4 | 34 | 0 | 0 | 25 | 2 | 3 | 4 | 30 | 4 |
| **Total** | **257** | **136** | **55** | **46** | **13** | **3** | **4** | **253** | **4** |

Cross-check: the per-requirement total, the per-story total and the sum of the kinds each equal 257; the fails, cannot-run and passes columns sum to 257; the P and N columns sum to 257.

---

## 12. Drafter's self-check

This is the drafter's own check against the rubric's checker list, not the checker's verdict.

| Checker item | Result |
|---|---|
| Requirements missing a P or an N test | none; every requirement has a runnable P and a runnable N (REQ-015 and REQ-017 included) |
| Tests with no or an unknown requirement | none; 257 of 257 IDs carry a PRD requirement number |
| Criteria absent from both the tests and the gaps | none; 182 of 182 in 5.1, the nine of the third round (REQ-013.18 to REQ-013.26) included |
| Verification-register rows with no test or named review | none; every one of the 182 criteria has a test for each mechanism the register names (5.1), the register's browser rows for the placement of the inline validation message included (T-009-N14, T-009-N15, T-013-N10, T-013-N12), and the concurrency table is covered (5.3) |
| Tests with no owner story | none |
| Tests with no state-before-the-build value | none; 253 `fails`, 4 `cannot run`, each cell written out |
| Overlapping story scope | none (8.1), the `harness/` folder included |
| Tests depending on a later story's files | none (8.2) |
| Gaps section and untestable-as-written section present | yes (sections 9 and 10) |
| Mechanical checks run on this file | a search that counts the rows of section 3 by letter, by kind, by story and by state (257 rows, no cell of section 11 taken on trust); the 19 rows without a criterion; the bracket lists of section 3 read against the 182 criteria of 5.1; a search of section 3 for status-code numbers, "log", "schema" and "recorded"; a search of the integration rows for "refus" and "reject"; a search of the whole file for "by the Add field", "N4", "Allan Pasco" and "DD-12". Nothing was run that executes a test |

### Rubric rules, and what the plan could not satisfy

- **Test IDs from the PRD only.** Satisfied. No requirement ID was created or changed. Section 9.4 lists blueprint behaviours that would need a requirement; no test was written for them.
- **What a test may assert.** Satisfied in every Then, with four places that sit close to the line and are named so a reviewer can judge them. (1) T-017-N4 asserts that the page's requests go only to the stack's own address, because the rubric's restraint rule asks for "no network request to an origin the blueprint does not name"; it asserts nothing about which route or whether a given call was made, and its write-request half is asserted as "nothing changed". (2) The U rows state the class of decision the rules layer returned, "refuses" or "rejects" in the PRD's section 4 sense, which blueprint 4.1.1 now allows for a rules-level row; none names the type that carries the class, and none states a code. (3) "Confirmed" in an integration row is recognised by the caller being given the changed item; the plan states the outcome, not the code, so the integration rows cannot tell a refusal from a rejection, which blueprint 4.1.1 now requires of them, and that difference is asserted only in the C, B and J rows. (4) T-013-N15 and T-013-P23 observe a repeated list fetch only through its stated consequence, the list indicator, with a second request held; neither asserts whether a call was made, and neither asserts anything GAP-1 leaves open (9.3).
- **Freeze readiness.** Satisfied for every behaviour, name, locator and string the blueprint pins. Not fully satisfiable from the inputs: the seven items of section 2 (the place of the `harness/` folder, patch versions and hashes, the mechanics of one React copy, file names, the build environment, the wording of the blueprint's REQ-003.6 journey, and OP-3, how the agent pre-review sessions are started, handed the conversation trail, and whether they can drive the running build).
- **Commands.** Satisfied with assumptions. They were written but not run. The version lines of blueprint 12.10 were chosen without checking registries (OP-2) and the build environment is not stated (OP-1).
- **State before the build.** Satisfied for every row. No row is `passes:`, and `cannot run:` is used for the four review rows only. The baseline of the database and integration reports is a case per row erroring at setup, not a collection error (1.2).
- **Stories.** Satisfied. `harness/` now has owners (8.1). The review rows are owned by S4 and need S2 and S3.
- **Rows beyond the register's mechanism.** Seven API rows check, at the data level, a criterion whose register mechanism is C and J: T-003-P4, T-004-P5, T-005-P1, T-006-P4, T-006-P5, T-009-P4 and T-011-P5. Two rows exist because the rubric asks for a restraint test per surface: T-017-N3 and T-017-N4. Nine rows exist for blueprint section 8 pairs and carry `CONC` and the pair, with no label (T-006-N7, T-008-N8, T-008-N10, T-009-N12, T-010-N6 to T-010-N9 and T-011-N8). Four more rows exist for the register's browser mechanism of the placement and for the keyboard split (T-009-N14, T-009-N15, T-013-N10 and T-013-N12 carry the register's B rows; T-014-P12 is the split of T-014-P6). All are supporting rows or register rows; no criterion depends on one of the pair rows alone.
- **Restraint tests judge structure.** Satisfied, with one exception that is named: T-017-N10 and T-001-N1 search text for words, because REQ-017.19 and REQ-001.3 are about what the text says.
- **Retirement by judgment.** T-017-N8 (the Compose service list) was retired on the reading that it asserts a deployment tool's configuration. If the user reads REQ-017.13 as reaching the deployment, a row asserting no service beyond the stack's own would be new.
- **Review rows.** Satisfied in form: each of the four states the agent pre-review and what it is given (including the conversation trail), what the report must contain (the build it read, each gap traced to a criterion and a place in the trail or, where it cannot be traced, reported as its own labelled observation, and "What I could not judge"), what the user reads, what the user records, and a pass condition that is the user's record alone; each says plainly that the report is an input and that the agent's "found none" closes nothing; a record that does not name a valid report for the candidate's hash counts as not recorded. Not satisfiable before a candidate exists: all four are `cannot run`, and step 1 also waits on OP-3, which this plan does not answer. The reviewer is the user (D-27), a person other than the build's author; if the user had authored any part of the build the condition would fail, and nobody else may record the verdict in the user's place. The conversation trail is the single list of blueprint 4.1.3, which this plan refers to and does not restate; the documents on it are the preparation's own record and not a verbatim transcript, and their contents are the agent's input and not this plan's.

---

## 13. How the decisions of 20 October 2026 are carried

No question is open in the PRD, so no row waits on one. The blueprint's GAP-1 is a silence and not a question, and no row asserts what it leaves open (9.3).

**D-20, the Add loader** (a spinner in the Add panel replaces the Add icon; Enter and the icon inert while it shows). T-009-P12 asserts the replacement, T-009-N13 asserts Enter doing nothing, and T-009-P6, T-012-P6 and T-012-N6 assert the loader's presence and removal. None asserts anything else about where it sits.

**D-21, the state demos** (client-only; never calling the API or changing stored data; shown only after a user is picked; Show loading holds the list indicator for 900ms; Show empty list holds until the user changes or Show loading is activated; Retry in the demo failure modal only closes it). REQ-013.11 to REQ-013.17 are T-013-N3, T-013-N4, T-013-N5, T-013-P12 to T-013-P14, T-013-N6, T-013-P15, T-013-N7 and T-013-N8. The 900ms rows wait for the indicator to appear and disappear and never sleep.

**D-22, the three strings.** "Choose a user" is asserted in T-001-P6, the entry format in T-001-P7, "Name must be 100 characters or fewer." in T-009-P11.

**D-23, the access log carries the acting user id.** The log is operational and is not a record, so no row reads it. T-004-N5 and T-006-N4 read the data store and the answers only, and assert that nothing in them names the actor.

**D-24, the input-failure behaviours accepted as scope.** An admin's Borrow naming nobody or a non-member (REQ-004.11, REQ-004.12), an action on an item that is no longer there (REQ-012.16), and the Access denied modal for a missing, malformed or unknown identity (REQ-001.6 to REQ-001.8) keep the rows they had: T-004-N6 to T-004-N9, T-012-N8 to T-012-N10, T-001-N3, T-001-N4, T-001-N6 to T-001-N8. None of them is changed by this round.

**D-25, a failed list fetch.** REQ-013.23 to REQ-013.26 are T-013-P21, T-013-N14 and T-013-P22 (the modal, and the Access denied modal instead for a refused fetch), T-013-N15 (Close), T-013-P23 and T-013-P24 (Retry) and T-013-P25 (a second failure). What the PRD leaves silent is GAP-1 (9.3), and no row asserts it.

**D-26, an Add made from the Show empty list view.** REQ-013.18 to REQ-013.22 are T-013-P16 and T-013-P17 (the Add is made and kept), T-013-P18 and T-013-P19 (a confirmed Add ends the view; until then it stays), T-013-N9 and T-013-N10 (an empty or whitespace-only name), T-013-N11 and T-013-N12 (a name over 100 characters) and T-013-N13 with T-013-P20 (a failing Add, Close, and Retry). REQ-013.12 is checked with no Add made (T-013-N4, T-013-N5).

**D-27, the two-step human reviews.** T-015-P5, T-015-P6, T-015-P7 and T-017-N9 state the agent pre-review, what it is given, what the report must contain, what the user reads and records, and a pass condition that is the user's record alone (1.5). The report is an input and never a result a row asserts. The practical open point of step 1 is OP-3 (section 2, item 7).

Nothing in this plan waits on an answer.
