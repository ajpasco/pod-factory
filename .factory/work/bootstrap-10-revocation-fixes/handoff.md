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

## Left

- **For the design session:** ADR-013 (lock-guard and class rules) is outside this builder's sparse checkout. Judge whether it needs an "amended by ADR-015" line like ADR-006's.
- **For the approver:** the staged relay workflow, `.factory/work/bootstrap-05-revoke-relay/workflows/records-validate.yml`, is still not on main. Until it is, neither `revoke`'s dispatch nor the schedule runs the relay.
- **After merge:** the approver's sequence in `.factory/work/bootstrap-08a-kill-resume/handoff.md` continues from gate 2. The classification run must happen at the merge commit that includes this pull request, because it adds six tests.

## Open questions

- None.

## Next step

The design session reviews this pull request. Its verify is red from the three `status` tests, as on every pull request until story one lands.
