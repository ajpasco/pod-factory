# story-15: the browser journeys and permission cases

You are the builder for story fifteen. Run every approved journey end to end in a real browser, with
its failure and permission cases, and put the run's own output in the evidence bundle. This file is your brief; `story start` and gate-check read the three lists below
exactly, so they are kept as plain lists with no blank line between a label and its entries.

**Authority:** an approved requirement — REQ-27's end-to-end journeys with their failure and
permission cases. Playwright and its browsers are the named technical dependency, approved with
the phase's lock. Nothing outside that authority is in this story. If you find something worth
adding, write it in `.factory/work/backlog.md` with the date and do not build it; if you believe
the story cannot be finished without it, stop and ask the orchestrator rather than widening the
work. An implementation detail inside this story is yours to settle; new user-visible behavior, a
new integration or a material tradeoff is a decision for the approver.

Tests:
- packages/tracker/test/journeys.test.ts

Scope:
- packages/tracker/src/**
- packages/tracker/playwright/**
- packages/tracker/test/journeys.test.ts

Inputs:
- docs/PRD.md
- docs/eval-plan.md

## What done means

T-27-P1 and T-27-N1 in `packages/tracker/test/journeys.test.ts` pass, and every other locked test still passes. The tests are locked by approved hash before they reach main: you bring your own test file
across with `git checkout pod-factory/frozen-tests -- <path>` — not with an editor, which the
hook refuses for a locked path — and you cannot change it. One byte of difference and
lock-guard refuses the pull request. Read them first; each one names the
eval-plan row it implements.

## What to build

1. Each approved journey driven by Playwright against the built application: sign in, see the list,
   open a detail, make the change the role allows.
2. The failure cases and the permission cases, including a viewer's refused write and a signed-out
   visitor's redirect.
3. At 375 and 1280 pixels wide, with each screen's loading, empty and error state asserted and the
   journey completable by keyboard with visible focus.
4. Screenshots and results into the run's bundle, where the evidence path already puts them.

## Constraints

`@playwright/test` is in the lockfile from the transition window; the browsers are installed by the
job on the runner, as eval-plan section 5 records. Add no dependency. The journey test file is
locked: drive it, do not edit it.

## Before you finish

- Run the locked commands from the repository root. Every locked test passes, your own included.
  Nothing is allowed to fail, and gate-check refuses a candidate whose own test file is absent
  or differs by one byte from what was approved.
- `npm run lint` and `npm run typecheck` from the repository root. Prettier only through
  `npm run lint`, never from inside a package over other folders.
- Delete `.factory/work/reports/` before you commit. An agent's report must never land in the tree.
- Touch nothing outside the Scope list and your own story folder. The locked tests are not yours to
  change, and you should not need to.
- Write your handoff note at `.factory/work/story-15/handoff.md`: done, left, open questions, next
  step. `story finish` refuses without it.
- Your prose is not evidence. The verify job's run on the pull request is.
