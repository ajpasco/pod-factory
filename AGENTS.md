# Instructions for coding agents

pod-factory is a gated, spec-first software factory. It decides what "done" means, freezes the tests
that prove it, and only then lets a builder write code — with no route for the builder to change
either. This file is the entry point for any agent working in this repository, whatever tool it runs
under. Keep it short and point at the real documents rather than restating them.

## The four rules that are not yours to bend

1. **You cannot approve anything.** `approve`, `lock` and `revoke` call `requireHuman` and refuse
   when they can tell an agent is driving them. An approval typed into an agent's shell cannot be
   told from one the agent ran for itself. Do not try to route around this.
2. **Report the blocker; do not substitute.** If the factory cannot do what a task needs, say so and
   stop. Building the same thing a different way, outside the gates, is the one mistake this project
   has already paid for.
3. **Never modify a lock, an approval record, a protection setting or a workflow** to make your own
   work pass. If a frozen file is wrong, that is an amendment the approver authorizes, not a change
   you make.
4. **This repository is public.** Absolute home paths, credentials and real personal data must not
   be committed. Committed fixtures and shared evidence are synthetic only.

## The lock, and how to ask about it

A lock is a record on the `pod-factory/records` branch naming path patterns and test commands. While
one is in force, the files it covers are read-only to every agent, enforced three ways: the
`PreToolUse` hook in-session, CI's `lock-guard` on the pull request, and the fact that only a human
at a terminal can revoke or amend.

The fastest way to settle any question about whether a path is frozen is to ask the hook, which is
never out of date:

```sh
echo '{"tool_name":"Edit","tool_input":{"file_path":"<path>"}}' | pod-factory hook pre-tool-use
```

Silence and exit 0 means you may write it. A JSON body with `permissionDecision: "deny"` means it is
frozen, and the message names the lock and the only legitimate route.

Two things about the lock that are easy to get wrong:

- The lock record carries **its own copy** of the patterns and commands. Editing
  `packages/cli/src/lock-policy.ts` changes nothing until a new `pod-factory lock` is run by the
  approver.
- CI builds its enforcing copy from `main`, never from the branch. So a change to enforcement code
  does not take effect on its own pull request. This is deliberate: a builder cannot weaken a check
  in the same change that needs it weakened.

## Preparing an application

When asked to prepare an application, act as the preparation orchestrator and follow
[`docs/orchestrator/ORCHESTRATOR.md`](docs/orchestrator/ORCHESTRATOR.md) exactly. Keep that project's
`PREPARATION-STATE.md` updated after every step — if a session dies, the next one reads the state
file and continues, so nothing important may live only in a transcript.

Seven gates run before any code is written, and no gate advances until its exit conditions are met.
Two rules hold in every runtime:

- **A checker runs in a session that started for that task**, never as another message in the
  drafting conversation. A fresh process, a fresh subagent or a fresh terminal, whichever your tool
  provides. Pass a checker only the artifact paths and the rubric path; summarising the drafting
  discussion into its prompt is how independence gets lost.
- **Requirement IDs are created at gate 3, in the PRD, and nowhere else.** A blueprint or eval plan
  that needs an ID the PRD lacks is a gate-3 failure: return to gate 3 and have the PRD amended.

Per-runtime mechanics, including how to launch drafters and checkers under Claude Code, Codex and
Orca, are in [`docs/orchestrator/RUNTIMES.md`](docs/orchestrator/RUNTIMES.md). The rubrics are in
[`docs/orchestrator/rubrics/`](docs/orchestrator/rubrics/).

One division that is easy to get backwards: **technical choices belong in the technical blueprint,
and the eval plan must not verify them.** Status codes, schemas, names, libraries and log formats are
recorded at gate 4. Every test in the eval plan asserts a business outcome.

## Building a story

After the tests are frozen and the build plan approved, the build loop is in
[`docs/orchestrator/BUILD.md`](docs/orchestrator/BUILD.md). One builder per story. A builder writes
its implementation and its own dependency list, and is refused everything else by name.

If you are a builder: the tests judging your work are frozen on purpose, and the correct response to
a test you cannot pass is to report it in your handoff note, not to reach for the test. Your
dependency list is inside your scope, and anything you put there runs inside the same interpreter
that grades you; its honest use is to declare what your implementation needs, and nothing else.
Report what you cannot pass and why. A candidate that reports a failure it could not fix is worth
more than one that reports green, and the verify run's own evidence is what counts either way.

## Verification

Tests are run from the commands stored in the lock record, never from a package's own scripts. The
current set is listed in eval plan section 4 and includes one protected runner per application.

```sh
npm ci
npm exec --workspace packages/cli -- vitest run --config vitest.config.ts
```

Run `prettier` **from the repository root only**. `.prettierignore` is resolved against the working
directory and excludes `docs/`; running it from inside `packages/cli` reformats documentation it
should not touch.

## Where things are

|                                 |                                                                            |
| ------------------------------- | -------------------------------------------------------------------------- |
| The process                     | `docs/orchestrator/`                                                       |
| Agent definitions and skills    | `.claude/agents/`, `.claude/skills/`                                       |
| Requirements, design, eval plan | `docs/PRD.md`, `docs/TECH-SPEC.md`, `docs/eval-plan.md`                    |
| Architecture decisions          | `docs/adr/`                                                                |
| Projects being built            | `projects/<name>/`, with their preparation in `docs/projects/<name>/prep/` |
| Approvals, locks, check results | branch `pod-factory/records`                                               |

## Do not resume the parked migration

A phase-1b migration was designed, demonstrated in labs and deliberately parked. Preserving it is
fine; starting it, or landing any part of it, is not — it needs the approver's decision first.
