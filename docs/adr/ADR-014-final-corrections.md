# ADR-014: Final design corrections before the approver's read

> History (2026-10-13): superseded by `docs/TECH-SPEC.md` 1.0 where the two differ; kept as decision rationale.

Date: 2026-10-12. Status: accepted as technical defaults, reported to the approver. Source: `docs/reviews/spec-verification-3-2026-10-12.md` and the regenerated summary's notes. Supersedes ADR-013 items 1 (the first-lock special case), 3 (the bootstrap and release rows) and 6 (the builder mechanism), and settles the doctor tension. Where any earlier ADR or section disagrees with this one, this one wins.

## A. One required merge check

1. **Main's required status checks are the same for every pull request:** lock-guard, class-check and gate-check. GitHub cannot require different checks per branch pattern, so gate-check dispatches internally by class: story, work, locked, rules, release and bootstrap forms. Work pull requests pass gate-check's work form as soon as work-only passes, which is the auto-merge. **V19 (verify in phase 0):** a single required check that reports per-class results satisfies main's protection for every pull request.
2. **Main's protection binds administrators** ("enforce for admins"), and `doctor` checks that it does. An agent holding the approver's credentials and pushing directly to main is the accepted single-machine risk of decision 13; it is listed in section 5 of the PRD and nowhere claimed otherwise.

## B. Bootstrap and the first lock

3. **The bootstrap class is bounded by data, not by phase:** `bootstrap/*` is accepted by class-check only while no validated lock record exists on the records branch. It merges only on an approval record with gate `bootstrap`, written by the approver with `approve bootstrap <pull request>` and bound to the pull request's tree; gate-check's bootstrap form requires it. Once the first lock record is validated, class-check rejects the class.
4. **The first lock, in order:** phase zero's scaffold, the not-implemented skeleton and the gate-2 tests merge through `bootstrap/*` under bootstrap approvals; `ci classify` runs on main; `approve 2` binds the main tree at that commit (the gate-2 record gains a `tree` binding) together with the classification summary and the other gate-2 artifacts; `lock` follows at once from that same tree; lock-guard applies from then on. Lock-guard has no gate-2 special case. pod-factory's own lock is guarded from the moment gate 2 closes because phase zero, including lock-guard, precedes that moment.

## C. Release pull requests

5. **A release pull request** changes version files and the two lockfiles, which are locked. It merges under a human-written amendment record of kind `release`, produced by `amend --release <version>` and bound to the tree, checked by gate-check's release form with lock-guard. No story-verify, no dispatch, no story ID. `release-gate build` runs on the merge commit afterwards (ADR-013 item 11).

## D. The builder mechanism, final

6. **The authoritative dispatch is a record:** the story's ready-to-in-progress status-transition record on the records branch carries the plan hash, the lease token and the worktree identity. gate-check reads it from the records branch, never from the pull request; `.factory/` never travels on a story branch.
7. **The local pointer** is `.pod-factory-dispatch` at the worktree root, untracked and ignored by git, written by `story attach` for status and resumption. It is not a security dependency.
8. **Hook 4** denies the question tool in any session whose working directory is a git worktree of the project other than the main checkout while a dispatch is live for that project. The orchestrator runs in the main checkout, so it is never denied. A builder that skips `story attach` is still denied, given V18; if V18 fails, V3 is the fallback, and if both fail the gap is reported in `doctor`. `story wait` still rejects a completion from a worktree that never attached.
9. ADR-010 item 23, ADR-011 item 1, ADR-012 item 10 and ADR-013 item 6 are to be read as items 6 to 8.

## E. Doctor, commands, counts

10. **Doctor has two readings.** The scheduled and on-demand `doctor` fails when any layer is missing or waived, as REQ-19 states. gate-check's doctor condition, which blocks merges, fails only on a layer that is missing without an active waiver, so a project running under a visible waiver can still merge. Both list every active waiver.
11. **`setup` is the fourteenth human-only command;** it records waivers.
12. **Record 0002 is re-issued by the approver with `amend`** as soon as the command exists; it is a phase-zero exit item alongside the bootstrap-record migration.
13. **Counts, canonical after this ADR:** 233 tests; nineteen verification assumptions (V19 added); fourteen human-only commands; fourteen record types; seven layers; CI jobs records-validate, lock-guard, class-check, story-verify, gate-check, work-only, artifact-check, classify, release-gate (build and verify) and doctor, plus the advisory precommit; amendment 0.9.2 has sixteen rows across twelve requirements and section 2.

## F. Amendment 0.9.2, rows 14 to 16

14. Row 14 of the proposal is split so that each passage gets its own replacement and REQ-05's classification rules are kept whole: row 14 for the section 2 gate-2 sentence, row 15 for REQ-05 (only the opening clause changes), row 16 for REQ-06 (one sentence added). The proposal file carries the exact text.

## G. Tests and the gate-2 list

15. The gate-2 test list is counted (77 tests) and enumerated in the eval plan's section 1; it includes the four phase-zero tests the third pass found missing and the new T-13-N5. Section 12's phase-tag rule reads: the listed tests carry `[gate-2]`; every other test carries the tag of the phase that delivers its requirement.
16. Test fixes: T-06-P11 is class-check's positive; T-16-P5 is a hook event; T-07-N7 asserts the reopen count; T-17-N3 is a pure negative and T-17-P6 is the citation positive; T-13-N5 covers a builder that skips attach.

## H. Phases

17. Phase zero also delivers the minimal story commands (REQ-07, REQ-08), hooks 1 to 4 and the classify job; artifact-check is phase 1b; phase 2's REQ-07 entry reads "Orca worktree placement".
