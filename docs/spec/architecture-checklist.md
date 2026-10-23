# Architecture and simplicity: the project's checklist

Part of the build contract, bound by the gate-2 approval like every other `docs/spec/*.md`. It is
not a gate and adds no step: it is what the existing checks and the existing review read. REQ-09
already requires size and complexity tripwires and a simplicity review before anything merges, and
REQ-06 already binds "the significant architecture decisions and boundaries". This file states those
boundaries for this project, so a check can be objective and a reviewer cannot invent criteria. It
also states where a story's authority comes from and where the line falls between an implementation
choice and new product behavior, because the reviewer cannot judge added behavior without both.

## Authority, and what is not approval

A story's authority is one of three things, and it is named in the story file and in the build plan:

- **An explicit request from the approver**, in the approver's own words, in the
  conversation or in a record.
- **An explicitly approved decision**: an approved requirement of the PRD, a gate record, an
  amendment, or an approved decision record.
- **A necessary technical dependency** of an approved requirement — something that requirement
  cannot work without, named as such and justified in one line.

An agent's own idea is a **suggestion**. It goes to `.factory/work/backlog.md` and it is not scope.
Nothing promotes it but the approver accepting it in words, after which it enters through the gate
that carries it: a requirement through gate 1, a contract change through gate 2 and its amendment, a
story through the plan gate 3 authorizes. Silence is not acceptance. Nor is "sounds good", "nice",
or any general encouragement. Nor is approving how a mockup screen looks, which approves that
screen's content and interaction behavior and no feature it suggests.

**Implementation choice or new behavior.** Inside an approved requirement, the implementation is the
agent's to settle: data structures, error handling, module layout, query shape, naming, retries,
logging. What the user sees or depends on is not: new user-visible behavior, a new integration or
external service, a new stored field the product exposes, and any material tradeoff against a
stated production requirement. Those are decisions, however small the code, and they arrive as
decisions rather than as commits.

**A worked example, from a different product, which approves nothing here.** Suppose the approved
requirements are: a Mac application reads the Google calendars the user selects, shows persistent
meeting reminders, and lets the user confirm joining or skip.

| | Example | Why |
|---|---|---|
| Approved | reading the selected calendars; the persistent reminder; confirm-or-skip | the approver asked for them |
| Necessary dependency | storing the authorization credentials securely | the approved requirement cannot read a calendar without them; named and justified in the story |
| Suggestion, not scope | parsing a meeting description for arbitrary links | new user-visible behavior nobody asked for |
| Suggestion, not scope | reminders that work offline | new behavior, and a tradeoff against storage and staleness |
| Suggestion, not scope | a second calendar provider | a new integration |

Each of the last three may be a good idea. Each goes to the backlog with its author and date, and
none of them is built until the approver accepts it in words.

## The boundaries, which are checked automatically (blocking)

1. **No new runtime dependency.** `package-lock.json` is locked; anything new costs an amendment.
   Dev dependencies likewise.
2. **No framework and no ORM.** The tracker is `node:http` and `node:sqlite` with one versioned
   migration (TECH-SPEC, story 11). A framework, an ORM or a query builder is a contract change.
3. **Workspace boundaries.** `packages/cli` is the factory; `packages/tracker` is the reference
   application. Neither imports the other. The tracker never imports from `packages/cli/**`, and the
   factory never imports from `packages/tracker/**`.
4. **Layer direction inside the tracker.** HTTP handlers may import domain and storage; domain may
   import storage; storage imports neither. No cycles.
5. **The check runner runs no application code.** `packages/cli/src/check-runner/**` imports nothing
   from `packages/tracker/**`, and reads evidence as data.
6. **Enforcement code is not application code.** Nothing under `packages/tracker/**` imports the
   records store, the lock or the approval path.

## The judgements, which the reviewer reads (not automatic)

7. **The smallest thing that meets the story.** Unused abstraction, a parameter with one caller, an
   interface with one implementation, configuration nobody sets.
8. **No speculative generality.** No extension point the contract does not ask for.
9. **One obvious place for each decision.** Duplicated rules, or a rule split across layers.
10. **Names from the contract.** The vocabulary of the PRD and TECH-SPEC, not invented synonyms.
11. **Nothing the authority does not carry.** Behavior, a field, a setting, a screen element or an
    integration the story's cited authority does not carry, read from what the diff adds rather than
    from where it lands: a diff entirely inside the approved file scope proves only that, and the
    scope check cannot see added behavior. What is found is named by path and either removed or
    brought back for approval before the story merges; it is never accepted because it works.

## Tripwires, which flag and do not fail

Size and complexity are tripwires with a justification, never failures (ADR-007, mapping C-09-1 and
C-09-6): file length, function length, parameter count, nesting depth and cyclomatic complexity.
A tripwire reports and asks for a line of justification in the handoff note. It never blocks a merge,
and no reviewer may turn one into a blocking finding by itself.

## What makes a finding blocking

A blocking finding must do one of three things: **cite the clause of the approved contract it
violates** — a PRD requirement, a TECH-SPEC section, an eval-plan row, or a numbered item above —
**demonstrate a concrete defect**, an input and the wrong output or a failing case, or **identify a
concrete security problem**, the exposure and what it exposes. Anything else is a preference or an
optional enhancement, and it goes to the backlog at `.factory/work/backlog.md` with its author and
date. A preference never blocks a merge, never blocks delivery and never reopens a story — including
a reviewer's own good idea, which is a suggestion like any other and carries no more weight for
having been found during a review.

## When the review stops

When every item above either passes or is dispositioned, the review is finished and says so. There
is no further round, and no reviewer asks for one because something could be nicer. Repair follows
the existing cap, REQ-09: the story is resumed once inside its own approved scope, by the worker that
built it; a repair that needs a path outside that scope, or that leaves the failure in place a second
time, goes to the approver.
