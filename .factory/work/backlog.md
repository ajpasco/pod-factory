# Backlog: suggestions and deferred requests, which are not scope

The file `docs/spec/architecture-checklist.md` and `templates/checklists/simplicity-review.md`
already send things here. This is that file, and it exists so that a suggestion has somewhere to go
that is not the contract.

**Nothing in this file is approved scope.** No story may cite an entry here as its authority, and no
builder may implement one. An entry leaves this file only when the approver accepts it in words and
it enters through the gate that carries it: a requirement through gate 1, a contract change through
gate 2 and its amendment, a story through the build plan gate 3 authorizes. Until then it stays
written down and unbuilt, which is the point: a suggestion is kept rather than lost, and kept rather
than built.

Three kinds of entry arrive here. The first two are suggestions; the third is the approver's own
request, held for later on the approver's instruction, which is why it is written down rather than
built:

- **A reviewer's preference**, from a review whose finding cited no clause, demonstrated no defect
  and identified no security problem.
- **An agent's own idea**, met while drafting requirements, designing, planning or building.
- **A deferred request from the approver**: work the approver asked for and explicitly told the
  factory not to do yet. It is an authority for nothing until it enters through a gate, the same as
  the other two, and the reason is the same: a requirement that never passed gate 1 has no
  acceptance criteria, no criterion-to-control mapping and no tests. Its detail goes in the section
  below the table, because a row cannot hold it.

One row per entry, newest last. Date, author, the suggestion in one sentence, and where it came from.
Accepted entries keep their row and gain the record that accepted them, so the trail from a
suggestion to approved scope stays readable.

| Date | Author | Suggestion | Where it came from | Status |
|---|---|---|---|---|
| 2026-10-16 | Allan Pasco (approver) | The tech-spec builder must produce the team's approved blueprint: stack and architecture recommended then approved, concrete simplicity and security rules with a three-layer default, testability and traced evidence, phases and stories with dependencies and parallel work, `.env` handling where it fits, and Docker where it helps — detail in "B-01" below | a deferred request from the approver, 2026-10-16, in the same instruction that said not to implement it or widen the running test | `open` (deferred by the approver; not scope) |

Status is `open` or `accepted <record ID>`. An entry is never silently deleted; a suggestion the
approver declines is marked `declined` with the date, because the same idea arriving twice is worth
knowing about.

## Deferred requests, in detail

### B-01 The tech-spec builder produces the team's approved blueprint

Recorded 2026-10-16 on the approver's instruction, which was to preserve it and not to implement it.
Nothing below is approved scope, no story may cite it, and it does not change the build plan, the
contract or the running test. What the approver asked for, in the approver's own terms, kept whole so that a later
gate 1 has the request itself rather than an agent's paraphrase:

1. **Architecture, module responsibilities and stack.** Define the architecture, the folder and
   module responsibilities, and the technology stack. Recommend a stack, let the approver change it,
   and obtain approval before implementation.
2. **Concrete simplicity and security rules.** No more than three architectural layers by default,
   fewer where that fits; an additional layer needs a justified exception the approver approves.
3. **Design for testability.** Acceptance criteria, the relevant tests, the commands that run them
   and the evidence they produce, each traced to the approved PRD and design — not to the spec
   alone.
4. **Phases and stories.** Dependencies, execution order, shared interfaces, and parallel work
   identified explicitly rather than left implied.
5. **Configuration and secrets.** `.env` for local configuration where it fits, `.env.example` with
   placeholders, real secrets in proper storage — and no project forced to carry `.env` when it does
   not need one.
6. **Docker where it helps**, particularly for backend and database projects, with a documented local
   fallback where one is needed, and without claiming that the fallback proves container deployment
   works.

Evaluation points, which are the four the approver named: the blueprint before implementation, each
story during development, the combined candidate before merge, and the complete journeys at
acceptance.

Latitude, which is the rule this backlog already serves: builders choose implementation details
inside the blueprint; a change to scope, stack, architectural boundaries or acceptance criteria
needs approval; an optional enhancement comes here. Everything is proportional to project size,
reuses the existing templates and review mechanisms, and states plainly which part is automated
enforcement, which is a planned check and which is reviewer judgement.

**Where it would extend what exists, if it is ever approved.** Written so the later work reuses
documents rather than inventing them, and verified against the tree at the time of writing:

- Items 1 and 4 already have homes: PRD gate 2 and REQ-04 for the design and its decisions, PRD
  REQ-07 and `.factory/work/plan/build-plan.md` for stories with dependencies and what may run in
  parallel. The request's new part is the recommend-then-approve step for the stack, stated as such.
- Item 2 extends `docs/spec/architecture-checklist.md`: its items 1 to 6 are the objective
  boundaries and item 4 is already layer direction. A three-layer default with an approved exception
  would be a numbered boundary beside them, and the exception would be the amendment path that
  already governs that file.
- Item 3 extends `docs/eval-plan.md` and `docs/spec/criterion-to-control-mapping.md`, which already
  map every acceptance criterion to one control; "traced to the PRD and design, not the spec alone"
  is a statement about what those two files must cite.
- Item 6 is largely REQ-25 already: it chooses containers or a supported local setup, records the
  mode, keeps the local setup faithful to deployment, and has CI build and test the deployment image
  even when the developer runs locally without Docker — which is the honesty the request asks for.
- Item 5 has no home at all. No `.env`, `.env.example` or placeholder convention appears in the PRD
  or the tech spec today; REQ-21 covers deployment credentials only, through a hidden prompt, the
  keychain or a secret manager. This is the genuinely new requirement of the six.
- The four evaluation points map to REQ-26 (the pre-build gap review), REQ-09 (the per-story review
  and the combined verification on main after each merge) and REQ-27 (approved journeys at
  acceptance). What is new is naming the blueprint's own items as what the first of those reads.
