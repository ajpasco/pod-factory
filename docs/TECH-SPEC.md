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

- `approve` shows the artifact's hash and a plain-language line, asks the human to type the gate and the first eight characters of the hash, writes the approval record, pushes it. It is idempotent: when a valid, unrevoked approval already carries the same shown hash it writes nothing, so a restart after a kill never approves the same content twice; `lock`, `story start` and `story finish` are likewise safe to run again. At gate 4 it binds the story branch's head tree. `approve bootstrap <pull request>` is the merge authority before the first lock exists. `approve amendment <paths>` authorizes a change to locked paths by binding before and after hashes.
- `lock` writes the lock record from the approved eval plan: the locked patterns, every matching path with its hash, the approved tree, and the exact test commands in order, starting with the install line.
- `revoke` writes a revocation record, triggers `records-validate` at once, and reports **pending** until CI confirms that every affected open pull request shows a failing gate-check; only then does it report enforced. It takes a record ID or a bootstrap record's file name and a `--reason`, shows a statement and a hash to type back as `approve` does, and waits up to `--wait` seconds (120 by default) for the relay; running it again for a revoked record reports the state without writing. The affected pull request comes from the records alone: the one a revoked story or bootstrap approval or verify result names, when its open head's tree is the tree that record binds. A revocation only withdraws authority, with one exception: revoking a lock unlocks its paths, so the confirmation names every path that stops being locked before the hash is typed. Revoking the gate-2 approval reopens gate 2 and leaves the lock in force until a new gate-2 approval and lock.
- `story start` requires a valid gate-3 approval for the current plan, writes the in-progress transition with a lease, and prints the builder's inputs with hashes. `story finish` writes the verifying transition after the builder's handoff note is recorded. A story file carries three labelled lists the commands read, `Tests:`, `Scope:` and `Inputs:`, each a `- <path or glob>` per line; the rest is prose for the builder. `story start story-<n> --holder <builder>` may be run by the orchestrator (an agent): it refuses unless every file the gate-3 approval binds still hashes the same on main and every path under `Tests:` is locked at its current hash, and when the story is already in progress it writes nothing and reprints the lease and inputs. `story finish story-<n> --pr <n>` moves in-progress to verifying when `.factory/work/story-<n>/handoff.md` is on the pull request's head, and verifying to done when a valid story approval for that pull request binds its head and that content is merged: the approved head is in main's history, or main holds exactly the approved tree (a squash); the command says which held.
- `status` prints every story, its stage, what it waits on, and the exact rule or record blocking it. It is the tool for "what went wrong."
- `doctor` reports each enforcement layer present or missing: the plugin hook, the CI workflows on main, main's branch protection including administrators, the records branch protection, required checks configured. In milestone zero: main's `.claude/settings.json` runs hook 1 exactly as shipped; `pod-factory` resolves on PATH to a real copy outside any git checkout; main has `pr-checks.yml` with its four jobs on `pull_request_target` and `records-validate.yml` scheduled with the relay; main binds administrators, forbids force pushes and deletion, and requires `lock-guard`, `verify` and `gate-check` from the GitHub Actions app (`strict` is reported, not required, and a still-required `bootstrap-check` is named as the placeholder); the records branch exists with nothing flagged, forbids force pushes and deletion, and requires no checks or reviews, which would stop `verify-record` pushing. A layer it cannot check counts as missing. It is read-only and runs from any session. It proves the binary is a real copy outside any checkout, not that it is the newest one: the package version does not change in milestone zero and nothing records the source commit in the build.
- Every `ci` job runs from the enforcing copy, main's code at the commit the `pull_request_target` event names, and prints that commit; the pull request's head is fetched as data. The enforcing version is "bootstrap until release 0.1" (section 1), which is main's enforcement code as merged under approvals.
- `ci lock-guard`: fails when any locked path changed between the merge base and the head without a valid amendment approval bound to the head tree, or when main itself holds locked content neither the lock nor an amendment approved. The locked hashes are the lock's with each valid, unrevoked amendment applied in order; `approve amendment` takes its before hashes from the same function. `ci verify`: runs the locked command exactly as locked in a job that holds a read-only token and passes no token to the code it runs, uploads the evidence bundle; a second job, `verify-record`, runs no application code and writes the check-result record with the bundle's manifest hash, taking the verdict from the verify job's own conclusion as well as the bundle. `ci gate-check`: requires an approval record bound to this exact head tree, a passing verify for this tree and no revocation of either, evaluated against the records branch as it is at that moment; it reads the branch again before reporting and evaluates again if it moved. For a story approval it also checks the file scope: the diff from the merge base with main to the head stays inside the `Scope:` globs of the story file as the gate-3 approval bound it (read from that approval's tree and checked against its hash), plus `.factory/work/story-<n>/**`; anything else under `.factory/` fails. The story comes from the human's story approval, never from the branch name, which the pull request's author chooses. `ci records-validate`: validates every record on the branch per record, rejects nothing after the fact, flags invalid ones, and posts a failing gate-check on every open pull request that relied on a revoked record.

### 3.3 The flow

1. Scaffold and the gate-2 tests land through bootstrap pull requests, each under `approve bootstrap`. Branch protection with the required checks and administrator enforcement is set by hand and confirmed by `doctor`.
2. The gate-2 tests run once. Scaffold behavior passes as baselines; story-one tests fail on assertions because `status` does not exist. No placeholder code.
3. `approve 2` binds the main tree, the PRD, the design, the eval plan, the mapping and the classification output; `lock` follows at once. In milestone zero the bound files are fixed in the command: `docs/PRD.md`, `docs/TECH-SPEC.md`, every `docs/spec/*.md` (the design sections, including `docs/spec/criterion-to-control-mapping.md`), `docs/eval-plan.md` and the classification report `.factory/work/classification/gate-2.json`; `docs/adr/` is history and is not bound. `--classification` names the bootstrap classification record, which must bind that report's hash. `lock-guard` is live from here.
4. `approve 3` on the one-story build plan. `story start`. A builder subagent in its own worktree implements `status` against the locked tests and writes its handoff note. `story finish`.
5. The pull request runs `lock-guard`, `verify` and `gate-check`; gate-check fails until the approver acts.
6. The approver reads the evidence bundle and the diff, runs `approve story-1`, re-runs gate-check, merges.
7. Recovery and the refusals: kill at each record write and restart from records alone; edit a locked test; approve then push one more commit; claim "tests passed" with no bundle.

### 3.4 What waits

Everything in phases 1b to 5. In milestone zero every question goes to the approver, there is no delegation, no waiver, no class, no auto-merge, no Orca, no release automation, no environment manager.

## 4. Records

- **Store.** Branch `pod-factory/records`, linear, never force-pushed, protected. One JSON file per record, `<utc-timestamp>-<type>-<subject>-<id>.json`, UTF-8, LF, two-space indent, fixed key order. Common fields: schema version, record type, factory version, hash algorithm (SHA-256 over LF-normalized UTF-8), created at, actor (name, email, kind human, check-runner or agent; agent is allowed on transition records only), binds, outcome, refs. `refs` and, from slice 5, `revocation.revokes` name a record by its 12-hex ID or a bootstrap record by its file name under `records/bootstrap/`. A lock record holds `lock.patterns` (the locked globs, so a file added under one is a change) and `lock.testCommands` (ordered, the install line first); its `binds.files` holds every matched path and `binds.tree` the approved tree.
- **IDs and retries.** The ID is generated once per command invocation and written to a local journal before the first push. A retry after a failed or uncertain push fetches first; if the ID is already on the branch the command reports success; otherwise it pushes again. Concurrent writers never conflict: each record is its own file, and a rejected push rebases and retries.
- **Validity at point of use.** Every consumer, `gate-check`, `lock-guard`, `status`, the hook, validates each record it reads: schema, writer rule for its type, hashes. An invalid record is ignored and flagged, never blocks a later valid one, and is never repaired in place. There is no validated pointer. `records-validate` is the alerting job and the revocation relay, not a gate.
- **Writers.** Human records (approval, lock, revocation) through the human commands; status transitions through the story commands; check results through CI's record-writing job. CI rejects a human record whose actor is not human. At commit level, every reader also flags a human record (approval, lock, revocation, bootstrap) committed by the Actions bot, and a check result committed by anyone else; anyone holding push rights to the records branch can forge a committer, the accepted limit of PRD section 5. Readers fetch the records branch with its full history and refuse a history a shallow clone cut short. "Latest" and "in order" mean in the order records were added to the branch, never file-name order, which ties within one second.
- **Bootstrap records** keep their field names under schema `bootstrap-0` (record types approval, amendment and classification) and live under `records/bootstrap/` on the records branch: 0001 to 0004 move there when it is created, and the gate-2 classification record 0005 is added by hand before `approve 2`. The exception ends at release 0.1.
- **Branch creation.** The approver creates `pod-factory/records` by hand, once, after slice 2 lands and before slice 3 makes gate-check required; its root commit holds the four bootstrap records under `records/bootstrap/`, and the CLI never creates the branch.

## 5. Merge rules

Milestone zero: three required checks on every pull request, `lock-guard`, `verify`, `gate-check`; merge needs the approver's approval record bound to the head tree. Main's protection binds administrators; `doctor` checks it. A direct push by an agent holding the approver's credentials is the accepted risk of PRD section 5.

Phase 1b adds the pull-request classes: `story/*`, `work/*` with the work-only auto-merge, `locked/*` under an amendment, `rules/*` under a rules approval, `release/*` under a release amendment; `class-check` joins the required set and gate-check dispatches by class. Those rules are specified in `docs/spec/interfaces-and-non-goals.md` and ADR-012 to ADR-014 as history; they are not built in milestone zero.

## 6. Revocation

A revocation is effective on the records branch the moment it lands. `revoke` triggers `records-validate` immediately and falls back to the schedule. `records-validate` posts a failing `gate-check` on every open pull request whose approval it revoked, and records each block as a failing gate-check check result naming the revocation, which is what `revoke` reads to report enforced. Every `gate-check` run evaluates the records branch at its own start time and refuses to report a pass if a newer records-branch commit revoked anything it relied on, so a stale run cannot restore an obsolete green. Until CI confirms the block, `revoke` and `status` show the revocation as **pending**. A merge completed before the revocation stands as history and is undone by a revert pull request under its own approval.

## 7. Builders

- Each builder runs in its own git worktree with its own test data, started as a Claude Code subagent with worktree isolation. The orchestrator records the inputs it supplies with their hashes. The authoritative dispatch is the in-progress transition record; a local untracked pointer at the worktree root serves status and resumption.
- Each session's handoff note is `.factory/work/<story or bootstrap slice>/handoff.md`, in the work zone.
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

Milestone zero ships hook 1: deny agent file edits to locked and protected paths, failing closed on those paths when it cannot decide. It is `pod-factory hook pre-tool-use`, configured in the project's committed `.claude/settings.json` (a locked path) and run from the `pod-factory` binary installed from main as a packed copy (`npm pack`, then `npm install -g` of the tarball; a global install of the folder is a symlink into the checkout), never a worktree's build; when the binary is missing the configured command exits 2, so every edit is refused rather than allowed. It answers Write, Edit, MultiEdit and NotebookEdit, resolving each path against the git checkout of the event's working directory (a builder's own worktree) both as written and through symlinks. Protected, always, lock or no lock: `.factory/records/**`, `.claude/settings.json`, `.claude/settings.local.json`, `.github/workflows/**` and `.github/CODEOWNERS`, the enforcement layer and the records' main copies. Locked: whatever the current lock record and its amendments say, read from the local copy of the records branch without fetching. The hook is a hygiene layer, not a boundary: an agent can still write a locked file with a shell redirect until the shell hook arrives in phase 1b, and lock-guard is the authority by design. A change to a protected path is a human act in milestone zero. Phase 1b's `amend` exists because an amendment approval binds an after hash that only exists once the change is made, so something must authorise the change first; in milestone zero that is the approver's own hands. Phase 1b adds hooks 2 to 6: shell-command heuristic for writes and secret reads, dispatch without a gate-3 approval, the question tool in a builder worktree, reads of declared secret paths, session-start orientation. Hooks are the advisory layer; CI is authoritative. Codex and other agents are held by CI and branch protection only.

## 10. Classification and locking

Tests are written per phase and classified before the approval that locks them. Implemented scaffold behavior has passing baseline tests; unimplemented story behavior has tests that fail on their assertions; nothing working is disabled to satisfy a class. The lock covers the tests, the eval plan, runner configuration, fixtures, the exact command, lockfiles, smoke tests, runbook scripts and the enforcement code; later phases' tests join it by amendment. The milestone-zero test set is `docs/eval-plan.md` section 13.

## 11. Evidence

Verification evidence is produced by the test harness or CI and bound to the tree it tested; agent prose is never evidence. Milestone zero stores bundles as CI artifacts and commits their manifest hash in the check-result record; the evidence branch with size caps arrives with phase 1b.

## 12. Verification register

Platform assumptions, each verified by the lab experiment or in the phase named. Status is updated here, nowhere else. Lab: disposable repository `ajpasco/pod-factory-lab-20261013`, archived after the runs; its two workflows are the template for milestone zero's CI.

| ID | Assumption | Status |
|---|---|---|
| L1 | A required status check reported by a `pull_request_target` workflow counts for the pull request's merge | **verified 2026-10-13** in the lab: the pull request was BLOCKED while gate-check failed and CLEAN after the approval file landed and gate-check was re-run |
| L2 | A job that runs application code can hold a read-only token while a dependent job writes to the records branch | **verified**: the read-only job's push was refused (403, "denied to github-actions[bot]"); the record job's push succeeded |
| L3 | A failing check run can be posted on an open pull request's head by a dispatched workflow, and it blocks merge | **verified**: the relay posted a failing `gate-check` check run on the approved head and the pull request went CLEAN to BLOCKED; the newest check run with that name decided. Verified before the required checks were bound to the GitHub Actions app: once they are, confirm on a real pull request that the relay's check run appears under that app and flips the bound `gate-check` |
| L4 | `workflow_dispatch` from the CLI triggers validation quickly | **measured coarsely**: dispatch to completed relay run was about two minutes in one trial, queue time not isolated; the design treats the window as minutes and shows "pending" |
| L5 | A stale in-flight run cannot overwrite a newer failing result | **observed, mechanism unclear**: re-running only the old green gate-check job produced a new success run and a new failure run carrying the relay's title, and the pull request stayed BLOCKED; keep both safeguards, the relay and gate-check's own re-evaluation at start |
| L6 | Branch protection can bind administrators and be read through the API | **verified**: `enforce_admins` set and read back true; a direct push to main by the repository owner was rejected ("3 of 3 required status checks are expected") |
| L7 | Claude Code's pre-tool-use hook can deny a file edit with a reason, and fires for subagent tool calls | **verified 2026-10-14** on Claude Code 2.1.299 from the hook's own event log and the files on disk: exit 0 with `hookSpecificOutput.permissionDecision` `deny` refused the Write and showed the reason; the hook fired for a worktree-isolated subagent's Writes, whose events carry `agent_id` and `agent_type`; the denied file was unchanged in both checkouts. The events are pinned in `packages/cli/test/fixtures/hook-events/` |
| L8 | A hook event's working directory reflects the subagent's isolated worktree | **verified 2026-10-14**, same run: the subagent's events had `cwd` set to its worktree under `.claude/worktrees/`, and `tool_input.file_path` absolute inside it |
| L9 | An agent session is detectable by an environment marker | **verified 2026-10-13**: Claude Code sets `CLAUDECODE`, `AI_AGENT` and `CLAUDE_CODE_SESSION_ID` in the shells it starts, seen from the builder session's shell and confirmed by the design session from its own |
| L10 | Scheduled workflows keep running in an active repository at the chosen interval | **pending**: `records-validate.yml` (nominal every 15 minutes) reached main at 03:00Z on 2026-10-14; a dispatched run passed at 03:11Z, and no scheduled run fired within the first hour. No cadence is claimed. Correctness does not depend on the schedule: gate-check re-reads the records branch at the start of every run, so a revoked approval never produces a fresh pass. The schedule matters only for a pull request already green when its approval is revoked, and there `revoke`'s own dispatch is the primary path and the relay record its confirmation; the schedule is a backstop of unmeasured latency. GitHub disables schedules after sixty days without repository activity |
| L11 | `npx skills add` from a release tag, plugin install, Orca statuses and quick actions, keychain access, transcript locations | phases 1b to 3 |

## 13. Later-phase designs, by reference

The release executor, the Orca verb mapping, record schemas for the remaining types, the threat review and production readiness for pod-factory itself, the criterion-to-control mapping and the full eval plan are in `docs/spec/` and `docs/eval-plan.md`. They describe phases 1b onward and are subordinate to sections 1 to 12 where they differ.

## 14. History

ADR-001 to ADR-014 record how each decision was reached, including three verification passes and their corrections on 2026-10-12. The approver's simplification direction of 2026-10-13 replaced the layered override rules with this single statement.
