# ADR-020: The preparation orchestrator

Date: 2026-10-20. Status: **accepted as the preparation flow, outside the factory's enforcement**.
It adds no requirement, changes no approval rule and binds no document: `docs/PRD.md`,
`docs/TECH-SPEC.md` and `docs/eval-plan.md` are bound by the gate-2 approval and are untouched by
this decision. Decided by: the approver's direction of 2026-10-19 and 2026-10-20. Prepared by the
design session.

**On the number.** Main's highest is ADR-017, but 018 and 019 are already claimed on the parked
`phase-1b-docs` branch by `ADR-018-milestone-transition-and-execution-boundaries` and
`ADR-019-frozen-test-migration`. Neither is on main and neither is approved, but both predate this
one, so this takes 020 rather than reusing a number. ADR-015 to ADR-017 are on main and in force.

## Why this exists

ADR-017 names the sequential workflow as something phase 1b owes and records that none of it is
built. Its front half was then prototyped as a local service, which produced plans nothing could
dispatch. Two things were missing: a definition of who does what between an idea and a buildable
plan, and a standard each artifact has to meet. This records both, and the two product rulings that
shaped them.

The reason it is worth having at all is in this project's own record. The agents here — including
the design session — reliably produce confident, plausible, defective artifacts: a build plan whose
evaluations did not link to the requirements they claimed; verification scheduled before the tests
it verifies existed; a restraint check that flagged a meeting title as an unauthorized feature;
fourteen frozen tests that would have passed against an empty application; a session reporting "no
blocker" when there was one. None of that was caught by the agent that produced it. Each was caught
by a human reading the output, or by a separate agent checking it against a written standard.

## What is decided

**Seven gates**, each with exit conditions the orchestrator refuses to advance past: the idea; the
scope, clarified one question at a time; the requirements document and mockup; the technical
blueprint; the evaluations and stories; the planning review; and readiness to build. Nothing is
frozen before the sixth passes, and the freeze itself happens inside the seventh.

Gate 7 was added on the same day this was written, after a first attempt to make a project
build-ready showed that gates 1 to 6 end with an accepted plan while a builder needs a frozen,
authorised one, and that the work between them had no stated exit conditions. Unlike gates 3 to 6
its conditions are mechanical, so it carries no rubric.

**Four roles.** The orchestrator runs the steps, keeps one state file, dispatches the others and
writes no artifact. A drafter writes exactly one artifact against its rubric, and never sees another
drafter's reasoning or a checker's conversation. A checker reviews in a session started for that
task, with the artifacts and the rubric as its only inputs, and never checks what it drafted. The
user answers, decides and accepts, and is the only approver.

**Four written rubrics** — for the requirements document, the blueprint, the eval plan and the
review — which are the user's interests written down. An agent that wants one relaxed is refused and
the request is reported.

**The orchestrator works for the user.** It is not a referee between the user and the agents; it is
the user's manager of those agents. An agent's report is a claim until checked against the artifact.
Defective work goes back to the agent, not up to the user. Anything reaching the user carries the
options, the cost and a recommendation. Scope that arrives by inference, preference or silence does
not survive a gate. And it sides with the evidence even against the user, once, plainly, before
doing what the user decides and recording who decided.

**Two product rulings, which changed the shape of the artifacts:**

1. **Technical work belongs to the blueprint, and acceptance tests do not verify it.** A criterion
   states a business outcome; status codes, schemas, module and file names, libraries, build tools
   and log formats are recorded in the blueprint and verified by nothing. A test may use any
   surface — a function, the API, the database, the browser — to observe an outcome, but what it
   asserts must be something a business requirement claims. A refusal is observable as a refusal:
   the action does not happen, nothing changes, and the person is shown what the requirements say.
2. **Where a person judges a criterion, an agent pre-reviews first.** An agent in a session started
   for that task, never the one that built the candidate, examines the candidate against the
   review's rubric with the whole conversation trail among its inputs, and reports the gaps it
   found, each traced to the criterion it bears on and to the place in the trail the expectation
   came from. Then the person reads that report alongside the candidate and records the verdict. The
   report is evidence and never an approval; it cannot pass or fail a criterion; and "found none" is
   not clearance, so it must say what it could not judge.

**Portability.** The definition and the rubrics are plain markdown with no dependencies, so the
process runs in Claude Code alone, in Codex CLI, or in Orca, which changes only how a session is
started and how the user is prompted. Copying `docs/orchestrator/` and the `prep-*` agent
definitions into another repository is the whole installation.

## What this is not

- **Not inside the factory's enforcement.** No gate here is a gate-2 approval, nothing is bound by
  a lock, and no CI check reads any of it. It produces the documents a governed build would need; it
  does not govern.
- **Not the build half.** Freeze, dispatch, check and accept are scoped and unbuilt, so a plan this
  flow produces cannot yet be handed to a builder under protection.
- **Not a second project mechanism.** It writes into a project folder by convention. The shipped
  enforcement code still reads no project name.
- **Not a quality check.** It produces a plan whose requirements are traced and covered. Whether the
  implementation is clean or secure is the build side's problem, and nothing checks it yet.

## Terminology, to prevent a collision

`docs/PRD.md` REQ-08 and REQ-13, and `docs/TECH-SPEC.md` sections 3.2 and 7 (*Builders*), already
use **orchestrator** for the build-side role that dispatches stories, supplies builder inputs and
relays questions. Checked against **main at 6db310a**, not against this branch's stale copies. The
role in this ADR is the **preparation orchestrator**, and it stops where the build begins. In shared
documents, neither is called "the orchestrator" without its qualifier.

## One deliberate deviation from the approved contract

Main's PRD is **0.10**, in force by amendment record 0006, and its gate 3 reads: "you approve, and
that one approval authorizes the agents to execute the plan: to create the stories, implement them,
review, verify, correct, hand off and progress without returning to you for each one." The
equipment-checkout trial does **not** follow that model. The approver directed per-story human
approval for this trial, and the preparation was run that way. That is a narrowing the approver
chose, not the contract's approval model and not a defect in either. A reader comparing the trial to
PRD 0.10 should expect this difference and no other.

## Evidence this produced

The equipment-checkout application, prepared to the rubrics: 17 requirements, 182 labelled
acceptance criteria, 182 verification rows each naming its mechanism and the evidence it produces,
257 tests of which 253 are expected to fail and none claims to pass before the build, four stories
with disjoint file ownership, and no open question. Three full reviews returned sixteen blockers,
then six, then none, followed by a focused re-check that returned none. Twenty-seven decisions are
recorded with the user named as decider, and six orchestrator errors are recorded as errors.

Nothing was executed. The commands and the version lines are written, not run.

## Consequences

- Phase 1b's list in ADR-017 keeps everything it owed; this covers the definition and the standard
  for the front half, not the authorized execution, the full verify step, the two new gate
  conditions or the reference application built through the workflow.
- Making any of this part of the contract — a requirement in `docs/PRD.md`, a mechanism in
  `docs/TECH-SPEC.md`, a test in `docs/eval-plan.md` — is a gate-2 act, because the first two are
  bound by the gate-2 approval and the third is a locked path. This ADR deliberately does not do it,
  and the amendment it would need is the approver's to run. What such an amendment would have to
  say: that preparation has seven gates with stated exit conditions; that drafting and checking are
  separate sessions; that a criterion is a business outcome and the technical record lives in the
  design; and that a human-judged criterion is preceded by an agent pre-review that cannot approve.
- Landing this on main needs an ordinary pull request. While a lock is in force, no agent authority
  covers that merge: `approve bootstrap` counts only before the first lock exists, and a docs pull
  request has no story approval for gate-check to find. The route is an approver ceremony — revoke
  the lock, reopen gate 2, re-approve, re-lock — which was run on 2026-10-18 to land stories two and
  three. The agent-side limitation is recorded in
  `docs/projects/meeting-reminder/FACTORY-BLOCKER.md`, which exists only on the trial branch
  `pull-stablyai-orca-repo`.
