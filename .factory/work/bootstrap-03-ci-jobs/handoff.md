# Handoff: bootstrap-03-ci-jobs

Sessions of 2026-10-13 and 2026-10-14, Opus builder. Approver: Allan Pasco. Design session: scad-d8 (Fable).

Slice 3 lands as two pull requests: 3a (#3, `bootstrap-03a-records-validate`, merged at 5c6fed6), then 3b (`bootstrap-03-ci-jobs`).

## Done

### 3a, merged

- `pod-factory ci records-validate`:
  - names every flagged record and exits 1 as an alert, changing nothing;
  - passes with "nothing to validate" while the records branch does not exist;
  - in a shallow clone, fetches the records branch with full history, and refuses a history still cut short.
- `records-validate.yml` runs every 15 minutes and on dispatch, with a read-only token and no persisted credentials.
- Dispatched on main at 03:11Z on 2026-10-14 against the real records branch: 4 valid records, 0 flagged, success in 15 seconds.

### 3b

- `pod-factory ci lock-guard --pr <n> --head <sha>`:
  - diffs from merge-base(main, head) to the head over the lock's own patterns;
  - each changed locked path needs a valid, unrevoked amendment approval bound to the head tree whose after hash equals the head's;
  - main's own locked files must equal a hash the lock or an amendment approved; otherwise it reports drift and fails;
  - passes with "nothing is locked yet" when there is no lock;
  - names flagged records first on every path.
- `effectiveLock` (`src/lock-state.ts`):
  - the lock's hashes with each valid, unrevoked amendment that refers to that lock applied in order;
  - an amendment whose before hashes no longer match is stale and changes nothing;
  - used by `approve amendment` (its before hashes, which fixes the slice-2 break where a second amendment to a path could never pass), by lock-guard and by the drift check.
- `pod-factory ci verify --pr --head --subject --bundle`:
  - runs the lock's `testCommands` in the checked-out head, or, before the first lock, the enforcing copy's section-4 commands for the packages present; never the branch's scripts;
  - passes no token or `ACTIONS_*` variable to the code it runs;
  - stops at the first failing command;
  - writes the bundle: `manifest.json` (pull request, head commit and tree, enforcing commit, lock, each command with its exit code and log hash, each JSON report with its hash, verdict), the logs and the reports.
- `pod-factory ci verify-record`:
  - runs no application code, and refuses unless the actor is the check runner;
  - checks the bundle against its manifest, and takes the verdict from the verify job's conclusion as well as the bundle;
  - writes a passing or failing check-result with the manifest's hash, or nothing when there is no bundle.
- `pod-factory ci gate-check --pr --head`:
  - needs a valid, unrevoked story approval (or bootstrap approval before the first lock) for this pull request bound to the head tree, plus a passing verify result for the same tree;
  - reads the records branch again before reporting and evaluates again if it moved, up to five times.
- The commit-level writer check in `readRecords`: a human record (approval, lock, revocation, bootstrap) committed by the Actions bot is flagged, a check result committed by anyone else is flagged, and an unreadable committer is flagged.
- Every job prints `enforcing copy: commit <sha>`.
- `.github/workflows/pr-checks.yml`:
  - `pull_request_target`, `permissions: {}` at the top, concurrency per pull request;
  - four jobs: `lock-guard` (full-history checkout, for the merge base), `verify` (read-only), `verify-record` (`contents: write`, needs verify, `if: always()`, pushes with the token set on the remote explicitly), and `gate-check` (needs verify-record, `if: always()`);
  - `persist-credentials: false` on every checkout.
- `records-validate.yml` now fails when the records branch is missing. The job itself still passes for other projects that have not created theirs.
- The vitest JSON reporter is in the locked config and writes `.factory/work/reports/cli.json`, which is gitignored; verify bundles it.
- Docs:
  - TECH-SPEC section 3.2 (the enforcing copy, lock-guard, verify-record, gate-check's second read) and section 4 (the commit-level writer check, full-history reads);
  - eval-plan section 5's enforcement row, and a note that a backticked path in that table is a locked pattern;
  - the routing rule in `docs/HANDOFF-M0-opus.md`.
- Tests: 104 passing, stable over three runs. Typecheck, ESLint and Prettier are clean.
  - Section-13 tests in 3b: T-06-N2, T-06-N3, T-06-P2, T-06-P4, T-06-N4, T-06-P7, T-06-N6, T-06-P10, T-06-N9, T-09-P9, T-09-N12, T-10-P1, T-10-N1, T-10-P2, T-10-N2, T-10-N3, T-10-P3, T-22-N7.
  - Also tested: two amendments in sequence, main drift, a doctored log, a failed verify job with a passing manifest, no bundle, the pre-lock commands, bootstrap approvals before and after the lock, an absent records branch, and the writer check.
- Mutation checks, each failing the matching test: gate-check without the second read; amendment before hashes from the lock; verify-record ignoring the job's conclusion; tokens passed to test code; no drift check; no committer check.
- A slice-2 test flake fixed: `lock.test.ts` read "the last record", which ties when two records share a timestamp second. It now selects by type.

## Decisions made in session

- By the approver:
  - L10 is measured by landing records-validate first, as its own pull request.
  - The writer check uses committer identity in milestone zero. runId and runUrl stay in every check-result for a later audit; revisit in phase 1b.
  - Routing: design and spec questions go to the design session; product, scope and security decisions, approvals, locks and merges, and creating or protecting the records branch go to the approver.
- By the design session:
  - The enforcing copy is main at `github.sha`: the pin is "bootstrap until release 0.1".
  - 3a carries the job with the workflow.
  - The JSON reporter writes to an ignored per-package path, and the approver's runbook copies one run to `.factory/work/classification/gate-2.json`.
  - The seven review changes:
    - the shared effective-locked-hashes function;
    - full-history fetch;
    - why the harness may judge the code it runs, stated in the workflow;
    - gate-check needs verify-record with `if: always()`;
    - `persist-credentials: false` everywhere;
    - the ordering for the approver;
    - `strict` recommended.
  - File scope moves to slice 6, the relay to slice 5.
  - Once the records branch existed, records-validate here fails when it is missing.
- By the design session, relaying the approver: the records branch was created at root fc8eb23, which I verified (one commit by the approver, exactly 0001 to 0004, byte-identical to main). The design session said the approver authorised it to merge the remaining bootstrap pull requests after its own review.

## Known limitations

- On a project whose records branch is absent, the job cannot tell "not created yet" from "deleted". This repository's workflow now checks for the branch itself. Revisit in phase 1b.
- The jobs fetch without credentials, which works because the repository is public. A private repository would need a token for those fetches; not built.
- The committer identity can be forged by anyone holding push rights to the records branch (PRD section 5).

## Left, for the approver only

1. Before swapping the required checks: the records branch exists (done), and `approve bootstrap <n>` has succeeded once, typed in a terminal outside any agent session. Otherwise every merge to main is blocked.
2. Swap the required checks, binding each to the GitHub Actions app so a status posted with another token cannot satisfy it:
   `gh api -X PATCH repos/ajpasco/pod-factory/branches/main/protection/required_status_checks -F strict=true -f 'checks[][context]=lock-guard' -F 'checks[][app_id]=15368' -f 'checks[][context]=verify' -F 'checks[][app_id]=15368' -f 'checks[][context]=gate-check' -F 'checks[][app_id]=15368'`
   then delete `bootstrap-check.yml` in a bootstrap pull request.
   - `strict` is recommended: with a stale branch, the merge commit's tree is not the tree that was approved, so main can hold content nobody approved. It costs nothing while merges are one at a time, and is required before phase 2's parallel merges. The decision is the approver's.
3. Protect the records branch. The `verify-record` job pushes with the Actions token, so any push restriction must still allow github-actions.

## Left, for me

- L10: watch the scheduled runs over several hours and record observed against nominal in TECH-SPEC section 12. As of 03:16Z no scheduled run had fired yet (the dispatched run was at 03:11Z). GitHub disables schedules after sixty days without repository activity.

## Open questions

- None.

## Next step

The design session reviews 3b. Then slice 4, the hook, verifying L7 to L10 early and reporting each as verified or pending.
