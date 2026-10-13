# ADR-013: Lock guard, class rules and the builder mechanism, after the second verification

> History (2026-10-13): superseded by `docs/TECH-SPEC.md` 1.0 where the two differ; kept as decision rationale.

> Note (2026-10-12, ADR-014): items 1 (first-lock special case), 3 (bootstrap and release rows) and 6 (builder mechanism) are superseded by ADR-014.

Date: 2026-10-12. Status: accepted as technical defaults, reported to the approver. Source: `docs/reviews/spec-reverification-2026-10-12.md`. Supersedes ADR-012 item 1 (the class table) and item 10 (the builder mechanism); amends ADR-006, ADR-009, ADR-011 and ADR-012 as noted below.

## A. One guard on every pull request

1. **`ci lock-guard`** is a required check on every pull request to main, whatever its branch. It fails when any locked path changed and no validated amendment record is bound to the pull request's head tree. Before the first lock record exists, the gate-2 approval record bound to the tree satisfies it, which is how the initial tests and skeleton land. No class, and no unclassified branch, can merge a locked-path change without a human-written amendment.
2. **`ci class-check`** is a required check on every pull request to main. The branch must match exactly one class and the diff must stay inside that class's allowed paths; an unmatched branch fails. Default deny.
3. **Classes and their additional checks**, all on top of lock-guard and class-check:

| Class | Allowed paths | Additional checks | Merge needs |
|---|---|---|---|
| `story/*` | the story's file scope | story-verify, gate-check | validated gate-4 record bound to the tree |
| `work/*` | `.factory/work/**`, `docs/**` | work-only, artifact-check when a gate artifact changes | auto-merge when all checks pass; no review |
| `locked/*` | locked paths, including test folders, the eval plan and enforcement code | classify when tests change, gate-check in its amendment form | the amendment record bound to the tree, or the gate-2 record for the first lock |
| `rules/*` | rules and templates | gate-check in its rules form | the `rules` approval record bound to the tree (ADR-012 item 23) |
| `release/*` | versions and changelog | gate-check in its story form | gate-4 record; `release-gate build` runs on the merge commit afterwards |
| `bootstrap/*` | anything, phase 0 only | lock-guard and class-check | a bootstrap record bound to the tree, written by the approver; the class is retired at release 0.1 |

4. **The phase-zero scaffold includes** lock-guard, class-check and work-only, so pod-factory's own lock is guarded from the moment gate 2 closes. (Amends ADR-009.)
5. ADR-012 item 4 stands: story-verify runs on `story/*` only. The lock comparison it used to carry lives in lock-guard, which every class runs.

## B. The builder mechanism, one description

6. The orchestrator starts a builder as a Claude Code subagent with worktree isolation and passes the story ID. The builder's first instructed action is `pod-factory story attach <id>`, which writes the dispatch file into the worktree it runs in. There is no pre-created worktree. Hooks 1, 2 and 5 protect locked, protected and secret paths in every session regardless of dispatch. Hook 3 guards dispatch. Hook 4 recognizes a builder by the dispatch file in the event's working directory, which depends on V18 (the working directory reflects the isolated worktree) or on V3 (the event identifies the subagent). A builder that skips `story attach` gains nothing: `story wait` rejects a completion from a worktree with no dispatch file, the story returns to ready, and the skip is logged. ADR-011 item 1 and ADR-012 item 10 are to be read as this item.

## C. Canonical counts and bindings

7. **Tests that must exist and be classified before gate 2** are those for the requirements phases 0 and 1a deliver: the ten milestone-zero tests and the tests of REQ-03, REQ-06, REQ-07, REQ-08, REQ-10, REQ-13, REQ-19 and REQ-20 named in the eval plan's section 1 list. Every later test is written before its phase's build plan (ADR-010 item 5).
8. **The gate-2 record binds** the PRD at its current hash, the criterion-to-control mapping, the design, the eval plan, the runbook narrative, the runbook step file, the rollback plan, and the refreshed mockup where one exists.
9. **A delegated-decision record carries `kind: citation` or `kind: delegated`** (ADR-012 item 13). A dispatch file is a work-zone file, not a record type; the fourteen record types stand.
10. **Counts:** 230 tests in the eval plan after this ADR; eighteen verification assumptions (V18 added to ADR-011's register); CI jobs records-validate, lock-guard, class-check, story-verify, gate-check, work-only, artifact-check, classify, release-gate (build and verify) and doctor, plus the advisory precommit; thirteen human-only commands; fourteen record types; seven layers; amendment 0.9.2 has fourteen rows over twelve requirements and section 2.
11. `migrate` in its minimal form is phase zero (ADR-012 item 26); ADR-012 item 17's "1b" for `migrate` is corrected to phase 0 for the bootstrap migration and 1b for upgrades. V14 moves to phase 2, where the Orca entry is built.
