# Handoff: bootstrap-03-ci-jobs

Session of 2026-10-13, Opus builder. Approver: Allan Pasco. Design session: scad-d8 (Fable).

Slice 3 lands as two pull requests: 3a (`bootstrap-03a-records-validate`), then 3b (`bootstrap-03-ci-jobs`).

## Done (3a)

- `pod-factory ci records-validate` (`packages/cli/src/check-runner/records-validate.ts`):
  - validates every record on the records branch, each on its own, and names every flagged one;
  - exits 1 when anything is flagged, as an alert, and changes nothing;
  - passes with "nothing to validate" when the records branch does not exist.
- `pod-factory ci <job>` refuses a job it does not have, naming the jobs it has.
- Full history in shallow clones:
  - `fetchRecords` fetches the records branch with its full history when the clone is shallow, which is the Actions default.
  - `readRecords` refuses history that is still cut short, with a plain message (`RecordsReadError`), instead of silently misreading what each record first held.
- `.github/workflows/records-validate.yml`: runs on a `*/15` schedule and on `workflow_dispatch`, with a `contents: read` token and `persist-credentials: false`. It runs main's code only and prints the enforcing commit in the log and the job summary.
- Tests: 76 passing.
  - Section-13 tests added here: T-20-P1, T-20-N1, T-19-N6.
  - Also added: the absent-branch pass, a shallow clone read whole, a cut history refused, and an unknown job refused.
  - Mutation checks: dropping the deepening fetch fails the shallow-clone test; dropping the cut-history refusal fails its test.

## Decisions made in session

- By the approver:
  - L10 is measured by landing records-validate first, as its own pull request.
  - The writer check uses committer identity in milestone zero. runId and runUrl stay in every check-result for a later audit; revisit in phase 1b.
- By the approver, routing: design and spec questions go to the design session. Product, scope and security decisions, approvals, locks and merges, and creating or protecting the records branch go to the approver.
- By the design session:
  - The enforcing copy is main's code at `github.sha` under `pull_request_target`, because TECH-SPEC section 1's pin is "bootstrap until release 0.1". Every job prints the enforcing commit, writes it to the job summary, and verify records it in the bundle manifest.
  - 3a carries the job as well as the workflow, so the scheduled runs pass and measure cadence instead of failing.
  - records-validate passes on an absent branch. The design session withdrew an expectation flag to keep the slice to the enforcement core.
  - The JSON reporter writes to a gitignored per-package path under `.factory/work/reports/`, listed in verify's bundle. The approver's runbook step copies the cli report to `.factory/work/classification/gate-2.json` for the approval commit. Vitest's JSON carries durations, so what reproduces is the outcome, not the bytes.
  - For 3b:
    - one function for the effective locked hashes, shared by `approve amendment`, lock-guard and the main-drift check, with a test of two amendments in sequence;
    - gate-check `needs: [verify-record]` with `if: always()`;
    - verify-record takes its verdict from the verify job's conclusion as well as the manifest;
    - `persist-credentials: false` on every checkout;
    - file scope moves to slice 6 and the relay to slice 5;
    - the PR body states the ordering for the approver and recommends `strict`.

## Known limitation

While the records branch is absent, the scheduled validator cannot tell "not created yet" from "deleted". A deleted branch surfaces through gate-check (which fails closed) or doctor, not through the schedule. Revisit in phase 1b.

## Left

- L10: after 3a merges, observe the scheduled runs over several hours and record observed against nominal in TECH-SPEC section 12. Note that GitHub disables schedules after sixty days without repository activity.
- 3b: lock-guard, verify and verify-record, gate-check, `pr-checks.yml`, the committer writer check in `readRecords` (with fixture updates), the effective-locked-hashes fix, the JSON reporter, eval plan section 5's enforcement row, and the routing rule in `docs/HANDOFF-M0-opus.md`.

## Open questions

- None.

## Next step

The approver reviews and merges 3a. I then start the L10 observation and build 3b in `bootstrap-03-ci-jobs`, reset to the new main.
