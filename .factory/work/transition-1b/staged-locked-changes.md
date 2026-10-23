# Staged changes to locked paths: the scope-authority rules

Two of the files the scope-authority rules belong in are **locked paths**, so an agent cannot edit
them and this file holds their text instead, the way story 3 and story 4 stage their workflow
changes under `.factory/work/story-*/workflows/`. Nothing here is applied.

```
$ pod-factory hook pre-tool-use   # Edit docs/eval-plan.md
docs/eval-plan.md is locked by lock be0a85b73df2, which follows gate-2 approval e4f8452d5d6a.
Agents cannot change locked files. A change goes through a pull request and
"pod-factory approve amendment --pr <n> docs/eval-plan.md", run by the approver from a terminal
outside any agent session; CI's lock-guard fails the pull request otherwise.
```

`templates/checklists/simplicity-review.md` refuses identically, under the pattern
`templates/checklists/**` in `lock-policy.ts`.

**Which human act applies them.** Both ride the transition pull request, which is where every other
locked-path change in this package already sits: milestone zero's lock is revoked in action 1, the
transition pull request merges under `pod-factory approve bootstrap <pr>` while nothing is locked,
and the phase-1b lock then covers the amended files. No separate amendment is needed on that path.
If the approver would rather apply them while the current lock stands, each file costs one
`pod-factory approve amendment --pr <n> <path>` over a pull request carrying only these edits. The
author of this file cannot do either.

---

## 1. `templates/checklists/simplicity-review.md`

**Add two rows to the fixed checklist**, after row 8:

```
| 9 | Does the diff add behavior, a field, a setting, a screen element or an integration the story's **Authority** does not carry? | each, with its path, or "none" |
| 10 | Does any change settle something that is not an implementation detail - new user-visible behavior, a new integration, or a material tradeoff against a stated production requirement? | each, with its path, or "none" |
```

**Add one line under "Read first"**, so the reviewer has the authority in front of them:

```
Row 9 is answered from what the diff adds, never from where it lands: a diff that stayed inside the
story's approved file scope proves only that, and the scope check cannot see added behavior.
```

**Replace the disposition paragraph.** Current text:

> - **Blocking**, with the clause it violates — PRD requirement, TECH-SPEC section, eval-plan row, or
>   a numbered item of the architecture checklist - **or** a concrete defect: the input, the wrong
>   output, and why it is wrong.
> - **Preference**, which goes to `.factory/work/backlog.md` with your name and the date, and blocks
>   nothing.

Replacement:

> - **Blocking**, which must do one of three things: cite the clause it violates — PRD requirement,
>   TECH-SPEC section, eval-plan row, or a numbered item of the architecture checklist — demonstrate
>   a concrete defect, the input and the wrong output with why it is wrong, or identify a concrete
>   security problem, the exposure and what it exposes.
> - **Preference or optional enhancement**, which goes to `.factory/work/backlog.md` with your name
>   and the date, and blocks nothing: not the merge, not delivery, and not the story. Your own good
>   idea is a suggestion like any other and carries no more weight for having been found in a review.

An answer of "none" to rows 9 and 10 is an answer. Leaving either unanswered is a bundle
`review-record` refuses, which is the existing structural rule and needs no new code.

## 2. `docs/eval-plan.md`

Four new rows and three rewordings. No new test ID is reused, and every new row is NB — the
behavior does not exist yet — so none of them changes the baseline count of sixty.

**Reword T-07-P1**, adding the authority to the fields a plan check would read. Only the Given
clause changes; the status column keeps the `NB: no plan verdict` it already carried, since no plan
check exists to read any of those fields today:

> Given a build plan whose every story lists **its authority**, requirement and test IDs,
> interfaces, file scope, budgets, caps, agent and model, when the plan is checked, then it passes.

T-07-N1 needs no change: "a story missing any one of those fields" now covers a missing authority.

**Add T-07-N13**, after T-07-N1, status `PN (P1)`, integration, check-runner:

> Given a story whose authority names no approved requirement ID, no approved record and no
> technical dependency of a named requirement — a story resting on a suggestion or a backlog entry —
> when the plan is checked, then it fails naming the story.

**Add T-01-P7 and T-01-N4**, in the REQ-01 block, e2e, cli, status
`NB (no interview and no approve 1 yet; owed by the phase that builds them)`:

> T-01-P7: Given a PRD draft in which every requirement names its authority — a request the approver
> made, an approved decision, or a named technical dependency of an approved requirement — and in
> which every agent proposal sits in the draft's proposals list, when the draft is checked, then it
> passes.
>
> T-01-N4: Given a requirement with no authority, or one whose authority names an entry in the
> proposals list or the backlog, when gate 1 approval is attempted, then it is refused naming the
> requirement.

**Reword T-09-P13**, adding the two checklist rows:

> Given a review that answers every line of the fixed checklist, **including the added-behavior and
> implementation-or-decision rows**, with each blocking finding citing a contract clause,
> demonstrating a concrete defect or identifying a concrete security problem, and each preference or
> optional enhancement recorded in the backlog, when `review-record` runs, then it writes the
> passing check result and the review is finished with no further round.

**Reword T-09-N28** to match the three bases:

> Given a review that omits a checklist line, adds a criterion of its own, or raises a blocking
> finding with no citation, no demonstrated defect and no identified security problem, when
> `review-record` runs, then it writes no passing result and names which.

**Add T-26-N2**, after T-26-N1, e2e, cli, status `NB (story-9)`:

> Given a gap finding that names no approved journey or requirement it blocks, or states no
> consequence, or proposes no resolution, when gate 2 is approved, then it is refused naming the
> finding.

T-26-P1 gains the same three fields in its positive form:

> Given a gap review recorded against the PRD, the mockup and the architecture with every finding
> dispositioned **and each finding naming what it blocks, its consequence and the smallest
> resolution**, when gate 2 is approved, then the approval proceeds and its record references the
> review.

## What these rows do and do not prove

Every row above is structural: a field is present or absent, a checklist line is answered or not, a
finding carries one of three bases or none. Whether the authority a story names is the true reason
the story exists, and whether a reviewer who answered "none" to row 9 was right, is judgement. No
row here asks a machine to read meaning, and none should be written to.
