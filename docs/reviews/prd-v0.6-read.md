# Software Factory: Product Requirements Document

Working name: **Pods** (command `pods`; repository name pending). Version 0.6, 2026-10-12.
Status: **Draft, pending gate 1.** Version 0.6 applies an independent review of 0.5: control kinds, test classification, release binding, layer responsibilities, the secrets boundary, human-effort metrics, and managed setup. The review trail is in `docs/reviews/`. This is the factory's own first PRD, so it is also the first artifact the method must handle.

## 1. Problem statement

Teams and solo founders now build software with AI coding agents, and the common practice is "vibe coding": prompt, accept, hope. The results are familiar: code nobody reviewed, tests the agent edited until they passed, features nobody asked for, and no evidence that any requirement was met.

Tools exist that organize the work into requirements, designs and stories (BMAD Method, CCPM, GitHub Spec Kit and others). They stop at organization. Every rule they define is advice an agent can ignore under pressure. Two groups suffer:

- **Founders without an engineering background** cannot tell whether what was built is safe to ship. They have no way to approve behavior without reading code.
- **Engineers and engineering leaders** who build through agents spend their time re-checking claims instead of making decisions, and their quality bar erodes over long sessions.

## 2. The product

An open-source software factory that runs a gated workflow for building production-ready applications with AI agents, where the rules are **enforced**, not stated.

One line: *other tools organize the work; this one enforces it.*

Three layers:

1. **The factory core, inside the project repo.** A `.factory/` directory holding the PRD, tech spec, eval plan, mockups, stories, records and locks. Claude Code hooks, a pre-commit hook, CI checks and, where a git host exists, server-side branch protection enforce the gates. This layer works with nothing but Claude Code.
2. **Skills.** Installable agent skills for each stage: start, discover, PRD, mockup, red team, design, eval plan, lock, build plan, orchestrate, build, verify, review, release, retro. Standard skill format, so any agent that reads skills can run the workflow.
3. **The control room, in Orca.** Orca's orchestration runs builders, QA and reviewers in parallel worktrees. Orca's board shows stories by stage. Factory commands, notifications and a generated status page give the approver one place to see open gates and questions. Orca's built-in browser shows mockups, and Design Mode sends click-level feedback to the agent. Desktop notifications reach the approver; Orca's mobile app is pinged when the orchestrator finishes a turn to wait on a gate.

Without Orca, layers one and two run in one Claude Code session, with stories built one at a time.

**What the enforcement protects against, stated plainly.** Version one guards against agent drift, shortcuts and mistakes: tests edited to pass, scope nobody asked for, approvals skipped, evidence invented. It does not defend against a deliberately malicious agent running as the same operating-system user as the approver, which could forge a file-based approval. Closing that gap needs an approval path that requires a physical human action, and it is planned for version two (see section 9).

## 3. Users

| User | Who they are | What they need |
|---|---|---|
| **Founder** | Product owner with no engineering background | Approve requirements, behavior and releases in plain language, on evidence and on things they have clicked through, never on code |
| **Engineer** | Builds through agents; may lead a team | The same gates plus the raw diff, the CLI and the ability to tune rules |
| **Orchestrator agent** | The hub session | Turn approved specs into stories, dispatch, route questions and bugs, decide only what was delegated |
| **Builder agent** | A worker session, any supported agent | A self-contained story, locked tests to pass, only the context it needs, no credentials |
| **QA and reviewer agents** | Fresh-context workers | The requirements, the evidence, and a fixed checklist; they flag, they do not fix |

"Approver" means the Founder or Engineer who owns a gate.

## 4. Decisions already made

1. Both personas are supported; the Founder sets the bar for every artifact and gate.
2. Orca is the only multi-agent runtime in version one. Without Orca the same workflow runs sequentially in one Claude Code session. The runtime is a small backend contract: start a story, wait for done, send a fix back to the same worker, ask the human.
3. The first project built with the factory is the factory itself.
4. All functional requirements below are in version one. Phase one is the enforcement core: gates 1 to 4, the approval path, locks, traceability, the build plan, the QA loop, both backends. Later phases add the Orca control room, metrics and retro.
5. When a question arises the human decides and the work waits. The human may delegate bounded decision rights in writing to the agent acting under the policy: the design skill before gate 2, the orchestrator after it. That agent decides alone only when it can cite the clause that settles the question; otherwise it asks and waits.
6. There are five gates: requirements, design and tests, build plan, code review, release. The build plan is gap-reviewed by a fresh-context reviewer before approval, and nothing is dispatched before the record exists.
7. Delegating a gate is off by default and may cover gate 4 only. Gates 1, 2, 3 and 5 are never delegable.
8. Approval and delegation records use a human-only write path enforced by agent hooks, the pre-commit hook and CI. Signatures are optional in version one and verified when present.
9. After the gate-5 sign-off, a release agent executes the project's release runbook. Approval is the human's; execution is the model's.
10. Rollback is pre-approved at gate 5. On a confirmed post-deploy smoke failure the release agent rolls back at once and reports. Any other recovery waits for the human.
11. License: MIT.
12. Budgets: by default, exceeding the approved cost or time, or hitting any loop cap, parks the story and asks the human; code-size and complexity budgets are tripwires that need a written justification. A project setting can switch everything to tripwires.
13. The forgeability gap in decision 8 is accepted for version one and stated in section 2 and section 9.
14. "Security" in this product means the security of the generated application, and the release condition is checkable rather than a promise of no holes: every story has its security scans and its fresh-context security review completed, no blocking finding is unresolved, and every accepted exception is a visible waiver on the release checklist. The design-time threat review and the abuse-case tests feed that condition.
15. Builder isolation in version one is hygiene: builders hold no deploy or release credentials, the protected zone is read-only to agents, and CI rejects out-of-scope changes. Per-story sandboxes come in version two.
16. A human may ask the release agent to deploy with credentials the human provides, and those credentials travel only through a channel the model never sees.
17. Discovery of an existing codebase maps conventions and structure, measures test coverage, flags risky areas and known-vulnerable dependencies, and proposes CLAUDE.md additions, within a budget. It proposes no refactoring.
18. For any product with a user interface, gate 1 requires a click-through of a throwaway mockup with hardcoded data, refreshed before gate 2 when the design changes the interface.
19. A delegated gate-4 merge always waits for the human's acknowledgment. No policy may opt into merging without it.
20. The design is built by guiding the approver: one question per significant decision that the approved PRD, the project profile and CLAUDE.md leave open, with a recommended option and its consequence in plain language, recorded as the decision record. Anything those documents already settle is cited, never re-asked. Delegated categories are decided by the agent and shown. On a founder-only project, technical decisions with no product consequence take the recommended default and are recorded as defaults.
21. The factory's own tooling (hooks, check runner, release executor, CLI, Orca plugin) is TypeScript on Node, because Node ships with Claude Code and Orca's plugin worker is Node.
22. Phase two automates the setup a founder cannot do alone: git, the remote, CI, branch protection, hooks and the keychain flow (REQ-24).
23. Bootstrap: the installed, pinned release of Pods enforces the development of the next release, and the enforcement code under development is ordinary story code. The first release is built under a declared bootstrap exception: hooks and CI are written first and approved as records marked bootstrap, and the exception expires when Pods 0.1 ships.
24. Phase one's exit criterion is milestone zero: one story end to end on the inline backend in a single Claude Code session, covering PRD, locked tests, implementation, evidence, a human-approved merge and kill-and-resume, with a changed locked test, a stale approval and unsupported evidence all exercised. Orca concurrency is added only after that passes. Scope is unchanged; this orders the work. The second project built with Pods validates it on an application that is not Pods.
25. The agent-hook layer is Claude Code only in version one. Codex exposes the same hook events, so hook parity for Codex is a version-two candidate once its hooks are confirmed able to deny a call; until then Codex builders are held by pre-commit, CI and rulesets.

## 5. Definitions used by the acceptance criteria

- **Control kinds:** every acceptance criterion is one of three. *Enforced*: a mechanical block, such as a missing record stopping a merge. *Measured*: a recorded result against a hash, such as the locked suite passing on a tree. *Reviewed*: an assessment by an agent or a human, recorded, which is evidence of attention and never proof of correctness. Traceability is measured; necessity and appropriateness are reviewed.
- **Evidence:** an artifact produced by the test harness, CI, or the factory's own executor or check runner, bound to a commit or tree hash: test runner output files, CI run links, runner-captured screenshots, check reports, release step logs. Text written by an agent is never evidence.
- **Record:** one append-only file in the protected zone for each approval, rejection, acknowledgment, delegation policy, delegated decision, waiver, amendment, revocation, status transition or check result. Every record carries the factory version, the schema version, the hash algorithm, a timestamp, the actor, an outcome, and the content or tree hash it binds.
- **The two zones of `.factory/`.** The **protected zone** is `.factory/records/`, `.factory/policy/` and `.factory/locks/`, together with the hook configuration, the CI workflow and the enforcement scripts wherever they live. Only two writers exist for it: the human approval path, and the factory check runner for check results, status transitions, delegated decisions and delegated gate-4 records. Check-runner records are authoritative only when CI wrote them; a local check runner's output is advisory and labelled so. Record writes are serialized and atomic, so two concurrent writes never produce a partial or lost record. The **work zone** is `.factory/work/`: PRD, design, eval plan, mockups, build plan, stories, handoff notes, event logs, reports, review packets, receipts and evidence. Agents and the CLI write the work zone on the main branch. Nothing in the work zone is binding until a record in the protected zone binds its hash.
- **Authoritative state:** the main branch. A story branch never changes anything under `.factory/`; CI fails a branch that does. Builder outputs (handoff notes, events, receipts) reach main through the completion payload the orchestrator persists.
- **Approval path:** the human-only command family: approve, reject, acknowledge, answer, amend, waive, revoke, delegate (write or change the policy) and migrate. An answer is recorded against the hash of the question it answers. Reverting a merged story is a revocation of that story's gate-4 record. Each is one plain-language command, run by a human in a human-owned terminal or through an Orca command, and writes the matching record. The hook denies every command in the family to agents. No policy means deny-all.
- **Hash:** a content hash over normalized content (line endings normalized), with the algorithm pinned per schema version and named in the record.
- **Tree binding:** a gate-4 approval binds the story branch's head tree hash. At merge, CI verifies the bound tree against the story branch's head under any merge strategy, including squash, so record commits and the merge itself do not invalidate it. When main has moved, the locked tests are re-run on the merge result; a re-review is required only if the story's own content changed.
- **Fresh context:** a reviewer agent started with no memory of the builder's session, given only the inputs the requirement names.
- **Significant decision:** one that chooses between alternatives affecting more than one requirement or phase, adds a dependency, or changes an interface.
- **Budgets and caps:** size in files and lines changed, nesting depth and function complexity; cost in tokens; time in wall-clock hours; loop caps for fix rounds per story, reopen cycles per plan, and re-reviews per story. Defaults are set in the tech spec and shown at gate 3. Exceeding cost, time or any cap parks the story in "needs human"; in tripwire mode it flags instead. Size and complexity are always tripwires.
- **Enforcement layers:** the agent hook, the pre-commit hook, and CI. Where a git host exists, server-side branch protection on main and CODEOWNERS over the protected zone, `.claude/` and `.github/` are required and verified by `doctor`.
- **Plain-language section:** a founder-facing section that contains no file paths, identifiers or code spans, checked by a lint. A labelled "open" reference to an artifact is allowed; a raw path is not.
- **Project profile:** a work-zone file recorded at start: whether an Engineer is on the project, whether the product has a user interface, the budget mode, the notification channels, the stack preset, and the runtime backend. Several requirements branch on it.
- **Status transitions:** a story's or artifact's status changes only through the factory CLI, which enforces the transition rules (ready rule, required records, caps) and invokes the check runner to write a status-transition record. Any actor may invoke it; the check runner is the writer. CI fails any status the records do not justify.
- **Needs human:** the state of any story or artifact waiting on an approver's answer.
- **Notification channel:** at least one channel independent of Orca, configured in the project profile: a desktop notification from the agent hook, and optionally email or a webhook. Every "needs human" state and every release halt is sent on it.
- **Invalidation graph:** what reopens when an approved artifact changes.

| Changed artifact | Reopens | In-flight stories |
|---|---|---|
| PRD (hashed per requirement ID) | Gate 1; gates 2 and 3 for requirements whose hash changed | Stories on unchanged requirements continue; stories on changed requirements park |
| Design or eval plan | Gate 2; gate 3 for stories whose interfaces or tests changed | Same rule |
| Any locked path (through an amendment; this row takes precedence over the rows above) | Nothing beyond the amendment record, within policy limits | Stories that cite the test re-run it |
| Build plan | Gate 3 (counts toward the reopen cap) | Dispatched stories continue unless their story file changed |
| Story content after gate 4 | That story's gate 4 (counts toward the re-review cap) | Only that story |
| Runbook or rollback plan (unlocked parts) | Gate 5; the gate-2 record's runbook hash is "as reviewed" and is not invalidated | None |
| Mockup refreshed by the design before gate 2 | Nothing; gate 2 binds the new hash, and the gate-1 snapshot stays as approved | None (a PRD change folded in from mockup feedback fires the PRD row) |
| Revocation of gate N | Gate N; every later gate's record is suspended until gate N is re-approved, and restored unchanged if the hashes match | Stories park until restored |

## 6. Functional requirements

Each requirement names its user, the flow, and acceptance criteria. Acceptance criteria become the locked tests at gate 2. IDs are stable; do not renumber.

### REQ-01 Start a new project through an interview
- **User:** Founder or Engineer.
- **Flow:** 1. Run the start skill. 2. A preflight proves the enforcement layers can be installed and reports what is missing. 3. The agent asks one question at a time: what the product does, for whom, stack, authentication, where it runs, git remote, who is on the project. Technical questions come with a recommended default that is recorded if accepted; product questions cannot be skipped. 4. It writes the project profile, drafts the PRD skeleton and the project's CLAUDE.md from a stack preset. 5. The user sees plain language only.
- **Acceptance:**
  - A PRD draft exists with a problem statement, product description, and requirements that each carry user, flow and acceptance criteria.
  - A project profile and a project CLAUDE.md exist; the CLAUDE.md carries the stack, structure rules, security rules and the "done" rule.
  - No application source file is created while gate 1 is open; an attempt is blocked and reported.
  - Skipping a product question is refused; a technical question accepted with its default is recorded as such.
  - The preflight names every enforcement layer as present or missing, and gate 1 cannot be approved while one is missing unless a waiver record (REQ-22) covers it.

### REQ-02 Discover an existing codebase before designing
- **User:** Engineer (a Founder may run it).
- **Flow:** 1. Run the discovery skill in an existing repo, within a time and token budget. 2. It maps conventions and structure, measures test coverage, lists risky areas (security-sensitive paths, untested areas, oversized files), inventories dependencies with known vulnerabilities, and proposes CLAUDE.md additions. 3. The approver approves the discovery before any design starts.
- **Acceptance:**
  - The discovery report has every section above; coverage is a measured number from the test tool, never an estimate.
  - The report and the CLAUDE.md diff contain no secret values and no contents of secret files.
  - The report proposes no refactoring; a proposal is flagged as out of scope.
  - The design skill refuses to run in an existing repo without an approved discovery.
  - A repo with no tests is reported as such.

### REQ-03 Review and approve the requirements (gate 1)
- **User:** Approver.
- **Flow:** 1. For a product with a user interface, the approver clicks through the mockup (REQ-23). 2. A red-team review argues as a skeptical founder, a security reviewer, an operations engineer and, when a platform is involved, a feasibility reviewer. 3. Every finding gets a disposition: fixed, deferred, or dismissed with a reason. 4. The approver acknowledges each dismissal. 5. The approver approves through the approval path. 6. The approval is recorded.
- **Acceptance:**
  - Approval is given through the approval path and the record binds the PRD's hash and a hash per requirement ID, and meets NFR-08.
  - For a product with a user interface, the record also binds the hash of a snapshot of the mockup taken at approval, and approval is refused without a recorded click-through.
  - The design skill refuses to start without a gate-1 record whose PRD hash matches the current PRD and whose mockup hash matches the gate-1 snapshot.
  - Editing the PRD after approval invalidates the record per the invalidation graph.
  - Each red-team role lists findings or states "none found" explicitly; an empty review is rejected.
  - A red-team finding without a disposition blocks approval, and a dismissed finding without an acknowledgment record blocks approval.
  - A revocation record (REQ-22) withdraws the approval and reopens the gate.

### REQ-04 Technical design in phases
- **User:** Engineer approves; Founder reads a plain-language summary.
- **Flow:** 1. From the approved PRD, mockup and CLAUDE.md, the design skill identifies the significant decisions the PRD, the project profile and CLAUDE.md leave open and asks the approver about each, one question at a time, with a recommended option and its consequence in plain language: cost, speed, lock-in, risk, and what users will notice. Anything those documents already settle is cited in the decision record, not re-asked. Each answer becomes an architecture decision record. Decisions inside a delegated category (REQ-17) are made by the design skill under the same policy and shown on the status page. When the project profile has no Engineer, technical decisions with no product consequence take the recommended default and are recorded as defaults. 2. The skill then writes phases, interfaces between agents, non-goals, budgets and caps per phase, a threat review and a production-readiness section. 3. Unknowns get a time-boxed spike whose code is deleted. 4. A fresh-context agent writes the plain-language summary from the final design. 5. When the project profile has no Engineer, a fresh-context technical reviewer reports on the design before approval.
- **Acceptance:**
  - The design has every required section; a check fails when one is missing.
  - The threat review contains a trust-boundary map that treats agents as untrusted, the untrusted-text entry points, credentials and network access per role, the pinned supply chain, and abuse cases per requirement that become locked negative tests at gate 2.
  - The production-readiness section covers migrations and rollback, logging and monitoring, the release runbook, the smoke-test retry rule, and a reversibility check for every runbook step.
  - Every phase lists the requirement IDs it delivers, and every requirement appears in at least one phase.
  - Each significant decision has a record with the alternatives rejected and who decided: the approver (with the question asked), a delegated category, a recorded default, or a cited clause of the PRD, the project profile or CLAUDE.md.
  - A significant decision with none of those four behind it fails the check.
  - A design question about something the PRD, the project profile or CLAUDE.md already settles fails the check; the record cites the clause instead.
  - On a founder-only project, every decision that touches cost, a vendor, where data lives or what users see was asked or cited, never defaulted.
  - No spike code is present on the main branch.
  - The plain-language summary is written by a fresh-context agent from the final design hash.
  - When the profile has no Engineer, gate 2 cannot be approved until the technical reviewer's report is attached.

### REQ-05 Eval plan written before any code
- **User:** Engineer writes; Founder approves the plain-English rendering.
- **Flow:** 1. Each acceptance criterion becomes positive and negative tests tagged with its requirement ID, including the abuse cases from the threat review. 2. Tests target public behavior only; end-to-end tests for user interfaces cite the mockup screens they correspond to. 3. AI features get scenario sets with thresholds. 4. A fresh-context agent regenerates a plain-English rendering from each test. 5. The approver acknowledges the regenerated renderings. 6. The suite is run against the current codebase and every test's result is classified.
- **Acceptance:**
  - Every requirement has at least one positive and one negative test, each tagged with the requirement ID.
  - Before approval each test's result is classified. A new-behavior test must fail with an assertion failure for the expected behavioral reason, never a setup error or a skip. A negative or security test is approved only paired with the positive test of the valid operation it guards, and the pair fails together before implementation. Existing tests keep their baseline. Any other outcome blocks approval and is reported by test name.
  - Builders may add implementation and regression tests; those are unlocked, and the locked suite remains the definition of done.
  - Each test has a regenerated plain-English rendering; a mismatch with the author's rendering blocks approval until the approver acknowledges the regenerated one.
  - Every end-to-end test for a user interface names the mockup screen it verifies.
  - AI feature evals carry safety thresholds of 100 percent of the defined scenario set and stated quality thresholds; passing means the defined set passed, not that the feature is safe in general.

### REQ-06 Lock the approved tests (gate 2)
- **User:** Approver.
- **Flow:** 1. The approver approves the design and eval plan through the approval path. 2. A lock record lists the locked paths and their hashes. 3. From then on the agent hook, the pre-commit hook and CI refuse changes to locked paths. 4. A change to a locked path goes through an amendment (REQ-22).
- **Acceptance:**
  - Approval is given through the approval path, and the record binds the design, the eval plan, the release runbook and rollback plan, and the refreshed mockup when the product has a user interface, by hash, and meets NFR-08.
  - The lock covers the test files, the eval plan, test runner configuration, fixtures, the exact test command, dependency lockfiles, smoke tests, every script the release runbook invokes, and the enforcement code itself.
  - After locking, an agent edit to a locked path is denied by the hook; an edit to an unlocked path is allowed.
  - A commit that changes a locked path without an amendment or a new approval fails pre-commit and CI.
  - CI runs the locked test command, not a command of the branch's choosing.
  - Hashes are computed over normalized content, so a line-ending change alone never invalidates a lock.
  - An amendment to a locked test shows the before and after plain-English renderings, and the approver acknowledges them before the amendment takes effect.

### REQ-07 Plan the build and approve it (gate 3)
- **User:** Orchestrator drafts; a fresh-context reviewer checks for gaps; approver approves.
- **Flow:** 1. The orchestrator turns the approved requirements and phases into stories: one requirement plus technical tasks, the locked tests to pass, interfaces, the file scope the story may touch, budgets, caps, and the assigned agent and model. 2. A fresh-context reviewer checks for gaps: every requirement covered, every story ready, interfaces consistent with the design, no story outside the approved phases, each assignment justified. 3. Every gap finding gets a disposition, and the approver acknowledges dismissals. 4. The packet shows estimated tokens and days per story and in total, and the caps. 5. The approver approves through the approval path; the record binds the plan's hash. 6. Only then does the orchestrator dispatch.
- **Acceptance:**
  - Every story file carries requirement IDs, test IDs, interfaces, the spec sections it lists, the mockup screens it lists, a file scope, budgets, caps, an assigned agent and model, an owner and a status.
  - Approval is given through the approval path and the record meets NFR-08.
  - The gap report lists findings or states "none found" for each check; an empty report is rejected, a finding without a disposition blocks approval, and a dismissed finding needs an acknowledgment record.
  - The packet states estimated tokens and days per story and in total.
  - Every requirement is covered by at least one story.
  - A story cannot enter "in progress" until the ready rule passes: acceptance criteria written, tests locked, interfaces defined, file scope declared.
  - No story is dispatched, with Orca or inline, without a gate-3 record whose hash matches the current plan; the factory hook blocks dispatch commands without it. Orca is detected through its status command.
  - Editing the plan after approval reopens gate 3 and counts toward the reopen cap; exceeding the cap parks the plan in "needs human", or flags it in tripwire mode.
  - With Orca, each story has its own worktree whose status is set to the factory's first stage immediately after creation, and the orchestrator runs in a root terminal.

### REQ-08 Build stories with agents
- **User:** Orchestrator dispatches; Engineer observes.
- **Flow:** 1. After gate 3, the orchestrator picks the Orca backend when Orca is running, otherwise the inline backend. 2. Stories go to builder agents, split by feature. 3. Each builder works in its own worktree or branch, holds a lease on the story, and receives only its story file, the spec sections the story lists, the project rules, and the mockup screenshots the story lists. 4. It writes the minimum code to pass the locked tests, then cleans up while green. 5. It leaves a handoff note.
- **Acceptance:**
  - With Orca, each story is a tracked task with a dispatch, completion carries a success or failure outcome, the retry limit is at or below Orca's own circuit breaker, and the dispatch receipts and completion payloads are persisted in the work zone.
  - Without Orca, the same stories run sequentially in one session and produce the same records.
  - A story is not "done" until its locked tests pass on its branch.
  - A handoff note exists for every builder session, including one written by the orchestrator when a builder dies.
  - The context given to a builder is exactly its story file, the spec sections the story lists, the project rules, and the mockup screenshots the story lists, captured at gate 2, recorded by the orchestrator from what it supplied.
  - A lease on "in progress" expires after the configured time, returning the story to "ready" with its handoff note. Every dispatch carries a lease token, and a result arriving with an expired or superseded token is rejected and logged.
  - Builders hold no deploy or release credentials, and CI fails a story whose diff touches files outside the story's declared file scope or anything under `.factory/`.
  - Killing the builder, the orchestrator or Orca at any point and restarting resumes from files with no lost record; this is an acceptance test.

### REQ-09 Verify before human review
- **User:** QA and reviewer agents produce; Engineer reads.
- **Flow:** 1. Restraint checks run: every new file, endpoint and public function traces to a requirement; code no requirement test exercises is flagged; size and complexity budgets are tripwires; architecture rules, unused-code and duplication checks run. 2. Security scans run: secrets and dependency vulnerabilities. 3. A fresh-context security reviewer checks the produced code against a fixed checklist: injection, authentication and authorization, secrets handling, data exposure, unsafe dependencies, and prompt injection for AI features. 4. A simplicity reviewer applies a fixed checklist and flags only. 5. A QA agent verifies against the requirements with evidence. 6. Bugs go back to the agent that made the change, up to the fix-round cap.
- **Acceptance:**
  - A story cannot reach gate 4 with a failing restraint or security check, or an unresolved security-reviewer finding marked blocking.
  - Untraced code is reported with its file path.
  - A QA failure creates a fix task for the originating worker; with Orca that is the same dispatch terminal.
  - Simplicity and security-reviewer findings are listed, never applied automatically.
  - A QA pass with no attached evidence is rejected.
  - Exceeding the fix-round cap, the cost budget or the time budget parks the story in "needs human", or flags it in tripwire mode.
  - Every artifact passes secret and personal-data redaction before it is written; raw tool output is never embedded.

### REQ-10 Human review of the changes (gate 4)
- **User:** Founder or Engineer.
- **Flow:** 1. A fresh-context agent writes the review packet from the story's final tree: plain-language summary, requirements covered, evidence of test results, restraint, security and simplicity findings, delegated decisions made during the story, runner-captured screenshots for UI, and four closing lines: what changed, what was checked, what remains uncertain, what this approval authorizes. 2. The Engineer also gets the diff. 3. The approver approves or rejects through the approval path, with reasons. 4. Rejections become fix tasks.
- **Acceptance:**
  - Approval is given through the approval path and the record meets NFR-08.
  - Merge is blocked without a gate-4 record under tree binding; a moved main re-runs the locked tests, and re-review is required only when the story's own content changed.
  - The packet is written by a fresh-context agent from the final tree hash; a packet from any other source is rejected.
  - The packet contains every section; a missing section fails the check, and the summary is a plain-language section.
  - The packet ends with the four closing lines, and the approve command shows them before the confirming click.
  - A content change after approval requires re-review and counts toward the re-review cap; exceeding the cap parks the story in "needs human", or flags it in tripwire mode.
  - A delegated gate-4 record counts only under REQ-17.

### REQ-11 Release sign-off (gate 5)
- **User:** Approver.
- **Flow:** 1. The release checklist is assembled for one exact release: the merged source revision, the immutable build artifact and its digest, the target environment, the configuration and migration set, and the verification evidence for that artifact; plus the full regression suite green, migrations with a rollback plan, logging and monitoring, feature flag or rollback plan, the release runbook, evidence that the rollback was rehearsed outside production, and the security release condition of decision 14. 2. Each item links evidence. 3. The approver signs off on that release and its rollback plan together, through the approval path.
- **Acceptance:**
  - Approval is given through the approval path and the record meets NFR-08.
  - The release command refuses without a gate-5 record.
  - Each checklist item has evidence; an empty item fails.
  - The regression suite is the locked suite plus any regression tests added since.
  - The sign-off record binds the source revision, the artifact digest, the target environment, the configuration and migration set, the verification evidence, the release runbook and the rollback plan by hash.
  - The security release condition is a checklist item with evidence: every story's scans and security review completed, no unresolved blocking finding, every exception a visible waiver.
  - Evidence of a rollback rehearsal run outside production is required before sign-off.

### REQ-12 Control room in Orca
- **User:** Founder or Engineer using Orca.
- **Flow:** 1. Orca's board columns are the factory stages, defined as workspace statuses. 2. Story worktrees move as their status changes. 3. The factory keeps a generated status page listing open gates, questions for the human, delegated decisions and parked stories. 4. Factory commands in Orca's quick actions open an artifact, approve, reject or answer; each runs the factory CLI in a human-owned shell terminal, never an agent terminal, strips control characters from anything it types, and confirms the decision and the hash with a fresh click before acting. 5. After opening a gate or question, the orchestrator ends its turn, so Orca's desktop and mobile notifications fire.
- **Acceptance:**
  - Every open gate, question and delegated decision appears on the status page with a labelled "open" reference; the open command shows the artifact in Orca.
  - Approving from an Orca command produces the same record as approving from the CLI, the approving process is never an agent, and the command confirms hash and decision before writing.
  - Typed text is stripped of control characters.
  - A card's column matches its story file's status after the orchestrator's next status update.
  - A gate or question that needs a human raises an Orca notification and a notification on the project's independent channel.
  - The Orca plugin entry is labeled experimental, and the factory never relies on it for enforcement.

### REQ-13 Escalation
- **User:** Builder agents ask; orchestrator routes; approver decides.
- **Flow:** 1. A builder's question goes to the orchestrator. 2. The orchestrator answers questions the spec already settles, citing the section. 3. Product and security questions, and anything the orchestrator cannot cite, go to the human (REQ-17). 4. The factory writes every decision to the decision log.
- **Acceptance:**
  - A dispatched builder never opens a local question prompt the orchestrator cannot see; under Claude Code the factory hook denies that tool during a dispatch.
  - Each decision has a log entry with date, decider and outcome; orchestrator decisions also carry the clause relied on. The log is written by the check runner, not by the deciding agent.
  - Between builder and orchestrator: at most one follow-up per topic; after that the builder takes the most conservative option the spec allows and records the assumption. Between orchestrator and human: no default is ever taken.

### REQ-14 Process metrics
- **User:** Engineer.
- **Acceptance:**
  - A metrics command reports, per project: issues caught at each gate, bugs that reached production (from incident records the team logs), rework rate, time and tokens per story, human minutes per story from record timestamps, approval requests and interruptions per story, and false blocks measured as waivers and overturned blocks.
  - Metrics are computed from records, persisted dispatch receipts and agent transcripts or handoff notes, with no network access.
  - Every record carries a timestamp and an outcome from phase one, so metrics can be computed for stories built before the metrics command exists.

### REQ-15 Learning loop
- **User:** Engineer.
- **Flow:** 1. The retro skill reads QA failures, gate rejections and incident records, after redaction, and asks the approver one question per release: did you understand what you approved, and what was unclear. 2. It proposes rule additions, template changes and new eval scenarios as a pull request. 3. The second project built with the factory includes a founder user test of the gate packets.
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
- **User:** Approver grants; the design skill (before gate 2) or the orchestrator (after it) exercises; builders never hold them.
- **Flow:** 1. The approver writes a delegation policy from a default-deny template: enumerated decision categories the orchestrator may settle alone, categories reserved for the human, and limits. 2. When a question arises, the orchestrator looks for the clause in the PRD, design, rules or policy that settles it. 3. If it finds one, it decides, the check runner records the decision with the category ID and the quoted clause, the status page shows it at once, and work continues. The agent acting under the policy is the design skill before gate 2 and the orchestrator after it. 4. If it cannot cite a clause, or the category is reserved, it asks the human and waits. 5. The human can overrule any delegated decision, and the overrule becomes a policy or spec change.
- **Acceptance:**
  - The policy lives in the protected zone and names categories by ID; free text never grants authority.
  - Every decision the orchestrator makes without the human cites a category ID and the quoted clause; a decision without both fails the check and is reported as a question that should have been asked.
  - The gate-4 reviewer checks each cited clause and flags citations that do not settle the question.
  - A question outside the delegated categories moves the story or artifact to "needs human" until answered; no default is taken on timeout.
  - The policy and every acknowledgment are records written through the approval path; a policy may be written or changed at any time, and until one exists deny-all applies.
  - All delegated decisions appear live on the status page and in the gate-4 packet.
  - When the same topic comes back a second time, the orchestrator must propose a spec or policy change instead of answering again.
  - Builders never exercise delegated rights; a builder question always goes to the orchestrator first.
  - A policy may cover gate 4 only; a policy naming any other gate is rejected, and with no policy every gate waits for a human.
  - Delegated gate-4 conditions are evaluated by the check runner from evidence, never by the orchestrator's reading of prose, and the check runner writes the delegated record.
  - A delegated gate-4 approval is announced to the human with the conditions met and their evidence, and the merge waits for the human's acknowledgment record. Without that record it does not merge.

### REQ-18 Execute the release after sign-off
- **User:** Release agent executes; approver watches; Founder receives a plain-language report.
- **Flow:** 1. With a valid gate-5 record, the release agent drives the runbook through the factory's release executor: build, migrations, deploy, post-deploy smoke tests, version tag, changelog, notification. 2. The executor, not the model, holds and injects credentials (REQ-21). 3. Each step logs its command, result and evidence, redacted. 4. A smoke failure is retried under the design's retry rule; a probe error (the check itself could not run) is retried, an application failure (the application answered wrongly) is confirmed, and a confirmed failure triggers the pre-approved rollback at once. 5. Release state is persisted at every step.
- **Acceptance:**
  - The release command refuses to start without a gate-5 record whose hashes match the current runbook, rollback plan, artifact digest and target environment; any mismatch halts before the first step, so nothing but the bound artifact reaches the bound environment.
  - Every runbook step has a logged result and evidence; a step without evidence halts the release.
  - A confirmed smoke failure triggers the rollback without a human, and the rollback's own smoke result is reported.
  - A probe error never triggers a rollback; only a confirmed application failure does, and the rollback step's log names it.
  - The executor applies the retry rule the runbook states; a retry count or failure classification not in the runbook is refused.
  - No recovery action beyond the pre-approved rollback runs without a human decision.
  - Credentials never appear in logs, artifacts, reports or any model context (REQ-21).
  - Release state is persisted after every step; a crash of the agent or the machine leaves a state that can be resumed or rolled back from.
  - Each runbook step declares itself idempotent or carries a reconcile check; after a crash the executor runs the reconcile check before repeating a step, and a step with neither halts for a human.
  - A failed rollback writes a persisted "release broken" state and sends a notification on the independent channel.
  - The runbook is project-specific and is reviewed at gate 2, including the retry rule and the reversibility check per step.

### REQ-19 Observability and operations
- **User:** Engineer; Founder for `explain`.
- **Acceptance:**
  - An append-only event log per story records every status change, dispatch, check result, hook denial, question and decision.
  - `status` shows every story, its stage, its owner and what it is waiting on.
  - `explain <story>` names the gate, check or question blocking it, in plain language.
  - `doctor` proves each enforcement layer is active, including branch protection, CODEOWNERS and managed hook settings where a git host exists, and fails when any is missing or waived.
  - An audit view lists every record of every type, approval, rejection, acknowledgment, answer, delegation policy, delegated decision, waiver, amendment, revocation, status transition and check result, with actor and time.

### REQ-20 Versioning and upgrades
- **User:** Engineer.
- **Acceptance:**
  - `.factory/` carries a schema version, and every record names the factory version and the hash algorithm used.
  - Changing the hash algorithm never reopens gates by itself; records are verified with the algorithm they name.
  - A `migrate` command upgrades the format with tests for every migration.
  - A factory or plugin upgrade mid-project is a human-written amendment of the enforcement-code lock; gates already approved stay approved.
  - The factory version that enforces a project is pinned in the project profile; developing the next Pods release runs under the pinned one, and bootstrap records are marked as such and expire when the first release ships.

### REQ-21 Deployment credentials never reach a model; declared secrets are protected
- **User:** Approver supplies credentials; release executor uses them.
- **Flow:** 1. The human enters a credential through a hidden-input prompt in a human-owned terminal, or references it in the operating-system keychain or a secret manager. 2. The factory stores it in the keychain or secret manager, never in a file an agent can read. 3. The release executor injects it into the process that needs it and redacts all output. 4. Agents are denied reading secret files by hooks.
- **Acceptance:**
  - No deployment credential value is ever passed through chat, a prompt, a skill argument or a file in the repo.
  - The supported channels are the hidden-input prompt, the operating-system keychain and the secret manager; the executor controls injection and output for runbook steps; the canary tests establish exactly these channels and the declared secret paths. Anything outside them is covered by redaction patterns only, and section 9 states that limit.
  - Canary secrets planted in the keychain, in a `.env` file and in a tool's output never appear in any transcript, log, artifact, record or report; each is an automated test.
  - Personal-data patterns in tool output and screenshots are redacted before an artifact is written; this is an automated test with planted samples.
  - The agent hook denies reading `.env` files and other declared secret paths.
  - The executor's output is redacted before any agent can read it.

### REQ-22 Recovery and exceptions
- **User:** Approver.
- **Acceptance:**
  - A revocation record withdraws any approval and reopens its gate per the invalidation graph's revocation row.
  - An amendment record, human-written and bound to the before and after hashes, changes a locked artifact without a full re-approval. For a locked test it lists the test IDs changed and carries the regenerated renderings; for enforcement code it carries the factory version change and the diff hash. Amendments are limited to the count per phase the policy sets.
  - A waiver record, human-written and time-boxed, lets a named failing check or missing enforcement layer pass for a named story or gate; expired waivers fail again, and every active waiver is shown by `doctor` and on every packet.
  - The invalidation graph in section 5 is enforced: a change to an approved artifact invalidates exactly the records it lists.
  - Every failure that stops work produces a plain-language message with what happened and the approver's options, sent on the independent channel.
  - A merged story can be reverted through a recorded command that reopens its gate-4 record.

### REQ-23 Clickable mockup before sign-off
- **User:** Founder or Engineer approves; the mockup skill builds, invoked by the PRD skill.
- **Flow:** 1. For any requirement with a user interface, the agent builds a throwaway clickable mockup with hardcoded data that walks every flow in the PRD. 2. It is served locally and opened in Orca's built-in browser or the system browser. 3. The approver clicks through and gives feedback by clicking elements in Orca's Design Mode or in plain language. 4. The PRD skill folds the feedback into the requirements. 5. The click-through is recorded and gate 1 binds the mockup's hash. 6. When the design changes the interface, the mockup is refreshed before gate 2, and gate 2 binds the new hash.
- **Acceptance:**
  - Every user-facing flow in the PRD has a reachable screen in the mockup; a flow without one blocks gate 1.
  - The mockup lives under `.factory/work/mockups/`, never under application source, and restraint checks ignore it.
  - A builder's story context never includes the mockup's code; builders receive only the screenshots their story lists, captured at gate 2 before archiving.
  - The mockup is archived after gate 2 and cannot be served from the repository afterwards.
  - Feedback given through Design Mode or in plain language appears as a change to the PRD, the mockup, or both, with the approver's acknowledgment.

### REQ-24 Managed setup (phase two)
- **User:** Founder or Engineer.
- **Flow:** 1. One setup command creates or adopts the repository and its remote, installs the CI workflow, configures branch protection or rulesets and CODEOWNERS where the host plan allows, installs the hooks and managed settings, and sets up the keychain flow. 2. It detects the host plan first: on GitHub, branch protection and rulesets exist only for public repositories on the Free plan, so a private repository is offered three choices, make it public, upgrade the plan, or run under a visible waiver. 3. It is idempotent and reports every step as done, skipped with reason, or failed.
- **Acceptance:**
  - After setup on a supported host and plan, `doctor` passes with no waiver.
  - On an unsupported plan, setup refuses to continue silently; it records the chosen option, and a waiver, when chosen, is visible on every packet.
  - Running setup twice changes nothing the second time.
  - Setup never stores a credential outside the keychain or secret manager, and never prints one.
  - The host-plan rules it relies on are re-verified against the host's documentation when the factory version is built, and the setup names the plan it detected.

## 7. Non-functional requirements

- **NFR-01 Enforcement depth.** Every gate rule has one authoritative control and two advisory copies. CI and, where a git host exists, server-side rulesets are authoritative. The agent hook denies agents' tool calls and gives fast feedback. The pre-commit hook is a local gate that can be bypassed and is never relied on alone. Branch protection on main and CODEOWNERS over the protected zone, `.claude/` and `.github/` are required where the host plan allows them and verified by `doctor`; where the plan does not allow them, `doctor` reports it and a waiver is required. Hook configuration lives in managed settings.
- **NFR-02 Cross-platform.** macOS, Windows and Linux are all supported, and the hook and lock test suite runs in CI on all three.
- **NFR-03 Agent-agnostic core.** Skills use the standard format. Claude Code hooks are the enforced path. Codex is supported as a builder worker under Orca. Other agents get pre-commit, CI and branch-protection enforcement only.
- **NFR-04 State lives in files.** Sessions can restart at any point; the kill-anywhere test in REQ-08 is the measure.
- **NFR-05 Security and privacy of the factory itself.** No telemetry. Secrets never enter artifacts (REQ-21). Untrusted text includes PRD text, story files, issues and tickets, repository content, dependencies, worker messages and handoff notes; the factory's own threat review covers them, plus agent credentials, network access per role and the install chain.
- **NFR-06 Cost.** Model-per-role defaults, reviewer context limited to the diff, the story and the spec sections the story lists, budgets and caps per story, and tokens reported in the metrics. Expected cost per story is a measured number after the first project, not a guess.
- **NFR-07 The factory obeys its own rules.** Nesting depth of at most three, non-domain code in utilities, restraint checks, the security review and the simplicity review all run on the factory's own code.
- **NFR-08 Approval integrity.** Records in the protected zone are written only by the approval path and, for check results, status transitions, delegated decisions and delegated gate-4 records, the factory check runner, which any actor may invoke through the CLI and which is the committer of those four types. Agent hooks deny agents writing there, and the pre-commit hook and CI reject a record whose commit author is an agent session. Every record carries the actor's git identity, the artifact hash and a timestamp. When the approver has a signing key configured, approvals are also signed tags that CI verifies; signatures are optional in version one. The limits of this are stated in section 2.
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
- Hook enforcement for agents other than Claude Code. Codex parity is a version-two candidate (decision 25).
- High-fidelity design tooling. The mockup is a throwaway click-through, not a design system.

## 9. Known limitations, stated for adopters

- A deliberately malicious agent running as the approver's operating-system user could forge a file-based approval. Version one does not close this; signatures are optional.
- Hooks are Claude Code specific; other agents are held only by pre-commit, CI and branch protection. Codex has equivalent hook events, and parity is planned for version two if its hooks can deny a call.
- Orca's orchestration and plugin system are experimental and must be enabled in Orca's settings; the factory never depends on them for enforcement.
- Secrets outside the supported channels and the declared secret paths are protected only by redaction patterns, not by the executor boundary.
- On GitHub Free, private repositories have no server-side branch protection; such projects run under a visible waiver or upgrade the plan.

## 10. Open questions

1. Resolved 2026-10-12: the version-one cut holds, enforcement core first (decision 4).
2. Resolved 2026-10-12: delegation may cover gate 4 only, off by default (decision 7).
3. Resolved 2026-10-12: human-only write path with optional signatures (decision 8); risk accepted (decision 13).
4. Name: Pods, command `pods`; repository name pending the Orca team's view on the `orca-` prefix. License resolved 2026-10-12: MIT.
5. Which stack presets ship beyond FastAPI, React with TypeScript and Postgres.
6. Resolved 2026-10-12: brownfield discovery maps, measures and flags risks (decision 17).
7. What the second project is: a sample app in the repo, or a Kalendaryo feature.
8. Resolved 2026-10-12: no. A delegated gate-4 merge always waits for the human's acknowledgment (decision 19).

## 11. Glossary

- **Gate:** a point where a human must approve before work continues. There are five: requirements, design and tests, build plan, code review, release.
- **Lock:** a recorded hash of approved files that agents are prevented from changing.
- **Story:** one requirement plus the technical tasks that complete it.
- **Orchestrator:** the hub agent that plans, dispatches, routes questions and decides only what was delegated. Before gate 2 the design skill holds the same delegated rights.
- **Worker:** an agent session that builds, tests or reviews one story.
- **Restraint check:** an automated check that flags code no requirement traces to or no requirement test exercises. It measures traceability; whether code is necessary is a reviewed judgment.
- **Red team:** a review that argues against a document from a fixed set of hostile viewpoints.
- **Delegation policy:** the human's written grant, by category ID, of which decisions the orchestrator may make alone.
- **Check runner:** the factory's own non-model process that runs checks and writes their results.
- **Release executor:** the factory's own non-model process that runs runbook steps, holds credentials and redacts output.
- **Mockup:** a throwaway click-through with hardcoded data, used to approve flows before they are built.
- **Needs human:** the story state for anything waiting on an approver's answer.

## 12. Changelog

- **0.6 (2026-10-12):** decisions 23 (bootstrap) and 24 (milestone zero before Orca concurrency) recorded. Independent review of 0.5 applied: control kinds defined; decision 14 restated as a checkable release condition; REQ-05 classifies pre-implementation results and pairs negative tests with positive ones; gate 5 binds revision, artifact digest, environment, configuration and evidence, and runbook steps are idempotent or reconciled; records serialized and lease tokens fenced; NFR-01 names the authoritative layer; REQ-21 narrowed to its real boundary; human-effort metrics and the four closing lines; REQ-24 managed setup in phase two; decisions 21 and 22; working name Pods.
- **0.5 (2026-10-12):** third verification pass applied: `answer` joins the human-only command family and revert is a gate-4 revocation; a cited clause is a fourth decider in REQ-04; the gate-1 mockup is snapshotted so design re-runs never deadlock; NFR-08 names the check runner for all four record types; the design skill holds delegated rights before gate 2; builder context and story fields carry the mockup screens; the audit view lists every record type.
- **0.4 (2026-10-12):** second verification pass applied: approval path defined as the human-only command family, acknowledgment and status transitions as record types, check runner as writer of delegated decisions, tree binding under any merge strategy, mockup and revocation rows in the invalidation graph, gate-2 record hashes named, mockup screenshots in builder context, probe errors never roll back, tripwire mode on all caps. Decision 20 refined: the design interview asks only what the PRD, profile and CLAUDE.md leave open.
- **0.3 (2026-10-12):** design phase made interview-driven (decision 20); silent delegated merges ruled out (decision 19). Applied the verification pass on 0.2: two-zone `.factory/` model, approval path as a definition and criterion on every gate, tree binding fixed for a moved main, file scope on stories, builder-context bound restored, cap consequences, invalidation graph written out, control-character stripping and confirmation for Orca commands, canary tests for every secret channel, project profile, independent notification channel, check runner as the writer of delegated records, fail-closed delegated merges. Added REQ-23 (mockup) and the brownfield depth in REQ-02 (decisions 17 and 18).
- **0.2 (2026-10-12):** applied the red-team review of 0.1. Added definitions, REQ-19 to REQ-22, the security reviewer step, the state model, budgets and loop caps, delegation by category ID, redaction, release executor and credential handling, the Orca feasibility rewording, and the known-limitations section. Decisions 11 to 16 recorded.
- **0.1 (2026-10-12):** first draft from the workflow document and decisions 1 to 10.
