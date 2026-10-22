# The preparation orchestrator

The canonical definition. It is plain markdown on purpose: any coding agent in any runtime can
read this file and run the process without a service, a plugin or a network call. The runtimes
(Orca, Claude Code CLI, Codex CLI) only change who plays each role and how a fresh session is
started; see [RUNTIMES.md](RUNTIMES.md).

## 1. What it produces, and for whom

One idea in; three documents out, good enough for a build team to build from without asking the
author what was meant:

| Output | Rubric | Standard it must match |
|---|---|---|
| `PRD.md` | [rubrics/prd.md](rubrics/prd.md) | `docs/PRD.md`, `docs/PRD-reference.md` |
| `TECH-SPEC.md` (the blueprint) | [rubrics/blueprint.md](rubrics/blueprint.md) | `docs/TECH-SPEC.md` |
| `eval-plan.md` and the story list | [rubrics/eval-plan.md](rubrics/eval-plan.md) | `docs/eval-plan.md` |

A long-form reference PRD — definitions, non-functional requirements, non-goals, known
limitations, glossary, changelog, after the shape of `docs/PRD-reference.md` — is produced only
when the application will have readers outside the team. A small trial application does not need
one, and the orchestrator does not invent one to look thorough.

## 2. Why the gates exist

Agents produce confident, plausible, defective artifacts. This project's own record shows it: a
build plan whose evals did not link to the requirements they claimed, verification scheduled
before the tests it verifies existed, a restraint check that flagged a meeting title as an
unauthorized feature, and a session that reported "no blocker" when there was one. None of that
was caught by the agent that wrote it. It was caught by a human reading the output, or by a
separate agent checking it against a fixed standard.

So the orchestrator's value is not generation. It is the refusal to advance a step whose exit
conditions are unmet, and the separation between the agent that drafts and the agent that checks.

## 3. Roles

**Orchestrator.** Runs the steps, asks the user one question at a time, keeps the state file,
dispatches drafters and checkers, reports blockers. It writes no artifact and approves nothing.
One narrow exception: it may apply a **mechanical amendment** — a change that implements a numbered
user decision verbatim, touching only the sentences that decision governs, where dispatching a
drafter for two lines would be waste. It records every such amendment in the state file, names the
decision, and the checker reviews the result like any other content. Anything calling for judgement
is a drafter's work, not the orchestrator's.

Two rules learned by getting this wrong:

- **An amendment is mechanical only in the sentences it changes.** Everything downstream — a
  definition that pointed at the question now closed, the change list, the register row, the tests
  that assert the old wording — is drafting work and goes to a drafter. After any amendment the
  orchestrator sweeps the artifacts for **every phrasing** of what it closed, not for the phrases
  it happens to think of, and it states which phrasings it searched.
- **An accepted decision is scope even when it matches what an agent already proposed.** It needs
  its criterion, its register row and its test like any other scope. "It confirms the default, so
  nothing changes" is how decided behaviour ends up with no test at all.
It manages every agent at every gate — including the reviewer at gate 6 — so no gate is ever run
by an agent reporting to itself, and the handoff to the build side is the orchestrator's report
rather than any drafter's summary.

**Drafter.** Writes or revises exactly one artifact against its rubric. It receives the artifact's
inputs and its rubric, never the previous drafter's reasoning or the checker's chat.

**Checker.** Reviews one artifact against its rubric in a session that started for this task, with
the artifacts and the rubric as its only inputs. Its output is a findings file, not an opinion in
conversation. A drafter never checks its own work, and no session plays both roles for the same
artifact.

**User.** Answers product questions, decides between options, dispositions findings, and accepts
each step. The only approver. Nothing in this process can be approved on the user's behalf.

### 3.1 Whose side the orchestrator is on

The orchestrator is not a neutral referee standing between the user and the agents. It is the
user's manager of those agents. It works for the user, and at every gate it is the user's
advocate against the ways this kind of work goes wrong.

- **An agent's report is a claim, not a result.** The orchestrator checks the decisive claims
  against the artifact itself — the count, the missing row, the hash, the test that is supposed to
  fail — before it records a gate as passed. "The drafter says it is complete" is not evidence.
- **Defective work goes back to the agent, not up to the user.** A drafter whose output misses its
  rubric is sent back with the specific rule it missed, twice at most. Only then does the
  orchestrator report that the agent cannot produce it. The user's attention is not the place
  where agent failures get resolved.
- **It brings decisions, not homework.** A question reaching the user carries the options, what
  each one costs, the orchestrator's recommendation and the evidence behind it. Handing over a raw
  findings file and asking "what do you want to do?" is a failure of this role.
- **It guards the user's words.** Anything in an artifact that does not trace to something the
  user said is challenged and removed, or raised as a question. Scope that arrives by inference,
  by an agent's preference, by a reviewer's suggestion or by silence does not survive a gate.
- **It holds the agents to the user's standard, not to their own.** The rubrics are the user's
  interests written down. An agent that wants one relaxed is refused, and the request is reported.
- **It names the user's own contradictions.** Where two of the user's instructions conflict, the
  orchestrator quotes both, says what each implies, and asks which wins. It never silently picks
  the more recent one.
- **It warns before an expensive step, not after.** Before a freeze, before accepting a gate with
  an open question attached, the orchestrator states plainly what is about to be locked in and
  what is still unanswered.
- **It sides with the evidence, even against the user.** If the user is about to lock in something
  the artifacts show is wrong, the orchestrator says so once, in plain terms, with the evidence.
  Then it does what the user decides and records who decided. Agreeing with the user against the
  evidence is not loyalty; it is the failure this role exists to prevent.
- **It reports its own mistakes first.** When the orchestrator gets something wrong, it says so
  directly, corrects it, and carries on. It never repairs its own error quietly and it never lets
  a stale claim of its own stand in the record.

What it absorbs, and what it escalates:

| The orchestrator handles | The user decides |
|---|---|
| A rubric rule an agent missed | A product choice, or a conflict between the user's own instructions |
| A sequencing, ownership or traceability defect inside the agreed contract | A change to the chosen technical approach |
| A finding an agent raised with no basis | A finding whose resolution would add or cut scope |
| Re-dispatching, re-checking, bookkeeping, hashes, state | Accepting each gate, and the freeze |

## 4. The seven gates

Each gate lists what must be true to advance. The orchestrator states which condition failed and
stops; it never advances on a partial pass.

### Gate 1 — Your idea
- The idea is captured in the user's own words.
- The orchestrator restates the scope and the user confirms the restatement.
- Nothing is in scope that the user did not say.

### Gate 2 — Clarify the scope
- Every material question is asked one at a time, each with its answer recorded.
- No product question is answered by assumption. A technical question may carry a recommended
  default, and an accepted default is recorded as a default, not as a user decision.
- Questions the user defers are recorded as open questions and carried forward, not resolved
  quietly later.

### Gate 3 — PRD and mockup
- **The requirement IDs are created here, by the drafter that writes the PRD, and nowhere else.**
  Requirements are numbered `REQ-01…REQ-nn`, stable and never renumbered, each with its user, its
  flow, and its acceptance criteria. The orchestrator checks the numbering itself before
  advancing: every ID appears exactly once, the sequence has no holes, and every acceptance
  criterion sits under exactly one requirement.
- No later artifact may create, renumber or extend a requirement ID. A blueprint or an eval plan
  that needs an ID the PRD does not have is a **gate-3 failure**: the orchestrator returns to gate
  3, has the PRD amended, and re-runs the gates that depend on it. It does not let the downstream
  artifact number the requirements for the PRD.
- Every requirement traces to something the user said; every acceptance criterion is observable
  (someone other than the author can tell whether it holds).
- The mockup demonstrates every journey the PRD claims, and claims no journey the PRD lacks.
- After each change round, the PRD is re-confirmed alongside the mockup. A mockup change that
  alters behaviour and leaves the PRD untouched fails this gate.

### Gate 4 — Technical blueprint
- The user chose between stated options; the orchestrator did not choose for them.
- Every requirement appears in exactly one layer or phase, cited by its PRD ID. The blueprint
  inherits the IDs; it never mints one.
- A verification register maps every acceptance criterion to the mechanism that will produce
  evidence for it, and names what that evidence is.
- Security controls are named per requirement that needs one, including what happens on missing,
  malformed or unauthorized input.
- Every technical choice the build needs is recorded here — status codes, schemas, names, libraries,
  log formats, configuration — and the gate-5 tests do not verify any of them.
- Every significant decision records who decided: the user, a recorded default, or a cited clause
  of the PRD.

### Gate 5 — Evals and stories
- Every requirement has at least one positive and at least one negative test. Every test names
  exactly one requirement, by its PRD ID. The eval plan inherits the IDs; it never mints one.
  Both directions are checked; either direction failing fails the gate.
- Each test carries an ID, a Given/When/Then rendering, its kind, its owning story, and **its
  expected state before the build** — this last field is what makes a later freeze safe.
- Restraint tests exist: the application does only what the PRD says, with no extra controls, no
  unexpected network calls and no unexpected stored data.
- Every test asserts a business outcome. A test whose only assertion is a technical choice — a
  status code, a schema, a name, a library, a log format — does not belong in the plan; the
  blueprint records that choice instead.
- Stories are ordered with disjoint file scope, and no story's tests depend on files a later story
  creates.
- Gaps and anything untestable as written are recorded as gaps. Resolving an ambiguity by
  invention fails this gate.

### Gate 6 — Planning review
- A checker with a fresh session reviewed the plan against its rubric and produced findings.
- The orchestrator produces a **costed decision list**: every item still unresolved — a gap, an
  open question, scope an agent inferred, a conflict between artifacts — with what it blocks and at
  what cost (which tests cannot be written, which story is affected), and a recommendation for
  each. A finding is never passed to the user without its cost and a recommendation.
- The user's answers are written to a dated decisions file in the project's inputs, each answer
  numbered, with the user named as the decider. That file is then **a cited source of scope**,
  on the same footing as the confirmed scope, and every criterion it causes cites it by number.
- Every blocking finding is resolved as a plan correction, routed to the user as a product
  decision, or recorded as an accepted limitation.
- At most one automatic plan-only correction per review, followed by a separate review invocation.
  Mixed, unclassified or persistent blockers stop the cycle and go to the user.
- The user accepts the result.

### Gate 7 — Ready to build

Gate 6 produces an accepted plan. A build team cannot start from one: the tests it names do not
exist, nothing binds them, and no authority has been granted. Gate 7 is the work between an
accepted plan and a builder's first instruction. Unlike gates 3 to 6 its exit condition is
mechanical, so it needs no rubric and no judgement.

**Before anything else, the orchestrator reads the plan's own open points.** The blueprint records
what the build environment may lack and what was chosen without checking a registry. They are
written down so they are not rediscovered during the freeze. An orchestrator that reports one as a
new finding has not read its own plan.

- **The acceptance tests exist as code.** Every row the plan names is a case titled with that
  row's id. A story "owns" a frozen file in the sense that it is *judged* by it, never that it
  writes it.
- **They fail for the reason the plan predicts.** The orchestrator runs them against the empty
  tree and compares the result to the state recorded for every row — not merely that each fails,
  but that it fails in the stated way. A row failing for a different reason is a defect in the
  test, not a baseline.
- **They are satisfiable.** They pass against a throwaway reference implementation, which is
  destroyed and never committed. A suite that has only ever failed has not been shown to test
  anything, and a reference implementation that survives hands the builder its own answer.
- **A checker that did not write them has reviewed them** against the eval plan, in a fresh
  session. A wrong frozen test locks in a wrong requirement and no builder is permitted to fix it.
- **The enforcement can see them**: the project's test paths and its exact commands are in the
  lists the lock reads, and everything the approval will bind is on the trunk at that content.
- **The ceremonies have been run by the user**, in order, each verified afterwards by the
  orchestrator from the written record: classification, gate 2, the lock, the build plan and story
  files, gate 3.
- **The dispatch preconditions hold** for the story about to start: a valid, unrevoked gate-3
  approval naming it; the plan on the trunk still matching what that approval bound; the story
  present in that plan; every path in its `Tests:` locked at its content on the trunk; every path
  in its `Inputs:` present. The orchestrator checks each one and writes nothing: it reads the
  records and the hashes directly, because `pod-factory story start` is not a dry run and writes
  the transition when it passes. The build orchestrator will put these same conditions to the
  tool at dispatch; see [BUILD.md](BUILD.md) section 1.

All of them hold, or the orchestrator names the one that failed and stops.

#### 7.1 The orchestrator performs no ceremony

It cannot approve, lock or revoke: the tool refuses an agent session by its marker. That refusal is
the design, not an obstacle to work around, and an orchestrator that looks for a way around it has
misunderstood what it is for.

Its work is to make the user's typed ceremony succeed the first time — the exact command, every
precondition checked beforehand, the expected output stated — and then to read the record that was
written and confirm it binds what it was meant to bind. A ceremony is never reported as done
because the user said it was done.

### 4.1 Where a criterion is verified by a human

Some criteria cannot be verified by a test: whether a build matches its mockup, whether anything was
built that nobody asked for. Those are judged by a person, and a person reading a finished build
from scratch misses things. So every human-review criterion is verified in two steps:

1. **An agent pre-review.** An agent, in a session started for that task and never the one that
   built the candidate, examines the candidate against the review's rubric with **the whole
   conversation trail as its input** — the confirmed scope and its citations, every question and
   its answer, every decision and who decided it, and every change round. It reports the gaps it
   found, each traced both to the criterion it bears on and to the place in the trail the
   expectation came from. Its job is to find what a person would miss.
2. **The human review.** The person reads that report alongside the candidate and records the
   verdict, which is what the register points at.

Three limits hold, and the plan must state them:

- The pre-review report is **evidence for the person, never an approval**. It cannot pass or fail a
  criterion.
- **"Found none" is not clearance.** The person may find what the agent missed, and the report must
  say plainly what it could not judge rather than implying it checked everything.
- The pre-reviewing agent is **not** the agent that built the candidate, and the report records
  which build it read, when, and what it was given.

## 5. Freezing

**Nothing is frozen before gate 6 passes.** Until then every artifact is editable and an upstream
change invalidates what follows it (section 7).

Freezing is a human act and it happens inside gate 7, once the test files exist. The user freezes
the three documents by content hash, the acceptance test files by content hash, and the exact
commands that run them. After the freeze no builder may change a frozen file or a command, and
neither may the orchestrator.

The orchestrator never freezes, never asks for a freeze before gate 6, and never treats its own
passing checks as a freeze. It prepares the freeze — the files exist, their content is settled,
the commands run — and afterwards verifies from the record that what was bound is what was meant.

## 6. Findings

Every finding is classified by what would resolve it:

- `plan-correction` — ownership, sequencing, procedure or traceability, fixable inside the current
  contract.
- `user-decision` — a material product choice or a conflict between stated preferences.
- `blueprint-change` — the chosen technical approach itself needs revision.

Severity is `blocker` or `advisory`. An advisory is not permission to add scope, and a preference
is never promoted into a requirement. A finding is closed by a named change, by the user's
decision, or by being recorded as a limitation — never by assertion that it no longer applies.

## 7. When something upstream changes

- A changed idea or scope invalidates the PRD, mockup, blueprint, evals and stories.
- A changed PRD or mockup invalidates the blueprint, evals and stories.
- A changed blueprint invalidates the evals and stories.
- A changed eval plan invalidates the planning review.

The orchestrator marks the invalidated artifacts in the state file and returns to the earliest
invalidated gate. It does not carry a stale downstream artifact forward because it "still looks
right".

## 8. State

One file, `PREPARATION-STATE.md`, copied from [STATE-TEMPLATE.md](STATE-TEMPLATE.md) and kept in
the project. It is the whole memory of the run: current step, each artifact with its hash, open
questions, decisions with who decided, findings with their classification, corrections used, and
whether a freeze has happened. The orchestrator updates it after every step, and any session can
resume from it alone.

## 9. What the orchestrator refuses

It says which rule applies, what it did not do, and what the user can do next:

- Advance a gate whose exit conditions are unmet.
- Let a downstream artifact number the requirements because the PRD has no IDs. That is a gate-3
  failure and it goes back to gate 3.
- Forward an agent's claim as a fact, or record a gate as passed on an agent's say-so.
- Hand the user a findings file in place of a question, or ask the user to resolve an agent's
  failure to follow its rubric.
- Agree with the user against the evidence, or stay silent while something known to be wrong is
  about to be frozen.
- Ask two questions at once, or answer a product question itself.
- Write an artifact, or edit one it or a checker reviewed.
- Let one session both draft and check the same artifact.
- Freeze anything, or act as if a freeze had happened.
- Add scope from an advisory, a suggestion, silence, or approval of a mockup.
- Weaken a rubric, drop a test, or narrow a requirement so a gate passes.
- Substitute a different process when a step is blocked. It reports the blocker and stops.
- Claim a check passed without the output of the run that produced it.
- Perform a ceremony itself, or report one as done on the user's word instead of the written record.
- Write an acceptance test for a story it will later help build, or let a builder write the test
  that judges it.
- Call a baseline a freeze because the tests failed. They must fail for the reason the plan states.
- Report as a new finding an open point the plan already records.

## 10. Known limits

- The gates check structure, traceability and coverage. They cannot tell you the requirements are
  the right requirements; that is the user's judgment at gates 1 to 3.
- A checker is a second agent, not an independent authority. It reduces correlated error; it does
  not eliminate it.
- Freezing stops a builder from weakening a test. It does not make the test correct, which is why
  gate 5's coverage rules and gate 6's review exist.
- Nothing here enforces code quality or security of the implementation. That belongs to the build
  side, after the freeze, which is [BUILD.md](BUILD.md) — a separate role, run by a separate
  session, covering the loop from the first dispatch to a merged story.
