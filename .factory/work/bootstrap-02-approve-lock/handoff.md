# Handoff: bootstrap-02-approve-lock

Session of 2026-10-13, Opus builder. Approver: Allan Pasco.

## Done

- `pod-factory` binary (`dist/cli.js`) with exactly two commands, `approve` and `lock`. `src/run.ts` turns every refusal into a plain-language message and exit 1.
- Every approval-path command first requires a human at an interactive terminal. Under an agent marker the refusal names it, for example "agent session marker CLAUDECODE=1 is set, so this is an agent session … run "pod-factory approve" from a terminal outside any agent session. Nothing was written." With no marker and no terminal it refuses as undeterminable. Pending journal writes are finished next.
- `approve` targets:
  - `2 --classification <0005 file name>`: binds main's tree plus `docs/PRD.md`, `docs/TECH-SPEC.md`, every `docs/spec/*.md`, `docs/eval-plan.md` and `.factory/work/classification/gate-2.json`, hashed from main's committed blobs, never the working tree. It refuses unless the named bootstrap record is on the records branch, valid, of type classification, and binds the report's hash at that tree.
  - `3`: binds `.factory/work/plan/build-plan.md`, every `.factory/work/story-<n>/story.md` it names, and the tree.
  - `story-<n> --pr <n>` and `bootstrap <n>`: bind the PR head tree, fetched from `refs/pull/<n>/head`.
  - `amendment --pr <n> <paths>`: `before` comes from the latest valid lock, `after` from the PR head, and either is `null` where the file is absent. Unlocked or unchanged paths are refused.
- For every target, `approve` shows the statement (with the commit and tree), the bound hashes, the records it refers to, and one shown hash: the SHA-256 over everything printed above it (statement, tree, files, refs). You type the token and 8 characters; the typed line is lowercased first, so an uppercase hex prefix is accepted. It then re-fetches the source and writes nothing if it moved, and only then writes the record.
- `lock` requires the latest valid, unrevoked gate-2 approval and main's tree equal to the approved tree. It writes `lock.patterns`, every matched path with its hash, `binds.tree`, and `lock.testCommands`. It is idempotent per approval.
- `src/lock-policy.ts` holds the constants. The locked test `test/lock-constants.test.ts` checks that every backticked path in eval-plan section 5's table and every command in section 4's table appears in them.
- Format changes:
  - `lock: {patterns, testCommands}`, and a lock must bind its tree.
  - `refs` accepts a 12-hex ID or a bootstrap file name.
  - bootstrap-0 gains `classification`.
- Runner configuration per eval-plan section 4: includes `test/**` and `src/**`, `allowOnly: false`, `passWithNoTests: false`, isolated files, and a global setup that builds once so the CLI tests run `dist/cli.js`.
- TECH-SPEC: section 3.2 `lock`; section 3.3 step 3, the gate-2 file list; section 4, the agent kind, the refs rule (and revokes from slice 5), the lock format, and the bootstrap records as a set.
- eval-plan section 5: the "bound but not locked" line no longer lists `docs/adr/`, and the runbook joins in phase 3.
- `records-branch.md`: the exact sequence for creating the branch and adding 0005. Both steps were run against a scratch copy.
- Tests: 69 passing. The section-13 tests in this slice are T-03-N4 and T-06-P3. Mutation checks: dropping a constant fails the constants test and T-06-P3; removing the main-moved re-check fails its test.

## Decisions made in session, by the approver

- The gate-2 bound files and the `--classification` reference.
- The lock format with patterns and testCommands.
- The build plan and story paths.
- `refs` takes bootstrap file names.
- The re-check before writing.
- Review of 77231ff: the shown hash covers refs (I also kept the statement in, so "Hash of everything above" is literally true), with a test that two gate-2 approvals naming different classification records show different hashes; the typed line is lowercased before comparing.
- The constants test stays unnumbered: it guards our own constants, not an acceptance criterion.
- Binding tests use fixture trees only.
- T-03-P2 lands with `doctor`.

## Decisions I took that you can overrule

- `lock.testCommands` holds only the section-4 commands whose package or config exists in the approved tree: today `npm ci` plus the cli command. The other five join by amendment as their packages appear. Locking all seven would make verify fail on workspaces that don't exist.
- `docs/spec/*.md` is enumerated from main's tree at approval time rather than hard-coded by name, because I can't see the names. The mapping file is required by name.
- `lock` requires main's tree to equal the approved tree exactly. If anything merged in between, `approve 2` must be run again.

## Left

- T-03-P2 (with `doctor`, slice 7).
- Slice 3, from the review:
  - The JSON reporter goes in the locked vitest config, not on a command line, so the locked command alone produces `.factory/work/classification/gate-2.json`. It must land before the classification run.
  - Eval plan section 5's enforcement row: add `.pre-commit-config.yaml` to the patterns when that file first lands, and reword the row so the enforcing-version pin is covered by the gate-2 binding until the project profile file exists.
- Clearing Orca's branch-prefix setting for this repository is an app setting, not exposed by the Orca CLI.

## Open questions

- None.

## Next step

The approver merges slice 2, then creates the records branch with `records-branch.md` step 1. Slice 3 (the three CI jobs and the scheduled validator) follows in a new worktree created with `--base-branch origin/main`.
