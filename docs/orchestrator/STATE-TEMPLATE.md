# Preparation state: <project name>

Copy this file to the project as `PREPARATION-STATE.md`. The orchestrator updates it after every
step. Any session can resume from this file alone.

- **Project:** <name>
- **Runtime:** orca | claude-code | codex
- **Current step:** 1 of 6
- **Status:** in progress | waiting on the user | blocked | gate passed
- **Updated:** <date, timezone>

## Gate log

| Gate | Passed | By what evidence | Notes |
|---|---|---|---|
| 1 Your idea |  |  |  |
| 2 Clarify the scope |  |  |  |
| 3 PRD and mockup |  |  |  |
| 4 Technical blueprint |  |  |  |
| 5 Evals and stories |  |  |  |
| 6 Planning review |  |  |  |
| 7 Ready to build |  |  |  |

## Artifacts

| Artifact | Path | SHA-256 | Revision | Valid |
|---|---|---|---|---|
| PRD |  |  |  |  |
| Mockup |  |  |  |  |
| Blueprint |  |  |  |  |
| Eval plan |  |  |  |  |
| Story list |  |  |  |  |
| Review findings |  |  |  |  |

`Valid` is `no` once something upstream of it changed. An invalid artifact is never carried
forward; the run returns to the earliest invalidated gate.

## Questions asked, and the answers

| # | Question | Answer | Kind |
|---|---|---|---|

`Kind` is `product` (the user answered), `default` (a recommended default the user accepted) or
`open` (deferred, still waiting).

## Open questions

| # | Question | Waiting on | Blocks |
|---|---|---|---|

## Decisions

| # | Decision | Who decided | Where it is recorded |
|---|---|---|---|

`Who decided` is the user, a recorded default, or a cited PRD clause — never the orchestrator.

## Findings

| ID | Severity | Resolution class | Status | Closed by |
|---|---|---|---|---|

## Corrections

| Review | Correction used | What changed | Re-review session |
|---|---|---|---|

One automatic plan-only correction per review, then a new review in a new session.

## Freeze

- **Frozen:** no
- **Frozen by:** <user, date>
- **What is frozen:** documents by hash, test files by hash, the exact test command
- **Hashes:** <recorded at freeze>

Nothing may be frozen before gate 6 passes, and only the user may freeze.
