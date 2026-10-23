# story-6: authorized execution

You are the builder for story six. This is the switch: gate-check gains one alternative to the
per-story human approval, and it is the five conditions the approved contract already states -
nothing more. Read ADR-018's section on the acceptance condition before you start; it quotes the
contract word for word, and your job is to make a check out of exactly that sentence. This file is your brief; `story start` and gate-check read the three lists below
exactly, so they are kept as plain lists with no blank line between a label and its entries.

**Authority:** an approved requirement — REQ-10, with ADR-016 items 1, 2 and 4 as the approved
design. Nothing outside that authority is in this story. If you find something worth adding, write
it in `.factory/work/backlog.md` with the date and do not build it; if you believe the story
cannot be finished without it, stop and ask the orchestrator rather than widening the work. An
implementation detail inside this story is yours to settle; new user-visible behavior, a new
integration or a material tradeoff is a decision for the approver.

Tests:
- packages/cli/test/authorized-execution.test.ts

Scope:
- packages/cli/src/check-runner/gate-check.ts
- packages/cli/src/commands/story.ts
- packages/cli/src/commands/doctor.ts
- packages/cli/test/authorized-execution.test.ts

Inputs:
- docs/TECH-SPEC.md
- docs/adr/ADR-016-product-workflow.md
- docs/adr/ADR-018-milestone-transition-and-execution-boundaries.md
- docs/adr/ADR-019-frozen-test-migration.md

## What done means

T-10-P5, T-10-N7, T-10-N8 and T-10-N9 in `packages/cli/test/authorized-execution.test.ts` pass, and every other locked test still passes. The tests are locked by approved hash before they reach main: you bring your own test file
across with `git checkout pod-factory/frozen-tests -- <path>` — not with an editor, which the
hook refuses for a locked path — and you cannot change it. One byte of difference and
lock-guard refuses the pull request. Read them first; each one names the
eval-plan row it implements.

## What to build

1. **The alternative authority.** gate-check passes without a per-pull-request human approval when
   all five hold: a valid, unrevoked gate-3 authorization covering the story; every required check
   passing for the merge candidate, re-derived whenever main moves; a closed review record bound to
   that same candidate; the diff inside the story's approved scope; and traceability clean. Any one
   failing refuses, naming the condition - not the conclusion.
2. **The story a pull request claims** comes from its verifying transition record, bound to the tree
   under judgement, never from the branch name. No record, no authority.
3. **The human path stays.** A story approval bound to the head tree remains valid, and is the only
   route for anything outside an authorized story's scope.
4. **`story finish` without a human record.** A verifying story reaches done when those same five
   conditions held for the content that merged. Every existing refusal stays where it is.
5. **`doctor`** reports whether main's protection requires branches up to date before merge, because
   the merge candidate's guarantee leans on that setting.

## Constraints

This story does not enable automatic merging by itself: the approver does that when these rows pass
on main, protection requires branches up to date, and every required check has been demonstrated
both passing and refusing. Widen no agent's authority anywhere else - amendments, locks, revocations
and product acceptance stay human-only, and no code you write may let an agent write one.

## Before you finish

- Run the locked commands from the repository root. Every locked test passes, your own included.
  Nothing is allowed to fail, and gate-check refuses a candidate whose own test file is absent
  or differs by one byte from what was approved.
- `npm run lint` and `npm run typecheck` from the repository root. Prettier only through
  `npm run lint`, never from inside a package over other folders.
- Delete `.factory/work/reports/` before you commit. An agent's report must never land in the tree.
- Touch nothing outside the Scope list and your own story folder. The locked tests are not yours to
  change, and you should not need to.
- Write your handoff note at `.factory/work/story-6/handoff.md`: done, left, open questions, next
  step. `story finish` refuses without it.
- Your prose is not evidence. The verify job's run on the pull request is.
