# Handoff: bootstrap-04-hook

Session of 2026-10-14, Opus builder. Approver: Allan Pasco. Design session: scad-d8 (Fable).

## Done

- L7 and L8 verified on Claude Code 2.1.299 and recorded in TECH-SPEC section 12. The evidence is the hook's own event log and the files on disk, from a headless `claude -p` run in a scratch repository, with a subagent under worktree isolation. The three events are pinned in `packages/cli/test/fixtures/hook-events/`, with only machine paths and the session ID replaced.
- `pod-factory hook pre-tool-use` (`packages/cli/src/hook/pre-tool-use.ts`), hook 1:
  - reads one PreToolUse event on standard input;
  - for Write, Edit, MultiEdit (`file_path`) and NotebookEdit (`notebook_path`) it denies with `hookSpecificOutput.permissionDecision: "deny"` and a plain-language reason; every other tool, and every allowed edit, gets no output and exit 0;
  - resolves the path against the git top level of the event's `cwd`, so a builder resolves against its own worktree. It checks the path both as written (with the checkout's own prefix normalized through symlinks) and as reached through symlinks;
  - stays silent outside a git checkout and in a checkout without `.factory/` (ADR-005);
  - **protected, always:** `.factory/records/**`, `.claude/settings.json`, `.claude/settings.local.json`, `.github/workflows/**`, `.github/CODEOWNERS`;
  - **locked:** `effectiveLock` over the local remote-tracking records ref, with no fetch;
  - **fail closed:** if the lock cannot be read, any path matching `LOCKED_PATTERNS` is denied; any unexpected error denies the edit, because Claude Code treats an exit other than 2 as allow; an edit naming no file is denied.
- `.claude/settings.json` (committed, locked pattern): PreToolUse with matcher `Write|Edit|MultiEdit|NotebookEdit`. The command exits 2 with a message when `pod-factory` is not on PATH, and otherwise runs `exec pod-factory hook pre-tool-use`.
- TECH-SPEC:
  - section 9: the hook's delivery, path resolution, protected set and lock reading; that it is a hygiene layer, not a boundary; and why phase 1b's `amend` exists;
  - section 12: L7 and L8 verified, L10 pending with what was observed.
- Tests: 116 passing on two runs. Typecheck, ESLint and Prettier are clean.
  - T-06-P1 and T-06-N1.
  - Also tested: a subagent's worktree resolved from the event's `cwd`; the protected zone before any lock; symlinks to a locked file and through a symlinked folder; outside the checkout; a non-edit tool; no `.factory`; NotebookEdit; an edit naming no file; an unexpected error; the lock unreadable (shallow history); and the settings command with and without the binary.
- Mutation checks, each failing a test: ignoring the event's `cwd`; letting unexpected errors allow; no realpath form; no protected zone; lock-read failure allowing.
- A slice-3 bug, found by this pull request's own first `verify` run on Linux:
  - Records were ordered by file name. File names start with a timestamp to the second, so two amendments in the same second tie, and `amendment-pr-10` sorts before `amendment-pr-9`. effectiveLock then applied the later amendment first and judged it stale.
  - Records are now ordered by the commit that added them, with the path breaking ties, so "latest" and "in order" mean the order added.
  - `test/lock-state.test.ts` pins it with two same-second amendments. It fails under file-name order.
  - The pipeline itself worked end to end on that run: main's code judged the pull request, the section-4 commands ran, the bundle was uploaded, verify-record wrote a failing check result, and gate-check failed.

## Decisions made in session

- By the design session, after review: the install command was wrong (a local-folder global install is a symlink to the checkout), corrected here with one more commit, settings.json included. A protected path is human-only from the moment it is live on main; before that, the pull request introducing it is the human act, and `approve bootstrap` approves its whole head.

- By the design session:
  - The protected set is the enforcement layer plus the records, always protected. The gate-2-bound and work-zone files are not protected: a change to a bound file reopens gate 2, which is the control.
  - Ship the real `.claude/settings.json` in this pull request.
  - No fetch in the hook, with lock-guard as the authority; realpath on both forms; a fail-closed deny over the constants; the exit-2 wrapper.
  - A workflow change after this slice is a human act. The builder commits the exact file at a work-zone path (`.factory/work/<slice>/workflows/<name>.yml`), and the approver copies it to `.github/workflows/` and commits it.
  - For slice 5: check first whether the relay needs a new workflow at all, or only a permission on `records-validate.yml`. Do not pre-add a write permission before anything uses it.
- For slice 7, from the design session: `doctor` reports the resolved `pod-factory` binary, and fails if it resolves inside a worktree or a branch build rather than the copy installed from main.

## Left, for the approver only, in this order

1. Install the enforcing copy before merging this pull request. It must be a packed copy: `npm install -g ./packages/cli` makes the global `pod-factory` a symlink into that checkout, so whatever it has built, branch builds included, would judge. From a checkout of main: `git checkout main && git pull && npm ci && npm run build --workspace packages/cli`, then `cd packages/cli && npm pack && npm install -g ./pod-factory-0.0.0-m0.tgz`. Until then the committed hook refuses every agent file edit in this repository, deliberately, so a missing hook cannot fail open.
2. This is the first pull request the new checks run on. Its gate-check fails until `pod-factory approve bootstrap <this PR's number>` succeeds, typed in a terminal outside any agent session. Then re-run gate-check and merge.
3. Swap the required checks to `lock-guard`, `verify` and `gate-check`, bound to the GitHub Actions app (ID 15368), with `strict` recommended. The exact command is in `.factory/work/bootstrap-03-ci-jobs/handoff.md`. Then delete `bootstrap-check.yml`.
4. Protect the records branch: forbid force-push and deletion, but do not require reviews or status checks on it, or `verify-record` can never push and every pull request stalls with no verify result.

## Left, for me

- L10: no scheduled run of `records-validate` had fired by 03:32Z on 2026-10-14, 32 minutes after it reached main. Keep watching and record the observed interval.

## Open questions

- None.

## Next step

Slice 5, revoke and the relay, starting by checking whether the relay needs only a permission on `records-validate.yml`.
