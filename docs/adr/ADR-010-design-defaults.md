# ADR-010: Design defaults settled after the drafting pass

> History (2026-10-13): superseded by `docs/TECH-SPEC.md` 1.0 where the two differ; kept as decision rationale.

> Note (2026-10-12): answer A5 changes the lock timing stated by REQ-05 and REQ-06; amendment 0.9.2 row 14 carries it. The technical defaults in sections B to F were authorized by the approver on 2026-10-12 and the active PRD's REQ-04 admits a recorded default as a decider; every default is open to overrule (ADR-012 section D). Alternatives rejected for each default: the inverse choice named in its item, or the next-nearest option the drafts listed.

> Amended 2026-10-12 by ADR-011: item 23's sequential-inline limitation is withdrawn; every builder runs in its own worktree, so hook 4 enforces in every mode.

Date: 2026-10-12. Status: accepted. Decided by: the approver for items marked (approver); the rest are technical defaults decided in the spec, reported to the approver, and open to being overruled. PRD basis: decision 20 (technical decisions without product consequence take recommended defaults and are recorded), decision 28, NFR-01, REQ-06 to REQ-22. Resolves the open items raised by the interface, threat-review, production-readiness and eval-plan drafts of 2026-10-12.

## A. Decisions the approver made ("yes to all", 2026-10-12)

1. **Delegation policy timing.** A new or changed delegation policy takes effect only after CI has validated it. Answers and acknowledgments take effect immediately and are validated afterwards. (approver)
2. **Work-zone changes reach main through work-only pull requests** that a main-defined job auto-merges when the diff touches only `.factory/work/**` and `docs/**`, with no human review, because nothing in the work zone is binding until a record binds it; the lock guard of ADR-013 runs on these pull requests like every other. (approver)
3. **The release executor runs on the approver's machine**, with credentials in the operating-system keychain or a secret manager. A CI-hosted executor with trusted publishing is a later option. (approver)
4. **Hook failure behavior.** A hook that cannot decide denies writes to locked, protected and declared secret paths and allows everything else, logging the failure. (approver)
5. **Tests are written and classified per phase.** Phase zero's and milestone zero's tests before gate 2 closes; each later phase's tests before that phase's build plan, as human-written amendments to the lock. (approver)
6. **The ten untestable criteria are reworded by a PRD amendment** whose wording the approver approves on return; the proposal is `docs/spec-drafts/prd-amendment-0.9.2-proposal.md`. (approver, in principle)
7. **Release 0.1 ships before the executor exists**, through a manual runbook run from the approver's terminal under a bootstrap record. (approver)
8. **Workspace assumptions:** npm workspaces; `templates/` is a workspace member with a package manifest; `release/` holds pod-factory's own runbook, scripts and smoke tests; the approved eval plan lives at `docs/eval-plan.md`. (approver)
9. **Spec work is committed as it lands**, docs and records only. (approver)

## B. CI authority: the definition under test cannot judge itself

10. **Every authoritative job is defined on main.** Pull-request jobs run on the `pull_request_target` event, so the workflow definition comes from main, not from the branch. Jobs that execute branch code (the locked tests, scans) hold a read-only token and no secrets. Jobs that write records or evidence run in a separate job that executes no branch code and consumes the first job's uploaded results. The record-writing job has the only write permission.
11. **records-validate runs from main on a schedule and on demand.** Push-triggered workflows run from the pushed ref, and the records branch carries no workflow files, so validation is a scheduled job (every few minutes) plus `workflow_dispatch`, defined on main. It validates new commits on `pod-factory/records` and fast-forwards a `pod-factory/records-validated` ref to the last good commit. Gates, story CI and the executor read the validated ref. Hooks read the last fetched copy of that ref and never contact the host. An invalid record lands, is flagged, and never counts; the host cannot reject it before it lands. Routine transitions never wait for this.
12. **CI identity.** Records written in CI carry `actor.kind: check-runner`, the run ID and the workflow's identity; the validator accepts them only from the main-defined workflows. Third-party actions are pinned by commit SHA.
13. **The bootstrap scaffold's enforcement code** is installed at a pinned version from the registry (or, before the first publish, from a pinned commit of the scaffold), never from the branch under test, which is what decision 23 requires.

## C. Records, stages and the profile

14. **Three more record types:** `lock` (human, written by `lock` right after `approve 2`, under `.factory/locks/`), `migration` (human, `migrate`), and `incident` (human, `incident`, the source of "bugs that reached production" in REQ-14). Amendments gain a kind `profile`.
15. **The project profile is bound.** The profile file lives in the work zone, but the check runner and hooks read it only at the hash named by the latest `profile` amendment or by the gate-1 record. Budget mode and the enforcing version therefore change only through a human-written amendment; an agent edit to the file is ignored and flagged.
16. **Stages:** `draft`, `ready`, `in-progress`, `verifying`, `in-review`, `done`; flags `needs-human` and `parked` layer on any stage. Legal transitions: draft to ready (ready rule); ready to in-progress (validated gate-3 record, lease token issued); in-progress to verifying (builder completion recorded); verifying to in-progress (fix round, counted); verifying to in-review (checks green, QA evidence present); in-review to done (validated gate-4 record and merge); done is terminal. Lease expiry equals the time budget (8 hours by default) and returns in-progress to ready with the handoff note.
17. **The four verbs are CLI commands,** `pod-factory story start|wait|fix|ask`, wrapping both backends; the orchestrator skill calls them, and only the CLI writes records. The remaining implied commands are `story set-status`, `decide`, `ask`, `metrics`, `audit`, `open`, `secret set`, `revert` and `incident`.
18. **Branch naming** `story/<REQ-ID>-<slug>`; the story file carries its branch; story-verify matches by branch name and falls back to a marker in the pull-request body.
19. **Reverting a merged story** is `pod-factory revert <story>` (human-only): it writes the revocation of the story's gate-4 record and opens a revert pull request scoped to the story's original file scope.
20. **Binary content** (images, tarballs, fixtures declared binary in the lock) is hashed over raw bytes by declared path class, never by sniffing. Migrated records are copied byte for byte and read by per-version readers.
21. **Bootstrap records 0001 to 0003** keep their field names (`approvedAt`, `approver`); schema `bootstrap-0` accepts them until decision 23's exception expires.

## D. Builders, hooks and the inline backend

22. **"Same worker" on the inline backend:** resume the original subagent when the harness can resume it; otherwise a fresh builder subagent on the same worktree with the handoff note and the fix task. Both count as the originating worker for routing.
23. **Recognizing a dispatched worker.** (Superseded by ADR-014 items 6 to 8.) The start verb writes a dispatch file in the worker's worktree (story, lease token, backend). Hooks identify a dispatched worker by matching the working directory to a live dispatch. Under Orca and in parallel inline mode every builder has its own worktree, so hooks 3 and 4 enforce. In sequential inline mode the builder shares the orchestrator's directory, so hook 4 cannot tell them apart; there the question-tool rule is carried by the builder prompt, the orchestrator's own human questions go through `pod-factory ask`, and the limitation is stated. If Claude Code's hook input identifies the calling subagent, hook 4 uses it; verify during implementation.
24. **No application code before gate 1.** Hook 1 denies creating files under the application source roots the preset declares while no validated gate-1 record exists. CI's work-only check fails any pull request that adds source before gate 1; story branches cannot exist before gate 3.
25. **Shell reads of declared secret paths** are denied by hook 2's heuristic (reading commands aimed at those paths). Advisory; the canary tests are the proof.
26. **Drift protection on settings.** Hook 1 also denies agent edits to `.claude/settings.local.json`, user-level Claude settings and the plugin's install directory. Deliberate tampering stays an accepted risk.
27. **Version mismatch between installed CLI or plugin and the project pin:** hooks warn and allow; `doctor` fails; CI is the authority.
28. **Node range:** the current LTS and the previous LTS at release time, named in the package manifest and checked by `doctor`. Windows uses npm's generated command shim; hooks invoke `pod-factory hook <event>` through it.
29. **Agent-written artifacts** (handoff notes, packets, reports) enter the work zone only through the CLI (`story record-handoff` and friends), which runs redaction; CI's packet check scans for secret patterns as a second pass.
29a. **Human-terminal recognition and confirmation.** Approval-path commands require an interactive terminal, refuse when an agent-session marker is present in the environment (Claude Code's and Orca's agent-terminal markers; verify the exact variable names during implementation), and confirm by having the human type the gate number and the first eight characters of the hash shown. CI additionally checks a human record's actor against the approver list in the bound project profile.
29b. **Hook 2 also denies the approval-path command family** (approve, reject, acknowledge, answer, amend, waive, revoke, delegate, migrate, lock, revert, incident, secret set) when run from an agent session, in addition to writes to locked and protected paths.
29c. **The not-implemented skeleton.** Before the gate-2 classification run, phase zero provides unlocked skeletons of every CLI, hook and job entry point and every function the unit tests import, answering "not implemented" so tests fail on assertions rather than setup errors (eval plan, section 1 rule 4). Hooks in the skeleton answer with a non-blocking error that Claude Code treats as allow.

## E. Evidence, notifications and operations

30. **Evidence storage.** Every check-result record binds an evidence manifest (file list with hashes), committed on the records branch. The bundles themselves go to a `pod-factory/evidence` branch under a per-bundle size cap, with larger files left in the CI host's artifact store and referenced by hash. Metrics and the audit view need only the manifests, so they work offline.
31. **`doctor` host facts** come from a thin host adapter in the CLI, the one place provider-specific code is allowed (GitHub first, through its API). The check runner's jobs stay provider-agnostic.
32. **Notification channel.** Desktop notifications through the operating system's own notifier from the CLI, plus an optional webhook URL in the project profile; Orca's notification when Orca is present. `ask`, parked stories, release halts and stop-work messages all use it.
33. **Optional signatures are built in version one:** `approve` and the other human commands sign their record commits when a signing key is configured in git, and the validator verifies a signature when present and records that it did.

## F. Release and distribution

34. **One published npm package, `pod-factory`,** bundling the CLI, hooks, check runner and executor; the workspace packages are internal. It ships an `npm-shrinkwrap.json` so installs are exact.
35. **Install references never follow main.** Skills and the Claude Code plugin install from the release tag `v<version>`. pod-factory publishes its own Orca marketplace index pinned to the plugin branch at the release commit; listing in Orca's official index is optional later.
36. **Runbook format:** `release/runbook.yaml`, steps with id, kind, locked script, `idempotent` or `reconcile`, credential names, evidence outputs, and for smoke steps the retry rule.
37. **The rollback rehearsal for pod-factory itself** runs in CI against a local registry in a container and a scratch plugin branch.
38. **Credential entry** is `pod-factory secret set <name>`, a hidden prompt into the keychain or secret manager, shipped with the executor in phase 3; managed setup only automates installing the keychain integration later.
39. **AI behavior evals** run from the approver's machine through the check runner before a release and whenever a reviewer's checklist or prompt changes; CI runs them only when a model credential is configured in a job that executes no branch code. Evidence is bound either way.

## Consequences

- The threat review's two findings are closed by B: a pull request cannot alter the workflow that judges it, and no job that runs branch code holds a token that can write records.
- Validation latency is minutes, and nothing operational waits for it; only gates, merges and releases read the validated ref.
- Item 23's sequential-inline gap was withdrawn by ADR-011 item 1; every builder runs in its own worktree.
