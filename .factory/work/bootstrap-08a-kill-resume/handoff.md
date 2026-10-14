# Handoff: bootstrap-08a-kill-resume

Session of 2026-10-14, Opus builder. Approver: Allan Pasco. Design session: scad-d8 (Fable).

Stacked on slice 7 (`bootstrap-07-doctor`, PR #8). This pull request targets that branch.

## Done

- T-08-P1, kill and resume, one test per kill point:
  - Story one's scripted run is approve 2, lock, approve 3, story start, the builder's pull request 7 with its handoff note, story finish to verifying, approve story-1, the merge, and story finish to done.
  - At each kill point, every record-writing step runs in its own process and is killed there (SIGKILL), then run again.
  - After every step: exactly one record per step so far, no repeated ID, nothing flagged, and the story's stage as expected.
  - The run ends with pull request 7's head in main's history.
- T-08-N1: with a half-written record planted on the records branch, story start is killed during its journal write and run again. The half-written file is flagged by name and never read as a record, and the step's record lands whole.
- To make that work without shipped code reading a test variable:
  - `CommandIO.onKillPoint` is an optional hook that every command passes to its record write and its pending-write finish, through `writeOptions(io)`. Only the test child `test/support/flow-child.ts` sets it.
  - `approve` is idempotent. When a valid, unrevoked approval already carries the same shown hash, it writes nothing ("Already approved"), so a restart never approves the same content twice.
  - `story finish` exits non-zero only when something is wrong, and reports with exit 0, writing nothing, whenever it is waiting on someone else: no story approval yet, or approved and not yet merged. A done story reports "already done" with exit 0. A pull request that changed after its approval is refused with exit 1, because it is wrong rather than waiting; a test covers that refusal.
- Eval plan section 13: T-05-P2, T-05-N3 and T-05-N4 are removed, with the reason stated. Milestone zero's count is sixty, and `docs/HANDOFF-M0-opus.md` says 60.
- TECH-SPEC section 3.2: `approve` is idempotent; `lock`, `story start` and `story finish` are safe to run again.
- Tests: 156 passing. Typecheck, ESLint and Prettier are clean.
- Mutation checks:
  - approve not idempotent fails four of the five kill-point runs;
  - approve not finishing pending writes fails the after-journal and before-push runs.

## Decisions made in session

- By the design session:
  - T-05-P2, T-05-N3 and T-05-N4 leave milestone zero. Section 13 contradicted the phase table and rule 5, and an RB test of a command that does not exist cannot pass. The design session is telling the approver, because it changes the number approved at gate 2; there is nothing for him to decide.
  - The kill-and-resume test lands in this small pull request.
  - From the review of 14b9c1b: one rule for `story finish`, made now, before these tests are locked. Exit 0 for every wait, exit 1 only for something wrong. The during-journal-write kill cannot exercise idempotency, since no record lands before it, so five passing kill points are not five proofs of it.
  - The status tests land last, in the gate-2 test pull request. That fixes the order below.
  - The design session states one exception to its rule against merging a red gate-check: the gate-2 test pull request, whose red verify is the designed outcome of classification. The authority for that merge is the approver's bootstrap approval plus the classification record.

## The remaining sequence, in order

> **Superseded on 2026-10-14.** Follow "The approver's sequence" in `.factory/work/bootstrap-10-revocation-fixes/handoff.md`. Steps 1 to 3 are done. Steps 5 and 6 are wrong in the order of the swap, and step 6 is wrong about `bootstrap-check.yml`; both are marked below. The text is otherwise kept as written.

1. The approver installs the packed binary from a checkout of main: `npm ci && npm run build --workspace packages/cli`, then `cd packages/cli && npm pack && npm install -g ./pod-factory-0.0.0-m0.tgz`.
2. #5, #6 (after he copies its staged workflow), #7, #8 and this pull request merge in order. Each takes `pod-factory approve bootstrap <n>`, typed in a terminal outside any agent session, then a re-run of gate-check.
3. The gate-2 test pull request lands the three status tests, T-19-P1, T-19-N1 and T-19-N2. They fail on their assertions, so that pull request's verify is red by design and its gate-check cannot go green. It can merge only while `bootstrap-check` is still the only required check, under the approver's `approve bootstrap`. **The approver must not swap the required checks before this.**
4. At that commit the approver:
   - runs the locked command;
   - copies `.factory/work/reports/cli.json` to `.factory/work/classification/gate-2.json` and commits it;
   - writes bootstrap record 0005 binding it (records-branch.md step 2);
   - runs `approve 2`, then `lock`.
5. **Superseded in part:** the swap now comes between `story start` and story one's pull request (step 6). As first written: `approve 3`, then `story start story-1`. A builder subagent in its own worktree implements `status`, and story one's pull request makes the three tests pass. Then `approve story-1 --pr <n>`, the merge, and `story finish` twice, to done.
6. **Superseded:** the swap and the records-branch protection come after `story start` and before story one's pull request opens, not after story one. `bootstrap-check.yml` is not deleted. It is dropped from the required checks instead, because after the lock its deletion needs an amendment that gate-check cannot pass (the review's fifth finding). As first written:

   Only then:
   - swap the required checks to `lock-guard`, `verify` and `gate-check`, bound to app 15368, with `strict` his call;
   - protect the records branch: no force pushes, no deletion, no required checks or reviews;
   - delete `bootstrap-check.yml`. After the lock, `.github/workflows/**` is locked, so that deletion is the first real use of `approve amendment`, end to end, on pod-factory itself.
   - `pod-factory doctor` should then read every layer present.

## A mistake, corrected

- 66954b0 reformatted `docs/TECH-SPEC.md`, `docs/adr/ADR-007` and `docs/eval-plan.md` (about 750 lines, whitespace and emphasis only). I had run `npx prettier --write … ../../docs` from `packages/cli`, and Prettier reads `.prettierignore` relative to where it runs, so `docs/` was not ignored. The next commit restores `docs/` to 14b9c1b plus the one intended sentence in TECH-SPEC section 3.2, written without Prettier. Across the whole stack, the `docs/` diff from main is now the same with and without whitespace. From here, Prettier runs only from the repository root, through `npm run lint`.

## Left, for me

- The gate-2 test pull request with the three status tests, once this stack is merged.
- L10: no scheduled run of `records-validate` by 04:49Z on 2026-10-14.

## Open questions

- None.

## Next step

The design session reviews this pull request; then the gate-2 test pull request.
