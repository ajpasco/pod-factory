# story-3: the merge candidate

You are the builder for story three. Make the evidence bind the content that would actually land:
the pull request's head merged with main as it stands, not the branch head in isolation. Everything
after this story - the review record, authorized execution - binds that same candidate, so it comes
first. This file is your brief; `story start` and gate-check read the three lists below
exactly, so they are kept as plain lists with no blank line between a label and its entries.

**Authority:** an approved requirement — REQ-10, with ADR-016 item 2 as the approved design:
evidence binds the content that would land. Nothing outside that authority is in this story. If
you find something worth adding, write it in `.factory/work/backlog.md` with the date and do not
build it; if you believe the story cannot be finished without it, stop and ask the orchestrator
rather than widening the work. An implementation detail inside this story is yours to settle; new
user-visible behavior, a new integration or a material tradeoff is a decision for the approver.

Tests:
- packages/cli/test/merge-candidate.test.ts

Scope:
- packages/cli/src/check-runner/verify.ts
- packages/cli/src/check-runner/job.ts
- packages/cli/src/git-tree.ts
- packages/cli/test/merge-candidate.test.ts

Inputs:
- docs/TECH-SPEC.md
- docs/adr/ADR-016-product-workflow.md

## What done means

T-10-P6 and T-10-N10 in `packages/cli/test/merge-candidate.test.ts` pass, and every other locked test still passes. The tests are locked by approved hash before they reach main: you bring your own test file
across with `git checkout pod-factory/frozen-tests -- <path>` — not with an editor, which the
hook refuses for a locked path — and you cannot change it. One byte of difference and
lock-guard refuses the pull request. Read them first; each one names the
eval-plan row it implements.

## What to build

1. **Derive the candidate.** For a pull request at head H, the candidate is H merged with main's
   current head, computed in the enforcing clone without checking anything out - `git merge-tree`
   gives the tree without touching a working copy. A conflict is not a verdict: report it as "this
   candidate cannot be computed, the branch needs refreshing against main", naming both commits.
2. **Verify the candidate, bind the candidate.** The subject checkout the locked commands run in is
   the candidate, and the manifest names the head commit, main's commit and the candidate tree. The
   refusal that the subject is not at the expected commit stays; it now names the candidate.
3. **Say when it is stale.** When main moves the candidate changes, so a bundle that bound the old
   one no longer binds anything mergeable. Provide that comparison as a function the later stories
   call, and name in its message the candidate that would have to be verified instead.

## Constraints

Do not touch `gate-check.ts`: consuming the candidate for authority is story 6. Reuse `fetchTrunk`,
`fetchPullRequest`, `treeOf` and `filesAt` rather than shelling out again. Nothing here writes a
record.

## Before you finish

- Run the locked commands from the repository root. Every locked test passes, your own included.
  Nothing is allowed to fail, and gate-check refuses a candidate whose own test file is absent
  or differs by one byte from what was approved.
- `npm run lint` and `npm run typecheck` from the repository root. Prettier only through
  `npm run lint`, never from inside a package over other folders.
- Delete `.factory/work/reports/` before you commit. An agent's report must never land in the tree.
- Touch nothing outside the Scope list and your own story folder. The locked tests are not yours to
  change, and you should not need to.
- Write your handoff note at `.factory/work/story-3/handoff.md`: done, left, open questions, next
  step. `story finish` refuses without it.
- Your prose is not evidence. The verify job's run on the pull request is.
