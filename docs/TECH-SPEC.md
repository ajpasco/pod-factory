# pod-factory: Technical Design Specification

Version 0.1, draft, started 2026-10-12. Status: **Draft, gate 2 open.** Governed by `docs/PRD.md` (0.9, approved at gate 1, record `.factory/records/0001-gate-1-approval-prd-0.9.json`). `docs/PRD-reference.md` preserves prior reasoning and proposed mechanisms; this document selects and justifies mechanisms consistent with the PRD and names any proposed change to an approved decision.

How this document is written: one question at a time to the approver, only about significant decisions the PRD, the project profile and the project rules leave open. Each answer becomes an architecture decision record in `docs/adr/`. Anything the PRD settles is cited, not re-asked.

## 1. Project profile

- Engineer on the project: yes (the approver).
- User interface in version one: CLI, Orca commands and a generated status page; no interactive application UI.
- Budget mode: hard-stop (default of three modes: hard-stop, tripwire, off; ADR-007).
- Runtime backend order: inline first, Orca after milestone zero (decision 24).
- Stack for the tooling: TypeScript on Node (decision 21); pod-factory uses the node-tool preset (ADR-008).
- Enforcing factory version: bootstrap (decision 23).
- Notification channels: to be decided.

## 2. Phases

Ordered per PRD section 3. Each phase lists the requirement IDs it delivers.

| Phase | Delivers | Requirement IDs | Exit |
|---|---|---|---|
| 0. Bootstrap scaffold (by hand, bootstrap records) | approve and reject, lock, record store and records branch, lock and protected-zone hooks, CI records-validate, minimal story-verify and gate-check, minimal `doctor` | REQ-03, REQ-06, REQ-19 (minimal), REQ-20 (schema version) | `doctor` reports the five layers present |
| 1a. Milestone zero | story one, `pod-factory status`, through the whole loop on the inline backend; the three refusals; kill-and-resume | REQ-07, REQ-08, REQ-10, REQ-13, REQ-19 | ADR-009 exit test |
| 1b. Complete gates 1 to 4 | start interview and presets, discovery, mockup, red team and dispositions, guided design, eval plan classification and renderings, full approval path, delegation policy and decisions, full verify step (restraint checks, scans, security reviewer, simplicity reviewer, QA), exceptions, `explain`, Claude Code plugin and skills install | REQ-01, REQ-02, REQ-04, REQ-05, REQ-09, REQ-16, REQ-17, REQ-22, REQ-23 | every gate 1 to 4 criterion measured on pod-factory itself |
| 2. Orca backend | supervised parallel builders, board statuses, bugs routed to the same worker, receipts persisted | REQ-08 (Orca bullets), REQ-07 (worktree per story) | a feature built with parallel stories under Orca |
| 3. Gate 5 and the release executor | artifact build before gate 5, checklist, executor, credentials channel, rollback, release state | REQ-11, REQ-18, REQ-21 | pod-factory releases itself through gate 5 |
| 4. Control room, metrics, retrospective | status page, Orca commands and notifications, metrics command, retro skill | REQ-12, REQ-14, REQ-15 | first retrospective proposes calibrated budgets |
| 5. Managed setup (phase two of the PRD) | git, remote, CI, branch protection, hooks, keychain flow, plan detection | REQ-24 | `doctor` passes with no waiver after setup on a supported plan |

## 3. Repository layout and components

One repository, a workspace (ADR-002): `packages/cli`, `packages/hooks`, `packages/check-runner`, `packages/release-executor`, `skills/`, `templates/`, `claude-plugin/`, `orca-plugin/`, `docs/`. The Orca plugin is published from a dedicated branch whose root holds its manifest, because Orca's installer requires the manifest at the git source root. Component responsibilities are listed in ADR-002; interfaces between them are section 4.

## 4. Interfaces

### 4.1 Runtime backends

Both backends implement four verbs: start a story, wait for done, send a fix back to the same worker, ask the human. The **inline backend** (ADR-003) uses Claude Code subagents in the approver's session: sequential by default, parallel for stories the gate-3 plan marks independent, each parallel builder in its own worktree, merges serialized. The **Orca backend** uses Orca's supervised workers, tasks and dispatches. The orchestrator chooses by probing Orca's status command.

### 4.2 Builder contract

From ADR-003: a story is full stack and aligned with one requirement; the locked tests derived from the acceptance criteria are the only definition of done; builders write the minimum simple, clean code that passes them; builder-written unit tests are allowed, unlocked, and must test behavior that matters, or the simplicity reviewer flags them.

### 4.3 Records

ADR-004: branch `pod-factory/records`, one JSON file per record named `<timestamp>-<type>-<subject>.json`, SHA-256 over LF-normalized content, common fields `schemaVersion`, `recordType`, `factoryVersion`, `hashAlgorithm`, `createdAt`, `actor`, `binds`, `outcome`. Writers per record type as the PRD reference defines; CI validates every push. Full schemas per record type are written with the check runner (section 4.5).

### 4.4 Hooks

ADR-005: delivered by the Claude Code plugin, installed per machine, silent outside a `.factory/` project. Six hooks: deny edits to locked, protected and secret paths; deny shell commands that plainly write to them (advisory heuristic); deny dispatch without a validated gate-3 record; deny the local question tool during a dispatch; deny reads of declared secret paths; orient the session at start. Event and field names pinned by the hook tests against current Claude Code documentation.

### 4.5 Check runner and CI

ADR-006: `pod-factory ci <job>` is provider-agnostic; version one ships a GitHub Actions template with five jobs: records-validate on every records-branch push, story-verify on every pull request, gate-check required for merge, release-gate on a release request, and doctor on schedule. The pre-commit hook runs the fast subset and is advisory. pod-factory's own CI adds the hook and lock suite on three operating systems and the Orca plugin branch check.

### 4.6 Still pending

The CLI command family and the release executor.

## 5. Non-goals for this design

Pending. Starts from PRD section 5.

## 6. Budgets and caps

ADR-007: per story, hard stops at 5,000,000 tokens, 8 hours, 3 fix rounds, 3 reopen cycles per plan, 2 re-reviews; tripwires at 10 files, 400 changed lines, nesting depth 3, function complexity 10. Three budget modes in the project profile: hard-stop (default), tripwire, off. Milestone zero calibrates the defaults; the first retrospective proposes new ones from measured data.

## 7. Threat review

Pending. Trust-boundary map treating agents as untrusted; untrusted-text entry points; credentials and network access per role; pinned supply chain; abuse cases per requirement that become locked negative tests.

## 8. Production readiness

Pending. Migrations and rollback for the records format, logging, monitoring, the release runbook for pod-factory itself, retry rule, reversibility per step.

## 9. Architecture decision records

- ADR-001 Runtime and distribution for version one: npm package requiring Node LTS; binaries with phase-two managed setup.
- ADR-002 Repository layout: one workspace repository; Orca plugin published from a dedicated branch.
- ADR-003 Inline backend and the builder contract: Claude Code subagents, sequential by default, parallel for independent stories in their own worktrees; stories full stack per requirement; evals define done; builder tests must earn their place.
- ADR-004 Record storage defaults: branch `pod-factory/records`, one JSON file per record, SHA-256.
- ADR-005 Hooks ship in the Claude Code plugin: six hooks, advisory layer, silent outside a project.
- ADR-006 CI design: provider-agnostic check runner, GitHub Actions template with five jobs, pre-commit as the advisory subset.
- ADR-007 Default budgets, caps and budget modes: generous starting defaults, calibrated after milestone zero; modes hard-stop, tripwire, off (extends decision 12; PRD amended to 0.9.1 by record 0002).
- ADR-008 Stack presets in version one: web-default, node-tool, custom.
- ADR-009 Milestone zero and the bootstrap scaffold: hand-written approve, lock, records, hooks, CI; story one is `pod-factory status`; three refusals exercised.

## 10. Eval plan

Pending. One positive and one negative test per PRD requirement, tagged by ID, with plain-English renderings; classification before approval per REQ-05; milestone-zero scenarios.

## 11. Criterion-to-control mapping

Pending. Every PRD acceptance criterion mapped to enforced, measured or reviewed.

## 12. Open design questions

In the order they will be asked.

1. Resolved 2026-10-12: npm package requiring Node LTS; binaries in phase two (ADR-001). Name availability checked the same day: GitHub organization, npm package and scope unregistered.
2. Resolved 2026-10-12: one workspace repository, Orca plugin published from a branch (ADR-002).
3. Resolved 2026-10-12: Claude Code subagents, sequential by default with a parallel option for independent stories (ADR-003).
4. Resolved 2026-10-12: branch `pod-factory/records`, one JSON file per record, SHA-256 (ADR-004).
5. Resolved 2026-10-12: hooks ship in the Claude Code plugin (ADR-005). The pre-commit hook is designed with CI (question 6).
6. Resolved 2026-10-12: GitHub Actions only, provider-agnostic check runner (ADR-006).
7. Resolved 2026-10-12: generous defaults, three modes including off (ADR-007; PRD amendment 0002).
8. Resolved 2026-10-12: web-default, node-tool, custom (ADR-008).
9. Resolved 2026-10-12: scaffold by hand, then `pod-factory status` as story one (ADR-009).

All nine interview questions are resolved. Remaining sections are drafted from the PRD and the ADRs without further questions, then reviewed, then presented for gate 2.
