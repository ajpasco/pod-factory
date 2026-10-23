# story-13: the list, the detail and their states

You are the builder for story thirteen. Build the two screens the mockup approves - the list and the
detail - each with its loading, empty and error state, and with the role rules visible in what they
offer and enforced where it matters. This file is your brief; `story start` and gate-check read the three lists below
exactly, so they are kept as plain lists with no blank line between a label and its entries.

**Authority:** approved requirements — REQ-23's screen states and REQ-27's journeys, bound to the
approved mockup: the list, the detail, and each one's loading, empty and error state. Nothing
outside that authority is in this story. If you find something worth adding, write it in
`.factory/work/backlog.md` with the date and do not build it; if you believe the story cannot be
finished without it, stop and ask the orchestrator rather than widening the work. An
implementation detail inside this story is yours to settle; new user-visible behavior, a new
integration or a material tradeoff is a decision for the approver.

Tests:
- packages/tracker/test/screens.test.ts

Scope:
- packages/tracker/src/**
- packages/tracker/test/screens.test.ts

Inputs:
- docs/PRD.md
- docs/TECH-SPEC.md

## What done means

T-27-P6, T-27-P7 and T-27-N8 in `packages/tracker/test/screens.test.ts` pass, and every other locked test still passes. The tests are locked by approved hash before they reach main: you bring your own test file
across with `git checkout pod-factory/frozen-tests -- <path>` — not with an editor, which the
hook refuses for a locked path — and you cannot change it. One byte of difference and
lock-guard refuses the pull request. Read them first; each one names the
eval-plan row it implements.

## What to build

1. The list and the detail view, server-rendered, matching the approved mockup's structure and
   interaction behaviour - not its pixels.
2. Each screen's loading, empty and error state, reachable and asserted.
3. The editor may create and edit; the viewer may only read, and a viewer's write is refused by the
   server with the reason, not merely hidden in the page.
4. Markup that allows no horizontal scroll and no clipped control at 375 and 1280 pixels wide; the
   browser run proves it in story 15.

## Constraints

No client framework and no new dependency. Keep every earlier story's tests passing: the screens are
added behaviour, not a rewrite.

## Before you finish

- Run the locked commands from the repository root. Every locked test passes, your own included.
  Nothing is allowed to fail, and gate-check refuses a candidate whose own test file is absent
  or differs by one byte from what was approved.
- `npm run lint` and `npm run typecheck` from the repository root. Prettier only through
  `npm run lint`, never from inside a package over other folders.
- Delete `.factory/work/reports/` before you commit. An agent's report must never land in the tree.
- Touch nothing outside the Scope list and your own story folder. The locked tests are not yours to
  change, and you should not need to.
- Write your handoff note at `.factory/work/story-13/handoff.md`: done, left, open questions, next
  step. `story finish` refuses without it.
- Your prose is not evidence. The verify job's run on the pull request is.
