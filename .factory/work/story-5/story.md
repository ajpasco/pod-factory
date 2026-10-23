# story-5: the traceability check

You are the builder for story five. Make the trace from code back to an approved requirement
checkable: every new file and endpoint names the requirement it serves, and the check reports by path
what names nothing. This file is your brief; `story start` and gate-check read the three lists below
exactly, so they are kept as plain lists with no blank line between a label and its entries.

**Authority:** an approved requirement — REQ-09, with mapping controls C-09-4 and C-09-12 and the
trace-tag convention O17. Nothing outside that authority is in this story. If you find something
worth adding, write it in `.factory/work/backlog.md` with the date and do not build it; if you
believe the story cannot be finished without it, stop and ask the orchestrator rather than
widening the work. An implementation detail inside this story is yours to settle; new user-visible
behavior, a new integration or a material tradeoff is a decision for the approver.

Tests:
- packages/cli/test/traceability.test.ts

Scope:
- packages/cli/src/check-runner/traceability.ts
- packages/cli/src/check-runner/job.ts
- packages/cli/test/traceability.test.ts

Inputs:
- docs/TECH-SPEC.md
- docs/spec/criterion-to-control-mapping.md

## What done means

T-09-P2 and T-09-N4 in `packages/cli/test/traceability.test.ts` pass, and every other locked test still passes. The tests are locked by approved hash before they reach main: you bring your own test file
across with `git checkout pod-factory/frozen-tests -- <path>` — not with an editor, which the
hook refuses for a locked path — and you cannot change it. One byte of difference and
lock-guard refuses the pull request. Read them first; each one names the
eval-plan row it implements.

## What to build

1. **The tag convention is O17**, already written in the mapping document: a source file's trace tag
   names a requirement ID the approved PRD actually contains. Read those IDs from the PRD as the
   gate-2 approval bound it, never from the branch.
2. **What is checked.** Every file the candidate's diff adds, and every HTTP route it adds, carries a
   tag. A file carrying none is reported by path; a tag naming a requirement the approved PRD does
   not contain is reported with the ID it claimed.
3. **What is not checked.** Whether the tag names the *right* requirement: that is the reviewer's
   judgement, and the record says so. Tests, fixtures and generated files are excluded by path, in
   one list in the code rather than scattered.

## Constraints

Do not touch `gate-check.ts`: requiring traceability for authority is story 6. Read the diff from the
candidate story 3 computes; import it rather than recomputing it.

## Before you finish

- Run the locked commands from the repository root. Every locked test passes, your own included.
  Nothing is allowed to fail, and gate-check refuses a candidate whose own test file is absent
  or differs by one byte from what was approved.
- `npm run lint` and `npm run typecheck` from the repository root. Prettier only through
  `npm run lint`, never from inside a package over other folders.
- Delete `.factory/work/reports/` before you commit. An agent's report must never land in the tree.
- Touch nothing outside the Scope list and your own story folder. The locked tests are not yours to
  change, and you should not need to.
- Write your handoff note at `.factory/work/story-5/handoff.md`: done, left, open questions, next
  step. `story finish` refuses without it.
- Your prose is not evidence. The verify job's run on the pull request is.
