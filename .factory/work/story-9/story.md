# story-9: the pre-build gap review

You are the builder for story nine. Make REQ-26's review a condition of gate 2 rather than a habit:
`approve 2` requires a recorded gap review over the PRD, the mockup and the architecture, with every
finding dispositioned, and refuses while one blocking finding is open. This file is your brief; `story start` and gate-check read the three lists below
exactly, so they are kept as plain lists with no blank line between a label and its entries.

**Authority:** an approved requirement — REQ-26. Nothing outside that authority is in this story.
If you find something worth adding, write it in `.factory/work/backlog.md` with the date and do
not build it; if you believe the story cannot be finished without it, stop and ask the
orchestrator rather than widening the work. An implementation detail inside this story is yours to
settle; new user-visible behavior, a new integration or a material tradeoff is a decision for the
approver.

Tests:
- packages/cli/test/gap-review.test.ts

Scope:
- packages/cli/src/commands/approve.ts
- packages/cli/src/records/format.ts
- packages/cli/test/gap-review.test.ts

Inputs:
- docs/PRD.md
- docs/spec/phase-1b-gap-review.md

## What done means

T-26-P1 and T-26-N1 in `packages/cli/test/gap-review.test.ts` pass, and every other locked test still passes. The tests are locked by approved hash before they reach main: you bring your own test file
across with `git checkout pod-factory/frozen-tests -- <path>` — not with an editor, which the
hook refuses for a locked path — and you cannot change it. One byte of difference and
lock-guard refuses the pull request. Read them first; each one names the
eval-plan row it implements.

## What to build

1. **What gate 2 requires**: a review bound to the documents gate 2 binds, naming every area REQ-26
   lists, with each finding dispositioned blocking, deferred or dismissed with a reason. The approval
   record then references the review.
2. **The refusal**: one open blocking finding refuses `approve 2` and names the finding. Nothing is
   written.
3. **The format already in use.** Phase 1b's own gap review is `docs/spec/phase-1b-gap-review.md`,
   written by hand before this story existed, and gate 2 binds it because it binds every
   `docs/spec/*.md`. Read it as the shape to accept, and accept a review recorded through story 4's
   path as well, so the manual form is not the only one.

## Constraints

Do not change what gate 2 binds. Do not make this check read the eval plan. A review that is absent
must refuse; a review with an open blocking finding must refuse by name; nothing else about
`approve 2` changes.

## Before you finish

- Run the locked commands from the repository root. Every locked test passes, your own included.
  Nothing is allowed to fail, and gate-check refuses a candidate whose own test file is absent
  or differs by one byte from what was approved.
- `npm run lint` and `npm run typecheck` from the repository root. Prettier only through
  `npm run lint`, never from inside a package over other folders.
- Delete `.factory/work/reports/` before you commit. An agent's report must never land in the tree.
- Touch nothing outside the Scope list and your own story folder. The locked tests are not yours to
  change, and you should not need to.
- Write your handoff note at `.factory/work/story-9/handoff.md`: done, left, open questions, next
  step. `story finish` refuses without it.
- Your prose is not evidence. The verify job's run on the pull request is.
