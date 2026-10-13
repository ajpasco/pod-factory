# Handoff: bootstrap-01-record-store

Session of 2026-10-13, Opus builder. Approver: Allan Pasco.

## Done

- Workspace scaffold per ADR-002 and ADR-008 node-tool: root npm workspace, `packages/cli` (package `pod-factory`, version `0.0.0-m0`), strict TypeScript 6.0.3, ESLint, Prettier, Vitest 5. All dependencies pinned exactly. TypeScript 7 is not used because typescript-eslint 8.71 supports `<6.1`.
- Record store in `packages/cli/src/records/`:
  - `format.ts`: the five record types, the fixed key order, the filename `<UTC compact>-<type>-<subject>-<id>.json` and the 12-hex IDs.
  - `hash.ts`: `sha256-lf`, which replaces CRLF with LF and keeps a lone CR as content.
  - `validate.ts`: per-record validation (schema, fields, writer rule, the type block, filename against content, byte-for-byte canonical form) and the lenient `bootstrap-0` reader.
  - `store.ts`: `loadRecords` fetches the branch, then walks its history. A file changed after it was added is flagged and ignored. A deleted file is flagged and still counts. Paths outside `records/`, merges and repeated IDs are flagged.
  - `journal.ts`: the journal in `<git-common-dir>/pod-factory/journal/`, written whole through a temporary file and a rename.
  - `write.ts`: validate, journal, then in each round fetch, check whether the ID is already there, commit on the tip with git plumbing and push without force. Rejected or uncertain pushes retry. `resumePendingRecords` finishes pending entries with their original IDs and validates them again first.
  - `actor.ts`: the actor kind comes from the invocation context. `agent` if `CLAUDECODE` or `AI_AGENT` is set (the marker wins, even under Actions); `check-runner` if `GITHUB_ACTIONS=true`; `human` only when both stdin and stdout are terminals; otherwise no actor.
  - `killpoint.ts`: the names of the five REQ-08 kill points. `writeRecord`, `resumePendingRecords` and `writeJournalEntry` take an optional `onKillPoint` hook that shipped code never sets. The test child `test/support/write-child.ts` reads `POD_FACTORY_TEST_KILL_AT` and passes a hook that sends SIGKILL, so shipped code reads no test variable.
- Tests: 42 passing. The section-13 tests in this slice are T-06-P6, T-20-P2, T-20-N5, T-03-P5 and T-03-P7. The rest are supporting tests for the store: kill and resume at all five write points in a real child process with SIGKILL, a concurrent writer forced through a pre-push hook, an unreachable remote, a half-written record, modified, deleted and stray files, a merge, an altered journal entry, and all three actor kinds in real processes (human under `script(1)` for a pseudo-terminal).
- Mutation check by hand: removing the fetch-first ID check fails the after-push kill test, and journaling after the push fails 6 tests.

## Decisions made in session, by the approver

- `actor.kind` adds `agent`, allowed only on transition records. Transitions accept `human` or `agent`.
- A deleted record is flagged and still counts as first added.
- T-03-P5 and T-03-P7 never read or hash `docs/PRD-reference.md`. They only check that the records carry the reference hash field.
- `actor.kind` is derived from the context and never from a flag. All three kinds are tested.
- `checkResult.check` accepts `verify`, `lock-guard` and `gate-check`.
- The real records branch is neither created nor protected in this slice. The approver creates it by hand after slice 2 lands, with the four bootstrap records under `records/bootstrap/` in its root commit. The CLI never creates it.
- Handoff notes go in `.factory/work/<slice>/handoff.md`, the work zone.
- The kill trigger moved out of shipped code into an optional hook (see Done).
- Approval commands refuse under the agent marker, including `!` commands typed into Claude Code. When `approve` exists, its refusal names the marker it found and says to run the command from a terminal outside any agent session.
- TECH-SPEC: one sentence on branch creation (section 4), one line naming the handoff path (section 7), and L9 marked verified (section 12).

## Left

- The section-13 CI-job tests that use this store, T-20-P1, T-20-N1 and T-19-N6, are written in slice 3 against `pod-factory ci records-validate`.
- The commit-level writer check ("CI rejects a human record whose writer is not human", meaning who pushed it, not just `actor.kind`) belongs to records-validate in slice 3.
- Hashes are checked for format only. Comparing bound hashes against artifacts is each consumer's job (gate-check, lock-guard).
- Leftover journal temporary files from a kill during a journal write are ignored but never cleaned up.

## Open questions

None open. The three from the first draft were answered by the approver (see Decisions).

## Next step

Slice 2, `approve` and `lock`, in a new bootstrap worktree created through Orca from main after this slice merges. Slice 2 also documents the exact command sequence for creating the records branch.
