# Technical Blueprint: Shared Equipment Checkout (Trial)

Status: draft for review. Nothing is implemented and no command in this document has been run.
Every test, command and report named here is planned evidence.

Sources, and only these: the PRD as amended on 2026-10-20 and again for the third round
(`PRD.md`, REQ-001 to REQ-017, 182 labelled acceptance criteria, each stated as a business outcome),
the user's decisions of 2026-10-20 (`decisions-20261020.md`, cited D-01 to D-27), the preparation
orchestrator's rule for a criterion that a person verifies (`ORCHESTRATOR.md` section 4.1), the
earlier blueprint (`technical-rev41.md`, whose stack, layers, data model, HTTP contract, error
mapping, security controls, configuration and Compose decision are kept), and the mockup
(`mockup-rev14.html`, a cited source under D-17).

**No requirement ID originates in this document.** Every `REQ-nnn` and `REQ-nnn.m` below is the
label the PRD gave. Labels such as `DD-01` (design default), `SC-01` (status-code ledger entry),
`NA` and `KD` (shared checks), `R1` and `R2` (the two human reviews), `OP-1` (environment point) and
`GAP-1` (a silence in the PRD) name decisions, codes, checks, reviews, points and gaps of this
blueprint. They are not requirements.

**The technical work lives here, and the acceptance tests do not verify it.** The product owner
ruled that technical work belongs in the blueprint and that the acceptance tests verify business
outcomes. Status codes, schemas, module and file names, libraries, build tools, the log format,
header parsing and configuration are therefore decided and recorded in this document and in no
acceptance criterion. The PRD removed every status code from its criteria and left them as the
user's decisions (PRD section 2.4). **This document takes custody of them**: section 12.3.1 is the
ledger of every code, with the decision that chose it and the route that answers it, and section
10.1 lists the user's decisions. A register row may use the API or the database to observe a
business outcome; it never names a technical choice as the thing being verified (sections 4.1
and 4.4).

**The names in section 12 are part of the contract.** Acceptance tests are written and frozen
before any code exists, against those names. A builder may not change them. Everything not pinned
in section 12 is the builder's choice.

---

## 1. Profile and fit

- **Front end:** React 18 single-page application built with Vite, in JavaScript. No router, no
  global state library. Plain React state and the global `fetch`. Next.js is not used (D-18; no
  test and no criterion verifies this).
- **Back end:** FastAPI on Python 3.12, SQLAlchemy 2 and psycopg 3.
- **Database:** PostgreSQL 16.
- **Where it runs:** locally, under Docker Compose with three services: `db`, `api` and `web`
  (nginx serves the static build and proxies `/api` to `api`). No other deployment is in scope.

**Fit.** The product is one screen, three seeded users, one table of items and six server-call
actions. A plain React single-page application with local state is enough for that screen, and the
mockup is already a single page. FastAPI in front of PostgreSQL gives an HTTP boundary where the
role and state rules, the refusal and rejection answers of section 12.3.1 and the row-level lock
behind "exactly one active loan per item" (REQ-008) can be exercised directly, and a named Compose
volume gives the real stop-and-start that REQ-016 asks for.

## 2. Layers and dependency direction

Two layers, as in the earlier blueprint, plus one integration phase that owns no code of its own
beyond Compose and the journey.

```
web/   src/App.jsx  ->  src/api (fetch client)
         |  HTTP, JSON, /api, header X-User-Id            (the only link between the layers)
         v
api/   app/main.py  ->  app/routes.py  ->  app/rules.py  ->  app/db.py  ->  PostgreSQL
       (identity       (HTTP mapping)      (who may do        (models, session,
        middleware,                         what, which        locks, seed)
        start-up)                           transitions)
```

- `web` depends on `api` only through HTTP. It imports nothing from `api`.
- Inside `api`, dependencies point one way: `main` may import `routes`, `rules`, `db` and
  `config`; `routes` may import `rules`; `rules` may import `db`; `db` imports nothing else of the
  application. Nothing points back up.
- `rules` is the single place that decides who may do what and which state transitions are legal.
  `routes` only maps its outcomes to HTTP. The UI hides controls as a convenience; the server
  enforces every rule and never relies on the UI.
- The integration phase (Compose, journey, the two human reviews with their agent pre-reviews)
  depends on both layers and is depended on by nothing.

## 3. Requirements by layer or phase

Each requirement is placed once, by the layer that decides its rule. A criterion that is observed
in the other layer is verified there (section 4) and is listed per story in section 9; the
requirement itself is not repeated.

| Placement | Requirement | Why it sits there |
|---|---|---|
| API layer (`api/`) | REQ-005 | The server rejects an admin as borrower (SC-03); the UI mirror is verified in the web client |
| API layer (`api/`) | REQ-007 | The server's refusals decide it (SC-06, SC-08, SC-09); the modal (REQ-007.6 to REQ-007.8) is verified in the web client |
| API layer (`api/`) | REQ-008 | One active loan is decided by the row lock and the rejection of a Borrow on a non-Available item (SC-04) |
| API layer (`api/`) | REQ-016 | Seed, schema and the named volume; restart is exercised in the integration phase |
| Web layer (`web/`) | REQ-001 | Switcher and acting identity; REQ-001.6 to REQ-001.8 are verified in the API |
| Web layer (`web/`) | REQ-002 | Rows show name and status |
| Web layer (`web/`) | REQ-003 | Member Borrow; REQ-003.6 is verified in the API |
| Web layer (`web/`) | REQ-004 | Admin Borrow and the borrower modal; the rejection of a Borrow that names no borrower or a non-member (REQ-004.11, REQ-004.12, SC-12) is decided in the API and verified there and in the web client |
| Web layer (`web/`) | REQ-006 | Return controls and the loader |
| Web layer (`web/`) | REQ-009 | Add field, Enter, inline validation, the Add loader |
| Web layer (`web/`) | REQ-010 | Mark out of service and Restore controls |
| Web layer (`web/`) | REQ-011 | Delete x and the confirm modal |
| Web layer (`web/`) | REQ-012 | Loader, list changes after confirmation, failure modal, Retry; the item that is no longer there (REQ-012.16, SC-10) is decided in the API and shown by the client |
| Web layer (`web/`) | REQ-013 | Loading, Empty, the failed list fetch with its modal and Retry (D-25), the state demos, and an Add made from the Show empty list view (D-26) |
| Web layer (`web/`) | REQ-014 | Icon buttons, tooltips, labels, dialog role, keyboard |
| Web layer (`web/`) | REQ-015 | Uniform rows and the Apple-style look |
| Integration phase (S4) | REQ-017 | It constrains the combined build: the control inventory, what the application keeps, and the user's walk-through of the whole interface after an agent pre-review |

Check: REQ-001 to REQ-017 are seventeen requirements. API layer holds four (005, 007, 008, 016),
web layer holds twelve (001, 002, 003, 004, 006, 009, 010, 011, 012, 013, 014, 015), the
integration phase holds one (017). None is missing and none appears twice.

## 4. Verification register

One row per acceptance criterion: 182 rows, REQ-001.1 to REQ-017.19. The criterion text is the
PRD's; the short label in the first column only helps the reader find it. What a row asserts is its
Mechanism cell, never the label.

### 4.1 Mechanisms, how a row is read, and the evidence each produces

**Test titles (DD-24).** Every automated test begins its title with the test ID that the eval plan
gives it, then the criterion labels it serves, then a description: `<test ID> REQ-008.4 REQ-008.8
two simultaneous borrows`. The labels are the run of `REQ-nnn.m` tokens that follows the test ID; a
label mentioned later in the description is a cross-reference and is not read as a label. A test
that serves no criterion by itself, such as the tests of the concurrency pairs that section 8 does
not tie to a criterion, carries the test ID, then `CONC` and the pair, and no label. **The evidence
of an automated row is the passing test case whose title carries that label in the named report.**
In the register, "case REQ-nnn.m" means that case. A criterion with no passing case in its report
is unverified. "The agent confirms it" is never evidence.

| Code | Mechanism | Runs in | Evidence artifact |
|---|---|---|---|
| U | pytest, pure decision functions of `app.rules`, no database, no HTTP | S1 | `api/reports/unit.xml` (JUnit) |
| D | pytest against real PostgreSQL 16 (`TEST_DATABASE_URL`): writes a state directly to the store and reads back what the store holds | S1 | `api/reports/db.xml` (JUnit) |
| I | pytest with `TestClient` on `app.main:app` against real PostgreSQL 16, including threaded concurrency tests, a direct ASGI call for header values that no HTTP parser would deliver (section 5.1.1), and a dump of everything the database holds (the checks NA and KD below) | S2 | `api/reports/integration.xml` (JUnit) |
| C | Vitest with React Testing Library and jsdom, global `fetch` replaced by a mocked server (an in-memory data set that answers as section 12.3 says and acts for the identity it is sent), rendering `src/App.jsx`; a fake clock where a criterion names a duration | S3 | `web/reports/component.xml` (JUnit) |
| B | Playwright with Chromium against the production build served by `vite preview`, the API mocked with `page.route`; measures computed styles, geometry and keyboard behaviour | S3 | `web/reports/browser.xml` (JUnit) and Playwright traces |
| J | Playwright with Chromium against the running Compose stack (real API, real database). It includes a real stop and start of the `api` and `db` services; **forced attempts**, made by rewriting or aborting the outgoing request (its identity header or its body) with `page.route`; and **two browser contexts** on the same stack, so that one session can act while the other still shows an older list | S4 | `e2e/reports/journey.xml` (JUnit), trace and one screenshot per step |
| R1 | **Mockup comparison review** (PRD section 4), in the two steps of D-27 (section 4.1.3). Step 1, the **agent pre-review**: an agent in a session started for that task, never the agent that built the candidate, compares the build with `mockup-rev14.html` in the same screen state, with the conversation trail among its inputs, and reports the gaps it found. Step 2, the **user's review**: the user reads that report alongside the build and the mockup, side by side in the same screen state, and records, per quality, `matches` or `does not match`. No numeric threshold. The register points at step 2. Pass condition in section 4.1.3 | S4 | Step 2, which is the evidence of the row: `evidence/review/mockup-comparison.md`. Step 1, an input to it and never the evidence: `evidence/review/mockup-comparison-prereview.md` |
| R2 | **Non-goal walk-through** (PRD section 4), in the two steps of D-27 (section 4.1.3). Step 1, the **agent pre-review**: an agent in a session started for that task, never the agent that built the candidate, examines the build against the fourteen criteria the walk-through judges, with the conversation trail among its inputs, and reports the gaps it found. Step 2, the **user's review**: the user reads that report alongside the build, goes through the interface as Ada Admin and as Mia Member once for each non-goal, and records `found none` or the finding. The register points at step 2. Pass condition in section 4.1.3 | S4 | Step 2, which is the evidence of the row: `evidence/review/non-goal-walkthrough.md`. Step 1, an input to it and never the evidence: `evidence/review/non-goal-walkthrough-prereview.md` |

#### 4.1.1 How a row is read

- **The verified thing is the business outcome of the criterion**: what a person sees, is shown or
  is refused, and what the application keeps. A mechanism may use a technical surface as its
  instrument: the API's answers, a read of the list, a dump of the database, a `data-testid`, a
  computed style, an attribute. It never names a technical choice (a code, a schema, a name, a log
  line, a library) as the thing verified.
- **Nothing changes** is observed by reading the list (every item's name, status and borrower)
  before and after, through the API in I and from the mocked server's data in C.
- **Confirmed, Refused, Rejected** are the PRD's outcome classes (PRD section 4). What a row may say
  about the class depends on what the row drives, because the two layers carry the class
  differently: the HTTP API carries it in a code, and the rules layer carries it in the decision
  itself.
  - **A row that drives the HTTP API (mechanism I) asserts only** that the action was carried out
    or was not, and that nothing changed: "confirmed" is the back-end having carried the action
    out and reported success; "not confirmed" is the action not carried out, with a read-back
    showing the list exactly as before. Such a row never recognises an outcome by its status code,
    as an instrument or otherwise, and never says which kind of refusal or rejection it was,
    because the class of an HTTP answer is carried by a code, and the codes are technical choices.
  - **A rules-level row (mechanism U) may state the class of decision the rules layer returned.**
    The rules layer is a pure function whose output is the decision, with no HTTP involved, so
    "the rules decision refuses this request" or "the rules decision rejects this request" is a
    business fact at the layer that makes it. The PRD owns both words and ties each to a different
    modal: a request is refused when there is no usable acting identity or the acting role may not
    make it, and the Access denied modal shows; it is rejected when it cannot happen for any other
    reason, and the API failure modal shows. A U row says "refuses" where the PRD's Refused applies
    and "rejects" where its Rejected applies, and never the other way round. The instrument that
    shows the class is the kind of outcome the rules layer returns (section 12.5: `IdentityError`
    and `Forbidden` are refusals; `NotFound`, `Conflict` and `Invalid` are rejections); what the row
    verifies is the class, refused or rejected, and never the name of the type that carries it or a
    status code, which the rules layer does not know. A U row also never asserts that a function
    was or was not called, or that checks ran in a given order: the order of checks (section 5.3)
    is a technical choice, and what a person sees of it is the outcome.
  - The status codes are the user's and the drafter's decisions, recorded in the ledger (section
    12.3.1) and the route table (section 12.3); no acceptance test asserts any of them. The
    difference a person experiences between a refusal and a rejection (the Access denied modal for
    a refusal, the API failure modal for any other failure) is asserted in the component (C),
    browser (B) and journey (J) rows, where it is observable. Where a row says "a mocked refusal"
    or "a mocked rejection", the C test chooses the answer the mocked server gives as a stimulus
    (for a rejection, answers of several kinds: a conflict, a missing item, a server error and a
    request that never reaches the server) and asserts the modal that appears and that nothing
    changed, never the answer chosen.
- **What the real server's answer does to the page is verified in J.** The unit and integration
  tests show that the server does not carry out a refused or rejected request and that nothing
  changes. The component tests show which modal the page opens for a mocked answer of each class.
  That the real server's answer produces the right modal is verified only in J, by the forced
  attempts and the two-context scenarios of the rows below.
- A tooltip is the HTML `title` attribute, as in the mockup. The tests assert the attribute. The
  browser's drawing of the tooltip is not observed.
- Rows R1 and R2 are judged by a person, as D-17 requires, after an agent pre-review, as D-27
  requires (section 4.1.3). No automated test stands in for either step, and the pre-review's
  report is never the evidence of a row.
- The automated rows do not claim that the application resists misuse (D-19, NFR-5).

#### 4.1.2 Two shared checks on what the application keeps

Both run in S2 against the database and the API, after the actions named in the row. Neither names
a table or a column: they discover the tables and columns from the database's own catalogue and
read the answers of every route.

- **NA, the attribution check** (REQ-004.10, REQ-006.7; D-09, and the PRD's definition of Record:
  what the application keeps about the equipment, the loans and the users, and can show). Two items
  with the same name are brought to the same end state by two routes, so that any trace of who
  acted shows as a difference. *Loan:* item P is borrowed by Mia for herself; item Q is given to
  Mia by Ada. *Return:* item R, on loan to Mia, is returned by Mia; item T, on loan to Mia, is
  returned by Ada. The check then requires that (a) in a dump of every row of every table the
  application's database holds, the rows of P and Q are equal except for the item id, the rows of
  R and T likewise, and nothing else differs; (b) in the answers of every route, read as Ada, as
  Mia and as Sam, the entries for P and Q are equal except for the item id, and likewise R and T;
  (c) the name "Ada Admin" occurs in the dump and in the answers only as the name of the user Ada
  Admin. **The operational log is outside the check**: it is not a record (PRD section 4; D-23), it
  carries the acting user id by the user's decision, and no test reads it.
- **KD, the kept-data check** (REQ-017.3 to REQ-017.6: no record is kept to drive a reminder or a
  notification, no due date is set, no loan history exists). After a sequence that adds, borrows,
  returns, marks, restores and deletes, the check requires that (a) every value in the dump and
  every field of every answer is one of: an item's id, name, status or borrower, or a user's id,
  name or role, so that any other value (a date, a time, an address, a note) fails; and (b) a
  Borrow followed by its Return, and a Mark followed by its Restore, leave the dump exactly as it
  was before, so that no history of a loan is kept.

#### 4.1.3 The two human reviews: two steps, three limits, and the pass conditions

A criterion that a test cannot decide is verified in two steps, in this order (D-27; the PRD's
definitions of Human review, Agent pre-review, Conversation trail, Gap and Pre-review report;
`ORCHESTRATOR.md` section 4.1). The criteria's own wording is unchanged: REQ-015.4 to REQ-015.6 say
the reviewer "finds that the build ... matches the mockup", and the REQ-017 flow says the user
"finds no screen, control or message" (PRD clause). The content of the reports and records is
decided here (DD-15).

**Step 1, the agent pre-review.**

- **Who runs it.** An agent in a session started for that task. **It is never the agent that built
  the candidate.** The report names the session it ran in, so that the user can see that it is not
  the session that built the candidate.
- **What it is given.** The candidate (the combined candidate of section 9.2, by its commit hash);
  the criteria the review judges (for R1, REQ-015.4 to REQ-015.6 and `mockup-rev14.html`; for R2,
  the fourteen criteria of the R2 record below and the non-goals of PRD section 7); and **the whole
  conversation trail**. In this project the trail is exactly this list:
  - the confirmed scope with its citations: `inputs/prd-rev14.md`, restated in PRD section 2.1;
  - every question put to the user and its recorded answer: the preparation state file
    (`PREPARATION-STATE.md`) and, for the rounds of 2026-10-20, `inputs/decisions-20261020.md`,
    restated in PRD section 8;
  - every decision and who decided it: `inputs/decisions-20261020.md` (D-01 to D-27), restated in
    PRD section 2.4, and section 10 of this blueprint for the decisions it records and their
    deciders;
  - every change round: the preparation state file, restated in PRD section 9.

  These documents are the preparation's own record of the conversation and not a verbatim
  transcript (PRD section 9). Whether more than that can be made available, and how the trail is
  handed to the agent, is OP-3.
- **What it reports.** The gaps it found, where a gap is a place where the build differs from what
  a criterion under review, read together with the trail, calls for. Each gap is traced to **the
  criterion it bears on** (the PRD's label) and to **the place in the trail the expectation came
  from** (for example a decision number, a citation tag or a PRD section), and says where in the
  build the difference shows. **A gap the agent cannot trace** to a criterion or to a place in the
  trail is not dropped, and it is given no invented trace: it is reported as its own observation
  and labelled as such.
- **What its report records.** Which build it read (the candidate's commit hash), when (date and
  time), what it was given (each input above, named) and the session it ran in; and a section
  **"What I could not judge"**, which is always present. A report that says only that it found
  nothing, or that has no such section, is incomplete, and the user's record cannot name it as the
  report it read (below).
- **It gives no verdict.** The report does not use the tokens of step 2 (`matches`, `does not
  match`, `found none`) as a verdict on any criterion.
- **Where it is kept.** `evidence/review/mockup-comparison-prereview.md` and
  `evidence/review/non-goal-walkthrough-prereview.md`. The directory is S4's (section 9.1), but each
  report is written by the pre-reviewing agent and never by the build-side agent that owns S4.

**Step 2, the user's review.** The user reads the pre-review report alongside the build and records
the verdict. This record, and nothing else, is what the register points at and is the evidence that
closes the row. The report is an input to it and is never that evidence.

**The three limits** hold for both reviews, and every review row stands under them.

1. **The report is evidence for the user and never an approval.** The approval is the user's, and
   only the user's (D-27).
2. **The report can neither pass nor fail a criterion.** A criterion passes or fails on the user's
   record alone. A gap in a report fails nothing, and a report that lists no gap passes nothing.
   (That the record must name its report is a condition on how the review was done, below. It does
   not let the report's content decide anything.)
3. **"Found none" is not clearance.** The user may find what the agent missed, and the report must
   say plainly what it could not judge rather than imply that it checked everything. That is the
   always-present section of the report, and it is why the user reads the build too.

**The user's records and their pass conditions.** A review row can fail.

- **R1, `evidence/review/mockup-comparison.md`.** The record opens with one line naming the
  pre-review report the user read: its path, and the candidate commit hash that the report records.
  It then holds one entry for each of the three qualities (REQ-015.4 top bar translucent,
  REQ-015.5 corner rounding of cards, REQ-015.6 shadows of cards). Each entry holds the token
  `matches` or `does not match`, a screenshot of the build and a screenshot of the mockup in the
  same screen state, the user's name, the date and the candidate commit hash. **The candidate fails
  the criterion of any entry that reads `does not match`.** An entry that is missing, has any other
  token, lacks a screenshot, a name or a date, or carries a hash that is not the candidate's,
  counts as not recorded, and a criterion that is not recorded is not verified: it fails, it does
  not pass by default. If the opening line is missing, or names a report that records another
  hash than the candidate's or lacks the section "What I could not judge", no entry counts as
  recorded: the review was not done in the two steps, so no criterion of the record is verified,
  and each fails as an unrecorded entry does. That is a fault in how the review was done and not a
  verdict of the report (limit 2).
- **R2, `evidence/review/non-goal-walkthrough.md`.** The record opens with the same line. It then
  holds one line for each of REQ-017.2 to REQ-017.6, REQ-017.8 to REQ-017.11, REQ-017.13 to
  REQ-017.16 and REQ-017.19 (fourteen lines), each reading `found none` or describing the finding,
  the screens visited as Ada Admin and as Mia Member, the user's name, the date and the candidate
  commit hash. **The candidate fails the criterion of any line that describes a finding.** A missing
  line, name, date or hash is not recorded and fails in the same way, and so does a record whose
  opening line is missing or invalid as for R1.
- **The reviewer is the user (D-27).** DD-12 named Allan Pasco as reviewer as the drafter's own
  default, because the PRD then required only "a person other than the author of the build". D-27
  supersedes it: the user reads the report and records the verdict, and the approval is the user's,
  and only the user's. **The independence condition is kept.** Step 1 is an agent that did not build
  the candidate. Step 2 is the user, who is a person other than the author of the build (PRD
  section 4, Mockup comparison review; this blueprint applies the condition to both reviews). The
  author of the build is the build side, the owners of section 9.1, and not the user. If the user
  had authored any part of the build the condition would fail, and nobody else may record the
  verdict in the user's place (D-27), so the rows would stay unverified until the user, or a PRD
  change request, settles it. The records keep the same shape.

### 4.2 The register

**REQ-001 Switch the acting user**

| Criterion | Mechanism | Evidence it produces |
|---|---|---|
| REQ-001.1 three users listed | C (S3): the switcher offers the three entries and no other; J (S4): the entries are the users the real application holds (compared with its user listing) | `component.xml` and `journey.xml`, case REQ-001.1 |
| REQ-001.2 role in each entry | C (S3) | `component.xml`, case REQ-001.2 |
| REQ-001.3 no password, sign-in or sign-up | C (S3): no `input[type=password]` and no sign-in or sign-up text in any state | `component.xml`, case REQ-001.3 |
| REQ-001.4 Mia's Borrow reads "On loan – Mia Member" | C (S3); J (S4) | `component.xml` and `journey.xml`, case REQ-001.4 |
| REQ-001.5 next action is made as the newly picked user | C (S3): the mocked server acts for the identity it is sent; after Ada and then Mia are picked, Mia's Borrow reads "On loan – Mia Member" and the Add field is gone | `component.xml`, case REQ-001.5 |
| REQ-001.6 no identity: refused, nothing returned, nothing changes | I (S2): every route of section 12.3 and one path the application does not define, each sent with GET, POST, PUT, DELETE and OPTIONS and no identity: the request is not carried out, the answer carries no content, and a read-back of the users and the equipment as Ada is unchanged (the Access denied modal that a person sees is asserted in J, next); J (S4): through the real stack, with the identity removed from a request the page makes (the list fetch, and one action), the Access denied modal appears, the API failure modal does not, and the list is unchanged | `integration.xml` and `journey.xml`, case REQ-001.6 |
| REQ-001.7 malformed identity: refused, nothing returned, nothing changes | U (S1): the identity parsing refuses every value of the malformed set of section 5.1.1; I (S2): every route with each value of the set, delivered in-process (padded and doubled values by a direct ASGI call): the request is not carried out, the answer carries no content, state unchanged (the Access denied modal that a person sees is asserted in J, next); J (S4): the values of the set that the wire can deliver (section 5.1.1), set on a request the page makes through the real stack: the Access denied modal appears, the API failure modal does not, and the list is unchanged | `unit.xml`, `integration.xml` and `journey.xml`, case REQ-001.7 |
| REQ-001.8 unknown identity: refused, nothing returned, nothing changes | I (S2): every route with well-formed identities that are not among the three (for example 4 and 999999999): the request is not carried out, the answer carries no content, state unchanged (the Access denied modal that a person sees is asserted in J, next); J (S4): the identity of a request the page makes rewritten to 4: the Access denied modal appears, the API failure modal does not, and the list is unchanged | `integration.xml` and `journey.xml`, case REQ-001.8 |
| REQ-001.9 no list before a user is picked | C (S3): before a pick the page shows the switcher, with no list indicator, no row and no empty text | `component.xml`, case REQ-001.9 |
| REQ-001.10 placeholder "Choose a user" before a pick | C (S3): before a pick the switcher shows `switcher-placeholder` reading "Choose a user" | `component.xml`, case REQ-001.10 |
| REQ-001.11 entry reads name and role in parentheses | C (S3): `switcher-option-1`, `-2`, `-3` read exactly "Ada Admin (admin)", "Mia Member (member)", "Sam Member (member)" | `component.xml`, case REQ-001.11 |

**REQ-002 Name and status on every row**

| Criterion | Mechanism | Evidence it produces |
|---|---|---|
| REQ-002.1 every row shows the name | C (S3) | `component.xml`, case REQ-002.1 |
| REQ-002.2 exactly one status per row | C (S3): `row-status` appears once per row with one of the three texts | `component.xml`, case REQ-002.2 |
| REQ-002.3 On loan row names the borrower | C (S3) | `component.xml`, case REQ-002.3 |
| REQ-002.4 no Details button or screen | C (S3): the control inventory of REQ-017.18 holds and no row is a link or opens a view | `component.xml`, case REQ-002.4 |
| REQ-002.5 no green "Borrowed" header | C (S3): no element reading "Borrowed" in any state | `component.xml`, case REQ-002.5 |

**REQ-003 Member borrows for themselves**

| Criterion | Mechanism | Evidence it produces |
|---|---|---|
| REQ-003.1 Borrow on every Available row | C (S3) | `component.xml`, case REQ-003.1 |
| REQ-003.2 no modal, no borrower selection | C (S3) | `component.xml`, case REQ-003.2 |
| REQ-003.3 request sent at once, row loader shown | C (S3): the mocked server receives the Borrow on activation, with no further step, and `row-loader` is present until it answers | `component.xml`, case REQ-003.3 |
| REQ-003.4 reads "On loan – <acting member>" once confirmed | C (S3); J (S4) | `component.xml` and `journey.xml`, case REQ-003.4 |
| REQ-003.5 no way to name another borrower | C (S3): a member's page has no member button, no select other than the switcher, no borrower input | `component.xml`, case REQ-003.5 |
| REQ-003.6 forced Borrow naming another borrower: refused, unchanged, Access denied modal | U (S1): the borrower decision refuses a member who names anyone but themselves, whether another member, the admin or an unknown id; I (S2): a member's Borrow that names another member, the admin or an unknown id is not carried out, item unchanged on read-back (the Access denied modal that a person sees is asserted in C and J, next); C (S3): a mocked refusal on a member's Borrow shows the Access denied modal and the row is unchanged; J (S4): forced through the real stack (Ada chooses Mia, the identity is rewritten to Sam; the body is rewritten to name Ada): the Access denied modal appears and the item is unchanged | `unit.xml`, `integration.xml`, `component.xml` and `journey.xml`, case REQ-003.6 |
| REQ-003.7 Borrow on every Available row for a member who holds items | C (S3) | `component.xml`, case REQ-003.7 |
| REQ-003.8 a member can keep borrowing, no limit | I (S2): one member borrows five items in turn, each confirmed, all On loan to that member; C (S3) the row reads as REQ-003.4 | `integration.xml` and `component.xml`, case REQ-003.8 |

**REQ-004 Admin borrows on behalf of a member**

| Criterion | Mechanism | Evidence it produces |
|---|---|---|
| REQ-004.1 borrower modal opens before any request | C (S3): the mocked server has received no request for the Borrow when the modal opens | `component.xml`, case REQ-004.1 |
| REQ-004.2 modal lists members only | C (S3): exactly `member-button-2` and `member-button-3` | `component.xml`, case REQ-004.2 |
| REQ-004.3 admin never listed | C (S3): no `member-button-1` | `component.xml`, case REQ-004.3 |
| REQ-004.4 Close sends nothing, changes nothing | C (S3) | `component.xml`, case REQ-004.4 |
| REQ-004.5 choosing a member starts the borrow, row loader | C (S3) | `component.xml`, case REQ-004.5 |
| REQ-004.6 reads "On loan – <chosen member>" once confirmed | C (S3); J (S4) | `component.xml` and `journey.xml`, case REQ-004.6 |
| REQ-004.7 member who holds items is listed as any other | C (S3) | `component.xml`, case REQ-004.7 |
| REQ-004.8 choosing such a member borrows as REQ-004.5/.6 | C (S3); I (S2) admin borrows a second item for the same member, confirmed | `component.xml` and `integration.xml`, case REQ-004.8 |
| REQ-004.9 nothing in the interface shows the admin set it | C (S3): after the loan, no text, `title`, `aria-label` or modal in the row or page names "Ada Admin" as setter; J (S4) repeats it in the real stack | `component.xml` and `journey.xml`, case REQ-004.9 |
| REQ-004.10 no record names the admin as setter | I (S2): the attribution check NA of section 4.1.2 (loan case): nothing the application keeps or can show differs between a loan the admin set and the same loan the member made, and the admin's name appears only as the admin user. The operational log is outside the check | `integration.xml`, case REQ-004.10 |
| REQ-004.11 admin's Borrow naming no borrower: does not happen, unchanged, failure modal | U (S1): the borrower decision rejects an admin's request that names nobody; I (S2): an admin's Borrow with no body, with an empty object and with a null borrower is not carried out, item unchanged on read-back (the API failure modal that a person sees is asserted in C and J, next); C (S3): a mocked rejection on an admin's Borrow, after a member is chosen, shows the API failure modal and the row is unchanged; J (S4): the body of the request the page sends after Ada chooses Mia is rewritten to name nobody: the API failure modal appears and the item is unchanged | `unit.xml`, `integration.xml`, `component.xml` and `journey.xml`, case REQ-004.11 |
| REQ-004.12 admin's Borrow naming a non-member: does not happen, unchanged, failure modal | U (S1): the borrower decision rejects an admin's request that names a user who is not a seeded member; I (S2): an admin's Borrow naming 4 and 999999999 is not carried out, item unchanged on read-back (the API failure modal that a person sees is asserted in C and J, next); C (S3): as REQ-004.11; J (S4): the body is rewritten to name 4: the API failure modal appears and the item is unchanged. Naming the admin is REQ-005.4 | `unit.xml`, `integration.xml`, `component.xml` and `journey.xml`, case REQ-004.12 |

**REQ-005 Admins cannot borrow for themselves**

| Criterion | Mechanism | Evidence it produces |
|---|---|---|
| REQ-005.1 modal never offers the admin | C (S3), same observation as REQ-004.3 | `component.xml`, case REQ-005.1 |
| REQ-005.2 no row ever reads "On loan – Ada Admin" | C (S3) after every admin action against mocks; J (S4) scans every step of the journey | `component.xml` and `journey.xml`, case REQ-005.2 |
| REQ-005.3 a Borrow naming an admin does not happen, unchanged | U (S1): the borrower decision rejects an admin's request that names an admin; I (S2): an admin's Borrow that names the admin is not carried out, item unchanged on read-back. A member's Borrow that names the admin is not verified in this row: the PRD covers it under REQ-003.6, as a refusal (the notes under REQ-003 and REQ-005), and the REQ-003.6 row verifies it, so it is verified once | `unit.xml` and `integration.xml`, case REQ-005.3 |
| REQ-005.4 an admin naming an admin: rejected, unchanged, failure modal | U (S1): the borrower decision rejects an admin's request that names an admin; I (S2): an admin naming the admin is not carried out, item unchanged (the API failure modal that a person sees is asserted in J, next); J (S4): the body of the request the page sends after Ada chooses Mia is rewritten to name Ada: the API failure modal appears and the item is unchanged | `unit.xml`, `integration.xml` and `journey.xml`, case REQ-005.4 |

**REQ-006 Return a loaned item**

| Criterion | Mechanism | Evidence it produces |
|---|---|---|
| REQ-006.1 member sees Return on own loans | C (S3) | `component.xml`, case REQ-006.1 |
| REQ-006.2 admin sees Return on every On loan row | C (S3), including a loan set by the admin | `component.xml`, case REQ-006.2 |
| REQ-006.3 other members see no action | C (S3): that row has no button | `component.xml`, case REQ-006.3 |
| REQ-006.4 row loader until confirmed | C (S3) | `component.xml`, case REQ-006.4 |
| REQ-006.5 reads Available once confirmed | C (S3); J (S4) | `component.xml` and `journey.xml`, case REQ-006.5 |
| REQ-006.6 nothing shows who returned it | C (S3): after an admin's return, no text, `title`, `aria-label` or modal names the admin; J (S4) | `component.xml` and `journey.xml`, case REQ-006.6 |
| REQ-006.7 no record names who returned it | I (S2): the attribution check NA of section 4.1.2 (return case): nothing the application keeps or can show differs between a loan the admin returned and the same loan the borrower returned. The operational log is outside the check | `integration.xml`, case REQ-006.7 |

**REQ-007 Refuse unauthorized actions with the Access denied modal**

| Criterion | Mechanism | Evidence it produces |
|---|---|---|
| REQ-007.1 member's forced return of another's loan: refused, still on loan | U (S1): the return decision refuses a member who is not the borrower; I (S2): not carried out, the item still On loan to its borrower on read-back. The modal is REQ-007.6 | `unit.xml` and `integration.xml`, case REQ-007.1 |
| REQ-007.2 member's forced delete: refused, item remains | U (S1): the delete decision as a member; I (S2): not carried out, the item still listed on read-back. The modal is REQ-007.6 | `unit.xml` and `integration.xml`, case REQ-007.2 |
| REQ-007.3 member's forced add: refused, no item created | U (S1); I (S2): not carried out, the list unchanged on read-back. The modal is REQ-007.6 | `unit.xml` and `integration.xml`, case REQ-007.3 |
| REQ-007.4 member's forced mark out of service: refused, unchanged | U (S1); I (S2): not carried out, the item's status unchanged on read-back. The modal is REQ-007.6 | `unit.xml` and `integration.xml`, case REQ-007.4 |
| REQ-007.5 member's forced restore: refused, unchanged | U (S1); I (S2): not carried out, the item's status unchanged on read-back. The modal is REQ-007.6 | `unit.xml` and `integration.xml`, case REQ-007.5 |
| REQ-007.6 Access denied modal with "You do not have permission" for each refusal | C (S3): a mocked refusal on each of the five actions shows the modal with that text; J (S4): forced attempts through the real server, one for each of the five (Ada operates the page, the identity of the request is rewritten to Mia): the modal appears and nothing changes | `component.xml` and `journey.xml`, case REQ-007.6 |
| REQ-007.7 single OK icon, no Close, no Retry | C (S3) | `component.xml`, case REQ-007.7 |
| REQ-007.8 OK closes the modal, nothing changes | C (S3) | `component.xml`, case REQ-007.8 |

**REQ-008 One active loan per item**

| Criterion | Mechanism | Evidence it produces |
|---|---|---|
| REQ-008.1 never more than one active loan or borrower | D (S1): written directly to the store, an item On loan with no borrower, and a borrower on an item that is not On loan, are not accepted; I (S2): after a confirmed Borrow, the listing shows the borrowed item with exactly one borrower, and after each of the twenty rounds of two simultaneous Borrows (REQ-008.4), each item read back shows at most one borrower and the contested item exactly one. The row claims no mixed sequence of actions and no check after the other concurrency tests of section 8 | `db.xml` and `integration.xml`, case REQ-008.1 |
| REQ-008.2 Borrow on an On loan item rejected, borrower unchanged | U (S1): the borrow decision; I (S2): not carried out, the borrower unchanged on read-back | `unit.xml` and `integration.xml`, case REQ-008.2 |
| REQ-008.3 Borrow on an Out of service item rejected, status unchanged | U (S1); I (S2): not carried out, the status unchanged on read-back | `unit.xml` and `integration.xml`, case REQ-008.3 |
| REQ-008.4 two simultaneous Borrows: one confirmed, one rejected by the server, one borrower | I (S2): two threads released by a barrier, repeated 20 times, plus both serial orders: exactly one of the two requests carried out and the other not carried out, one borrower afterwards | `integration.xml`, case REQ-008.4 |
| REQ-008.5 a rejected Borrow is shown as REQ-012.5/.6 | C (S3): a mocked rejection on Borrow shows the API failure modal and changes nothing | `component.xml`, case REQ-008.5 |
| REQ-008.6 Borrow on an On loan item: borrower unchanged, failure modal | U (S1); I (S2): not carried out, borrower unchanged (the API failure modal that a person sees is asserted in J, next); J (S4): in two browser contexts that both list the item Available, Ada's Borrow for Mia is confirmed in the first, then Sam's Borrow in the second shows the API failure modal and the item stays On loan to Mia | `unit.xml`, `integration.xml` and `journey.xml`, case REQ-008.6 |
| REQ-008.7 Borrow on an Out of service item: status unchanged, failure modal | U (S1); I (S2): not carried out, status unchanged (the API failure modal that a person sees is asserted in J, next); J (S4): Ada marks the item out of service in the first context while the second still lists it Available, then Sam's Borrow in the second shows the API failure modal and the item stays Out of service | `unit.xml`, `integration.xml` and `journey.xml`, case REQ-008.7 |
| REQ-008.8 the loser in REQ-008.4 sees the failure modal; item On loan to the winner's borrower | I (S2): the same threaded test asserts that exactly one of the two requests was carried out and the other was not, and the item is On loan to the borrower the confirmed request named (the failure modal that the loser sees is asserted in J, next); J (S4): the two-context scenario of REQ-008.6 | `integration.xml` and `journey.xml`, case REQ-008.8 |

**REQ-009 Add equipment**

| Criterion | Mechanism | Evidence it produces |
|---|---|---|
| REQ-009.1 admin sees the Add field above the list | C (S3): `add-input` precedes `equipment-list` in document order | `component.xml`, case REQ-009.1 |
| REQ-009.2 Enter adds, item appears Available | C (S3); J (S4) | `component.xml` and `journey.xml`, case REQ-009.2 |
| REQ-009.3 Add icon same as Enter | C (S3) | `component.xml`, case REQ-009.3 |
| REQ-009.4 empty + Enter: inline message inside the Add panel, below the field, nothing created | C (S3): the mocked server would accept any Add; `add-validation` is shown as a descendant of `add-card`, after `add-input` in document order, and the list is as before; B (S3): in Chromium the box of `add-validation` lies within the box of `add-card`, its top edge is not above the lower edge of `add-input`, and the two boxes do not overlap (the placement of section 12.8.1) | `component.xml` and `browser.xml`, case REQ-009.4 |
| REQ-009.5 empty + Add icon: same | C (S3) and B (S3): as REQ-009.4, with the Add icon activated | `component.xml` and `browser.xml`, case REQ-009.5 |
| REQ-009.6 whitespace-only treated as empty | U (S1): the name rule treats a name of spaces and tabs as empty; C (S3): the message shows and the list is as before; I (S2): an Add of spaces and tabs is not carried out and creates nothing | `unit.xml`, `component.xml`, `integration.xml`, case REQ-009.6 |
| REQ-009.7 member sees no Add field | C (S3) | `component.xml`, case REQ-009.7 |
| REQ-009.8 inline message is on the page, inside the Add panel and below the field, not a modal | C (S3): `add-validation` exists as a descendant of `add-card` and no element has role `alertdialog`; B (S3): the placement of REQ-009.4 holds, in Chromium, when the message shows for an empty name, for a whitespace-only name and for a 101-character name | `component.xml` and `browser.xml`, case REQ-009.8 |
| REQ-009.9 duplicate names accepted | I (S2): two Adds of one name are both confirmed and make two items; C (S3) the list shows two rows | `integration.xml` and `component.xml`, case REQ-009.9 |
| REQ-009.10 over 100 characters after trimming: rejected by the server, nothing created | U (S1): the name rule at 100 and 101 characters, padded and unpadded; I (S2): a name of 101 characters, and of 101 characters between spaces, is not carried out and the list is unchanged on read-back | `unit.xml` and `integration.xml`, case REQ-009.10 |
| REQ-009.11 over 100: inline message inside the Add panel and below the field, no item, no failure modal | C (S3): a 101-character name shows `add-validation` as a descendant of `add-card`, creates no item (the mocked server would accept it) and shows no modal; an Add that the mocked server rejects for its length is also shown as the inline message and never as the failure modal; B (S3): the placement of REQ-009.4 holds for the 101-character name | `component.xml` and `browser.xml`, case REQ-009.11 |
| REQ-009.12 100 characters or fewer accepted | U (S1): boundary 100 and 101, with ASCII and with 100 characters outside the Basic Multilingual Plane (one character each, whatever the counting unit of the encoding); I (S2): a 100-character name is confirmed; C (S3): a 100-character name, ASCII and non-ASCII, is added and appears Available | `unit.xml`, `integration.xml`, `component.xml`, case REQ-009.12 |
| REQ-009.13 the Add loader replaces the Add icon while an Add is in progress | C (S3): with the Add's answer held open, `add-loader` is inside `add-card` and `btn-add` is not present | `component.xml`, case REQ-009.13 |
| REQ-009.14 while the Add loader shows, Enter and the Add icon do nothing | C (S3): with the Add's answer held open, Enter pressed again in the field does nothing; when the answer is released the list shows exactly one new row (the mocked server makes one item per Add it receives) and no `add-validation` and no modal is present | `component.xml`, case REQ-009.14 |
| REQ-009.15 the over-length message reads "Name must be 100 characters or fewer." | C (S3): a 101-character name makes `add-validation` read exactly that | `component.xml`, case REQ-009.15 |

**REQ-010 Out-of-service status**

| Criterion | Mechanism | Evidence it produces |
|---|---|---|
| REQ-010.1 Mark icon on every Available row (admin) | C (S3) | `component.xml`, case REQ-010.1 |
| REQ-010.2 no Mark icon on On loan or Out of service rows | C (S3) | `component.xml`, case REQ-010.2 |
| REQ-010.3 after Mark, the row reads Out of service | C (S3); I (S2) the action is confirmed and the read-back shows Out of service; J (S4) | `component.xml`, `integration.xml`, `journey.xml`, case REQ-010.3 |
| REQ-010.4 Restore icon on every Out of service row | C (S3) | `component.xml`, case REQ-010.4 |
| REQ-010.5 no Restore icon on Available or On loan rows | C (S3) | `component.xml`, case REQ-010.5 |
| REQ-010.6 after Restore, the row reads Available | C (S3); I (S2) the read-back shows Available; J (S4) | `component.xml`, `integration.xml`, `journey.xml`, case REQ-010.6 |
| REQ-010.7 member sees neither icon | C (S3) | `component.xml`, case REQ-010.7 |

**REQ-011 Delete equipment with confirmation**

| Criterion | Mechanism | Evidence it produces |
|---|---|---|
| REQ-011.1 Delete x on every Available and Out of service row | C (S3) | `component.xml`, case REQ-011.1 |
| REQ-011.2 no Delete x on an On loan row | C (S3) | `component.xml`, case REQ-011.2 |
| REQ-011.3 modal names the item before any request | C (S3): `modal-title` contains the item name and the mocked server has received no request | `component.xml`, case REQ-011.3 |
| REQ-011.4 modal has Cancel and Confirm icons | C (S3) | `component.xml`, case REQ-011.4 |
| REQ-011.5 Cancel closes, no request, no change | C (S3) | `component.xml`, case REQ-011.5 |
| REQ-011.6 Confirm sends the delete, row loader | C (S3) | `component.xml`, case REQ-011.6 |
| REQ-011.7 item gone once confirmed | C (S3); J (S4) | `component.xml` and `journey.xml`, case REQ-011.7 |
| REQ-011.8 delete of an On loan item rejected: still listed, still On loan, failure modal | U (S1): the delete decision; I (S2): not carried out, the item still listed and still On loan on read-back (the API failure modal that a person sees is asserted in J, next); J (S4): Ada's context lists the item Available with Delete offered, Mia borrows it in a second context, Ada confirms the delete: the API failure modal appears and the item stays On loan to Mia | `unit.xml`, `integration.xml` and `journey.xml`, case REQ-011.8 |
| REQ-011.9 member sees no Delete x | C (S3) | `component.xml`, case REQ-011.9 |

**REQ-012 Outcome of a server-call action**

| Criterion | Mechanism | Evidence it produces |
|---|---|---|
| REQ-012.1 row loader until confirmed (Borrow, Return, Delete) | C (S3): the mocked answer is held open | `component.xml`, case REQ-012.1 |
| REQ-012.2 until confirmed the list is as before | C (S3) | `component.xml`, case REQ-012.2 |
| REQ-012.3 on confirmation the list shows the new state | C (S3) | `component.xml`, case REQ-012.3 |
| REQ-012.4 no success banner when confirmed | C (S3): the page text outside the list and the modals is unchanged by the confirmation | `component.xml`, case REQ-012.4 |
| REQ-012.5 failure of any of the six: nothing changes | C (S3) with mocked rejections of several kinds (a conflict, a missing item, a server error and a request that never reaches the server) for each of the six actions | `component.xml`, case REQ-012.5 |
| REQ-012.6 API failure modal with Close and Retry | C (S3) | `component.xml`, case REQ-012.6 |
| REQ-012.7 Close closes, nothing changes | C (S3) | `component.xml`, case REQ-012.7 |
| REQ-012.8 Retry repeats the same request | C (S3): the second request the mocked server receives is for the same item and the same action as the first, and for an admin's Borrow names the same chosen member; J (S4): the first attempt is aborted by `page.route`, Retry succeeds against the real server | `component.xml` and `journey.xml`, case REQ-012.8 |
| REQ-012.9 loader for Add, Mark and Restore | C (S3): `add-loader` for Add, `row-loader` for the others | `component.xml`, case REQ-012.9 |
| REQ-012.10 until confirmed the list is as before | C (S3) | `component.xml`, case REQ-012.10 |
| REQ-012.11 on confirmation the new state shows | C (S3); J (S4) | `component.xml` and `journey.xml`, case REQ-012.11 |
| REQ-012.12 failure of Add, Mark, Restore: nothing changes, failure modal | C (S3) with a mocked server error and a mocked conflict | `component.xml`, case REQ-012.12 |
| REQ-012.13 Retry repeats Add with the same name, or Mark/Restore on the same item | C (S3) | `component.xml`, case REQ-012.13 |
| REQ-012.14 loader removed on failure, then the modal; no loader while it shows | C (S3): the first rendered DOM that contains the modal contains no `row-loader` and no `add-loader`, for each of the six actions | `component.xml`, case REQ-012.14 |
| REQ-012.15 no success note after Add, Mark, Restore | C (S3): the page text outside the list is unchanged by the confirmation | `component.xml`, case REQ-012.15 |
| REQ-012.16 an action on an item that is no longer there: does not happen, unchanged, failure modal | I (S2): each of Borrow, Return, Delete, Mark out of service and Restore on an item that was deleted, and on an id that never existed, is not carried out and nothing is created or changed on read-back (the API failure modal that a person sees is asserted in C and J, next); C (S3): a mocked rejection of the missing-item kind on each of the five shows the API failure modal and leaves the list as it was; J (S4): in two contexts that list the item, the second deletes it, then the first activates Mark out of service: the API failure modal appears and the first context's row is unchanged | `integration.xml`, `component.xml` and `journey.xml`, case REQ-012.16 |

**REQ-013 List page states**

The rows of REQ-013.23 to REQ-013.26 assert only what the PRD says of a failed list fetch. The PRD
is silent on whether `list-indicator` is removed when the modal appears and on what the page shows
behind the modal and after Close (GAP-1, section 11.2), so no row asserts either.

| Criterion | Mechanism | Evidence it produces |
|---|---|---|
| REQ-013.1 list indicator while fetching | C (S3): `list-indicator` is present while the list request is pending | `component.xml`, case REQ-013.1 |
| REQ-013.2 "No equipment yet" when there are no items | C (S3) | `component.xml`, case REQ-013.2 |
| REQ-013.3 Empty, admin: Add field above the text | C (S3) | `component.xml`, case REQ-013.3 |
| REQ-013.4 Empty, member: the text, no Add field | C (S3) | `component.xml`, case REQ-013.4 |
| REQ-013.5 state demos at the top of the page once a user is picked | C (S3): `state-demos` is first in document order; B (S3): at scroll 0 its top edge is above every other region | `component.xml` and `browser.xml`, case REQ-013.5 |
| REQ-013.6 exactly four demo controls, shipped | C (S3) for each of the three users | `component.xml`, case REQ-013.6 |
| REQ-013.7 Show loading shows the list indicator | C (S3) | `component.xml`, case REQ-013.7 |
| REQ-013.8 Show empty list shows the text; Add field for admin only | C (S3) | `component.xml`, case REQ-013.8 |
| REQ-013.9 Show API failure opens the failure modal with Close and Retry | C (S3) | `component.xml`, case REQ-013.9 |
| REQ-013.10 Show access denied opens the Access denied modal with a single OK | C (S3) | `component.xml`, case REQ-013.10 |
| REQ-013.11 demos not shown before a pick, shown after | C (S3): before a pick `state-demos` and the list are absent; after a pick, for each of the three users, `state-demos` is present with its four controls | `component.xml`, case REQ-013.11 |
| REQ-013.12 a demo changes nothing that is kept | C (S3): the mocked server's data is identical after each of the four demos has been activated with no other action made since, and a fresh render picked as the same user shows the same items; J (S4): on the real stack, as Ada, each of the four demos is activated with no other action made since (the two modals closed), the page is reloaded and Ada is picked: the list equals the list before. An Add made after a demo changes the list and is REQ-013.18, not this criterion | `component.xml` and `journey.xml`, case REQ-013.12 |
| REQ-013.13 Show loading shows the indicator for 900ms, then the real list | C (S3): the test waits for `list-indicator` to appear and then to disappear, with no action between and no sleeping, and `equipment-list` shows again; with a fake clock the indicator is still present after 899 ms and gone after 900 ms; J (S4): on the real stack the indicator is waited for until it appears and again until it disappears, within a 5-second budget, and the real list returns. No wall-clock duration is asserted (D-21) | `component.xml` and `journey.xml`, case REQ-013.13 |
| REQ-013.14 Show empty list stays until something ends it | C (S3): with a fake clock, ten minutes after Show empty list the page is still in the Show empty list view and `equipment-list` is absent | `component.xml`, case REQ-013.14 |
| REQ-013.15 in the Show empty list view, picking another user shows the real list | C (S3): picking the other seeded user shows `equipment-list` for that user | `component.xml`, case REQ-013.15 |
| REQ-013.16 in the Show empty list view, Show loading shows the indicator, then the real list; the view does not return | C (S3), fake clock: `list-indicator` shows, after 900 ms `equipment-list` shows, and ten minutes later the Show empty list view has not returned | `component.xml`, case REQ-013.16 |
| REQ-013.17 Retry in the demo failure modal only closes it | C (S3): after Show API failure, Retry: the modal is gone, none of `list-indicator`, `row-loader` and `add-loader` is present, and the mocked server's data and the list are as before | `component.xml`, case REQ-013.17 |
| REQ-013.18 an admin's Add from the Show empty list view is made and kept | C (S3): as Ada, Show empty list is activated, a name of 100 characters or fewer is typed and Enter pressed, and in a second case the Add icon is activated: the mocked server's data holds one new item with that name, Available, and a fresh render picked as Ada shows it; J (S4): on the real stack as Ada, Show empty list, an Add by Enter, the page reloaded and Ada picked: the real list holds the new item as Available | `component.xml` and `journey.xml`, case REQ-013.18 |
| REQ-013.19 a confirmed Add ends the view and shows the real list; until then the view stays | C (S3): with two items in the mocked data, Show empty list, then an Add whose answer is held open: `empty-state` is still present, `equipment-list` is absent and `add-loader` shows; when the answer is released `equipment-list` shows the two items and the new one as Available and `empty-state` is absent; the same with no item in the mocked data, where `equipment-list` shows the new item alone; J (S4): on the real stack as Ada with two existing items, Show empty list, then an Add: the list shows the two items and the new one as Available, and "No equipment yet" is not shown | `component.xml` and `journey.xml`, case REQ-013.19 |
| REQ-013.20 an Add of an empty or whitespace-only name from the view is not carried out; the view stays | C (S3): in the Show empty list view, Enter on an empty field, the Add icon on an empty field, and an Add of spaces and tabs (the mocked server would accept any Add): `add-validation` shows, the mocked server's data holds no new item, `empty-state` is still present and `equipment-list` is absent; B (S3): the placement of section 12.8.1 holds for the message in this view | `component.xml` and `browser.xml`, case REQ-013.20 |
| REQ-013.21 an Add of a name over 100 characters from the view is not carried out; the view stays; no failure modal | C (S3): in the Show empty list view, a 101-character name (the mocked server would accept it) makes `add-validation` read "Name must be 100 characters or fewer.", creates no item, opens no modal and leaves `empty-state` in place; an Add that the mocked server rejects for its length is shown the same way and never as the failure modal; B (S3): the placement of section 12.8.1 holds for the message in this view | `component.xml` and `browser.xml`, case REQ-013.21 |
| REQ-013.22 a failing Add from the view: nothing created, failure modal, the view stays; Retry repeats the Add | C (S3): in the Show empty list view the mocked server fails the Add (a server error, a conflict, and a request that never reaches the server): `modal-api-failure` appears with `btn-close` and `btn-retry`, the mocked server's data holds no new item and `empty-state` is still present; Close closes the modal and the view stays; after Retry the mocked server receives a second Add with the same name, and when that is confirmed `equipment-list` shows the new item as Available and `empty-state` is absent (REQ-013.18, REQ-013.19) | `component.xml`, case REQ-013.22 |
| REQ-013.23 a failed list fetch shows the API failure modal with Close and Retry | C (S3): the mocked list fetch is answered with several kinds of failure (a server error, a missing resource, and a request that never reaches the server): `modal-api-failure` appears with `btn-close` and `btn-retry`; a mocked refusal of the list fetch shows `modal-access-denied` and not the failure modal (PRD section 4, List fetch); J (S4): on the real stack, the list request the page makes after a pick is aborted with `page.route`: the failure modal appears with Close and Retry | `component.xml` and `journey.xml`, case REQ-013.23 |
| REQ-013.24 Close closes the modal and does not repeat the fetch | C (S3): after the failed list fetch, with any second list request held open so that a repeated fetch would show `list-indicator`, activating `btn-close` closes the modal and `list-indicator` is not present | `component.xml`, case REQ-013.24 |
| REQ-013.25 Retry repeats the fetch for the same acting identity; indicator meanwhile; the list or the empty text on success | C (S3): after the failed list fetch as Ada, `btn-retry` makes the mocked server receive a second list request that it answers for Ada (it acts for the identity it is sent), `list-indicator` is present while that answer is held open, and when it is released `equipment-list` shows the items, or `empty-state` when the mocked data holds none; J (S4): the first list request is aborted with `page.route`, Retry succeeds against the real server and the real list shows | `component.xml` and `journey.xml`, case REQ-013.25 |
| REQ-013.26 a second failure shows the modal again | C (S3): the mocked server fails the first list fetch and the repeat: after `btn-retry`, `modal-api-failure` appears again with `btn-close` and `btn-retry` | `component.xml`, case REQ-013.26 |

**REQ-014 Labelled icon buttons and operable modals**

| Criterion | Mechanism | Evidence it produces |
|---|---|---|
| REQ-014.1 eleven controls shown as icons, also inside modals | C (S3): each of the eleven, wherever it renders (row controls on rows, the Add icon in the Add panel, Close, Retry, OK, Cancel and Confirm in their modals), has an `svg` child and no text node | `component.xml`, case REQ-014.1 |
| REQ-014.2 every icon button has a tooltip | C (S3): for each of the fifteen icon buttons the `title` attribute equals the pinned text of section 12.8.2 | `component.xml`, case REQ-014.2 |
| REQ-014.3 every icon button has an accessible label | C (S3): `aria-label` equals the pinned text; `getByRole("button", {name})` finds it | `component.xml`, case REQ-014.3 |
| REQ-014.4 every modal uses role `alertdialog` | C (S3): all four modals | `component.xml`, case REQ-014.4 |
| REQ-014.5 modal icon buttons operable by keyboard | B (S3): Tab reaches each button and Enter or Space activates it, in all four modals | `browser.xml`, case REQ-014.5 |
| REQ-014.6 icon buttons outside modals operable by keyboard | B (S3): row buttons, Add icon and four demo controls | `browser.xml`, case REQ-014.6 |
| REQ-014.7 member buttons operable by keyboard | B (S3) | `browser.xml`, case REQ-014.7 |
| REQ-014.8 the icon rule covers the eleven only | C (S3): each member button holds an `svg` and the member's name | `component.xml`, case REQ-014.8 |
| REQ-014.9 member button tooltip and label "Borrow for <name>" | C (S3) | `component.xml`, case REQ-014.9 |
| REQ-014.10 demo controls: tooltip and labels | C (S3): `title` and `aria-label` per section 12.8.2 | `component.xml`, case REQ-014.10 |

**REQ-015 Apple-style look with uniform rows**

Measured rows use mechanism B: the production build in Chromium, API mocked, as Ada Admin and as
Mia Member, with rows in all three statuses. Heights are `getBoundingClientRect().height` of the
element with `data-testid="row"`, which excludes the 6px margin.

| Criterion | Mechanism | Evidence it produces |
|---|---|---|
| REQ-015.1 every row the same height in every status, role and while loading | B (S3): all `row` heights equal, including a row whose mocked answer is held open so `row-loader` shows | `browser.xml`, case REQ-015.1 |
| REQ-015.2 every row is 48px | B (S3) | `browser.xml`, case REQ-015.2 |
| REQ-015.3 system font on every kind of element | B (S3): computed `font-family` equals the stack of section 12.9 on `body`, the switcher, the Add field, a button, a row name, a status badge, a modal title and a modal body | `browser.xml`, case REQ-015.3 |
| REQ-015.4 top bar is translucent | R1 (S4), two steps. Step 1: the agent pre-review compares the build's top bar with the mockup's, the list scrolled beneath it in both, with the conversation trail among its inputs, and reports its gaps. Step 2: the user reads that report and records the entry. Passes when the user's entry reads `matches` (section 4.1.3) | The user's record `evidence/review/mockup-comparison.md`, entry REQ-015.4 |
| REQ-015.5 cards have rounded corners | R1 (S4), two steps: the agent pre-review, then the user's review (section 4.1.3). Passes when the user's entry reads `matches` | The user's record `evidence/review/mockup-comparison.md`, entry REQ-015.5 |
| REQ-015.6 cards have subtle shadows | R1 (S4), two steps: the agent pre-review, then the user's review (section 4.1.3). Passes when the user's entry reads `matches` | The user's record `evidence/review/mockup-comparison.md`, entry REQ-015.6 |
| REQ-015.7 status text in pill badges | B (S3): for every `row-status` and `role-badge`, computed border radius is at least half the element height | `browser.xml`, case REQ-015.7 |
| REQ-015.8 all fifteen icon buttons are round, wherever each appears | B (S3): as Ada Admin with rows in all three statuses, with each of the four modals opened in turn and the state demos shown, every one of the fifteen `data-testid` values `btn-borrow`, `btn-return`, `btn-out-of-service`, `btn-restore`, `btn-delete`, `btn-add`, `btn-close`, `btn-retry`, `btn-ok`, `btn-cancel`, `btn-confirm`, `demo-loading`, `demo-empty`, `demo-api-failure`, `demo-access-denied` is found at least once (a value never found fails the case), and every instance found has equal width and height and computed radius 50%. The member buttons are excluded (REQ-015.13) | `browser.xml`, case REQ-015.8 |
| REQ-015.9 top bar blurs by 20px | B (S3): computed `backdrop-filter` of `top-bar` contains `blur(20px)` | `browser.xml`, case REQ-015.9 |
| REQ-015.10 every card radius is 12px | B (S3): every element with class `card` (rows, the Add panel, the list indicator, the empty text) | `browser.xml`, case REQ-015.10 |
| REQ-015.11 every modal radius is 16px | B (S3): all four modals | `browser.xml`, case REQ-015.11 |
| REQ-015.12 switcher and Add field radius 8px | B (S3) | `browser.xml`, case REQ-015.12 |
| REQ-015.13 member buttons radius 10px | B (S3) | `browser.xml`, case REQ-015.13 |
| REQ-015.14 state demos panel radius 12px | B (S3) | `browser.xml`, case REQ-015.14 |

**REQ-016 Committed data persists across restart**

| Criterion | Mechanism | Evidence it produces |
|---|---|---|
| REQ-016.1 after first start exactly Ada, Mia, Sam with one admin and two members | I (S2): fresh database, start-up, the user listing returns exactly the three; J (S4): on the Compose stack, the user list read through the stack as Ada holds exactly Ada Admin (admin), Mia Member (member) and Sam Member (member), each once and no other user, and the switcher's entries equal those users (the switcher is a constant of the client, DD-07, so the row reads the real list: a server that failed to seed, or seeded a user twice, fails it) | `integration.xml` and `journey.xml`, case REQ-016.1 |
| REQ-016.2 every committed change survives a restart | J (S4): add, delete, mark, borrow as in the journey, then `docker compose down` (volume kept) and `docker compose up -d`, reload, compare list; I (S2): start the application twice on one database and compare the list | `journey.xml` and `integration.xml`, case REQ-016.2 |
| REQ-016.3 the seed is idempotent | I (S2): start-up run three times on one database, the user listing holds exactly three users, the committed changes remain; J (S4): after the restart, the user list read through the stack as Ada holds exactly the three users, each once, with no duplicate and no further user, and the switcher's entries equal them (the switcher is a constant of the client, DD-07, so the row reads the real list: a restart that seeded again and duplicated users fails it) | `integration.xml` and `journey.xml`, case REQ-016.3 |

**REQ-017 Restraint on non-goals**

C rows scan the rendered page in every state (before pick, loading, list, empty, each modal, each
demo) as Ada Admin and as Mia Member. The KD rows use the kept-data check of section 4.1.2. R2 is
the walk-through of section 4.1.3, in two steps: the agent pre-review, then the user's walk-through.
Each R2 row points at the user's record `evidence/review/non-goal-walkthrough.md`, one line per
criterion. The pre-review report (`evidence/review/non-goal-walkthrough-prereview.md`) is an input
to that line and is never the evidence of a row. In the cells below, "R2 (S4)" means both steps.

| Criterion | Mechanism | Evidence it produces |
|---|---|---|
| REQ-017.1 no password or real sign-in | C (S3), the same observation as REQ-001.3 | `component.xml`, case REQ-017.1 |
| REQ-017.2 no account management | C (S3): control inventory; R2 (S4): agent pre-review, then the user's walk-through | `component.xml`; the user's walk-through line REQ-017.2 |
| REQ-017.3 no reminder shown, no record kept to drive one | C (S3): no reminder text or element in any state; I (S2): KD; R2 (S4): agent pre-review, then the user's walk-through, for the interface half | `component.xml`, `integration.xml`; the user's walk-through line REQ-017.3 |
| REQ-017.4 no notification shown, no record kept to drive one | C (S3): no element or text beyond the specified modals, row states, inline message and the Loading and Empty texts; I (S2): KD; R2 (S4): agent pre-review, then the user's walk-through, for the interface half | `component.xml`, `integration.xml`; the user's walk-through line REQ-017.4 |
| REQ-017.5 no due date shown or set | C (S3): no date text and no date input; I (S2): KD (no date or time kept); R2 (S4): agent pre-review, then the user's walk-through | `component.xml`, `integration.xml`; the user's walk-through line REQ-017.5 |
| REQ-017.6 no loan history screen or list | C (S3); I (S2): KD (a Borrow and its Return leave nothing kept); R2 (S4): agent pre-review, then the user's walk-through | `component.xml`, `integration.xml`; the user's walk-through line REQ-017.6 |
| REQ-017.7 no detail screen | C (S3), the same observation as REQ-002.4 | `component.xml`, case REQ-017.7 |
| REQ-017.8 no control to edit an item | C (S3): control inventory; R2 (S4): agent pre-review, then the user's walk-through | `component.xml`; the user's walk-through line REQ-017.8 |
| REQ-017.9 no control to restore a deleted item | C (S3); R2 (S4): agent pre-review, then the user's walk-through | `component.xml`; the user's walk-through line REQ-017.9 |
| REQ-017.10 no reservation control | C (S3); R2 (S4): agent pre-review, then the user's walk-through | `component.xml`; the user's walk-through line REQ-017.10 |
| REQ-017.11 no member request to an admin | C (S3); R2 (S4): agent pre-review, then the user's walk-through | `component.xml`; the user's walk-through line REQ-017.11 |
| REQ-017.12 no control for a member to borrow for another person | C (S3), the same observation as REQ-003.5 | `component.xml`, case REQ-017.12 |
| REQ-017.13 no integration offered in the interface | C (S3); R2 (S4): agent pre-review, then the user's walk-through | `component.xml`; the user's walk-through line REQ-017.13 |
| REQ-017.14 no settings control | C (S3); R2 (S4): agent pre-review, then the user's walk-through | `component.xml`; the user's walk-through line REQ-017.14 |
| REQ-017.15 no search or filter control | C (S3); R2 (S4): agent pre-review, then the user's walk-through | `component.xml`; the user's walk-through line REQ-017.15 |
| REQ-017.16 no theme control | C (S3); R2 (S4): agent pre-review, then the user's walk-through | `component.xml`; the user's walk-through line REQ-017.16 |
| REQ-017.17 no success note after Add, Mark, Restore | C (S3), the same observation as REQ-012.15 | `component.xml`, case REQ-017.17 |
| REQ-017.18 no control outside the inventory | C (S3): every `button`, `input`, `select`, `a`, `textarea` and element with `tabindex` or a button role in every state is one of the `data-testid` values of section 12.8.3, per role; B (S3) repeats it in Chromium on the production build | `component.xml` and `browser.xml`, case REQ-017.18 |
| REQ-017.19 no trial-only banner, label or text | C (S3): no text containing "trial", "mockup", "sample data" or "nothing is saved" in any state; R2 (S4): agent pre-review, then the user's walk-through | `component.xml`; the user's walk-through line REQ-017.19 |

### 4.3 Register totals

| Requirement | Rows | | Requirement | Rows |
|---|---|---|---|---|
| REQ-001 | 11 | | REQ-010 | 7 |
| REQ-002 | 5 | | REQ-011 | 9 |
| REQ-003 | 8 | | REQ-012 | 16 |
| REQ-004 | 12 | | REQ-013 | 26 |
| REQ-005 | 4 | | REQ-014 | 10 |
| REQ-006 | 7 | | REQ-015 | 14 |
| REQ-007 | 8 | | REQ-016 | 3 |
| REQ-008 | 8 | | REQ-017 | 19 |
| REQ-009 | 15 | | **Total** | **182** |

Every one of the 182 criteria has a row. The fifteen added by the first amendment of the PRD are
REQ-001.10, REQ-001.11, REQ-004.11, REQ-004.12, REQ-009.13 to REQ-009.15, REQ-012.16 and
REQ-013.11 to REQ-013.17. The nine added by the third round are REQ-013.18 to REQ-013.26 (D-25 and
D-26). Rows whose evidence is a human review: REQ-015.4, REQ-015.5, REQ-015.6 (R1) and the R2 line
of REQ-017.2 to REQ-017.6, REQ-017.8 to REQ-017.11, REQ-017.13 to REQ-017.16 and REQ-017.19. Each
names both steps, the agent pre-review and the user's review, points at the user's record, and has
a pass condition (section 4.1.3).

### 4.4 Technical choices that no row verifies

The product owner ruled that technical work is not verified by tests. The following are decided and
recorded in this document. Some are the contract the frozen tests are written against (section
12), so the tests use their names, but **no row verifies that they are as pinned**.

- The response codes as values (section 12.3.1 and the route table of section 12.3). They are the
  user's and the drafter's decisions, recorded here. No acceptance test asserts any of them, as the
  thing verified or as an instrument. A row that drives the HTTP API asserts only that the action
  was carried out or was not and that nothing changed; a rules-level row may state the class of
  decision the rules layer returned, and asserts no code (section 4.1.1). The difference a person
  sees between a refusal and a rejection is asserted in the component, browser and journey rows.
- The access log and its format (section 5.4, D-23). No test reads the log.
- The schema: table, column and constraint names (section 7). D (S1) and the checks NA and KD use
  the database to observe the invariant or the absence of attribution, never to confirm a name.
- Module, file and function names (sections 9 and 12), libraries, versions and build tools.
- **D-18: a plain React single-page application built with Vite, no Next.js. Verified by nothing.**
  The earlier blueprint's `NFR-4 manifest` case, which read `web/package.json`, is removed. It was
  never a criterion, and the PRD (NFR-4) says no acceptance criterion verifies the choice.
- The identity header's name and the parsing rule's pattern (section 5.1). The values in section
  5.1.1 are probes of REQ-001.7, not a verification of the pattern.
- The set of routes. The builder adds none beyond section 12.3 (a build instruction); no test lists
  the registered routes.
- Configuration (section 6).
- How the client trims a name, how it counts its length, and that it checks the name before it
  calls the server (DD-06, DD-21). The REQ-009 rows observe the outcome for a name of 100
  characters, 101 characters and whitespace only; they do not assert the method.
- The paths of the pre-review reports and of the user's records, and every field of them that the
  pass conditions of section 4.1.3 do not name (DD-15). The pass conditions do name some, and those
  are conditions of the rows: the opening line of each record and the report it names, the
  candidate commit hash, the report's section "What I could not judge", and in each entry or line
  the token or finding, the user's name, the date and the hash (for R1, also the two screenshots).
  Nothing else in the layout is verified, and the review rows point at the user's verdict.
- Whether, after a confirmed Add made from the Show empty list view, the client appends the item or
  reads the list again (DD-25). The REQ-013.18 and REQ-013.19 rows observe the list the person sees.

## 5. Security controls

The identity of the trial is picked in a switcher with no password and is spoofable by design
(`[Answer]`, NFR-3). It is not authentication. The user accepts that the posture is unproven by
automated tests and that no "trial-only" label appears (D-19). The controls below are the ones the
decisions require; none is claimed to resist a hostile client.

### 5.1 How the acting identity is carried, and what each failure means (D-01)

- **Carried as** the HTTP request header `X-User-Id`, whose value is the decimal id of a seeded
  user (1, 2 or 3, section 12.2). The browser sets it on every request after a user is picked. It
  is held in the page's memory only (DD-08). The PRD leaves the way the identity is carried to the
  design (PRD section 4); the header is the earlier blueprint's choice, kept (section 10.3).
- **Missing:** the request has no `X-User-Id` header.
- **Malformed:** a header is present and either (a) the request has more than one `X-User-Id`
  header, read from the raw header list of the ASGI scope, or (b) the value does not **fully**
  match `^[1-9][0-9]{0,8}$`, tested against the raw value with no trimming. "Fully" means
  `re.fullmatch`, so that a trailing line break does not pass. In words: one to nine ASCII digits,
  no sign, no leading zero, no space, no other character, not empty.
- **Not a seeded user:** the value is well formed and no `users` row has that id (for example `4`
  or `999999999`).
- **Answer for all three:** status 403, a zero-length body (no JSON, no `detail`), and no change
  (SC-01, D-01). It holds for every method and every path, including the list fetch, an undefined
  path and `OPTIONS` (REQ-001.6 to REQ-001.8). When the refused request was made through the
  interface, the page turns the answer into the Access denied modal and never the API failure modal
  (D-24; section 12.7).
- **Where the check happens:** one place, `IdentityMiddleware` in `app/main.py`, outermost, so it
  runs before routing, body parsing and validation. It calls `rules.resolve_actor`, which reads
  the user and the role from the `users` table on every request and never trusts a role sent by
  the client. The resolved `Actor` is placed on `request.state.actor`; routes read it from there.
- **No exceptions:** there is no health endpoint and no unauthenticated route. The `api` health
  check of Compose calls `GET /api/users` with `X-User-Id: 1`. The interactive documentation and
  the OpenAPI route are switched off, so nothing is served outside the routes of section 12.3.
- **Web client:** before a user is picked the client sends no request and shows the switcher only
  (REQ-001.9). The switcher entries are a constant of the client (DD-07), because the user list
  cannot be fetched without an identity.

#### 5.1.1 The malformed set, and where each case can be observed

The rule is applied in one function (`parse_user_id`), and the same function serves every path. But
the paths do not deliver the same bytes to it, so **the rule is not observable identically on
every path**. The probes REQ-001.7 uses, and the paths on which each can arrive:

| Probe value | In-process (U on `parse_user_id`; I by a direct ASGI call) | Through the real servers (J: browser, nginx, uvicorn) | Why |
|---|---|---|---|
| `0`, `01`, `-1`, `+2`, `1.0`, `1,2`, `abc`, `1a`, `1234567890` (ten digits) | Yes | Yes | No character a parser or a browser alters |
| empty (header present, no value) | Yes | The refusal is observable; which of "missing" or "malformed" the API saw is not | A proxy may drop an empty-valued header, which turns it into the missing case. Both are refused |
| ` 1` (leading space), `1 ` (trailing space), `1` followed by a tab, `1` followed by a line break | Yes | **No** | RFC 9110 section 5.5: a field value does not include leading or trailing whitespace, and a parser excludes it before the value is evaluated. uvicorn's parser and nginx do so, and the browser's `fetch` strips it before sending. A line break cannot occur in a header value on the wire. The API therefore receives `1`, a valid identity, and accepts it. That is correct behaviour and not a defect |
| two `X-User-Id` headers | Yes (two entries in the ASGI header list) | **No** | A browser's `fetch` joins repeated values of one header into a single comma-separated value, which then fails the pattern as `1,2` does and is refused. Sending two header lines needs a raw HTTP client, and whether the proxy forwards both as two is not claimed here |

Consequences, stated plainly. The rule "a padded value is malformed" holds for in-process callers
only; over HTTP it cannot be exercised, and no test claims it is. REQ-001.7 is verified in-process
for the whole set and through the real stack for the subset the wire can deliver. For every value
that can arrive on a path, the request is refused on that path.

### 5.2 Per requirement that accepts input or identity

Every route below first meets 5.1. "Role" means a valid identity with the wrong role or owner.
Codes are named by their ledger entries (section 12.3.1).

| Requirement | Route | Validated | Role / ownership | Other failures |
|---|---|---|---|---|
| REQ-001, REQ-013 | `GET /api/users`, `GET /api/equipment` | nothing else | any seeded user | none other than 5.1 on the server. In the page, a list fetch that fails (any non-200 other than 403, or a request that never arrives) shows the API failure modal with Close and Retry (D-25), and a refused one shows the Access denied modal (D-24); nothing is stored |
| REQ-003 | `POST /api/equipment/{id}/borrow` | `id` integer in 1..2147483647; body `{}` or `{"borrowerId": integer}`, unknown fields refused | a member whose `borrowerId` is present and not their own id: 403 (SC-06, D-07), whether that id is the admin, another member or unknown | 404 no such item (SC-10); 409 not Available (SC-04); 422 bad `id` or body (SC-14) |
| REQ-004, REQ-005 | the same route, as admin | `borrowerId` must be present, an integer, an existing user, role member | an admin naming an admin (including themselves): 422 (SC-03, D-03; REQ-005.3, REQ-005.4) | 422 for missing, non-integer or unknown `borrowerId` (SC-12; REQ-004.11, REQ-004.12); 404 (SC-10); 409 (SC-04) |
| REQ-006 | `POST /api/equipment/{id}/return` | `id` | a member returning a loan whose borrower is someone else: 403 (SC-09) | 404 (SC-10); 409 item not On loan (SC-11); 422 `id` (SC-14) |
| REQ-007 | add, mark, restore, delete, and a member's return and borrow | none | a member on add, mark or restore: 403 before any validation, lookup or state check (SC-08, D-12); on delete: 403 likewise (SC-09) | none |
| REQ-008 | borrow | none | none | 409 for On loan and for Out of service (SC-04, D-03) |
| REQ-009 | `POST /api/equipment` | body `{"name": string}`, nothing else; trimmed, length 1 to 100 characters (Unicode code points); a non-string, a missing name, an empty or whitespace-only name (SC-13) or an over-long name (SC-05, D-06) is refused with 422 | member: 403 (SC-08) | 422. The same checks apply to an Add made from the Show empty list view (REQ-013.20 to REQ-013.22) |
| REQ-010 | `POST /api/equipment/{id}/out-of-service`, `.../restore` | `id` | member: 403 (SC-08) | 404 (SC-10); 409 mark on a non-Available item, restore on a non-Out-of-service item (SC-11); 422 `id` (SC-14) |
| REQ-011 | `DELETE /api/equipment/{id}` | `id` | member: 403 (SC-09) | 404 (SC-10); 409 item On loan (SC-07, D-11); 422 `id` (SC-14) |
| REQ-012 | (web) the outcome | any non-200 other than 403, and for Add other than the 422 that rejects the name: failure modal; a request that never reaches the server counts as a failure (PRD section 4, section 10.2) | 403: Access denied modal | nothing changes in either case |
| REQ-016 | none | the application reads only `DATABASE_URL` at start (section 6) | | |

### 5.3 Order of checks (pinned, for syntactically valid requests)

1. Identity (5.1). 2. Role permission of the route and, for a member's Borrow, the `borrowerId`
rule. 3. Request validation: `id`, body, name, and an admin's borrower. 4. The item exists (404).
5. State and ownership under the row lock: 409, and a member's return of another's loan (403).
A request whose body is not parseable JSON answers 422 after step 1.

### 5.4 Logging and what is never stored

- **The access log, stated once (D-23).** The acting user id belongs in the access log, which is
  operational. It records one line per request: logger `app.access`, level INFO, exactly
  `{METHOD} {PATH} {STATUS} user={ACTING_USER_ID}`, for example
  `POST /api/equipment/4/borrow 200 user=1`. Where the request carried no usable identity the field
  reads `user=-`. The path carries no query string. The line carries no request or response body
  and no configuration value. The server's own access log is switched off so this is the only
  request log. D-09 governs the product, that is the data and the interface; it does not reach the
  access log, and the PRD's definition of Record excludes it. **No acceptance test verifies the
  log or its format**, and no register row reads it (section 4.4).
- **Never logged:** any user name, any request or response body, the `DATABASE_URL`, any password.
- **Never stored:** who performed any action. No audit, history or actor column exists (section
  7). Passwords do not exist. The browser stores nothing: no cookie, no local storage.
- **Start-up errors** name the setting that is wrong and never echo its value.
- **Output and queries:** React's default escaping is the only rendering path (no
  `dangerouslySetInnerHTML`); the mockup's HTML-string rendering is not copied. SQL is parameterised
  through SQLAlchemy only.
- **No cross-origin access:** the application sets no CORS headers. The browser reaches the API
  only through the same origin (nginx proxy in Compose, the Vite proxy in `vite preview`).

## 6. Configuration

Every setting, with its default and whether it is required at start. The API reads its settings
when the application starts (the lifespan start-up of `app.main:app`), not when the module is
imported, so tests can set them first. A missing or malformed required setting makes the process
exit with a non-zero status and a message that names the setting and does not echo its value.

| Setting | Read by | Default | Required at start |
|---|---|---|---|
| `DATABASE_URL` | `api` | none | **Yes.** Must begin `postgresql+psycopg://`. Example in `.env.example`: `postgresql+psycopg://equipment:CHANGE_ME@db:5432/equipment` |
| `POSTGRES_USER` | `db` container, via Compose | none (`.env.example` placeholder `equipment`) | **Yes** for Compose; Compose refuses to start without it |
| `POSTGRES_PASSWORD` | `db` container, via Compose | none (`.env.example` placeholder `CHANGE_ME`) | **Yes** for Compose |
| `POSTGRES_DB` | `db` container, via Compose | none (`.env.example` placeholder `equipment`) | **Yes** for Compose |
| `WEB_PORT` | Compose, the published port of `web` | `8080` | No |
| `VITE_API_BASE_URL` | `web` build, non-secret | `/api` | No |
| `TEST_DATABASE_URL` | the pytest mechanisms D and I | none | Required to run D and I, not by the application. It must name a throw-away database: the tests empty its tables |
| `E2E_BASE_URL` | the mechanism J | `http://localhost:8080` | No |

Fixed, not settings: the API listens on port 8000 inside the Compose network and is not published;
the database port is not published; the log level is INFO; the name limit is the constant
`NAME_MAX_LENGTH = 100` in `app.rules` (D-06).

`.env.example` is committed and holds placeholders only. `.env` holds the real local values and is
git-ignored. Compose reads `.env`. Only non-secret `VITE_` values enter the web build, and the
browser holds no secret. The only secrets are the database credentials. No deployment is in scope,
so no production secret store is named.

## 7. Data

Two tables in the `public` schema. No other table exists: there is no loan history (non-goal) and
no column anywhere records who performed an action (D-09).

| Table | Column | Type | Constraint |
|---|---|---|---|
| `users` | `id` | integer | primary key; the seed gives 1, 2, 3 |
| `users` | `name` | text | not null, unique |
| `users` | `role` | text | not null, check in (`admin`, `member`) |
| `equipment` | `id` | integer | primary key, `GENERATED ALWAYS AS IDENTITY`; never reused |
| `equipment` | `name` | text | not null, check `char_length(name) BETWEEN 1 AND 100`; **not unique** (D-10) |
| `equipment` | `status` | text | not null, check in (`available`, `on_loan`, `out_of_service`) |
| `equipment` | `borrower_id` | integer | null; foreign key to `users(id)` on delete restrict |
| `equipment` | (table check) | | `(status = 'on_loan') = (borrower_id IS NOT NULL)` |

What guarantees what:

- **Exactly one active loan per item (REQ-008.1).** An item has one `borrower_id` and there is no
  loans table, so a second active loan cannot be stored. The table check refuses an `on_loan` row
  with no borrower and a borrower on any other status. Two simultaneous Borrows are serialised by
  the row lock of section 8. The criterion is verified by what the application shows after the
  concurrency tests and by a direct write the store must refuse (section 4.2); no test verifies
  the constraint's name or text.
- **The borrower is a member, never an admin (REQ-005).** Enforced in `rules.resolve_borrower`.
  The database cannot express it without a trigger and none is added.
- **Seed idempotent (REQ-016.3).** `db.seed` inserts the three users with their fixed ids by
  `INSERT ... ON CONFLICT (id) DO NOTHING`; `users.name` is also unique. Running it any number of
  times, or from two processes at once, leaves exactly three users. The seed creates no equipment,
  so the list is empty on first start.
- **Schema creation** is `CREATE TABLE IF NOT EXISTS` through `db.create_schema`, run at start-up
  before the seed. No migration tool is used.
- **Persistence (REQ-016.2).** PostgreSQL's data directory is a named Compose volume (`pgdata`).
  `docker compose down` without `-v` keeps it.
- **Order.** `GET /api/equipment` returns items by `id` ascending (DD-18); `GET /api/users` by `id`
  ascending.
- **Stored name.** The trimmed name, as accepted. Length counts Unicode code points (DD-18,
  DD-21).

## 8. Concurrency

The shared object is the equipment item. Two people can act on the same item at once.

**Mechanism (DD-01).** Every operation on an existing item runs in one transaction that begins by
reading that item's row with `SELECT ... FOR UPDATE`, decides on the row it has locked, writes, and
commits. Two operations on the same item are therefore serialised, and the second one sees the
state the first left. Each operation locks one row, so no deadlock between operations is possible.
`GET` requests take no lock and see a committed state. The mechanism is a design default; the
**guarantee** is the table below, and a builder may use another mechanism (for example a
conditional `UPDATE ... WHERE`) if every answer in the table holds. The table check of section 7 is
the last line of defence for REQ-008.1.

**The rule that governs every pair.** Whichever two operations meet, the database decides which
takes the lock first, and the second is answered on the state the first left. That answer comes
from the transition rule below, which is the single-operation rule of section 12.5 and nothing
more:

| Operation | Succeeds when the locked item is | Effect | Otherwise |
|---|---|---|---|
| borrow | Available | On loan to the borrower | On loan or Out of service: 409 (SC-04); gone: 404 (SC-10) |
| return | On loan (admin: any loan; member: their own) | Available, no borrower | not On loan: 409 (SC-11); a member and not the borrower: 403 (SC-09); gone: 404 |
| mark out of service | Available | Out of service | 409 (SC-11); gone: 404 |
| restore | Out of service | Available | 409 (SC-11); gone: 404 |
| delete | Available or Out of service | gone for good (ids are never reused) | On loan: 409 (SC-07); gone: 404 |
| add | (no existing item) | a new Available item | none: two Adds make two items (D-10) |

**The table below is illustrative, not a complete enumeration.** It lists the pairs that matter
most and the answer the loser gets in each. The pairs it does not list are governed by the rule
above and the row lock: the result always equals one of the two serial orders. Each cell names the
requests in the order in which they took the lock. The loser's answer is a normal HTTP answer: 409
for a state the winner changed (D-03), 404 when the winner deleted the item, 403 only for
permission or ownership.

| Pair (same item) | Starting state | Order 1 | Order 2 | What the design guarantees |
|---|---|---|---|---|
| borrow / borrow | Available | borrow A 200; borrow B **409** | borrow B 200; borrow A **409** | Exactly one winner, exactly one borrower afterwards; the loser gets 409 (REQ-008.4, REQ-008.8). The pair may be a member and an admin, or two members |
| borrow / return | On loan to X | return 200, then borrow 200: the item ends On loan to the new borrower | borrow **409** (still on loan), then return 200: the item ends Available | Never two borrowers. Each request is answered on the state it meets. The return never fails |
| borrow / return | Available | return **409** (not on loan), then borrow 200 | borrow 200, then return 200 by the new borrower or an admin: ends Available | As above |
| borrow / delete | Available | borrow 200, then delete **409** (On loan, D-11): the item remains On loan | delete 200, then borrow **404** (no such item) | An On loan item is never deleted; no loan is ever written to a missing item |
| borrow / mark | Available | borrow 200, then mark **409** (not Available) | mark 200, then borrow **409** (Out of service, D-03) | One of the two always gets 409; the item ends On loan or Out of service, never both |
| borrow / restore | Out of service | restore 200, then borrow 200: the item ends On loan | borrow **409** (Out of service, D-03), then restore 200: the item ends Available | A loan is never written to an Out of service item; the result equals one of the two serial orders |
| return / mark | On loan | return 200, then mark 200: the item ends Out of service | mark **409** (On loan, not Available), then return 200: the item ends Available | An On loan item is never marked out of service; the result equals one of the two serial orders |
| return / restore | On loan | return 200, then restore **409** (now Available, not Out of service) | restore **409** (On loan), then return 200 | One 200 and one 409 either way; the item ends Available. From Out of service the same pair is restore 200 and return **409** (not on loan) in both orders |
| return / return | On loan | first return 200, second return **409** (not on loan) | the same, the other way round | The item ends Available; one 200 and one 409. A member whose return arrives after a third party has borrowed the item gets 403, an admin gets 200 |
| return / delete | On loan | return 200, then delete 200: the item ends deleted | delete **409** (still On loan), then return 200: the item ends Available | A delete never removes an On loan item; a return never fails because of a delete |
| delete / mark | Available | delete 200, then mark **404** | mark 200, then delete 200 (an Out of service item can be deleted): the item ends deleted | No status is ever written to a deleted item. The same holds for delete / restore on an Out of service item |
| mark / restore | Available | mark 200, then restore 200: ends Available | restore **409** (not Out of service), then mark 200: ends Out of service | The result equals one of the two serial orders |
| mark / restore | Out of service | restore 200, then mark 200: ends Out of service | mark **409** (not Available), then restore 200: ends Available | The result equals one of the two serial orders |

Pairs of the same action: mark / mark gives one 200 and one 409; restore / restore, one 200 and one
409; delete / delete, one 200 and one 404; add / add gives two 200s and two items, because
duplicate names are allowed (D-10).

**What the client does with the loser.** The page is not live and is not refreshed after a failure,
because "nothing changes" (REQ-012.5). A 409 or 404 shows the API failure modal; Close leaves the
row as it was; Retry repeats the same request and gets the same answer unless the state has changed
again. The list is read again when a user is picked (DD-17).

**How it is verified.** In S2, for every row above, including the three added rows
(borrow / restore, return / mark, return / restore): two deterministic tests, one per order, that
assert, for each request, whether it was carried out or was not (section 4.1.1) and the final item
state the table gives; and one threaded test in which two threads are released together by a
`threading.Barrier`, repeated 20 times, that asserts the pair of results, each read as carried out
or not carried out, is one of the two allowed ones, that the final item state is the one the table
gives for that outcome, and that the invariants of section 7 hold. No test asserts a status code:
the codes in the two tables above are the design's decisions, recorded here and not verified. The
borrow / borrow test is labelled REQ-008.4 and REQ-008.8, the invariant check REQ-008.1, the delete
pairs REQ-011.8 and the borrow / mark pair REQ-008.7. Every test begins its title with the test ID
the eval plan gives it (section 4.1, DD-24), those included. The tests of the other pairs carry,
after their test ID, `CONC` and the pair, and no requirement label: they verify a guarantee of the
design and not a criterion, and a label would let one be read as the evidence of a criterion it
does not verify. A pair that is not in the table is not separately tested; the lock and the
transition rule cover it.

## 9. Stories and integration

Four stories. The earlier five-story split fails the disjoint-scope rule: its UI shell story and its
UI mutations story both own `App.jsx`, the row component and the stylesheet, and the tests for "every
button is an icon with a tooltip and a label" (REQ-014) and "no control exists outside the
inventory" (REQ-017.18) cannot pass until both are present. The whole web client is therefore one
story. Detail belongs to the eval plan; this section states the shape.

### 9.1 Stories, order and file ownership

No file or directory appears twice. Test paths are listed because tests gate a story; the tests
are written and frozen before the build (they are not the builder's to change), and they sit in the
story whose work they gate.

| Story | Delivers | Depends on | Files it owns |
|---|---|---|---|
| **S1 Database, rules and seed** (api owner) | Schema, models, session, lock helpers, `seed`, `initialise`, and every function of `app.rules` | none | `api/pyproject.toml`, `api/requirements.txt`, `api/app/__init__.py`, `api/app/db.py`, `api/app/rules.py`; tests `api/tests/conftest.py`, `api/tests/unit/**`, `api/tests/db/**` |
| **S2 API routes and start-up** (api owner) | Configuration load, identity middleware, the eight routes, error mapping (section 12.3.1), logging, start-up that creates the schema and runs the seed, the ASGI object | S1 | `api/app/config.py`, `api/app/routes.py`, `api/app/main.py`; tests `api/tests/api/**` (identity, the outcomes of each route, concurrency, the attribution check NA and the kept-data check KD, start-up and seed) |
| **S3 The whole web client** (web owner) | Switcher, list, rows, all icon controls, the four modals, loaders, Add field and inline validation, the name check, Loading and Empty states, the failed list fetch with its modal and Retry, state demos, an Add made from the Show empty list view, the stylesheet | none for code: it builds against section 12 and mocks `fetch` | `web/package.json`, `web/package-lock.json`, `web/index.html`, `web/vite.config.js`, `web/playwright.config.js`, `web/src/**`; tests `web/tests/component/**`, `web/tests/browser/**` |
| **S4 Compose and the journey** (integrator) | Compose stack, images, nginx proxy, the Playwright journey on the real stack (including forced attempts and two-context scenarios), the restart check, and the directory `evidence/review/` for the review evidence (the pre-review reports and the user's records are placed in it by their authors, never written by the S4 builder, section 4.1.3) | S2 and S3 | `docker-compose.yml`, `.env.example`, `.gitignore`, `api/Dockerfile`, `api/.dockerignore`, `web/Dockerfile`, `web/nginx.conf`, `web/.dockerignore`, `e2e/**` (journey specs, `e2e/package.json`, `e2e/playwright.config.js`), `evidence/review/**` |

S3 owns every path under `web/` except the three files named under S4. Generated report folders
(`api/reports/`, `web/reports/`, `e2e/reports/`) are git-ignored build output owned by nobody.

Dependency order: S1 then S2. S3 can start at once, in parallel with S1 and S2, because the
contract it builds against is pinned in section 12. S4 starts when S2 and S3 are merged.

### 9.2 Merge and combined-candidate verification

The stories are merged into one candidate in the order S1, S2, S3, S4. Because no file is owned
twice, the merge has no textual conflict; the stories meet only at the HTTP contract of
section 12. A change to section 12 after the build starts is an amendment that needs both owners'
agreement and the user's approval; it is not a builder choice.

Per-story passes (U and D for S1, I for S2, C and B for S3) do not substitute for the combined
candidate. On the merged candidate S4 runs `docker compose up -d --build`, then mechanism J. The two
reviews R1 and R2 follow on the same candidate, each in two steps: an agent pre-review in a session
that did not build it, then the user's review (section 4.1.3). The S4 builder runs neither step and
writes neither record. The candidate is judged on those results together with the earlier reports,
and a review row is judged on the user's record alone.

**The seed's tests belong to S2.** S1 delivers `db.seed` and `db.initialise`, but the seed is only
observable once start-up wires it, so REQ-016.1 and REQ-016.3 are tested in `api/tests/api/` and
gate S2. S1's own gate is its `unit.xml` and `db.xml`.

### 9.3 Where each requirement's criteria land

Criteria are listed in the story whose mechanism in section 4 produces their evidence. A criterion
with two mechanisms appears under both stories.

| Requirement | S1 | S2 | S3 | S4 |
|---|---|---|---|---|
| REQ-001 | .7 | .6 .7 .8 | .1 .2 .3 .4 .5 .9 .10 .11 | .1 .4 .6 .7 .8 |
| REQ-002 | | | .1 .2 .3 .4 .5 | |
| REQ-003 | .6 | .6 .8 | .1 to .8 | .4 .6 |
| REQ-004 | .11 .12 | .8 .10 .11 .12 | .1 to .9, .11 .12 | .6 .9 .11 .12 |
| REQ-005 | .3 .4 | .3 .4 | .1 .2 | .2 .4 |
| REQ-006 | | .7 | .1 to .6 | .5 .6 |
| REQ-007 | .1 to .5 | .1 to .5 | .6 .7 .8 | .6 |
| REQ-008 | .1 .2 .3 .6 .7 | .1 .2 .3 .4 .6 .7 .8 | .5 | .6 .7 .8 |
| REQ-009 | .6 .10 .12 | .6 .9 .10 .12 | .1 to .9, .11 to .15 | .2 |
| REQ-010 | | .3 .6 | .1 to .7 | .3 .6 |
| REQ-011 | .8 | .8 | .1 to .7, .9 | .7 .8 |
| REQ-012 | | .16 | .1 to .16 | .8 .11 .16 |
| REQ-013 | | | .1 to .26 | .12 .13 .18 .19 .23 .25 |
| REQ-014 | | | .1 to .10 | |
| REQ-015 | | | .1 .2 .3 .7 to .14 | .4 .5 .6 |
| REQ-016 | | .1 .2 .3 | | .1 .2 .3 |
| REQ-017 | | .3 .4 .5 .6 | .1 to .19 | .2 to .6, .8 to .11, .13 to .16, .19 (R2) |

## 10. Decisions

Each decision names who decided: **User** (a decision D-nn or the confirmed scope), **PRD clause**
(cited), **Recorded default** (kept from `technical-rev41.md`, which this blueprint preserves), or
**Drafter** (a design default decided by this blueprint's drafter, with the reason, and settled by
the user's acceptance of this blueprint at gate 6; section 10.4). No row both cites a clause and
asks the user a question.

### 10.1 Decided by the user

This table includes, with the deciding decision named, **every response code the user chose**.
Those codes were removed from the PRD's criteria and are the user's decisions recorded here; each
is traced to the route that answers it in the ledger of section 12.3.1.

| Decision | Decider |
|---|---|
| React, FastAPI, PostgreSQL | User, `[Idea]` (PRD section 2.1) |
| A plain React single-page application built with Vite; Next.js not used. **Verified by nothing**: no criterion and no test covers it (section 4.4) | User, D-18 |
| Identity is a switcher of the three seeded users, no password | User, `[Answer]` |
| A request whose acting identity is missing, malformed or not a seeded user is refused with **403** and no body, on every route, every path and every method (SC-01). No list before a user is picked | User, D-01 |
| The back-end's confirmation is **200** (SC-02): a loader until the response arrives, the list changes only after a 200, a non-200 shows the failure modal with Close and Retry. Add, Mark out of service and Restore are server calls with this treatment | User, D-02 and `[Feedback 3]` ("until the back-end returns 200"); D-12 for their forced attempts |
| An admin named as borrower is rejected with **422** (SC-03). A Borrow on an item that is not Available is **409** (SC-04) | User, D-03 |
| An equipment name over 100 characters after trimming is rejected with **422** and the inline validation message (SC-05) | User, D-06 |
| A member's request naming anyone but the acting member as borrower is refused with **403** and shows the Access denied modal (SC-06). A member naming the admin is this case, not 422 | User, D-07; D-23 (N2 needed no decision) |
| A delete of an On loan item is **409** (SC-07) | User, D-11 |
| A member's forced Add, Mark out of service or Restore is refused with **403** and shows the Access denied modal (SC-08) | User, D-12 |
| After Restore the item is Available; the row loader is removed on a non-200 and then the failure modal appears | User, D-04; D-08 |
| Nothing records or shows who performed an admin return or an admin-set loan. Consequence here: no actor column anywhere in the data | User, D-09 |
| The access log carries the acting user id (and method, path and status; no body, no configuration value). The log is operational and is not product data; no test verifies it | User, D-23 |
| No limit on items per member; duplicate names allowed | User, D-05, D-10 |
| The server, not the client, rejects the loser of two simultaneous Borrows; the seed is idempotent; modals use `alertdialog`; icon buttons and modals are keyboard-operable; whitespace-only name rejected | User, D-13 |
| No success notes; no trial-only label or banner; the security posture is accepted as unproven by automated tests | User, D-14, D-19 |
| Each switcher entry shows its role; the icon rule covers the eleven controls | User, D-15 |
| The four state demos ship | User, D-16 |
| Row height 48px; radii, blur and the system font from the mockup; translucency, corner rounding and shadows by the mockup comparison review | User, D-17 |
| The Add loader is a spinner in the Add panel that replaces the Add icon; while it shows, Enter and the Add icon do nothing (was DD-11) | User, D-20 |
| The state demos appear only once a user is picked; they are client-only view states that never call the API or change stored data; Show loading shows the list indicator for 900 ms and returns to the real list; Show empty list holds until the acting user changes or Show loading is activated; Retry in the demo failure modal only closes it (was DD-09) | User, D-21 |
| The switcher placeholder "Choose a user"; the switcher entry format `<name> (<role>)`; the over-length message "Name must be 100 characters or fewer." (was DD-13) | User, D-22 |
| An admin's Borrow that names no borrower, or names someone who is not a seeded member, does not happen, changes nothing and shows the API failure modal (REQ-004.11, REQ-004.12). An action on an item that is no longer there does not happen, changes nothing and shows the API failure modal (REQ-012.16). A request with a missing, malformed or unknown acting identity, made through the interface, shows the Access denied modal (REQ-001.6 to REQ-001.8). These are the behaviours, and they are the user's; the codes that carry them are in the ledger (SC-01, SC-10, SC-12), each with its own decider | User, D-24 |
| A failed fetch of the equipment list shows the API failure modal, and Retry repeats the fetch. The alternative was a silently blank page (was DD-10) | User, D-25 |
| An Add made from the Show empty list view performs the Add and ends the view, showing the real list with the new item in it (was the PRD's open question N4) | User, D-26 |
| Each human-review criterion is verified in two steps. First an **agent pre-review**: an agent in a session started for that task, never the agent that built the candidate, with the whole conversation trail as input (the confirmed scope with its citations, every question and its answer, every decision with its decider, and the change rounds), reporting the gaps it found, each traced to the criterion and to the place in the trail the expectation came from. Second the **human review**: the user reads that report alongside the build and records the verdict. The approval is the user's, and only the user's. The report is evidence, never an approval; it can neither pass nor fail a criterion; "found none" is not clearance, and the report must say what it could not judge. The user is the reviewer (was DD-12, the drafter's default, which this supersedes). The user's words are quoted in PRD section 9 | User, D-27 |

### 10.2 Decided by a PRD clause

| Decision | Decider |
|---|---|
| "Confirmed" is the back-end carrying out the action (observed as SC-02). A refused request opens the Access denied modal, including a refused list fetch. Any other failure, including a request that never reaches the server (a network failure), is a failure and opens the API failure modal | PRD clause, section 4 ("Confirmed", "Refused", "Rejected, fails": "or is not carried out for any other reason", "API failure modal", "Access denied modal"); for the Access denied modal on a missing, malformed or unknown identity, also the user's acceptance, D-24 |
| A list fetch fails when the back-end does not return the list for a reason other than lack of permission, and a request that never arrives is such a failure; a list fetch that is refused is not a failure and is handled as REQ-001.6 to REQ-001.8 describe | PRD clause, section 4 ("List fetch"), REQ-013.23 to REQ-013.26 |
| A tooltip is the `title` attribute and an accessible label is the `aria-label`, as in the mockup | PRD clause, REQ-014 source note, REQ-014.9, REQ-014.10 |
| A member naming the admin as borrower is refused (SC-06), not rejected (SC-03). The register therefore verifies it once, under REQ-003.6; the REQ-005.3 row covers an admin's request only | PRD clause, REQ-003.6 as written and the notes under REQ-003 and REQ-005 |
| The inline validation message is inside the Add panel, below the Add field, and not in a modal. The checks of section 12.8.1 apply the PRD's own geometric definition: the top of the message is not above the lower edge of the field, the message does not overlap the field, and it lies within the bounds of the Add panel | PRD clause, section 4 ("Inline validation message"), REQ-009.4, REQ-009.5, REQ-009.8, REQ-009.11 |
| The operational server log is not a record | PRD clause, section 4 ("Record") |
| A review row passes when the user finds a match, or finds none. The user's record decides it; the pre-review report decides nothing | PRD clause, REQ-015.4 to REQ-015.6 ("the reviewer finds that ... matches") and the REQ-017 flow ("finds no screen, control or message"); section 4 ("Human review"), D-27 |
| What a pre-review report is, what it is given and what it must say plainly | PRD clause, section 4 ("Agent pre-review", "Conversation trail", "Gap", "Pre-review report", "Human review") |

### 10.3 Recorded defaults (kept from `technical-rev41.md`, as the earlier blueprint carried them)

| Decision | Decider |
|---|---|
| Two layers; `routes` to `rules` to `db`; one `equipment` table with a borrower column and a check; REST/JSON under `/api`; every mutation answers 200 with the item | Recorded default, `technical-rev41.md` sections 2 and 7 |
| Python 3.12, FastAPI, SQLAlchemy 2, psycopg 3, PostgreSQL 16, Docker Compose with `db`, `api`, `web` (nginx), named volume, non-root API | Recorded default, `technical-rev41.md` sections 1 and 7 |
| pytest, Vitest with React Testing Library, Playwright; test titles carry the criterion label (where the label sits in the title, and the test ID, are DD-24) | Recorded default, `technical-rev41.md` sections 3 and 4 |
| 404 for an unknown item id (SC-10). This is the code only. The behaviour it serves, that an action on an item that is no longer there does not happen and shows the API failure modal (REQ-012.16), is the user's, D-24 | Recorded default, `technical-rev41.md` section 2 |
| 403 for a member's forced return of another's loan and a member's forced delete (SC-09). No user decision names a code for these two; D-12 names 403 for the three actions it lists, and these two are the same class of refusal | Recorded default, the earlier blueprint's error mapping, kept |
| The identity is carried in the header `X-User-Id` as a decimal id, and the malformed rule of section 5.1 | Recorded default, `technical-rev41.md` security controls, kept |

### 10.4 Design defaults that rest on the drafter

**Decider for every row of this table: the drafter of this blueprint.** None is a question to the
user. Each is settled when the user accepts this blueprint at gate 6, or replaced by the user's
alternative at that point; the last column says what that would change.

| Ref | Decision | Reason | If overturned |
|---|---|---|---|
| DD-01 | Operations on an existing item take the row lock with `SELECT ... FOR UPDATE` and decide on the locked row. The earlier blueprint used a conditional `UPDATE` | The loser's answer (403, 404 or 409) is then exact, not inferred after a failed update | Any mechanism that keeps section 8's answers is acceptable |
| DD-02 | Order of checks of section 5.3. 409 for Return of an item not On loan, Mark of a non-Available item and Restore of a non-Out-of-service item (SC-11); 422 for an Add whose name is missing, not a string, empty, whitespace-only or has another field (SC-13); 422 for a path id outside 1 to 2147483647 or not an integer, and for an invalid body (SC-14); 405 and 404 for a method or a path the application does not define, to a usable identity (SC-15) | No source gives a code for these. 409 follows D-03 and D-11, and 422 follows D-03 and D-06, by analogy. 405 and 404 are the framework's defaults. None of the three behaviours that D-24 accepts is decided here; they are the user's (section 10.1) | The I tests of REQ-006, REQ-009 and REQ-010 observe only that the action was not carried out and that nothing changed; the client treats every non-403 failure alike, so no frozen test changes. Only the ledger and `routes` change |
| DD-03 | Seeded user ids are fixed: Ada Admin 1, Mia Member 2, Sam Member 3. Item ids are database identities | Tests and the client constant need stable ids | Tests, client constant |
| DD-04 | Same origin only: no CORS headers, no interactive documentation or OpenAPI route, no health route. The Compose health check calls `GET /api/users` as user 1 | D-01 says "any request"; a CORS pre-flight, a health route or a documentation route would each be answered without an identity | CORS and health routes would need D-01 to be amended |
| DD-05 | **How the API says the behaviour of REQ-004.11 and REQ-004.12.** An admin's Borrow must name a member in `borrowerId`; absent, null, non-integer or not a seeded member is 422 (SC-12). A member's `borrowerId` may be absent (meaning self) or their own id. The behaviour itself, that such a Borrow does not happen, changes nothing and shows the API failure modal, is the user's, D-24; this default decides only the request shape and the code | An admin cannot borrow for themselves (REQ-005), so the borrower must be named; the member flow has no selection (REQ-003.2). 422 is the code the user gave the neighbouring rejection of an admin as borrower (D-03), so every rejection of an admin's Borrow reads alike | I tests of REQ-003 and REQ-004 observe only that the action was not carried out and that nothing changed |
| DD-06 | The client checks the Add name (empty, whitespace-only, over 100 code points after trimming) **before it calls the server** and sends nothing when the check fails. A 422 the server gives to an Add that the check let through shows the inline message, never the failure modal | The mockup validates in the client; D-06 and REQ-009.11 need the inline message in both cases | C tests of REQ-009.4, .5, .11 |
| DD-07 | The switcher entries, and the borrower modal's members, are a constant of the client (ids 1 to 3, names, roles). `GET /api/users` exists for tests and for the S4 check that the constant equals the server's users | The switcher must list users before any identity exists, and D-01 forbids an unauthenticated list route | Fetching the list would need D-01 amended |
| DD-08 | The picked user is held in page memory only. A reload returns to the switcher | Storing it is not asked for; nothing is stored in the browser | J steps re-pick the user after a reload |
| DD-14 | Tool and library version lines of section 12.10 | Mechanisms need fixed lines | Lines move; contract unaffected |
| DD-15 | Report and evidence paths, the test directories, the paths of the two pre-review reports and of the two user's records, and the contents of the four (sections 4.1.3 and 9). Among them: a pre-review report records which build it read, when, what it was given and the session it ran in, and always has the section "What I could not judge" (`ORCHESTRATOR.md` section 4.1 asks the plan to state that the report records the build, the time and its inputs); the user's record opens with a line naming the report it read | Evidence must be a file a reader can inspect, and the order of the two steps must leave a trace in it | The eval plan may relocate the files. The report must still record the build, the time and its inputs, and the record must still show which report was read |
| DD-16 | The seed creates the three users only, no equipment | PRD section 2.1 seeds one admin and two members; sample equipment would be unrequested scope | J steps create their own items |
| DD-17 | The client reads the list on every user pick and updates it only from confirmed responses. It does not refresh after a failure and does not poll | "Nothing changes" (REQ-012.5); no live updates are asked for | none |
| DD-18 | Items are listed by `id` ascending. A name is stored trimmed | Stable order matching the mockup's append | I and U tests of REQ-009 |
| DD-19 | When a modal opens, focus moves to its first button. Escape does nothing | Keeps the modal reachable by keyboard (REQ-014.5); closing by Escape is not specified | B tests REQ-014.5 |
| DD-20 | Client wiring of section 12.7: global `fetch`, a plain-object `headers`, success is exactly status 200 | Lets frozen tests mock `fetch` and read the call | C tests |
| DD-21 | **How the client handles a name** (section 12.7). It trims with the whitespace set of Python's `str.isspace`, the server's set, and not with JavaScript's `trim()`. It counts length in Unicode code points, and never in UTF-16 units. When an Add draws a 422, it shows the over-length message if its own count of the trimmed name exceeds 100, and otherwise "Name is required." The PRD says "characters" and does not name a unit | A name that the server accepts must never be refused by the client, so a valid 100-code-point name is never rejected, and the client and the server must agree on what trimming removes. The two sets differ for U+001C to U+001F and U+0085 (the server strips them, `trim()` does not) and U+FEFF (`trim()` strips it, the server does not) | S3 and `normalise_name` change together; the REQ-009 outcome tests are unaffected |
| DD-22 | **State-demo mechanics** that support D-21 (section 12.7). The 900 ms is the global `setTimeout`, looked up when the demo is activated, so a test's fake clock controls it. Show API failure opens the ordinary API failure modal with its Retry bound to close only. Closing a demo modal leaves the page as it was | D-21 fixes the behaviour and not the mechanism; the fake clock needs a known timer | S3 only; C tests of REQ-013.13, .14, .16 |
| DD-23 | **The probe set for the malformed identity** (section 5.1.1) and the claim of where each probe can be observed. The `fullmatch` semantics of the rule | The earlier blueprint's pattern is kept; the observability analysis follows RFC 9110 section 5.5 and the Fetch API's joining of repeated header values | The U and I tests of REQ-001.7 and the J subset |
| DD-24 | **Test titles.** Every automated test begins its title with the test ID the eval plan gives it, then the criterion labels it serves (the run of `REQ-nnn.m` tokens after the ID), then a description. A test that serves no criterion by itself, the tests of the concurrency pairs that section 8 does not tie to a criterion, carries the test ID, then `CONC` and the pair, and no label. The evidence of an automated row is the passing case whose title carries the label (section 4.1). This settles two divergences between this blueprint and the eval plan: the earlier text wanted every title to begin with its criterion label, and wanted the pair tests titled `CONC` and the pair rather than with a label, while the plan gives every test an ID, the pair tests included, and puts it first. Both are settled in the plan's favour on the ID, and in this blueprint's on the rest: the ID leads, the labels follow it, and a pair test carries `CONC` and the pair and no label | The plan assigns every test an ID, the pair tests included. One test can serve several criteria (the threaded borrow test serves REQ-008.4 and REQ-008.8), so a rule that the title begins with its label has no single label to begin with, and a pair test serves none. An ID that always comes first gives every test one place to start, and keeps the lookup by label | Label first: multi-label and pair tests would then need a rule for which label leads and where the ID goes. The register would not change, because it reads "case REQ-nnn.m" by label wherever the label sits in the run |
| DD-25 | **An Add made from the Show empty list view** (D-26; section 12.7). It is an ordinary Add with the same name check, call, `add-loader` and failure handling. While it is in progress, not carried out or failed, the page stays in the view. When the server confirms it, the client appends the returned item to the list it holds and ends the view; it does not read the list again | D-26 fixes the behaviour and not the mechanism. DD-17 already says the client updates the list only from confirmed responses and does not refresh; appending the confirmed item keeps that, and the page shows every item it held before the Add together with the new one | The client reads the list again after a confirmed Add made from the view. S3 only; the C and J rows of REQ-013.18 and REQ-013.19 observe the list the person sees and do not change |

### 10.5 Former design defaults, now the user's decisions

| Ref | Was | Now |
|---|---|---|
| DD-09 | State demos (PRD open question N3) | User, D-21 |
| DD-10 | A failing list fetch (any non-200 other than 403, or a request that never arrives) shows the API failure modal, and Retry repeats the fetch. The PRD defined the failure modal for the six server-call actions only, and this was the drafter's own default with no source | User, D-25, which accepts it as scope; the PRD now carries REQ-013.23 to REQ-013.26 |
| DD-11 | The Add loader (PRD open question N1) | User, D-20 |
| DD-12 | Reviewer for R1 and R2 is Allan Pasco, the product owner, as the drafter's default and not a choice the user had stated | User, D-27: the user reads the pre-review report and records the verdict, and the approval is the user's only. The independence condition is kept (section 4.1.3) |
| DD-13 | Strings that neither source gives: the switcher placeholder, the entry format, the over-length message | User, D-22 |

## 11. Open points

### 11.1 Open questions

**None.** The PRD holds no open question (its section 8): N1 to N3 were closed by D-20 to D-23 and
N4 by D-26. This blueprint adds no question and answers none. What follows is a silence in the PRD
that this blueprint records and does not decide (11.2), and environment points that are not
questions (11.3).

### 11.2 A silence in the PRD, recorded and not decided

A need discovered while designing becomes an open point or a PRD change request and never a new
capability in the design (blueprint rubric). This is not a question put to the user by this
document. It becomes a PRD change request only if the person who owns the PRD wants the behaviour
fixed.

| Point | What the PRD does not say | What it blocks |
|---|---|---|
| GAP-1 The page around the API failure modal of a failed list fetch | REQ-013.23 to REQ-013.26 (D-25) say that the modal appears with Close and Retry, that Close does not repeat the fetch and the list indicator is not shown again, that Retry repeats the fetch with the list indicator shown while it is in progress and then shows the list or the empty text, and that a second failure shows the modal again. They do not say **whether the list indicator is removed when the modal appears** (REQ-012.14 says it for the six server-call actions, and a list fetch is not one of them), **what the page shows behind the modal**, or **what it shows after Close** other than that the list indicator is not shown | Nothing in S1, S2 or S4. In S3 the page's behaviour in those three respects is unspecified, and the builder's choice is not pinned (section 12.11). No frozen test asserts any of them: the rows of REQ-013.23 to REQ-013.26 assert only what the PRD states. If the person-visible behaviour matters, the PRD must say it, and then this blueprint adds the pin and the rows |

### 11.3 Environment points (not questions to the user)

These are not product questions and do not wait on the user. They are kept because the blueprint
rubric requires a mechanism the build environment may lack to be an open point, and the inputs do
not say what the build environment has. They are listed apart so that 11.1 stays free of questions.

| Point | What remains undecided | What it blocks |
|---|---|---|
| OP-1 Build environment | The inputs do not say whether the build environment has Docker Engine with Compose v2 and permission to stop and start containers, a PostgreSQL 16 instance for `TEST_DATABASE_URL`, and Chromium for Playwright | Without them, mechanisms D, I, B and J cannot run, so their rows would have no evidence. U and C need only Python 3.12 and Node 22 |
| OP-2 Version lines | The version lines of section 12.10 were chosen without checking the build environment's package registries | Installation in S1 to S4 only. A line that cannot be installed is reported by its story and amended here |
| OP-3 The agent pre-review sessions | D-27 fixes the condition (a session started for that task, never the agent that built the candidate, with the whole conversation trail as input). The trail is the list of section 4.1.3, which is the preparation's own record of the conversation and not a verbatim transcript. The inputs do not say how such a session is started, whether more than that list can be made available as the trail and how it is handed to that session, or whether that agent can operate the running build (open the page as Ada Admin and as Mia Member) or can only read the source and the mockup | Step 1 of R1 and R2 cannot be run until the means exist. It blocks no story's code and no other mechanism. Where the agent cannot operate the build, its report says so under "What I could not judge" (section 4.1.3), and the user's review goes on the build itself |

## 12. Interface contract (pinned)

### 12.1 Status of this section

Acceptance tests are written and frozen before any implementation exists, so they cannot use names
a builder chooses later. **Every name, shape, route, status code, locator and string in this
section is part of the contract. A builder may not change one. Everything not pinned here is the
builder's choice**, for example file names beyond those pinned, helper structure, CSS details, the
icon artwork and the order of CSS rules. A change to this section is an amendment that needs the
owners of S2 and S3 and the user's approval (section 9.2). That a name or a code is pinned does not
make it a thing a test verifies (section 4.4).

Sources of the pinned names: JSON, routes and module names are decisions of this blueprint (carried
from `technical-rev41.md` where it had them); strings come from the PRD where it gives them, from
the user's D-22 for three, and otherwise from the mockup. No string is left to a design default.

### 12.2 JSON resources and request bodies

All bodies are JSON, field names are camelCase, and a body may contain no field not listed.

**User** (`GET /api/users` returns a JSON array of these, ordered by `id`):

```json
{ "id": 1, "name": "Ada Admin", "role": "admin" }
```

`role` is `"admin"` or `"member"`. The seeded users, fixed (DD-03):

| id | name | role |
|---|---|---|
| 1 | Ada Admin | admin |
| 2 | Mia Member | member |
| 3 | Sam Member | member |

**Item** (`GET /api/equipment` returns a JSON array of these, ordered by `id`; every success of
section 12.3 returns one):

```json
{ "id": 4, "name": "Tripod", "status": "on_loan", "borrowerId": 2, "borrowerName": "Mia Member" }
```

`status` is `"available"`, `"on_loan"` or `"out_of_service"`. `borrowerId` and `borrowerName` are
integer and string when `status` is `"on_loan"` and are `null` otherwise. There is no other field:
nothing names who set a loan or who returned one (D-09). `DELETE` answers with the item as it was
just before it was removed.

**Request bodies**

| Route | Body |
|---|---|
| `POST /api/equipment` | `{"name": "<string>"}`, one field, required. The server trims it and accepts 1 to 100 characters |
| `POST /api/equipment/{item_id}/borrow` | A member sends no body (an empty object is also accepted). An admin sends `{"borrowerId": <integer>}`, required. `null`, a string or any other field is 422 (SC-12, SC-14) |
| `.../return`, `.../out-of-service`, `.../restore`, `DELETE ...` | none; a body, if sent, is ignored |

**Errors.** A 403 has an empty body. The bodies of 404, 409 and 422 are not pinned; the tests
observe the outcome and the unchanged state, and the client reads only the status. A success is
always status 200 with `Content-Type: application/json`.

### 12.3 HTTP routes

Every route requires the header `X-User-Id` (section 5.1); without a usable one it answers 403 with
an empty body, so **403 is a possible answer of every route below** and the column also names
the other 403 causes. `{item_id}` is the path parameter; it is written `{id}` in sections 5 and 8.
Each status is followed by its ledger entry (section 12.3.1).

| # | Method and path | Allowed roles | Every status it can answer |
|---|---|---|---|
| 1 | `GET /api/users` | admin, member | 200 (SC-02); 403 (SC-01) |
| 2 | `GET /api/equipment` | admin, member | 200 (SC-02); 403 (SC-01) |
| 3 | `POST /api/equipment` | admin | 200 (SC-02); 403 (SC-01 identity, or SC-08 a member); 422 (SC-05 over 100 characters after trimming; SC-13 name missing, not a string, empty or whitespace only, other field) |
| 4 | `POST /api/equipment/{item_id}/borrow` | admin, borrowing for a member; member, for themselves | 200 (SC-02); 403 (SC-01 identity, or SC-06 a member naming a borrower other than themselves); 404 (SC-10 no such item); 409 (SC-04 item not Available); 422 (SC-03 an admin naming an admin; SC-12 an admin's `borrowerId` missing, null, or not a seeded user; SC-14 `item_id` invalid or body invalid) |
| 5 | `POST /api/equipment/{item_id}/return` | admin, any loan; member, own loan | 200 (SC-02); 403 (SC-01 identity, or SC-09 a member and the loan is another's); 404 (SC-10); 409 (SC-11 item not On loan); 422 (SC-14 `item_id` invalid) |
| 6 | `POST /api/equipment/{item_id}/out-of-service` | admin | 200 (SC-02); 403 (SC-01 identity, or SC-08 a member); 404 (SC-10); 409 (SC-11 item not Available); 422 (SC-14) |
| 7 | `POST /api/equipment/{item_id}/restore` | admin | 200 (SC-02); 403 (SC-01 identity, or SC-08 a member); 404 (SC-10); 409 (SC-11 item not Out of service); 422 (SC-14) |
| 8 | `DELETE /api/equipment/{item_id}` | admin | 200 (SC-02); 403 (SC-01 identity, or SC-09 a member); 404 (SC-10); 409 (SC-07 item On loan); 422 (SC-14) |

`item_id` is valid when it is an integer from 1 to 2147483647. Other methods on these paths answer
405 and other paths answer 404, both only to a usable identity (SC-15). **These eight are the only
routes**: the builder adds none (Non-goals: no integration, no history). That is a build
instruction; no test lists the registered routes (section 4.4).

#### 12.3.1 The status-code ledger

**Custody.** The PRD (section 2.4) names these codes as the user's decisions and states none in any
criterion. They are recorded here, each with the decision that chose it, the route that answers it
(section 12.3) and the criteria whose business outcome it serves. Entries SC-01 to SC-08 are the
user's. SC-09 to SC-15 are codes no user decision names and carry their honest decider; for SC-10
and SC-12 the behaviour that the code carries is the user's (D-24) and only the code is not. **No
acceptance test asserts a code in this table, as the thing verified or as an instrument to
recognise an outcome class** (sections 4.1.1 and 4.4). A row that drives the HTTP API asserts only
that the action was carried out or was not and that nothing changed; a rules-level row may state
the class of decision the rules layer returned, which carries no code (section 4.1.1); J shows
through the real server that each class produces the right modal.

**The codes the user chose**

| Entry | Code | Case | Decided by | Route(s) (section 12.3) | Business criteria it serves |
|---|---|---|---|---|---|
| SC-01 | 403, empty body | The acting identity is missing, malformed, or not a seeded user. Every method, every path | User, D-01 for the refusal and its code; D-24 for the Access denied modal that a request made through the interface shows | middleware, so rows 1 to 8 and every undefined path | REQ-001.6, .7, .8 |
| SC-02 | 200 with the JSON item (or array) | The request is carried out. The page treats exactly this, and nothing else, as the back-end's confirmation; the list changes only after it | User, D-02 and `[Feedback 3]` ("until the back-end returns 200") | rows 1 to 8 | REQ-003.4, REQ-004.6, REQ-006.5, REQ-010.3, .6, REQ-011.7, REQ-012.3, .11 and every "once confirmed" |
| SC-03 | 422 | An admin's Borrow names an admin as the borrower | User, D-03 | row 4, as admin | REQ-005.3, REQ-005.4 |
| SC-04 | 409 | A Borrow on an item that is not Available (On loan, or Out of service) | User, D-03 | row 4 | REQ-008.2, .3, .6, .7, .8 |
| SC-05 | 422 | An Add whose name is over 100 characters after trimming | User, D-06 | row 3 | REQ-009.10, REQ-009.11 |
| SC-06 | 403, empty body | A member's Borrow names anyone but the acting member as borrower, including the admin and an unknown id | User, D-07; D-23 (N2) | row 4, as member | REQ-003.6 |
| SC-07 | 409 | A delete of an On loan item | User, D-11 | row 8 | REQ-011.8 |
| SC-08 | 403, empty body | A member's forced Add, Mark out of service or Restore | User, D-12 | rows 3, 6, 7, as member | REQ-007.3, .4, .5 |

**The other codes of the route table**

| Entry | Code | Case | Decided by | Route(s) | Business criteria it serves |
|---|---|---|---|---|---|
| SC-09 | 403, empty body | A member's forced Return of another's loan; a member's forced Delete | Recorded default (the earlier blueprint's error mapping), consistent with D-12. No user decision names a code for these two | rows 5, 8, as member | REQ-007.1, REQ-007.2 |
| SC-10 | 404 | The item is no longer there, or never existed | The behaviour (the action does not happen, nothing changes, the API failure modal appears): User, D-24. The code: Recorded default, `technical-rev41.md` section 2 | rows 4 to 8 | REQ-012.16 |
| SC-11 | 409 | A Return of an item not On loan; a Mark out of service of a non-Available item; a Restore of a non-Out-of-service item | Drafter, DD-02, by analogy to D-03 and D-11 | rows 5, 6, 7 | REQ-012.5, .6 (a failing action) |
| SC-12 | 422 | An admin's Borrow names no borrower (absent, null, not an integer) or a user who is not a seeded member | The behaviour (the Borrow does not happen, nothing changes, the API failure modal appears): User, D-24. The code and the request shape: Drafter, DD-05 | row 4, as admin | REQ-004.11, REQ-004.12 |
| SC-13 | 422 | An Add whose name is missing, not a string, empty or whitespace only, or whose body has another field | Drafter, DD-02, by analogy to D-06. The rejection of a whitespace-only name is the user's, D-13 | row 3 | REQ-009.6 |
| SC-14 | 422 | `item_id` not an integer from 1 to 2147483647; a body that is not valid JSON or not of the shape of section 12.2 | Drafter, DD-02 | rows 3 to 8 | none (input validation) |
| SC-15 | 405; 404 | A method the path does not define; a path the application does not define. Only to a usable identity | Drafter, DD-02 (the framework's default) | any other method or path | none |

**Where the client reads the code (section 12.7).** 200 updates the list. 403 opens the Access
denied modal. For an Add, 422 shows the inline message. Every other answer, and a request that
never reaches the server, opens the API failure modal. This holds for the list fetch too: 403 opens
the Access denied modal (D-24), and any other non-200, or a request that never arrives, opens the
API failure modal (D-25).

### 12.4 The ASGI application and start-up

- **Import path:** `app.main:app`. The package root is `api/`, so tests and the server run with
  `api/` as the working directory or on the import path. The module is `api/app/main.py` and `app`
  is a `fastapi.FastAPI` instance. Run as `uvicorn app.main:app --host 0.0.0.0 --port 8000
  --no-access-log`.
- **Start-up** is the application's lifespan, in this order: `config.load_settings()`; build the
  engine with `db.make_engine`; `db.initialise(engine)`; keep the engine and session factory on
  `app.state`. Shutdown disposes the engine. The module reads no setting at import time. Tests set
  `DATABASE_URL` and then enter `with TestClient(app):`; a second entry on the same database must
  leave exactly three users (REQ-016.3).
- **`app.config`:** `load_settings(environ: Mapping[str, str] | None = None) -> Settings`.
  `Settings` is a frozen dataclass with one field, `database_url: str`. `ConfigError(Exception)` is
  raised for a missing or malformed `DATABASE_URL`; its message names the setting and does not
  contain the value. `environ=None` means `os.environ`.
- **Logger:** `app.access`, one INFO record per request, in the form that section 5.4 states once
  (D-23). The builder owns it; no acceptance test reads it.

### 12.5 The rules layer: module `app.rules`

Python 3.12 signatures. Types:

```python
NAME_MAX_LENGTH = 100
Role = Literal["admin", "member"]
Status = Literal["available", "on_loan", "out_of_service"]

@dataclass(frozen=True)
class Actor:  id: int; name: str; role: Role
@dataclass(frozen=True)
class Item:   id: int; name: str; status: Status
              borrower_id: int | None; borrower_name: str | None

class RuleError(Exception): ...
class IdentityError(RuleError): ...   # routes answer 403, empty body
class Forbidden(RuleError): ...       # 403, empty body
class NotFound(RuleError): ...        # 404
class Conflict(RuleError): ...        # 409
class Invalid(RuleError): ...         # 422
```

**Pure decision functions** (no database, no HTTP; mechanism U):

| Callable | Behaviour |
|---|---|
| `parse_user_id(raw_values: Sequence[str]) -> int` | Returns the id. `IdentityError` when `raw_values` is empty (missing), has more than one value, or the one value does not fully match `^[1-9][0-9]{0,8}$` (`re.fullmatch`, section 5.1) |
| `normalise_name(raw: object) -> str` | Returns the name trimmed with `str.strip()`. `Invalid` when `raw` is not a `str`, or the trimmed name is empty or longer than `NAME_MAX_LENGTH` code points |
| `require_admin(actor: Actor) -> None` | `Forbidden` unless `actor.role == "admin"` |
| `resolve_borrower(actor: Actor, named_borrower_id: int \| None, find_user: Callable[[int], Actor \| None]) -> Actor` | Member: `Forbidden` if `named_borrower_id` is not `None` and not `actor.id`, whoever the named user is, an existing user or none (the order of section 5.3); otherwise returns `actor`. Admin: `Invalid` if `named_borrower_id` is `None`, if `find_user` returns `None`, or if the user found is an admin; otherwise returns the member |
| `check_borrowable(item: Item) -> None` | `Conflict` unless `item.status == "available"` |
| `check_return(actor: Actor, item: Item) -> None` | `Conflict` unless `item.status == "on_loan"`; then, for a member whose `actor.id != item.borrower_id`, `Forbidden`. An admin may return any loan |
| `check_delete(item: Item) -> None` | `Conflict` if `item.status == "on_loan"` |
| `check_mark_out_of_service(item: Item) -> None` | `Conflict` unless `item.status == "available"` |
| `check_restore(item: Item) -> None` | `Conflict` unless `item.status == "out_of_service"` |

**Operations** (use `app.db`, one transaction each; commit on success; roll back and re-raise on
any `RuleError`; apply the order of checks of section 5.3 and the lock of section 8; mechanisms D
and I):

| Callable | Result |
|---|---|
| `resolve_actor(session: Session, raw_values: Sequence[str]) -> Actor` | `parse_user_id`, then the user row; `IdentityError` if there is no such user |
| `list_users(session: Session) -> list[Actor]` | all users by `id` |
| `list_equipment(session: Session) -> list[Item]` | all items by `id` |
| `add_equipment(session: Session, actor: Actor, raw_name: object) -> Item` | `require_admin`, `normalise_name`, insert as `available` |
| `borrow(session: Session, actor: Actor, item_id: int, named_borrower_id: int \| None) -> Item` | `resolve_borrower`, lock the item (`NotFound`), `check_borrowable`, set `on_loan` for the borrower |
| `return_item(session: Session, actor: Actor, item_id: int) -> Item` | lock (`NotFound`), `check_return`, set `available`, clear the borrower |
| `mark_out_of_service(session: Session, actor: Actor, item_id: int) -> Item` | `require_admin`, lock (`NotFound`), `check_mark_out_of_service`, set `out_of_service` |
| `restore_item(session: Session, actor: Actor, item_id: int) -> Item` | `require_admin`, lock (`NotFound`), `check_restore`, set `available` |
| `delete_equipment(session: Session, actor: Actor, item_id: int) -> Item` | `require_admin`, lock (`NotFound`), `check_delete`, delete; returns the item as it was |

The routes map `IdentityError` and `Forbidden` to 403 with an empty body, `NotFound` to 404,
`Conflict` to 409 and `Invalid` to 422, and nothing else (the ledger, section 12.3.1).

### 12.6 The database layer: module `app.db`

| Callable | Behaviour |
|---|---|
| `make_engine(database_url: str) -> Engine` | SQLAlchemy 2 engine for a `postgresql+psycopg://` URL |
| `make_session_factory(engine: Engine) -> sessionmaker[Session]` | session factory |
| `create_schema(engine: Engine) -> None` | creates the two tables of section 7 if absent; safe to call repeatedly |
| `seed(session: Session) -> None` | inserts the three users of section 12.2 with their ids, `ON CONFLICT DO NOTHING`, and commits |
| `initialise(engine: Engine) -> None` | `create_schema`, then `seed` in its own session |
| `SEED_USERS: tuple[tuple[int, str, str], ...]` | `((1, "Ada Admin", "admin"), (2, "Mia Member", "member"), (3, "Sam Member", "member"))` |

Table and column names are those of section 7. A test that needs to read the database uses raw SQL
against them, except the dumps of the checks NA and KD, which discover the tables and columns from
the catalogue. Model class names and helper functions beyond these are the builder's. No test
verifies the names (section 4.4).

### 12.7 The web client's entry points and its calls

- `web/index.html` holds `<div id="root">`. `web/src/main.jsx` mounts the application there.
- `web/src/App.jsx` has the root component as its **default export**, `App`, taking no props. It
  renders the whole page: state demos, top bar, main area and modals. Component tests render
  `<App />`.
- The client calls the **global `fetch`**, looked up at the moment of each call (`globalThis.fetch`)
  so a test can replace it. It uses no other HTTP mechanism.
- Every call is `fetch(url, init)`. `url` is a string: the base (`import.meta.env.VITE_API_BASE_URL`
  when set, otherwise `/api`) followed by the route of section 12.3. `init` is an object with
  `method` and `headers`, where `headers` is a **plain object** holding `"X-User-Id"` (a string of
  the decimal id of the picked user). When the call has a body, `headers` also holds
  `"Content-Type": "application/json"` and `init.body` is a JSON string. A call without a body
  has no `body` key.
- Calls by action: list, `GET /api/equipment`; member Borrow, `POST .../borrow` with no body; admin
  Borrow, `POST .../borrow` with `{"borrowerId": <member id>}`; Return, Mark out of service and
  Restore, `POST` with no body; Delete, `DELETE` with no body; Add, `POST /api/equipment` with
  `{"name": "<trimmed name>"}`.
- **Success is exactly `response.status === 200`** (SC-02). Any other status, and a rejected
  `fetch`, is a non-200. The client sends nothing before a user is picked; on every pick it sends
  the list call.
- Outcome by status: 200 updates the list from the returned item; 403 opens the Access denied
  modal (D-24); for Add, 422 shows the inline validation message; every other non-200 opens the API
  failure modal (section 10.2, DD-06, SC-02). The list call follows the same rule: 403 opens the
  Access denied modal and every other non-200, or a request that never arrives, opens the API
  failure modal (D-25).
- **Timers.** The client's only timer is the global `setTimeout`, looked up at the moment of use
  (DD-22).

**The name check before an Add (DD-06, DD-21; decider: the drafter; no test asserts the method).**

1. When Enter is pressed in the Add field, or the Add icon is activated, and no Add is in progress,
   the client computes the trimmed name and checks it **before any call to the server**.
2. **Trim:** it removes from both ends the characters for which Python's `str.isspace()` is true,
   which is what the server's `str.strip()` removes: U+0009 to U+000D, U+001C to U+0020, U+0085,
   U+00A0, U+1680, U+2000 to U+200A, U+2028, U+2029, U+202F, U+205F and U+3000. JavaScript's own
   `trim()` is not used, because it also strips U+FEFF and does not strip U+001C to U+001F or
   U+0085.
3. **Count:** the length is the number of Unicode code points of the trimmed name, for example
   `Array.from(trimmed).length`, never `trimmed.length` (UTF-16 units, which counts a character
   outside the Basic Multilingual Plane twice). A valid name of 100 code points is never refused.
4. **Decide:** an empty trimmed name shows `add-validation` reading "Name is required."; a count
   over 100 shows it reading "Name must be 100 characters or fewer." (D-22). In both cases the
   client sends nothing. Otherwise it calls the server with the trimmed name.
5. **An Add that the server answers with 422** shows `add-validation`: the over-length message if
   the client's own count of the trimmed name exceeds 100, otherwise "Name is required.". It never
   opens the failure modal.
6. **While an Add is in progress** (the answer has not arrived), `add-loader` replaces `btn-add`
   (D-20), and Enter in the Add field and any activation of the Add icon are ignored entirely: no
   validation, no second call, no message (REQ-009.14).

**State demos (D-21; mechanics DD-22).** A demo is a view state held by the client. No demo calls
the API or changes the data, whether the mocked one or the real one. Show loading shows
`list-indicator` for 900 ms (the global `setTimeout`) and then the real list. Show empty list shows
`empty-state` (with `add-card` for an admin) and holds until the acting user changes or Show
loading is activated; it does not end by itself. Show API failure opens `modal-api-failure`; its
Retry only closes the modal and starts nothing, so no loader shows; its Close closes it. Show
access denied opens `modal-access-denied`; OK closes it. Closing a demo modal leaves the page as it
was. The demos are present only once a user is picked.

**An Add made from the Show empty list view (D-26; REQ-013.18 to REQ-013.22; DD-25).** It is an
ordinary Add: the same name check, the same call, the same `add-loader` and the same failure
handling as any Add. While it is in progress, and when it is not carried out because the name fails
the check, and when it fails, the page stays in the Show empty list view (`empty-state` shown,
`equipment-list` absent); a name that fails the check shows `add-validation` as REQ-009 says, and a
failure opens `modal-api-failure`, whose Retry repeats the Add with the same name. When the server
confirms the Add (status 200), the client appends the returned item to the list it holds and ends
the view: `equipment-list` shows that list, which holds every item it held before the Add and the
new one as Available, and `empty-state` is gone. The client does not read the list again.

**A failed list fetch (D-25; REQ-013.23 to REQ-013.26).** When the list call fails, `modal-api-failure`
opens with `btn-close` and `btn-retry`. `btn-close` closes it and starts nothing, so `list-indicator`
is not shown again. `btn-retry` repeats the list call with the same `X-User-Id` and shows
`list-indicator` while the repeat is pending; when it succeeds the page shows `equipment-list`, or
`empty-state` when there are no items; when it fails the modal opens again. Whether `list-indicator`
is removed when the modal appears, and what the page shows behind the modal and after Close
otherwise, are not pinned (GAP-1, section 11.2).

### 12.8 UI locators

Locators are the `data-testid` attribute unless the table says otherwise. They are the only names
the frozen web tests use for these things. Item names and member names are rendered as text, never
as HTML.

**12.8.1 Page regions and elements**

| Locator | Element | Present when |
|---|---|---|
| `state-demos` | The panel of the four state demos, headed "State demos:". First element in the document, above the top bar | A user is picked (D-21) |
| `top-bar` | The `header` element: title, "Acting as", the switcher, the role badge. Sticky | Always |
| `switcher` | The `<select>` that picks the acting user | Always |
| `switcher-placeholder` | The empty-valued option "Choose a user" (D-22). It is not a user entry | Only before a user is picked |
| `switcher-option-1`, `switcher-option-2`, `switcher-option-3` | One `<option>` per seeded user, `value` equal to the user id, text `<name> (<role>)`: "Ada Admin (admin)", "Mia Member (member)", "Sam Member (member)" (D-22) | Always |
| `role-badge` | The pill beside the switcher showing the acting user's role | A user is picked |
| `list-indicator` | The card holding a spinner and "Loading equipment…". Class `card` | While the list is fetched (the first fetch after a pick, and the repeat after Retry, REQ-013.25), and for 900 ms after Show loading (D-21) |
| `empty-state` | The card holding "No equipment yet". Class `card` | The list is empty, and after Show empty list until the acting user changes, Show loading is activated, or an Add made from the view is confirmed (D-21, D-26) |
| `add-card` | The card of the Add field (the Add panel), with the heading "Add equipment". Class `card` | Acting user is an admin and the list or the empty text is shown |
| `add-input` | The text `<input>` of the Add field | Inside `add-card` |
| `add-validation` | The inline validation message of the Add. **Placement, from the PRD's definition (section 4, "Inline validation message"; REQ-009.8):** (1) it is a DOM descendant of `add-card`; (2) it comes after `add-input` in document order; (3) laid out, the top edge of its box is not above the lower edge of `add-input`'s box and the two boxes do not overlap; (4) its whole box lies within the box of `add-card`. It is not a modal: it is not inside, and does not open, any element with role `alertdialog`. (3) and (4) are the PRD's own geometry and a test applies them by `getBoundingClientRect()` in B, where there is a layout engine; (1) and (2) are what C can apply, by the DOM, in jsdom, which has none. The rows are REQ-009.4, .5, .8 and .11 and REQ-013.20 and .21 | A validation failure of Add, including in the Show empty list view |
| `add-loader` | The spinner that replaces `btn-add` while an Add is in progress (D-20) | During an Add |
| `equipment-list` | The container of the rows, headed "Equipment" | The list has at least one item and is shown |
| `row` | One list row, class `card row`, with `data-item-id="<item id>"`. 48px high | One per item |
| `row-name` | The item's name, inside `row` | Per row |
| `row-status` | The status badge, inside `row`; its text is one of the three statuses | Per row |
| `row-loader` | The spinner that replaces the row's icon buttons during Borrow, Return, Delete, Mark out of service and Restore. The row height does not change | During those actions, on that row only |

**12.8.2 Icon controls.** Each is a `<button type="button">` whose only content is one inline
`<svg>`; it has no text node. `title` is the tooltip and `aria-label` the accessible label. The
two are equal except for the four state demos. The **fifteen icon buttons** are the eleven icon
controls and the four state demos (PRD section 4, "Icon button").

| Control | `data-testid` | `title` and `aria-label` | Appears |
|---|---|---|---|
| Borrow | `btn-borrow` | Borrow | On Available rows |
| Return | `btn-return` | Return | On On loan rows |
| Mark out of service | `btn-out-of-service` | Mark out of service | On Available rows, admin |
| Restore | `btn-restore` | Restore | On Out of service rows, admin |
| Delete (x) | `btn-delete` | Delete | On rows that are not On loan, admin |
| Add | `btn-add` | Add equipment | In `add-card`, admin; replaced by `add-loader` during an Add |
| Close | `btn-close` | Close | Borrower modal, API failure modal |
| Retry | `btn-retry` | Retry | API failure modal |
| OK | `btn-ok` | OK | Access denied modal |
| Cancel | `btn-cancel` | Cancel | Confirm-delete modal |
| Confirm | `btn-confirm` | Confirm delete | Confirm-delete modal |
| Show loading | `demo-loading` | `title` "Loading"; `aria-label` "Show loading" | `state-demos` |
| Show empty list | `demo-empty` | `title` "Empty list"; `aria-label` "Show empty list" | `state-demos` |
| Show API failure | `demo-api-failure` | `title` "API failure"; `aria-label` "Show API failure" | `state-demos` |
| Show access denied | `demo-access-denied` | `title` "Access denied"; `aria-label` "Show access denied" | `state-demos` |

Next to each demo button the panel shows a text label: "Loading", "Empty", "API failure",
"Access denied" (mockup). A **member button** of the borrower modal is a `<button type="button">`
with `data-testid="member-button-<member id>"` (that is `member-button-2` and `member-button-3`),
an inline `<svg>` and the member's name as text, `title` and `aria-label` "Borrow for <member name>".

**12.8.3 The control inventory (REQ-017.18).** Every `button`, `input`, `select`, `a`, `textarea`
and every element with a `tabindex` or a button role that exists in any state is one of: `switcher`;
`add-input` and `btn-add`; the eleven icon controls (`btn-borrow`, `btn-return`,
`btn-out-of-service`, `btn-restore`, `btn-delete`, `btn-add`, `btn-close`, `btn-retry`, `btn-ok`,
`btn-cancel`, `btn-confirm`); `member-button-<id>`; and the four demos (`demo-loading`,
`demo-empty`, `demo-api-failure`, `demo-access-denied`). Nothing else. A test selects "icon
buttons" as `button:not([data-testid^="member-button-"])`, which are the fifteen.

**12.8.4 Modals.** Four modals; at most one is open at a time. Each is an element with
`role="alertdialog"` and its `data-testid` below, holding `modal-title` and `modal-body` and the
buttons shown. The modal element itself carries the 16px radius.

| Modal | `data-testid` | Buttons inside |
|---|---|---|
| Borrower | `modal-borrower` | `member-button-2`, `member-button-3`, `btn-close` |
| Confirm delete | `modal-confirm-delete` | `btn-cancel`, `btn-confirm` |
| API failure (also for a failed list fetch, D-25) | `modal-api-failure` | `btn-close`, `btn-retry` |
| Access denied | `modal-access-denied` | `btn-ok` |

### 12.9 Exact on-screen strings

Taken from the PRD where it gives them, from the user's D-22 for three, otherwise from the mockup.
"–" is U+2013 and "…" is U+2026.

| Where | Exact text | Source |
|---|---|---|
| Page title (`h1` in `top-bar`) | Shared Equipment | mockup |
| Switcher label | Acting as | mockup |
| Switcher placeholder | Choose a user | PRD REQ-001.10; D-22 |
| Switcher entry | `<name> (<role>)`, for example "Ada Admin (admin)" | PRD REQ-001.11; D-22 |
| Role badge | admin, member | mockup |
| State demos heading | State demos: | mockup |
| Add panel heading; list heading | Add equipment; Equipment | mockup |
| Add field placeholder | Equipment name, then press Enter | mockup |
| Inline message, empty or whitespace-only name | Name is required. | mockup |
| Inline message, name over 100 characters | Name must be 100 characters or fewer. | PRD REQ-009.15; D-22 |
| Row status | Available; On loan – `<member name>`; Out of service | PRD REQ-002.2 |
| List indicator | Loading equipment… | mockup |
| Empty state | No equipment yet | PRD REQ-013.2 (the mockup's full stop and admin hint are not built) |
| Icon controls and demos | the `title` and `aria-label` of 12.8.2 | mockup; PRD REQ-014.10 for the demos |
| Borrower modal | title "Who is borrowing?"; body "Choose a member for `<item name>`." | mockup |
| Member button | text `<member name>`; `title` and `aria-label` "Borrow for `<member name>`" | mockup; PRD REQ-014.9 |
| Confirm-delete modal | title "Delete `<item name>`?"; body "This removes the equipment from the list." | mockup |
| API failure modal (the same text for a failed list fetch: it is the same modal, D-25) | title "Request failed"; body "The server returned an error. Nothing was changed." | mockup |
| Access denied modal | title "Access denied"; body "You do not have permission" | PRD REQ-007.6 for the body (the mockup adds " to do that."); mockup for the title |
| System font stack | `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", system-ui, sans-serif` | PRD section 4 |

### 12.10 Tool and library versions the mechanisms need (DD-14)

A line is major.minor. The story that installs it commits a lockfile with the exact patch; a
builder may take a newer patch inside the line and may not change the line. These lines were
chosen without checking the build environment's registries (OP-2).

| Tool | Line | Used by |
|---|---|---|
| Python | 3.12 | S1, S2 |
| FastAPI | 0.115 | S2 |
| Uvicorn | 0.32 | S2, S4 |
| SQLAlchemy | 2.0 | S1 |
| psycopg | 3.2 (`psycopg[binary]`) | S1 |
| pytest; httpx (for `TestClient`) | 8.3; 0.27 | U, D, I |
| PostgreSQL | 16 (image `postgres:16`) | D, I, J |
| Node.js | 22 LTS | S3, S4 |
| React | 18.3 | S3 |
| Vite; `@vitejs/plugin-react` | 5.4; 4 | S3 |
| Vitest; jsdom | 2.1; 25 | C |
| `@testing-library/react`; `user-event`; `jest-dom` | 16; 14; 6 | C |
| Playwright (`@playwright/test`), Chromium | 1.48 | B, J |
| nginx | 1.27 (`nginx:1.27-alpine`) | S4 |
| Docker Engine; Compose | 24 or later; v2 (`docker compose`) | S4, J |

The front end is JavaScript, not TypeScript. No test reads the package manifest (D-18, section
4.4).

### 12.11 What is not pinned

File and folder names not listed in this section or in section 9.1; helper and component names,
except `App`; how components are split; state management inside React; CSS class names other than
`card` and `row`; icon artwork; colours not named by the mockup values the PRD fixes; SQLAlchemy
model class names; the internal structure of routes and middleware; and test fixtures. These are
the builder's choice within the requirements and the boundaries above.

Also not pinned, because the PRD is silent (GAP-1, section 11.2): whether `list-indicator` is
removed when the API failure modal of a failed list fetch appears, what the page shows behind that
modal, and what it shows after Close other than that `list-indicator` is not shown again
(REQ-013.24). No frozen test asserts any of them.

## 13. Production concerns excluded

The scope is a bounded trial. The PRD supplies no availability, latency, scale, backup or
retention figure, and none is invented here. Each of these stays out of scope and would need a
scope amendment: real authentication and passwords (a non-goal), TLS, a production deployment
target and its secret store, backups, monitoring and alerting, rate limiting, a database migration
tool, cross-origin access, browsers other than Chromium in the test mechanisms, and security
verification beyond the controls of section 5 (D-19).
