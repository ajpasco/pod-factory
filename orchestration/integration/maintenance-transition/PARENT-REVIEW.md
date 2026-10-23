# Parent review — maintenance transition candidate

Reviewed on 2026-10-19; **candidate only, not installed or adopted**.

The parent inspected all five source changes and the regression suite, applied the final patch to a fresh archive of pinned main `a82a857346ce07b55faaa80fce4626c5406bd9d9`, and verified the patch digest and all six resulting file hashes against `HASHES.json`.

Two demonstrated lifecycle/compatibility concerns were corrected before acceptance of the candidate:

- Filtering unlocked bindings now applies only to explicitly marked maintenance records. Ordinary historical amendments retain their prior interpretation.
- Repeating the mixed approval safely refuses an already-effective locked change without another prompt or record. Revoking the approval allows a fresh review.

The parent independently ran the final 23 maintenance regressions from `packages/cli` with the shipped Vitest configuration: **23 passed, zero failed**. Evidence: `parent-targeted-tests.txt`. Earlier parent invocations from the repository root omitted the shipped configuration, first missing fixture Git identity/default-branch setup and then the global CLI build; those were invalid harness invocations, not passing evidence. No product or test change was made to remedy them. Sol's final full CLI run passed **204 tests**, with typecheck and changed-file lint/format checks also passing; see `RESULTS.json`.

The candidate extends the existing amendment with an explicit maintenance opt-in. A single record must bind the complete changed-file set and exact PR/tree under the current lock. Existing passing verification and locked-path checks remain required. It does not turn old amendments into merge authority, approve a plan for execution, add equipment test commands, or dispatch builders.

## Remaining boundary

Current main cannot admit this change through its existing story scopes. The candidate therefore remains an isolated patch: it cannot authorize itself. Adopting it requires a separately reviewed transition under the existing enforcing rules and genuinely passing verification. The separate meeting-reminder browser runner was **not run** and pinned main still contains its scaffold; CLI test success does not prove all required checks green.

After lawful adoption, equipment onboarding still needs its reviewed executable application harness/runner and protected contract, then a bounded gate-3 authorization. The preparation QA harness is not that application harness. No live record, lock, approval, protection setting, installed CLI, merge or builder was changed during this work.
