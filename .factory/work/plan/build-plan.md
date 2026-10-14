# Build plan: milestone zero

The one-story build plan that gate 3 approves (TECH-SPEC section 3.3, step 4). `pod-factory approve 3` binds this file and every story file it names, as they are on main; `story start` refuses once either changes.

## Stories

| Order | Story | File |
|---|---|---|
| 1 | story-1: `pod-factory status` | `.factory/work/story-1/story.md` |

## story-1: `pod-factory status`

- **Requirement:** REQ-19 Operations, the `status` part ("`status`, `explain` and `doctor` exist"; `doctor` is already built, `explain` is phase 1b).
- **Tests that define done (locked at gate 2):** T-19-P1, T-19-N1 and T-19-N2, all in `packages/cli/test/status.test.ts`. They fail on their assertions today because `status` does not exist; story one is done when they pass and every other locked test still passes.
- **Interface:** `pod-factory status`, no arguments, read-only, runnable from any session including an agent's. It prints one line per story in the build plan on main with its stage, owner, what it waits on and the record or rule holding it, one line per gate with its approval state, a flag for each story file that claims a stage its records do not justify, and each invalid record by path. It exits 0, since reporting a blocked story is not an error. The story file gives the details.
- **File scope:** as listed in the story file. Only the new command and its registration; no enforcement code.
- **Budgets and caps:** about 300,000 tokens and half a day of elapsed time for one builder session. One builder at a time (milestone zero); lease 240 minutes, renewed by running `story start` again.
- **Agent and model:** a Claude Code builder subagent, Sonnet (`claude-sonnet-5-5`), in its own worktree with worktree isolation (TECH-SPEC section 7). The orchestrator runs `story start` and `story finish`; the approver runs `approve story-1`.
- **Dependencies:** none. Everything `status` reads already exists on main: the record store, the effective lock, the gate-3 approval and the story helpers.
- **May run alongside:** nothing; it is the only story.

## Estimate

One story, about 300,000 tokens and half a day of elapsed time in total.
