# story-10: the classification produced by CI

You are the builder for story ten. Make the classification a machine's output rather than a hand
copy: a job runs the locked commands on the approved tree and publishes the report with a
classification record the check runner signs, and `approve 2` accepts that record as it accepts the
hand-written one. This file is your brief; `story start` and gate-check read the three lists below
exactly, so they are kept as plain lists with no blank line between a label and its entries.

**Authority:** approved requirements — REQ-05 and REQ-06: the classification is evidence, and an
agent's report is never evidence. Nothing outside that authority is in this story. If you find
something worth adding, write it in `.factory/work/backlog.md` with the date and do not build it;
if you believe the story cannot be finished without it, stop and ask the orchestrator rather than
widening the work. An implementation detail inside this story is yours to settle; new user-visible
behavior, a new integration or a material tradeoff is a decision for the approver.

Tests:
- packages/cli/test/classification-ci.test.ts

Scope:
- packages/cli/src/check-runner/classify.ts
- packages/cli/src/commands/approve.ts
- packages/cli/src/records/format.ts
- packages/cli/test/classification-ci.test.ts

Inputs:
- docs/TECH-SPEC.md
- .factory/work/classification/gate-2.json

## What done means

T-06-P13 and T-06-N12 in `packages/cli/test/classification-ci.test.ts` pass, and every other locked test still passes. The tests are locked by approved hash before they reach main: you bring your own test file
across with `git checkout pod-factory/frozen-tests -- <path>` — not with an editor, which the
hook refuses for a locked path — and you cannot change it. One byte of difference and
lock-guard refuses the pull request. Read them first; each one names the
eval-plan row it implements.

## What to build

1. **`pod-factory ci classify`**: runs the locked commands on main's current tree, keeps the report,
   and writes a classification record binding the report's hash and the tree it ran on, as the check
   runner.
2. **`approve 2 --classification`** accepts that record as well as a hand-written bootstrap one, with
   the check it already makes: the record must bind the report that is on main.
3. **The bootstrap schema stays valid.** Six test files name the 0005 fixture; do not break it and do
   not migrate it.

## Constraints

An agent's summary of a run is never the classification: the report is the runner's own output and
the record is written by the job, not by a session. Nothing changes about what gate 2 binds.

## Before you finish

- Run the locked commands from the repository root. Every locked test passes, your own included.
  Nothing is allowed to fail, and gate-check refuses a candidate whose own test file is absent
  or differs by one byte from what was approved.
- `npm run lint` and `npm run typecheck` from the repository root. Prettier only through
  `npm run lint`, never from inside a package over other folders.
- Delete `.factory/work/reports/` before you commit. An agent's report must never land in the tree.
- Touch nothing outside the Scope list and your own story folder. The locked tests are not yours to
  change, and you should not need to.
- Write your handoff note at `.factory/work/story-10/handoff.md`: done, left, open questions, next
  step. `story finish` refuses without it.
- Your prose is not evidence. The verify job's run on the pull request is.
