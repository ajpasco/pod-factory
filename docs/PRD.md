# pod-factory: Product Requirements Document

Working name: **pod-factory** (CLI command and proposed repository name; availability unverified). Version 0.9, simplified, 2026-10-12. Status: **Draft, pending gate 1.**

This PRD governs product scope and acceptance. The reference, `docs/PRD-reference.md`, preserves prior reasoning and proposed mechanisms. The tech spec selects and justifies mechanisms consistent with this PRD and explicitly identifies any proposed change to an approved decision. Requirement IDs here match the reference and are stable.

## 1. Who it serves and the problem it solves

People now build software with AI coding agents, and the common practice is prompt, accept, hope. The results are code nobody reviewed, tests edited until they passed, features nobody asked for, and no evidence that a requirement was met. Tools that organize this work into requirements, designs and stories exist. They stop at organization: every rule is advice an agent can ignore under pressure.

Two groups need something stronger.

- **Founders without an engineering background** need to approve what gets built and shipped in plain language, on evidence and on things they have clicked through, never on code.
- **Engineers and engineering leaders** who build through agents need their quality bar enforced instead of hoped for, with the raw diff and the command line still in reach.

pod-factory is an open-source workflow for building production-ready applications with AI agents, where the rules are enforced, not stated. It works with nothing but Claude Code, and it gains parallel agents, a board and a control room inside Orca. Other tools organize the work; this one enforces it.

## 2. The workflow, end to end

Five gates. At each one a human approves before work continues, through one plain-language command that only a human can run. Between the gates, agents work under rules that are checked, not trusted.

**Start.** You answer an interview, one question at a time: what the product does, for whom, the stack, where it runs, who is on the project. Technical questions come with a recommended default. A preflight checks that the enforcement can be installed. No application code is written before gate 1. In an existing codebase, a discovery step first maps conventions and structure, measures test coverage, flags risky areas and vulnerable dependencies, and proposes project rules; you approve that before any design.

**Gate 1, requirements.** The agent drafts the PRD: every requirement with its user, its flow and its acceptance criteria. For anything with a user interface, it builds a throwaway clickable mockup with hardcoded data and you click through every flow in Orca's browser or your own. Four fresh-context reviewers argue against the document as a skeptical founder, a security reviewer, an operations engineer and a feasibility reviewer. Every finding is fixed, deferred or dismissed with a reason you acknowledge. You approve. The approval binds the document and the mockup, and editing either reopens the gate.

**Gate 2, design and tests.** The agent designs by guiding you: one question per significant decision the PRD left open, with a recommended option and its consequence in plain language; anything the PRD already settles is cited, not re-asked. The design includes phases, interfaces, non-goals, budgets, a threat review and production readiness, including the release runbook. The eval plan turns every acceptance criterion into positive and negative tests, shown to you as plain-English renderings that a fresh-context agent regenerates from the tests themselves. Tests are run and classified before approval to demonstrate missing behavior while preserving existing regression baselines. You approve. The tests, the eval plan and everything the tests depend on are locked. Agents cannot change them; a change needs a human-written amendment.

**Gate 3, build plan.** The orchestrator turns the approved design into stories: one requirement each, with the tests to pass, the interfaces, the files it may touch, budgets, caps, and the agent and model assigned. A fresh-context reviewer checks the plan for gaps. The packet shows estimated tokens and days. You approve. Nothing is dispatched before that record exists.

**Build and verify.** Builders work in their own worktrees with only their story, the spec sections it names, the project rules and the mockup screens, and hold no credentials. They write the minimum code to pass the locked tests and leave a handoff note. In Orca, stories run in parallel under supervision; without Orca, they run one at a time in a single session. Before anything reaches you, checks run: traceability of every new file and endpoint to a requirement, code no test exercises, size and complexity tripwires, secret and dependency scans, a fresh-context security review of the produced code, a simplicity review, and QA against the requirements with evidence. Bugs go back to the agent that made the change. Exceeding the cost or time budget, or a loop cap, parks the story and asks you. Builder questions go to the orchestrator; the orchestrator answers only what the spec settles, citing the clause, and brings everything else to you. You may delegate bounded decision rights in writing; delegated decisions are logged with their clause and shown to you.

**Gate 4, code review.** A fresh-context agent writes the review packet: a plain-language summary, requirements covered, evidence of test results, every finding, the delegated decisions, screenshots for UI, and four closing lines: what changed, what was checked, what remains uncertain, what your approval authorizes. Engineers also get the diff. You approve or reject with reasons. Merge is blocked without your record. Gate 4 is the only gate you may delegate, in writing, under conditions checked from evidence, and a delegated merge still waits for your acknowledgment.

**Gate 5, release.** The release candidate is built and verified first. The checklist binds the exact revision, artifact, environment, configuration and migrations, with evidence for each item, a rehearsed rollback, and the security condition: every story's scans and security review complete, no unresolved blocking finding, every exception a visible waiver. You sign off on the release and its rollback together. A release agent then deploys exactly that artifact through an executor that holds the credentials, so no model ever sees them. A confirmed smoke-test failure triggers the pre-approved rollback at once; any other recovery waits for you.

**Throughout.** State lives in files, so any session can restart. Approvals, locks and decisions are records a human wrote or a checked process produced; agents cannot write them. Inside Orca, the board's columns are the workflow stages, commands approve and answer from a human-owned shell, and notifications reach you when something needs you. Metrics report issues caught per gate, bugs that reached production, rework, and time and tokens per story. The workflow does not measure how you review or approve. A retrospective offers one optional question per release and proposes rule changes as a pull request you approve.

## 3. What the first usable release must do

**Milestone zero**, the exit of phase one, is one story end to end on a single Claude Code session: requirements, locked tests, implementation, evidence, a human-approved merge, and recovery after killing the session at any point, with a changed locked test, a stale approval and unsupported evidence all exercised and refused.

**Version one**, in order:

1. Phase one: gates 1 to 4 on the inline backend, the approval path, locks, traceability, the build plan, the QA loop, and milestone zero.
2. The Orca backend: supervised parallel builders, the board, and bugs routed back to the same worker.
3. Gate 5 and the release executor.
4. The Orca control room, metrics and the retrospective.
5. Phase two: managed setup of git, the remote, CI, branch protection, hooks and the keychain flow.

The first project built this way is pod-factory itself, under a declared bootstrap exception until its first release ships. The second is an application that is not pod-factory.

## 4. Observable acceptance criteria

Grouped by requirement ID. Each criterion is observable: a block, a recorded result, or a recorded review. Verification evidence is produced by the test harness, CI, or the factory executor and bound to the content tested; an agent's claim that a check passed is not verification evidence. The tech spec maps every criterion to one of those kinds and supplies the mechanisms.

**REQ-01 Start.** A PRD draft, a project profile and project rules exist after the interview. Product questions cannot be skipped; technical defaults are recorded. Creating application code while gate 1 is open is blocked. The preflight names every enforcement layer as present or missing, and gate 1 cannot close with one missing unless a waiver is recorded.

**REQ-02 Discover.** The discovery report has conventions, measured coverage, risky areas, vulnerable dependencies and proposed rules, contains no secrets, proposes no refactoring, and must be approved before design in an existing codebase.

**REQ-03 Gate 1.** Approval is given through the approval path and binds the PRD by requirement and the mockup. Design refuses to start without a matching record. Every red-team role reports findings or "none found"; undispositioned findings and unacknowledged dismissals block approval. A revocation reopens the gate.

**REQ-04 Design.** The design has every required section, including the threat review, production readiness and the criterion-to-control mapping. Every requirement appears in a phase. Every significant decision records who decided: you, a delegated category, a recorded default, or a cited clause; a design question about something the PRD settles is rejected. Without an engineer on the project, a fresh-context technical review is attached before approval.

**REQ-05 Eval plan.** Every requirement has positive and negative tests tagged with its ID and a regenerated plain-English rendering you acknowledge. Before approval each test is classified: new-behavior tests fail for the expected reason, negative tests are paired with the positive operation they guard and the pair demonstrates the missing behavior, existing tests keep their baseline; anything else blocks approval by name. AI features carry safety thresholds of 100 percent of their defined scenario set.

**REQ-06 Gate 2 and locks.** Approval binds the design, eval plan, runbook and mockup. The lock covers the tests, the eval plan, runner configuration, fixtures, the exact test command, lockfiles, smoke tests, runbook scripts and the enforcement code. An agent edit to a locked path is denied; a commit changing one without a human-written amendment fails before merge; CI runs the locked command, not the branch's. Amendments show before-and-after renderings you acknowledge.

**REQ-07 Gate 3.** Every story carries requirement and test IDs, interfaces, file scope, budgets, caps, agent and model. The gap report covers every check; undispositioned findings block approval. The packet states estimated tokens and days. No story is dispatched without a matching record, and a story cannot start until it is ready.

**REQ-08 Build.** A story is done only when its locked tests pass on its branch. Each builder session leaves a handoff note. Builder context is exactly what the orchestrator supplied and is recorded. Builders hold no deploy credentials, and a diff outside the story's file scope fails. Killing the builder, the orchestrator or Orca at any point and restarting loses no record.

**REQ-09 Verify.** A story cannot reach gate 4 with a failing check, an unresolved blocking security finding, or QA without evidence. Untraced code is reported by path. Fixes go to the originating worker. Budget and cap overruns park the story, or flag it when the project chose tripwire mode. Artifacts are redacted before they are written.

**REQ-10 Gate 4.** Merge is blocked without a CI-validated approval record bound to the story's content. The packet is written by a fresh-context agent from the final content, contains every section, ends with the four closing lines, and the summary contains no code. A content change after approval requires re-review. A delegated approval counts only under REQ-17.

**REQ-11 Gate 5.** The artifact is built and verified before sign-off. Every checklist item has evidence, including the rollback rehearsal and the security condition. Sign-off binds revision, artifact digest, environment, configuration, migrations, runbook and rollback plan.

**REQ-12 Orca control room.** Board columns match story stages. Every open gate and question appears on the status page and raises a notification. Approving from Orca produces the same record as the CLI, and the approving process is never an agent.

**REQ-13 Escalation.** A dispatched builder cannot open a question prompt the orchestrator cannot see. Every decision is logged with date, decider and outcome; orchestrator decisions carry the clause relied on. Between orchestrator and human, no default is ever taken.

**REQ-14 Metrics.** Issues caught per gate, production bugs from incident records, rework rate, and time and tokens per story, computed from records with no network access. Story time is elapsed time, not effort.

**REQ-15 Retrospective.** Proposed rules cite the failure that motivated them and are applied only on approval. The feedback question is optional and never a gate.

**REQ-16 Install.** Skills install with one command; the Claude Code plugin adds hooks and commands; the Orca entry is labeled experimental; the whole workflow runs with Claude Code alone.

**REQ-17 Delegation.** Only a written policy grants authority, by category, and with none every gate waits for you. Every delegated decision cites its category and clause or is rejected as a question that should have been asked. Only gate 4 can be delegated, conditions are checked from evidence, and a delegated merge waits for your acknowledgment.

**REQ-18 Release execution.** The release refuses to start without a validated sign-off matching every bound input. A rebuild that does not reproduce the approved digest halts. A confirmed smoke failure rolls back without a human; a probe error never does; no other recovery runs without you. Credentials never appear in any log, artifact or model context. Release state survives a crash.

**REQ-19 Operations.** `status`, `explain` and `doctor` exist; `doctor` fails when any enforcement layer is missing or waived; an event log and an audit view cover every record.

**REQ-20 Upgrades.** Records carry schema and factory versions; a migration command has tests; the enforcing version is pinned per project; an upgrade is a human-written amendment.

**REQ-21 Credentials.** Deployment credentials enter only through a hidden prompt, the keychain or a secret manager, and canary tests prove they never appear in any transcript, log or artifact. Declared secret files are unreadable to agents.

**REQ-22 Exceptions.** Revocations, human-written amendments and time-boxed waivers exist as records, every active waiver is visible on every packet, and every failure that stops work produces a plain-language message with your options.

**REQ-23 Mockup.** Every user-facing flow has a reachable screen or gate 1 blocks. The mockup lives apart from application code, builders see only its screenshots, and it is archived after gate 2.

**REQ-24 Managed setup (phase two).** After setup on a supported host and plan, `doctor` passes with no waiver; on an unsupported plan the setup offers public, upgrade or a visible waiver; setup is idempotent and never prints a credential.

## 5. Limitations and deferred capabilities

Stated for adopters.

- A deliberately malicious agent running as your operating-system user could forge a file-based approval. Version one guards against agent drift and mistakes, not against that; signatures are optional. A physical-action approval path is version two.
- Agent hooks are Claude Code only; Codex and other agents are held by pre-commit, CI and branch protection. Codex has the same hook events, and parity is a version-two candidate.
- Secrets outside the supported channels and declared paths are protected only by redaction patterns.
- On GitHub Free, private repositories have no server-side branch protection; such projects run under a visible waiver or upgrade the plan.
- Orca's orchestration and plugin system are experimental; the workflow never depends on them for enforcement, and a rich Orca side panel waits on capabilities Orca does not yet expose.
- Deferred to version two or later: per-story sandboxes, physical-action approvals, production evals and monitoring of AI features, mutation testing, feature flags beyond a recipe, hosted or multi-user service, Jira and Linear sync, the control room on SSH worktrees, high-fidelity design tooling. Provisioning hosting or cloud accounts is out of scope.

## 6. Open questions

1. Which stack presets ship beyond FastAPI, React with TypeScript and Postgres.
2. The second project: a sample application in the repository, or a Kalendaryo feature.
3. Whether the pod-factory command and repository names are free.
