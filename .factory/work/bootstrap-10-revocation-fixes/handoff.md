# Handoff: bootstrap-10-revocation-fixes

Session of 2026-10-14, Opus builder. Approver: Allan Pasco. Design session: scad-d8 (Fable).

Two code defects in the revocation path, found by an external review of the whole stack, confirmed in the source by the design session and briefed to this slice. Off main at c1423be. It must land before gate 2 is approved, because TECH-SPEC and the eval plan are gate-2 bound.

## Done

- **A revoked amendment no longer leaves a pull request mergeable.** gate-check never applied the locked-path rule. It relied on lock-guard's check run, which a re-run supersedes, as a re-run of gate-check supersedes the relay's red. Now:
  - The rule is one function, `checkLockedPaths` in `check-runner/lock-guard.ts`. `lockGuard()` prints it and gate-check's `evaluate()` adds it to its verdict.
  - gate-check passes it the records set it read, so its existing re-read loop still decides what "now" is.
  - When a change's amendment was revoked, the failure names the amendment and the revocation.
  - T-22-N8 covers the full sequence: amendment approved, lock-guard and gate-check pass, `revoke`, gate-check re-run fails with that sentence. lock-guard prints the same sentence.
- **An interrupted revoke now completes.** When `revoke` is run again for a revoked record and enforcement is still pending, it starts `records-validate` again; once enforcement is confirmed, it doesn't. It never writes a second revocation. T-22-N10 kills the process at the slice-1 kill point `after-record-write`, re-runs it, and checks:
  - one dispatch, one revocation;
  - after the relay has run, no further dispatch.
  - To support this, `runFlowChild` gained an optional invocation environment, used to put the fake `gh` on PATH.
- **The locked-path rule is corrected (ADR-015).** The chain test showed the old two-rule design deadlocked when an amendment was revoked after its merge. The rule now judges what a merge leaves on main, path by path:
  - A changed path passes at exactly what is locked now, or under a valid, unrevoked amendment bound to this pull request and head.
  - An untouched path needs main's content to be one this lock has approved (`held`).
  - A stale amendment built on a revoked one names both, instead of the false "another amendment changed it first".
  - `revoke` of an amendment states the two real recoveries for a merged change.
  - Tests:
    - T-22-N9: the chain case, fixed by a new `approve amendment`.
    - T-22-P4: the merged case, recovered both ways.
    - T-06-P12: a pending amendment doesn't block pull requests that leave the path alone.
    - T-06-N11: a change back to an older approved version still needs an amendment.
    - The existing drift test in `ci-jobs.test.ts` is unchanged and is the guard ADR-015 cites.
- **Docs:**
  - TECH-SPEC sections 3.2, 6 and 14.
  - ADR-015, with an "amended by" line on ADR-006.
  - Eval plan section 13: six rows, and the count sentence reads sixty (re-derived from the table; every ID has a test titled with it).
  - `docs/HANDOFF-M0-opus.md` says 60.
- **Results:** 167 tests. 164 pass; the 3 failures are T-19-P1, T-19-N1 and T-19-N2, by design until story one. Typecheck and lint are clean.
- **Mutations.** Each compiled and was caught:
  - gate-check ignoring the rule;
  - the revoked-amendment sentence never found;
  - no re-dispatch, and an unconditional re-dispatch;
  - the drift check applied to changed paths too;
  - changed paths accepting any `held` hash;
  - untouched paths needing the current hash;
  - no restore without an amendment;
  - a stale amendment never naming its revoked base.

## Decisions made in session

- **By the design session:** drop the half of the brief that had gate-check require a lock-guard check-result record. lock-guard writes none, and producing one would need a write path in `.github/workflows/pr-checks.yml`. gate-check evaluates the rule itself instead. The builder raised this.
- **By the design session:** the rule lives once, takes the records set as an argument, and the revoked-amendment sentence is required. TECH-SPEC states that gate-check depends on neither lock-guard's check run nor any lock-guard record, and why.
- **By the design session, rejecting the builder's option (a):** a deadlock whose only recovery is `approve 2` and `lock` again re-approves revoked content. Option (b), restore amendments, was not wanted either.
- **The builder's variant over the design session's head-only rule:**
  - The builder showed two counterexamples: P1, a pending amendment blocks every other pull request, and P2, a branch older than the drift passes and its merge keeps the drift. P2 was already guarded by an existing test.
  - The design session took the variant. It added these conditions: write the asymmetry and both failure modes into the ADR; add T-06-P12 and T-06-N11; state that correctness does not depend on up-to-date branches; and leave the P2 test exactly as it is.
- **The design session said it is telling the approver it made this call**, since it changes how the gate behaves. The approver may veto it.
- **The test table is in the eval plan, not TECH-SPEC.** The brief said "TECH-SPEC section 13", but section 13 there is later-phase designs. The table and count sentence are `docs/eval-plan.md` section 13.
- **By the design session, after the merge:** two changes to the approver's sequence. First, the required-check swap moves to between `story start` and story one's pull request, so story one is the first pull request the real checks gate. Second, `bootstrap-check.yml` is not deleted (the review's fifth finding); it is dropped from the required checks instead. The design session also asked for the sequence to be written once, here, with the old steps marked superseded in place.
- **The builder's, found while writing the sequence, for the design session to confirm:**
  - The record-0005 template in `records-branch.md` named a classification command that is not the locked command.
  - The relay workflow, and any other change to a path the lock will cover, are placed before the classification run, not just before the lock.
  - The records-branch protection moves with the swap, since nothing in it waits on story one.

## Left

- **For the design session:** ADR-013 (lock-guard and class rules) is outside this builder's sparse checkout. Judge whether it needs an "amended by ADR-015" line like ADR-006's.
- **For the approver:** the staged relay workflow, `.factory/work/bootstrap-05-revoke-relay/workflows/records-validate.yml`, is still not on main. Until it is, neither `revoke`'s dispatch nor the schedule runs the relay.
- **After merge:** the approver's sequence below. It supersedes the one in `.factory/work/bootstrap-08a-kill-resume/handoff.md`.

## The approver's sequence

Written 2026-10-14, after this pull request merged as 570f615. This is the sequence to follow. It replaces step 6 of `.factory/work/bootstrap-08a-kill-resume/handoff.md`, which is marked superseded there, and corrects the classification command in `.factory/work/bootstrap-02-approve-lock/records-branch.md`.

Two rules fix the order:

- **Every human change to main lands before the required-check swap.** From the swap on, verify fails every pull request until story one makes the three `status` tests pass.
- **Every change to a path the lock will cover lands before the classification run.** After `lock`, `.github/workflows/**` is locked, so a later workflow change needs an amendment. Gate 2 also approves main's tree, and its classification must be the single run at that commit.

Done: #5 to #11 are merged, the gate-2 test pull request among them, and the enforcing copy is installed from 570f615.

1. **This pull request** merges under `pod-factory approve bootstrap <n>`.
2. **The relay workflow.** Replace `.github/workflows/records-validate.yml` on main with `.factory/work/bootstrap-05-revoke-relay/workflows/records-validate.yml`. Use a pull request from a `bootstrap-*` branch, merged under `approve bootstrap <n>`. Main's current file validates records but does not relay, so until this lands, `revoke` blocks nothing.
3. **Anything else the approver wants on main** lands now, the same way. After step 4 nothing merges until `lock`, and after step 6 nothing merges except story one.
4. **Gate 2,** at main's commit after step 3:
   - From the repository root: `npm ci`, then the locked command `npm exec --workspace packages/cli -- vitest run --config vitest.config.ts`. Expect 167 tests: 164 pass, and exactly T-19-P1, T-19-N1 and T-19-N2 fail.
   - Copy `.factory/work/reports/cli.json` to `.factory/work/classification/gate-2.json`. Commit it on a `bootstrap-*` branch and merge it under `approve bootstrap <n>`. That merge is the tree gate 2 approves.
   - Write record 0005 by hand, following records-branch.md step 2. Its `command` names the locked command above.
   - `pod-factory approve 2 --classification 0005-classification-gate-2.json`, then `pod-factory lock` at once.
5. **`pod-factory approve 3`, then `pod-factory story start story-1`.** Before the story's builder starts, the builder session checks that every Inputs path in `.factory/work/story-1/story.md` hashes on main to what the start record binds, and that the Tests path is locked at the lock's hash.
6. **The swap,** before story one's pull request opens, so that story one is the first pull request the real checks gate:
   - Main's required checks become `lock-guard`, `verify` and `gate-check`, each from the GitHub Actions app (ID 15368). `bootstrap-check` leaves the list. `strict` is the approver's call:
     ```sh
     gh api -X PATCH repos/ajpasco/pod-factory/branches/main/protection/required_status_checks --input - <<'JSON'
     {"strict": false, "checks": [
       {"context": "lock-guard", "app_id": 15368},
       {"context": "verify", "app_id": 15368},
       {"context": "gate-check", "app_id": 15368}]}
     JSON
     ```
   - Protect the records branch: no force pushes, no deletion, and no required checks or reviews, which would stop `verify-record` pushing.
   - `pod-factory doctor` should read every layer present, with no note that the placeholder is still required.
7. **Story one.** A builder subagent in its own worktree implements `status`, and story one's pull request makes the three tests pass. Then `approve story-1 --pr <n>`, the design session merges, and `story finish` runs twice, to done.

`bootstrap-check.yml` is not deleted in this sequence. The review's fifth finding made the deletion a dead end. After the lock it needs an amendment, and an amendment's pull request cannot pass while gate-check rejects a bootstrap approval. The decision is to defer the deletion and drop the placeholder from the required checks at step 6. The file stays on main and still reports on every pull request. It fails on any branch not named `bootstrap-*`, story one's included, and that blocks nothing once it is no longer required.

## Open questions

- None.

## Next step

The design session reviewed and merged this pull request as 570f615. The approver follows the sequence above, from step 1.
