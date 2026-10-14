# story-1: `pod-factory status`

You are the builder for story one. Build `pod-factory status` so its three locked tests pass, without changing any other behaviour. This file is your brief; the commands `story start` and gate-check read the three lists below exactly, so they are kept as plain lists.

Tests:
- packages/cli/test/status.test.ts

Scope:
- packages/cli/src/commands/status.ts
- packages/cli/src/status.ts
- packages/cli/src/status/**
- packages/cli/src/run.ts
- packages/cli/src/index.ts

Inputs:
- docs/TECH-SPEC.md
- packages/cli/test/status.test.ts

## What done means

The three tests in `packages/cli/test/status.test.ts` pass: T-19-P1, T-19-N1 and T-19-N2. Every other test still passes. The tests are locked: you cannot change them, and you should not need to. Read them first; each one's comment states what it checks and why it fails today.

## What status does (TECH-SPEC section 3.2)

"`status` prints every story, its stage, what it waits on, and the exact rule or record blocking it. It is the tool for 'what went wrong.'" Concretely:

1. **Read, never write.** Fetch and read the records branch with the existing reader (`loadRecords`), which already validates each record, flags invalid ones and orders records as they were added. Take the stories from the build plan on main: every `.factory/work/story-<n>/story.md` the plan names (`STORY_FILE` in `lock-policy.ts`, as `approve 3` uses it).
2. **One line per story.** Each line gives the story, its stage from its records (`storyStage` in `src/story.ts`; ready when it has none), its owner (the in-progress lease holder, or none), what it waits on, and the record or rule holding it. For example, for a story in progress the line names story finish and the handoff note it needs, and the in-progress record's ID; for a ready story it names story start. The tests match on these facts, not on exact wording.
3. **A story file's own claims never set the stage.** If a story file says it is at a stage (a line such as `Stage: done`) that its records do not justify, report the stage from the records and flag the mismatch on its own line, naming the claim and the recorded stage, for example "story-1's story file claims done, but its records say in-progress".
4. **Gates.** One line per gate milestone zero has (2 and 3): approved, naming the record, or not approved and why. An approval record that fails validation is never shown as approved. Name it by its path as invalid, with the reader's reason, and show its gate as not approved. Write "not approved" in those words; the test treats any other "approved" on a gate-3 line as a claim of approval.
5. **Exit 0** whenever the report was produced, including when everything is blocked. Exit non-zero only if the records cannot be read at all (the reader's own refusals, such as a shallow history, already do this through `run.ts`).
6. **Plain language** throughout, as every other command: each line says what a human can do next.

## Where the code goes

- `packages/cli/src/commands/status.ts`: the command, `status(argv, io): number`, refusing any arguments.
- `packages/cli/src/status.ts` or `packages/cli/src/status/`: any helpers you want, and your own unit tests (`*.test.ts` under `src/status/` are allowed and unlocked).
- `packages/cli/src/run.ts`: register `status` in the command switch and in `USAGE`.
- `packages/cli/src/index.ts`: export it.

Change nothing else. The scope above is checked by gate-check against this file as gate 3 approved it; a change outside it fails the pull request, and so does anything under `.factory/` except this story's own folder. Reuse what exists (`loadRecords`, `storyStage`, `gate3Approval`, `parseStory`, `effectiveLock`, `active`) by importing it; do not edit those modules.

## Before you finish

- Run the locked command from the repository root: `npm ci`, then `npm exec --workspace packages/cli -- vitest run --config vitest.config.ts`. All tests pass.
- Run `npm run lint` and `npm run typecheck` from the repository root. Run Prettier only through `npm run lint`, never from inside `packages/cli` over other folders.
- Write your handoff note at `.factory/work/story-1/handoff.md`: done, left, open questions, next step. `story finish` refuses without it.
- Your prose is not evidence. The verify job's run on the pull request is.
