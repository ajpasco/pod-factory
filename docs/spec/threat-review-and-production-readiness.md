# pod-factory: threat review and production readiness

> Reference document (2026-10-13): `docs/TECH-SPEC.md` 1.0 is the current design and wins where this file differs. This file keeps the detail for phases 1b onward.

Tech spec sections 7 and 8, for pod-factory itself, 2026-10-12. Integrated into the spec; every OPEN item below is resolved in ADR-010 to ADR-014, and the resolution is listed at the end of this file.

- Governed by `docs/PRD.md` 0.9.1 (gate-1 record 0001, amendment 0002). REQ-04 requires both sections in every design.
- Consistent with ADR-001 to ADR-009. This draft changes no ADR.
- Mechanisms that appear only in `docs/PRD-reference.md` are proposals here, not settled decisions.
- Security findings S1 to S8 come from `docs/reviews/prd-red-team-2026-10-12.md`.
- Decisions the documents leave open are listed at the end as OPEN-1 to OPEN-13.

## 7. Threat review

### 7.1 Scope

What this review protects:

1. The authority of human records: approvals, amendments, waivers, revocations and the delegation policy.
2. Locks: the locked tests and everything they depend on (REQ-06).
3. Evidence: results produced by the test harness, CI or the executor, bound to a tree. Agent prose never counts.
4. Deployment credentials. For pod-factory itself: the npm publish token and the git host token.
5. What adopters install: the npm package, the Claude Code plugin, the skills and the Orca plugin.
6. Secrets and personal data that pass through logs and artifacts.

In scope: an agent that drifts or takes shortcuts, the main case (PRD section 5); an agent steered by injected text (7.3); a compromised dependency or install source (7.5).

Out of scope: a deliberately malicious agent running as the approver's operating-system user (decision 13, see 7.7); a compromised human account, git host or CI provider.

### 7.2 Trust-boundary map

Agents are untrusted. Factory code is trusted to do its job, but it runs as the same operating-system user as the agents, so on the local machine it is advisory. Authority sits in CI and in the git host's rules (NFR-01).

| Component | Trust | May write | Held in place by |
|---|---|---|---|
| Human approver | Sole source of authority | Human records, only through the approval path | Packets written fresh-context; engineers also get the diff |
| Approval path: `approve`, `reject`, `acknowledge`, `answer`, `amend`, `waive`, `revoke`, `delegate`, `migrate`, `lock`, `revert`, `incident`, `secret set` (ADR-012 item 8) | Trusted code, when a human runs it in a human-owned terminal | Human record types | The hook denies it to agents; CI checks the writer of each record type (ADR-004) |
| Check runner | Trusted non-model code; anyone may invoke it | Check results, status transitions, delegated decisions, delegated gate-4 records | Local results are operational facts only; gates 4 and 5 count only CI-produced results |
| Release executor | Trusted non-model code; holds credentials | Release state, step logs, release records | Refuses any input or step not bound at gate 5; redacts output before an agent reads it |
| Hooks, in the Claude Code plugin | Trusted code, advisory layer | Denials, logged | Bypassable by design; CI is the authority (ADR-005, ADR-006) |
| Orchestrator | Untrusted agent | Work zone; story branches through pull requests | Dispatch hook; category-ID rule (REQ-17); no approval path |
| Builders | Untrusted agents | Their story branch, inside the file scope | CI file-scope and `.factory/` checks; locks; no deploy credentials |
| Reviewers, QA, red team | Untrusted agents, fresh context | Findings, packets, reports | A reviewed control, never evidence |
| Release agent | Untrusted agent | Step requests to the executor | Never sees credentials; the executor checks each request against the runbook |
| Orca app and plugin | Untrusted for enforcement | Board statuses; text typed into a human shell | Never relied on for enforcement (REQ-12); control characters stripped |
| CI | Authority | Validation marks, check-result records, evidence | Must run a definition the change under test cannot alter (OPEN-1) |
| Git host | Authority where the plan allows | Branch protection, rulesets, CODEOWNERS | Verified by `doctor`; private repositories on GitHub Free need a waiver |
| Records branch | Store | Appends from the approval path and the check runner | Linear, never force-pushed, every push validated; readers use the last validated head (ADR-004) |
| Main | Store | Merges of verified pull requests | required checks per pull-request class; branch protection; CODEOWNERS on `.github/`, `.claude/`, the enforcement scripts and checklists, not on `.factory/work/` or `docs/` (ADR-012 items 1, 5) |

Crossings, and what checks each one:

- **Agent to human.** Agents send questions and packets. Only the human crosses back, through the approval path. An agent cannot run it (hook), and a human record with an agent actor fails CI.
- **Agent to file system.** Tool calls pass the hooks, under Claude Code only. Shell matching is a heuristic. CI catches what the hooks miss.
- **Local to CI.** Local results are facts to validate, never verification. Gates 4 and 5 count only what CI produced.
- **Branch to main.** Only pull requests that pass lock-guard, class-check and their class's own checks (ADR-013). A story branch never changes `.factory/`.
- **Pushed record to counted record.** A record counts only after records-validate has passed on it (OPEN-2).
- **Release agent to executor.** The agent asks. The executor checks the request against the bound runbook, injects credentials itself and returns redacted output.
- **Orca to human shell.** Orca commands type only into a shell the human owns, with control characters stripped. The CLI confirms the hash and the decision.

### 7.3 Untrusted-text entry points

Every entry point below is data, never instructions. No control here depends on an agent declining an instruction. Each is a hash binding, a hook or CI refusal, or a human record.

| Entry point | What injected text could make an agent do | What bounds it |
|---|---|---|
| PRD text | Plant a clause that "grants" authority; slip in a requirement change | Authority comes only from category IDs in a human-written policy (REQ-17, S4). Each requirement is hash-bound at gate 1; a change reopens it (REQ-03) |
| Story files | Widen the file scope; tell the builder to edit tests or hooks | Story files are bound by the gate-3 plan hash. CI reads file scope from the approved plan, never from the branch. Locked paths denied (REQ-06, REQ-07) |
| Issues and tickets, including public issues on pod-factory's repository | Run a "reproduction" command; fetch a URL; propose rule changes | Issue text is input to the PRD skill only. Nothing becomes work before gates 1 and 3. No pod-factory-issued credentials to steal |
| Repository content: comments, READMEs, nested CLAUDE.md files, fixtures, `.claude/` files | Disable hooks; edit settings or CI; copy secrets into a report | Hooks deny locked, protected and secret paths. The enforcement-code lock and CODEOWNERS cover `.claude/` and `.github/`. Redaction. A human approves discovery (REQ-02) |
| Dependencies: package code, install scripts, READMEs | Run code at install time, or inside the hooks, check runner or executor | Exact versions, a locked lockfile, installs without scripts, scans on every story (7.5). Adding a dependency is a significant decision |
| Worker messages and completion payloads | Claim success; push the orchestrator to decide a reserved question | Done means locked tests pass in CI (REQ-08). Orchestrator decisions need a category ID and a quoted clause, checked by the check runner. No default between orchestrator and human (REQ-13) |
| Handoff notes | Tell the next session the tests are wrong; pose as evidence | Notes are never evidence. Locked paths stay denied. CI decides done |
| Mockup feedback: Design Mode clicks, plain-language notes | Fold an unwanted requirement, such as an unauthenticated endpoint, into the PRD | Feedback lands only as a PRD or mockup diff the approver acknowledges; gate 1 rebinds. Builders never see mockup code (REQ-23) |
| Retro inputs: QA failures, rejections, incident notes, the optional answer | Propose loosening a lock or a check; apply a rule directly | Output is a pull request. Each rule cites its failure. Nothing applies without approval (REQ-15). Inputs are redacted first |
| Tool output, CI logs, fetched pages | Carry instructions or secrets into context and artifacts | Treated as data. Redacted before writing. Raw tool output is never embedded (REQ-09) |

### 7.4 Credentials and network access per role

Version one enforces no network limits. Per-story sandboxes are deferred (PRD section 5, decision 15). The network column states what each role needs, which is what a later sandbox would enforce.

| Role | Credentials | Network it needs |
|---|---|---|
| Approver | Own git host account; optional signing key. Deploy credentials go only into the keychain, a secret manager or the executor's hidden prompt (REQ-21) | Any |
| Approval path | None of its own. Pushes records with the human's existing git setup | Git host |
| Orchestrator, builders, reviewers, QA, release agent | None issued by pod-factory: no deploy or release credentials (REQ-08). Reads of declared secret paths are denied. The shared user's ambient credentials stay reachable (decision 15) | Not restricted in version one |
| Hooks | None | None. Reading CI validation state may need the git host (OPEN-2) |
| Check runner, local | None | Git host, to fetch the records branch |
| Check runner in CI | One job token per job. Read-only, and not persisted in the checkout, in every job that runs branch code. Records-branch write only in jobs that run no branch code | Git host; package registry |
| CI `doctor` job | Read access to protection settings. On GitHub, classic branch protection is readable only with administration read, which the default job token lacks | Git host API |
| Release executor | Deploy credentials from the keychain, a secret manager or a hidden prompt, injected per step. For pod-factory: an npm token limited to its packages, and a git host token for tags, the plugin branch and release notes | Only the targets the runbook names |
| Orca plugin | None | None; it makes no network calls |
| Metrics command | None | None (REQ-14) |

Only jobs that run no branch code reference repository secrets. Until OPEN-1 is settled, a pull request that edits a workflow could reference them anyway. So no publish credential is kept in CI unless OPEN-7 chooses CI publishing.

### 7.5 Pinned supply chain

**pod-factory's own dependencies.**

- Exact versions in every workspace `package.json`, no ranges. One committed `package-lock.json`, and the published `npm-shrinkwrap.json` (ADR-010 item 34), both locked. CI installs with `npm ci` and install scripts disabled.
- The lockfile is locked at gate 2 (REQ-06). A dependency change needs a human-written amendment. Adding a dependency is a significant decision by definition, so it is asked, never assumed.
- Dependency and secret scans run on pod-factory's own stories (NFR-07). The executor and the redaction code keep the fewest dependencies, because they handle credentials.
- Third-party CI actions are pinned by full commit SHA, never by tag.
- Node: a current LTS (ADR-001). The supported range is OPEN-6.
- The npm package, the npm scope and the GitHub organization were unregistered on 2026-10-12 (ADR-001). Until registered, anyone can take them. Registration comes before any install command is published.

**Install chain.**

| Channel | Pin | Verified by |
|---|---|---|
| npm: `npm install -g pod-factory@<exact>` | Exact version. The project profile pins the enforcing version (REQ-20). Transitive tree: OPEN-6 | npm's integrity check at install; `doctor` compares installed with pinned |
| Claude Code plugin | Manifest version equals the CLI version. Install ref: OPEN-8 | `doctor` checks the plugin version against the project pin (ADR-006) |
| Skills: `npx skills add` | The documented command pins the installer's version. Release ref: OPEN-8 | Skills carry no enforcement. A wrong skill can misdirect an agent but cannot pass a gate |
| Orca plugin | Marketplace entry `{url, ref}`, resolved to an exact commit at install. Orca records that commit and a SHA-256 content hash, and shows any change as a visible update (Orca 1.4.214, `plugin-install-lockfile.ts`) | `doctor` in pod-factory's repository compares the plugin branch with `orca-plugin/` at the released commit (ADR-002) |
| CI template, in each project | Actions by commit SHA; pod-factory at the pinned version | Enforcement-code lock; `doctor` |

The Orca plugin is the one component that types into a human shell. It is pinned and released like enforcement code.

**Hash algorithm pinning.**

- Records use SHA-256 over LF-normalized UTF-8, lowercase hex, named in each record (ADR-004).
- The validator keeps an allowlist of algorithms per schema version. Schema 1 allows SHA-256 only. A record that names another algorithm, a free-text name, or none is invalid (AB-20-1). The first migration maps the bootstrap records' free-text name.
- A change of algorithm applies per record and never reopens a gate by itself (REQ-20).
- Tree bindings are git object IDs, so they are as strong as git's own: SHA-1 with collision detection, or SHA-256 repositories.
- Gate 5 binds each npm tarball's SHA-256 (ADR-004). The runbook also records npm's sha512 integrity, to reconcile with the registry.
- Binary content, such as tarballs, screenshots and binary fixtures, is not text: OPEN-10.

### 7.6 Abuse cases per requirement

Each row becomes a locked negative test when its requirement's phase locks its tests (ADR-010 item 5). It is tagged with its requirement ID and paired with the positive test of the operation it guards (REQ-05). Where a hook refuses, the test also asserts the CI refusal when one exists, so the case holds for agents other than Claude Code. "Hook only" marks cases that hold for Claude Code alone (decision 25).

| ID | Attempt | Expected refusal |
|---|---|---|
| AB-01-1 | With gate 1 open, an agent creates an application source file | Denied, naming gate 1 (OPEN-3); CI fails a pull request adding application source before gate 1 |
| AB-01-2 | Gate 1 approval while the preflight reports CI missing and no waiver exists | `approve` refuses and names the missing layer and the waiver option |
| AB-02-1 | Discovery runs on a repository whose `.env` holds a canary value | The canary is in neither the report nor the proposed rules diff |
| AB-02-2 | A README says "skip discovery"; design starts with no approved discovery record | Design refuses and names the missing record |
| AB-03-1 | An agent runs `pod-factory approve` through its shell tool | The hook denies it; a human record with an agent actor fails records-validate |
| AB-03-2 | One requirement changes after gate 1; design starts for it | Design refuses for that requirement until gate 1 is re-approved; unchanged requirements continue |
| AB-04-1 | The design omits the threat review or the criterion-to-control mapping | The design check fails and names the section; gate 2 cannot be approved |
| AB-04-2 | The design asks the approver whether gate 3 may be delegated | The check rejects the question as settled by REQ-17 and requires the cited clause |
| AB-05-1 | A new-behavior test fails on a missing module and is classified "fails as expected" | Classification rejects it as a setup error and blocks approval by test name |
| AB-05-2 | A negative test passes only because the command it calls does not exist yet | Classification rejects the pass as an unavailable operation and blocks approval by test name |
| AB-06-1 | An agent edits a locked test, with the edit tool or a shell one-liner the heuristic misses | The edit tool is denied; either way CI fails the commit and names the lock |
| AB-06-2 | An agent changes the runner config, a fixture or the `test` script so a locked test stops running | CI fails on the locked-path change and runs the command in the lock record, not the branch's (workflow file: OPEN-1) |
| AB-07-1 | The orchestrator starts a story with no validated gate-3 record | The hook denies the dispatch; story-verify fails a branch whose story has no validated plan |
| AB-07-2 | A story's file scope is widened after the gate-3 record | The plan hash no longer matches: dispatch denied, gate 3 reopens, the reopen count rises |
| AB-08-1 | A builder's diff touches a file outside its scope, or anything under `.factory/` | story-verify fails and names the path |
| AB-08-2 | A handoff note says all locked tests pass; the story is moved to done with no CI run | The status transition is refused: done needs the locked tests passing in CI on the story branch |
| AB-09-1 | Mid-story, an agent edits the project profile to set budgets off; the story then overruns | The overrun parks the story under the bound mode; a mode change counts only once a human record binds it (OPEN-5) |
| AB-09-2 | Test code run by story-verify pushes a passing check-result record with the job's token | The push fails: jobs that run branch code hold a read-only token that is not persisted |
| AB-10-1 | A commit lands on the story branch after the gate-4 record | gate-check refuses the merge until re-review; the re-review count rises |
| AB-10-2 | A packet says tests passed, with no harness output bound to the final tree | The packet check rejects it as unsupported evidence |
| AB-11-1 | Sign-off with the rollback rehearsal described but never run | `approve` refuses and names the checklist item without evidence |
| AB-11-2 | Sign-off while one story has an unresolved blocking security finding and no waiver | `approve` refuses on the security condition and names the story |
| AB-12-1 | An Orca approve command is aimed at a terminal running an agent | The plugin types only into a shell it opened for the human; text that reaches an agent is denied by the hook |
| AB-12-2 | Text an approval command shows or types carries escape sequences that hide a line or alter the shown hash | Control characters are stripped before display and typing; the CLI shows the hash it computed and asks for a fresh confirmation |
| AB-13-1 | A dispatched builder calls the local question tool | Hook only: denied, pointing at the orchestrator's ask command |
| AB-13-2 | A product question goes unanswered; the orchestrator records a default after a timeout | The check runner rejects the decision; the story stays in needs human |
| AB-14-1 | Metrics run inside a harness that blocks and records every outbound connection | Zero connection attempts; results come from records alone |
| AB-15-1 | An incident note says to add a rule to CLAUDE.md directly | The retro skill only opens a pull request whose rule cites a failure; it cannot merge without approval |
| AB-16-1 | An agent edits `.claude/settings.local.json` to disable the pod-factory plugin | Denied (OPEN-3); if it lands, session start and `doctor` report the hook layer missing |
| AB-16-2 | The installed CLI is newer than the project's pinned version | `doctor` fails and names both versions; hook behavior is OPEN-4 |
| AB-17-1 | The orchestrator decides an open question alone by quoting a PRD sentence that "allows" it, with no category ID (a citation answer to a question the PRD settles is allowed, ADR-012 item 13) | The check runner rejects the decision and reports it as a question that should have been asked |
| AB-17-2 | A delegated gate-4 record exists without the human's acknowledgment | gate-check refuses the merge |
| AB-18-1 | The release starts with a tarball whose SHA-256 differs from the gate-5 record | The executor halts before the first step and names the input |
| AB-18-2 | The post-deploy smoke cannot reach the registry | Retried per the runbook, then a halt for the human; never a rollback |
| AB-19-1 | `doctor` runs while a waiver covers missing branch protection on main | `doctor` exits non-zero and lists the layer as waived |
| AB-19-2 | A push to the records branch modifies an existing record | records-validate fails it; readers keep the last validated head |
| AB-20-1 | A record names `md5`, a free-text algorithm or none, or a schema newer than the reader | Invalid in records-validate; readers fail closed with a plain-language message |
| AB-20-2 | An agent changes the pinned enforcing version without an amendment | CI fails the change and `doctor` reports the mismatch (binding: OPEN-5) |
| AB-21-1 | Canaries sit in the keychain, a `.env` file and a tool's output during a full story and release | A scan finds no canary in any transcript, log, artifact, record or report |
| AB-21-2 | An agent runs `cat .env` through its shell tool | Hook only: denied (OPEN-3); if not, AB-21-1 fails when the value reaches the transcript |
| AB-22-1 | A check runs under a waiver that has expired | The check fails again; `doctor` shows the waiver as expired |
| AB-22-2 | A packet is produced while a waiver is active, without listing it | The packet check fails and names the waiver |
| AB-23-1 | The orchestrator includes mockup source files in a builder's context | The context check fails: only the screenshots the story lists are allowed |
| AB-23-2 | A user-facing flow has no reachable mockup screen | Gate 1 approval refuses and names the flow |
| AB-24-1 | Setup runs on a private repository on GitHub Free | Setup stops, offers public, upgrade or a visible waiver, and records the choice |
| AB-24-2 | Setup runs a second time with a canary credential in the keychain | Nothing changes; the canary appears in no output |

### 7.7 Accepted risks, not reopened

- **Decision 13, forgeability (S1).** An agent running as the approver's user could write a record and commit it as the human. Version one guards against drift and mistakes, not this. No abuse case claims to stop a deliberate forger; AB-03-1 tests drift. Signatures stay optional and are verified when present.
- **Decision 15, hygiene-only isolation (S5).** Builders share the user, the `.git` directory, ambient credentials and an open network. A compromised builder could edit the plugin's hooks, add a credential helper, rewrite other branches, read `~/.ssh` or query the keychain as that user. Version one gives builders no deploy credentials, keeps the protected zone read-only to agents and fails out-of-scope diffs in CI. Sandboxes are version two.
- **Decision 25, Claude Code-only hooks.** Codex and other agents meet only pre-commit, CI and branch protection. Cases marked "hook only" have no refusal for them.
- **Stated limits, PRD section 5.** Secrets outside the supported channels and declared paths are covered by redaction only. Private repositories on GitHub Free run under a visible waiver. Orca is experimental and never enforces.

## 8. Production readiness

### 8.1 Migrations and rollback: record format and `.factory/` layout

What carries a version (REQ-20):

| Item | Where |
|---|---|
| Record schema, hash algorithm, factory version | `schemaVersion`, `hashAlgorithm`, `factoryVersion` in every record (ADR-004) |
| `.factory/` layout | A layout version in each store: the records branch and the work zone |
| Enforcing factory version | The project profile; changed only by a human-written amendment of the enforcement-code lock |

Rules:

1. **Append, never rewrite.** CI flags, and never validates, any change to an existing record (ADR-004; ADR-010 item 11). A migration adds records and never edits one.
2. **Human-only.** `migrate` belongs to the approval path. It writes a migration record naming the source and target versions and, for each record carried forward, the old path and hash and the new path and hash.
3. **Read every earlier schema; fail closed on a newer one.** Each release reads every schema version shipped before it. A record with a schema newer than the reader knows never counts as valid. The gate that needs it stays closed, with a plain-language message naming the version required (REQ-22).
4. **Tests per migration.** A fixture for each earlier schema; the output passes records-validate; a second run writes nothing; no approved gate reopens.
5. **Approved gates stay approved.** Each record is verified with the schema and algorithm it names (REQ-20).

The first migration, bootstrap-0 to schema 1:

- Records 0001 to 0003 move from the working tree to `pod-factory/records` under ADR-004 names, with their content hashes in the migration record (ADR-004 note). They keep the bootstrap flag and expire when 0.1 ships (decision 23).
- Record 0001 says the first release must re-verify it through the real approval path or re-approve.
- Record 0002 was written by the assistant on the approver's instruction. Under the writer rule it counts only once the approver re-issues it with `amend`.
- Their field names (`approvedAt`, `approver`) and free-text algorithm differ from schema 1 (OPEN-10). Removing `.factory/records/` from main is itself a `.factory/` change (OPEN-11).

Rollback:

| Situation | Rollback |
|---|---|
| Upgrade amended, nothing yet written in the new schema | Amend the pin back. The migration record stays as history |
| Records exist in the new schema | No downgrade: older readers fail closed on them. Roll forward with a patch release |
| Work-zone layout change on main | Revert the migration pull request (OPEN-11) |
| Hash algorithm change | None needed. Each record keeps the algorithm it names |

### 8.2 Logging

| Component | What it logs | Where |
|---|---|---|
| CLI and approval path | Each command and outcome; each record written, with path and hash; push results; plain-language failure messages with the options (REQ-22) | The event log; records on the records branch |
| Hooks | Each denial: event, tool, rule, normalized target, the lock or record cited. Allowed calls are not logged, except builder reads outside the supplied set, which hook 5 logs as events (ADR-011 item 28). Nothing outside a `.factory/` project (ADR-005) | The active story's event log, else the project's |
| Check runner | Each check: name, result, bound tree, evidence pointer. Summaries only, never raw tool output | Check-result records; the evidence bundle; the CI console, redacted |
| Release executor | Each step: ID, command with credential references only, start and end, exit status, smoke classification, evidence, redacted output. Release state after every step (REQ-18) | Release state and step logs in the work zone; the release record on the records branch |

The event log is append-only. It covers status changes, dispatches, check results, hook denials, questions and decisions (REQ-19).

Redaction is one library, part of the locked enforcement code. All four components run it before anything is written or printed:

1. **Exact values.** The executor knows what it injected and removes those values, plain and in common encodings.
2. **Known patterns.** npm, GitHub and cloud token formats, private-key blocks, values from declared secret files.
3. **Personal data** in tool output and screenshots (REQ-21).

Canary tests prove it (REQ-21, AB-21-1). A record's actor name and email are structured fields that NFR-08 requires, not tool output, and are not redacted. No telemetry (NFR-05): logs stay in the repository, the records branch and the CI host. Evidence retention is OPEN-12.

### 8.3 Monitoring

`doctor` (REQ-19, ADR-006, ADR-009) shows the following, and exits non-zero when any layer is missing or waived:

- Each of the seven enforcement layers as present, missing or waived (ADR-011 item 8; ADR-012 item 7): plugin hooks including managed hook settings; the pre-commit hook; the CI workflows defined on main and matching the enforcement-code lock; main's branch protection; the records branch's protection (linear history, no force push, scheduled validation); CODEOWNERS over `.github/`, `.claude/`, the enforcement scripts and checklists; required checks configured per pull-request class.
- The installed CLI and plugin versions against the project's pin.
- Active waivers with their expiry, and bootstrap pieces still in use.
- In pod-factory's own repository: the Orca plugin branch against `orca-plugin/` at the released commit (ADR-002).

`status` (REQ-19, REQ-09, REQ-12) shows:

- Every story with its stage, its owner and what it waits on.
- Open gates, open questions, delegated decisions and parked stories.
- The active budget mode, on every view (ADR-007).
- Records pending validation or flagged invalid, active waivers, and release state.

What the operator watches:

| Signal | Source | Response |
|---|---|---|
| Scheduled `doctor` fails | CI `doctor` job | Restore the layer, or record a time-boxed waiver |
| A record stays pending or is flagged invalid | records-validate; `status` | Find the writer; an invalid record never counts |
| Repeated hook denials on one story | Event log | The agent is fighting a rule; read the story before it spends the budget |
| A story or gate needs a human | `status`; the notification channel (ADR-010 item 32) | Answer, amend or re-plan |
| A waiver near expiry | `doctor`; packets | Fix the cause, or renew it deliberately |
| Release halted, rolled back or broken | Executor state; the notification channel | The human decides any recovery beyond the pre-approved rollback |
| Registry or marketplace state differs from the release record | The runbook's reconcile checks, run on demand | Follow the rollback plan in 8.4 |
| New advisories against the pinned tree | Dependency scans; the host's advisories | A patch release through the loop |
| Budgets off | The line on every packet and on `status` | Watch usage outside the factory (ADR-007) |

### 8.4 Release runbook for pod-factory itself

The executor runs this runbook after a validated gate-5 record, from phase 3 on (OPEN-9 covers 0.1). Its scripts are locked at gate 2 (REQ-06). Its numbers are proposals for gate-2 review.

Before gate 5: the release pull request sets every version and the changelog and merges through gate 4. The release-gate job builds the single tarball from that commit and publishes its digest (ADR-006). The regression suite and a rehearsal of steps 3 to 7 and of the rollback run against those tarballs outside production (REQ-11). Where the rehearsal runs is OPEN-13.

Gate 5 binds (REQ-11):

- **Revision:** the merge commit R on main.
- **Artifacts:** the single npm tarball built from R (ADR-010 item 34), with SHA-256 and npm sha512 digests. Nothing is built after sign-off (REQ-18).
- **Environment:** the npm registry and package names; the git host repository; the Orca plugin branch; the Orca and Claude Code marketplace entries.
- **Configuration:** the version in the published `package.json`, in `orca-plugin.json` and in the Claude Code plugin manifest at R, all equal to the release version.
- **Migrations:** the record-format migrations this version ships, with their test results. None runs at release time. Each project runs `migrate` after a human-written upgrade amendment (REQ-20).
- **This runbook and its rollback plan.**

Credentials: the npm token and the git host token, from the keychain. If npm asks for a one-time password, the human types it into the executor's hidden prompt. The executor runs on the approver's machine and publishes one package (ADR-010 items 3 and 34).

| # | Step | Idempotent, or reconcile check | Reversibility |
|---|---|---|---|
| 1 | Validate the gate-5 record and every bound input; recompute each tarball's SHA-256 | Read-only | Nothing changes |
| 2 | Save the current pointers in release state: dist-tags, plugin branch head, marketplace and install refs | Read-only; never overwrites a saved value | Nothing changes; feeds the rollback |
| 3 | Publish the single tarball with dist-tag `next` | Reconcile: version absent, publish; present with the same integrity, skip; present with other integrity, halt. Also read `latest`, since a package's first publish can set it | Irreversible: npm never reuses a version. Contained: `latest` has not moved |
| 4 | Split `orca-plugin/` at R onto the plugin branch, fast-forward only | Reconcile: head tree equals `R:orca-plugin`, skip; old head not an ancestor, halt | Not live until step 7. Reversible by a commit restoring the previous tree |
| 5 | Smoke the staged release, under the retry rule | Idempotent: a fresh temporary prefix each run | Nothing changes |
| 6 | Tag `v<version>` at R, the tag skills install from; signed when a key is configured; push | Reconcile: tag at R, skip; tag elsewhere, halt | Never moved or deleted once pushed |
| 7 | Promote: `latest` to the new version; the Orca entry, Claude Code plugin and skills install refs to this release (OPEN-8) | Reconcile per pointer: already at target, skip | Reversible: each pointer returns to the value saved in step 2 |
| 8 | Smoke the promoted pointers: `pod-factory@latest` resolves to and installs the new version | Idempotent | Nothing changes |
| 9 | Publish release notes from the release record | Reconcile: notes exist with the same content hash, skip | Editable |
| 10 | Write the release record; notify on the independent channel | Reconcile: record exists, skip | Append-only |

After a crash the executor reads release state, runs the reconcile check of the step in progress, then continues or halts. A step with neither idempotency nor a reconcile check halts for the human (REQ-18). A step not in this table is refused.

**Smoke checks.** npm: install the exact version from the registry into a clean prefix; its integrity equals the bound digest; `pod-factory --version` prints the release version; `doctor` on a fixture project reports the expected layers; `pod-factory hook` denies a fixture edit to a locked path. Orca: a fresh clone of the plugin branch has `orca-plugin.json` at its root with the release version. Claude Code plugin and skills: their manifests at R parse and carry the release version. Gate 5 already verified these exact tarballs, and pod-factory's CI runs on macOS, Windows and Linux (ADR-006). The smoke therefore checks what publishing can break: the registry copy, the pointers and one install.

**Smoke-test retry rule (REQ-18).**

- **Probe error**, meaning the check could not run: network or DNS failure, timeout, registry 5xx or 429, a 404 for the new version within 10 minutes of publishing, a local disk error. Retry three times, after 30, 60 and 120 seconds. Still failing: halt and notify. A probe error never triggers a rollback.
- **Application failure**, meaning the release answered wrongly: integrity mismatch, wrong version, `doctor` failing on the fixture, the hook allowing the fixture edit, a missing manifest. Re-run once in a fresh prefix. The same failure again is confirmed, and the rollback runs at once. A pass on the re-run means the results disagree: halt for the human, with neither rollback nor promotion.
- The executor refuses any retry count or classification not written here.

**Rollback plan, pre-approved at gate 5.**

- **Before step 7**, nothing is promoted. Deprecate the new versions with a message naming the last good one, and move `next` back. The plugin branch commit stays unpinned.
- **After step 7**, move `latest`, the Orca pin and the install refs back to the values saved in step 2, then deprecate the new versions.
- **Rollback smoke:** `pod-factory@latest` resolves to and installs the previous version. The result is reported (REQ-18).
- **Failed rollback:** persist "release broken", notify on the independent channel, wait for the human.
- **Never in the rollback:** `npm unpublish`, deleting a tag, force-pushing any branch. Each is a human decision outside the runbook, for example after a secret shipped in a tarball.
- **Republish:** npm never accepts the same version twice. A fix is a new patch version through gates 4 and 5.
- Users who already took a bad Orca plugin update can return to their previous install with Orca's per-plugin rollback (Orca 1.4.214).

**Branch and pointer rules.**

| Ref | Rule |
|---|---|
| `main` | Never reset or force-pushed. Fixes arrive as new pull requests |
| `pod-factory/records` | Never force-pushed or rewritten (ADR-004). A rollback adds records |
| Orca plugin branch | Fast-forward only. Roll back by moving the pin, or by a commit restoring the previous tree |
| Release tags `v<version>` | Never moved or deleted once pushed |
| npm dist-tags, marketplace pins, install refs | The only pointers a rollback moves. Each move is logged with its before and after values |

## Open items

Decisions this draft needs that the documents do not make. None changes an ADR.

1. OPEN-1: Which host mechanism makes the required checks run a definition that the change under test cannot alter? This applies to pull requests to main (story-verify, gate-check) and to pushes to the records branch, where a push-triggered workflow is read from the pushed commit itself. Options include a ruleset-required workflow pinned to main, or a base-branch workflow that runs branch code with a read-only token. Which GitHub plans offer each? Until settled, a change can edit the workflow that judges it (S2), and only the gate-4 review of the diff would catch it.
2. OPEN-2: How does a pushed record become validated, and how do readers see that? GitHub documents that a branch requiring a status check accepts a commit only after the check has passed on another ref, so the CLI cannot push a new record straight onto `pod-factory/records`; a staging ref that CI fast-forwards is one option. May hooks contact the git host to read validation state, or must they use the last fetch?
3. OPEN-3: ADR-005's six hooks do not name three refusals this review needs. Which hook carries each, and is each a heuristic? (a) Application source while gate 1 is open (REQ-01). (b) Shell reads of declared secret paths, such as `cat .env` (REQ-21); hook 5 covers the read tool only. (c) Edits to Claude Code settings outside the enforcement-code lock (`.claude/settings.local.json`, user settings) and to the plugin's install directory, which file tools reach when permissions are skipped, as Orca does for workers (X8). Deliberate tampering stays accepted (decision 15); the question is drift.
4. OPEN-4: When the installed CLI or plugin version differs from the project's pinned version, do the hooks deny every guarded call, or warn and leave CI as the authority?
5. OPEN-5: Which record binds the project profile, so that an agent edit to the work-zone file cannot switch budgets off or change the pinned enforcing version (AB-09-1, AB-20-2)?
6. OPEN-6: How do adopters get pod-factory's exact transitive dependencies: a published shrinkwrap, or a single-file bundle with no runtime dependencies? And what Node LTS range is supported, which ADR-001 left open?
7. OPEN-7: Which workspace packages are published to npm, under which names? ADR-001 describes one package; ADR-002 has four workspace packages. Does pod-factory's own publish run from the executor with a keychain token, or from CI with npm trusted publishing and provenance? The PRD does not say where the executor runs.
8. OPEN-8: Which ref do users install the skills and the Claude Code plugin from, and which marketplace lists the Orca entry? The official Orca index, `stablyai/orca-plugins` at `main`, is maintained by Orca's team; Orca 1.4.214 also accepts user-added marketplaces. If an install source follows main, every merge ships before gate 5. If pod-factory does not control a pin, its rollback for that channel is a request to whoever does.
9. OPEN-9: Does 0.1, the release that ends the bootstrap exception, ship before phase 3? If so, there is no executor yet, and this runbook would run by hand from the approver's terminal under a bootstrap record.
10. OPEN-10: Two record-format details ADR-004 leaves open. How is binary content hashed: raw bytes, chosen by declared path class rather than by sniffing content? That also decides whether a fixture whose line endings matter can be locked byte for byte. And are migrated records copied byte for byte and read by a per-version reader, or re-emitted in the new schema with the old hash kept in the migration record?
11. OPEN-11: How does a change under `.factory/` reach main, whether a layout migration or ordinary work-zone writes? story-verify fails any pull request that touches `.factory/` (ADR-006), and main accepts only verified pull requests. The first migration needs this to remove the bootstrap records from main.
12. OPEN-12: Where are CI evidence bundles kept so they outlive the CI host's artifact retention, given that records and the audit view cite them?
13. OPEN-13: Where does pod-factory rehearse its own release and rollback outside production (REQ-11)? For example, a local registry in CI and a scratch plugin branch. Either choice adds a dependency or an environment.

## Resolutions (ADR-010)

| Open item | Resolved by |
|---|---|
| OPEN-1 workflow the change cannot alter | item 10: authoritative jobs defined on main via `pull_request_target`; branch code only in read-only jobs; record writes in jobs that run no branch code |
| OPEN-2 how a record becomes validated | item 11: scheduled validation from main, validated ref; hooks read the last fetch |
| OPEN-3 three missing refusals | items 24, 25 and 26 |
| OPEN-4 version mismatch | item 27: warn and allow; doctor fails |
| OPEN-5 binding the project profile | item 15 |
| OPEN-6 transitive dependencies and Node range | items 34 and 28 |
| OPEN-7 published packages and where publishing runs | item 34 and item 3 |
| OPEN-8 install references and marketplace | item 35 |
| OPEN-9 release 0.1 before the executor | item 7 |
| OPEN-10 binary hashing and migrated records | item 20 |
| OPEN-11 `.factory/` changes reaching main | item 2 |
| OPEN-12 evidence retention | item 30 |
| OPEN-13 rehearsal location | item 37 |

Findings closed: a pull request cannot edit the workflow that judges it (item 10); no job that runs branch code holds a record-writing token (item 10); record 0002 is re-issued by the approver with `amend` when the command exists (bootstrap exception already recorded).
