# story-4: the review bundle and its record

You are the builder for story four. Give the recorded code review a path that works the way
verify's evidence already does: a bundle produced outside the tree under review, and a job that
reads it as data and writes the check result. The reviewer's judgement is never checked by CI - what
CI checks is that a review exists, binds this exact content, and leaves nothing open. This file is your brief; `story start` and gate-check read the three lists below
exactly, so they are kept as plain lists with no blank line between a label and its entries.

**Authority:** an approved requirement — REQ-10, with ADR-016 items 3 and 6 as the approved
design: a recorded review is evidence, and the reviewer never writes the record. Nothing outside
that authority is in this story. If you find something worth adding, write it in
`.factory/work/backlog.md` with the date and do not build it; if you believe the story cannot be
finished without it, stop and ask the orchestrator rather than widening the work. An
implementation detail inside this story is yours to settle; new user-visible behavior, a new
integration or a material tradeoff is a decision for the approver.

Tests:
- packages/cli/test/review-record.test.ts

Scope:
- packages/cli/src/check-runner/review-record.ts
- packages/cli/src/check-runner/job.ts
- packages/cli/src/records/format.ts
- packages/cli/test/review-record.test.ts

Inputs:
- docs/TECH-SPEC.md
- docs/adr/ADR-016-product-workflow.md

## What done means

T-10-P7 and T-10-N11 in `packages/cli/test/review-record.test.ts` pass, and every other locked test still passes. The tests are locked by approved hash before they reach main: you bring your own test file
across with `git checkout pod-factory/frozen-tests -- <path>` — not with an editor, which the
hook refuses for a locked path — and you cannot change it. One byte of difference and
lock-guard refuses the pull request. Read them first; each one names the
eval-plan row it implements.

## What to build

1. **The bundle's shape**, mirroring verify's manifest so a human reads one format: the pull
   request, the head commit, the head tree, the candidate tree, the digest of the diff the reviewer
   read, the reviewer's session and model identity, and the findings, each dispositioned blocking,
   deferred or dismissed with a reason. Screenshots are files in the bundle, hashed in the manifest.
2. **`pod-factory ci review-record`**, a job that runs no application code: it reads the bundle from
   the reviews branch, checks the manifest names this pull request and tree, **recomputes the diff
   digest itself** and compares, checks every finding is dispositioned with none open, and writes a
   check-result record carrying the review's digest and the tree reviewed. Anything else gets no
   passing record, and the reason names which of the three failed.
3. **Never in the tree under review.** Recording a review must not change what was reviewed: the
   bundle goes to the reviews branch and the record to the records branch, as verify's does.
4. **No agent writes the record.** The actor rule is the existing one - only the check runner writes
   check results - and an agent-written review record is refused by validation, not by convention.

## Constraints

The workflow job that calls this goes to `.factory/work/story-4/workflows/review-record.yml` for the
approver to apply by hand, because `.github/workflows/**` is hook-protected and locked. Do not edit
anything under `.github/`. In the record format, add only what the new check needs and keep every
existing field: validation is exact about keys.

## Before you finish

- Run the locked commands from the repository root. Every locked test passes, your own included.
  Nothing is allowed to fail, and gate-check refuses a candidate whose own test file is absent
  or differs by one byte from what was approved.
- `npm run lint` and `npm run typecheck` from the repository root. Prettier only through
  `npm run lint`, never from inside a package over other folders.
- Delete `.factory/work/reports/` before you commit. An agent's report must never land in the tree.
- Touch nothing outside the Scope list and your own story folder. The locked tests are not yours to
  change, and you should not need to.
- Write your handoff note at `.factory/work/story-4/handoff.md`: done, left, open questions, next
  step. `story finish` refuses without it.
- Your prose is not evidence. The verify job's run on the pull request is.
