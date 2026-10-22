# Gate 7, story S1: the run, the verdict and what it found

Run on 20 October 2026 by a session acting as the preparation orchestrator under
`docs/orchestrator/ORCHESTRATOR.md`, briefed only on where the files were. Its decisive claims were
re-checked against the code and in a lab by the session that had written the tests; where the two
disagreed, this record says so.

**Verdict: gate 7 is not passed. The first failing condition is the fifth — the enforcement cannot
see these tests.** Conditions 1 to 3 hold on quoted runs. Condition 4 ran and returned open
blockers. Conditions 5, 6 and 7 fail for one reason: nothing of this project is on the trunk,
nothing is locked, and no approval of any kind names it.

## Condition by condition

| # | Condition | State |
|---|---|---|
| 1 | The acceptance tests exist as code | **holds** — 257 plan rows, 17 owned by S1, 17 test functions, set difference empty both ways; the ten rows citing criteria carry exactly those labels |
| 2 | They fail for the reason the plan predicts | **holds** — unit tree: 8 collection errors, one per module, no case per row; db tree: one case erroring at setup. Both verbatim what eval-plan 1.2 records |
| 3 | They are satisfiable | **holds** — 16 passed and 1 passed against a throwaway implementation built from the pinned contract, on real PostgreSQL 16; the reference was destroyed |
| 4 | A checker that did not write them has reviewed them | **ran; blockers open** — no review record existed, so two fresh checkers were dispatched. See below |
| 5 | The enforcement can see them | **FAILS** — `LOCKED_PATTERNS` holds 24 patterns, none naming this project; `LOCKED_COMMANDS` holds eight, all npm, no pytest command; `origin/main` holds zero files matching `equipment-checkout` |
| 6 | The ceremonies have been run by the user | **FAILS** — a search of all 76 records for "equipment" returns nothing. No classification, gate 2, lock, build plan, story file or gate 3 |
| 7 | The dispatch preconditions hold | **cannot hold** — each of `story start`'s five refusals applies |

## What condition 4 found, and the one that mattered

A builder can own the runner of its own exam through a file inside its own story scope.

`api/requirements.txt` is S1's file by eval-plan 8.1. Adding one ordinary-looking package whose
only content is a `pytest_runtest_call` wrapper that swallows the result, against a stub build that
declares every pinned name and applies no rule:

```
frozen exam, nothing added                 13 failed, 3 passed
+ one line in the builder's own list       16 passed      <- implements nothing
+ PYTEST_DISABLE_PLUGIN_AUTOLOAD=1         13 failed, 3 passed
```

All seventeen rows reported green, with their `row` and `criterion` properties intact. Neither
guard reaches it: the lock does not cover the builder's dependency list, `gate-check`'s scope
containment does not fire because the file is inside the declared scope, and the hook allows it.
The `--force-reinstall` added earlier the same day closes *substitution of a pinned package* and
nothing further.

Closed by `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1` on every pytest command, with `-p` naming any plugin a
command needs. Re-proved afterwards: the unit tree still passes against an independent
implementation, and the db baseline still reports one case erroring at setup rather than a
collection error.

**The lesson worth keeping.** Three checkers had already reviewed these tests that day and none
found it. It was found by a session doing gate 7's own job rather than reviewing the tests — which
is the argument for the gate existing as a separate step, not a summary of the reviews before it.

## Two decisions that are the user's, not an agent's

Both are the same shape: the frozen case asserts what its eval-plan row says, and **the row says
more than the criteria it brackets.** Freezing either binds behaviour no criterion requires and no
builder may fix.

1. **F-02, the non-text name.** `T-009-N10` requires a name that is not text (`None`, `42`) to be
   rejected. `REQ-009.6` states whitespace-as-empty; `REQ-009.10` states the 100-character cap.
   Neither states this.
2. **F-03, the phantom loan.** `T-008-N7` requires the full biconditional between status and
   borrower. `REQ-008.1` states only that no item has more than one active loan or shows more than
   one borrower. The biconditional comes from blueprint section 7, which the builder also may not
   change, so the exposure is smaller.

Either can be closed by adding the missing criterion or by narrowing the case. **Adding a criterion
creates a requirement ID, which decision D4 reserves to the PRD at gate 3**, so no agent may do it
and no commit should pretend to.

## One finding downgraded on review

`F-01` claimed `T-007-N6` is a blocker because it labels five criteria and asserts one
`require_admin` gate. True that a build whose delete, add, mark and restore paths never call the
gate still passes this case — but the register gives `REQ-007.2` to `REQ-007.5` both mechanisms, U
here and I through S2's `T-007-N2` to `T-007-N5`, which drive each operation separately. No
criterion rests on this row alone. A coarse label, not a hole; recorded as an advisory.

## Open points the run turned into facts

None of these is a new finding; all were recorded before it started.

- **OP-1.** `python3.12` is **not installed** on this machine (`python3 --version` → 3.13.3), so
  **C1 cannot pass as written**. Docker 28.1.1 and Compose v2.35.1 are present.
- **OP-1, C4.** Host port 55432 is held by another project. A container that cannot bind leaves
  that database listening and the D rows run against the wrong store with nothing to show for it.
  C1 now checks the port is free.
- **OP-2.** Resolved for the API test tools: the twelve hash-pinned lines install under
  `--require-hashes --force-reinstall`, giving pytest 8.3.5 and httpx 0.27.2. The Node, React,
  Vite, Vitest and Playwright lines remain untested.
- **ADR-021's prefix is unapplied.** Required before the freeze. ADR-021 cites "eval-plan.md
  section 4 (the commands)" where the commands are section 7, so the ADR's own citation needs
  correcting first.

## The ordered path to a real gate 7

Every step is the user's or needs the user's approval, and none can be substituted locally.

1. Decide F-02 and F-03.
2. Correct ADR-021's section citation and apply its prefix to the eval plan and the blueprint.
3. Re-check the amended plan in a fresh session and re-accept gate 6: three amendments since
   acceptance have invalidated the planning review by `ORCHESTRATOR.md` section 7.
4. Decide how a second project gets a build plan and story numbering (ADR-017's gap). `story-1` to
   `story-3` are the factory's own and `story-3` is in progress. **Nothing downstream is possible
   until this is answered.**
5. Land the plan, the blueprint and the frozen harness on the trunk in an approved pull request.
6. In the same window, extend `LOCKED_PATTERNS` with this project's test and harness paths and
   `LOCKED_COMMANDS` with its exact pytest commands. Enforcement code, changed by a human.
7. Run the ceremonies in order — classification, `approve 2`, `lock`, the build plan and story
   files, `approve 3` — each verified afterwards from the record, never from a report that it was
   done.
8. Take the baseline again with the exact frozen commands, on Python 3.12, with C4's port settled.

Until step 6 exists, freezing these tests would produce a local record of hashes and not the
factory's protection. **The two must not be called the same thing.**
