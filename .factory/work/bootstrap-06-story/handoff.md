# Handoff: bootstrap-06-story

Session of 2026-10-14, Opus builder. Approver: Allan Pasco. Design session: scad-d8 (Fable).

Stacked on slice 5 (`bootstrap-05-revoke-relay`, PR #6), which is stacked on slice 4 (PR #5). This pull request targets the slice 5 branch, so its diff is slice 6 alone.

## Done

- Story file format (`src/story.ts`): three labelled lists, `Tests:`, `Scope:` and `Inputs:`, each item a `- <path or glob>` line. The rest of the file is prose for the builder. A story missing a list is refused, naming the list.
- `pod-factory story start story-<n> --holder <builder> [--lease <minutes, default 240>]`:
  - may be run by the orchestrator, an agent; refuses the check runner;
  - needs the latest valid, unrevoked gate-3 approval, and every file it binds must still hash the same on main. Otherwise it refuses, naming the file: "the plan it approved is not the plan on main … Gate 3 is open again";
  - the story must be in the approved plan;
  - ready rule: a lock exists, and every `Tests:` path exists on main and is locked at that hash; otherwise it refuses, naming the test;
  - every `Inputs:` path must exist;
  - when the story is ready, it writes ready→in-progress with the lease. `binds` holds main's tree plus the story file and inputs with their hashes, and `refs` the gate-3 approval. It prints the brief;
  - when the story is already in progress, it writes nothing and reprints the lease and inputs, so a killed orchestrator can resume.
- `pod-factory story finish story-<n> --pr <n>`, by stage:
  - **in-progress → verifying:** `.factory/work/story-<n>/handoff.md` must exist at the pull request's head. Otherwise it refuses, naming the story, the holder and the missing note. The note's path and hash are kept in the record.
  - **verifying → done:** needs a valid, unrevoked approval of kind story for this story and pull request, bound to the current head tree, and the approved content must be merged: either the approved head is in main's history (a merge commit), or main holds exactly the approved tree (a squash). The output names which proof held. Otherwise it refuses, naming the missing approval or the unmerged pull request. The done record refs the approval.
  - Any other stage is refused, naming it.
- The file-scope check is in gate-check (TECH-SPEC section 3.2), for story approvals:
  - the story comes from the approval, never the branch name;
  - the story file is read from the tree gate 3 bound and checked against the hash it binds, so neither the pull request nor a later change on main can widen the scope;
  - the diff from the merge base to the head must stay inside the `Scope:` globs, plus `.factory/work/story-<n>/**`; anything else under `.factory/` fails, whatever the scope says.
- No redundant deepening: in a shallow clone, the full-depth records fetch already makes main's history whole (checked directly with git). The shallow-clone test guards that end to end.
- TECH-SPEC section 3.2 (story commands; the scope check moved from verify to gate-check) and section 12 (L10 observed, with the schedule stated as a backstop of unmeasured latency).
- Tests: 144 passing on two runs. Typecheck, ESLint and Prettier are clean.
  - Section-13 tests: T-07-P3, T-07-N5, T-07-P4, T-07-N6, T-08-P3, T-08-N3, T-08-P2, T-08-N2, T-08-P5, T-08-N5 (as gate-check tests).
  - Also tested: a story file missing a list, resume, finishing a story that is still ready, a pull request widening its own scope, a scope glob covering `.factory/`, a shallow enforcer clone, and a listed test that does not exist.
- Mutation checks, each failing a test:
  - scope read from the pull request's head;
  - no factory-folder rule (it first survived, until a test with a `**` scope was added);
  - no story-folder exception;
  - a missing test passing the ready rule (a real bug, found and fixed while writing it);
  - no plan match;
  - done before the merge, and each of the two done proofs separately;
  - no handoff note required.

## Decisions made in session

- By the design session:
  - The scope check is in gate-check, keyed by the story approval. A check never takes what it checks from an input the checked party controls.
  - The story file comes from the gate-3-bound tree, with its hash checked.
  - The work-folder exception is exactly `.factory/work/story-<n>/**`, with the number from the approval.
  - No advisory copy in verify: two scope checks with different inputs would drift.
  - The three lists, the agent kind on `story start`, resume by reprint, the ready rule over locked `Tests:` paths, and finish's two stages with the ancestor check are accepted as designed.
- By the design session, after review: done accepts either ancestry or main's tree equal to the approved tree, and says which proof held. The tree match is the stronger claim.
- L10, from the design session: no cadence is claimed. The schedule is a backstop of unmeasured latency, and correctness does not rest on it.

## Left, for the approver only

1. PRs #5 and #6 first, as their bodies list.
2. `approve bootstrap <this PR's number>`, then re-run gate-check and merge. No workflow change in this slice.

## Left, for me

- L10: no scheduled run by 04:22Z on 2026-10-14, 82 minutes after the workflow reached main.
- Slice 7: `doctor`, including the design session's line that it fails if `pod-factory` resolves inside a worktree or a branch build. T-03-P2 lands there.

## Open questions

- None.

## Next step

Slice 7, `doctor`, design first.
