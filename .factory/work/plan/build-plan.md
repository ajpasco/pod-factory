# Build plan: phase 1b

The build plan gate 3 approves for phase 1b (TECH-SPEC section 3.3, step 4). `pod-factory approve 3` binds this file and every story file it names, as they are on main; `story start` refuses once either changes. Milestone zero's one-story plan is superseded; story-1 stays done and is not repeated here.

## How this plan runs

**The phase opens with a transition, not with a story.** One revocation, one pull request, and one
signature. The pull request carries the nine enforcement changes ADR-019 specifies, the documents with
every blocking gap-review finding closed in them,
the `packages/tracker` skeleton with one passing scaffold test, the new locked command with its one
locked-test edit, the browser dependencies in the lockfile, and the tracker's clickable mockup with
the `docs/spec/mockup-1b.md` that gate 2 binds. It is green: every locked command exits zero on it.
It merges under `approve bootstrap <pr>` while nothing is locked, because every check that judges a
pull request runs from main's own code under `pull_request_target` — so new enforcement installs
while it is inert. The fourteen acceptance tests are then written and
independently reviewed on `pod-factory/frozen-tests`, gate 2 and the lock follow, one
`approve tests` signs every test's hash, and **gate 3 comes last**, binding the contract, the lock
and that inventory together. **No failing test is ever merged**, which is why the
expected-failure allowance ADR-018 proposed is not built here: ADR-019 replaced it. The transition
is not a story, so story-2's number stays retired; phase 1b's stories are story-3 to story-16,
keeping the numbers the eval plan uses.

**The tests are frozen before they exist.** Each story's acceptance test is reviewed and
hash-signed before any implementation, and arrives on main only in the pull request whose
implementation passes it, unchanged — one byte of difference and lock-guard refuses it, and a
missing one makes gate-check refuse. Nothing in this plan waits on a lock amendment. Correcting a
frozen test before it merges costs one more signature and no re-lock; correcting a locked test
after it merges is the ordinary per-pull-request amendment, which is already shipped. Story 7 is
unchanged — REQ-28, an amendment as merge authority for a correction that belongs to no story. What
no amendment can touch is a locked *command*: adding one still costs a revocation and a re-lock,
and nothing here needs it.

**Approvals.** Stories 3 to 6 carry a per-story approval, as milestone zero did. Story 6 builds the alternative authority; when it has merged and its rows T-10-P5, T-10-N7, T-10-N8 and T-10-N9 pass on main, **and** main's protection has "branches up to date before merge" back on with `doctor` checking it, **and** every required check has been demonstrated passing and refusing, per-story approvals stop. Stories 7 to 16 then merge on the gate-3 authorization plus machine evidence, with no human record. Nothing about gates 1, 2 and 3, the lock, amendments, revocations or product acceptance changes: those stay human-only, and acceptance is never delegated. "Human-only" means the approval path refuses an agent session and every such record is attributable and cannot be erased - a guardrail and a trace, not a barrier an agent holding the operator's credentials could not cross. Ending per-story approvals therefore removes a guardrail and puts mechanical evidence in its place; it does not remove a prevention, because there was none.

**Nothing is allowed to fail.** A candidate passes every locked command, its own acceptance tests
included. Other stories' tests are not on main yet, so there is nothing for them to break and
nothing to excuse. Product acceptance requires every required test passing.

**Every story names its authority, and a suggestion is not one.** Each story below opens with an
**Authority** bullet, repeated in its story file, which is one of three things: an explicit request
from the approver, an explicitly approved decision — an approved requirement, a gate record, an
amendment — or a necessary technical dependency of an approved requirement, named and justified in
one line. Nothing else authorizes a story. An agent's idea, a reviewer's preference and anything in
`.factory/work/backlog.md` are suggestions: they may be good, and they are not scope until the
approver accepts them in words, after which a new story needs a fresh gate-3 authorization like any
other plan change. A story is not widened by a builder who finds something worth adding; that goes
to the backlog, and `docs/spec/architecture-checklist.md` holds the rule and its worked example,
including where the line falls between an implementation choice the builder settles and new product
behavior that needs a decision.

**Scope of the demonstration.** The reference application is built at `packages/tracker` as a deliverable of this project. It demonstrates the gated workflow building a database-backed product with its own mockup, roles and screen states. It does **not** demonstrate independent-project onboarding: it shares this repository's records branch, protection, workspace and lockfile, and nothing in the machinery reads a project field.

## Stories

| Order | Story | File |
|---|---|---|
| 1 | story-3: the merge candidate | `.factory/work/story-3/story.md` |
| 2 | story-4: the review bundle and its record | `.factory/work/story-4/story.md` |
| 3 | story-5: the traceability check | `.factory/work/story-5/story.md` |
| 4 | story-6: authorized execution | `.factory/work/story-6/story.md` |
| 5 | story-7: the maintenance amendment | `.factory/work/story-7/story.md` |
| 6 | story-8: coordination without a human in it | `.factory/work/story-8/story.md` |
| 7 | story-9: the pre-build gap review | `.factory/work/story-9/story.md` |
| 8 | story-10: the classification produced by CI | `.factory/work/story-10/story.md` |
| 9 | story-11: the tracker skeleton | `.factory/work/story-11/story.md` |
| 10 | story-12: sign-in, sessions and roles | `.factory/work/story-12/story.md` |
| 11 | story-13: the list, the detail and their states | `.factory/work/story-13/story.md` |
| 12 | story-14: the production checks | `.factory/work/story-14/story.md` |
| 13 | story-15: the browser journeys and permission cases | `.factory/work/story-15/story.md` |
| 14 | story-16: the mockup review evidence | `.factory/work/story-16/story.md` |

Stories run one at a time, in this order. Parallel execution is phase two.

## story-3: the merge candidate

- **Authority:** an approved requirement — REQ-10, with ADR-016 item 2 as the approved design: evidence binds the content that would land.
- **Tests that define done:** T-10-P6 and T-10-N10 in `packages/cli/test/merge-candidate.test.ts`. The gate-check rows that use the candidate (T-10-N8, T-10-P5) are story 6's.
- **Interface:** verify and the review bundle bind the candidate — the pull request's head merged with main as it stands. gate-check requires the merge base to be main's current head and names the candidate it would need when it is not. When main moves, the branch refreshes and both run again.
- **File scope:** `packages/cli/src/check-runner/verify.ts`, `packages/cli/src/check-runner/job.ts`, `packages/cli/src/git-tree.ts`, and the staged workflow change under `.factory/work/story-3/workflows/`, applied by the approver.
- **Measured in the lab, so build it this way:** compute the candidate with `git merge-tree --write-tree`, merge main into the subject and refuse if the subject's tree is not the candidate; name `headCommit`, `mainCommit` and `candidateTree` in the manifest; have verify-record recompute the candidate from the manifest's main commit and bind that tree; have gate-check recompute it against main as it stands and name the candidate that would have to be verified. A merge conflict is a refusal, not a pass.
- **The staged workflow change:** the verify job's `subject` checkout has no `fetch-depth: 0` (`pr-checks.yml:55-58`; only the enforcer checkout has it), and a depth-one subject cannot be merged with main — `merge-tree` refuses unrelated histories. The approver applies that one line, because `.github/workflows/**` is hook-protected and locked.
- **The operational cost, stated:** once evidence binds the candidate, **any** movement of main invalidates every open pull request's verify, including a docs-only commit, and nothing re-runs the checks on a main push — `pr-checks.yml` triggers only on pull-request events. Stories run one at a time, so at most one pull request is affected and the re-run is the orchestrator's; a phase with parallel builders would need main pushes to re-run the checks, or a merge queue.
- **Dependencies:** the transition pull request, and the frozen test signed with it.

## story-4: the review bundle and its record

- **Authority:** an approved requirement — REQ-10, with ADR-016 items 3 and 6 as the approved design: a recorded review is evidence; the reviewer never writes the record.
- **Tests that define done:** T-10-P7 and T-10-N11 in `packages/cli/test/review-record.test.ts`. T-10-N7, which is gate-check refusing without a review, is story 6's.
- **Interface, the review's content:** the review answers `templates/checklists/simplicity-review.md`, which is fixed, in order, adding nothing to it. Two of its lines carry the scope-authority question: whether the diff adds behavior, a field, a setting, a screen element or an integration the story's cited authority does not carry, answered from what the diff adds rather than from the file scope it stayed inside, and whether anything in it settles more than an implementation detail. Those two rows are staged in `.factory/work/transition-1b/staged-locked-changes.md` because that checklist is a locked path only the approver can change. A **blocking** finding must cite the clause of the approved contract it violates - a PRD requirement, a TECH-SPEC section, an eval-plan row, or a numbered item of `docs/spec/architecture-checklist.md` - **or** demonstrate a concrete defect, an input with its wrong output, **or** identify a concrete security problem, the exposure and what it exposes. Anything else is a **preference** or an optional enhancement, which goes to `.factory/work/backlog.md` and blocks neither the merge nor delivery; `review-record` refuses a bundle whose blocking finding carries neither a citation nor a demonstrated defect, and refuses a blocking finding whose only basis is a tripwire. When every item is answered and every finding dispositioned, the review says it is finished, and there is no further round. A repair follows the existing cap, REQ-09: once inside the story's own scope, by the worker that built it, and a second failure or a path outside that scope goes to the approver.
- **Interface:** a reviewer writes a bundle outside the tree under review — findings with dispositions, the digest of the diff it read, its session and model identity, and screenshots where a review is visual — and pushes it to the reviews branch. A new `pod-factory ci review-record` job reads that bundle as data, checks its manifest names this pull request, head commit and head tree, recomputes the diff digest itself, checks every finding is dispositioned and none open, and writes the check result. It runs no application code. The reviewer's trust boundary is stated in TECH-SPEC section 11: CI proves a review artifact exists and binds the exact content, not that the review was thorough.
- **Measured in the lab:** `review` is not a valid check name. `CHECKS` in `records/format.ts:25` holds only `verify`, `lock-guard` and `gate-check`, and `validate.ts:286` rejects anything else, so every review record is **flagged and ignored** and `records-validate` exits 1. Adding `review` to `CHECKS` is part of this story, and it is a change to what the validator accepts, so it is enforcement and it is human-approved like the rest.
- **File scope:** a new `packages/cli/src/check-runner/review-record.ts`, `packages/cli/src/check-runner/job.ts`, `packages/cli/src/records/format.ts`, and the staged workflow job under `.factory/work/story-4/workflows/`, which the approver applies because `.github/workflows/**` is hook-protected and locked.
- **Dependencies:** story 3.

## story-5: the traceability and boundary checks

- **Authority:** an approved requirement — REQ-09, with mapping controls C-09-4 and C-09-12 and trace-tag convention O17.
- **Tests that define done:** T-09-P2, T-09-N4, T-09-P12 and T-09-N25 to T-09-N27 in `packages/cli/test/traceability.test.ts`, written and reviewed on the frozen branch like every other story's.
- **Interface, part one:** a check that every new file and endpoint carries a trace tag naming an approved requirement, and reports by path what does not.
- **Interface, part two — the objective boundaries of `docs/spec/architecture-checklist.md`, items 1 to 6.** The same check reads the diff and **fails**, naming the path and the item, on a new runtime or dev dependency, a framework, ORM or query builder, an import across a forbidden workspace boundary, a layer-direction violation or a cycle inside the tracker, an import of application code into the check runner, or an import of the enforcement layer into the tracker. These are objective: they are read from the import graph and the lockfile, not judged.
- **Interface, part three — the tripwires stay tripwires.** File length, function length, parameter count, nesting depth and cyclomatic complexity report and ask for a line of justification in the handoff note. They never fail a merge, per ADR-007 and mapping C-09-1 and C-09-6, and nothing turns one into a blocking finding by itself.
- **File scope:** a new `packages/cli/src/check-runner/traceability.ts`, a new `packages/cli/src/check-runner/boundaries.ts`, `packages/cli/src/check-runner/job.ts`.
- **Dependencies:** the transition pull request, and the frozen test signed with it.

## story-6: authorized execution

- **Authority:** an approved requirement — REQ-10, with ADR-016 items 1, 2 and 4 as the approved design.
- **Tests that define done:** T-10-P5, T-10-N7, T-10-N8 and T-10-N9 in `packages/cli/test/authorized-execution.test.ts`.
- **Interface:** gate-check gains one alternative to the per-story approval: a valid unrevoked gate-3 authorization covering the story, a passing verify and a closed review bound to the merge candidate, the diff inside the approved scope, traceability clean, and the locked-path rule satisfied. The story a pull request claims comes from its verifying transition record **bound to that pull request's head tree**, never from the branch name: the lab showed that matching on "this story is verifying" alone lets three pull requests claim one story at once, and lets a later pull request cut from main claim it again, because the handoff note is by then on main. The transition's `binds.tree` is the head tree `story finish` recorded (`commands/story.ts:224`), which is the binding to use - no record gains a field. `story finish` gains the same alternative, so a story can reach done without a human record; today it refuses, because `commands/story.ts:244` requires a story approval, and the lab left the story stuck at `verifying` after an authorized merge. A human approval bound to the head tree stays a valid path and is the only path outside an authorized story's scope.
- **File scope:** `packages/cli/src/check-runner/gate-check.ts`, `packages/cli/src/commands/story.ts`, `packages/cli/src/commands/doctor.ts` for the up-to-date protection check.
- **Dependencies:** stories 3, 4 and 5, and the transition window. **This story is the switch**, and automatic merging is not enabled until its rows pass, protection requires branches up to date, and every required check has been demonstrated passing and refusing.

## story-7: the maintenance amendment

- **Authority:** an approved requirement — REQ-28.
- **Tests that define done:** T-28-P1 and T-28-N1 to T-28-N5 in `packages/cli/test/maintenance-amendment.test.ts`.
- **Interface:** `pod-factory approve amendment --pr <n> <path>...` extends to unlocked paths and becomes merge authority for that one pull request, binding its entire changed-file set with each file's content before and after. An unnamed file in the diff, a further commit that changes the content, a missing verify result for that tree, a locked path without its own amendment, or an agent session each refuse. One pull request, one tree, one merge; never reusable, never delegable.
- **Measured in the lab, and it changes the shape:** today `approve amendment` refuses an unlocked path outright - "not locked, so no amendment is needed" (`commands/approve.ts:211-214`) - so a correction touching only unlocked files has **no route at all**, which is the gap REQ-28 names. And the authorization cannot be one record when a locked path is involved: `lock-state.ts:53` marks a whole amendment stale if any one path's before-hash does not match the lock, so a record mixing a locked path with a modified unlocked path is stale and the lock rule refuses it. So the authorization is the **union of that pull request's unrevoked amendments bound to its head tree**, `approve` refuses to mix locked and unlocked paths in one record, and an unlocked-path amendment carries `refs: []` - naming the lock would put an unlocked file into the effective lock hashes with no pattern covering it.
- **What it is, stated plainly:** a human override. It requires verify, the lock rule and a record naming every changed file, and it requires no scope, no trace tag and no review; the lab merged a diff through it that a story's scope would have refused. That is what makes it maintenance rather than a second way to build.
- **File scope:** `packages/cli/src/commands/approve.ts`, `packages/cli/src/check-runner/gate-check.ts`, `packages/cli/src/check-runner/lock-guard.ts`.
- **Dependencies:** story 6.

## story-8: coordination without a human in it

- **Authority:** an approved requirement — REQ-19 Operations — and the approver's explicit request of 2026-10-15: human approvals stay where they are required, the coordination around them is automated.
- **Tests that define done:** T-19-P6 and T-19-N7 in `packages/cli/test/coordination.test.ts`.
- **Interface:** when an approval, amendment or review lands on the records or reviews branch, the existing relay re-runs gate-check for the pull request it names, so no one re-runs a check by hand. The orchestrator dispatches the reviewer automatically when a story branch is pushed, as a separate local session, never the builder's.
- **File scope:** `packages/cli/src/check-runner/relay.ts`, `packages/cli/src/commands/story.ts`, and the staged workflow permission change under `.factory/work/story-8/workflows/`, applied by the approver.
- **Dependencies:** story 4.

## story-9: the pre-build gap review

- **Authority:** an approved requirement — REQ-26.
- **Tests that define done:** T-26-P1 and T-26-N1 in `packages/cli/test/gap-review.test.ts`.
- **Interface:** `approve 2` requires a recorded gap review over the PRD, the mockup and the architecture with every finding dispositioned, and refuses while one blocking finding is open, naming it. Each finding names the approved journey or requirement it blocks, the consequence of leaving it, and the smallest resolution; a finding missing the consequence or the resolution is refused structurally. A gap report never widens the contract by stating a gap: the behavior it proposes reaches scope only through the approval or amendment that carries it, which is `approve 2` over the amended contract, not the review itself.
- **File scope:** `packages/cli/src/commands/approve.ts`, `packages/cli/src/records/format.ts`.
- **Dependencies:** story 4, which supplies the review record.

## story-10: the classification produced by CI

- **Authority:** approved requirements — REQ-05 and REQ-06: the classification is evidence, and an agent's report is never evidence.
- **Tests that define done:** T-06-P13 and T-06-N12 in `packages/cli/test/classification-ci.test.ts`.
- **Interface:** a job runs the locked commands on the approved tree and publishes the report and a classification record signed by the check runner; `approve 2 --classification` accepts that record as well as a hand-written bootstrap one. The bootstrap schema and the 0005 fixture stay valid, because six test files name them.
- **File scope:** a new `packages/cli/src/check-runner/classify.ts`, `packages/cli/src/commands/approve.ts`, `packages/cli/src/records/format.ts`.
- **Dependencies:** the transition pull request, and the frozen test signed with it.

## story-11: the tracker skeleton

- **Authority:** approved scope — PRD section 3, the reference application. The skeleton itself is the technical dependency every later tracker story rests on, and it carries no user-visible behavior of its own beyond the health endpoint the production checks require.
- **Tests that define done:** T-27-P4 and T-27-N5 in `packages/tracker/test/skeleton.test.ts`.
- **Interface:** an HTTP server with no framework, `node:sqlite` for storage, one versioned idempotent migration creating the single business table, a seed for development and tests, configuration from the environment with documented defaults and fail-fast on a missing required value, `/healthz`, and one structured JSON log line per request.
- **File scope:** `packages/tracker/src/**`.
- **Dependencies:** story 6.

## story-12: sign-in, sessions and roles

- **Authority:** approved requirements — REQ-27's permission cases and PRD section 3's two roles, with the approved mockup for what each role sees. Password hashing, the session cookie and server-side authorization are the technical dependencies those cannot work without; nothing else about accounts is in scope.
- **Tests that define done:** T-27-P5, T-27-N6 and T-27-N7 in `packages/tracker/test/auth.test.ts`.
- **Interface:** sign-in and sign-out, passwords hashed with `node:crypto` scrypt, a session cookie that is HttpOnly and SameSite=Lax, two roles, and every write authorized on the server regardless of what the page offers.
- **File scope:** `packages/tracker/src/**`.
- **Dependencies:** story 11.

## story-13: the list, the detail and their states

- **Authority:** approved requirements — REQ-23's screen states and REQ-27's journeys, bound to the approved mockup: the list, the detail, and each one's loading, empty and error state. A screen element the mockup does not show is a suggestion, not a story.
- **Tests that define done:** T-27-P6, T-27-P7 and T-27-N8 in `packages/tracker/test/screens.test.ts`.
- **Interface:** the list and the detail view, each with its loading, empty and error states as the mockup shows them; the editor may create and edit, the viewer may only read, and the viewer's attempt is refused by the server with the reason.
- **File scope:** `packages/tracker/src/**`.
- **Dependencies:** story 12.

## story-14: the production checks

- **Authority:** an approved requirement — REQ-27's production checks, each against the threshold the contract states, with the thresholds themselves approved at gate 2.
- **Tests that define done:** T-27-P3 and T-27-N3 in `packages/tracker/test/production.test.ts`.
- **Interface:** each check the contract names runs against the threshold it states and records the threshold it met: dependency audit clean at high and critical, secret scan clean, the list endpoint's p95 under its stated limit at the seeded row count, cold start under its limit, accessibility with no serious or critical violation, configuration documented with fail-fast, the migration run recorded against an empty database, structured logs with a request id and no personal data, a built artifact that runs from `node`, and a smoke script that signs in and lists and exits non-zero on any failure.
- **File scope:** `packages/tracker/src/**`, `packages/tracker/scripts/**`.
- **Dependencies:** story 13.

## story-15: the browser journeys and permission cases

- **Authority:** an approved requirement — REQ-27's end-to-end journeys with their failure and permission cases. Playwright and its browsers are the named technical dependency, installed and approved with the phase's lock so no story pays an amendment for them.
- **Tests that define done:** T-27-P1 and T-27-N1 in `packages/tracker/test/journeys.test.ts`, driven by Playwright.
- **Interface:** every approved journey end to end in a real browser, with its failure and permission cases, at 375 and 1280 pixels wide, each screen's loading, empty and error state asserted, and the run's screenshots and results in the evidence bundle. Playwright and its browsers are in the lockfile before the phase-1b lock, approved together, so no story pays an amendment for a dependency.
- **File scope:** `packages/tracker/test/journeys.test.ts` is locked; the story's work is in `packages/tracker/src/**` and `packages/tracker/playwright/**`.
- **Dependencies:** story 14.

## story-16: the mockup review evidence and the acceptance record

- **Authority:** approved requirements — REQ-27 and REQ-10's acceptance sentence. PRD section 2: **gate 4 is acceptance of the product**; gate 5 is release, and release is not in this phase.
- **Tests that define done:** T-27-P2 and T-27-N2, and T-10-P9, T-10-P10 and T-10-N14 to T-10-N19, in `packages/cli/test/mockup-review.test.ts`.
- **Interface, part one:** the recorded browser review against the approved mockup, through story 4's bundle and record path: screenshots of the approved screens, the revision reviewed named in the record, no finding left open, and acceptance refused without it.
- **Interface, part two — the acceptance record, which has no producer today.** `approve` refuses every gate but 2 and 3 (`commands/approve.ts:279-283`), so nothing can write the gate-4 record REQ-10 requires. The record itself needs no schema change: a gate approval with `gate: 4` is already valid (`records/validate.ts:202-204`), and `binds` already carries a tree and a file-hash map. What is missing is `pod-factory approve 4`, which binds the accepted revision's tree and the acceptance packet's hash, shows both in the ceremony, and **refuses** unless the product-verification evidence is complete and nothing blocking is open: a story the gate-3 plan names that is not done, a required check without a passing result bound to that revision's tree, a recorded review for that revision with an open blocking finding, a packet missing a section or the four closing lines or carrying code in its summary, a revision that moved after the packet was written, or an agent session. Acceptance is never delegated and no machine evidence substitutes for it.
- **Interface, part three:** correct the label collision ADR-018 names. The per-story approval prints "Gate 4" (`commands/approve.ts:188`), which is the PRD's name for acceptance; the two cannot share it once acceptance exists.
- **File scope:** `packages/cli/src/check-runner/review-record.ts`, `packages/cli/src/commands/approve.ts`, `packages/tracker/playwright/**`.
- **Dependencies:** stories 4, 14 and 15 — acceptance can only check evidence those stories produce.

## What the approver does, in order

Each line is one act. Nothing in it is an agent's to perform. Gate 3 comes last, after the lock and
the frozen-test inventory, and binds all three: an authorization over an incomplete chain is worth
nothing, and `approve 3` refuses to write one (ADR-019).

1. **Revoke** milestone zero's lock — the one act that opens the transition, and the only one that
   loosens anything. `revoke` names every path that stops being locked and asks for the word and
   eight characters of the hash. Without it nothing in `.github/workflows/**`, the lockfile or the
   locked tests can change at all: a milestone's last story seals main.
2. **Apply the staged workflow changes** this plan names, because `.github/workflows/**` is
   hook-protected as well as locked.
3. **`approve bootstrap <pr>` and merge the transition pull request**: the nine enforcement changes,
   the documents with every blocking gap-review finding closed in them, the tracker skeleton, the
   new locked command, the browser dependencies, the clickable mockup with `docs/spec/mockup-1b.md`,
   this plan and its story files. Every check is green on it. Before you approve: click the mockup,
   and read the gap review's second reading, which is written against that mockup inside this pull
   request. REQ-26 blocks gate 2 by name while a blocking finding is open.
4. **Nothing.** The fourteen acceptance tests are written and independently reviewed on
   `pod-factory/frozen-tests`, one session each, before the lock exists.
5. **Run the phase-1b classification**, write its classification record, then
   **`approve 2 --classification <record>`** and **`lock`**. The classification describes a green
   suite, because no failing test was ever merged.
6. **`approve tests --from pod-factory/frozen-tests <the fourteen paths>`** — one act, after the
   lock, since the record names it. The ceremony shows every path with its hash.
7. **`approve 3`**, binding this plan, its story files, the gate-2 contract, the lock and the
   inventory, with a reference to each. It refuses unless the gate-2 files still match main, a lock
   is in force that main has not drifted from, and the inventory covers every test path the story
   files name. From here a story may start. The complete sequence, with the demonstration behind
   each act, is `.factory/work/transition-1b/transition-package.md`.
8. **Approve and merge stories 3 to 6**, one at a time.
9. **Turn "branches up to date before merge" back on.** It is off today, which means two pull
   requests that pass separately can break main together; `doctor` checks it from story 6 onward.
   It stays off until here because while a story needs its own approval, an update from main moves
   the head tree and the approval binds content, so a renewed approval is needed whenever an
   approved candidate changes - at most once per story with stories running one at a time, not
   twice for every story. Candidate verification and this setting are complementary and automatic
   merging needs both: the binding alone leaves a stale green merge-able, and the setting alone
   leaves the evidence bound to the branch head rather than to what would land.
10. **Nothing per story from story 7 onward**, while the five conditions hold.
11. **Accept the product — gate 4**, with `approve 4`, which story 16 builds: stories 11 to 16 done, every required check passing for the revision accepted, every recorded review closed, and the acceptance packet bound beside the revision. Gate 5 is release and is not in this phase.

Not on this list, deliberately: no amendment for a batch of tests, no second transition pull
request, and no approval of any kind between stories 7 and 16 unless a check refuses and asks for
one.

## Estimate

Fourteen stories, one at a time, plus the transition's one pull request and the fourteen
acceptance-test sessions, each with its own reviewer. Stories 3 to 10 are machinery in `packages/cli`; stories 11 to 16 are the reference application. About 400,000 tokens for each machinery story and 300,000 for each application story, one builder session each. The count is the plan, not a forecast: if a story cannot be built as written, it is written down rather than split silently.
