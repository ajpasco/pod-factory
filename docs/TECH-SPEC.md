# pod-factory: Technical Design Specification

Version 0.1, draft, started 2026-10-12. Status: **Draft, gate 2 open.** Governed by `docs/PRD.md` (0.9.1: approved at gate 1 as 0.9, record 0001; amended by records 0002 and 0003). `docs/PRD-reference.md` preserves prior reasoning and proposed mechanisms; this document selects and justifies mechanisms consistent with the PRD and names any proposed change to an approved decision.

How this document is written: one question at a time to the approver, only about significant decisions the PRD, the project profile and the project rules leave open. Each answer becomes an architecture decision record in `docs/adr/`. Anything the PRD settles is cited, not re-asked.

## 1. Project profile

- Engineer on the project: yes (the approver).
- User interface in version one: CLI, Orca commands and a generated status page; no interactive application UI.
- Budget mode: hard-stop (default of three modes: hard-stop, tripwire, off; ADR-007).
- Runtime backend order: inline first, Orca after milestone zero (decision 24).
- Stack for the tooling: TypeScript on Node (decision 21); pod-factory uses the node-tool preset (ADR-008).
- Enforcing factory version: bootstrap (decision 23).
- Notification channels: desktop notifier from the CLI, optional webhook, Orca when present (ADR-010 item 32).

## 2. Phases

Ordered per PRD section 3. Each phase lists the requirement IDs it delivers.

| Phase | Delivers | Requirement IDs | Exit |
|---|---|---|---|
| 0. Bootstrap scaffold (by hand, bootstrap records) | approve and reject, lock, record store and records branch, `story start`, `story attach` and `story wait`, minimal `migrate` for the bootstrap records, lock and protected-zone hooks, CI records-validate, lock-guard, class-check, work-only, minimal story-verify and gate-check, minimal `doctor` | REQ-03, REQ-06, REQ-07 and REQ-08 (minimal story commands), REQ-13 (hooks 1 to 4), REQ-19 (minimal), REQ-20 (schema version, pin, bootstrap migration), classify job | `doctor` reports the scaffold components present |
| 1a. Milestone zero | story one, `pod-factory status`, through the whole loop on the inline backend; the three refusals; kill-and-resume | REQ-07, REQ-08, REQ-10, REQ-13, REQ-19 | ADR-009 exit test |
| 1b. Complete gates 1 to 4 (its place before the Orca backend is pending the approver, ADR-012 section D) | start interview and presets, discovery, mockup, red team and dispositions, guided design, eval plan classification and renderings, full approval path, delegation policy and decisions, full verify step (restraint checks, scans, security reviewer, simplicity reviewer, QA), exceptions, `explain`, Claude Code plugin and skills install | REQ-01, REQ-02, REQ-04, REQ-05, REQ-09, REQ-16 (except the Orca entry), REQ-17, REQ-19 (`explain`), REQ-20 (upgrades), REQ-22, REQ-23 | every gate 1 to 4 criterion measured on pod-factory itself; release 0.1 ships at the end of this phase through the manual runbook under a bootstrap record, ending the bootstrap exception (ADR-010 item 7; decision 23) |
| 2. Orca backend | supervised parallel builders, board statuses, bugs routed to the same worker, receipts persisted | REQ-08 (Orca bullets), REQ-07 (Orca worktree placement), REQ-16 (Orca marketplace entry) | a feature built with parallel stories under Orca |
| 3. Gate 5 and the release executor | artifact build before gate 5, checklist, executor, credentials channel, rollback, release state | REQ-11, REQ-18, REQ-21 | pod-factory releases itself through gate 5 |
| 4. Control room, metrics, retrospective | status page, Orca commands and notifications, metrics command, retro skill | REQ-12, REQ-14, REQ-15 | first retrospective proposes calibrated budgets |
| 5. Managed setup (phase two of the PRD) | git, remote, CI, branch protection, hooks, keychain flow, plan detection | REQ-24 | `doctor` passes with no waiver after setup on a supported plan |

## 3. Repository layout and components

One repository, a workspace (ADR-002): `packages/cli`, `packages/hooks`, `packages/check-runner`, `packages/release-executor`, `skills/`, `templates/`, `claude-plugin/`, `orca-plugin/`, `docs/`. The Orca plugin is published from a dedicated branch whose root holds its manifest, because Orca's installer requires the manifest at the git source root. Component responsibilities are listed in ADR-002; interfaces between them are section 4.

## 4. Interfaces

### 4.1 Runtime backends

Both backends implement four verbs: start a story, wait for done, send a fix back to the same worker, ask the human. The **inline backend** (ADR-003, ADR-011 item 1, ADR-012 item 10) uses Claude Code subagents in the approver's session, every builder in its own worktree with a dispatch file: sequential by default, parallel for stories the gate-3 plan marks independent, merges serialized. The **Orca backend** uses Orca's supervised workers, tasks and dispatches. The orchestrator chooses by probing Orca's status command.

### 4.2 Builder contract

From ADR-003: a story is full stack and aligned with one requirement; the locked tests derived from the acceptance criteria are the only definition of done; builders write the minimum simple, clean code that passes them; builder-written unit tests are allowed, unlocked, and must test behavior that matters, or the simplicity reviewer flags them.

### 4.3 Records

ADR-004: branch `pod-factory/records`, one JSON file per record named `<timestamp>-<type>-<subject>.json`, SHA-256 over LF-normalized content, common fields `schemaVersion`, `recordType`, `factoryVersion`, `hashAlgorithm`, `createdAt`, `actor`, `binds`, `outcome`. Writers per record type as the PRD reference defines; CI validates every push. Full schemas per record type are written with the check runner (section 4.5).

### 4.4 Hooks

ADR-005: delivered by the Claude Code plugin, installed per machine, silent outside a `.factory/` project. Six hooks: deny edits to locked, protected and secret paths; deny shell commands that plainly write to them (advisory heuristic); deny dispatch without a validated gate-3 record; deny the local question tool during a dispatch; deny reads of declared secret paths; orient the session at start. Event and field names pinned by the hook tests against current Claude Code documentation.

### 4.5 Check runner and CI

ADR-006 as amended by ADR-011 to ADR-013: `pod-factory ci <job>` is provider-agnostic; version one ships a GitHub Actions template whose jobs are records-validate (scheduled, from main), lock-guard and class-check (required on every pull request), story-verify (`story/*`), gate-check (required for `story/*` and in its other forms), work-only (`work/*`, `rules/*`), artifact-check, classify (`locked/*`), release-gate (build on the merge commit, verify on the executor's request) and doctor (scheduled and required). Pull-request classes and their checks are ADR-013 item 3. The pre-commit hook runs the fast subset and is advisory. pod-factory's own CI adds the hook and lock suite on three operating systems and the Orca plugin branch check.

### 4.6 Full interfaces

The CLI command family, record schemas, backend verb mapping, check-runner jobs, release executor and hook protocol are specified in `docs/spec/interfaces-and-non-goals.md`, with its open items resolved by ADR-010.

## 5. Non-goals for this design

Listed in `docs/spec/interfaces-and-non-goals.md`, section 5: exclusions from the PRD, exclusions from each ADR, limits the interfaces do not claim to close, and what is not measured.

## 6. Budgets and caps

ADR-007: per story, hard stops at 5,000,000 tokens, 8 hours, 3 fix rounds, 3 reopen cycles per plan, 2 re-reviews; tripwires at 10 files, 400 changed lines, nesting depth 3, function complexity 10. Three budget modes in the project profile: hard-stop (default), tripwire, off. Milestone zero calibrates the defaults; the first retrospective proposes new ones from measured data.

## 7. Threat review

In `docs/spec/threat-review-and-production-readiness.md`, section 7: trust-boundary map of 14 components, 10 untrusted-text entry points, credentials and network per role, pinned supply chain, 46 abuse cases AB-01-1 to AB-24-2 that become locked negative tests, and the accepted risks. Open items resolved by ADR-010.

## 8. Production readiness

In `docs/spec/threat-review-and-production-readiness.md`, section 8: append-only migrations and rollback, one shared redaction library, `doctor` and `status` as monitoring with an operator watch list, and the ten-step release runbook for pod-factory itself with reconcile checks, the smoke retry rule, reversibility per step and the rollback plan.

## 9. Architecture decision records

- ADR-001 Runtime and distribution for version one: npm package requiring Node LTS; binaries with phase-two managed setup.
- ADR-002 Repository layout: one workspace repository; Orca plugin published from a dedicated branch.
- ADR-003 Inline backend and the builder contract: Claude Code subagents, sequential by default, parallel for independent stories in their own worktrees; stories full stack per requirement; evals define done; builder tests must earn their place.
- ADR-004 Record storage defaults: branch `pod-factory/records`, one JSON file per record, SHA-256.
- ADR-005 Hooks ship in the Claude Code plugin: six hooks, advisory layer, silent outside a project.
- ADR-006 CI design: provider-agnostic check runner, GitHub Actions template (job set as amended by ADR-011 to ADR-013), pre-commit as the advisory subset.
- ADR-007 Default budgets, caps and budget modes: generous starting defaults, calibrated after milestone zero; modes hard-stop, tripwire, off (extends decision 12; PRD amended to 0.9.1 by record 0002).
- ADR-008 Stack presets in version one: web-default, node-tool, custom.
- ADR-009 Milestone zero and the bootstrap scaffold: hand-written approve, lock, records, hooks, CI; story one is `pod-factory status`; three refusals exercised.
- ADR-010 Design defaults settled after the drafting pass: the approver's nine answers, CI authority pattern, records and stages, hooks, evidence, notifications, release and distribution.
- ADR-011 Resolutions from the mapping: every builder in its own worktree, artifact-check and classify jobs, pull-request classes, definitions and defaults for 35 open items, adopted reference mechanisms, verification register.
- ADR-012 Resolutions from the spec verification pass: canonical merge rules and classes, work-only job, CODEOWNERS scope, seven layers, thirteen commands and fourteen record types, builder worktree mechanism and V18, citation answers versus delegated decisions, the register of approved decisions the design touches.
- ADR-013 Lock guard, class rules and the builder mechanism: one lock guard on every pull request, default deny for unclassified branches, bootstrap class, the single builder mechanism, gate-2 bindings and canonical counts.
- ADR-014 Final design corrections: one required merge check dispatching by class, administrators bound, bootstrap class bounded by data, the first-lock sequence, release pull requests under a release amendment, the final builder mechanism, two readings of doctor, canonical counts.

## 10. Eval plan

`docs/eval-plan.md`: 233 tests (ADR-014 item 13) across REQ-01 to REQ-24, milestone zero's ten end-to-end tests first, Given/When/Then renderings, classification before approval per REQ-05, the seven locked test commands, the lock set for pod-factory itself, four AI behavior evals for the security and simplicity reviewers, and the builder-written test rules. Written and classified per phase (ADR-010 item 5).

## 11. Criterion-to-control mapping

`docs/spec/criterion-to-control-mapping.md`: 157 criteria across the 24 requirements, 46 enforced, 108 measured, 2 reviewed, 1 awaiting the 0.9.2 amendment; authoritative layers CI and host rules 66, command 83, hook 5, agent review 2. Its open items, reference-only mechanisms and platform assumptions are resolved or registered in ADR-011. The gate-2 record binds this file's hash beside the PRD's.

## 11a. Verification register

ADR-011 section F: nineteen platform assumptions (Claude Code hooks and subagents, GitHub scheduled validation and `pull_request_target`, Orca statuses and quick actions, keychain access, transcript locations), each pinned to the phase that must verify it before relying on it.

## 11c. Plain-language summary

`docs/spec/plain-language-summary.md`, written by a fresh-context agent from the final documents as REQ-04 requires; regenerated from the final hash before gate 2 closes.

## 11b. Adopted mechanisms

ADR-011 section E: the thirty mechanisms the mapping found only in the reference document are adopted in the binding form the interfaces section gives them; an ADR wins where it overrides one.

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

All nine interview questions are resolved, every section is drafted, the plain-language summary is `docs/spec/plain-language-summary.md`, and the verification pass (`docs/reviews/spec-verification-2026-10-12.md`) is resolved by ADR-012. Pending before gate 2: the approver's two decisions in ADR-012 section D (phase 1b's place; record 0003), the approver's wording approval of PRD amendment 0.9.2 and record 0004, the regenerated mapping, phase zero's not-implemented skeletons, the writing of phase zero's and milestone zero's tests as code and their classification run and record, the regenerated renderings and the approver's acknowledgment of every one, the runbook narrative and step file and the rollback plan that the gate-2 record binds, the gate-2 approval, and then the lock.
