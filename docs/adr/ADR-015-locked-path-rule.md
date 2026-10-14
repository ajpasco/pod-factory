# ADR-015: The locked-path rule judges what a merge leaves on main

Date: 2026-10-14. Status: accepted. Decided by: the design session, on the builder's counterexamples, after an external review of the revocation path; the approver may veto. PRD basis: REQ-06 (locks and amendments), REQ-22 (revocation). Amends ADR-006 item 6 (lock-guard) and ADR-006 item 3 (gate-check) for milestone zero.

## What was wrong

Milestone zero shipped the locked-path rule as two separate rules: main must hold only locked content that the lock or an applied amendment approved (the drift rule), and a pull request must not change a locked path without an amendment bound to its head (the change rule). Two defects followed.

- Revoking an amendment whose pull request had already merged deadlocked the repository. Main kept the revoked content, so the drift rule failed every pull request. A revert failed too: the drift rule reads main, not the head, and the change rule saw a locked path changed without an amendment. `approve amendment` refused the revert, because its head equals what is locked. The only way out was `approve 2` and `lock` again, which re-locks the content the human had just withdrawn approval from. A revocation whose only remedy is re-approving what was revoked is not a revocation.
- gate-check never applied the rule. It trusted lock-guard's GitHub check run, which a re-run supersedes, so a revoked amendment left a pull request mergeable.

## Decision

gate-check applies the locked-path rule itself, through the one function lock-guard also uses (`checkLockedPaths`), against the records it read. It depends on neither lock-guard's check run nor any lock-guard record. lock-guard writes no record, and a green check run proves nothing after a revocation. For merging, lock-guard's own check run is advisory and gate-check is the authority. Do not add a lock-guard record for gate-check to read: it would be a new write path in a protected workflow, carrying a fact gate-check can compute itself.

The rule judges the content a merge would leave on main, path by path, for every locked path:

1. A locked path the pull request changes (between the merge base with main and the head) passes when either:
   - its head content is exactly what is locked now, the lock with every valid, unrevoked amendment applied; or
   - a valid, unrevoked amendment approval bound to this pull request and its head tree approves exactly that content.
2. A locked path the pull request leaves alone is what the merge keeps from main, so main's content there must be content this lock has approved: the lock's own, or the after hash of an amendment applied under it (`held`).

When a change fails because its amendment was revoked, or because the amendment it was built on was revoked, the failure names the amendment and the revocation.

## Why the two halves differ

A changed path gates on what is locked now; an untouched path gates on anything the lock has approved. That looks inconsistent, and the next reader will want to unify the two. Each direction of unifying breaks something:

- **Unify downward, changed paths checked against `held`:** a pull request could restore a superseded version of a locked test, weaker than the one an amendment approved, with no amendment, because that version was approved once. T-06-N11 guards this.
- **Unify upward, untouched paths checked against what is locked now:** an amendment applies as soon as it is approved, not when its pull request merges. One approved but unmerged amendment would then fail every other pull request in flight, and every branch not yet rebased after it merges. T-06-P12 guards this.

A third simplification, judging only the head's content, was proposed and rejected. A pull request that branched before main drifted, and leaves the drifted path alone, holds approved content in its head. It would pass, and its merge would keep main's unapproved content. The test "fails every pull request, naming the path, when main holds locked content nobody approved" in `packages/cli/test/ci-jobs.test.ts` guards this. Rule 2 exists for it.

## Correctness does not depend on up-to-date branches

The rule holds with GitHub's "require branches to be up to date" setting off, which is how the repository stands. That setting narrows the window between a head and its merge result. It is a backstop and never the mechanism: if the only thing closing a hole is a setting nobody has turned on, the hole is open.

## What it gives

- A revoked amendment whose pull request has not merged: that pull request fails, naming the amendment and the revocation (T-22-N8). It needs a new amendment or a revert.
- A revoked amendment whose pull request has merged: every pull request that leaves the path alone fails, naming the path. Either of two recoveries clears it, and neither is a re-lock (T-22-P4):
  - a pull request restoring the path to what is locked now passes with no amendment, because returning to the approved state is not a change away from approval;
  - `approve amendment` on a pull request whose head holds what main holds approves that content, and the drift clears once the record lands.
- An amendment built on a revoked one no longer applies. Its pull request fails naming both amendments, until `approve amendment` binds the change against what is locked now (T-22-N9).

## What an amendment does and does not bind

Rule 1's restore branch is about content, not about which pull request carries it. Once an amendment approves content for a path, any pull request whose head holds exactly that content passes without an amendment of its own. That is sound, because the content is human-approved and gate-check still needs a tree-bound human approval for the pull request itself. It does mean an amendment does not grant one pull request alone the authority to land that content.

An amendment's authority is not tied to its pull request merging. If pull request 7 is closed without merging, its amendment A1 stays valid, so what is locked now stays at A1's content indefinitely. Until someone revokes A1, a pull request restoring the lock's own content needs an amendment. Abandoning a pull request does not withdraw its amendment; only `revoke` does.

## Alternatives rejected

- Keeping the two rules and documenting `approve 2` then `lock` as the recovery: it ships a known deadlock that arms itself when gate-check becomes a required check, and its remedy re-approves revoked content.
- Letting `approve amendment` bind a restore against main's current hash: it changes amendment semantics to solve a problem the single rule removes.
- Judging only the head's content: see above.
- Having gate-check require a lock-guard check-result record: see the decision.
