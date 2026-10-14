# Handoff to the milestone-zero builder (an Opus session)

Written 2026-10-13 by the design session. You are building milestone zero of pod-factory. The approver is Allan Pasco; the design session (Fable) reviews only and writes no code. Read in this order, nothing else first:

1. `docs/TECH-SPEC.md` section 3 (scope, what each piece does, the flow, what waits), then sections 4 to 12.
2. `docs/eval-plan.md` section 13, the 60 tests milestone zero must have as code and classified before gate 2 closes.
3. `docs/PRD.md` 0.9.2, section 4 for REQ-03, REQ-06, REQ-07, REQ-08, REQ-10, REQ-19, REQ-20, REQ-22.
4. `docs/adr/ADR-002` (repository layout), `ADR-004` (record storage) and `ADR-008` (the node-tool preset you build with). Everything else in `docs/adr/` is history; where it differs from the tech spec, the tech spec wins.

## What you build

One npm package, TypeScript on Node, Vitest, in this repository under `packages/cli` with the workspace layout of ADR-002 (hooks, check runner and executor are folders inside the one package for now). Nine subcommands: `approve`, `lock`, `revoke`, `story start`, `story finish`, `status`, `doctor`, `hook`, `ci <job>` with jobs `lock-guard`, `verify`, `gate-check`, `records-validate`. Five record types. One hook. A GitHub Actions template with the three required checks and the scheduled validator. Nothing from phases 1b to 5, and no placeholder code to make later tests fail.

## The order of work

1. Open a `bootstrap/*` branch for each slice; every pull request needs the approver's written approval in chat until `approve bootstrap` exists, then through the command. Milestone zero has no automatic merging.
2. Build the record store first (format, IDs journaled before the first push, fetch-then-retry, per-record validation at read), then `approve` and `lock`, then the three CI jobs, then the hook, then `revoke` and the relay, then `story start` and `story finish`, then `doctor`.
3. Write the 60 tests as you go; scaffold behavior passes as baselines, `status` tests fail on their assertions until story one.
4. When the scaffold is on main and the tests are classified, the approver runs `approve 2` and `lock`. Then story one, `status`, goes through the real loop: `approve 3`, `story start`, a builder subagent in its own worktree, `story finish`, the pull request, `approve story-1`, merge.
5. Exercise the three refusals and kill-and-resume as the eval plan describes.

## Verified facts you can rely on, from the lab of 2026-10-13

- Checks from a `pull_request_target` workflow defined on main satisfy branch protection (L1). Use that event; never run the pull request's own workflow for anything that decides.
- A job with `contents: read` cannot push to the records branch; a dependent job with `contents: write` can (L2). Keep application code out of the writing job.
- A dispatched workflow can post a failing `gate-check` check run on a pull request head with `checks: write`, and the pull request blocks (L3). This is how `revoke` is relayed.
- `enforce_admins: true` is settable and readable through the API, and it rejected the owner's direct push (L6).
- Lab workflows to start from: the `pr-checks.yml` and `relay.yml` in the archived repository `ajpasco/pod-factory-lab-20261013`. Replace the lab's approval files with real records; keep the job split.

## Still to verify, by you, early

- L7: Claude Code's pre-tool-use hook denies a file edit with a reason, and fires for subagent tool calls. Pin the exact event and field names in the hook tests.
- L8: a hook event's working directory reflects the subagent's isolated worktree.
- L9: an agent session is detectable by an environment marker (for the approval commands' refusal).
- L10: the scheduled validator keeps running at the chosen interval in an active repository.
- L4 and L5 precisely: dispatch latency, and whether a re-run of an older green job can ever outrank a newer failing check run. Keep gate-check re-evaluating revocations at its own start regardless.

## Rules that are easy to break

- Agent prose is never evidence. Only harness or CI output bound to the tree counts.
- Never disable a working check to satisfy a test class.
- An invalid record is ignored and flagged, never repaired in place and never allowed to block later valid records.
- Record IDs are generated once per invocation and journaled before the first push; a retry fetches first.
- The approval commands refuse to run from an agent session; CI rejects a human record whose writer is not human.
- No generalized machinery for later phases. If you need something the spec does not name, stop and ask the approver.

## How to report

At the end of each session leave a handoff note in the story's work folder: done, left, open questions, next step. Never decide product or security questions alone. The design session can be asked for a read-only review of a pull request; it will not edit code.

Who answers what (confirmed by the approver on 2026-10-13):

- Design and spec questions go to the design session directly, by message, one at a time. Act on its answers.
- Three kinds go to the approver, never to the design session: product, scope and security decisions; approval records, locks and merges; creating or protecting the records branch.
- Record every answer in the slice handoff under "Decisions made in session", naming who gave it, so the written trail survives without the approver relaying.

## Session setup, done by the design session on 2026-10-13

- Trunk: `main` at the design tip, which is also Orca's base ref. One worktree per slice, named `bootstrap-<nn>-<slice>`, created through Orca from main. Worktrees are created through Orca so they show in its sidebar; Orca names the branch after the worktree. The first is `refs/heads/bootstrap-01-record-store` at `/Users/jay/orca/workspaces/orca-software-factory/bootstrap-01-record-store`.
- The builder worktree is a sparse checkout without the review history, the detailed section files, the reference PRD and ADR-010 to ADR-014, and it carries deny rules in `.claude/settings.local.json` for the same paths. Both are re-applied for every new bootstrap worktree:

```
orca worktree create --repo id:53f86b48-6ee5-47d9-bcd5-63c0803469dc --name bootstrap-<nn>-<slice> --setup skip --json   # branch from main, Orca's base ref
cd <the path Orca printed>
git sparse-checkout init --no-cone
git sparse-checkout set '/*' '!/docs/reviews/' '!/docs/spec/' '!/docs/spec-drafts/' '!/docs/PRD-reference.md' '!/docs/HANDOFF-2026-10-12.md' '!/docs/adr/ADR-010-design-defaults.md' '!/docs/adr/ADR-011-mapping-resolutions.md' '!/docs/adr/ADR-012-verification-resolutions.md' '!/docs/adr/ADR-013-lock-guard-and-class-rules.md' '!/docs/adr/ADR-014-final-corrections.md'
cp /Users/jay/orca/workspaces/orca-software-factory/bootstrap-01-record-store/.claude/settings.local.json .claude/settings.local.json
```

- To check afterwards that a session never touched the excluded files:

```
grep -l 'docs/reviews\|PRD-reference\|spec-drafts\|docs/spec/' ~/.claude/projects/*orca-software-factory*/*.jsonl
```

- Opening prompt for the builder session (Opus; high effort for slices 1 to 3, medium afterwards; a Sonnet subagent builds story one):

```
You are the milestone-zero builder for pod-factory. The approver is Allan; you never decide product or security questions alone. The design session (Fable) reviews only and writes no code.

Start by reading, in this order and nothing else first:
1. docs/HANDOFF-M0-opus.md
2. docs/TECH-SPEC.md, sections 3 to 12
3. docs/eval-plan.md, section 13
4. docs/PRD.md section 4 for REQ-03, 06, 07, 08, 10, 19, 20, 22
5. docs/adr/ADR-002, ADR-004, ADR-008
Everything else in docs/adr is history; where it differs from TECH-SPEC.md, TECH-SPEC.md wins.

Scope: one npm package, TypeScript on Node, Vitest, under packages/cli. Nine subcommands, five record types, one hook, a GitHub Actions template with three required checks and a scheduled validator. Build nothing from phases 1b to 5 and write no placeholder code to make later tests fail.

Rules you must not break: agent prose is never evidence; never disable a working check to satisfy a test class; an invalid record is ignored and flagged, never repaired in place; record IDs are generated once per invocation and journaled before the first push, and a retry fetches first; approval commands refuse to run from an agent session; when the spec does not name something you need, stop and ask me.

Work in slices, each on a bootstrap/* branch with one pull request: (1) the record store and its tests, (2) approve and lock, (3) the three CI jobs and the scheduled validator, (4) the hook, (5) revoke and the relay, (6) story start and story finish, (7) doctor. Write the section 13 tests as you go: scaffold behavior passes, status tests fail on assertions. Before each pull request, tell me in a few lines what the slice does, what it verifies, and what you were unsure about. Wait for my approval in chat before merging; there is no automatic merging.

Verify L7 to L10 from the handoff early in slice 4 and report what you found as verified or pending, nothing in between.

End every session with a handoff note in the story's work folder: done, left, open questions, next step. Begin with slice 1 and show me the record file format before writing code.
```

## Remote and branch protection, set on 2026-10-13

- Remote: `https://github.com/ajpasco/pod-factory` (public, MIT). `main` is protected: administrators bound, no force pushes, no deletions, and one required check.
- Until slice 3 lands, the required check is `bootstrap-check`, a placeholder workflow on main that passes for `bootstrap-*` branches and nothing else. It exists so that direct pushes to main are rejected from day one and every slice arrives as a pull request. Slice 3 replaces it: once `lock-guard`, `verify` and `gate-check` have reported on a pull request, the approver swaps the required contexts to those three (`gh api -X PATCH repos/ajpasco/pod-factory/branches/main/protection/required_status_checks -f contexts[]=lock-guard -f contexts[]=verify -f contexts[]=gate-check`) and deletes the placeholder. **Superseded on 2026-10-14:** the swap binds the three checks to the GitHub Actions app and drops the placeholder from the required checks without deleting it. The order and the command are in "The approver's sequence" in `.factory/work/bootstrap-10-revocation-fixes/handoff.md`.
- Each slice: push the `bootstrap-<nn>-<slice>` branch, open a pull request to main, wait for the approver's approval in chat, then the approver merges from the command line or the web. No automatic merging.
