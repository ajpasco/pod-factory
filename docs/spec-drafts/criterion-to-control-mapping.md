# Criterion-to-control mapping

Draft for `docs/TECH-SPEC.md` section 11, assignment D, 2026-10-12. Status: draft, not reviewed, not approved. It maps every acceptance criterion in `docs/PRD.md` 0.9.1 section 4 to one control kind, as the PRD's section 4 introduction and REQ-04 require. Sources: the PRD (governing), the nine accepted ADRs in `docs/adr/`, `docs/TECH-SPEC.md` 0.1, and `docs/PRD-reference.md` (proposed mechanisms, not binding on its own). Nothing here changes a criterion's meaning or settles a question the documents leave open; those are marked OPEN. Counts are at the end.

## How to read the tables

- **ID** `C-<req>-<n>`: criteria in the order they appear in the PRD paragraph for that requirement. A sentence with several checkable statements is split. A list inside one statement stays one row when one mechanism checks all of it, and is split where its parts have different mechanisms or coverage.
- **Kind** (PRD §4): **Enforced**, a mechanical block; **Measured**, a recorded result against a hash; **Reviewed**, an agent's or human's recorded assessment, never proof. Rule used: a criterion saying something is blocked, denied, refused, fails or cannot happen is Enforced; one saying something exists, contains, binds, shows, is recorded or behaves a stated way is Measured; one whose condition needs judgment is Reviewed. A product property with no operational block or record is Measured by a **factory test**: a locked test in pod-factory's own eval plan, run by story-verify on pod-factory's CI and bound to the tested tree. **Unmapped** means not mappable as written (list 1).
- **Mechanism** names its source. `h1` to `h6` are ADR-005's six hooks. CI jobs are ADR-006's `records-validate`, `story-verify`, `gate-check`, `release-gate` and `doctor`, plus the advisory `precommit`. `ref §5 <term>` is a definition in the reference; `ref REQ-xx bN` is acceptance bullet N of that requirement in reference section 6. "approve refuses" means a precondition inside the approval-path command.
- **Authoritative**: the layer whose block or record decides when layers disagree. CI and host rules are authoritative where they can act (ADR-005, ADR-006, reference NFR-01); hooks and precommit are advisory. A hook is authoritative only where no CI or host control can exist because the act never becomes a commit: reads, questions, dispatch. "command" covers the CLI, the check runner and the release executor.
- **Notes**: what the mechanism leaves uncovered. `Oxx` is an OPEN item, `Vxx` a platform capability to verify (list 3), `L1` and `L2` are lists 1 and 2; "(part)" means ADRs cover the rest of the mechanism.

## Cross-cutting findings

1. No ADR-006 job checks gate 1 to 3 artifacts (O1). Those criteria rest on refusals inside the approve command, which CI re-checks only if records-validate evaluates transition preconditions (O2). CI is authoritative today only for records pushes, story pull requests, merge and release.
2. "Refuses to start" criteria for design and dispatch can be blocked only at a CLI transition, an approval or a hooked tool call. An agent can still write work-zone text, which binds nothing (ref §5 work zone).
3. Fresh-context provenance (C-04-9, C-05-3, C-10-2) has no mechanism in either document. Under ADR-003 the orchestrator, itself an agent, starts every reviewer, so provenance is an agent claim unless a hook captures it (V6).
4. The reference's hook denial of the approval-path commands to agents (ref §5 approval path) is not among ADR-005's six hooks (C-03-1, C-12-5).
5. REQ-18 and the credential channels of REQ-21 rest on reference text only; the release executor and the CLI command family are still pending (TECH-SPEC §4.6, O10).
6. Every "CI-validated record" depends on how GitHub treats direct pushes to a branch that requires a status check (V10), and every pull-request block depends on the required check running the base branch's workflow, not the pull request's (V11).

## Mapping by requirement

### REQ-01 Start

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-01-1 | A PRD draft exists after the interview | Measured | start-completion check: PRD skeleton with problem, product, and requirements carrying user, flow and criteria (ref REQ-01 b1) | command | L2; the check point is the transition out of start (O2) |
| C-01-2 | A project profile exists after the interview | Measured | same check; profile fields per ref §5 project profile | command | L2; profile schema not written (O9) |
| C-01-3 | Project rules exist after the interview | Measured | same check; rules generated from the preset template (ADR-008) | command | L2; required contents (stack, structure, security, "done" rule) are ref REQ-01 b2 only; custom stacks generate rules on the fly (ADR-008) |
| C-01-4 | Product questions cannot be skipped | Enforced | start completion refuses while a product question has no answer record against its hash (ref REQ-01 b4; ref §5 approval path, `answer`) | command | L2; if the start skill writes answers itself, a skip is invisible (O11) |
| C-01-5 | Technical defaults are recorded | Measured | each accepted default is marked as a default in the profile or decision record (ref REQ-01 b4) | command | L2; a marker written by the skill is an agent claim (O11) |
| C-01-6 | Creating application code while gate 1 is open is blocked | Enforced | none selected: h1 and h2 cover locked, protected and secret paths only; no ADR-006 job sees a pre-gate-1 pull request | CI/host rule (none yet) | L2 (no mechanism in either document); application paths O12; O3; a hook-only block would be advisory; V1 |
| C-01-7 | The preflight names every enforcement layer as present or missing | Measured | preflight report written as a check result (ref REQ-01 flow 2); nearest ADR mechanism is doctor's layer report (ADR-009 item 6, ADR-006 doctor) | command | L2; layer list O4; preflight versus doctor O5 |
| C-01-8 | Gate 1 cannot close with a layer missing unless a waiver is recorded | Enforced | approve refuses gate 1 unless the latest preflight shows every layer present or each missing one under an active waiver (ref REQ-01 b5, ref REQ-22 b3) | command | L2; waiver record O9; re-check O2; pod-factory's own gate 1 closed under bootstrap (record 0001) |

### REQ-02 Discover

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-02-1 | The discovery report has conventions | Measured | section-presence check on the report (ref REQ-02 b1) | command | L2; accuracy not checked; O1, O6 |
| C-02-2 | The report has measured coverage | Measured | coverage taken from the test tool's output, bound by hash as evidence; a repo without tests is reported as such (ref REQ-02 b1, b5; ref §5 evidence) | command | L2; a number typed by an agent is a claim, so the check runner must run the tool |
| C-02-3 | The report has risky areas | Measured | section-presence check (ref REQ-02 b1; flow 2 lists security-sensitive paths, untested areas, oversized files) | command | L2; completeness of the list is not checked |
| C-02-4 | The report has vulnerable dependencies | Measured | dependency-scan output attached as evidence, using the scanner story-verify runs (ADR-006) | command | L2: reusing the ADR-006 scanner here is a selection the spec must make; scanner not chosen |
| C-02-5 | The report has proposed rules | Measured | section-presence check; proposals as a rules diff (ref REQ-02 b1) | command | L2 |
| C-02-6 | The report contains no secrets | Measured | secret scan over the report and rules diff (story-verify scanner, ADR-006), after redaction on write (C-09-11) | CI/host rule (story-verify) | L2; pattern-based only (PRD §5); runs only if the report reaches main by pull request (O3); h5 keeps secret-file contents out; V11 |
| C-02-7 | The report proposes no refactoring | Reviewed | fresh-context review flags any refactoring proposal as out of scope (ref REQ-02 b3) | agent review | L2; judgment, never proof; reviewer not named (O29) |
| C-02-8 | Discovery is approved before design in an existing codebase | Enforced | transition into design refused without a discovery approval record (ref REQ-02 b4) | command | L2; the reference's "design skill refuses" is advisory; record type O9; "existing codebase" test O13; O2 |

### REQ-03 Gate 1

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-03-1 | Gate-1 approval is given through the approval path | Enforced | `approve` writes the record (ADR-009 item 1); records-validate rejects a record that breaks the writer rule for its type (ADR-004, ADR-006) | CI/host rule (records-validate) | L2 (part): hook denial of the approval commands to agents is ref §5 only; git identity is self-asserted and forgery is out of scope (PRD §5); V9, V10 |
| C-03-2 | The approval binds the PRD by requirement | Measured | gate-1 record `binds` the PRD hash and one hash per requirement ID (ADR-004; ref REQ-03 b1), schema checked by records-validate | CI/host rule (records-validate) | L2 (part): per-requirement hashing O32; records 0001 and 0002 already use this shape; V10 |
| C-03-3 | The approval binds the mockup | Measured | gate-1 record binds the hash of a mockup snapshot taken at approval (ref REQ-03 b2, ref REQ-23 flow 5) | CI/host rule (records-validate) | L2; only for products with a UI, and pod-factory has none (TECH-SPEC §1); snapshot O18; V10 |
| C-03-4 | Design refuses to start without a matching record | Enforced | transition into design refused unless a validated gate-1 record's PRD and mockup hashes match the current ones (ref REQ-03 b3) | command | L2; agents can still draft design text, which binds nothing; gate-2 approve should re-check; O2; V10 |
| C-03-5 | Every red-team role reports findings or "none found" | Measured | structural check: one section per role, each with findings or the literal "none found"; an empty review is rejected (ref REQ-03 b5) | command | L2; PRD §2 names four roles unconditionally where the reference made feasibility conditional (PRD governs); finding quality not checked; O1 |
| C-03-6 | Undispositioned findings block approval | Enforced | approve refuses gate 1 while a finding lacks fixed, deferred or dismissed with a reason (ref REQ-03 b6) | command | L2; storage of findings and dispositions O14; O2 |
| C-03-7 | Unacknowledged dismissals block approval | Enforced | approve refuses gate 1 while a dismissal lacks an `acknowledge` record (ref REQ-03 b6; ref §5 approval path) | command | L2; acknowledgment record type O9; O2 |
| C-03-8 | A revocation reopens the gate | Enforced | `revoke` record invalidates the gate-1 record; later gates are suspended until re-approved and restored if hashes match (ref §5 invalidation graph; ref REQ-22 b1) | command | L2; no ADR computes the invalidation graph; gate-check reads validated records only |

### REQ-04 Design

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-04-1 | The design has every required section | Measured | section-presence check over the design hash; a missing section fails (ref REQ-04 b1) | command | L2; section list not pinned (O6); PRD §2 names phases, interfaces, non-goals, budgets, threat review, production readiness with runbook; O1 |
| C-04-2 | The required sections include the threat review | Measured | same check plus the five sub-items of ref REQ-04 b3 | command | L2; sub-items are reference-only; TECH-SPEC §7 pending; adequacy would be Reviewed and is not required |
| C-04-3 | The required sections include production readiness | Measured | same check plus the sub-items of ref REQ-04 b4 (migrations and rollback, logging and monitoring, runbook, smoke retry rule, reversibility per step) | command | L2; TECH-SPEC §8 pending |
| C-04-4 | The required sections include the criterion-to-control mapping | Measured | check that every PRD §4 criterion ID appears once with one kind (ref REQ-04 b2; this draft) | command | L2; criterion IDs exist only in this draft (O7); an Unmapped row fails the check until list 1 is resolved |
| C-04-5 | Every requirement appears in a phase | Measured | check that every requirement ID appears in the phase table (ref REQ-04 b5) | command | L2; TECH-SPEC §2 lists all 24 today |
| C-04-6 | Every significant decision records who decided: the approver, a delegated category, a recorded default or a cited clause | Measured | decision-record field check; a decision with none of the four fails (ref REQ-04 b6, b7) | command | L2; ADR "Decided by" lines are prose and need a fixed field; whether every significant decision (ref §5) has a record is not checked |
| C-04-7 | A design question about something the PRD settles is rejected | Reviewed | fresh-context review compares each asked question with the PRD, profile and rules (ref REQ-04 b8) | agent review | L2; "settles" is a judgment; whether a rejection blocks gate 2 is O19; reviewer O29 |
| C-04-8 | Without an engineer on the project, a technical review is attached before approval | Enforced | approve refuses gate 2 when the profile has no Engineer and no technical-review report is bound (ref REQ-04 b12) | command | L2; O2; pod-factory has an Engineer (TECH-SPEC §1), so first exercised on the second project |
| C-04-9 | That technical review is by a fresh-context agent | Measured | provenance record captured when the reviewer starts: inputs by hash, no inherited context | hook | L2 (no mechanism in either document); ADR-003 has the orchestrator start reviewers; V6 |

### REQ-05 Eval plan

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-05-1 | Every requirement has a positive test tagged with its ID | Measured | tag scan of the eval plan and test files (ref REQ-05 b1) | command | L2; tag syntax not chosen; O1 |
| C-05-2 | Every requirement has a negative test tagged with its ID | Measured | same scan (ref REQ-05 b1) | command | L2; abuse cases from the threat review are among them (ref REQ-05 flow 1) |
| C-05-3 | Each test has a regenerated plain-English rendering | Measured | rendering file per test ID, regenerated by a fresh-context agent from the test and bound to the test hash (ref REQ-05 b4, flow 4) | command | L2; regeneration provenance has no mechanism (V6); a rendering does not prove the test right |
| C-05-4 | The approver acknowledges the regenerated renderings | Enforced | approve refuses gate 2 without `acknowledge` records over the rendering hashes (ref REQ-05 b4, flow 5) | command | L2; the PRD asks for acknowledgment of every rendering, ref b4 stresses mismatches; O2 |
| C-05-5 | Before approval each test is classified | Measured | the harness runs the suite on the current tree and writes one classification per test (ref REQ-05 b2, flow 6) | CI/host rule (no job yet) | L2; PRD §4 requires harness or CI output, and no ADR-006 job runs it (O1) |
| C-05-6 | New-behavior tests fail for the expected reason | Measured | classifier accepts only an assertion failure matching the test's declared reason; setup errors and skips are rejected (ref REQ-05 b2) | CI/host rule (no job yet) | L2; declared-reason signature O15 |
| C-05-7 | Negative tests are paired with the positive operation they guard | Measured | pairing field in the eval plan, checked for every negative or security test (ref REQ-05 b2) | command | L2 |
| C-05-8 | The pair demonstrates the missing behavior | Measured | classifier applies the two cases of ref REQ-05 b2 (new operation; existing operation lacking a rule) | CI/host rule (no job yet) | L2; "a real rejection, not an unavailable operation" needs a rejection signature (O15) |
| C-05-9 | Existing tests keep their baseline | Measured | classification compares each existing test with its recorded baseline (ref REQ-05 b2) | CI/host rule (no job yet) | L2; baseline record O9, O15 |
| C-05-10 | Any other outcome blocks approval by name | Enforced | approve refuses gate 2 while any test is outside the allowed classes, naming each (ref REQ-05 b2) | command | L2; O2 |
| C-05-11 | AI features carry safety thresholds of 100 percent of their defined scenario set | Measured | eval-plan schema: each AI feature's scenario set declares a 100 percent safety threshold; run results recorded (ref REQ-05 b6) | command | L2; which features are AI features O16; passing means the defined set passed, not general safety (ref b6) |

### REQ-06 Gate 2 and locks

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-06-1 | Gate-2 approval binds the design, eval plan, runbook and mockup | Measured | gate-2 record `binds` their hashes (ADR-004), schema checked by records-validate (ADR-006) | CI/host rule (records-validate) | ref REQ-06 b1 adds the rollback plan; mockup only with a UI; pod-factory's runbook pending (TECH-SPEC §8); V10 |
| C-06-2 | The lock covers the tests, the eval plan, runner configuration, the exact test command and lockfiles | Measured | `lock` writes the lock record for these (ADR-009 item 2); records-validate checks its schema | CI/host rule (records-validate) | V10 |
| C-06-3 | The lock covers fixtures, smoke tests and runbook scripts | Measured | the same lock record, extended (ref REQ-06 b2) | CI/host rule (records-validate) | L2; ADR-009's scaffold lock omits them; V10 |
| C-06-4 | The lock covers the enforcement code | Measured | enforcement-code entry in the lock record; project Claude settings covered (ADR-005); CODEOWNERS over protected paths (ADR-006 doctor) | CI/host rule (records-validate) | L2; scope for adopters, whose hooks live in the plugin, and for pod-factory under bootstrap is O26; V10 |
| C-06-5 | An agent edit to a locked path is denied | Enforced | h1 on file tools; h2 on shell commands, a heuristic (ADR-005) | hook | advisory layer, the binding block is C-06-6; milestone-zero refusal 1 (ADR-009); V1, V2, V4 |
| C-06-6 | A commit changing a locked path without a human-written amendment fails before merge | Enforced | story-verify fails the pull request; gate-check required for merge; precommit advisory (ADR-006; ADR-009 refusal 1) | CI/host rule (story-verify) | L2 (part): ADR-006 job 2 does not list the lock comparison (O30), and the amendment record is reference-only; V11 |
| C-06-7 | CI runs the locked command, not the branch's | Measured | story-verify runs the command exactly as locked and records it in the evidence bundle (ADR-006; ADR-009 item 5) | CI/host rule (story-verify) | the workflow file itself must come from the base branch, not the pull request; V11 |
| C-06-8 | Amendments show before-and-after renderings | Measured | amendment record carries regenerated before and after renderings for each changed test ID (ref REQ-06 b7, ref REQ-22 b2) | command | L2; `amend` not designed (O10) |
| C-06-9 | The approver acknowledges the amendment renderings | Enforced | the amendment takes effect only with an `acknowledge` record over the renderings (ref REQ-06 b7) | command | L2; O2 |

### REQ-07 Gate 3

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-07-1 | Every story carries requirement and test IDs, interfaces, file scope, budgets, caps, agent and model | Measured | story-file schema check (ref REQ-07 b1) | command | L2; ref adds spec sections, mockup screens, owner and status; O1 |
| C-07-2 | The gap report covers every check | Measured | structural check: one section per gap check with findings or "none found"; an empty report is rejected (ref REQ-07 b3, flow 2) | command | L2; the review itself is a fresh-context agent's, a Reviewed input; check list O6 |
| C-07-3 | Undispositioned gap findings block approval | Enforced | approve refuses gate 3 while a finding lacks a disposition (ref REQ-07 b3) | command | L2; ref also requires acknowledged dismissals, which the PRD does not state for gate 3; O14; O2 |
| C-07-4 | The packet states estimated tokens and days | Measured | packet field check, per story and in total (ref REQ-07 b4) | command | L2; accuracy not checked; shown even with budgets off (ADR-007) |
| C-07-5 | No story is dispatched without a matching record | Enforced | h3 denies Orca dispatch and the inline start verb unless a CI-validated gate-3 record matches the plan hash (ADR-005) | hook | the only layer that can stop a dispatch; a CI backstop on the dispatch receipt is O31; V1, V2, V4, V10, V16 |
| C-07-6 | A story cannot start until it is ready | Enforced | transition to in progress refused until the ready rule passes: criteria written, tests locked, interfaces defined, file scope declared (ref REQ-07 b6; ref §5 status transitions) | command | L2; records-validate checks legal transitions (ADR-006), precondition re-check O2 |

### REQ-08 Build

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-08-1 | A story is done only when its locked tests pass on its branch | Enforced | transition to done requires story-verify's locked-command result, green on the branch head tree (ADR-006; ADR-003 builder contract) | CI/host rule (story-verify) | L2 (part): the done-transition precondition is ref §5 status transitions; a local run never substitutes (ref §5); O2; V11 |
| C-08-2 | Each builder session leaves a handoff note | Measured | check that every dispatch has a handoff note, written by the orchestrator when a builder dies (ref REQ-08 b4) | command | L2; note content is agent text, never evidence |
| C-08-3 | Builder context is exactly what the orchestrator supplied | Unmapped | none possible as written | none | L1; Measured under the list 1 rewording, with C-08-4's record; O28 |
| C-08-4 | Builder context is recorded | Measured | dispatch record holds hashes of the story file, listed spec sections, project rules and listed screenshots (ref REQ-08 b5) | command | L2; written by the orchestrator, an agent, unless the start verb assembles it; V6 |
| C-08-5 | Builders hold no deploy credentials | Measured | factory canary test: a deploy credential in a supported channel never appears in a builder transcript or environment (ref REQ-21 b3; ref decision 15) | CI/host rule (factory test) | L2; credentials already in the user's own environment are outside factory control; sandboxes are version two (PRD §5); V20 |
| C-08-6 | A diff outside the story's file scope fails | Enforced | story-verify fails the pull request, also for anything under `.factory/` (ADR-006; ADR-009 item 5); precommit advisory | CI/host rule (story-verify) | V11 |
| C-08-7 | Killing the builder, the orchestrator or Orca at any point and restarting loses no record | Measured | kill-and-resume acceptance test (ADR-009 exit test; ref REQ-08 b8) | CI/host rule (factory test) | "any point" needs a defined set of kill points; Orca kills arrive in phase 2; atomic record writes are ref §5 only |

### REQ-09 Verify

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-09-1 | A story cannot reach gate 4 with a failing check | Enforced | story-verify fails on restraint and security checks; gate-check required for merge (ADR-006) | CI/host rule (story-verify) | L2 (part): the transition block is ref REQ-09 b1; story-verify must be a required check (doctor, ADR-006); tripwire flags are not failures (ADR-007); V11 |
| C-09-2 | A story cannot reach gate 4 with an unresolved blocking security finding | Enforced | transition to gate 4 refused while a security-reviewer finding marked blocking is unresolved (ref REQ-09 b1) | command | L2; the finding is a Reviewed input and the reviewer is in no ADR; O2 |
| C-09-3 | A story cannot reach gate 4 with QA without evidence | Enforced | a QA pass without evidence bound to the tree is rejected (ref REQ-09 b5; ADR-009 refusal 3) | command | L2 (part): ADR-009 refusal 3 covers a packet's unsupported "tests passed", while the QA evidence rule is ref REQ-09 b5; the QA verdict itself is Reviewed |
| C-09-4 | Untraced code is reported by path | Measured | story-verify's traceability check writes the paths of untraced new files and endpoints (ADR-006) | CI/host rule (story-verify) | trace-tag convention O17; V11 |
| C-09-5 | Fixes go to the originating worker | Measured | the fix-task record names the worker of the originating dispatch (backend verb, ADR-003, TECH-SPEC §4.1) | command | inline backend V7; with Orca, the same dispatch terminal (ref REQ-09 b3) |
| C-09-6 | Budget and cap overruns park the story | Enforced | the CLI moves the story to needs human on a cost, time or loop-cap overrun in hard-stop mode (ADR-007) | command | inline token usage per story V8; size and complexity are always tripwires (ADR-007) |
| C-09-7 | Overruns flag the story when the project chose tripwire mode | Measured | flag with a required justification is recorded (ADR-007) | command | — |
| C-09-8 | Overruns do nothing when the project turned budgets off | Measured | factory test: no park and no flag in off mode, usage still recorded (ADR-007) | CI/host rule (factory test) | — |
| C-09-9 | Every packet shows which budget mode is active | Measured | packet check for the mode line (ADR-007; record 0002) | command | ADR-007 specifies the line for off; for hard-stop and tripwire it is PRD-only |
| C-09-10 | The status page shows which budget mode is active | Measured | status-page test (ADR-007) | command | the status page is phase 4 (TECH-SPEC §2); O33 |
| C-09-11 | Artifacts are redacted before they are written | Measured | one write path through a redaction filter for CLI, check-runner and executor writes; planted secret and personal-data samples (ref REQ-09 b7, ref REQ-21 b4) | CI/host rule (factory test) | L2; agent-written work-zone files bypass the filter (V21); pattern catalog not chosen |

### REQ-10 Gate 4

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-10-1 | Merge is blocked without a CI-validated approval record bound to the story's content | Enforced | gate-check, required for merge: a validated gate-4 record bound to the pull request head tree under any merge strategy (ADR-006; ADR-009 item 5; ref §5 tree binding) | CI/host rule (gate-check) | branch protection must require gate-check (doctor); V10, V11, V12 |
| C-10-2 | The packet is written by a fresh-context agent | Measured | provenance record captured when the packet writer starts: final tree hash and template only | hook | L2 (no mechanism in either document); ref REQ-10 b3 rejects other sources but names no means; V6 |
| C-10-3 | The packet is written from the final content | Measured | packet record binds the tree hash it was written from, equal to the head tree at approval (ref REQ-10 b3) | command | L2; gate-check does not compare it (O1) |
| C-10-4 | The packet contains every section | Measured | section-presence check; a missing section fails (ref REQ-10 b4; PRD §2 list) | command | L2; section list O6; Engineers also get the diff |
| C-10-5 | The packet ends with the four closing lines | Measured | structural check of the four labelled closing lines (ref REQ-10 b5) | command | L2; ref also has approve show them before confirming |
| C-10-6 | The summary contains no code | Measured | plain-language lint: no paths, identifiers or code spans (ref §5 plain-language section; ref NFR-09) | command | L2; lint rules not chosen |
| C-10-7 | A content change after approval requires re-review | Enforced | gate-check fails when the head tree differs from the bound tree; a moved main only re-runs the locked tests (ADR-006; ADR-009 refusal 2) | CI/host rule (gate-check) | re-review cap of 2 (ADR-007); V10, V11 |
| C-10-8 | A delegated approval counts only under REQ-17 | Enforced | gate-check accepts a delegated gate-4 record only when the check runner wrote it under a valid policy and a human acknowledgment record exists (ADR-004 writers; ref REQ-17 b9, b10) | CI/host rule (gate-check) | L2 (part): ADR-006's gate-check names only the gate-4 record (O20); V10, V11 |

### REQ-11 Gate 5

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-11-1 | The artifact is built before sign-off | Enforced | release-gate builds the artifact and publishes its digest before gate 5 (ADR-006); approve refuses gate 5 without it | CI/host rule (release-gate) | job phases and triggers O23 |
| C-11-2 | The artifact is verified before sign-off | Enforced | approve refuses gate 5 without regression-suite and rollback-rehearsal results bound to the digest (ref REQ-11 flow 1, b4) | command | L2 (part): ADR-006 builds the artifact but names no verification run against it |
| C-11-3 | Every checklist item has evidence | Measured | checklist check: each item links evidence and an empty item fails (ref REQ-11 b3) | command | L2; item list ref REQ-11 flow 2 |
| C-11-4 | The evidence includes the rollback rehearsal | Measured | executor log of a rehearsal outside production, bound to the digest (ref REQ-11 b7) | command | L2; "outside production" is a runbook declaration reviewed at gate 2; executor O10 |
| C-11-5 | The evidence includes the security condition | Measured | checklist item computed from records: every story's scans and security review complete, no unresolved blocking finding, every exception a visible waiver (ref REQ-11 b6) | command | L2; depends on the records behind C-09-1 to C-09-3 and on waiver records |
| C-11-6 | Sign-off binds revision, artifact digest, environment, configuration, migrations, runbook and rollback plan | Measured | gate-5 record `binds` (ADR-004), validated by records-validate and matched by release-gate (ADR-006) | CI/host rule (records-validate) | ref REQ-11 b5 also binds the verification evidence; V10 |

### REQ-12 Orca control room

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-12-1 | Board columns match story stages | Measured | Orca workspace statuses compared with factory stages; a card's column matches its story status after the next status update (ref REQ-12 b4) | command | L2; Orca is never an enforcement layer (PRD §5); V15 |
| C-12-2 | Every open gate and question appears on the status page | Measured | status page generated from records; a test compares open gates and questions with the page (ref REQ-12 b1) | command | L2; phase 4; O33 |
| C-12-3 | Every open gate and question raises a notification | Measured | a notification event is logged per open gate and question, on Orca and on the independent channel (ref REQ-12 b5; ref §5 notification channel) | command | L2; channels undecided (O8); V15 |
| C-12-4 | Approving from Orca produces the same record as the CLI | Measured | factory test: the Orca command runs the same CLI and the records match field by field (ref REQ-12 b2) | CI/host rule (factory test) | L2; ref adds hash and decision confirmation and control-character stripping; V15 |
| C-12-5 | The approving process is never an agent | Enforced | approval-path commands refuse inside an agent session; Orca runs them in a human-owned shell terminal (ref §5 approval path; ref REQ-12 flow 4) | command | L2; not among ADR-005's hooks; a deliberately malicious agent is out of scope (PRD §5); V9, V15 |

### REQ-13 Escalation

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-13-1 | A dispatched builder cannot open a question prompt the orchestrator cannot see | Enforced | h4 denies the local question tool in a dispatched worker session (ADR-005) | hook | the only layer; Codex builders under Orca have no hook (PRD §5); V1, V2, V3, V4 |
| C-13-2 | Every decision is logged with date, decider and outcome | Measured | decision-log record schema; the check runner writes it, not the deciding agent (ADR-004 writers; ref REQ-13 b2) | CI/host rule (records-validate) | L2 (part): ADR-004 names delegated decisions only; an unlogged decision is invisible; V10 |
| C-13-3 | Orchestrator decisions carry the clause relied on | Measured | decision-record schema requires the quoted clause (ref REQ-13 b2; ref REQ-17 b2) | CI/host rule (records-validate) | L2; whether the clause settles the question is Reviewed at gate 4 (ref REQ-17 b3); V10 |
| C-13-4 | Between orchestrator and human, no default is ever taken | Enforced | needs human is left only through an `answer` record, and no timeout transition exists (ref REQ-13 b3; ref REQ-17 b4) | command | L2; a default taken without ever raising the question is not observable; O2 |

### REQ-14 Metrics

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-14-1 | Issues caught per gate are reported | Measured | metrics command over records (ref REQ-14 b1) | command | L2; "issue" undefined (O21) |
| C-14-2 | Production bugs are reported from incident records | Measured | metrics command over incident records (ref REQ-14 b1) | command | L2; incident record type and writer O9, O21 |
| C-14-3 | Rework rate is reported | Measured | metrics command over records (ref REQ-14 b1) | command | L2; definition O21 |
| C-14-4 | Time per story is reported | Measured | elapsed time between status-transition records (ref REQ-14 b1) | command | L2 |
| C-14-5 | Tokens per story are reported | Measured | Orca receipts, or subagent usage persisted into the story receipt (ADR-003) | command | inline figures pass through the orchestrator, an agent; V8 |
| C-14-6 | Metrics are computed from records with no network access | Measured | factory test runs the metrics command with the network disabled (ref REQ-14 b2) | CI/host rule (factory test) | L2; ref also allows receipts, transcripts and handoff notes as inputs |
| C-14-7 | Story time is elapsed time, not effort | Measured | factory test: story time equals the difference of record timestamps and no effort field exists (ref decision 27) | CI/host rule (factory test) | L2 |

### REQ-15 Retrospective

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-15-1 | Proposed rules cite the failure that motivated them | Measured | check that each proposed rule references an existing failure record (ref REQ-15 b1) | command | L2; whether the failure motivates the rule is not checked |
| C-15-2 | Proposed rules are applied only on approval | Enforced | proposals arrive as a pull request and merge requires gate-check (ADR-006) | CI/host rule (gate-check) | L2 (part): which record approves a pull request that is not a story is O3; V10, V11 |
| C-15-3 | The feedback question is optional | Measured | factory test: the retrospective completes with the question skipped (ref REQ-15 flow 1) | CI/host rule (factory test) | L2 |
| C-15-4 | The feedback question is never a gate | Measured | factory test: no transition or approval precondition reads its answer | CI/host rule (factory test) | L2 |

### REQ-16 Install

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-16-1 | Skills install with one command | Measured | install smoke test in pod-factory's CI (ADR-006; `npx skills add`, ADR-002) | CI/host rule (pod-factory CI) | V18 |
| C-16-2 | The Claude Code plugin adds hooks and commands | Measured | plugin install smoke test (ADR-006); the preflight verifies them (ref REQ-16 b2) | CI/host rule (pod-factory CI) | V4, V5 |
| C-16-3 | The Orca entry is labeled experimental | Measured | check of the entry on the published Orca plugin branch (ADR-002 branch split; ADR-006 branch check) | CI/host rule (pod-factory CI) | L2 (part): ADR-006 verifies the branch split, but neither document names a check of the label; V17 |
| C-16-4 | The whole workflow runs with Claude Code alone | Measured | recorded end-to-end run with Orca absent; milestone zero covers gates 1 to 4 (ADR-009) | command | model-driven, so not a deterministic CI test; no planned run covers gate 5 without Orca; ref REQ-16 b5 adds docs for both paths |

### REQ-17 Delegation

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-17-1 | Only a written policy grants authority | Enforced | the check runner records a delegated decision only under a validated policy record written through `delegate` (ref REQ-17 b1, b5); writer rule in records-validate (ADR-004) | CI/host rule (records-validate) | L2; policy record type O9; default-deny template (ADR-002); V10 |
| C-17-2 | Authority is granted by category | Measured | policy schema: categories by ID, reserved categories, limits; free text grants nothing (ref REQ-17 b1) | CI/host rule (records-validate) | L2; V10 |
| C-17-3 | With no policy every gate waits for you | Enforced | deny-all: no delegated record is accepted without a policy (ref §5 approval path; ref REQ-17 b5) | CI/host rule (records-validate) | L2; V10 |
| C-17-4 | Every delegated decision cites its category and clause | Measured | delegated-decision schema requires the category ID and the quoted clause (ref REQ-17 b2) | CI/host rule (records-validate) | L2; whether the clause settles the question is Reviewed by the gate-4 reviewer (ref REQ-17 b3); V10 |
| C-17-5 | A decision without them is rejected as a question that should have been asked | Enforced | the check runner refuses the record, reports the question and moves the story to needs human (ref REQ-17 b2, b4) | command | L2 |
| C-17-6 | Only gate 4 can be delegated | Enforced | a policy naming any other gate is rejected (ref REQ-17 b8) | CI/host rule (records-validate) | L2; V10 |
| C-17-7 | Delegated conditions are checked from evidence | Measured | the check runner evaluates gate-4 conditions from CI evidence and writes the delegated record (ADR-004 writers; ref REQ-17 b9) | command | L2 (part): condition language not chosen |
| C-17-8 | A delegated merge waits for your acknowledgment | Enforced | gate-check requires the human acknowledgment record with a delegated gate-4 record (ref REQ-17 b10) | CI/host rule (gate-check) | L2; not in ADR-006's gate-check (O20); V10, V11, V12 |

### REQ-18 Release execution

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-18-1 | The release refuses to start without a validated sign-off matching every bound input | Enforced | release-gate matches the gate-5 record to digest, environment, configuration, migrations, runbook and rollback plan (ADR-006); the executor re-validates before step one (ref REQ-18 b1) | CI/host rule (release-gate) | executor pending (O10); V10 |
| C-18-2 | A rebuild that does not reproduce the approved digest halts | Enforced | the executor compares the rebuilt digest with the bound one and halts (ref REQ-18 b2) | command | L2; reproducible builds per preset O24 |
| C-18-3 | A confirmed smoke failure rolls back without a human | Measured | executor log records the classification and the rollback with its own smoke result; tested with injected failures (ref REQ-18 b4) | command | L2; retry rule from the runbook (ref REQ-18 b6) |
| C-18-4 | A probe error never triggers a rollback | Enforced | the executor refuses rollback unless the classification is a confirmed application failure (ref REQ-18 b5) | command | L2; the classification rule must be in the runbook |
| C-18-5 | No other recovery runs without you | Enforced | the executor refuses any recovery step beyond the pre-approved rollback without a human decision record (ref REQ-18 b7) | command | L2; a failed rollback persists "release broken" and notifies (ref REQ-18 b11; O8) |
| C-18-6 | Credentials never appear in any log, artifact or model context | Measured | factory canary test across executor logs, artifacts, records and agent transcripts (ref REQ-18 b8; ref REQ-21 b3) | CI/host rule (factory test) | L2; holds for tested channels only, elsewhere redaction (PRD §5); V20 |
| C-18-7 | Release state survives a crash | Measured | factory crash test at every step: resume or roll back from persisted state, each step idempotent or reconciled (ref REQ-18 b9, b10) | CI/host rule (factory test) | L2 |

### REQ-19 Operations

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-19-1 | `status` exists | Measured | story one of milestone zero: every story, its stage, owner and what it waits on (ADR-009) | CI/host rule (factory test) | — |
| C-19-2 | `explain` exists | Measured | factory test: names the blocking gate, check or question in plain language (ref REQ-19 b3) | CI/host rule (factory test) | L2; phase 1b |
| C-19-3 | `doctor` exists | Measured | minimal doctor (ADR-009 item 6); doctor job (ADR-006) | CI/host rule (doctor) | — |
| C-19-4 | `doctor` fails when any enforcement layer is missing or waived | Measured | doctor checks branch protection on main and the records branch, CODEOWNERS, required checks, the pinned plugin version and active waivers (ADR-006) | CI/host rule (doctor) | layer list O4; a failing doctor blocks nothing by itself (O22); ref also checks managed hook settings; V4, V13 |
| C-19-5 | An event log covers every record | Measured | factory test: every record write appends an event (ref REQ-19 b1) | CI/host rule (factory test) | L2; the reference's log also holds hook denials, which ADR-005 does not log |
| C-19-6 | An audit view covers every record | Measured | factory test: every record type listed with actor and time (ref REQ-19 b5) | CI/host rule (factory test) | L2; record types O9 |

### REQ-20 Upgrades

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-20-1 | Records carry schema and factory versions | Measured | common fields `schemaVersion` and `factoryVersion` (ADR-004), checked by records-validate (ADR-006) | CI/host rule (records-validate) | every record also names `hashAlgorithm` (ADR-004); V10 |
| C-20-2 | A migration command has tests | Measured | check that every migration has a test, run in pod-factory's CI (ref REQ-20 b3) | CI/host rule (pod-factory CI) | L2; the first migration moves record 0001 to the records branch (ADR-004) |
| C-20-3 | The enforcing version is pinned per project | Measured | profile field (TECH-SPEC §1) checked by doctor's "plugin version pinned per project" (ADR-006) | CI/host rule (doctor) | pod-factory pins "bootstrap" (ref decision 23); V5 |
| C-20-4 | An upgrade is a human-written amendment | Enforced | a change to the pinned version or the enforcement code without an amendment record fails story-verify under the enforcement-code lock (C-06-4, C-06-6) | CI/host rule (story-verify) | L2 (part): the amendment record is reference-only (ref REQ-20 b4, ref REQ-22 b2); O30; V11 |

### REQ-21 Credentials

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-21-1 | Deployment credentials enter only through a hidden prompt, the keychain or a secret manager | Enforced | the executor reads credentials only from those channels and refuses any other source (ref REQ-21 flow, b2) | command | L2; a value pasted into chat is outside any control (PRD §5); secret managers O25; V19 |
| C-21-2 | Canary tests prove credentials never appear in any transcript, log or artifact | Measured | canaries planted in the keychain, a `.env` file and tool output, scanned in transcripts, logs, artifacts, records and reports (ref REQ-21 b3) | CI/host rule (factory test) | L2; shows absence only for the planted channels (PRD §5); V20 |
| C-21-3 | Declared secret files are unreadable to agents | Enforced | h5 denies reads and h1 denies edits (ADR-005) | hook | the only layer, no CI equivalent for reads; shell reads (`cat`, scripts) are not covered by h2's write heuristic; V1, V2, V4, V22 |

### REQ-22 Exceptions

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-22-1 | Revocations exist as records | Measured | revocation record type with a human writer, validated by records-validate (ref REQ-22 b1; ADR-004 writers) | CI/host rule (records-validate) | L2; schema O9; V10 |
| C-22-2 | Human-written amendments exist as records | Measured | amendment record bound to before and after hashes, human writer (ref REQ-22 b2; record 0002 is the bootstrap example) | CI/host rule (records-validate) | L2; V10 |
| C-22-3 | Time-boxed waivers exist as records | Measured | waiver record naming a check or layer, a story or gate, and an expiry; expired waivers fail again (ref REQ-22 b3) | CI/host rule (records-validate) | L2; V10 |
| C-22-4 | Every active waiver is visible on every packet | Measured | packet check against active waiver records (ref REQ-22 b3); gate-check lists them in its summary (ADR-006) | command | L2; doctor also lists them (ADR-006) |
| C-22-5 | Every failure that stops work produces a plain-language message with your options | Measured | each stop point (hook denial, check failure, refusal, park, halt) emits a message that passes the plain-language lint; one factory test per stop point (ref REQ-22 b5) | CI/host rule (factory test) | L2; needs an enumerated catalog of stop points (O27); ref also sends it on the independent channel (O8) |

### REQ-23 Mockup

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-23-1 | Every user-facing flow has a reachable screen | Measured | flow-to-screen map checked against the PRD's flows; reachability by a runner-driven crawl from the entry screen (ref REQ-23 b1) | command | L2; PRD flows need IDs (O18); whether a screen fits its flow is the approver's click-through |
| C-23-2 | A flow without a reachable screen blocks gate 1 | Enforced | approve refuses gate 1 with an unmapped or unreachable flow (ref REQ-23 b1) | command | L2; O2; no interactive UI in pod-factory itself |
| C-23-3 | The mockup lives apart from application code | Measured | path check: the mockup only under `.factory/work/mockups/`, and restraint checks ignore it (ref REQ-23 b2) | command | L2; story branches cannot touch `.factory/` (ADR-006) |
| C-23-4 | Builders see only its screenshots | Measured | the context bundle holds only the listed screenshots captured at gate 2; the mockup source is archived before dispatch (ref REQ-23 b3) | command | L2; h5 does not cover mockup paths and git history still holds the source; O18, O28 |
| C-23-5 | The mockup is archived after gate 2 | Measured | archive step at gate-2 approval; a check that it cannot be served from the repository afterwards (ref REQ-23 b4) | command | L2; archive mechanism O18 |

### REQ-24 Managed setup (phase two)

| ID | Criterion | Kind | Mechanism (source) | Authoritative | Notes |
|---|---|---|---|---|---|
| C-24-1 | After setup on a supported host and plan, `doctor` passes with no waiver | Measured | doctor result after setup (ADR-006; TECH-SPEC phase 5 exit) | CI/host rule (doctor) | GitHub first (ADR-006); V13, V14 |
| C-24-2 | On an unsupported plan, setup offers public, upgrade or a visible waiver | Measured | factory test with a stubbed unsupported plan: setup stops and records the chosen option (ref REQ-24 b2) | CI/host rule (factory test) | L2; ref b5 re-verifies host-plan rules per build; V14 |
| C-24-3 | Setup is idempotent | Measured | factory test: a second run changes nothing (ref REQ-24 b3) | CI/host rule (factory test) | L2 |
| C-24-4 | Setup never prints a credential | Measured | canary test on setup output (ref REQ-24 b4) | CI/host rule (factory test) | L2; ref also forbids storing one outside the keychain or secret manager |

## List 1: criteria that cannot be mapped as written

1. **C-08-3** (REQ-08): "Builder context is exactly what the orchestrator supplied". Read literally it is either always true, since whatever was supplied was supplied, or false, since a builder must read the files in its scope and nothing records what else it reads. No block, recorded result or review can establish it. Proposed rewording, keeping PRD §2's meaning ("only their story, the spec sections it names, the project rules and the mockup screens"): "The documents supplied to a builder are exactly its story file, the spec sections it names, the project rules and the mockup screenshots it lists, and the supplied set is recorded by hash at dispatch." That is Measured against the story file's lists, together with C-08-4. Whether reads beyond that set are logged or denied stays O28. If the approver prefers not to reword, drop the clause before gate 2 and keep C-08-4.

Mapped, but only in a bounded form the approver should confirm before gate 2: C-13-4 (a default taken without ever raising the question is unobservable); C-18-6 and C-21-2 (absence is shown only for the planted channels); C-21-3 (shell reads); C-22-5 (needs the stop-point catalog, O27); C-04-6 and C-13-2 (a decision with no record at all is invisible).

## List 2: criteria whose mechanism exists only in the reference

The spec must adopt or replace each mechanism below; none is in an accepted ADR. "(part)" marks a criterion whose remaining mechanism is in an ADR; "no mechanism" marks one the reference does not supply either. Each criterion appears once.

1. Start-completion checks and interview recording (ref REQ-01; ref §5 project profile and `answer`): C-01-1, C-01-2, C-01-3, C-01-4, C-01-5.
2. Stage-aware block on application paths while gate 1 is open (no mechanism): C-01-6.
3. Preflight report (ref REQ-01 flow 2): C-01-7.
4. Approval-time refusals for gates 1 to 3 (ref REQ-01 b5, REQ-03 b6, REQ-04 b12, REQ-05 b2 and b4, REQ-07 b3, REQ-23 b1): C-01-8, C-03-6, C-03-7, C-04-8, C-05-4, C-05-10, C-07-3, C-23-2.
5. Discovery report checks, review and approval (ref REQ-02): C-02-1, C-02-2, C-02-3, C-02-4, C-02-5, C-02-6, C-02-7, C-02-8.
6. Agent denial of the approval-path commands and refusal inside an agent session (ref §5 approval path; ref REQ-12 flow 4): C-03-1 (part), C-12-5.
7. Per-requirement PRD hashing and mockup snapshot binding (ref REQ-03 b1, b2): C-03-2 (part), C-03-3.
8. Status-transition preconditions, ready rule, gate-4 entry and the needs-human exit (ref §5 status transitions; ref REQ-07 b6, REQ-09 b1 and b5, REQ-17 b4): C-03-4, C-07-6, C-08-1 (part), C-09-1 (part), C-09-2, C-09-3 (part), C-13-4.
9. Red-team and gap report structure (ref REQ-03 b5; ref REQ-07 b3): C-03-5, C-07-2.
10. Invalidation graph and revocation effects (ref §5 invalidation graph): C-03-8.
11. Design section and decision-record checks, settled-question review (ref REQ-04): C-04-1, C-04-2, C-04-3, C-04-4, C-04-5, C-04-6, C-04-7.
12. Fresh-context provenance of reviewers (no mechanism): C-04-9, C-10-2.
13. Eval-plan tagging, renderings and pre-approval classification (ref REQ-05): C-05-1, C-05-2, C-05-3, C-05-5, C-05-6, C-05-7, C-05-8, C-05-9, C-05-11.
14. Lock coverage beyond ADR-009's scaffold lock (ref REQ-06 b2): C-06-3, C-06-4.
15. Amendment records, renderings and acknowledgment (ref REQ-06 b7; ref REQ-20 b4; ref REQ-22 b2): C-06-6 (part), C-06-8, C-06-9, C-20-4 (part), C-22-2.
16. Story-file schema and gate-3 packet fields (ref REQ-07 b1, b4): C-07-1, C-07-4.
17. Handoff notes, builder context records and builder canaries (ref REQ-08 b4, b5; ref REQ-21 b3): C-08-2, C-08-4, C-08-5.
18. Redaction filter on every artifact write (ref REQ-09 b7; ref REQ-21 b4): C-09-11.
19. Gate-4 packet checks and the plain-language lint (ref REQ-10 b3 to b5; ref §5 plain-language section): C-10-3, C-10-4, C-10-5, C-10-6.
20. Delegation policy, delegated decisions and the delegated-merge acknowledgment (ref REQ-17; ref REQ-13 b2): C-10-8 (part), C-13-3, C-17-1, C-17-2, C-17-3, C-17-4, C-17-5, C-17-6, C-17-7 (part), C-17-8.
21. Gate-5 verification, checklist, rehearsal and security condition (ref REQ-11): C-11-2 (part), C-11-3, C-11-4, C-11-5.
22. Orca board, status page, notifications and Orca approvals (ref REQ-12): C-12-1, C-12-2, C-12-3, C-12-4.
23. Decision log beyond delegated decisions (ref REQ-13 b2): C-13-2 (part).
24. Metrics command and its inputs (ref REQ-14): C-14-1, C-14-2, C-14-3, C-14-4, C-14-6, C-14-7.
25. Retrospective proposals and the optional question (ref REQ-15): C-15-1, C-15-2 (part), C-15-3, C-15-4.
26. Release executor behaviour (ref REQ-18; executor pending, O10): C-18-2, C-18-3, C-18-4, C-18-5, C-18-6, C-18-7.
27. `explain`, the event log and the audit view (ref REQ-19): C-19-2, C-19-5, C-19-6.
28. Migration tests (ref REQ-20 b3): C-20-2.
29. Credential channels and canary tests (ref REQ-21): C-21-1, C-21-2.
30. Revocation and waiver records, waiver display and stop messages (ref REQ-22): C-22-1, C-22-3, C-22-4, C-22-5.
31. Mockup flow map, location, screenshots and archive (ref REQ-23): C-23-1, C-23-3, C-23-4, C-23-5.
32. Managed-setup behaviour (ref REQ-24): C-24-2, C-24-3, C-24-4.
33. Check of the experimental label on the published Orca entry (no mechanism; ADR-006's branch check covers publication only): C-16-3 (part).

## List 3: criteria that depend on an unverified platform capability

Each item is a capability the mapping assumes and no document has confirmed. Criteria are listed after the colon.

- V1, verify: Claude Code's pre-tool-use hook can deny, with a reason the agent sees, the file-edit tools, the shell tool, the read tool, the question tool and the subagent tool; ADR-005 defers exact event and field names to the hook tests: C-01-6, C-06-5, C-07-5, C-13-1, C-21-3.
- V2, verify: the session's hooks fire for every subagent tool call, as ADR-003 asserts: C-06-5, C-07-5, C-13-1, C-21-3.
- V3, verify: hook input tells a dispatched worker, inline subagent or Orca worker, apart from the orchestrator: C-13-1.
- V4, verify: an agent cannot disable or edit the plugin's hooks, given that the plugin directory is writable by the same OS user and an uncommitted local settings file may disable a plugin; and whether managed settings (ref NFR-01) can force it on: C-06-5, C-07-5, C-13-1, C-16-2, C-19-4, C-21-3.
- V5, verify: a Claude Code plugin version can be pinned per project and read by `doctor`: C-16-2, C-20-3.
- V6, verify: a hook on the subagent tool sees the full prompt and whether the subagent starts fresh or inherits context, and the subagent's output can be captured: C-04-9, C-05-3, C-08-4, C-10-2.
- V7, verify: the inline backend can send a fix back to the same subagent with its context (TECH-SPEC §4.1 verb): C-09-5.
- V8, verify: Claude Code exposes per-subagent token usage to the orchestrator or a hook (ADR-003 consequence): C-09-6, C-14-5.
- V9, verify: an approval-path command can detect that it runs inside an agent session, by an environment marker or process ancestry: C-03-1, C-12-5.
- V10, verify: how GitHub treats a direct push to a branch whose rule requires a status check. ADR-004 has the CLI push records directly and ADR-006 expects only failing pushes to be rejected; if the rule requires the check to have passed on the commit first, every direct push is refused and a staging ref is needed: C-03-1, C-03-2, C-03-3, C-03-4, C-06-1, C-06-2, C-06-3, C-06-4, C-07-5, C-10-1, C-10-7, C-10-8, C-11-6, C-13-2, C-13-3, C-15-2, C-17-1, C-17-2, C-17-3, C-17-4, C-17-6, C-17-8, C-18-1, C-20-1, C-22-1, C-22-2, C-22-3.
- V11, verify: the required checks run the workflow definition from the base branch, since a pull request can change `.github/` and a workflow taken from the pull request could pass a check of the same name (options such as base-branch triggers or ruleset-required workflows, and their availability per plan): C-02-6, C-06-6, C-06-7, C-08-1, C-08-6, C-09-1, C-09-4, C-10-1, C-10-7, C-10-8, C-15-2, C-17-8, C-20-4.
- V12, verify: a way to re-run a pull request's required gate-check after a record lands on the records branch, since a push to another branch does not by itself re-run the pull request's checks: C-10-1, C-17-8.
- V13, verify: required CODEOWNERS review can be satisfied on a single-maintainer repository, where an author cannot approve their own pull request: C-19-4, C-24-1.
- V14, verify: how setup detects the host plan and which protections each plan allows (ref REQ-24 b5 re-verifies this per build): C-24-1, C-24-2.
- V15, verify in Orca: workspace statuses usable as board columns and settable by the plugin; notifications when the orchestrator ends its turn; quick actions that run a command in a human-owned shell terminal with a confirming click: C-12-1, C-12-3, C-12-4, C-12-5.
- V16, verify: Orca's dispatch command names (`orca orchestration worker-start`, `dispatch`) and status probe in the Orca version relied on (ADR-002 cites 1.4.214): C-07-5.
- V17, verify: an Orca marketplace entry can carry an "experimental" label, or where the label must live: C-16-3.
- V18, verify: `npx skills add` installs the skills from the repository in one command (ADR-002): C-16-1.
- V19, verify: OS keychain access from Node on macOS, Windows and Linux, and a hidden-input prompt in a human-owned terminal: C-21-1.
- V20, verify: where Claude Code stores session and subagent transcripts, so canary tests can scan all of them: C-08-5, C-18-6, C-21-2.
- V21, verify: a pre-tool-use hook can deny or rewrite a write whose content matches a secret or personal-data pattern, for artifacts agents write directly: C-09-11.
- V22, verify: whether Claude Code permission rules or its sandbox can stop shell reads of declared secret paths, which h2's write heuristic does not cover: C-21-3.

## OPEN items

Left open by the PRD, the ADRs and the tech spec; this draft does not decide them.

- O1: No ADR-006 job checks gate 1 to 3 artifacts (PRD draft, discovery report, design, eval plan and its classification, build plan). Open whether those checks run only in the approve command, in records-validate when the approval record is pushed, or in a new CI job.
- O2: Whether records-validate's "legal status transition" (ADR-006) re-evaluates preconditions (ready rule, required records, dispositions, caps) or checks only the transition graph.
- O3: How a pull request that is not a story (gate 1 to 3 work-zone artifacts, the discovery report, retrospective proposals) passes story-verify's file-scope rule and the required gate-check.
- O4: The canonical list of enforcement layers: ref §5 (agent hook, pre-commit, CI, plus branch protection and CODEOWNERS where a host exists), ref REQ-19 b4 (adds records-branch protection and managed hook settings), and ADR-009's "five layers", which are scaffold components.
- O5: Whether the preflight is `doctor` run before installation or a separate command.
- O6: Required-section and check lists for the design, the discovery report, the gap report and the gate-4 packet; the reference lists them and no ADR pins them.
- O7: Where criterion IDs live. The PRD has none; IDs added to the PRD change its per-requirement hashes, and IDs kept in the spec can drift after a PRD amendment.
- O8: Notification channels (TECH-SPEC §1: "to be decided").
- O9: Record types and schemas beyond ADR-004's common fields: acknowledgment, answer, waiver, revocation, amendment, policy, discovery approval, click-through, incident, test baseline (TECH-SPEC §4.3 defers schemas to the check runner).
- O10: The CLI command family and the release executor (TECH-SPEC §4.6), and the pending sections on non-goals, threat review, production readiness and the eval plan (TECH-SPEC §5, §7, §8, §10).
- O11: How interview answers are recorded: human `answer` records against question hashes (ref §5) or entries the start skill writes.
- O12: What counts as application code for the gate-1 block: the preset folder structure (ADR-008) and its equivalent for custom stacks.
- O13: How an existing codebase is recognized for REQ-02.
- O14: Where findings, dispositions and dismissals are stored for red-team, gap and reviewer reports.
- O15: How a test declares its expected failure reason and what a real rejection looks like, and where existing-test baselines are recorded (REQ-05).
- O16: How AI features and their scenario sets are identified.
- O17: The trace-tag convention linking files, endpoints and public functions to requirement IDs.
- O18: Mockup snapshot, click-through record, flow IDs in the PRD, the archive mechanism and the "cannot be served" check.
- O19: Whether a review that rejects a settled design question blocks gate 2; the PRD gives blocking rules only for gate-1 and gate-3 findings.
- O20: Where the human acknowledgment of a delegated merge is checked; ADR-006's gate-check names only the gate-4 record.
- O21: Definitions of "issues caught" and "rework rate", and who writes incident records.
- O22: Whether a failing `doctor` blocks anything; ADR-006 runs it on schedule and on demand, not as a required check.
- O23: release-gate's two phases: ADR-006 job 4 both builds the artifact before gate 5 and validates the gate-5 record; the trigger for each is unstated.
- O24: Reproducible builds per preset, which the rebuild comparison in C-18-2 assumes.
- O25: Which secret managers are supported (REQ-21).
- O26: What the enforcement-code lock covers for adopters, whose hooks live in the plugin (ADR-005), and for pod-factory, whose enforcement code is story code under bootstrap (ref decision 23).
- O27: The catalog of stop points that REQ-22's plain-language messages must cover.
- O28: Whether builder reads outside the supplied documents and the file scope are logged, denied or accepted.
- O29: Which agent performs the discovery "no refactoring" review and the design "settled question" review.
- O30: Whether story-verify compares locked paths explicitly; ADR-006 job 2 lists `.factory/` and file scope, while ADR-009 refusal 1 requires CI to reject a changed locked test.
- O31: A CI backstop for dispatch without a matching gate-3 record, such as story-verify checking the dispatch receipt's plan hash.
- O32: How a requirement's text is delimited for its per-requirement hash.
- O33: What shows open gates, questions and the budget mode before the status page arrives in phase 4.

## Counts

- Criteria: 157 across the 24 requirements.
- Control kind: Enforced 46, Measured 108, Reviewed 2, Unmapped 1.
- Authoritative layer: CI/host rule 67 (factory tests 20, records-validate 19, story-verify 8, gate-check 5, doctor 4, pod-factory CI 4, release-gate 2, and 5 with no CI job yet), command 81, hook 6, agent review 2, none 1.
- List 1: 1 criterion, plus 7 mapped only in a bounded form. List 2: 125 criteria under 33 mechanisms (109 wholly reference-only, 13 partly, 3 with no mechanism in either document). List 3: 22 capabilities, 62 distinct criteria. OPEN: 33 items.
