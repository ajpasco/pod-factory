# ADR-011: Resolutions from the criterion-to-control mapping

> History (2026-10-13): superseded by `docs/TECH-SPEC.md` 1.0 where the two differ; kept as decision rationale.

> Note (2026-10-12): ADR-012 supersedes section C's table with per-class required checks and a `locked/*` class, defines `ci work-only`, excludes `.factory/work/` and `docs/` from CODEOWNERS, and adds V18. Alternatives rejected for each item: the inverse choice, or the next-nearest option the mapping listed.

Date: 2026-10-12. Status: accepted. Decided by: technical defaults decided in the spec and reported to the approver, open to being overruled; nothing here changes an approver decision. Resolves the 35 open items, adopts the reference mechanisms the mapping found only in `docs/PRD-reference.md`, and records the platform assumptions to verify (register in section F, extended by later ADRs). Amends ADR-003, ADR-006, ADR-009 and ADR-010 as noted.

## A. One design change that closes the REQ-13 conflict

1. **Every builder runs in its own git worktree, in every mode.** Sequential inline builders no longer share the orchestrator's directory; each runs in a worktree Claude Code's worktree isolation creates and registers it with `story attach` (mechanism: ADR-013 item 6). Hooks therefore always tell a builder from the orchestrator by working directory, hook 4 enforces C-13-1 in every mode, and the sequential-inline gap in ADR-010 item 23 is withdrawn. Merges back to main stay serialized. (Amends ADR-010 item 23 and ADR-003's sequential-in-one-worktree reading; REQ-13 needs no mode exception.)

## B. Two CI jobs added (amends ADR-006)

2. **`ci artifact-check <gate>`** runs on every work-only pull request that adds or changes a gate 1 to 3 artifact and checks its content against the pinned checklists: required sections, requirement and test tags, dispositions and acknowledgments, the plain-language lint, a secret scan, flow IDs for mockups. `approve` runs the same code locally and requires a passing CI artifact-check record for the artifact's hash. (O1)
3. **`ci classify`** runs the locked suite and classifies every test per REQ-05, writing one check-result record per test and a classification summary bound to the tree. It runs on the `locked/*` pull request that adds a phase's tests (ADR-012 item 3) and locally before `approve 2` or a lock amendment. (the four C-05 rows with no job)
4. **gate-check** also requires the human acknowledgment record for a delegated gate-4 approval (O20), compares every locked path's hash with the lock record explicitly (O30), and checks the story branch's dispatch file against the validated plan hash as a backstop for builders started outside the CLI (O31).
5. **`doctor`** is a required check on main as well as a scheduled job, so a failing doctor blocks merges. (O22)
6. **release-gate** has two triggers: `release-gate build` on the merge of a `release/*` pull request, from the merge commit gate 5 binds (ADR-012 item 25), and `release-gate verify` on the executor's start request after gate 5. (O23)
7. **records-validate** re-evaluates each status-transition record's preconditions and each approval's preconditions (artifact-check result, dispositions, acknowledgments) from the records available at that point, not only the transition graph. (O2)

## C. Pull-request classes (O3)

| Branch class | Checks | Merge needs |
|---|---|---|
| `story/*` | story-verify, gate-check | validated gate-4 record |
| `work/*` | work-only check, artifact-check, classify when tests are added | auto-merge on green |
| `rules/*` (retrospective proposals, templates) | work-only check with a rules path rule | a human approval record of kind `rules` bound to the tree |
| `enforcement/*` (enforcement code under an amendment) | story-verify's lock comparison | the amendment record bound to the tree |
| `release/*` | release-gate build | gate-4 record as for a story |

## D. Definitions and defaults

8. **Enforcement layers, the canonical list of seven:** plugin hooks (including managed hook settings), pre-commit, CI workflows defined on main, branch protection on main, records-branch protection, CODEOWNERS, required checks configured. ADR-009's "five layers" are renamed scaffold components. (O4)
9. **The preflight is `doctor --preflight`**, the same code in a pre-install mode that reports what setup would install. (O5)
10. **Required-section and check lists** live in `templates/checklists/*.yaml` under the enforcement-code lock: design sections, discovery sections, gap checks, red-team roles, packet sections. (O6)
11. **Criterion IDs** live in the mapping file, keyed by requirement ID and ordinal. The gate-2 record binds the mapping's hash beside the PRD's, so a PRD amendment without a regenerated mapping is detected. (O7)
12. **Agents draft under `.factory/work/drafts/`** freely; artifacts enter the work zone proper only through `pod-factory artifact submit <path>`, which redacts and hashes. Hook 1 denies agent file-tool writes under `.factory/` outside `drafts/`. (O8)
13. **No record types beyond ADR-010 item 14.** A discovery approval is an approval with gate `discovery`; a click-through is an acknowledgment of kind `click-through`; a test baseline is a check result with check `baseline`. (O9)
14. **Interview answers:** product questions are answered through human `answer` records against question hashes; technical defaults are written by the `start` command into the profile, marked as defaults, never by the skill's prose. (O11)
15. **Custom stacks declare their application source roots** in the profile; `approve 1` refuses without them. (O12)
16. **An existing codebase** is any repository with tracked source files outside `.factory/` and `docs/` when `start` runs; `start` then requires discovery. (O13)
17. **Findings and dispositions** are structured files beside their artifact (`<artifact>.findings.yaml`), hashed and bound by the gate record; dismissal acknowledgments are records. (O14)
18. **Test declarations:** a test's title carries its ID and its expected failure reason (`[NB: <reason>]`); negative tests assert a refusal code from a fixed catalog; baselines are check results with check `baseline`. (O15)
19. **AI features** are declared in the project profile with their scenario-set paths; for pod-factory itself, the security and simplicity reviewers. (O16)
20. **Trace tags:** a `REQ-xx` tag in the comment of a new public function or endpoint, a file-level requirement header for a new file, or an entry in the story's trace map; the traceability check accepts any of the three. (O17)
21. **Mockup mechanics:** the snapshot is the hash of an archive of `.factory/work/mockups/<feature>/` taken at approval; the click-through is an acknowledgment bound to it; flows carry IDs `F-<REQ>-<n>` from the PRD template; archiving moves the archive under `.factory/archive/` and removes the source from the work zone; `pod-factory mockup serve` refuses an archived mockup. (O18)
22. **A design review that finds a settled question asked** blocks gate 2 until the decision record cites the clause instead. (O19)
23. **Metric definitions:** issues caught at a gate are findings dispositioned as fixed at that gate; rework rate is stories with at least one fix round or rejection divided by stories done. (O21)
24. **Reproducible builds:** each preset builds in a pinned container image; where a build is not reproducible, the runbook forbids rebuilds and halts instead. (O24)
25. **Secret managers in version one:** the operating-system keychain and the 1Password CLI. (O25)
26. **Adopters' enforcement-code lock** covers the CI workflows, CODEOWNERS, the project Claude settings that enable the plugin, the pre-commit configuration and the profile's pin; the plugin itself is pinned by version. (O26)
27. **Stop-point catalog:** refused approval, blocked merge, parked story, halted release, failed rollback, lease expiry, invalid record, a hook denial that stops a builder, a failing doctor. Each has a tested plain-language message. (O27)
28. **Builder reads outside the supplied documents and file scope** are allowed and logged as events by hook 5; denial waits for sandboxes. (O28)
29. **The "no refactoring" and "settled question" reviews** are performed by the fresh-context gap or technical reviewer as part of the gate-1 and gate-2 reviews. (O29)
30. **Per-requirement hash:** the requirement's block in PRD section 4, from its heading line to the line before the next, LF-normalized, trailing whitespace trimmed; records 0001 and 0002 already use this. (O32)
31. **Before phase 4,** `pod-factory status` prints open gates, questions and the budget mode; the status page is a rendering of the same data. (O33)
32. **"Before approval" for tests that arrive per phase** means before that phase's gate-3 approval: the lock amendment that adds them is approved only with their classification record. (O34)
33. Items O10 and O35 are closed by the integrated interfaces section and by item 1.

## E. Adopted mechanisms from the reference (list 2)

The spec adopts, as its own, the thirty mechanisms the mapping found only in `docs/PRD-reference.md` (its section 5 definitions and its per-requirement acceptance bullets as listed in the mapping's list 2), in the binding form the interfaces section gives them. Where an ADR overrides a reference mechanism, the ADR wins. The two criteria with no mechanism anywhere, fresh-context provenance of reviewers (C-04-9, C-10-2), are met by item 1's dispatch files: a reviewer is started through the CLI with a recorded input set, and its dispatch file names the inputs; the reworded criteria in the 0.9.2 proposal state exactly that.

## F. Verification register (list 3)

Platform assumptions to verify, each pinned by a test or a documented check before the phase named; a failed verification reopens the affected items.

| ID | Assumption | Verify in |
|---|---|---|
| V1 | Claude Code's pre-tool-use hook can deny file edits, shell commands, reads, the question tool and the subagent tool with a reason | phase 0 |
| V2 | Session hooks fire for every subagent tool call | phase 0 |
| V3 | Hook input identifies the calling subagent (no longer required after item 1; nice to have) | phase 0 |
| V4 | A hook on the subagent tool sees the prompt and start mode, and output can be captured | phase 1b |
| V5 | Per-subagent token usage is available to the orchestrator | phase 1b |
| V6 | An approval command can detect an agent session by environment marker or ancestry | phase 0 |
| V7 | Scheduled validation on GitHub: interval, delays, auto-disable in inactive public repositories, dispatch after a push, token allowed to advance the validated ref | phase 0 |
| V8 | `pull_request_target` check runs satisfy the pull request's required checks | phase 0 |
| V9 | Re-running a pull request's gate-check after the validated ref advances | phase 0 |
| V10 | CODEOWNERS review on a single-maintainer repository | phase 1b |
| V11 | Host API exposure of plan and protections | phase 1b |
| V12 | Orca: statuses as board columns settable by the plugin, notifications on turn end, quick actions into a human shell | phase 2 |
| V13 | Orca dispatch command names and status probe at the relied-on version | phase 2 |
| V14 | An "experimental" label in pod-factory's own Orca marketplace index | phase 2 |
| V15 | `npx skills add` from a release tag in one command | phase 1b |
| V16 | Keychain access from Node on all three operating systems and a hidden prompt | phase 3 |
| V17 | Where Claude Code stores session and subagent transcripts | phase 0 |
| V18 | A hook event's working directory reflects the subagent's isolated worktree (ADR-012 item 11) | phase 0 |
| V19 | One required status check reporting per-class results satisfies main's protection for every pull request (ADR-014 item 1) | phase 0 |

## Consequences

- ADR-006 gains two jobs and three gate-check conditions; ADR-009's scaffold adds the dispatch file and per-builder worktrees; ADR-010 item 23's limitation is withdrawn.
- The 0.9.2 amendment proposal gains two rows (C-13-4 and C-21-3) and keeps its REQ-13 wording without a mode exception.
