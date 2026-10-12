# Software Factory: Product Requirements Document

Working name: **Software Factory** (rename pending). Version 0.2, 2026-10-12.
Status: **Draft, pending gate 1.** Version 0.2 applies the red-team review of version 0.1 (see `docs/reviews/prd-red-team-2026-10-12.md`; the reviewed 0.1 text is kept beside it). This is the factory's own first PRD, so it is also the first artifact the method must handle.

## 1. Problem statement

Teams and solo founders now build software with AI coding agents, and the common practice is "vibe coding": prompt, accept, hope. The results are familiar: code nobody reviewed, tests the agent edited until they passed, features nobody asked for, and no evidence that any requirement was met.

Tools exist that organize the work into requirements, designs and stories (BMAD Method, CCPM, GitHub Spec Kit and others). They stop at organization. Every rule they define is advice an agent can ignore under pressure. Two groups suffer:

- **Founders without an engineering background** cannot tell whether what was built is safe to ship. They have no way to approve behavior without reading code.
- **Engineers and engineering leaders** who build through agents spend their time re-checking claims instead of making decisions, and their quality bar erodes over long sessions.

## 2. The product

An open-source software factory that runs a gated workflow for building production-ready applications with AI agents, where the rules are **enforced**, not stated.

One line: *other tools organize the work; this one enforces it.*

Three layers:

1. **The factory core, inside the project repo.** A `.factory/` directory holding the PRD, tech spec, eval plan, stories, records and locks. Claude Code hooks, a pre-commit hook, CI checks and, where a git host exists, server-side branch protection enforce the gates. This layer works with nothing but Claude Code.
2. **Skills.** Installable agent skills for each stage: start, discover, PRD, red team, design, eval plan, lock, build plan, orchestrate, build, verify, review, release, retro. Standard skill format, so any agent that reads skills can run the workflow.
3. **The control room, in Orca.** Orca's orchestration runs builders, QA and reviewers in parallel worktrees. Orca's board shows stories by stage. Factory commands, notifications and a generated status page give the approver one place to see open gates and questions. Desktop notifications reach the approver; mobile follows when Orca supports it.

Without Orca, layers one and two run in one Claude Code session, with stories built one at a time.

**What the enforcement protects against, stated plainly.** Version one guards against agent drift, shortcuts and mistakes: tests edited to pass, scope nobody asked for, approvals skipped, evidence invented. It does not defend against a deliberately malicious agent running as the same operating-system user as the approver, which could forge a file-based approval. Closing that gap needs an approval path that requires a physical human action, and it is planned for version two (see section 9).

## 3. Users

| User | Who they are | What they need |
|---|---|---|
| **Founder** | Product owner with no engineering background | Approve requirements, behavior and releases in plain language, on evidence, never on code |
| **Engineer** | Builds through agents; may lead a team | The same gates plus the raw diff, the CLI and the ability to tune rules |
| **Orchestrator agent** | The hub session | Turn approved specs into stories, dispatch, route questions and bugs, never decide for the human beyond what was delegated |
| **Builder agent** | A worker session, any supported agent | A self-contained story, locked tests to pass, only the context it needs, no credentials |
| **QA and reviewer agents** | Fresh-context workers | The requirements, the evidence, and a fixed checklist; they flag, they do not fix |

"Approver" means the Founder or Engineer who owns a gate.

## 4. Decisions already made

1. Both personas are supported; the Founder sets the bar for every artifact and gate.
2. Orca is the only multi-agent runtime in version one. Without Orca the same workflow runs sequentially in one Claude Code session. The runtime is a small backend contract: start a story, wait for done, send a fix back to the same worker, ask the human.
3. The first project built with the factory is the factory itself.
4. All functional requirements below are in version one; phases put the enforcement core first (gates 1 to 4, locks, traceability, the build plan, the QA loop, both backends), then the Orca control room, metrics and retro.
5. When a question arises the human decides and the work waits. The human may delegate bounded decision rights to the orchestrator in writing. The orchestrator decides alone only when it can cite the clause that settles the question; otherwise it asks and waits.
6. There are five gates: requirements, design and tests, build plan, code review, release. The build plan is gap-reviewed by a fresh-context reviewer before approval, and nothing is dispatched before the record exists.
7. Delegating a gate is off by default and may cover gate 4 only. Gates 1, 2, 3 and 5 are never delegable.
8. Approval and delegation records use a human-only write path enforced by agent hooks, the pre-commit hook and CI. Signatures are optional in version one and verified when present.
9. After the gate-5 sign-off, a release agent executes the project's release runbook. Approval is the human's; execution is the model's.
10. Rollback is pre-approved at gate 5. On a failed post-deploy smoke test the release agent rolls back at once and reports. Any other recovery waits for the human.
11. License: MIT.
12. Budgets: by default, exceeding the approved cost or time, or hitting a loop cap, parks the story and asks the human; code-size and complexity budgets are tripwires that need a written justification. A project setting can switch everything to tripwires.
13. The forgeability gap in decision 8 is accepted for version one and stated in section 2 and section 9.
14. "Security" in this product means the generated application has no security holes. An LLM security reviewer of the produced code is part of every story's verify step, in addition to automated scans, the design-time threat review and abuse-case tests.
15. Builder isolation in version one is hygiene: builders hold no deploy or release credentials, the protected area is read-only to agents, and CI rejects out-of-scope changes. Per-story sandboxes come in version two.
16. A human may ask the release agent to deploy with credentials the human provides, and those credentials must travel through a channel the model never sees.

## 5. Definitions used by the acceptance criteria

- **Evidence:** an artifact produced by the test harness, CI, or the factory's own executor, bound to a commit or tree hash: test runner output files, CI run links, runner-captured screenshots, check reports, release step logs. Text written by an agent is never evidence.
- **Record:** one append-only file under `.factory/` for each approval, delegation, decision, waiver, amendment, revocation or event. Every record carries the factory version, the schema version, the hash algorithm, a timestamp, the actor, and the content or tree hash it binds.
- **Authoritative state:** `.factory/` is written only on the main branch, through the factory CLI. A story branch never changes anything under `.factory/`; CI fails a branch that does.
- **Hash:** a content hash over normalized content (line endings normalized), with the algorithm pinned per schema version and named in the record.
- **Tree-hash binding:** a gate-4 approval binds to the story's tree hash, not a commit hash, so squash merges and record commits do not invalidate it.
- **Protected area:** `.factory/records/`, `.factory/policy/`, the hook configuration, the CI workflow and the enforcement scripts. Agents cannot write there; the pre-commit hook and CI reject changes that did not come through the human path.
- **Fresh context:** a reviewer agent started with no memory of the builder's session, given only the inputs the requirement names.
- **Significant decision:** one that chooses between alternatives affecting more than one story, adds a dependency, or changes an interface.
- **Budgets:** size in files and lines changed, nesting depth and function complexity; cost in tokens; time in wall-clock hours. Loop caps: fix rounds per story, reopen cycles per plan, re-reviews per story. Defaults are set in the tech spec and shown at gate 3.
- **Three enforcement layers:** the agent hook, the pre-commit hook, and CI. Where a git host exists, server-side branch protection is a fourth layer that the `doctor` command requires.
- **Plain-language section:** a founder-facing section that contains no file paths, identifiers or code spans, checked by a lint.

## 6. Functional requirements

Each requirement names its user, the flow, and acceptance criteria. Acceptance criteria become the locked tests at gate 2. IDs are stable; do not renumber.

### REQ-01 Start a new project through an interview
- **User:** Founder or Engineer.
- **Flow:** 1. Run the start skill. 2. A preflight proves the three enforcement layers can be installed and reports what is missing. 3. The agent asks one question at a time: what the product does, for whom, stack, authentication, where it runs, git remote. Technical questions come with a recommended default that is recorded if accepted; product questions cannot be skipped. 4. It drafts the PRD skeleton and the project's CLAUDE.md from a stack preset. 5. The user sees plain language only.
- **Acceptance:**
  - A PRD draft exists with a problem statement, product description, and requirements that each carry user, flow and acceptance criteria.
  - A project CLAUDE.md exists with the stack, structure rules, security rules and the "done" rule.
  - No application source file is created while gate 1 is open; an attempt is blocked and reported.
  - Skipping a product question is refused; a technical question accepted with its default is recorded as such.
  - The preflight report names every enforcement layer as present or missing.

### REQ-02 Discover an existing codebase before designing
- **User:** Engineer (a Founder may run it).
- **Flow:** 1. Run the discovery skill in an existing repo. 2. It maps conventions, structure, test setup and risky areas. 3. It proposes CLAUDE.md additions. 4. The approver approves the discovery before any design starts.
- **Acceptance:**
  - A discovery report and a CLAUDE.md diff are produced, and neither contains secret values or the contents of secret files.
  - The design skill refuses to run in an existing repo without an approved discovery.
  - A repo with no tests is reported as such, never assumed to have coverage.

### REQ-03 Review and approve the requirements (gate 1)
- **User:** Approver.
- **Flow:** 1. A red-team review argues as a skeptical founder, a security reviewer, an operations engineer and, when a platform is involved, a feasibility reviewer. 2. Every finding gets a disposition: fixed, deferred, or dismissed with a reason. 3. The approver acknowledges each dismissal. 4. The approver approves through a one-command, plain-language path. 5. The approval is recorded.
- **Acceptance:**
  - The approval record binds the PRD's hash and meets NFR-08.
  - The design skill refuses to start without a gate-1 record whose hash matches the current PRD.
  - Editing the PRD after approval invalidates the record and reopens gate 1 (see REQ-22 for amendments).
  - Each red-team role lists findings or states "none found" explicitly; an empty review is rejected.
  - A dismissed finding without an approver acknowledgment blocks approval.
  - A revocation record withdraws an approval and reopens the gate.

### REQ-04 Technical design in phases
- **User:** Engineer approves; Founder reads a plain-language summary.
- **Flow:** 1. From the approved PRD and CLAUDE.md, the design skill writes phases, interfaces between agents, non-goals, budgets and loop caps per phase, a threat review, a production-readiness section and architecture decision records. 2. Unknowns get a time-boxed spike whose code is deleted. 3. A fresh-context agent writes the plain-language summary from the final design. 4. When no Engineer is on the project, a fresh-context technical reviewer reports on the design before approval.
- **Acceptance:**
  - The design has every required section; a check fails when one is missing.
  - The threat review contains a trust-boundary map that treats agents as untrusted, the untrusted-text entry points, credentials and network access per role, the pinned supply chain, and abuse cases per requirement that become locked negative tests at gate 2.
  - The production-readiness section covers migrations and rollback, logging and monitoring, the release runbook and a reversibility check for every runbook step.
  - Every phase lists the requirement IDs it delivers, and every requirement appears in at least one phase.
  - Each significant decision has a record with the alternatives rejected.
  - No spike code is present on the main branch.
  - Without an Engineer, gate 2 cannot be approved until the technical reviewer's report is attached.

### REQ-05 Eval plan written before any code
- **User:** Engineer writes; Founder approves the plain-English rendering.
- **Flow:** 1. Each acceptance criterion becomes positive and negative tests tagged with its requirement ID, including the abuse cases from the threat review. 2. Tests target public behavior only. 3. AI features get scenario sets with thresholds. 4. A fresh-context agent regenerates a plain-English rendering from each test and flags any mismatch with the author's rendering. 5. The suite is run and every requirement test fails.
- **Acceptance:**
  - Every requirement has at least one positive and one negative test, each tagged with the requirement ID.
  - A requirement test that passes against the empty project blocks approval and is reported by name.
  - Each test has a regenerated plain-English rendering; a mismatch with the author's rendering blocks approval until resolved.
  - AI feature evals carry safety thresholds of 100 percent and stated quality thresholds.

### REQ-06 Lock the approved tests (gate 2)
- **User:** Approver.
- **Flow:** 1. The approver approves the design and eval plan. 2. A lock record lists the locked paths and their hashes. 3. From then on the agent hook, the pre-commit hook and CI refuse changes to locked paths. 4. A change to a locked path goes through an amendment (REQ-22) that shows the before and after renderings.
- **Acceptance:**
  - The lock covers the test files, the eval plan, test runner configuration, fixtures, the exact test command, dependency lockfiles, smoke tests, every script the release runbook invokes, and the enforcement code itself.
  - After locking, an agent edit to a locked path is denied by the hook; an edit to an unlocked path is allowed.
  - A commit that changes a locked path without an amendment or a new approval fails pre-commit and CI.
  - CI runs the locked test command, not a command of the branch's choosing.
  - Hashes are computed over normalized content, so a line-ending change alone never invalidates a lock.

### REQ-07 Plan the build and approve it (gate 3)
- **User:** Orchestrator drafts; a fresh-context reviewer checks for gaps; approver approves.
- **Flow:** 1. The orchestrator turns the approved requirements and phases into stories: one requirement plus technical tasks, the locked tests to pass, interfaces, budgets, loop caps, and the assigned agent and model. 2. A fresh-context reviewer checks for gaps: every requirement covered, every story ready, interfaces consistent with the design, no story outside the approved phases, each assignment justified. 3. The packet shows estimated tokens and days per story and in total. 4. The approver approves; the record binds the plan's hash. 5. Only then does the orchestrator dispatch.
- **Acceptance:**
  - Every story file carries requirement IDs, test IDs, interfaces, budgets, loop caps, an assigned agent and model, an owner and a status.
  - The gap report lists findings or states "none found" for each check; an empty report is rejected.
  - Every requirement is covered by at least one story.
  - A story cannot enter "in progress" until the ready rule passes: acceptance criteria written, tests locked, interfaces defined.
  - No story is dispatched, with Orca or inline, without a gate-3 record whose hash matches the current plan; the factory hook blocks dispatch commands without it.
  - Editing the plan after approval invalidates the record and reopens gate 3; each reopen counts toward the plan's reopen cap.
  - With Orca, each story has its own worktree whose status is set to the factory's first stage immediately after creation.

### REQ-08 Build stories with agents
- **User:** Orchestrator dispatches; Engineer observes.
- **Flow:** 1. After gate 3, the orchestrator picks the Orca backend when Orca is running, otherwise the inline backend. 2. Stories go to builder agents, split by feature. 3. Each builder works in its own worktree or branch, holds a lease on the story, and receives only the context the orchestrator supplies. 4. It writes the minimum code to pass the locked tests, then cleans up while green. 5. It leaves a handoff note.
- **Acceptance:**
  - With Orca, each story is a tracked task with a dispatch, completion carries a success or failure outcome, and the dispatch receipts and completion payloads are persisted under `.factory/`.
  - Without Orca, the same stories run sequentially in one session and produce the same records.
  - A story is not "done" until its locked tests pass on its branch.
  - A handoff note exists for every builder session, including one written by the orchestrator when a builder dies.
  - The context given to a builder is recorded by the orchestrator from what it supplied, not reported by the builder.
  - A lease on "in progress" expires after the configured time, returning the story to "ready" with its handoff note.
  - Builders hold no deploy or release credentials, and CI fails a story whose diff touches files outside its declared scope or anything in the protected area.
  - Killing the builder, the orchestrator or Orca at any point and restarting resumes from files with no lost record; this is an acceptance test.

### REQ-09 Verify before human review
- **User:** QA and reviewer agents produce; Engineer reads.
- **Flow:** 1. Restraint checks run: every new file, endpoint and public function traces to a requirement; code no requirement test exercises is flagged; budgets are tripwires; architecture rules, unused-code and duplication checks run. 2. Security scans run: secrets and dependency vulnerabilities. 3. A fresh-context security reviewer checks the produced code against a fixed checklist: injection, authentication and authorization, secrets handling, data exposure, unsafe dependencies, and prompt injection for AI features. 4. A simplicity reviewer applies a fixed checklist and flags only. 5. A QA agent verifies against the requirements with evidence. 6. Bugs go back to the agent that made the change, up to the fix-round cap.
- **Acceptance:**
  - A story cannot reach gate 4 with a failing restraint or security check, or an unresolved security-reviewer finding marked blocking.
  - Untraced code is reported with its file path.
  - A QA failure creates a fix task for the originating worker; with Orca that is the same dispatch terminal.
  - Simplicity and security-reviewer findings are listed, never applied automatically.
  - A QA pass with no attached evidence is rejected.
  - When a fix-round cap, cost budget or time budget is exceeded, the story parks in "needs human" (or flags, when the project runs in tripwire mode).
  - Every artifact passes secret and personal-data redaction before it is written; raw tool output is never embedded.

### REQ-10 Human review of the changes (gate 4)
- **User:** Founder or Engineer.
- **Flow:** 1. A fresh-context agent writes the review packet from the story's final tree: plain-language summary, requirements covered, evidence of test results, restraint, security and simplicity findings, delegated decisions made during the story, and runner-captured screenshots for UI. 2. The Engineer also gets the diff. 3. The approver approves or rejects with reasons. 4. Rejections become fix tasks.
- **Acceptance:**
  - Merge is blocked without a gate-4 record bound to the story's tree hash; record and merge commits do not invalidate it.
  - The packet contains every section; a missing section fails the check, and the summary is a plain-language section.
  - A content change after approval requires re-review and counts toward the story's re-review cap.
  - A delegated gate-4 record counts only under REQ-17.

### REQ-11 Release sign-off (gate 5)
- **User:** Approver.
- **Flow:** 1. The release checklist is assembled: full regression suite green, migrations with a rollback plan, logging and monitoring, feature flag or rollback plan, the release runbook, and evidence that the rollback was rehearsed outside production. 2. Each item links evidence. 3. The approver signs off on the release and its rollback plan together.
- **Acceptance:**
  - The release command refuses without a gate-5 record.
  - Each checklist item has evidence; an empty item fails.
  - The regression suite is the locked suite plus any regression tests added since.
  - The sign-off record binds both the release runbook and the rollback plan by hash.
  - A rollback rehearsal with evidence is required before sign-off.

### REQ-12 Control room in Orca
- **User:** Founder or Engineer using Orca.
- **Flow:** 1. Orca's board columns are the factory stages, defined as workspace statuses. 2. Story worktrees move as their status changes. 3. The factory keeps a generated status page listing open gates, questions for the human and parked stories, which the approver opens in Orca. 4. Factory commands in Orca's command palette approve, reject or answer, running the factory CLI in a human-owned shell terminal, never an agent terminal. 5. An open gate or question raises a desktop notification.
- **Acceptance:**
  - Every open gate and human question appears on the status page with the path of its artifact.
  - Approving from an Orca command produces the same record as approving from the CLI, and the approving process is never an agent.
  - A card's column matches its story file's status after the orchestrator's next status update.
  - A gate or question that needs a human raises a desktop notification.
  - The Orca plugin entry is labeled experimental, and the factory never relies on it for enforcement.

### REQ-13 Escalation
- **User:** Builder agents ask; orchestrator routes; approver decides.
- **Flow:** 1. A builder's question goes to the orchestrator. 2. The orchestrator answers questions the spec already settles, citing the section. 3. Product and security questions, and anything the orchestrator cannot cite, go to the human (REQ-17). 4. Every decision is logged.
- **Acceptance:**
  - A dispatched builder never opens a local question prompt the orchestrator cannot see; under Claude Code the factory hook denies that tool during a dispatch.
  - Each decision has a log entry with date, decider, outcome and the clause relied on.
  - Between builder and orchestrator: at most one follow-up per topic; after that the builder takes the most conservative option the spec allows and records the assumption. Between orchestrator and human: no default is ever taken.

### REQ-14 Process metrics
- **User:** Engineer.
- **Acceptance:**
  - A metrics command reports, per project: issues caught at each gate, bugs that reached production (from incident records the team logs), rework rate, time and tokens per story.
  - Metrics are computed from `.factory/` records, persisted dispatch receipts and agent transcripts or handoff notes, with no network access.
  - Every record carries a timestamp and an outcome from the first release phase, so metrics can be computed for stories built before the metrics command exists.

### REQ-15 Learning loop
- **User:** Engineer.
- **Flow:** 1. The retro skill reads QA failures, gate rejections and incident records, after redaction. 2. It proposes rule additions, template changes and new eval scenarios as a pull request.
- **Acceptance:**
  - Every proposed rule cites the failure that motivated it.
  - Nothing is applied without approval.

### REQ-16 Install and distribution
- **User:** Anyone adopting the factory.
- **Acceptance:**
  - Skills install from the repository with one command.
  - The Claude Code plugin install adds the hooks and commands, and the preflight verifies them.
  - The Orca marketplace entry installs the control-room commands and is labeled experimental.
  - The factory resolves the Orca CLI the way Orca's own skills do and never assumes the command is named `orca` on Linux.
  - A project runs the full workflow with Claude Code alone, and the docs show both paths.

### REQ-17 Delegated decision rights
- **User:** Approver grants; orchestrator exercises; builders never hold them.
- **Flow:** 1. The approver writes a delegation policy from a default-deny template: enumerated decision categories the orchestrator may settle alone, categories reserved for the human, and limits. 2. When a question arises, the orchestrator looks for the clause in the PRD, design, rules or policy that settles it. 3. If it finds one, it decides, records the decision with the quoted clause, shows it on the status page at once, and continues. 4. If it cannot cite a clause, or the category is reserved, it asks the human and waits. 5. The human can overrule any delegated decision, and the overrule becomes a policy or spec change.
- **Acceptance:**
  - The policy lives in the protected area and names categories by ID; free text never grants authority.
  - Every decision the orchestrator makes without the human cites a category ID and the quoted clause; a decision without both fails the check and is reported as a question that should have been asked.
  - The gate-4 reviewer checks each cited clause and flags citations that do not settle the question.
  - A question outside the delegated categories moves the story to "needs human" until answered; no default is taken on timeout.
  - All delegated decisions appear live on the status page and in the gate-4 packet.
  - When the same topic comes back a second time, the orchestrator must propose a spec or policy change instead of answering again.
  - A policy may cover gate 4 only; a policy naming any other gate is rejected, and with no policy every gate waits for a human.
  - A delegated gate-4 approval is recorded as delegated, lists each condition met with its evidence, and is announced to the human. By default the merge waits for the human's acknowledgment; a policy may explicitly opt into merging after a stated window without one.
  - Delegated conditions are evaluated by checks from evidence, never by the orchestrator's own reading of prose.

### REQ-18 Execute the release after sign-off
- **User:** Release agent executes; approver watches; Founder receives a plain-language report.
- **Flow:** 1. With a valid gate-5 record, the release agent drives the runbook through the factory's release executor: build, migrations, deploy, post-deploy smoke tests, version tag, changelog, notification. 2. The executor, not the model, holds and injects credentials (REQ-21). 3. Each step logs its command, result and evidence, redacted. 4. A smoke failure is retried to separate probe errors from application failures; a confirmed failure triggers the pre-approved rollback at once. 5. Release state is persisted at every step; a failed rollback leaves a "release broken" state and notifies the human through a channel that does not depend on Orca.
- **Acceptance:**
  - The release command refuses to start without a gate-5 record whose hash matches the current runbook and rollback plan.
  - Every runbook step has a logged result and evidence; a step without evidence halts the release.
  - A confirmed smoke failure triggers the rollback without a human, and the rollback's own smoke result is reported.
  - No recovery action beyond the pre-approved rollback runs without a human decision.
  - Credentials never appear in logs, artifacts, reports or any model context (REQ-21).
  - Release state survives a crash of the agent or the machine and can be resumed or rolled back from it.
  - The runbook is project-specific and is reviewed at gate 2, including the reversibility check per step.

### REQ-19 Observability and operations
- **User:** Engineer; Founder for `explain`.
- **Acceptance:**
  - An append-only event log per story records every status change, dispatch, check result, hook denial, question and decision.
  - `status` shows every story, its stage, its owner and what it is waiting on.
  - `explain <story>` names the gate, check or question blocking it, in plain language.
  - `doctor` proves each enforcement layer is active, including server-side branch protection where a git host exists, and fails when any is missing.
  - An audit view lists every approval, revocation, delegation and delegated decision with actor and time.

### REQ-20 Versioning and upgrades
- **User:** Engineer.
- **Acceptance:**
  - `.factory/` carries a schema version, and every record names the factory version and the hash algorithm used.
  - Changing the hash algorithm never reopens gates by itself; records are verified with the algorithm they name.
  - A `migrate` command upgrades the format with tests for every migration.
  - A factory or plugin upgrade mid-project is recorded, and gates already approved stay approved.

### REQ-21 Secrets never reach a model
- **User:** Approver supplies credentials; release executor uses them.
- **Flow:** 1. The human enters a credential through a hidden-input prompt in a human-owned terminal, or references it in the operating-system keychain or a secret manager. 2. The factory stores it in the keychain or secret manager, never in a file an agent can read. 3. The release executor injects it into the process that needs it and redacts all output. 4. Agents are denied reading secret files by hooks.
- **Acceptance:**
  - No credential value is ever passed through chat, a prompt, a skill argument or a file in the repo.
  - A canary secret planted in the keychain never appears in any transcript, log, artifact, record or report; this is an automated test.
  - The agent hook denies reading `.env` files and other declared secret paths.
  - The executor's output is redacted before any agent can read it.

### REQ-22 Recovery and exceptions
- **User:** Approver.
- **Acceptance:**
  - A revocation record withdraws any approval and reopens its gate.
  - An amendment record, human-written and bound to the before and after hashes, changes a locked artifact without a full re-approval, within limits the policy sets.
  - A waiver record, human-written and time-boxed, lets a named failing check pass for a named story; expired waivers fail the check again.
  - The invalidation graph is defined: which later gates reopen when an earlier artifact changes, and what happens to in-flight stories.
  - Every failure that stops work produces a plain-language message with what happened and the approver's options.
  - A merged story can be reverted through a recorded command that reopens its gate-4 record.

## 7. Non-functional requirements

- **NFR-01 Enforcement depth.** Every gate rule is enforced at three layers: agent hook, pre-commit hook, CI. Where a git host exists, server-side branch protection on the main branch is required and verified by `doctor`. Hook configuration lives in managed settings; CODEOWNERS cover the protected area where the host supports it.
- **NFR-02 Cross-platform.** macOS, Windows and Linux are all supported, and the hook and lock test suite runs in CI on all three.
- **NFR-03 Agent-agnostic core.** Skills use the standard format. Claude Code hooks are first-class. Codex is supported as a builder worker under Orca. Other agents get CI-only enforcement.
- **NFR-04 State lives in files.** Sessions can restart at any point; the kill-anywhere test in REQ-08 is the measure.
- **NFR-05 Security and privacy of the factory itself.** No telemetry. Secrets never enter artifacts (REQ-21). Untrusted text includes PRD text, story files, issues and tickets, repository content, dependencies, worker messages and handoff notes; the factory's own threat review covers them, plus agent credentials, network access per role and the install chain.
- **NFR-06 Cost.** Model-per-role defaults, context given to reviewers limited to the diff, the story and the relevant sections, budgets and loop caps per story, and tokens reported in the metrics. Expected cost per story is a measured number after the first project, not a guess.
- **NFR-07 The factory obeys its own rules.** Nesting depth of at most three, non-domain code in utilities, restraint checks, the security review and the simplicity review all run on the factory's own code.
- **NFR-08 Approval integrity.** Approval, delegation, amendment, waiver and revocation records live in the protected area. Agent hooks deny agents writing there, and the pre-commit hook and CI reject a record whose commit author is an agent session. Every record carries the approver's git identity, the artifact hash and a timestamp. When the approver has a signing key configured, the approval is also a signed tag that CI verifies; signatures are optional in version one. The limits of this are stated in section 2.
- **NFR-09 Plain language.** Every founder-facing section is a plain-language section as defined in section 5, checked by a lint.

## 8. Non-goals for version one

Explicitly not built in version one. Anything here that appears in a story is scope creep.

- A custom kanban UI. Orca's board is the board; without Orca there is no board.
- Provisioning hosting, cloud accounts or infrastructure. The release agent runs the project's runbook; it does not create the environment it deploys to.
- Per-story sandboxes with isolated credentials and network access. Version two.
- Approvals that require a physical human action, such as touch-to-sign keys or browser-only approval. Version two.
- A rich Orca side panel with live gate lists and buttons. Blocked on Orca plugin capabilities that do not exist yet; the upstream asks are logged.
- Production evals and monitoring of AI features. Version two.
- Mutation testing. Version two.
- Feature flags and gradual rollout beyond a documented recipe.
- Accounts, teams, permissions or any hosted service.
- Syncing stories to Jira or Linear. Files first.
- The control room on SSH or remote worktrees.
- Hook enforcement for agents other than Claude Code.

## 9. Known limitations, stated for adopters

- A deliberately malicious agent running as the approver's operating-system user could forge a file-based approval. Version one does not close this; signatures are optional.
- Hooks are Claude Code specific; other agents are held only by pre-commit, CI and branch protection.
- Orca's orchestration and plugin system are experimental and must be enabled in Orca's settings; the factory never depends on them for enforcement.

## 10. Open questions

1. Resolved 2026-10-12: the version-one cut holds, enforcement core first (decision 4).
2. Resolved 2026-10-12: delegation may cover gate 4 only, off by default (decision 7).
3. Resolved 2026-10-12: human-only write path with optional signatures (decision 8); risk accepted (decision 13).
4. Project name (pending). License resolved 2026-10-12: MIT.
5. Which stack presets ship beyond FastAPI, React with TypeScript and Postgres.
6. How deep brownfield discovery goes in version one.
7. What the second project is: a sample app in the repo, or a Kalendaryo feature.

## 11. Glossary

- **Gate:** a point where a human must approve before work continues. There are five: requirements, design and tests, build plan, code review, release.
- **Lock:** a recorded hash of approved files that agents are prevented from changing.
- **Story:** one requirement plus the technical tasks that complete it.
- **Orchestrator:** the hub agent that plans, dispatches, routes questions and decides only what was delegated.
- **Worker:** an agent session that builds, tests or reviews one story.
- **Restraint check:** an automated check that code does only what a requirement asks.
- **Red team:** a review that argues against a document from a fixed set of hostile viewpoints.
- **Delegation policy:** the human's written grant, by category ID, of which decisions the orchestrator may make alone.
- **Release executor:** the factory's own non-model process that runs runbook steps, holds credentials and redacts output.
- **Needs human:** the story state for anything waiting on an approver's answer.

## 12. Changelog

- **0.2 (2026-10-12):** applied the red-team review of 0.1. Added definitions (section 5), REQ-19 to REQ-22, the security reviewer step, the state model, budgets and loop caps, delegation by category ID, redaction, release executor and credential handling, the Orca feasibility rewording of REQ-07, REQ-12, REQ-14 and REQ-16, and the known-limitations section. Decisions 11 to 16 recorded.
- **0.1 (2026-10-12):** first draft from the workflow document and decisions 1 to 10.
