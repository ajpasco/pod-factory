# story-11: the tracker skeleton

You are the builder for story eleven, the first story of the reference application. Build the
smallest server the rest of the application can stand on, with no framework: `node:sqlite` for
storage, one migration, configuration from the environment, a health endpoint and one structured log
line per request. The workspace and its passing scaffold test already exist from the transition
window; you are filling it in, not creating it. This file is your brief; `story start` and gate-check read the three lists below
exactly, so they are kept as plain lists with no blank line between a label and its entries.

**Authority:** approved scope — PRD section 3, the reference application. The skeleton is the
technical dependency every later tracker story rests on, and it carries no user-visible behavior
of its own beyond the health endpoint the production checks require. Nothing outside that
authority is in this story. If you find something worth adding, write it in
`.factory/work/backlog.md` with the date and do not build it; if you believe the story cannot be
finished without it, stop and ask the orchestrator rather than widening the work. An
implementation detail inside this story is yours to settle; new user-visible behavior, a new
integration or a material tradeoff is a decision for the approver.

Tests:
- packages/tracker/test/skeleton.test.ts

Scope:
- packages/tracker/src/**
- packages/tracker/test/skeleton.test.ts

Inputs:
- docs/PRD.md
- docs/TECH-SPEC.md

## What done means

T-27-P4 and T-27-N5 in `packages/tracker/test/skeleton.test.ts` pass, and every other locked test still passes. The tests are locked by approved hash before they reach main: you bring your own test file
across with `git checkout pod-factory/frozen-tests -- <path>` — not with an editor, which the
hook refuses for a locked path — and you cannot change it. One byte of difference and
lock-guard refuses the pull request. Read them first; each one names the
eval-plan row it implements.

## What to build

1. An HTTP server on `node:http`: no framework, and no dependency that is not already in the
   lockfile.
2. `node:sqlite` for storage, with **one** versioned migration that creates the single business table
   and is idempotent: running it twice changes nothing and says so.
3. A seed used by development and by tests, with a fixed row count the tests can rely on.
4. Configuration from the environment only, with documented defaults, failing fast and naming the
   variable when a required one is missing.
5. `/healthz`, and one structured JSON log line per request: method, path, status, duration, request
   id. Errors log a stack and never personal data.

## Constraints

No framework, no ORM, no new dependency: a dependency the phase did not approve costs an amendment,
and the lockfile is locked. Keep the scaffold test passing. Everything you write carries its trace
tag naming the requirement it serves - story 5's check is running by now.

## Before you finish

- Run the locked commands from the repository root. Every locked test passes, your own included.
  Nothing is allowed to fail, and gate-check refuses a candidate whose own test file is absent
  or differs by one byte from what was approved.
- `npm run lint` and `npm run typecheck` from the repository root. Prettier only through
  `npm run lint`, never from inside a package over other folders.
- Delete `.factory/work/reports/` before you commit. An agent's report must never land in the tree.
- Touch nothing outside the Scope list and your own story folder. The locked tests are not yours to
  change, and you should not need to.
- Write your handoff note at `.factory/work/story-11/handoff.md`: done, left, open questions, next
  step. `story finish` refuses without it.
- Your prose is not evidence. The verify job's run on the pull request is.
