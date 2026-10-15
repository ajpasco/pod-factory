# ADR-017: What milestone zero proves, and what phase 1b owes

Date: 2026-10-14. Status: **accepted as the boundary for phase 1b's plan**. It adds no requirement, changes no approval rule and binds no new document: where it names work, the authority is the phase-1b row of TECH-SPEC section 13 and ADR-016, and where it names the reference application, the authority is PRD section 3. Decided by: the approver's direction of 2026-10-14 — "First distinguish clearly what milestone zero proves from what phase 1b must deliver. The demonstration must show agents building the approved experience through the workflow — not me manually coordinating another application build." Prepared by the design session.

## Why this exists

Milestone zero is one story from done, and its last steps are ceremonies rather than code. The next phase is the one that has to carry the promise, and the promise is not "the gates exist" but "agents built the approved product and the approver only decided and approved." Those two are easy to confuse while reading a green test run, so the line between them is written here once.

## What milestone zero proves

Each of these is proven by named tests in `docs/eval-plan.md` section 13, by the three check jobs running on every pull request in this repository, and by the record trail on `pod-factory/records`, which is append-only and validated record by record.

1. **A human approval is a record bound to exact content, and the human's own act.** `approve` shows one hash over the statement, the tree, the bound files and the referenced records, and waits for the human to type its prefix; the record stores both. A record whose `shownHash` does not recompute, or whose `typedPrefix` is not a prefix of it, is not the ceremony's output. Every approval in this repository has been re-derived independently before its merge.
2. **CI, not an agent's word, decides whether a pull request may merge.** `gate-check` reads the records branch and refuses with reasons: no approval for this tree, a failing or missing verify result for this tree, a locked path changed. `verify` runs the locked commands itself and records its result as a check result bound to the tree it ran on. An agent's report is never the evidence; the design session deletes the report its own runs produce so it cannot become one.
3. **The lock holds.** After `lock`, a change to a locked path fails `lock-guard` and needs an amendment approval naming that path. The locked command list and the locked patterns are constants in enforcement code, and a locked test checks they match the eval plan.
4. **Revocation reaches CI.** `revoke` writes a revocation record; the scheduled job relays it as a failing `gate-check` on every open pull request that relied on it, and records the block, so `revoke` can report it as enforced rather than asserted.
5. **Agents cannot write the things that would let them approve themselves.** Hook 1 denies every agent file-tool write to `.factory/records/**`, `.claude/settings.json`, `.github/workflows/**` and `.github/CODEOWNERS`, with or without a lock. Records 0005 and 0006 are the approver's acts by machinery as well as by rule.
6. **A story's stage comes from its records, not from its prose.** `story start` and `story finish` write the transitions; a story file that claims a stage its records do not justify is a flag, not a fact. `story start` also refuses when the plan has drifted from what gate 3 approved, when the story's tests are unlocked, or when an input the brief names is not on main.
7. **The ceremony survives a hostile reading of its own documents.** Five defects in this project were caught by the machinery or by the approver's reading rather than by careful drafting, among them a handoff that quietly granted the design session a merge authority nobody had given it, and a review scheme whose evidence would have invalidated the tree it reviewed.

Milestone zero proves all of that **on one project, with a human approval for every pull request, with automatic merging disabled, and with `status` still unbuilt**. It is the enforcement spine and nothing more.

## What milestone zero does not prove

- That agents can take an approved product definition and deliver the product. No story in milestone zero builds a user-facing anything; the only subject is the factory's own CLI.
- Anything at all about product experience: no mockup, no browser or visual review, no accessibility, no responsive behavior, no loading, empty or error states, no database-backed journey, no permission case.
- That execution can be authorized once rather than approved per story. ADR-016 is a design; none of its seven changes is built, and the authorization path is in force nowhere.
- That a recorded review can stand in for a human's per-story approval, because no `review-record` job exists.
- That the sequential workflow exists. The interview, discovery, mockup, red team and dispositions, guided design, the classification command and the human verbs beyond `approve`, `revoke` and `lock` are all unbuilt.
- That `verify` is the full verify step. It runs the locked commands; the restraint checks, scans, security and simplicity reviewers and QA are phase-1b work.
- That a second project can be built here at all. Nothing in the shipped code reads a project name.
- That any of this survives release. There is no release, and the bootstrap exception is still open.

## What phase 1b owes

Grouped, with the authority for each. The phase-1b row of TECH-SPEC section 13 is the list; this is the same list read as deliverables.

1. **Authorized execution**: ADR-016's seven changes — `approve 3` binding its contract and losing cover on revocation, supersession or drift; `gate-check`'s authorization path and its merge-candidate condition; the `review-record` job; `story finish`'s second path to done; revocation reaching every dependent pull request one level deeper; post-merge verification of main whose progression waits for a passing result and whose recovery path is narrow; and repair after an integration failure. Plus the acceptance tests that let it be turned on at all.
2. **The sequential workflow**: start interview and presets, discovery, mockup, red team and dispositions, guided design, the classification command, and the remaining human verbs — acknowledge, answer, amend, waive, delegate, migrate, revert, incident — with delegation carrying citation records.
3. **The full verify step**: restraint checks, scans, the security and simplicity reviewers, QA, and the environment setup REQ-25 names.
4. **The two new gate conditions**: REQ-26's pre-build gap review and REQ-27's product verification, each with the evidence CI records.
5. **The rest of the product surface**: hooks 2 to 6, `explain`, the status page, the Claude Code plugin and skills install, the acceptance packet, and release 0.1 by manual runbook under a bootstrap record, which ends the bootstrap exception.
6. **The reference application**, built through the workflow by agents, as the acceptance test of everything above.

## The gap that is in no plan yet: project scoping

PRD section 3 says the reference application "is a separate project in the repository, built through the workflow like any other." The shipped code cannot do that today. Records carry a `project` field that no code reads; `.factory/` is single-rooted; and the paths gate 2 and gate 3 bind — `docs/PRD.md`, `docs/TECH-SPEC.md`, `docs/eval-plan.md`, `docs/spec/*.md`, `.factory/work/classification/gate-2.json`, `.factory/work/plan/build-plan.md`, `.factory/work/story-<n>/story.md` — are repository-root constants in `lock-policy.ts`. One lock, one build plan and one story numbering exist for the whole repository.

This matters because of the approver's own condition: the demonstration must not be a human coordinating a second build. If the factory cannot address a second project, somebody has to stand in for the part that cannot, and that somebody would be him.

Two ways out, to be settled at phase 1b's gate 2, not here:

- **Project-scoped paths in this repository.** The gate-2 and gate-3 path constants become project-relative, each project gets its own contract, classification, lock, plan and story numbering, and the records' `project` field starts being read and enforced. One records branch, one CI setup, one enforcing copy. This is the design session's recommendation, because it is what PRD section 3 already promises and because a second repository would move the demonstration outside the machinery that is being demonstrated.
- **A separate repository for the application.** Cheaper to reach and worse as evidence: the factory would be shown working twice rather than shown working on two projects, and the second setup — workflows, hook wiring, records branch, protection — is human work that the first one is supposed to have made unnecessary.

Either way the choice is a gate-2 decision for phase 1b, with a cost the approver should see before he approves that contract.

## The reference application

The approver's product decision of 2026-10-14: **a small internal task tracker** — sign-in, a list screen and a detail screen, an editor role and a viewer role, one business-data table, and the agreed screen states and production checks. This is the product input for its own gate 1; it is not a change to the pod-factory PRD, whose section 3 already describes the shape and which names the criteria this application has to exercise that a CLI cannot: the mockup match, the browser and visual review, accessibility, responsive behavior, the loading, empty and error states, and the database-backed journey with its permission cases.

Deliberately not in it: anything beyond what those criteria need. One journey, two roles, one table.

## What the demonstration must show, and who acts

The demonstration is not "the reference application exists." It is: an approved product definition went in, agents built it through the workflow, the records show every authority and every piece of evidence, and the approver's hands appear only where the design says a human must act.

- **The approver acts on product and on gates, and nowhere else.** The interview answers and product decisions; dispositions on the red team's findings; acceptance of the mockup; gate 1, gate 2 and gate 3; gate 4 as acceptance of the product; gate 5 for release. No per-story approval, no merges, no dispatching, no coordination between agents.
- **The factory dispatches.** Starting and finishing stories, refreshing merge candidates, re-running checks and re-reviewing on refresh, and merging authorized content are commands and CI jobs, not messages between sessions.
- **Agents build and review under authorization**, each inside its story's approved file scope, with its review recorded by a job that runs no application code.
- **The evidence is the record trail**, not anyone's summary: the gate records, the authorization, each story's start, review and verify results, the post-merge verification of main, and the acceptance packet.

If a step in that sequence can only be made to work by a person carrying something between two agents, that step is unbuilt, and saying so is the honest outcome — the standing rule of this project is that a rule that cannot be satisfied gets written down rather than worked around.

## Consequences

- Milestone zero's remaining steps stay as they are. Nothing here is built before story one lands.
- Phase 1b's own gate 2 carries three decisions this document does not make: project scoping, whether a delta review suffices when a merge candidate is refreshed, and the thresholds the reference application's production checks have to meet.
- The approver's involvement in phase 1b is bounded by the list above. If the plan that comes back to him for `approve 3` cannot be executed without him in the middle of it, the plan is wrong and the design session says so before he approves it.
