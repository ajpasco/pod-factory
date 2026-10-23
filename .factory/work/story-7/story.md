# story-7: the maintenance amendment

You are the builder for story seven. Give a correction that belongs to no story one supported route
after the tests are locked - and the narrowest one that works. The negative rows come first here: the
rule that separates this from a blanket merge permission is that the authorization must name the
entire changed-file set, and that is the rule an implementation is most likely to get wrong. This file is your brief; `story start` and gate-check read the three lists below
exactly, so they are kept as plain lists with no blank line between a label and its entries.

**Authority:** an approved requirement — REQ-28. Nothing outside that authority is in this story.
If you find something worth adding, write it in `.factory/work/backlog.md` with the date and do
not build it; if you believe the story cannot be finished without it, stop and ask the
orchestrator rather than widening the work. An implementation detail inside this story is yours to
settle; new user-visible behavior, a new integration or a material tradeoff is a decision for the
approver.

Tests:
- packages/cli/test/maintenance-amendment.test.ts

Scope:
- packages/cli/src/commands/approve.ts
- packages/cli/src/check-runner/gate-check.ts
- packages/cli/src/check-runner/lock-guard.ts
- packages/cli/test/maintenance-amendment.test.ts

Inputs:
- docs/PRD.md
- docs/TECH-SPEC.md
- docs/adr/ADR-018-milestone-transition-and-execution-boundaries.md
- docs/adr/ADR-019-frozen-test-migration.md

## What done means

T-28-P1 and T-28-N1 to T-28-N5 in `packages/cli/test/maintenance-amendment.test.ts` pass, and every other locked test still passes. The tests are locked by approved hash before they reach main: you bring your own test file
across with `git checkout pod-factory/frozen-tests -- <path>` — not with an editor, which the
hook refuses for a locked path — and you cannot change it. One byte of difference and
lock-guard refuses the pull request. Read them first; each one names the
eval-plan row it implements.

## What to build

REQ-28, and nothing beyond it. `pod-factory approve amendment --pr <n> <path>...` becomes merge
authority for that one pull request when, and only when:

1. it binds the **entire** changed-file set from the merge base, each path with its content before
   and after - a file in the diff the authorization does not name is a refusal naming that file;
2. the content is exactly what was approved - a further commit moves the tree and the authorization
   is gone, as a story approval's is today;
3. the verify check result for that same tree exists and passes - the amendment authorizes a merge,
   it never substitutes for evidence;
4. every locked path it touches still satisfies the locked-path rule under its own per-path
   amendment, so lock-guard's verdict is unchanged;
5. a human wrote it: `requireHuman`, an agent session refused, and no record an agent writes can
   stand in for it;
6. it is used once - one pull request, one tree, one merge, never reusable or transferable.

## Constraints

This must never become a general merge permission an agent can invoke, a way to merge a change no
human read, a substitute for a story's approved scope, or a route for an agent to change enforcement,
tests, workflows or records. If your implementation would also let an agent merge an unreviewed file,
it is wrong even when its tests pass: say so in your handoff note rather than shipping it.

## Before you finish

- Run the locked commands from the repository root. Every locked test passes, your own included.
  Nothing is allowed to fail, and gate-check refuses a candidate whose own test file is absent
  or differs by one byte from what was approved.
- `npm run lint` and `npm run typecheck` from the repository root. Prettier only through
  `npm run lint`, never from inside a package over other folders.
- Delete `.factory/work/reports/` before you commit. An agent's report must never land in the tree.
- Touch nothing outside the Scope list and your own story folder. The locked tests are not yours to
  change, and you should not need to.
- Write your handoff note at `.factory/work/story-7/handoff.md`: done, left, open questions, next
  step. `story finish` refuses without it.
- Your prose is not evidence. The verify job's run on the pull request is.
