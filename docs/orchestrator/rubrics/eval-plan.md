# Rubric: the eval plan and stories

Standard to match: `docs/eval-plan.md`. This is the artifact that gets frozen, so it is the one
with the strictest rules. A drafter receives this file, the approved PRD and the approved
blueprint. It does not receive an implementation, and it never sees a reference implementation of
the application: tests written against existing code describe that code instead of the
requirement.

## What a test may assert

The plan exists to show that **every business requirement is delivered**, and nothing else. A test
may run at any level and may use any surface to observe an outcome — a function, the HTTP API, the
database, the browser. What its **Then** asserts must be something a business requirement claims.

Never assert, in any row: an HTTP status code, a table or column shape, a log line's format, a
module, function, file or locator name as the thing under test, whether a particular call was or
was not made, or the presence of a library, framework or build tool. Those are the blueprint's
record. A row that can only be written by naming one of them is testing the implementation, and
the business outcome it was meant to protect needs a different row.

Two consequences worth stating, because they are easy to get wrong:

- A refusal is observable as a refusal: the action does not happen, nothing changes, and the user
  is shown whatever the PRD says they are shown. That is the assertion, not the code.
- "Nothing is recorded about who did it" is a business requirement, and a test may read the data
  store to check it. It asserts that no stored value identifies the actor — not that the schema has
  exactly two tables with exactly these columns.

## Conventions

- **Test IDs.** `T-<req>-P<n>` for a positive test, `T-<req>-N<n>` for a negative one. The
  requirement number in the ID is the trace, and it is the ID the PRD gave that requirement.
  **This plan never creates or changes a requirement ID.** A test that needs a requirement the
  PRD does not number is a gate-3 failure: report it and stop rather than numbering it here.
  Test IDs are stable and never reused, and each test's title in code starts with its ID.
- **Kinds.** `unit` (one exported function), `integration` (one entry point against real files,
  a real database or a real process), `e2e` (a user journey through the running application),
  `restraint` (the application does only what was asked), `production` (it starts, configures and
  runs as specified), `review` (named human or agent judgment, where no automated check exists).
- **Renderings.** Each test gets one Given / When / Then sentence in plain English. It names user
  actions and observable results, not function names.

## The test table

One row per test, grouped under its requirement:

| ID | Given / When / Then | Kind | Owner story | State before the build |
|---|---|---|---|---|

**State before the build** is mandatory and is the field that makes a freeze safe. Allowed values:

- `fails: <what it reports>` — the expected failure before the feature exists. Most tests.
- `passes: <why>` — it already holds (a restraint test over an empty scaffold, for example).
- `cannot run: <what is missing>` — it needs something no story has created yet. A test that
  cannot run at freeze time must be owned by a story that creates what it needs, and that
  dependency must be stated.

## Coverage rules, checked in both directions

1. Every `REQ-nn` has at least one `P` test and at least one `N` test.
2. Every test names exactly one requirement, and that requirement exists.
3. Every acceptance criterion in the PRD appears in at least one test's Given/When/Then, or in the
   gaps section with a reason.
4. Every verification-register row in the blueprint has a test or a named review here.

A failure in any direction is a blocker. Coverage one way is the common mistake: tests that look
thorough and leave two requirements untested, or tests nobody asked for.

## Rows verified by a person

A `review` row states: the agent pre-review that runs first and what it is given, including the
conversation trail; what the person reads; what the person records; and the condition under which
the criterion fails. The person's record is the pass condition — a verdict of "does not match", a
described finding, or a missing or incomplete record all fail, and a row never passes by default.
The pre-review's report is an input the row names, never a result the row asserts, and the row says
plainly that the agent's "found none" does not close anything.

## Restraint tests

At least one per surface. They assert the absence of what was never requested:

- No control exists outside the places the PRD names, and no unnamed control exists anywhere.
- No network request to an origin the blueprint does not name, and no write request the PRD does
  not describe.
- Nothing is stored that the PRD does not describe.
- Text that comes from data is never treated as a control or executed.

Restraint tests judge structure, not wording. A row whose label happens to read like a feature
name is data, not a violation.

## Commands

The exact commands that run the suite, in order, including install, and what each requires to be
present. These commands are what the freeze pins. The branch's own scripts are never used in their
place. If a command needs a browser or a database, say how it is provisioned.

## Stories

| Story | Owns these files | Depends on | Tests it must turn green |
|---|---|---|---|

- Scope is disjoint: two stories never own the same file.
- No story's tests depend on files a later story creates.
- One story is one coherent change. If its test list spans unrelated requirements, split it.
- Every test in the plan is owned by exactly one story.

## Gaps, and what cannot be tested as written

Two explicit sections, and they are not optional:

- **Gaps.** Every acceptance criterion with no test, and why.
- **Untestable as written.** Every criterion that cannot be checked as the PRD states it, with the
  wording change that would make it testable. Record it; do not fix the PRD here and do not invent
  a definition to make it pass.

## Counts

Totals per requirement and overall: positive, negative, by kind, and how many are expected to fail
before the build. The count is how a reader checks the plan against itself.

## Checker's verdict

Report: requirements missing a P or an N test, tests with no or an unknown requirement, criteria
absent from both the tests and the gaps, register rows with no test, tests with no owner story,
tests with no state-before-the-build value, overlapping story scope, tests depending on a later
story's files, and whether the gaps and untestable sections exist at all. Any entry is a blocker.
