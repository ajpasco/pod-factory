# ADR-003: Inline backend and the builder contract

> Note (2026-10-12): the parallel option extends PRD decision 2 (stories one at a time without Orca) at the approver's direction; the PRD wording change is amendment 0.9.2 row 13 (ADR-012 section D).

> Amended 2026-10-12 by ADR-011: sequential stories also run each builder in its own worktree (ADR-011 item 1); 'one at a time' is unchanged.

Date: 2026-10-12. Status: accepted. Decided by: the approver (asked; recommended option taken with additions). PRD basis: decision 2 (inline backend is the same workflow in one session), decision 24 (milestone zero sequential), REQ-07, REQ-08, REQ-09, REQ-05.

## Decision

Without Orca, the orchestrator skill runs in the approver's Claude Code session and starts each builder, QA agent and reviewer as a Claude Code subagent: fresh context, model chosen per role, only the story context passed in. The session's hooks apply to every subagent tool call. Nothing extra is installed.

Stories run one at a time by default. When the approved build plan marks stories as independent, no shared interface, no overlapping file scope, no dependency between them, the orchestrator may run them in parallel, each builder subagent in its own git worktree through Claude Code's worktree isolation, with merges back to main serialized and verified one at a time. Independence is decided at gate 3 from the story files, never improvised during the build.

## The builder contract, stated by the approver

1. **A story is full stack and aligned with one requirement.** A builder delivers everything that requirement needs across layers, so QA can verify the requirement's acceptance criteria as a user would, not a layer at a time.
2. **The evals derive from the acceptance criteria and define done.** The locked tests are the only definition of done. The builder writes the minimum simple, clean code that passes them; the restraint checks flag anything beyond.
3. **Builders may write unit tests, and those tests must earn their place.** A builder-written test must test behavior that matters to the story. Tests that assert framework or library behavior, test mocks, restate a locked test, or pin implementation details are flagged by the simplicity reviewer and removed. Builder-written tests stay unlocked.

## Alternatives rejected

- Headless Claude Code processes per story: cleaner isolation and per-story transcripts, but process management, headless permission flags and Claude-only plumbing in phase one, with nothing visible in the terminal but the orchestrator.
- Subagents for reviews and headless processes for builders: isolation where it matters most, two mechanisms to maintain from the start.

## Consequences

- Milestone zero runs sequentially; the parallel option is exercised after it passes.
- Per-story token accounting for the inline backend comes from the subagent usage the session reports, persisted into the story's receipt by the orchestrator.
- The Orca backend implements the same four verbs with Orca's supervised workers; the orchestrator skill chooses the backend by probing Orca's status command.
