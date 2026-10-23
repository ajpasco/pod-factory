# L7 — the route for pod-factory to govern its first application, proven in a lab

Status: **proposal awaiting approval.** Nothing in this document has been done to the real
repository. No live record, lock, approval, protection setting or workflow was touched.

This replaces the "root blocker" claim in `GATE-7-RECORD.md`'s ordered path, which was too strong.
The capability exists. What is missing is smaller and is named in section 4.

## 1. What was asked, and what the lab answered

> pod-factory authorizes one story, runs its protected tests, rejects an unauthorized change, and
> accepts the valid implementation.

All four happened, in one disposable clone, driven by the shipped CLI built from `main` at
`cb00c9d`. Every line quoted below is real output.

| # | Claim | Result |
| --- | --- | --- |
| A | A non-story pull request cannot pass `gate-check` while a lock is in force | refused |
| B | A bootstrap approval does not rescue it | refused |
| C | Revoking the lock opens the window; the bootstrap approval then counts | the approval objection disappeared |
| D | The equipment tests can be brought under the lock | 14 equipment files locked |
| E | Gate 3 can authorize an application story alongside the factory's own | bound the plan and 4 stories |
| F | A valid implementation is accepted | `gate-check passes` |
| G | Unauthorized changes are refused even with a human approval bound to the tree | refused, 3 ways |
| H | Re-locking does **not** require revoking the previous lock | second lock written, records still valid |

## 2. The corrected ceremony

I told the user the ceremony was revoke → bootstrap-approve → merge → re-lock, **and that
re-locking needed its own revoke**. That last part is wrong. `lock` refuses only when a lock
already refers to *that* gate-2 approval (`lock.ts`, the `existing` check). A fresh `approve 2`
produces a new record, so `lock` proceeds, and `effectiveLock` takes the latest lock
(`lock-state.ts`). Proven in L7-G: lock `6403c39ea5eb` was still unrevoked when lock
`c43a75163785` was written over it, and `records-validate` reported **93 valid records, 0 flagged**.

So the revoke is needed **once**, to land preparation content, and never again for re-locking.

## 3. What the lab proved, step by step

### A, B — the one real blocker

With lock `0b0bc6b73309` in force, `gate-check` on the preparation branch refused, and after a
real `approve bootstrap 100` it still refused:

```
The approvals for pull request 100 are bootstrap approvals, which stop counting
once the lock exists; it needs "pod-factory approve story-<n> --pr 100".
```

This is the whole blocker, and it is narrow: **content that is not an approved story cannot reach
main while a lock is in force.** Preparation documents and frozen tests are not a story — they are
what a story is built against — so landing them needs the one human revoke.

### D — the tests come under the lock

Two patterns and one command were added to `packages/cli/src/lock-policy.ts` (which is neither
locked nor hook-protected). The locked test that guards those constants **still passes, all five
cases**: its path and command assertions are one-directional (`toContain`), and the one
exact-equality case tests a path set the new entry is not in.

`lock` then covered **14 equipment files of 65** — all 11 frozen test files plus `pytest.ini`,
`requirements-eval.txt` and the new entry point — and pinned a fourth test command.

### E, F — authorize and accept

`approve 3` bound `.factory/work/plan/build-plan.md` and **four** story files including
`story-4`. `story start story-4 --holder claude-opus-5` handed the builder its inputs with hashes.

The implementation used was the one an independent checker built blind from the specification
alone. `verify` ran the locked commands, **exactly as locked**, and all four passed — the
factory's own suites, its 38-test browser trial, and the equipment exam. Then:

```
gate-check passes for pull request 101 at 22f1a1e007e1:
  Approval 29db3d79fed8 ... and verify result 81f1541c578a ... bind tree f7b842a8891a
  Lock 6403c39ea5eb: pull request 101 changes no locked path ...
  All 3 changed files are inside story-4's approved scope.
```

### G — refuse, three ways, each with a real human approval bound to that exact tree

1. **Edited its own locked test** (`test_name.py`, limit 100 → 50). Caught twice: the locked-path
   rule and the scope rule.
2. **Edited an unlocked input outside scope** (`prep/PRD.md`). The lock reported "changes no
   locked path" — and the scope rule caught it anyway. This is the case that matters: **scope, not
   the lock, is what contains a builder.**
3. **Supplied a plugin to its own exam.** A package with a `pytest11` entry point, placed under
   `api/app/helper/` and named in `api/requirements.txt` — **both inside the story's approved
   scope**, so scope and lock were clean and all six changed files passed. Against an
   implementation with one requirement broken:

   ```
   WITH autoload:                      16 passed
   AS LOCKED (autoload disabled):      2 failed, 14 passed
                                       FAILED ... test_T_009_P7_REQ_009_12 ...
                                       FAILED ... test_T_009_N10_REQ_009_6_REQ_009_10 ...
   ```

   The escape works entirely within a legitimate scope, and `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1`
   in the locked entry point is the only thing that closes it. Run end to end, the factory
   refused it on that ground alone:

   ```
   gate-check fails for pull request 104 at 820e5acd0945:
     verify failed for tree 30d1c9108a6d (check result b92b1c443406).
     Lock c43a75163785: pull request 104 changes no locked path ...
     All 6 changed files are inside story-4's approved scope.
   ```

   A human approval bound to that tree, every file in scope, nothing locked touched — and the
   locked command is what caught it.

## 4. The actual missing capability

**The eval plan's commands C0–C13 are prose. Nothing in the repository executes them**, so
`LOCKED_COMMANDS` had nothing to point at. The lab had to write one file:

`projects/equipment-checkout/harness/api/run-unit.sh` — a frozen, locked entry point performing
C2 and C3 verbatim, carrying `--force-reinstall` and `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1`, and
running under `python:3.12` in Docker because the eval plan pins 3.12.

This is the only piece of new code the route needs. It is ~25 lines, it belongs to the harness
rather than to any builder, and it must be locked in the same lock as the tests.

## 5. Three findings from the run

**F7-01 (defect, misleading at the worst moment).** A `verifying` transition record does not record
which pull request it was finished against — only the story, the stages and the handoff note hash.
`status` therefore falls back to the latest story approval (`status/report.ts:143`,
`active(set, isStoryApproval(story)).at(-1)`). After `story finish story-4 --pr 101`, status read:

```
story-4: verifying ... Waits on: the merge of pull request 104, approved by 2ad1c390ac61
```

It named the hijack build. Not an enforcement hole — `gate-check` still refuses 104 — but it
points a human at the wrong pull request at the moment they are about to merge.

**F7-02 (confirmation, not a gap).** I expected this to be a hole in `BUILD.md` and it is not:
its section 2 already has the builder write the handoff note at step 3, before verify at step 5
and the user's approval at step 7. The lab bit me because I did it out of order, and that proves
the order is load-bearing rather than stylistic. Adding the note after approval voids both the
approval and the verify result:

```
Approval 29db3d79fed8 binds tree f7b842a8891a, but the head is at tree 9e7a92e199ec:
the pull request changed after it was approved, so it needs a new review and approval.
```

Worth one added sentence in `BUILD.md` giving that reason, so nobody "helpfully" adds the note
later to unblock a refusal.

**F7-03 (documentation).** `lock-policy.ts` calls `BUILD_PLAN` "the one-story build plan" and
`lock.ts`'s header cites "section 4 for the commands". Gate 3 handles any number of stories — it
bound four here — and the eval plan's commands are section 7. Both comments are stale.

## 6. Human actions this route needs, in order

Every one of these is the user's. None can be substituted by an agent.

1. **Decide the two frozen-case questions** (F-02, F-03 in `findings-S1-rows.md`). Closing either
   adds a requirement ID, which D4 reserves to the PRD at gate 3.
2. **Revoke the active lock** `0b0bc6b73309`, once, in a terminal outside any agent session.
3. **Merge the preparation** with `approve bootstrap`, including the new locked entry point.
4. **`approve 2`, then `lock`** — this is what brings the equipment tests and their runner under
   the lock. No further revoke is needed, now or later.
5. **`approve 3`** over the plan naming the equipment story.
6. **`story start`**, then dispatch the builder.

Step 1 gates nothing mechanical but should not be left for later: the tests are frozen, and a
change after the lock costs an amendment.

## 7. What this lab did NOT prove

- **The human ceremony.** The lab supplies the invocation context directly, so it stands in for a
  human at a terminal. That is exactly why steps 2–6 above must be run by the user: `approve`,
  `lock` and `revoke` refuse inside an agent session, and the lab did not test that refusal.
- **The database row.** Only the unit tree ran here. `T-008-N7` was proven separately against real
  PostgreSQL 16 earlier (`1 passed`), and a `C5` entry point still has to be written and locked
  the same way as `run-unit.sh`.
- **GitHub branch protection.** The lab's remote is a local bare repository. Whether the required
  checks are wired as the protection rules expect was not exercised.
- **Story-3.** It sits at `in-progress` with an expired lease, and the factory has no transition
  that abandons a story. The plan the lab used names it as parked; only a human may revoke its
  transition records.
