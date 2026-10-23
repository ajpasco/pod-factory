# story-8: coordination without a human in it

You are the builder for story eight. Keep every human approval exactly where it is and remove the
hand-work around it: a record that lands should make the checks run again by itself, and the reviewer
should be dispatched without anyone asking. This file is your brief; `story start` and gate-check read the three lists below
exactly, so they are kept as plain lists with no blank line between a label and its entries.

**Authority:** an approved requirement, REQ-19 Operations, together with the approver's explicit
request of 2026-10-15: human approvals stay where they are required, the coordination around them
is automated. Nothing outside that authority is in this story. If you find something worth adding,
write it in `.factory/work/backlog.md` with the date and do not build it; if you believe the story
cannot be finished without it, stop and ask the orchestrator rather than widening the work. An
implementation detail inside this story is yours to settle; new user-visible behavior, a new
integration or a material tradeoff is a decision for the approver.

Tests:
- packages/cli/test/coordination.test.ts

Scope:
- packages/cli/src/check-runner/relay.ts
- packages/cli/src/commands/story.ts
- packages/cli/test/coordination.test.ts

Inputs:
- docs/TECH-SPEC.md
- docs/eval-plan.md

## What done means

T-19-P6 and T-19-N7 in `packages/cli/test/coordination.test.ts` pass, and every other locked test still passes. The tests are locked by approved hash before they reach main: you bring your own test file
across with `git checkout pod-factory/frozen-tests -- <path>` — not with an editor, which the
hook refuses for a locked path — and you cannot change it. One byte of difference and
lock-guard refuses the pull request. Read them first; each one names the
eval-plan row it implements.

## What to build

1. **The relay re-runs the checks.** When an approval, amendment or review record lands naming an
   open pull request, the relay runs gate-check for it - and verify when the record is one that can
   change verify's verdict, which is what stops a story's first push needing a manual re-run. The
   relay already exists and already dispatches: extend it, do not invent a second path.
2. **The reviewer is dispatched automatically** when a story branch is pushed, as a separate local
   session, never the session that wrote the code. A review bundle produced by the builder's own
   session is refused, by the identity in the bundle, not by trust.
3. **Idempotent.** Two records landing together must not leave two conflicting runs; the newest run
   decides, as it does today.

## Constraints

The workflow permission change this needs is staged at `.factory/work/story-8/workflows/relay.yml`
for the approver to apply. Do not edit anything under `.github/`. Nothing here writes an approval, a
lock or a revocation.

## Before you finish

- Run the locked commands from the repository root. Every locked test passes, your own included.
  Nothing is allowed to fail, and gate-check refuses a candidate whose own test file is absent
  or differs by one byte from what was approved.
- `npm run lint` and `npm run typecheck` from the repository root. Prettier only through
  `npm run lint`, never from inside a package over other folders.
- Delete `.factory/work/reports/` before you commit. An agent's report must never land in the tree.
- Touch nothing outside the Scope list and your own story folder. The locked tests are not yours to
  change, and you should not need to.
- Write your handoff note at `.factory/work/story-8/handoff.md`: done, left, open questions, next
  step. `story finish` refuses without it.
- Your prose is not evidence. The verify job's run on the pull request is.
