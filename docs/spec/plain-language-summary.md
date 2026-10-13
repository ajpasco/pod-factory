# pod-factory design: plain-language summary

For the gate-2 approval, 12 October 2026. Written by an agent that did not write the design, from the final documents only: the approved requirements, the design specification and its eleven decision records (written records of choices). It also draws on the interfaces (how parts connect), the threat review (how misuse is handled), production readiness (operating it safely), the test plan, the criterion mapping (how each criterion is checked) and the proposed requirements amendment. Where documents disagree, the newest decision wins, and this summary follows it.

## 1. What is being built

pod-factory is an open-source workflow for building production-ready (ready for real users) software with AI coding agents. Its rules are enforced, not just stated. You approve the work at five gates (human approval checkpoints): requirements, design and tests, build plan, code review, and release. Between gates, agents work under checks that never take an agent's word. It runs with Claude Code (Anthropic's terminal coding agent) alone. Inside Orca (a multi-agent workspace app) it adds parallel agents, a board and a control room for status and approvals. This design plans pod-factory in seven phases. pod-factory is also the first project built this way, under bootstrap rules (temporary rules for self-building) until its first release. The second project will be an application that is not pod-factory, not yet chosen.

The first usable milestone is milestone zero: one story (one requirement's work) carried end to end in a single Claude Code session. That story is the status view, which lists every story, its stage, its owner and what it waits on. It must pass through requirements, locked tests (tests agents cannot change), code, machine-produced evidence, and a merge (acceptance into the main code) that you approved. It must survive the session being killed and restarted mid-run. Three refusals must also be seen working. An edited locked test is refused. An approval gone stale after a later change is refused at merge. A claim that tests passed, without real test output behind it, is rejected. Before that, a small starting kit is written by hand: a way to approve and reject, the lock, the record store, two hooks (checks on agent actions), three automatic checks and a minimal health check.

## 2. How a project moves through it

At every gate you approve by typing one command in your own terminal (the text command window). It shows a plain summary and a fingerprint (a code unique to content) of what you are approving. You confirm by typing the gate number and the first eight characters of that fingerprint. The command refuses to run inside an agent's session.

- **Start.** You answer an interview, one question at a time. Product questions cannot be skipped. Technical questions offer a recommended default, recorded as a default. A preflight (a pre-install check) reports each of seven enforcement layers (independent rule-checking mechanisms) as present or missing. In a project with existing code, a discovery report comes first: conventions, measured test coverage (share of code tested), risky areas, flawed outside code and proposed rules. You approve it before any design. No application code can be written before gate 1.
- **Gate 1, requirements.** An agent drafts the requirements document: every requirement with its user, its flow and its acceptance criteria (observable conditions for done). For anything with screens, you click through a throwaway prototype, in Orca or your own browser. Four reviewers with no prior memory argue against the document: a skeptical founder, a security reviewer, an operations engineer and a feasibility reviewer. Each finding is fixed, deferred or dismissed, and you acknowledge every dismissal. Your approval fixes each requirement and the prototype by fingerprint. Editing one reopens the gate for it.
- **Gate 2, design and tests.** The agent asks you one question per open decision, with a recommendation and its consequence. What the requirements already settle is cited, not asked. The design covers phases, interfaces, what it will not do, budgets, a threat review, production readiness and the release runbook (the scripted release steps). The test plan turns every criterion into tests that show it works and tests that show it refuses. You see each test as a plain-English description that a fresh agent rewrites from the test itself. The tests run before approval and must fail for the right reason. Without an engineer on the project, a fresh technical review is also required. You approve, and the tests and everything they depend on are locked.
- **Gate 3, build plan.** The coordinating agent splits the design into stories. Each names its tests, the files it may touch, its limits, and its agent and model. A fresh reviewer checks the plan for gaps. You see estimated tokens (units of AI usage) and days. Nothing starts until you approve.
- **Build and verify.** Each builder (an agent that writes code) works in its own copy of the code. It sees only its story, the design sections it names, the project rules and prototype screenshots. It is given no credentials (passwords and access keys). It writes the least code that passes the locked tests and leaves a handoff note for the next session. Then checks run. They trace every new file to a requirement, find untested code, apply size limits, and scan for leaked secrets and flawed outside code. There is also a security review, a simplicity review, and QA (checking against the requirements) with evidence. Bugs go back to the builder that made them. Builder questions go to the coordinating agent. It may settle one only under a decision category you granted in writing, quoting the clause that settles it. Otherwise the question comes to you, and nothing is ever settled by default or by waiting.
- **Gate 4, code review.** A fresh agent writes the review packet: a plain summary, requirements covered, test evidence, every finding, decisions made on your behalf, screenshots, and four closing lines. Engineers also get the raw changes. Merging is blocked until you approve that exact content, and any later change needs a new review. This is the only gate you may delegate. Delegation must be in writing, its conditions are checked from evidence, and the merge still waits for your acknowledgment.
- **Gate 5, release.** The release package is built and tested first, and its rollback (return to the previous version) is rehearsed. You sign off on the release and its rollback together. A program, not a model, holds the credentials and deploys exactly that package. A confirmed failure after release rolls back at once. Any other recovery waits for you.
- **Throughout.** State lives in files, so a killed session restarts without loss. A status view, a plain explanation of what blocks a story, and a health check of every enforcement layer are always available. When something needs you, you get a desktop notice, an optional web message, or an Orca notification. Every stop comes with a plain message and your options. Metrics count issues caught per gate, bugs that reached production, rework, and time and tokens per story, all computed offline. How you review is never measured. A retrospective (a look-back after release) proposes rule changes, each citing the failure behind it, for you to approve.

## 3. The significant decisions

Nine decision records hold your answers to the nine design questions. Two more hold nine follow-up choices you approved together, plus technical defaults you may overrule. Here they are in the order you need them.

### How it installs and runs

pod-factory ships as one package on npm, the public package store for Node (a JavaScript runtime). You need Node installed first, at the current or previous long-term-support version. One command installs it, with exact versions of everything it depends on. A Claude Code add-on, installed once per machine, carries the hooks. Skills (instruction packs for agents) install with one command. Every install comes from a tagged release (a named, fixed version), never from unreleased work. Self-contained installers that bring their own Node arrive with managed setup (guided automatic installation) in phase two.

**Consequence for you:** until phase two, an engineer can install pod-factory, but a founder cannot do it alone.

### One repository

Everything lives in one repository (the project's code store): the command-line tool, hooks, checks, release program, skills, templates, both add-ons and the documents. Orca's installer needs its add-on at the top level of a repository. So each release copies the Orca add-on onto its own branch (separate line of history) in the same repository.

**Consequence for you:** you get one version number, one release process and one place to report problems, at the cost of one extra release step that the health check verifies.

### Working without Orca, and with it

Without Orca, the coordinating agent runs in your own Claude Code session. It starts each builder, reviewer and QA agent as a helper agent with fresh memory and only the inputs recorded for it. Every builder works in its own copy of the code, in every mode. Stories run one at a time, unless the approved build plan marks them independent: no shared interface, no overlapping files. Finished stories join the main code one at a time. With Orca, the same four steps (start a story, wait for it, send a fix back, ask you) run on Orca's supervised workers, with a board and notifications. The factory detects Orca and picks the mode itself. Milestone zero runs one story at a time; parallel work is tried only after it passes.

**Consequence for you:** the whole workflow runs with Claude Code alone; Orca adds speed and visibility but never decides whether a rule passed.

### Where approvals and records live, and why a separate branch

Every approval, check result, lock, waiver (a visible, time-limited exception) and amendment (a human-written change record) is a record: a small, permanent file. Each holds who wrote it, when, and the fingerprints of exactly what it covers. Records live on their own branch, apart from the code. They are only ever added, never edited or deleted. A later record, such as a withdrawal, changes an earlier one's effect. Keeping records apart means a story's code changes can never alter an approval: the checks fail any story that touches the factory's own folder. Writing a record never touches your working files, and one file per record means two writers never collide. Automatic checks validate new records every few minutes. An invalid record is flagged and never counts. Test evidence is stored the same way, so the audit trail and metrics work offline. Drafts and notes live in a separate work area that joins the main code without review, because nothing there counts until a record binds it.

**Consequence for you:** each approval becomes a permanent, checkable entry that counts minutes after you give it, and only gates, merges and releases wait for that check.

### How the rules are enforced, and which layer decides

Seven layers enforce the rules. Two run on your machine: the hooks, and a local check before each commit (a saved change). Five run on the code host, GitHub in version one: automatic checks defined on the main code, protection of the main code, protection of the records branch, your required review of protected folders, and the list of checks every change must pass. Hooks act first. They deny an agent's edits to locked, protected or secret files, and shell commands (typed terminal commands) that plainly write to them. They also deny approval commands, starting a builder without an approved plan, a builder's own question prompt, and reads of declared secret files (files the project marks secret). A hook that cannot decide blocks writes to protected files and allows the rest. Hooks can be bypassed, so they are the early layer, not the deciding one. CI (the host's automatic checks) and GitHub's branch rules decide. Every deciding check is defined on the main code, so a change cannot rewrite the check that judges it. Checks that run a branch's code get read-only access and no secrets. Refusals at approval time sit in the factory's own commands, and CI re-checks them when it validates the record. The health check is itself a required check, so a missing layer blocks merges. Of the 157 acceptance criteria, CI and host rules decide 66, the factory's own commands 83, hooks alone 5, and an agent's review 2.

**Consequence for you:** whatever a hook misses, CI still refuses before merge, except the few acts only a hook can see, such as a file read or a question prompt.

### How tests are locked, and when they are written

Tests come before the code they check. Phase zero's and milestone zero's tests are written before gate 2 closes. Each later phase's tests arrive before its build plan, as an amendment you approve with the record of how they ran. Before approval, every test runs against placeholder code that does nothing. A test of new behavior must fail, for the reason it states. A test of a refusal must be paired with the action it guards. Existing tests must keep passing. Anything else blocks approval by name. On approval, the lock covers the tests, the test plan, test settings, test data and the exact test command. It also covers the exact versions of outside code, post-release checks, release scripts and the enforcement code (the checks themselves). So adding or upgrading outside code also needs your amendment. CI always runs the locked test command, never the branch's own. Builders may add their own tests. Those stay unlocked, and a simplicity reviewer flags any that do not test behavior that matters. The plan holds 207 tests: 98 show something works and 109 show it refuses, with milestone zero's ten first.

**Consequence for you:** after gate 2 no agent can change what "done" means; only you can, by an amendment whose before-and-after test descriptions you acknowledge.

### Budgets and the three modes

Each story has limits. By default: 5 million tokens, 8 hours of elapsed time, 3 fix rounds and 2 re-reviews; a build plan may be reopened 3 times. Size limits are only tripwires (a flag, not a stop): 10 files, 400 changed lines and two code-complexity caps. The project picks one of three modes. Hard-stop, the default, pauses an overrunning story and asks you. Tripwire flags every overrun and requires a written reason; nothing pauses. Off enforces and flags nothing. Estimates still show, usage is still recorded, and every packet and status view says budgets are off. You added the off mode, and it is already recorded as an amendment to the requirements. The mode changes only through an amendment you write. The numbers are generous first guesses. Milestone zero measures real usage, and the first retrospective proposes new defaults.

**Consequence for you:** in the default mode a runaway story stops and waits for you, but until the limits are calibrated they catch runaways, not modest overspending.

### Releases, and how credentials stay away from the model

First, CI builds the release package from the accepted code, records its fingerprint, and runs regression tests (old behavior still works) and a rollback rehearsal against it. Second, you sign off. Your sign-off fixes the exact code version, package, destination, settings, record-format upgrades, runbook and rollback plan. Third, the release program runs on your machine. It refuses to start if any of those differ, and halts if a rebuild does not match the approved fingerprint. It reads each credential from your keychain (your computer's password store) or the 1Password password manager. It hands each one only to the step that needs it and scrubs it from all output. You enter credentials through a hidden prompt. The release agent only asks the program to act, and never sees a credential. Every step is either safe to repeat or checks what already happened, so a crash resumes cleanly. After release, a smoke test (a quick post-release check) that cannot run is retried, then halts for you, and never rolls back. A wrong result, confirmed by a re-check, triggers your approved rollback at once. pod-factory's own first release ships before this program exists, by the same runbook run by hand from your terminal.

**Consequence for you:** you approve one exact package and its undo plan together; after that only a confirmed failure acts without you, and no model ever holds a deploy credential.

### Which stacks are supported

There are two ready-made stacks (the languages and tools) and a custom path. The web stack has a FastAPI (Python web framework) back end (the server side), a React with TypeScript (typed JavaScript) front end (the part users see) and a Postgres database. The tool stack is TypeScript on Node, for command-line tools, code libraries and services; pod-factory itself uses it. Each brings project rules, a folder layout, the test command the lock will pin, security basics, container files (portable run setups) and the CI setup. For anything else, the start step recommends a stack with a one-line reason, asks you before using it, and writes rules on the spot. A custom stack must name where its application code lives.

**Consequence for you:** a ready-made stack starts from tested rules; a custom stack works, but its rules are generated and reviewed at gate 2, not tested in advance.

## 4. What "passed" means

Every acceptance criterion is checked in one of three ways. The mapping covers all 157: 46 by a block, 108 by a recorded result, 2 by review, and 1 that the pending amendment makes checkable. An agent's claim that something passed never counts.

**Enforced by a block: the action is refused.**

- Before gate 1: no application code, and no skipped product question.
- Gates 1 to 3: no approval while a finding lacks a decision, a dismissal lacks your acknowledgment, or a user flow lacks a prototype screen. Approval is also refused while an enforcement layer is missing without a waiver, a test is unclassified or misclassified, a test description is unacknowledged, or, with no engineer, the technical review is missing. Design cannot start without a matching gate-1 approval and, in a project with existing code, an approved discovery. Withdrawing an approval reopens its gate.
- Locks: an agent's edit to a locked file is denied, and a change without your amendment fails before merge. The factory version a project relies on changes only by your amendment.
- Build: no story starts without your approved plan. A story is done only when its locked tests pass in CI. A change outside its allowed files fails. It cannot reach code review with a failing check, an unresolved blocking security finding, or QA without evidence. In hard-stop mode an overrun pauses it.
- Gate 4: no merge without your approval of that exact content, and any later change needs re-review. Only gate 4 can be delegated, only by written policy, and a delegated merge waits for your acknowledgment.
- Gate 5: no sign-off before the package is built and verified. No release unless everything matches your sign-off. A smoke test that cannot run never rolls back, and no recovery beyond the approved rollback runs without you.
- Always: no default answer between the coordinating agent and you, and no decision of its own without a category you granted. No approval command from an agent's session. No builder question prompt under Claude Code. No direct agent reads of declared secret files. Deploy credentials enter only by hidden prompt, keychain or password manager. No retrospective rule change without your approval.

**Measured and recorded: a result tied to the exact content, produced by tests, CI or the release program.**

- Each approval records fingerprints of exactly what you approved.
- Required parts exist: interview outputs, a discovery report with coverage from the test tool itself, and every design section. Each review packet has its four closing lines and a code-free summary.
- Every requirement has both kinds of tests, classified before approval, and CI ran the locked command.
- Code serving no requirement is reported by file. Each builder's inputs and handoff note are recorded. Fixes go back to the builder that made the change. Every decision is logged with its date, decider and outcome, and the coordinating agent's also carry the clause relied on.
- The budget mode and every active waiver show on every packet.
- Planted fake secrets appear in no output of the tested runs, and secrets are scrubbed before anything is written.
- Release evidence covers each checklist item, the rollback rehearsal and the security condition (every story's security checks clear). A confirmed failure rolls back on its own, and release state survives a crash.
- The status view, explanations, health check, offline metrics, activity log, audit view (every record, who, when), installs, Orca's board and managed setup each have tests.

**Only a review: a recorded opinion, never proof.**

- Whether a discovery report proposes refactoring (restructuring existing code), and whether a design question was already settled.
- The quality of every review: the four requirement reviewers, the gap check, security, simplicity and QA. The factory checks that each one reported, not that each was right.
- The security and simplicity reviewers must catch every planted problem in a fixed set, in each of three runs. Passing means that set passed, not that they are safe in general.
- Your click-through and your reading of each packet.

So "passed" at any gate means every block held, every recorded result exists for that exact content, and every review is on file. It never means a reviewer was right.

## 5. What version one does not defend against

Accepted risks:

- **A deliberately malicious agent.** An agent running as your computer user could forge an approval file. Version one guards against drift (agents straying from rules) and mistakes, not deliberate forgery. Signed approvals are optional and are checked when present.
- **Weak isolation.** Builders share your user account, your code history, any credentials already on your machine, and an open network. A compromised builder could tamper with the hooks, read your SSH keys (your server login keys) or query your keychain. Builders get no deploy credentials, and CI fails changes outside their scope. Reads beyond their supplied documents are logged, not blocked.
- **Agents other than Claude Code.** Codex (another coding agent) and others get no hooks. Only the commit check, CI and branch rules hold them, so protections that only a hook provides do not apply to them.
- **Secrets elsewhere.** Secrets outside the hidden prompt, the keychain, a password manager and declared secret files are protected only by pattern-based scrubbing. A password pasted into a chat is beyond any control.
- **Shell commands.** The hook that reads shell commands is a pattern match, not a real barrier. An indirect read, such as through a script, can pass. CI and the planted-secret tests are the proof.
- **Builders started another way.** A builder started outside the factory's own start step is not stopped at start. CI's check of its start record is the backstop.
- **Hosts and Orca.** Private projects on GitHub's free plan lack server-side branch protection (host rules guarding code), so they run under a visible waiver or upgrade. A compromised human account, code host or CI provider is outside what version one defends against. Orca is experimental and never enforces.

Deferred to version two or later:

- Sandboxes (sealed-off environments per story), and approvals that need a physical action.
- Production evals (tests of AI judgment) and monitoring of AI features, and mutation testing (testing the tests themselves).
- Feature flags (on-off switches for features) beyond a recipe, any hosted or multi-user service, Jira and Linear (work-tracking tools) sync, and polished design tooling.
- Orca's control room on remote machines, and a rich Orca side panel, which waits on Orca itself.
- Hooks for Codex, a candidate for version two.

Also left out of this design: ready-made CI setups for hosts other than GitHub, which adopters bring themselves, and a release program that runs in CI, a later option. Setting up hosting or cloud accounts is out of scope: releases go to hosting that already exists.

## 6. What still needs you before this design can be approved

1. **The wording amendment.** The test plan found ten criteria in the approved requirements that no test can check as written. The proposal rewords them, plus two more added after the mapping: twelve rewordings across ten of the twenty-four requirements. It says it neither widens nor narrows scope. In practice it swaps absolute words such as "never", "any point" and "every failure" for the listed, tested cases, and it names what stays outside the guarantee. For example, planted fake credentials must appear in none of the outputs of the scripted runs. Agents other than Claude Code are kept from opening their own question prompt by instruction only. Shell reads of secret files are blocked only by the pattern match. Applying it reopens gate 1 for those ten requirements only; the other fourteen stay approved. It is recorded as an amendment that fingerprints each old and new wording, and the mapping is then regenerated.
2. **The gate-2 approval itself.** It fixes the design, the test plan, the release runbook and rollback plan, and the mapping's fingerprint beside the requirements'. Before it, the documents require phase zero's and milestone zero's tests to be written and run against placeholder code, every test classified, and each regenerated test description acknowledged by you. Right after it, you write the lock.

The design specification also lists this summary and a verification pass as pending before gate 2; the documents do not describe that pass further. Nothing else is listed as pending.

## 7. Closing lines

- **What this design changes:** it turns the approved requirements into seven phases, eleven decision records, the interfaces, a threat review, a release runbook, 207 tests and a check for each of the 157 criteria. It changes one approved decision, by adding the off budget mode, which is already recorded, and it proposes one amendment, the rewording.
- **What was checked while writing it:** every listed document was read in full, with newer decisions applied over older text. The test counts, the 157 criteria by kind and by deciding layer, and each of the twenty-four requirements' place in a phase were recounted from the tables, and they match.
- **What remains uncertain:** seventeen assumptions about how Claude Code, GitHub, Orca and the keychain behave are not yet verified. Each is due in a named phase, and a failed check reopens what rests on it. The budget defaults are guesses until milestone zero. Some older passages still carry wording that later decisions replaced.
- **What approving it authorizes:** building to this design, starting with the hand-built kit under bootstrap records, then a milestone-zero build plan that returns to you at gate 3. It locks the tests and what they depend on. Any later design change reopens gate 2. It authorizes no release.
