# Handoff: bootstrap-07-doctor

Session of 2026-10-14, Opus builder. Approver: Allan Pasco. Design session: scad-d8 (Fable).

Stacked on slice 6 (`bootstrap-06-story`, PR #7), on slice 5 (#6), on slice 4 (#5). This pull request targets the slice 6 branch. It also carries a cherry-pick of #5's install fix (ed45642, here as cdba443), because doctor pins main's `.claude/settings.json` to the corrected command. The change is identical, so the merges stay clean.

## Done

- `pod-factory doctor` (`src/commands/doctor.ts`):
  - read-only, from any session, an agent's included (T-03-P2);
  - prints each layer present or MISSING with the reason, and exits 1 when any is missing;
  - a layer it cannot check counts as missing.
- The layers:
  - **hook configuration:** main's `.claude/settings.json` has a PreToolUse entry with `HOOK_MATCHER` running exactly `HOOK_COMMAND`. Both are exported constants, and a test pins the committed file to them.
  - **pod-factory binary:** the first `pod-factory` on PATH must resolve to a real copy outside any git checkout. Otherwise it reports MISSING with the pack-and-install sequence. The resolved path and the version are reported.
  - **CI workflows on main:** `pr-checks.yml` on `pull_request_target` with `lock-guard`, `verify`, `verify-record` and `gate-check`; `records-validate.yml` with a schedule and `--relay`. Read from main, not the working tree.
  - **main branch protection:** administrators bound, no force pushes, no deletion, and `lock-guard`, `verify` and `gate-check` required from the GitHub Actions app (15368).
  - **main merge settings:** reports `strict` on or off without failing it, since that is the approver's call, and names a still-required `bootstrap-check` as the placeholder.
  - **records branch:** exists, with nothing flagged.
  - **records branch protection:** no force pushes, no deletion, and no required checks or reviews, which would stop `verify-record` pushing.
- TECH-SPEC section 3.2 (doctor, and what it does not prove) and section 9 (the enforcing copy is a packed install).
- Tests: 149 passing on two runs. Typecheck, ESLint and Prettier are clean.
  - Section-13 tests: T-19-P3, T-19-N3, T-03-P2.
  - T-19-N3 covers nine missing layers: admins not bound, a check not bound to the app, required checks on the records branch, records branch unprotected, GitHub unreachable, no settings, a hook command that would fail open, a workflow without the relay, and the binary linked into a checkout.
  - The fake gh answers branch protection in the shape of the real API, which I read from this repository.
- Mutation checks, each failing a test:
  - a binary inside a checkout accepted;
  - the app binding ignored;
  - required checks on the records branch ignored;
  - unreadable protection passing;
  - any hook command accepted;
  - the relay not required;
  - admins not checked.
- **Manual run against the real repository, from this worktree, read-only:**
  - MISSING hook configuration (`.claude/settings.json` is not on main yet);
  - MISSING binary (not installed);
  - MISSING workflows (`records-validate.yml` on main has no `--relay` yet);
  - MISSING main protection (`lock-guard`, `verify` and `gate-check` are not required yet);
  - present merge settings (strict off; the placeholder `bootstrap-check` still required);
  - present records branch (10 valid, none flagged);
  - MISSING records branch protection (not protected).
  - Exit 1. The repository owner's token could read protection, so no refusal appeared. A token without that access shows `MISSING main branch protection: cannot be checked: gh api … failed: …`.

## Decisions made in session

- By the design session:
  - The design is accepted as proposed.
  - Doctor does not try to tell a stale global install from a current one. The version never changes in milestone zero and nothing injects the source commit at build time. So doctor proves the binary is a real copy outside any checkout, not that it is the newest one.
  - The proof that a story merged is named in the command's output, not in the record.

## Left, for the approver only

1. PRs #5, #6 and #7 in order, as their bodies list. Then `approve bootstrap <this PR's number>`, re-run gate-check, merge.
2. After the swap and the records-branch protection, run `pod-factory doctor` from a checkout of main. Every layer should then read present.

## Left, for me

- Section 13 tests not yet in code: T-05-P2, T-05-N3, T-05-N4 (the classification script), T-08-P1, T-08-N1 (kill-and-resume over the story flow), T-19-P1, T-19-N1, T-19-N2 (`status`, which must fail on assertions until story one). How they land is with the design session.
- L10: no scheduled run of `records-validate` by 04:49Z on 2026-10-14, 1 hour 49 minutes after it reached main.

## Open questions

- How the eight remaining section-13 tests land, and when (asked of the design session).

## Next step

The remaining section-13 tests, then the classification run, `approve 2` and `lock` by the approver, then story one through the real loop.
