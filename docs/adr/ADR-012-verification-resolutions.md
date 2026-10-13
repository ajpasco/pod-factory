# ADR-012: Resolutions from the spec verification pass

> History (2026-10-13): superseded by `docs/TECH-SPEC.md` 1.0 where the two differ; kept as decision rationale.

> Note (2026-10-12, ADR-013): item 1's class table and item 10's builder mechanism are superseded by ADR-013 sections A and B; item 17 reads phase 0 for the bootstrap migration.

Date: 2026-10-12. Status: accepted as technical defaults, reported to the approver; two items in section D need the approver. Source: `docs/reviews/spec-verification-2026-10-12.md` (one blocker, eleven majors, thirteen minors, seven decision-integrity findings) and the plain-language summary writer's six notes. This ADR states the canonical rule wherever files disagreed; the files are corrected to match it.

## A. Merge rules, canonical

1. **Pull-request classes and their checks.** Required checks are configured per class by branch pattern; `doctor` verifies the configuration.

| Class | Allowed paths | Checks required | Merge |
|---|---|---|---|
| `story/*` | the story's file scope; never `.factory/` or a locked path | story-verify, gate-check | validated gate-4 record |
| `work/*` | `.factory/work/**`, `docs/**` except locked paths | work-only (`ci work-only`), artifact-check when a gate artifact changes | auto-merge on green, no review |
| `locked/*` | locked paths, including test folders, the eval plan and enforcement code | story-verify's lock comparison, classify when tests change | the human-written amendment record bound to the tree |
| `rules/*` | rules and templates proposed by the retrospective | work-only | a human approval record of kind `rules` bound to the tree |
| `release/*` | versions and changelog | release-gate build | gate-4 record as for a story |

2. **`ci work-only`** is a defined job: it fails any change outside the class's allowed paths and any change to a locked path, and it runs the lock comparison before anything auto-merges. It has tests. This closes the blocker: the locked eval plan in `docs/` can no longer reach main through a work-only merge.
3. **Tests are added through `locked/*`,** never `work/*`, so every test change carries a lock amendment and a classification record (ADR-010 item 5, ADR-011 items 3 and 32).
4. **story-verify runs only on `story/*`.** Its `.factory/` rule and file-scope rule apply there. The other classes have their own checks.
5. **CODEOWNERS covers** `.github/`, `.claude/`, the enforcement scripts and `templates/checklists/`. It does not cover `.factory/work/` or `docs/`, so work-only auto-merge is possible, and it does not cover the records branch, which is protected by validation instead.
6. **records-validate** runs from main on a schedule and on demand; an invalid record lands, is flagged and never reaches the validated ref. No file may describe a rejected push.
7. **The enforcement layers are the seven of ADR-011 item 8,** everywhere: plugin hooks, pre-commit, CI workflows defined on main, branch protection on main, records-branch protection, CODEOWNERS, required checks per class.
8. **The human-only command family has thirteen members:** approve, reject, acknowledge, answer, amend, waive, revoke, delegate, migrate, lock, revert, incident, secret set. **Record types number fourteen:** approval, rejection, acknowledgment, answer, delegation policy, delegated decision, waiver, amendment, revocation, status transition, check result, lock, migration, incident.
9. **The pre-commit hook** protects locked and protected paths in a working tree on main. It never sees record writes, which the CLI commits on the records branch through git plumbing; record integrity rests on hooks and CI. This clarifies decision 8; it does not change it.

## B. Builders in their own worktrees, the mechanism

10. `pod-factory story start <id>` creates the story's worktree under the project's worktree root, prepares the dispatch file, and returns the path. The orchestrator launches the builder subagent with Claude Code's worktree isolation, and the builder's first instructed action is `pod-factory story attach <id>`, which writes the dispatch file into the worktree it actually runs in. Hooks match their event's working directory to a live dispatch file. The scaffold includes `story start` and `story attach` (amends ADR-009).
11. **New verification item V18:** a hook event's working directory reflects the subagent's isolated worktree. Verified in phase 0. If it does not, hook 4 falls back to the subagent identity of V3, and if neither holds, the gap is reported, not hidden.
12. Milestone zero gains a test of hook 4 in sequential mode (eval plan section 12).

## C. Citation answers versus delegated decisions

13. Answering a builder's question by citing the clause of the PRD, design or rules that settles it exercises no delegated authority. `pod-factory decide --cite` records it as a decision of kind `citation` with the quoted clause and needs no policy. Choosing among options the documents leave open is a delegated decision of kind `delegated`, needs a policy category, and is refused without one. The deny-all default blocks only the latter. This matches REQ-13 ("answers what the spec already settles") and REQ-17 together; the eval plan's T-17-N3 and abuse case AB-17-1 are reworded to "decides an open question alone".

## D. Approved decisions this design touches, stated explicitly

The PRD requires the spec to name any proposed change to an approved decision. The verifier found seven unstated ones. Their status:

| # | Approved decision | What the design does | Status |
|---|---|---|---|
| 1 | Decision 2 and PRD section 2: without Orca, stories run one at a time | ADR-003 adds a parallel option for stories the plan marks independent, at the approver's own direction on 2026-10-12 | Approver-initiated; wording change carried by amendment 0.9.2 row 13 |
| 2 | Decisions 4 and 24 and PRD section 3: milestone zero ends phase one and the Orca backend comes next | The spec inserts phase 1b, completing gates 1 to 4, before the Orca backend | **Needs the approver**: keep 1b before Orca, or move it after |
| 3 | REQ-05 and REQ-06: every test classified and locked at gate 2 | Answer A5: phase zero's and milestone zero's tests at gate 2, later phases' before their build plan | Approver-initiated; wording change carried by amendment 0.9.2 row 14 |
| 4 | Decision 20 (reference): recorded defaults only on founder-only projects | ADR-010 and ADR-011 settle technical defaults on this engineer-led project | The active PRD's REQ-04 admits a recorded default as a decider without that restriction, and the approver authorized the defaults approach on 2026-10-12; every default is listed for overrule. Stated, not hidden |
| 5 | Answer A2: work-only auto-merge | Tests had been routed through it and CODEOWNERS would have blocked it | Fixed by items 1 to 5 above; A2 stands as approved |
| 6 | Answer A6 cited by record 0003 | Record 0003 rebinds the reference hash, a non-binding traceability note | **Needs the approver**: acknowledge record 0003 as a correction needing no decision, or re-issue it |
| 7 | Decision 8 names the pre-commit hook among the layers enforcing the human-only write path | Pre-commit never sees record writes | Clarified by item 9; no change of decision |

Also stated: amendment 0.9.2 rows 4, 6, 8, 9 and 12 narrow guarantees to what is observable, and the proposal now says so instead of "narrows nothing". ADR-011 amends ADR-003, ADR-006 and ADR-009 on technical points only; the approver's choices in them stand.

## E. Smaller corrections applied

14. Alternatives rejected are added to ADR-009 (hello-world story; approval path first), ADR-010 (per section: the inverse of each default) and ADR-011 (per item where one exists).
15. Every rendering is acknowledged, not only those that differ (eval plan section 1 corrected to match REQ-05).
16. The runbook has two files: `release/runbook.md`, the narrative reviewed at gate 2, and `release/runbook.yaml`, the step file the executor runs; both are bound by the gate-2 record and the yaml file is locked.
17. REQ-20 is delivered by phases 0 (schema version, pin) and 1b (`migrate`, upgrades as amendments).
18. Tests carry a phase tag in their title; the eval plan lists which tests belong to phase 0 and milestone zero.
19. A regression baseline test covers record 0003 as well as 0001 and 0002.
20. The seven untested abuse cases get tests (eval plan section 12), as do the work-only, artifact-check and classify jobs and the dispatch-record backstop.
21. Amendment 0.9.2's rows are renumbered in order, and its count reads "fourteen rewordings across eleven requirements".

23. **`approve rules <pull request>`** is a gate value of the approval path: it binds the pull request's tree for a `rules/*` change after the retrospective's citations check passes; gate-check in its rules form requires that record for merge. (verifier minor 13)
24. **Protected refs.** Records-branch protection covers three refs: `pod-factory/records` (append-only, CI-validated), `pod-factory/records-validated` (advanced only by the validation job, never force-moved) and `pod-factory/evidence` (append-only, size-capped). `doctor` checks all three. Evidence manifests are committed on the records branch under `.factory/evidence-manifests/`, an allowed path for records-validate. (minor 20)
25. **`release-gate build` runs on the merge of a `release/*` pull request,** building from the merge commit that gate 5 binds as the revision, not from the pull request. (minor 19)
26. **A minimal `migrate`** is part of the phase-zero scaffold, so the bootstrap records move to the records branch when it is created; REQ-19's `explain` is phase 1b; REQ-16's Orca-entry criterion moves to phase 2; release 0.1 ships at the end of phase 1b through the manual runbook under a bootstrap record, which ends decision 23's exception. (minor 23)
27. **Hook 5 logs builder reads outside the supplied set** as the one exception to "allowed calls are not logged". (minor 21)

## F. Amendment to gate 1 after amendment 0.9.2

22. Applying amendment 0.9.2 reopens gate 1 for the requirements it changes; the amendment record itself, written by the approver, is the re-approval for those requirements, as record 0002 was for REQ-09. Order: approver approves the wording; the PRD is edited to 0.9.2; record 0004 is written binding before and after hashes per requirement; the mapping is regenerated; gate 2 binds the PRD 0.9.2 hash and the regenerated mapping.
