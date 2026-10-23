# From an idea to a production-ready app

This is the product's own route, end to end, and an honest account of how much of it is built. It
exists because the pieces are documented separately and someone reading any one of them would
reasonably conclude the whole path works. It does not, yet.

The authority for what the product promises is [PRD.md](PRD.md). Where this file and the PRD
disagree, the PRD is right and this file is stale.

## What the product promises

> pod-factory is an open-source workflow for building production-ready applications with AI agents,
> where the rules are enforced, not stated. It works with nothing but Claude Code, and it gains
> parallel agents, a board and a control room inside Orca. Other tools organize the work; this one
> enforces it.
>
> **The promise.** You approve a complete product definition and experience. Agents then build a
> production-quality application that matches it, with appropriate architecture, engineering
> practices and end-to-end verification. Stories are internal execution units: you authorize the
> plan once and do not supervise or approve each one. The approved contract defines done, and tests
> and recorded reviews are the evidence that it has been met. What stays yours is the contract, the
> verdict on the finished product, and the decision to deploy.

Two audiences, from the PRD: founders without an engineering background, who approve in plain
language on evidence and things they have clicked through; and engineers building through agents,
who want their quality bar enforced with the diff still in reach.

## Two gate numberings, and how they line up

This trips people up, so it is first rather than buried.

The **PRD names five gates**: requirements, the build contract, authorization to execute,
acceptance of the finished product, release. That is the product.

The **preparation process names seven gates** ([orchestrator/ORCHESTRATOR.md](orchestrator/ORCHESTRATOR.md)).
Those seven are an implementation of the PRD's first two and a half, not a different or competing
scheme:

| PRD gate | Preparation gates |
|---|---|
| Start — interview, preflight | 1 (your idea), 2 (clarify scope) |
| Gate 1 — requirements | 3 (PRD and mockup) |
| Gate 2 — the build contract | 4 (blueprint), 5 (evals and stories), 6 (planning review) |
| Gate 3 — authorization to build | 7 (ready to build), and the ceremonies inside it |
| Build and verify | [orchestrator/BUILD.md](orchestrator/BUILD.md) |
| Gate 4 — acceptance of the product | **nothing yet** |
| Gate 5 — release | **nothing yet** |

So "gate 7" and "gate 3" are both current and mean different things. When in doubt, say
"preparation gate 7" or "PRD gate 3".

## The route, stage by stage

Each stage says what the contract promises, what exists today, and the verdict. "Exists" means
there is code or a written process that has been exercised; "written" means a document nobody has
run; "absent" means neither.

### Day one — setup

**Promised.** An interview one question at a time: what the product does, for whom, the stack,
where it runs, who is on the project. A preflight that checks the enforcement *can* be installed.
For founders, a managed setup that installs it for them. In an existing codebase, a discovery step
that maps conventions, measures coverage, flags risky areas and vulnerable dependencies, and
proposes project rules for approval before any design.

**Today.** The enforcement installs by hand: a packed global install of the CLI, branch protection
on the trunk and the records branch, the hook enabled in project settings. `doctor` reports a
missing or wrongly-resolved binary. The interview exists as preparation gates 1 and 2.

**Absent:** the preflight, the managed setup, and the codebase-discovery step. **A founder cannot
start this alone today.** Someone comfortable with a terminal, GitHub branch protection and a
global npm install has to set the machine up first.

### Stage 1 — requirements

**Promised.** A PRD where every requirement has its user, its flow and its acceptance criteria; a
throwaway clickable mockup you click through; **four fresh-context reviewers** arguing against the
document as a skeptical founder, a security reviewer, an operations engineer and a feasibility
reviewer; every finding fixed, deferred or dismissed with a reason you acknowledge.

**Today.** Preparation gate 3 produces the PRD with stable numbered requirements and the mockup,
checked against `rubrics/prd.md` by a checker in a fresh session, with a two-step human review.
Exercised once, on the equipment-checkout trial: 182 labelled criteria, each stated as a business
outcome.

**Gap:** one checker against a rubric, not four adversarial reviewers in named roles. The security,
operations and feasibility readings the PRD asks for are not happening.

### Stage 2 — the build contract

**Promised.** A design that resolves ordinary technical choices itself and brings the rest to you in
one consolidated review, with phases, interfaces, non-goals, budgets, a threat review and
production readiness including the release runbook; one review reading PRD, mockup and architecture
together; an eval plan turning every acceptance criterion into positive and negative tests, shown
as plain English regenerated from the tests themselves; tests run and classified *before* the
approval that locks them.

**Today.** Preparation gates 4 to 6: the blueprint with a 182-row verification register and a pinned
interface contract, the eval plan with 257 rows across four stories, and a planning review by a
fresh checker whose findings became a costed decision list. Every criterion is traced to the
mechanism that will prove it, both directions. The lock mechanism is real and enforced.

**Gaps:** the threat review and the production-readiness section are thin or absent in practice —
the equipment blueprint's own section 13 is titled "Production concerns excluded". The plain-English
regeneration from the tests is not implemented. Budgets exist in the PRD and in ADR-007, not in the
loop.

### Stage 3 — authorization to build

**Promised.** Stories, one requirement each, with tests, interfaces, the files they may touch,
budgets and caps; a fresh reviewer checking the plan for gaps; a packet with estimated tokens and
days; **one approval authorizing the whole plan**, after which agents execute without returning to
you per story.

**Today.** Preparation gate 7 covers getting there: the tests written as code, failing the way the
plan predicted, shown satisfiable, reviewed by someone who did not write them, visible to the
enforcement, and the ceremonies run by you and verified from the record. `approve 3` binds the
build plan and its story files. `story start` refuses unless every dispatch precondition holds.

**Gaps.** The estimate packet does not exist. And **one lock, one build plan and one story
numbering serve the whole repository** (ADR-017, ADR-021): the slots `story-1` to `story-3` belong
to the factory's own work, so a second project cannot currently get stories at all. That is the
blocker in front of the equipment trial today, not a detail.

### Stage 4 — build and verify

**Promised.** Builders in their own worktrees with only their story, holding no credentials, writing
the minimum code that passes their acceptance tests. Before anything merges: traceability of every
new file and endpoint to a requirement, code no test exercises, size and complexity tripwires,
secret and dependency scans, a fresh-context security review, a simplicity review, and QA against
the requirements with evidence. Merges one at a time with the combined application verified after
each. Budget and loop caps that park a story and ask you.

**Today.** [BUILD.md](orchestrator/BUILD.md) describes the loop and it has been exercised once, for
the meeting-reminder trial: a builder implemented one story in scope, CI re-ran the locked commands
on the pull request's own tree, `gate-check` held the merge until an approval bound that exact tree,
and `story finish` refused to call it done until the merge was in the trunk's history. The scope
whitelist is real: a changed path outside the story's `Scope:` fails the gate, including a path
nobody predicted.

**Gaps, and they are the largest in the product.** Of the pre-merge checks the PRD names, only a
secret scan exists. **Traceability, dead-code detection, complexity tripwires, dependency scanning,
the security review, the simplicity review and QA-with-evidence are all absent.** So a story today
is accepted when its frozen tests pass and its scope held — which is a real guarantee, and a much
weaker one than the contract promises. Parallel builders, the board and notifications are
phase-1b-and-later and not built.

### Stage 5 — acceptance of the product

**Promised.** When the authorized plan is built, a fresh agent writes an acceptance packet for the
*application*: a working preview you click through, a plain-language account of what was built, the
requirements covered, the evidence from every check and recorded review, the delegated decisions,
screenshots, what remains uncertain, and four closing lines. Acceptance is yours and cannot be
delegated.

**Today. Absent.** Nothing produces an acceptance packet. There is no code, no rubric and no written
process for PRD gate 4. A finished application today is a set of merged stories with green checks,
and nobody has written down how you would decide the *product* is right.

### Stage 6 — release

**Promised.** A release candidate built and verified first. A checklist binding the exact revision,
artifact, environment, configuration and migrations, with evidence per item, a rehearsed rollback,
and the security condition: every scan and review complete, no unresolved blocking finding, every
exception a visible waiver. You sign off on the release and its rollback together. A release agent
deploys that exact artifact through an executor holding the credentials, so no model sees them. A
confirmed smoke-test failure triggers the pre-approved rollback at once.

**Today. Absent, and misleadingly so.** `LOCKED_PATTERNS` already names `release/smoke/**`,
`release/scripts/**` and `release/runbook.yaml` — and `release/` does not exist on the trunk. The
lock is reserving paths for machinery nobody has written. Reading the lock list, you would think
there is a release phase.

## The deviation currently in force

The PRD is explicit: *"Stories are internal execution units: you authorize the plan once and do not
supervise or approve each one."*

Both the preparation process and `BUILD.md` currently require **a human approval per story**.
ADR-020 records this as a deliberate narrowing for the trial, not an oversight — milestone zero
exists to prove the approval path itself, so every merge is approved on purpose. It is a deviation
from the approved contract and should be lifted deliberately, by amendment, rather than drifting
back.

## So where does this actually get you today

An idea becomes a numbered PRD, a mockup, a technical blueprint with every criterion traced to a
mechanism, an eval plan with positive and negative tests for each requirement, and a set of stories
— all reviewed by sessions that did not write them, all accepted by you. Then, for one story at a
time, a builder writes code it cannot grade, against tests it cannot change, and the merge is held
until a human approval binds the exact tree.

That is a real and unusual guarantee: **the standard is set before the work starts and the agents
doing the work cannot move it.** It is also, honestly, as far as it goes. What you get is an
application verified against its own acceptance tests. What the product promises is a
production-ready one. Between those two sit the pre-merge check suite, product acceptance and
release — none of which is built.

## What would close the gap, in the order worth doing it

1. **Make a second project possible at all** (ADR-017's gap: one lock, one plan, one story
   numbering). Nothing else can be demonstrated end to end until this is resolved.
2. **The pre-merge check suite** — traceability, untested code, dependency scan, security review,
   simplicity review, QA with evidence. The largest gap between promise and practice, and the one
   that most changes what "done" means.
3. **PRD gate 4, product acceptance.** Cheapest of the three to write and the one a founder notices
   first: without it nobody can say the product is right, only that the tests passed.
4. **PRD gate 5, release** — and in the meantime, stop reserving `release/` paths in the lock for
   machinery that does not exist.
5. **Day-one setup**: the preflight and the managed install, without which a founder cannot begin.
6. **Lift the per-story approval** by amendment, once milestone zero has done its job.

## Starting it today

Preparation: the `pod-prepare` skill, or the sentence *"Act as the preparation orchestrator. Follow
`docs/orchestrator/ORCHESTRATOR.md`. The project is `<name>`."*

Build, after preparation gate 7: the `pod-build` skill, or the same sentence against
`docs/orchestrator/BUILD.md`.

Both run on Claude Code alone; [orchestrator/RUNTIMES.md](orchestrator/RUNTIMES.md) covers Codex and
Orca. One caution recorded there and worth repeating: the older `pod-preparation` skill drives the
`orchestration/` preparation service, **not** these gates, and that service's generators do not meet
`rubrics/eval-plan.md`. Invoking it does not run this process.
