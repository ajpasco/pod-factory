# Handoff: story-1, `pod-factory status`

Session of 2026-10-15, Opus builder, holding the lease as `story-1-builder`. Approver: Allan Pasco. Design session: scad-d8 (Fable). Branch `story-1-status`, off main at bd6c734.

## Before building

The inputs, checked against main and the records branch, not taken from the dispatch message:

- main is bd6c734, tree 39b9814, which is the tree start record 6149cef4bcd0 binds.
- `.factory/work/story-1/story.md` d6e8b81b…, `docs/TECH-SPEC.md` ce5e2694… and `packages/cli/test/status.test.ts` 10bf6d2c… hash on main to what the start record binds.
- The gate-2 lock binds `packages/cli/test/status.test.ts` at 10bf6d2c…, so the tests that define done are locked at the content read.
- `.factory/work/plan/build-plan.md` hashes to 851495c3…, as gate-3 approval d4e09d9067f7 binds it.
- There are no revocations on the records branch.

## Done

- `pod-factory status` (`packages/cli/src/commands/status.ts`). It reads the records branch with `loadRecords` and main with `fetchTrunk`, and writes nothing. It refuses any argument, and exits 0 whenever the report is produced. A records branch that cannot be read still stops it, through `run.ts` as for every command.
- The report (`packages/cli/src/status/report.ts`), a pure function over what the command gathered. In order:
  - A header naming main's and the records branch's commits, or saying there is no records branch yet.
  - One line per story the build plan on main names, in the plan's order. Each gives the stage from its records (`storyStage`), the owner (the in-progress lease holder, noting an expired lease), what it waits on as a command a human can run, and the record or rule holding it:
    - ready: `story start`, held by the gate-3 approval. If gate 3 is not approved, or did not approve this story file, it says that instead.
    - in-progress: the builder's pull request, then `story finish`, which needs the handoff note.
    - verifying: the story approval, then the merge and `story finish`.
    - done: nothing.
  - A line for each story file whose `Stage:` line claims a stage its records do not justify. The records decide the stage; the claim sets nothing.
  - One line per gate, 2 and 3. A gate is approved, naming its record, or "not approved", saying why: revoked by which record, only invalid approval records, or never approved. Gate 2 also names the lock in force, or says nothing is locked. Gate 3 also says whether main still holds the plan it approved.
  - Every flagged record as "Invalid and ignored", with the reader's own reason.
- `run.ts` registers `status` in the command switch and `USAGE`. `index.ts` exports the command and the report.
- Builder tests, `packages/cli/src/status/report.test.ts`, 11 tests. They cover what the locked tests do not reach: verifying with and without a story approval, done, an expired lease, a revoked gate, gate-3 drift, a story the gate-3 approval did not cover, gate 2 with and without a lock, no records branch, a missing story file, a plan with no stories, a claim that matches its stage, and the flagged-record list.
- Mutations. Each compiled:
  - Without the claim line, T-19-N1 fails.
  - Without the in-progress record ID, T-19-P1 fails.
  - Without the flagged-record lines, the three locked tests still pass, because T-19-N2's first assertion is also met by the gate-3 line, which names the invalid record. The builder test for the flagged-record list fails, so the list is guarded there.
- Run against this repository, `status` prints story-1 in progress, owner story-1-builder, held by 6149cef4bcd0, with gate 2 approved under lock be0a85b73df2 and gate 3 approved with main still holding its plan.

## Left

- Nothing in scope. No file outside the story's Scope list and this folder changed.

## Open questions

- None.

## Next step

The design session reviews the diff. The pull request opens only after the design session confirms the required-check swap is done. Then the approver's `approve story-1 --pr <n>`, his merge, and `story finish` run by the orchestrator.
