# pod-factory: Technical Design, current statement

Version 1.0, 2026-10-13. Status: **gate 2 open.** Governed by `docs/PRD.md` 0.9.2 (gate-1 record 0001, amendments 0002 to 0004). This document states the current design directly. `docs/adr/ADR-001` to `ADR-014` are decision history and rationale; where any of them differs from this document, this document wins, and no further override records are added. The detailed section files (`docs/spec/*.md`, `docs/eval-plan.md`) are reference for later phases and are subordinate to this document in the same way.

## 1. Project profile

- Engineer on the project: yes (the approver). No user interface in version one beyond the CLI and a generated status page.
- Tooling: TypeScript on Node, one published npm package `pod-factory`, requiring the current or previous Node LTS; binaries come with managed setup.
- Budget mode: hard stop by default; tripwire and off are project settings.
- Backend order: inline first; Orca after phase 1b.
- Enforcing version: bootstrap until release 0.1.
- Notification channel: desktop notifier from the CLI, optional webhook, Orca when present.

## 2. Phases and exits

| Phase | Delivers | Exit |
|---|---|---|
| Milestone zero | Section 3 in full: one story, one builder, one approval path, locked tests, CI evidence, human-approved merge, crash recovery, `status` | the three refusals observed, kill-and-resume passed, `status` merged through the real loop |
| 1b. Complete sequential workflow | start interview and presets, discovery, mockup, red team and dispositions, guided design, classification command, the remaining human commands (acknowledge, answer, amend, waive, delegate, migrate, revert, incident), delegation with citation records, the full verify step (restraint checks, scans, security and simplicity reviewers, QA), environment setup (REQ-25), pull-request classes with the work-only auto-merge, hooks 2 to 6, `explain`, Claude Code plugin and skills install; release 0.1 by manual runbook under a bootstrap record, ending the bootstrap exception | every gate 1 to 4 criterion measured on pod-factory itself |
| 2. Parallel builders and Orca | independent stories in parallel (two builders by default), the Orca backend, board statuses, bugs routed to the same worker, Orca marketplace entry | a feature built with two parallel stories, once inline and once under Orca |
| 3. Release | gate 5, the release executor, credentials channel, rollback, release state | pod-factory releases itself through gate 5 |
| 4. Control room, metrics, retrospective | status page, Orca commands and notifications, metrics, retro | first retrospective proposes calibrated budgets |
| 5. Managed setup | git, remote, CI, branch protection, hooks, keychain flow, plan detection | `doctor` passes with no waiver after setup on a supported plan |

Nothing in a later phase is implemented early to make a test fail. Later tests are written before their phase's build plan and join the lock by amendment.

## 3. Milestone zero

### 3.1 Scope

**Commands.** `approve <gate|story|bootstrap|amendment>`, `lock`, `revoke <record>`, `story start`, `story finish`, `status`, `doctor`, `hook`, `ci <job>`. Nothing else.

**Records.** approval, lock, revocation, status transition, check result. One schema, five record types.

**CI jobs, all defined on main and all required on every pull request:** `lock-guard`, `verify`, `gate-check`; plus `records-validate` on a schedule and on demand. No branch classes and no automatic merging: every pull request to main needs the approver's approval record bound to its tree.

**Stages.** ready, in progress, verifying, done. "Needs human" is a flag `status` shows.

**Hook.** One: deny agent file edits to locked and protected paths. The approval-path commands refuse to run from an agent session by environment marker, and CI rejects a human record whose writer is not human.

### 3.2 What each piece does

- `approve` shows the artifact's hash and a plain-language line, asks the human to type the gate and the first eight characters of the hash, writes the approval record, pushes it. At gate 4 it binds the story branch's head tree. `approve bootstrap <pull request>` is the merge authority before the first lock exists. `approve amendment <paths>` authorizes a change to locked paths by binding before and after hashes.
- `lock` writes the lock record from the approved eval plan: locked paths with hashes and the exact test command.
- `revoke` writes a revocation record, triggers `records-validate` at once, and reports **pending** until CI confirms that every affected open pull request shows a failing gate-check; only then does it report enforced.
- `story start` requires a valid gate-3 approval for the current plan, writes the in-progress transition with a lease, and prints the builder's inputs with hashes. `story finish` writes the verifying transition after the builder's handoff note is recorded.
- `status` prints every story, its stage, what it waits on, and the exact rule or record blocking it. It is the tool for "what went wrong."
- `doctor` reports each enforcement layer present or missing: the plugin hook, the CI workflows on main, main's branch protection including administrators, the records branch protection, required checks configured.
- `ci lock-guard`: fails when any locked path changed without a valid amendment approval bound to the head tree. `ci verify`: runs the locked command exactly as locked in a job that holds a read-only token, checks the diff against the story's file scope, uploads the evidence bundle; a second job that runs no application code writes the check-result record with the bundle's manifest hash. `ci gate-check`: requires an approval record bound to this exact head tree, a passing verify for this tree and no revocation of either, evaluated against the records branch as it is at that moment. `ci records-validate`: validates every record on the branch per record, rejects nothing after the fact, flags invalid ones, and posts a failing gate-check on every open pull request that relied on a revoked record.

### 3.3 The flow

1. Scaffold and the gate-2 tests land through bootstrap pull requests, each under `approve bootstrap`. Branch protection with the required checks and administrator enforcement is set by hand and confirmed by `doctor`.
2. The gate-2 tests run once. Scaffold behavior passes as baselines; story-one tests fail on assertions because `status` does not exist. No placeholder code.
3. `approve 2` binds the main tree, the PRD, the design, the eval plan, the mapping and the classification output; `lock` follows at once. `lock-guard` is live from here.
4. `approve 3` on the one-story build plan. `story start`. A builder subagent in its own worktree implements `status` against the locked tests and writes its handoff note. `story finish`.
5. The pull request runs `lock-guard`, `verify` and `gate-check`; gate-check fails until the approver acts.
6. The approver reads the evidence bundle and the diff, runs `approve story-1`, re-runs gate-check, merges.
7. Recovery and the refusals: kill at each record write and restart from records alone; edit a locked test; approve then push one more commit; claim "tests passed" with no bundle.

### 3.4 What waits

Everything in phases 1b to 5. In milestone zero every question goes to the approver, there is no delegation, no waiver, no class, no auto-merge, no Orca, no release automation, no environment manager.

## 4. Records

- **Store.** Branch `pod-factory/records`, linear, never force-pushed, protected. One JSON file per record, `<utc-timestamp>-<type>-<subject>-<id>.json`, UTF-8, LF, two-space indent, fixed key order. Common fields: schema version, record type, factory version, hash algorithm (SHA-256 over LF-normalized UTF-8), created at, actor (name, email, kind human or check-runner), binds, outcome, refs.
- **IDs and retries.** The ID is generated once per command invocation and written to a local journal before the first push. A retry after a failed or uncertain push fetches first; if the ID is already on the branch the command reports success; otherwise it pushes again. Concurrent writers never conflict: each record is its own file, and a rejected push rebases and retries.
- **Validity at point of use.** Every consumer, `gate-check`, `lock-guard`, `status`, the hook, validates each record it reads: schema, writer rule for its type, hashes. An invalid record is ignored and flagged, never blocks a later valid one, and is never repaired in place. There is no validated pointer. `records-validate` is the alerting job and the revocation relay, not a gate.
- **Writers.** Human records (approval, lock, revocation) through the human commands; status transitions through the story commands; check results through CI's record-writing job. CI rejects a human record whose actor is not human.
- **Bootstrap records 0001 to 0004** keep their field names under schema `bootstrap-0` and move to the records branch when it is created; the exception ends at release 0.1.

## 5. Merge rules

Milestone zero: three required checks on every pull request, `lock-guard`, `verify`, `gate-check`; merge needs the approver's approval record bound to the head tree. Main's protection binds administrators; `doctor` checks it. A direct push by an agent holding the approver's credentials is the accepted risk of PRD section 5.

Phase 1b adds the pull-request classes: `story/*`, `work/*` with the work-only auto-merge, `locked/*` under an amendment, `rules/*` under a rules approval, `release/*` under a release amendment; `class-check` joins the required set and gate-check dispatches by class. Those rules are specified in `docs/spec/interfaces-and-non-goals.md` and ADR-012 to ADR-014 as history; they are not built in milestone zero.

## 6. Revocation

A revocation is effective on the records branch the moment it lands. `revoke` triggers `records-validate` immediately and falls back to the schedule. `records-validate` posts a failing `gate-check` on every open pull request whose approval it revoked. Every `gate-check` run evaluates the records branch at its own start time and refuses to report a pass if a newer records-branch commit revoked anything it relied on, so a stale run cannot restore an obsolete green. Until CI confirms the block, `revoke` and `status` show the revocation as **pending**. A merge completed before the revocation stands as history and is undone by a revert pull request under its own approval.

## 7. Builders

- Each builder runs in its own git worktree with its own test data, started as a Claude Code subagent with worktree isolation. The orchestrator records the inputs it supplies with their hashes. The authoritative dispatch is the in-progress transition record; a local untracked pointer at the worktree root serves status and resumption.
- Milestone zero and phase 1b: one builder at a time.
- Phase 2: independent stories in parallel, two builders at a time by default. The approved plan names dependencies and the stories that may run together; shared foundations come first; stories with overlapping files, conflicting migrations or unfinished shared interfaces run sequentially. Changes merge one at a time and the combined application is verified after each merge. Parallel builders get separate ports and test databases; with Compose, distinct project names and volumes per story; cleanup touches only that story's resources. The inline and Orca backends implement the same four verbs: start a story, wait for done, send a fix back to the same worker, ask the human.
- The builder contract: a story is full stack for one requirement; the locked tests are the only definition of done; builder-written unit tests are allowed, unlocked, and must test behavior that matters.

## 8. Environments

- The design selects the deployment target and the development environment. For a web application with a backend and a database it recommends Docker Compose. A simple CLI tool needs no Docker.
- Setup detects whether Docker is installed and running; prepares the Dockerfile, Compose configuration, startup commands and health checks when available; otherwise offers installation help or a supported local setup; records the chosen mode for every later agent; diagnoses a previously working environment that fails instead of silently switching.
- The local setup keeps the same application architecture, database engine, runtime versions, dependency lockfiles, migrations and configuration names as deployment. SQLite never stands in for Postgres.
- When the target is containers, CI builds and tests the deployment image even if the developer runs locally without Docker, and deployment approval binds that artifact.
- No generalized environment manager: the smallest supported paths, extended when real use requires it.

## 9. Hooks and the agent layer

Milestone zero ships hook 1: deny agent file edits to locked and protected paths, failing closed on those paths when it cannot decide. Phase 1b adds hooks 2 to 6: shell-command heuristic for writes and secret reads, dispatch without a gate-3 approval, the question tool in a builder worktree, reads of declared secret paths, session-start orientation. Hooks are the advisory layer; CI is authoritative. Codex and other agents are held by CI and branch protection only.

## 10. Classification and locking

Tests are written per phase and classified before the approval that locks them. Implemented scaffold behavior has passing baseline tests; unimplemented story behavior has tests that fail on their assertions; nothing working is disabled to satisfy a class. The lock covers the tests, the eval plan, runner configuration, fixtures, the exact command, lockfiles, smoke tests, runbook scripts and the enforcement code; later phases' tests join it by amendment. The milestone-zero test set is `docs/eval-plan.md` section 13.

## 11. Evidence

Verification evidence is produced by the test harness or CI and bound to the tree it tested; agent prose is never evidence. Milestone zero stores bundles as CI artifacts and commits their manifest hash in the check-result record; the evidence branch with size caps arrives with phase 1b.

## 12. Verification register

Platform assumptions, each verified by the lab experiment or in the phase named. Status is updated here, nowhere else.

| ID | Assumption | Status |
|---|---|---|
| L1 | A required status check reported by a `pull_request_target` workflow counts for the pull request's merge | pending, lab |
| L2 | A job that runs application code can hold a read-only token while a dependent job writes to the records branch | pending, lab |
| L3 | A failing check run can be posted on an open pull request's head by a scheduled or dispatched workflow, and it blocks merge | pending, lab |
| L4 | `workflow_dispatch` from the CLI triggers validation within a minute | pending, lab |
| L5 | A stale in-flight run cannot overwrite a newer failing result (concurrency group plus the start-time rule) | pending, lab |
| L6 | Branch protection can bind administrators and be read by `doctor` through the API | pending, lab |
| L7 | Claude Code's pre-tool-use hook can deny a file edit with a reason, and fires for subagent tool calls | phase 0 |
| L8 | A hook event's working directory reflects the subagent's isolated worktree | phase 0 |
| L9 | An agent session is detectable by an environment marker | phase 0 |
| L10 | Scheduled workflows keep running in an active repository at the chosen interval | phase 0 |
| L11 | `npx skills add` from a release tag, plugin install, Orca statuses and quick actions, keychain access, transcript locations | phases 1b to 3 |

## 13. Later-phase designs, by reference

The release executor, the Orca verb mapping, record schemas for the remaining types, the threat review and production readiness for pod-factory itself, the criterion-to-control mapping and the full eval plan are in `docs/spec/` and `docs/eval-plan.md`. They describe phases 1b onward and are subordinate to sections 1 to 12 where they differ.

## 14. History

ADR-001 to ADR-014 record how each decision was reached, including three verification passes and their corrections on 2026-10-12. The approver's simplification direction of 2026-10-13 replaced the layered override rules with this single statement.
