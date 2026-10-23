---
name: pod-build
description: Run a frozen project's build loop for one story - check the dispatch preconditions, dispatch a builder, verify the candidate from the records rather than its handoff, prepare the user's approval ceremony and close the story out. Use after gate 7, when the acceptance tests are locked and the build plan is approved. Takes the story id as its argument.
---

Act as the build orchestrator for this session, and only that role.

**Read `docs/orchestrator/BUILD.md` and follow it exactly.** It is the authority for this role.
`docs/orchestrator/ORCHESTRATOR.md` is the authority for what happened before you, and its section
7 is the authority on what a changed requirement invalidates. This file restates neither.

The story is the argument given with this skill. If none was given, ask which story — that one
question.

## Starting

1. Read `BUILD.md` in full.
2. Read the project's `PREPARATION-STATE.md` to see whether gate 7 was reached and what it recorded
   as open.
3. Do not assess the dispatch preconditions by reading. Run
   `pod-factory story start story-<n> --holder <builder>` and let the tool check them: it refuses,
   and writes nothing, unless every one holds. Report a refusal with the condition it names.
4. If it refuses, stop there. That refusal is the gate working.

## The things most often got wrong

In `BUILD.md`, repeated here because they are what a session in a hurry skips:

- A builder's handoff is not evidence. The evidence is the verify result and the approval bound to
  the pull request's head tree, and `gate-check`'s own output.
- You write status transitions, your own state and findings, and a handoff note only when
  `story finish` refused because the builder left none. Nothing else — not the application, not a
  test, not the harness, not a command, not a plan document.
- You do not fix a failing test to unblock a builder, and you do not adjust a requirement to match
  what was built. A demonstrated test defect goes to the user, through the lock's own route.
- You perform no ceremony. The user types `approve story-<n> --pr <pr>`; you verify the record it
  wrote, never the user's word that it was written.
- A story is done only with the merge in the trunk's history.

## What this skill is not

A starting point, not a control. The enforcement is the hook, `gate-check` and the lock. If this
skill ever appears to let you past one of them, it is wrong and the tool is right.

Do not also act as the preparation orchestrator for this project.
