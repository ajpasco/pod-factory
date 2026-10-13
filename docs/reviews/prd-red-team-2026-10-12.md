# PRD red-team review, 2026-10-12

Artifact: docs/PRD.md (version 0.1 draft). Four fresh-context, read-only reviewers. Each finding carries a disposition: **fix** (will be written into the PRD), **defer** (recorded, out of version one), or **dismiss** (with reason, needs the approver's acknowledgment). Status: all four reports in; every **fix** applied in PRD 0.2 on 2026-10-12; pending decisions all resolved (see bottom). Dismissed items: none. Accepted risks: S1.

## Reviewer 1: skeptical founder

Verdict: would not approve. Reason: "evidence" and approval records are never defined in terms a founder can produce or verify without an engineer.

| # | Severity | Where | Finding | Disposition |
|---|---|---|---|---|
| F1 | blocker | NFR-08, REQ-03, decision 4 | Approval needs a terminal and a git commit; no stated way for CI to tell the human's commit from an agent committing as the human while signatures are optional | **fix** (one-command approve path in phase one); the detection mechanism is decided after the security review |
| F2 | blocker | REQ-09, 10, 11, 18 | "Evidence" undefined; the author of the change can write the summary and "tests passed" | **fix**: evidence = harness- or CI-produced artifacts bound to a commit hash; agent prose never counts |
| F3 | major | REQ-05, REQ-06 | Plain-English renderings are not checked against the locked tests; lock changes show no renderings | **fix**: fresh-context regeneration of renderings from tests at gate 2, mismatches flagged; lock changes show before/after |
| F4 | major | REQ-03, 07, 10 | Gap lists "resolved" without visible disposition; "none found" accepted blindly; packet summaries written by the author | **fix**: per-finding disposition, approver acknowledges dismissals, summaries written by a fresh-context agent from the final hash |
| F5 | major | REQ-04, 11, 18 | Solo founder approves design, migrations, runbook and rollback with no engineer; rollback never required to have run | **fix**: without an Engineer, gate 2 requires a fresh-context technical review report; gate 5 requires evidence of a rollback rehearsal outside production |
| F6 | major | REQ-07, NFR-06 | No cost or time estimate at gate 3; "size budget" has no unit; overruns flag rather than stop | **fix** (decided 2026-10-12): default is a hard stop on cost and time plus loop caps, with code-size and complexity as tripwires; a project setting can switch to pure tripwires |
| F7 | major | REQ-17, decision 5 | Weak citations pass; decisions visible only at gate 4; "technical choices" is a blank cheque | **fix**: default-deny policy template, live display of self-decided questions with quoted clause, gate-4 reviewer checks citations, merge waits for acknowledgment |
| F8 | major | REQ-16, REQ-01, section 9 | Day one assumes git, remote, CI, Claude Code; no revocation, revert, notification without Orca, or failure guidance | **fix**: preflight proves all three enforcement layers before gate 1; technical interview questions offer a recorded default; revocation record per gate; plain-language failure messages; notification path without Orca |

## Reviewer 2: security reviewer

Verdict: would not approve. Reason: every layer an agent can reach (hooks, pre-commit, PR-branch CI, git author) lives in the agent's own trust domain, and the one control it cannot forge, a signature from a key it cannot use, is optional.

| # | Severity | Where | Finding | Disposition |
|---|---|---|---|---|
| S1 | blocker | NFR-08, decision 8 | Git author is free text and agents commit as the same OS user; an agent can write a record and commit as the human; signing is optional | **accepted risk** (approver decision 2026-10-12): version one keeps the human-only write path with optional signatures; the PRD states plainly that enforcement guards against agent drift and mistakes, not against a deliberately malicious agent on the same machine; unforgeable approvals revisited in version two |
| S2 | blocker | NFR-01, REQ-06 | Hooks match tool calls not file effects; pre-commit dies to `--no-verify`; CI runs the PR branch's own workflow, so one PR can no-op the check | **fix**: a layer outside the agent's trust domain is mandatory (host-side rulesets or branch protection the PR cannot alter), CODEOWNERS on `.factory/`, `.claude/`, `.github/`; hook config in managed settings |
| S3 | blocker | REQ-06, REQ-18 | Locked tests defeated via fixtures, runner config, the test command, lockfiles; runbook hash holds while the scripts it calls change | **fix**: lock scope covers runner config, fixtures, the exact test command, lockfiles, smoke tests and every script the runbook invokes; CI runs the locked command |
| S4 | blocker | REQ-17, decision 7, NFR-08 | Authority comes from free text the orchestrator cites, so a planted clause manufactures authority; a delegated gate-4 record is agent-written; a missed veto notice becomes a merge | **fix**: policy is enumerated category IDs, human-written; delegated gate-4 conditions are evaluated from evidence by checks, not prose; an unacknowledged veto notice fails closed |
| S5 | major | REQ-08, section 2 | Worktrees share `.git` and the OS user; a compromised builder can edit hooks, install credential helpers, rewrite other branches, read `~/.ssh` and `.env`; context list is self-reported | **fix** (decided 2026-10-12): hygiene in v1 (no credentials for builders, protected area read-only, CI path checks); sandbox in v2; credentials to the release executor only through a model-blind channel (REQ-21) |
| S6 | major | REQ-12 | Approving by typing into an agent terminal makes the agent write the record; terminal escapes can inject commands | **fix**: the console never types into an agent terminal; it targets a human-owned shell, strips control characters, and confirms hash and decision with a fresh gesture |
| S7 | major | REQ-18, 10, 15, 02 | Release logs, screenshots, discovery copies of `.env`, retro inputs and decision logs can leak secrets and personal data | **fix**: redaction pass before any artifact is written, proven by a canary-token test; raw tool output never embedded |
| S8 | major | REQ-04, NFR-05, REQ-03, REQ-10 | NFR-05 omits worker messages, handoff notes, dependencies, install chain, agent credentials, egress; threat review undefined; several criteria are format checks, not assurance | **fix**: per-project trust-boundary map treating agents as untrusted, untrusted-text entry points, credentials and egress per role, pinned supply chain, abuse cases per requirement that become locked negative tests at gate 2 |

## Reviewer 3: operations engineer

Verdict: would not approve. Reason: the state model is undefined; nothing says where `.factory/` records are authoritative across branches, restarts and merges.

| # | Severity | Where | Finding | Disposition |
|---|---|---|---|---|
| O1 | blocker | REQ-10, REQ-06, NFR-08 | `.factory/` state has no authoritative branch; parallel worktrees conflict on locks and stories; a gate-4 record "for the final commit" is circular under squash merges | **fix**: main is the only writer of `.factory/`; one append-only file per record; gate-4 records bound to the tree hash; record and merge commits exempt from re-review |
| O2 | blocker | NFR-04, REQ-08, 13, 17 | Restart-with-no-loss is untested: no lease on "in progress", no reconciliation with Orca after restart, no teardown for long-parked stories, no handoff from a crashed builder; REQ-13 default vs REQ-17 no-default needs clarifying | **fix**: kill-anywhere acceptance test (builder, orchestrator, Orca) resuming from files; lease timeout returns stale stories to ready; clarify REQ-13 (builder to orchestrator) vs REQ-17 (orchestrator to human) |
| O3 | major | REQ-06, 03, 09 | No bounded exception path: a one-line locked-test fix or CRLF checkout forces full gate-2 re-approval; a CVE blocks every story; a mid-build PRD edit's effect is undefined | **fix**: hash normalized content; define the invalidation graph; human-written, time-boxed amendment and waiver records in the protected area |
| O4 | major | REQ-18, decision 10 | One flaky probe triggers production rollback, possibly across an irreversible migration; failed rollback only "reports" | **fix**: smoke retries that separate probe errors from app failures; persisted "release broken" state; reversibility check in runbook review; notification path independent of Orca |
| O5 | major | NFR-06, REQ-07, 09, 10 | Unbounded fix loops, re-review per commit, fresh gap review per plan edit; NFR-06 bounds nothing | **fix**: budgets include tokens and wall-clock; fix loops and reopen cycles capped; story parks in "needs human" when exceeded; per-story cost is a measurable NFR; default hard stop on cost, time and loop caps, configurable to pure tripwires (decided 2026-10-12) |
| O6 | major | missing | No run history, hook-denial log, audit view, `explain`, or `doctor`; "merge blocked by CI" assumes branch protection nobody must configure | **fix**: new requirement: append-only per-story event log; `status`, `explain`, `doctor`; `doctor` fails when any layer or branch protection is missing |
| O7 | major | missing | No `.factory/` schema version, migration, pinned hash algorithm, factory-version stamp on approvals; enforcement code itself unprotected | **fix**: new requirement: versioned format and hash algorithm, factory version stamped on every record, `migrate` command with tests, enforcement code locked like tests |
| O8 | minor | many | Unmeasurable words: "significant", "relevant", "no loss", "first-class", "strict context hygiene", unnumbered depth | **fix**: define each with a threshold; run the hook and lock suite in CI on all three operating systems |

## Reviewer 4: Orca feasibility (against Orca 1.4.214 source)

Verdict: REQ-12 (all bullets), REQ-07 (board and "in progress" bullets), REQ-14 (tokens bullet) and REQ-16 (marketplace bullet) need rewording; REQ-08, REQ-13, NFR-02 and NFR-03 pass with workarounds.

| # | Verdict | Where | Constraint | Disposition |
|---|---|---|---|---|
| X1 | not feasible today | REQ-12 "every open gate appears with a link" | Panels call only readContext, sendText, notifications; no file access; CSP blocks network; links and window.open are cancelled; right sidebar only | **fix**: console shows gate list from text the orchestrator publishes; "open artifact" runs `orca file open` through a human shell; upstream ask: file-read or panel-to-worker capability |
| X2 | workaround | REQ-12 "same record as CLI" | No host method writes files or runs the CLI | **fix**: button types the approve command into a human-owned shell terminal (never an agent terminal, see S6); CLI enforces identity |
| X3 | workaround | REQ-12 card column, REQ-07 board | Statuses are one app-wide setting; no plugin API sets them | **fix**: one worktree per story; factory stages as custom statuses; orchestrator or hook runs `worktree set --workspace-status` on story changes |
| X4 | workaround | REQ-07 "cannot enter in progress" | New worktrees default to in-progress | **fix**: set todo immediately after creation |
| X5 | workaround | REQ-12 notification | Desktop notification exists; mobile push fires only on agent finish | **fix**: desktop notification plus orchestrator idling after opening a gate; soften the mobile claim in section 2 |
| X6 | workaround | REQ-07 "no dispatch without gate-3 record" | Orca has no pre-dispatch hook; orchestration is experimental | **fix**: factory PreToolUse hook on `orca orchestration worker-start` and `dispatch`; detect Orca via `orca status --json` |
| X7 | feasible | REQ-08 tracked tasks, NFR-03 Codex | task-create, worker-start, worker_done with outcome all exist; nesting cap defaults to 1; three failed attempts circuit-break a task | **note** in spec: orchestrator is a root terminal; retry cap aligns with loop caps |
| X8 | workaround | REQ-13 no local question prompt | Orca instructs but does not block; agents launch with permissions skipped | **fix**: factory PreToolUse hook denies the question tool during a dispatch (Claude Code only); decision log is factory-written |
| X9 | workaround | REQ-14 tokens from Orca | Orca records are runtime-only and carry no token counts | **fix**: persist dispatch receipts and worker_done payloads into `.factory/`; tokens from agent transcripts or handoff notes |
| X11 | feasible (added at verification) | REQ-12 commands | Orca plugins contribute `commands` with a worker handler and `terminal:send`; they appear in Orca's quick actions | **fix**: control-room actions are plugin commands typing into a human-owned shell |
| X10 | workaround | REQ-16 marketplace, NFR-02 | Plugins experimental and off by default; Linux and WSL CLI is `orca-ide`; PowerShell quoting | **fix**: label the entry experimental; resolve the CLI as Orca's own skills do, never `command -v orca` |

## Pending approver decisions

1. Resolved 2026-10-12: budget semantics. Default hard stop on cost and time plus loop caps, size as tripwire; configurable per project to pure tripwires.
2. Resolved 2026-10-12: approval integrity stays as decision 9; risk accepted and documented; revisit in version two.
4. New requirement from the approver (2026-10-12): "security" means the generated application has no security holes. Add an LLM security reviewer of the produced code to the verify step (fresh context, read-only, fixed checklist covering injection, authentication and authorization, secrets, data exposure, unsafe dependencies, and prompt injection for AI features), with findings in the gate-4 packet, in addition to automated scans, the design-time threat review and the abuse-case negative tests.
3. Resolved 2026-10-12: builder isolation is hygiene in version one (no deploy credentials for builders, protected area read-only to agents, CI rejects out-of-scope diffs); sandboxes in version two. A human may hand the release agent credentials only through a channel the model never sees (PRD REQ-21).

## Verification pass on PRD 0.2 (2026-10-12)

One fresh-context reviewer checked every disposition against 0.2. Result: 15 landed, 16 partial, S1 confirmed as stated risk, X7 note absent; 12 new problems introduced by the rewrite, one of them a blocker. Verdict: not ready for the approver's read.

Partial dispositions and their 0.3 fix: F1 (one-command approval path as an acceptance criterion on every gate; "phase one" in decision 4), F3 (amendments to locked tests show before/after renderings and need acknowledgment), F4 (packet written fresh-context from the final tree as an acceptance criterion; gate-3 gap findings get per-finding dispositions), F5 ("outside production" restored; project profile records whether an Engineer is present), F6 (gate-3 estimates as an acceptance criterion; REQ-09 wording fixed), F8 (Orca-independent notification channel as a requirement; a missing enforcement layer blocks gate 1 unless waived), S2 (`doctor` checks CODEOWNERS and managed settings; CODEOWNERS scope spelled out), S4 (delegated gate-4 merge fails closed without acknowledgment; opt-in pending approver decision), S6 (control-character stripping and fresh-gesture confirmation), S7 (canary tests for keychain, `.env` copies and tool output), O3 (invalidation graph written into the PRD; amendments bounded, waivers time-boxed), O4 (retry rule, confirmed failure, persisted release-broken state and Orca-independent notice as acceptance criteria), O5 (reopen and re-review caps park the story), O8 ("relevant sections" and "first-class" replaced), X1 (open-artifact command), X5 (orchestrator ends its turn after opening a gate so Orca's finished notification fires), X6 (detection via `orca status --json` noted), X7 (root terminal; retry cap at or below Orca's three-attempt circuit breaker), X8 (decision log factory-written).

New problems from the rewrite and their 0.3 fix: B1 blocker, authoritative-state rule contradicted REQ-01/04/05/07/08/19 (fix: two zones, protected and work; CLI-only applies to records, locks and status; builder outputs reach main through the persisted completion payload); B2 major, REQ-17 opt-in to merge without acknowledgment (fix: fail closed by default; opt-in **pending approver decision**); B3 major, no legal writer for delegated gate-4 records (fix: the factory check runner is a named non-agent writer, exempt in NFR-08 for that record type only); B4 major, tree binding breaks when main moves (fix: bind the story-branch head tree, verify against the merge's second parent, a moved main re-runs locked tests not re-review); B5 major, "declared scope" had no source (fix: file-scope field on story files); B6 major, builder-context bound dropped (fix: restored, recorded by the orchestrator); B7 major, caps without consequences and a tripwire wording contradiction (fix: both cap overruns park the story; wording fixed); B8 minor (fix: X11 logged); B9 minor, paths vs plain-language lint (fix: labelled open references exempt); B10 minor, "builders never exercise delegated rights" restored; B11 minor, factory upgrade is an amendment of the enforcement lock; B12 minor, outcome added to Record, clause scoped to orchestrator decisions, approver acknowledges regenerated renderings.

Also folded into 0.3: approver decisions 17 (brownfield depth) and 18 (clickable mockup required at gate 1, refreshed at gate 2) as REQ-02 and REQ-23.

## Second verification pass, on PRD 0.3 (2026-10-12)

Result: of the 31 items carried from the first pass, 27 closed, 4 partial (F1 approval path missing as a criterion on gates 3, 4 and 5; F4 undispositioned findings not rejected; O4 probe errors could still roll back; B1 story status transitions unenforced). 14 new consistency gaps: delegated decisions and exception records had no legal writer, acknowledgment was not a record type, tree binding named a second parent that squash merges lack, the mockup refresh invalidated gate 1, builder context excluded the mockup screenshots it promised, design-phase delegation preceded any orchestrator, the gate-2 record named no hashes, graph rows overlapped, "significant decision" was undecidable at design time, caps ignored tripwire mode, and three stale sentences. Verdict: not ready.

All 18 items fixed in PRD 0.4 on 2026-10-12 (see its changelog). Decision 20 refined at the approver's request: the design interview asks only what the PRD, the project profile and CLAUDE.md leave open.

## Third verification pass, on PRD 0.4 (2026-10-12)

Targeted check of the 18 items from the second pass: 15 closed, 3 partial (delegated-decision writer missing from NFR-08; builder context flow text and story fields; per-requirement PRD hashes not in the record). 7 new: `answer` outside the human-only family; REQ-04 criteria failing every cited decision; NFR-08 writer list stale; gate-1 mockup hash deadlocking design re-runs; graph row overlap and gate-2 runbook binding; delegated-rights boundary at gate 2 not gate 3; rollback "record" and audit view coverage. Verdict: not ready.

All 10 items fixed in PRD 0.5 on 2026-10-12.

## Independent review of PRD 0.5 (2026-10-12, provided by the approver)

Seven points. Dispositions: 1 control kinds, agree, fixed; 2 test classification, agree, fixed; 3 release binding and idempotency, agree, fixed; 4 state mechanics and layer roles, agree on mechanics and layer wording, fixed; bootstrap and pinned version **pending approver decision**; 5 secrets boundary, partially agree, REQ-21 narrowed, fixed; 6 human effort and comprehension, agree, fixed; 7 first milestone and sequential-before-concurrent, agree, **pending approver decision** on ordering. Also added REQ-24 managed setup (approver request) and decisions 21 (TypeScript on Node) and 22 (managed setup in phase two). All applied in PRD 0.6.

Verified at this step: GitHub branch protection and rulesets are available for public repositories on GitHub Free and for private repositories only on Pro, Team or Enterprise; push rulesets with file-path restrictions sit at Team or Enterprise for private repositories (docs.github.com, cached pages, re-verify at build time).

Approver decisions after the independent review (2026-10-12): bootstrap = pinned release governs the next, declared bootstrap exception for the first (PRD decision 23); ordering = milestone zero on the inline backend before Orca concurrency (PRD decision 24). PRD 0.6 handed to the approver for the gate-1 read.

## Approver's focused revision, PRD 0.7 (2026-10-12)

Dispositions changed by the approver: point 6 of the independent review (human effort and comprehension) is **partly reversed**: human-effort and approval-behavior metrics are removed by decision 27 and waivers stay visible operational records; the four closing lines stay. Point 4 (record authority) is **amended**: operational records are written locally and validated by CI, merge and release verification is produced by CI, and the records path (records branch vs path-scoped push rules on main) is open question 9 for the approver. Point 3 (release) is **completed**: the artifact is built and verified before gate 5, deploy validates every bound input, and a rebuild must reproduce the approved digest. Point 2 (test classification) is **corrected**: the pair demonstrates the missing behavior before implementation and both pass after. Decision 21 is corrected: no reliance on a runtime shipped by an agent CLI. Decision 4 is reconciled with decision 24. Name changed to pod-factory (decision 26); historical artifacts keep earlier names.

PRD 0.8 (2026-10-12): approver chose the records branch for open question 9 (decision 28); state boundary and validation semantics written into section 5; retrospective feedback made optional; founder user test kept only as pod-factory's own validation on the second project. Next: approver's gate-1 read, then the tech spec.

PRD 0.9 (2026-10-12): at the approver's direction the PRD was split. `docs/PRD-reference.md` holds the full 0.8 text (definitions, mechanisms, 28 decisions, invalidation graph). `docs/PRD.md` is the simplified active PRD: who and problem, end-to-end workflow, first usable release, observable acceptance criteria by the same requirement IDs, limitations and deferred capabilities. Approval boundaries, evidence requirements and locked-test protection are kept in the active PRD; mechanisms move to the tech spec via the reference.

**Gate 1 approved** (2026-10-12) on PRD 0.9 simplified with three corrections. Record: `.factory/records/0001-gate-1-approval-prd-0.9.json` (bootstrap: manual record, no CI validation, no mockup click-through, working tree only). Next: tech spec (gate 2).

**2026-10-13.** The approver approved the simplified milestone-zero direction and scope changes; PRD amended to 0.9.2 (record 0004); `docs/TECH-SPEC.md` 1.0 written as the single current design, with ADR-001 to ADR-014 kept as history and the section files as subordinate reference.
