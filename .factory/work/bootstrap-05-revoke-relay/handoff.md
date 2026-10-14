# Handoff: bootstrap-05-revoke-relay

Session of 2026-10-14, Opus builder. Approver: Allan Pasco. Design session: scad-d8 (Fable).

Built on slice 4 (`bootstrap-04-hook`, PR #5), which is waiting for the approver. This pull request targets that branch, so its diff is slice 5 alone.

## Done

- `pod-factory revoke <record ID | bootstrap file> --reason "<why>" [--wait <seconds>]`:
  - requires a human at a terminal; finishes pending writes;
  - the target must be a valid record or bootstrap record;
  - shows a statement and a shown hash, and asks you to type `revoke <8 hex>` (lowercased before comparing);
  - fetches again, and writes nothing if the target was revoked in the meantime;
  - writes the revocation with the human as actor;
  - prints the gate effect, for example "Gate 2 is open again. The lock stays in force until a new gate-2 approval and lock.";
  - dispatches records-validate through `gh workflow run`, falling back to the schedule if that fails;
  - waits up to `--wait` seconds (default 120) and reports **pending** or **enforced**;
  - run again for a revoked record, it reports the state without writing.
- Revoking a lock is the one revocation that loosens, so its statement names every path that stops being locked before the hash is typed.
- Enforcement is judged from the records alone, plus GitHub's view of the pull request:
  - The pull request is the one the revoked approval or verify result names.
  - It counts as affected when it is open and its head tree is the tree the record binds.
  - Enforced means a relay record exists for (revocation, pull request, head tree).
  - Closed pull requests and ones that moved past the record need no block.
  - If gh cannot be asked, the state stays pending, never enforced.
- The relay, `ci records-validate --relay --run-id --run-url`:
  - after validating, and for each revocation of a record that names a pull request, lists open pull requests with `gh api`;
  - for each affected one not already relayed, posts a failing `gate-check` check run on the head (title "approval revoked") and writes a failing gate-check check result naming the revocation, committed as the check runner;
  - is idempotent; asks GitHub nothing when no revocation names a pull request; fails as an alert when it cannot list pull requests.
- Shared rules in `src/revocation.ts`: the target, the pull request a record names, whether a head relied on it, and the relay record. `revoke` and the relay therefore agree on what "affected" means.
- `src/github.ts`: every GitHub call goes through `gh`, in the invocation's own environment.
- `revocation.revokes` accepts a bootstrap file name, as `refs` does. `approve 2` refuses a revoked classification record.
- Hook: an unreadable event now denies, since the matcher sends only file-edit events (the design session's slice 4 review).
- Workflow for the approver to copy: `.factory/work/bootstrap-05-revoke-relay/workflows/records-validate.yml`. Its diff from main:
  - `contents: write`, `checks: write`, `pull-requests: read`;
  - `GH_TOKEN` and `GH_REPO` for the step;
  - the token set on the remote;
  - `--relay --run-id --run-url`.
- TECH-SPEC sections 3.2, 6 and 12 (L3 must be confirmed again under the app binding).
- Tests: 127 passing on two runs. Typecheck, ESLint and Prettier are clean.
  - Section-13 tests: T-22-P1, T-03-P4, T-03-N6 (its gate-check half), T-22-N6.
  - Also tested: the lock revocation statement and a mistyped confirmation; refusals (agent session, unknown record, no reason); a bootstrap revocation blocking `approve 2`; the relay posting once, skipping closed and moved pull requests, asking nothing when idle, and failing when gh is down; the hook's unreadable event.
  - A fake `gh` on PATH answers from a state file and logs its calls. Shipped code reads no test variable.
- Mutation checks, each failing a test:
  - enforced on any check result;
  - "relied on" ignoring the tree;
  - the relay not idempotent;
  - no lock statement;
  - a revoked classification accepted;
  - the hook allowing an unreadable event.

## Decisions made in session

- By the design session:
  - Revoking the gate-2 approval leaves the lock in force: a revocation withdraws authority and never grants any. Revoking a lock does unlock, and must name the paths first.
  - `--wait` defaults to 120 seconds.
  - The relay's check run must be confirmed under the GitHub Actions app once the checks are bound to it.
  - The affected pull request comes from the records alone.
  - The idempotency key is (revocation, pull request, head tree).
  - Fail closed when gh cannot be asked.
  - The workflow change is a human copy.
  - A fake gh on PATH, with no test variable in shipped code.
  - From the slice 4 review: an unreadable hook event denies.

## Left, for the approver only

1. Everything listed for slice 4 first (PR #5): install the binary, `approve bootstrap 5`, the swap, and records-branch protection.
2. On this branch, copy `.factory/work/bootstrap-05-revoke-relay/workflows/records-validate.yml` to `.github/workflows/records-validate.yml` and commit it. The relay needs it, and an agent cannot write the workflow.
3. `approve bootstrap <this PR's number>`, then re-run gate-check and merge.
4. After the merge, confirm L3 under the app binding on a real pull request: approve a scratch bootstrap pull request, revoke the approval, and check that the relay's failing gate-check blocks it. I can prepare the scratch pull request; the approve and revoke are his.

## Left, for me

- L10: no scheduled run of `records-validate` by 03:57Z on 2026-10-14, 57 minutes after it reached main at 03:00Z; only the 03:11Z dispatch. Keep watching. If the schedule has not fired after several hours, that is itself the L10 finding.

## Open questions

- None.

## Next step

Slice 6: `story start` and `story finish`, including verify's file-scope check deferred from slice 3. Send the design first.
