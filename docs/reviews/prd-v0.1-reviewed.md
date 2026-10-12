# Software Factory: Product Requirements Document

Working name: **Software Factory** (rename pending). Version 0.1, draft of 2026-10-12.
Status: **Draft, pending gate 1.** This document is the factory's own first PRD. The factory is being built with its own method, so this file is also the first artifact the method must handle.

## 1. Problem statement

Teams and solo founders now build software with AI coding agents, and the common practice is "vibe coding": prompt, accept, hope. The results are familiar: code nobody reviewed, tests the agent edited until they passed, features nobody asked for, and no evidence that any requirement was actually met.

Tools exist that organize the work into requirements, designs and stories (BMAD Method, CCPM, GitHub Spec Kit and others). They stop at organization. Every rule they define is advice an agent can ignore under pressure. Two groups suffer:

- **Founders without an engineering background** cannot tell whether what was built is safe to ship. They have no way to approve behavior without reading code.
- **Engineers and engineering leaders** who build through agents spend their time re-checking claims instead of making decisions, and their quality bar erodes over long sessions.

## 2. The product

An open-source software factory that runs a gated workflow for building production-ready applications with AI agents, where the rules are **enforced**, not stated.

One line: *other tools organize the work; this one enforces it.*

It has three layers:

1. **The factory core, inside the project repo.** A `.factory/` directory (layout decided in the tech spec) holding the PRD, tech spec, eval plan, stories, approvals and locks. Claude Code hooks, a pre-commit hook and CI checks enforce the gates. This layer works with nothing but Claude Code.
2. **Skills.** Installable agent skills for each stage: start a project, discover an existing codebase, write the PRD, red-team it, design, write the eval plan, lock, plan stories, orchestrate, build, verify, review, release, retro. Standard skill format so any agent that reads skills can run the workflow.
3. **The control room, in Orca.** Orca's orchestration runs builders, QA and reviewers in parallel worktrees. Orca's board shows stories by stage. A gate console panel lists open approvals and lets a human approve or reject. Mobile notifications reach the approver wherever they are.

Without Orca, everything in layers one and two still works in one Claude Code session, with stories built one at a time.

## 3. Users

| User | Who they are | What they need |
|---|---|---|
| **Founder** | Product owner with no engineering background | Approve requirements, behavior and releases in plain language, on evidence, never on code |
| **Engineer** | Builds through agents; may lead a team | The same gates plus the raw diff, the CLI and the ability to tune rules |
| **Orchestrator agent** | The hub session | Turn approved specs into stories, dispatch, route questions and bugs, never decide for the human |
| **Builder agent** | A worker session, any supported agent | A self-contained story, locked tests to pass, only the context it needs |
| **QA and reviewer agents** | Fresh-context workers | The requirements, the evidence, and a fixed checklist; they flag, they do not fix |

"Approver" below means the Founder or Engineer who owns the gate.

## 4. Decisions already made

1. Both personas are supported; the Founder sets the bar for every artifact and gate.
2. Orca is the only multi-agent runtime in version one; without Orca the same workflow runs sequentially in one Claude Code session.
3. The first project built with the factory is the factory itself.
4. All sixteen functional requirements are in version one. The tech spec orders phases so the enforcement core lands first: gates 1 to 4, locks, traceability, the build plan, the QA loop and both backends. The gate console, metrics and the retro skill follow in later phases of the same release.
5. Human-in-the-loop model: when a question arises the human decides and the work waits. The human may delegate bounded decision rights to the orchestrator in writing. The orchestrator decides alone only when it can cite the clause that settles the question; otherwise it asks and waits.
6. There are five gates, not four. A build-plan gate sits between design and build: the orchestrator's story breakdown, agent split and model choices are checked for gaps by a fresh-context reviewer, then approved and recorded. Editing the plan reopens the gate. Nothing is dispatched before approval.
7. Delegating a gate is off by default and may cover gate 4 only. Gates 1, 2, 3 and 5 are never delegable. A delegated gate-4 approval needs written conditions, an announcement before merge with a veto window, and a record marked as delegated.
8. Approval and delegation records use a human-only write path enforced by agent hooks, the pre-commit hook and CI. Signatures are optional in version one and verified when present.
9. After the gate-5 sign-off, a release agent executes the project's release runbook. Approval is the human's; execution is the model's.
10. Rollback is pre-approved at gate 5. On a failed post-deploy smoke test the release agent rolls back at once and reports. Any other recovery waits for the human.

## 5. Functional requirements

Each requirement names its user, the flow, and acceptance criteria. Acceptance criteria become the locked tests at gate 2. IDs are stable; do not renumber.

### REQ-01 Start a new project through an interview
- **User:** Founder or Engineer.
- **Flow:** 1. Run the start skill. 2. The agent asks one question at a time: what the product does, for whom, stack preference, authentication, where it runs, git remote. 3. It drafts the PRD skeleton and the project's CLAUDE.md from a stack preset. 4. The user sees plain language only.
- **Acceptance:**
  - A PRD draft exists with a problem statement, product description, and requirements that each carry user, flow and acceptance criteria.
  - A project CLAUDE.md exists with the stack, structure rules, security rules and the "done" rule.
  - No application source file is created while gate 1 is open (negative test: an attempt is blocked and reported).
  - Skipping a required interview question is refused, not silently defaulted.

### REQ-02 Discover an existing codebase before designing
- **User:** Engineer (a Founder may run it).
- **Flow:** 1. Run the discovery skill in an existing repo. 2. It maps conventions, structure, test setup and risky areas. 3. It proposes CLAUDE.md additions. 4. The approver approves the discovery before any design starts.
- **Acceptance:**
  - A discovery report and a CLAUDE.md diff are produced.
  - The design skill refuses to run in an existing repo without an approved discovery.
  - A repo with no tests is reported as such, never assumed to have coverage.

### REQ-03 Review and approve the requirements (gate 1)
- **User:** Approver.
- **Flow:** 1. A red-team review argues as a skeptical user, a security reviewer and an operations engineer. 2. The gap list is resolved in the PRD. 3. The approver approves. 4. The approval is recorded.
- **Acceptance:**
  - The approval record stores the PRD's content hash, the approver and a timestamp, inside the repo, and meets NFR-08.
  - The design skill refuses to start without a gate-1 record whose hash matches the current PRD.
  - Editing the PRD after approval invalidates the record and reopens gate 1.
  - Each red-team role lists findings or states "none found" explicitly; an empty review is rejected.

### REQ-04 Technical design in phases
- **User:** Engineer approves; Founder reads a plain-language summary.
- **Flow:** 1. From the approved PRD and CLAUDE.md, the design skill writes phases, interfaces between agents, non-goals, a build budget per phase, a threat review, a production-readiness section (migrations and rollback, logging and monitoring, the release runbook) and architecture decision records. 2. Unknowns get a time-boxed spike whose code is deleted. 3. The approver reviews.
- **Acceptance:**
  - The design has every required section; a check fails when one is missing.
  - Every phase lists the requirement IDs it delivers, and every requirement appears in at least one phase.
  - Each significant decision has a record with the alternatives rejected.
  - No spike code is present on the main branch.

### REQ-05 Eval plan written before any code
- **User:** Engineer writes; Founder approves the plain-English Given/When/Then rendering.
- **Flow:** 1. Each acceptance criterion becomes positive and negative tests tagged with its requirement ID. 2. Tests target public behavior only. 3. AI features get scenario sets with thresholds. 4. The suite is run and every requirement test fails.
- **Acceptance:**
  - Every requirement has at least one positive and one negative test, each tagged with the requirement ID.
  - A requirement test that passes against the empty project blocks approval and is reported by name.
  - Each test has a plain-English rendering shown to the approver.
  - AI feature evals carry safety thresholds of 100 percent and stated quality thresholds.

### REQ-06 Lock the approved tests (gate 2)
- **User:** Approver.
- **Flow:** 1. The approver approves the design and eval plan. 2. A lock file records the locked paths and their hashes. 3. From then on an agent hook, a pre-commit hook and CI all refuse changes to locked paths.
- **Acceptance:**
  - After locking, an agent edit to a locked file is denied by the hook; an edit to an unlocked file is allowed.
  - A commit that changes a locked file without a new approval fails pre-commit and CI.
  - Unlocking happens only through a new gate-2 approval record.
  - The lock covers the test files and the eval plan itself.

### REQ-07 Plan the build and approve it (gate 3)
- **User:** Orchestrator agent drafts; a fresh-context reviewer agent checks for gaps; approver approves.
- **Flow:** 1. The orchestrator turns the approved requirements and phases into stories. Each story is one requirement plus its technical tasks, the locked tests it must pass, its interfaces, its size budget, and the agent and model assigned to it. 2. A reviewer agent in a fresh context checks the plan for gaps: every requirement covered, every story ready, interfaces consistent with the design, no story outside the approved phases, and each assignment justified. 3. The approver reviews the plan and the gap report and approves. 4. The approval is recorded with the plan's hash. 5. Only then does the orchestrator dispatch.
- **Acceptance:**
  - Every story file carries requirement IDs, test IDs, interfaces, a size budget, an assigned agent and model, an owner and a status.
  - The gap report lists findings or states "none found" for each check; an empty report is rejected.
  - Every requirement is covered by at least one story.
  - A story cannot enter "in progress" until the ready rule passes: acceptance criteria written, tests locked, interfaces defined.
  - No story is dispatched, with Orca or inline, without a gate-3 record whose hash matches the current plan.
  - Editing the plan after approval invalidates the record and reopens gate 3.
  - Stories are files, and the board shows them by stage.

### REQ-08 Build stories with agents
- **User:** Orchestrator dispatches; Engineer observes.
- **Flow:** 1. After gate 3, the orchestrator picks the Orca backend when Orca is running, otherwise the inline backend. 2. Stories go to builder agents, split by feature. 3. Each builder works in its own worktree or branch with only the context it needs. 4. It writes the minimum code to pass the locked tests, then cleans up while green. 5. It leaves a handoff note.
- **Acceptance:**
  - With Orca, each story is a tracked task with a dispatch, and completion carries a success or failure outcome.
  - Without Orca, the same stories run sequentially in one session and produce the same artifacts.
  - A story is not "done" until its locked tests pass on its branch.
  - A handoff note exists for every builder session.
  - The context given to a builder is limited to its story, the relevant spec sections and the relevant rules, and the list is recorded.

### REQ-09 Verify before human review
- **User:** QA and reviewer agents produce; Engineer reads.
- **Flow:** 1. Restraint checks run: every new file, endpoint and public function traces to a requirement; code no requirement test exercises is flagged; build budgets are tripwires; architecture rules and unused-code and duplication checks run. 2. Security scans run: secrets and dependency vulnerabilities. 3. A simplicity reviewer applies a fixed checklist and flags only. 4. A QA agent verifies against the requirements, not just the tests. 5. Bugs go back to the agent that made the change.
- **Acceptance:**
  - A story cannot reach gate 4 with a failing restraint or security check.
  - Untraced code is reported with its file path.
  - A QA failure creates a fix task for the originating worker; with Orca that is the same dispatch terminal.
  - Simplicity findings are listed, never applied automatically.
  - A QA pass with no attached evidence is rejected.

### REQ-10 Human review of the changes (gate 4)
- **User:** Founder or Engineer.
- **Flow:** 1. A review packet is produced: plain-language summary, requirements covered, test results, restraint, security and simplicity findings, screenshots for UI. 2. The Engineer also gets the diff. 3. The approver approves or rejects with reasons. 4. Rejections become fix tasks.
- **Acceptance:**
  - Merge is blocked by CI without a gate-4 record for the story's final commit; a delegated record counts only under the conditions in REQ-17.
  - The packet contains every section; a missing section fails the check.
  - A new commit after approval requires re-review.
  - The summary section contains no code identifiers.

### REQ-11 Release sign-off (gate 5)
- **User:** Approver.
- **Flow:** 1. The release checklist is assembled: full regression suite green, migrations and rollback plan, logging and monitoring, feature flag or rollback plan, and the release runbook the agent will run. 2. Each item links evidence. 3. The approver signs off on the release and its rollback plan together.
- **Acceptance:**
  - The release command refuses without a gate-5 record.
  - Each checklist item has an evidence link; an empty item fails.
  - The regression suite is the locked suite plus any regression tests added since.
  - The sign-off record covers both the release runbook and the rollback plan, by hash.

### REQ-12 Gate console and board in Orca
- **User:** Founder or Engineer using Orca.
- **Flow:** 1. Board columns are the workflow stages. 2. Story worktrees move as their status changes. 3. The gate console lists open gates with the artifact to review. 4. Approve or Reject writes the record and resolves the Orca gate. 5. Agent questions for the human appear in the same console.
- **Acceptance:**
  - Every open gate appears with a link to its artifact.
  - Approving from the console produces the same record as approving from the CLI.
  - A card's column matches its story file's status.
  - A gate that needs a human raises an Orca notification.

### REQ-13 Escalation
- **User:** Builder agents ask; orchestrator routes; approver decides.
- **Flow:** 1. A builder's question goes to the orchestrator. 2. The orchestrator answers questions the spec already settles, citing the section. 3. Product and security questions go to the human. 4. Every decision is logged.
- **Acceptance:**
  - A dispatched builder never opens a local question prompt the orchestrator cannot see.
  - Each human decision has a log entry with date, decider and outcome.
  - At most one follow-up per topic; after that the builder takes the most conservative option the spec allows and records the assumption.

### REQ-14 Process metrics
- **User:** Engineer.
- **Acceptance:**
  - A metrics command reports, per project: issues caught at each gate, bugs that reached production, rework rate, time and tokens per story.
  - Metrics are computed from repo files and Orca records with no network access.
  - Every approval, dispatch, QA result and review record carries a timestamp and an outcome from the first release phase, so metrics can be computed for stories built before the metrics command exists.

### REQ-15 Learning loop
- **User:** Engineer.
- **Flow:** 1. The retro skill reads QA failures, gate rejections and production bugs. 2. It proposes rule additions, template changes and new eval scenarios as a pull request.
- **Acceptance:**
  - Every proposed rule cites the failure that motivated it.
  - Nothing is applied without approval.

### REQ-16 Install and distribution
- **User:** Anyone adopting the factory.
- **Acceptance:**
  - Skills install from the repository with one command.
  - The Claude Code plugin install adds the hooks and commands.
  - The Orca marketplace entry installs the gate console.
  - A project runs the full workflow with Claude Code alone, and the docs show both paths.

### REQ-17 Delegated decision rights
- **User:** Approver grants; orchestrator exercises; builders never hold them.
- **Flow:** 1. The approver writes a delegation policy: decision categories the orchestrator may settle alone (for example technical choices inside the approved design, or questions the spec already answers), categories reserved for the human (product behavior, scope changes, security posture, anything that changes an approved artifact), and limits such as budget, files or time. 2. When a question arises, the orchestrator looks for the clause in the PRD, design, rules or policy that settles it. 3. If it finds one, it decides, records the decision with that clause, and continues. 4. If it cannot cite a clause, or the category is reserved, it asks the human and waits. 5. The human can overrule any delegated decision, and the overrule becomes a policy or spec change.
- **Acceptance:**
  - The delegation policy lives in the protected approvals area with the same human-only write protection as an approval.
  - Every decision the orchestrator makes without the human cites the policy clause and the artifact section it relied on; a decision record without a citation fails the check and is reported as a question that should have been asked.
  - A question outside the delegated categories moves the affected story to "needs human" until answered; no default is taken on timeout.
  - All delegated decisions appear in the gate-4 review packet for that story.
  - When the same topic comes back a second time, the orchestrator must propose a spec or policy change instead of answering again.
  - A builder's question always goes to the orchestrator first (REQ-13); builders never exercise delegated rights.
  - A delegation policy may cover gate 4 only; a policy that names any other gate is rejected by the check, and with no policy every gate waits for a human.
  - A delegated gate-4 approval is recorded as delegated, lists each condition met with its evidence, and is announced to the human before merge with the veto window the policy sets.

### REQ-18 Execute the release after sign-off
- **User:** Release agent executes; approver watches; Founder receives a plain-language report.
- **Flow:** 1. With a valid gate-5 record, the release agent runs the project's release runbook: build, database migrations, deploy, post-deploy smoke tests, version tag, changelog, notification. 2. Each step logs its command, result and evidence. 3. If a smoke test fails, the agent runs the pre-approved rollback at once and reports. 4. Any other recovery action waits for the human.
- **Acceptance:**
  - The release command refuses to start without a gate-5 record whose hash matches the current runbook and rollback plan.
  - Every runbook step has a logged result and evidence; a step without evidence halts the release.
  - A failed smoke test triggers the rollback without a human, and the rollback's own smoke test result is reported.
  - No recovery action beyond the pre-approved rollback runs without a human decision.
  - Deploy credentials come from the environment or a secret store and never appear in logs, artifacts or reports.
  - The runbook is project-specific and is reviewed at gate 2 as part of the design.

## 6. Non-functional requirements

- **NFR-01 Enforcement depth.** Every gate rule is enforced at three layers: agent hook, pre-commit hook, CI. Defeating one layer is not enough.
- **NFR-02 Cross-platform.** macOS, Windows and Linux are all first-class, including hooks and scripts.
- **NFR-03 Agent-agnostic core.** Skills use the standard format. Claude Code hooks are first-class. Codex is supported as a builder worker under Orca. Other agents get CI-only enforcement.
- **NFR-04 State lives in files.** Sessions can restart at any point with no loss; nothing lives only in an agent's memory.
- **NFR-05 Security and privacy.** No telemetry. Secrets never enter artifacts. The factory's own threat review covers prompt injection through PRD text, hostile repository content and untrusted ticket text.
- **NFR-06 Cost.** Model-per-role defaults, strict context hygiene, and tokens reported in the metrics.
- **NFR-07 The factory obeys its own rules.** Maximum nesting depth, non-domain code in utilities, restraint checks and the simplicity review all run on the factory's own code.
- **NFR-08 Approval integrity.** Approval and delegation records live in a protected area that only a human can write. Agent hooks deny agents writing there, and the pre-commit hook and CI reject a record whose commit author is an agent session. Every record carries the approver's git identity, the artifact's content hash and a timestamp. When the approver has a signing key configured, the approval is also a signed tag that CI verifies; signatures are optional in version one.

## 7. Non-goals for version one

Explicitly not built in version one. Anything here that appears in a story is scope creep.

- A custom kanban UI. Orca's board is the board; without Orca there is no board.
- Provisioning hosting, cloud accounts or infrastructure. The release agent runs the project's runbook; it does not create the environment it deploys to.
- Production evals and monitoring of AI features. Planned for version two.
- Mutation testing. Planned for version two.
- Feature flags and gradual rollout beyond a documented recipe.
- Accounts, teams, permissions or any hosted service.
- Syncing stories to Jira or Linear. Files first.
- The gate console on SSH or remote worktrees.
- Hook enforcement for agents other than Claude Code.

## 8. Open questions

Resolved one at a time with the product owner before gate 1.

1. Resolved 2026-10-12: the version-one cut holds, with the enforcement core in the first phases (decision 4).
2. Resolved 2026-10-12: a delegation may cover gate 4 only, off by default, under written conditions (decision 7).
3. Resolved 2026-10-12: human-only write path with optional signatures (decision 8, NFR-08).
4. Project name (pending). License resolved 2026-10-12: MIT, matching Orca.
5. Which stack presets ship beyond FastAPI, React with TypeScript and Postgres.
6. How deep brownfield discovery goes in version one.
7. What the second project is: a sample app in the repo, or a Kalendaryo feature.

## 9. Glossary

- **Gate:** a point where a human must approve before work continues. There are five: requirements, design and tests, build plan, code review, release.
- **Lock:** a recorded hash of approved files that agents are prevented from changing.
- **Story:** one requirement plus the technical tasks that complete it.
- **Orchestrator:** the hub agent that plans, dispatches, routes questions and never decides for the human.
- **Worker:** an agent session that builds, tests or reviews one story.
- **Restraint check:** an automated check that code does only what a requirement asks.
- **Red team:** a review that argues against the document from a fixed set of hostile viewpoints.
- **Delegation policy:** the human's written grant of which decisions the orchestrator may make alone, and which it must bring back.
