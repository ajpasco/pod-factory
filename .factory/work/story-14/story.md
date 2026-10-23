# story-14: the production checks

You are the builder for story fourteen. Make each production check the contract names run against
the threshold the contract states, and record the number it met - not merely that it ran. This file is your brief; `story start` and gate-check read the three lists below
exactly, so they are kept as plain lists with no blank line between a label and its entries.

**Authority:** an approved requirement — REQ-27's production checks, each against the threshold
the contract states. Nothing outside that authority is in this story. If you find something worth
adding, write it in `.factory/work/backlog.md` with the date and do not build it; if you believe
the story cannot be finished without it, stop and ask the orchestrator rather than widening the
work. An implementation detail inside this story is yours to settle; new user-visible behavior, a
new integration or a material tradeoff is a decision for the approver.

Tests:
- packages/tracker/test/production.test.ts

Scope:
- packages/tracker/src/**
- packages/tracker/scripts/**
- packages/tracker/test/production.test.ts

Inputs:
- docs/PRD.md
- docs/spec/threat-review-and-production-readiness.md

## What done means

T-27-P3 and T-27-N3 in `packages/tracker/test/production.test.ts` pass, and every other locked test still passes. The tests are locked by approved hash before they reach main: you bring your own test file
across with `git checkout pod-factory/frozen-tests -- <path>` — not with an editor, which the
hook refuses for a locked path — and you cannot change it. One byte of difference and
lock-guard refuses the pull request. Read them first; each one names the
eval-plan row it implements.

## What to build

Each check, with the threshold from the approved contract, reported as the measured value beside the
limit: dependency audit clean at high and critical; secret scan clean; the list endpoint's p95 under
its stated limit at the seeded row count; cold start under its limit; accessibility with no serious
or critical violation on the approved screens; configuration documented with fail-fast; the migration
run recorded against an empty database; structured logs carrying a request id and no personal data; a
built artifact that runs from `node`; and a smoke script that signs in, lists and exits non-zero on
any failure, with the documented rollback rehearsed once.

## Constraints

A check that cannot meet its threshold is a finding for the approver, not a threshold to adjust: the
numbers are the contract's. Report the measurement; never pass a check by widening its limit.

## Before you finish

- Run the locked commands from the repository root. Every locked test passes, your own included.
  Nothing is allowed to fail, and gate-check refuses a candidate whose own test file is absent
  or differs by one byte from what was approved.
- `npm run lint` and `npm run typecheck` from the repository root. Prettier only through
  `npm run lint`, never from inside a package over other folders.
- Delete `.factory/work/reports/` before you commit. An agent's report must never land in the tree.
- Touch nothing outside the Scope list and your own story folder. The locked tests are not yours to
  change, and you should not need to.
- Write your handoff note at `.factory/work/story-14/handoff.md`: done, left, open questions, next
  step. `story finish` refuses without it.
- Your prose is not evidence. The verify job's run on the pull request is.
