# story-16: the mockup review evidence and the acceptance record

You are the builder for story sixteen, the last of the phase. Two pieces. Record the browser review
against the approved mockup through story 4's bundle and record path, so acceptance has the evidence
REQ-27 requires and nothing about the reviewed content changes when the review is recorded. Then
build **the acceptance record itself**, which has no producer today: `approve` refuses every gate but
2 and 3 (`commands/approve.ts:279-283`), so nothing can write the gate-4 record REQ-10 requires. This file is your brief; `story start` and gate-check read the three lists below
exactly, so they are kept as plain lists with no blank line between a label and its entries.

**Authority:** approved requirements — REQ-27 and REQ-10's acceptance sentence; PRD section 2 for
gate 4 as acceptance of the product. Nothing outside that authority is in this story. If you find
something worth adding, write it in `.factory/work/backlog.md` with the date and do not build it;
if you believe the story cannot be finished without it, stop and ask the orchestrator rather than
widening the work. An implementation detail inside this story is yours to settle; new user-visible
behavior, a new integration or a material tradeoff is a decision for the approver.

Tests:
- packages/cli/test/mockup-review.test.ts

Scope:
- packages/cli/src/check-runner/review-record.ts
- packages/cli/src/commands/approve.ts
- packages/tracker/playwright/**
- packages/cli/test/mockup-review.test.ts

Inputs:
- docs/PRD.md
- docs/TECH-SPEC.md

## What done means

T-27-P2 and T-27-N2 in `packages/cli/test/mockup-review.test.ts` pass, and every other locked test still passes. The tests are locked by approved hash before they reach main: you bring your own test file
across with `git checkout pod-factory/frozen-tests -- <path>` — not with an editor, which the
hook refuses for a locked path — and you cannot change it. One byte of difference and
lock-guard refuses the pull request. Read them first; each one names the
eval-plan row it implements.

## What to build: the acceptance record

PRD section 2 is the contract here: **gate 4 is acceptance of the product**, and gate 5 is release,
which is not in this phase. The record needs no schema change — a gate approval with `gate: 4` is
already valid (`records/validate.ts:202-204`) and `binds` already carries a tree and a file-hash
map. Add `pod-factory approve 4`:

1. It binds the accepted revision's tree and the acceptance packet's hash, and the ceremony shows
   both before you are asked to type the gate and eight characters.
2. It **refuses**, naming what is wrong and writing nothing, when: a story the gate-3 plan names is
   not done; a required check has no passing result bound to that revision's tree; a recorded review
   for that revision has an open blocking finding; the packet is missing a section, missing its four
   closing lines, or carries code in its summary; the revision moved after the packet was written;
   or the session is an agent's.
3. It is never delegated, and no machine evidence substitutes for it. `requireHuman` applies as it
   does to every approval — and read the note on what that does and does not establish in
   `.factory/work/transition-1b/transition-package.md` before you write its message.

Correct one label while you are in that file: the per-story approval prints "Gate 4"
(`commands/approve.ts:188`), which is the PRD's name for acceptance. The two cannot share it.

## What to build

1. A recorded browser review of the approved screens against the mockup and the approved interaction
   behaviour: screenshots of each screen and state, the revision reviewed named in the record, every
   finding dispositioned and none open.
2. Acceptance refused without it, by name.
3. Story 4's bundle format and its record-writing job, reused. Do not invent a second review path.

## Constraints

The mockup is archived after gate 2; the review binds the revision it reviewed, and recording it
never changes the tree it reviewed. Nothing here writes an approval.

## Before you finish

- Run the locked commands from the repository root. Every locked test passes, your own included.
  Nothing is allowed to fail, and gate-check refuses a candidate whose own test file is absent
  or differs by one byte from what was approved.
- `npm run lint` and `npm run typecheck` from the repository root. Prettier only through
  `npm run lint`, never from inside a package over other folders.
- Delete `.factory/work/reports/` before you commit. An agent's report must never land in the tree.
- Touch nothing outside the Scope list and your own story folder. The locked tests are not yours to
  change, and you should not need to.
- Write your handoff note at `.factory/work/story-16/handoff.md`: done, left, open questions, next
  step. `story finish` refuses without it.
- Your prose is not evidence. The verify job's run on the pull request is.
