# Running it: Orca, Claude Code CLI, Codex CLI

[ORCHESTRATOR.md](ORCHESTRATOR.md) is the process and it does not change between runtimes. What
changes is how a role gets its own session and how the user is prompted. Nothing here requires a
service, a plugin or a network call; the state file and the rubrics are the whole machinery.

Two rules hold everywhere:

1. **A checker runs in a session that started for that task.** Not a new message in the drafting
   conversation. A fresh process, a fresh subagent, or a fresh terminal — whichever the runtime
   gives you.
2. **The state file is the memory.** If a session dies, the next one reads
   `PREPARATION-STATE.md` and continues. Nothing important lives only in a transcript.

## Claude Code CLI, on its own

The smallest setup, and the baseline the other two match.

- Start it with: *"Act as the preparation orchestrator. Follow `docs/orchestrator/ORCHESTRATOR.md`.
  The project is <name>."*
- The orchestrator session plays the orchestrator role only.
- Drafters and checkers are subagents, one per artifact, launched with the Agent tool using
  `.claude/agents/prep-drafter.md` and `.claude/agents/prep-checker.md`. A subagent gets its own
  context, which is what makes the checker's independence real.
- The orchestrator passes a checker only the artifact paths and the rubric path. It does not
  summarise the drafting discussion into the prompt; that is how independence gets lost.
- The user answers in the terminal, one question at a time.

No Orca, no preparation service, no server. A copy of `docs/orchestrator/` and the three
`.claude/agents/prep-*.md` files is enough to run this in any repository.

### One harness limit worth knowing

A Claude Code subagent may be refused permission to write files ("Subagents should return findings
as text, not write report files"). A checker that hits it returns its review as text instead. The
orchestrator then transcribes that text into the findings file itself, says in the file's header
that it did so and why, and keeps its own verification and any reclassification in the state file
rather than mixing them into the checker's words. Independence is unaffected: the checker still ran
in its own session with only the artifacts and the rubrics. Do not work around it by giving the
checker a drafting role.

## Codex CLI

Codex has no subagent primitive, so a role boundary is a process boundary.

- Point Codex at the process from `AGENTS.md`:

  ```
  ## Preparation
  When asked to prepare an application, act as the preparation orchestrator and follow
  docs/orchestrator/ORCHESTRATOR.md. Keep PREPARATION-STATE.md updated after every step.
  ```

- A drafter is a separate non-interactive run whose prompt is the rubric plus the input paths:

  ```sh
  codex exec "Draft the PRD for <project>. Follow docs/orchestrator/rubrics/prd.md exactly.
  Inputs: PREPARATION-STATE.md (scope and answers only). Write docs/<project>/PRD.md. Write
  nothing else."
  ```

- A checker is another separate run, and it must not be the run that drafted:

  ```sh
  codex exec "Review docs/<project>/PRD.md against docs/orchestrator/rubrics/prd.md. Output the
  rubric's verdict section as findings.json. Change no file but findings.json."
  ```

- The interactive session stays the orchestrator: it asks the user, reads findings files, updates
  the state file, and decides whether a gate passed.

Same gates, same rubrics, same refusals. The only loss against Claude Code is convenience.

## Orca

Orca adds isolation and a place for the work to live, so this is the fullest version. Use it when
more than one role is active at a time, or when you want each artifact's work kept apart.

- **A named worktree per project**, so preparation is visible as a project rather than as a chat.
- **A session per role.** The orchestrator owns one session; each drafter and each checker gets its
  own. A session that drafted an artifact is never reused to check it.
- **The orchestration CLI** supplies the dispatch loop where it is enabled: start a worker for a
  role, wait for it, read its outcome, and keep tasks in order with their dependencies. It is
  experimental, so confirm the current verbs with `orca --help` rather than trusting a written
  flag; the process does not depend on any particular one.
- **Notifications** tell the user a gate is waiting on them, which is the one thing the CLI-only
  runtimes cannot do.
- **The existing preparation service is optional.** `orchestration/` already implements steps 1 to
  6 with a CLI (`start`, `answer`, `interview`, `draft`, `revise`, `technical`,
  `select-technical`, `plan`, `review-plan`, `artifact`), and the orchestrator may drive it
  instead of dispatching its own drafters. Two cautions: its generators do not yet meet
  [rubrics/eval-plan.md](rubrics/eval-plan.md) — no per-test IDs, no Given/When/Then per test and
  no state-before-the-build field — so gate 5 must be checked against the rubric and not against
  the service's own validation; and its artifact store is a second system of record, so the state
  file must carry the hash of whatever the service produced.

## Porting it to another repository

Copy `docs/orchestrator/` and `.claude/agents/prep-*.md`. Add the `AGENTS.md` paragraph if the team
uses Codex. Copy `STATE-TEMPLATE.md` to `PREPARATION-STATE.md` and fill in the project name. There
is nothing else to install.
