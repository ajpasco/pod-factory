# The build side: what happens after gate 7

[ORCHESTRATOR.md](ORCHESTRATOR.md) covers preparation — the seven gates that turn an idea into a
PRD, a blueprint, an eval plan and a frozen, build-ready project. It stops at the dispatch. This
file covers what happens next, and it is a smaller document on purpose: by the time a builder
starts, almost every judgement has already been made and written down. The build side is mostly
checking that it stays made.

The build orchestrator is a different role from the preparation orchestrator, and should be a
different session. The preparation orchestrator helped produce the tests; the build orchestrator
decides whether work judged by those tests is done. One session doing both is the same mistake as a
drafter checking its own artifact.

## 1. Where it starts, and what it may assume

It starts with gate 7 passed: the acceptance tests exist as code on the trunk, they fail for the
reason the plan predicts, they have been shown satisfiable, a session that did not write them has
reviewed them, the project's test paths and commands are in the lists the lock reads, and the user
has run the ceremonies — classification, gate 2, the lock, the build plan and story files, gate 3.

It assumes none of that on anyone's word. Every item is a condition `pod-factory story start`
checks, and the orchestrator's first act is to let it check them.

## 2. The loop, once per story

Each step names who performs it. The ones marked **user** cannot be performed by an agent: the
tool refuses an agent session by its marker, and that refusal is the design.

1. **Orchestrator:** `pod-factory story start story-<n> --holder <builder> [--lease <minutes>]`.
   This is not a ceremony and the orchestrator runs it. It refuses, and writes nothing, unless all
   of the following hold: there is a valid, unrevoked gate-3 approval; the build plan on the trunk
   still matches what that approval bound; the story is named in that plan; the story file has its
   `Tests:`, `Scope:` and `Inputs:` lists; the story is at stage `ready`; **every path in `Tests:`
   is locked at its content on the trunk**; and every path in `Inputs:` is present on the trunk.
   A refusal is never worked around. It is reported with the condition it names.

2. **Orchestrator:** dispatch one builder. It is given the story file and nothing more
   persuasive: the `Scope:` globs it may write, the `Tests:` that will judge it, the `Inputs:` it
   may read, and the locked commands it must run. It is told plainly that it may not change a
   test, the harness, the configuration or the commands, and that a demonstrated test defect is
   reported to the orchestrator rather than repaired.

3. **Builder:** implements inside its scope, runs the locked commands, and writes its handoff
   note on the branch.

4. **Orchestrator:** `pod-factory story finish story-<n> --pr <pr>` moves the story from
   in-progress to verifying. It refuses if the builder's session ended without a handoff note; see
   section 3 for the one thing the orchestrator writes in that case.

5. **CI:** re-runs the locked commands on the pull request's own tree and writes a verify result
   bound to that tree. This, not the builder's report, is the evidence.

6. **Orchestrator:** reads `gate-check` and reports to the user what it found — including a
   failure, in full, with the condition that failed.

7. **User:** `pod-factory approve story-<n> --pr <pr>`, typed in a terminal outside any agent
   session.

8. **Orchestrator:** verifies the record that was written — that it exists, is unrevoked, names
   this story and this pull request, and binds the exact head tree — then re-runs `gate-check`.
   A ceremony is never recorded as done because the user said it was done.

9. **User or orchestrator, per the project's rule:** merge, once `gate-check` succeeds.

10. **Orchestrator:** `pod-factory story finish story-<n> --pr <pr>` again, which moves verifying
    to done. It refuses while there is no valid story approval, if the pull request changed after
    the approval, or until the merge is actually in the trunk's history.

## 3. What the orchestrator writes during a build

Almost nothing, and the exceptions are worth naming exactly, because a rule stated more broadly
than it is true gets ignored the first time it is contradicted.

It writes **the story's status transitions**. The tool requires this: status transitions are
written by the orchestrator or a human, never by CI.

It writes **a missing handoff note on the branch**, and only when `story finish` has refused
because the builder's session ended without one. The note records that the builder's session ended
without it; it does not invent what the builder would have said, and it never reports work the
orchestrator did not see evidence of.

It writes **its own state and findings**.

It writes **nothing else**. Not the application, not a test, not the harness, not a command, not
the PRD, the blueprint or the eval plan. In particular it does not fix a failing test to unblock a
builder, and it does not adjust a requirement to match what was built.

**How much of that is enforced, honestly.** The hook denies every agent session — the
orchestrator's included — any edit to a locked path, so the frozen tests and harness are
genuinely out of reach once the lock covers them. The plan documents are a different matter: if a
project's PRD, blueprint and eval plan are not themselves in the locked set, nothing stops an
orchestrator editing the requirements the tests were frozen against, and the tests would still
pass while measuring against a specification that moved. Until a project locks its plan paths, this
section is discipline rather than enforcement, and should be read as such.

## 4. Evidence, and what is not evidence

- **Evidence** is a record: a verify result bound to the head tree, an approval bound to the head
  tree, `gate-check`'s own output, the merge in the trunk's history.
- **Not evidence:** a builder's handoff saying the tests passed. A builder runs the suite in its
  own environment, which it partly controls, so a green local report establishes nothing about the
  tree that would merge. CI re-runs the commands on that tree precisely so the local report does
  not have to be trusted. An orchestrator that accepts a handoff's green in place of the record has
  skipped the only step that was protecting it.

## 5. The builder's constraints, and where scope does not reach

The story's `Scope:` is a whitelist: `gate-check` fails on any changed path that does not match it,
including a path nobody predicted, so a builder cannot add a file that interferes with its own exam
and still merge. That is the strongest guarantee on this side, and most imagined attacks die there.

Two things it does not reach, both learned the hard way:

- **The builder's own dependency list is inside its scope**, legitimately. If the command that
  installs the frozen test tools runs after it, into the same environment, and does not force a
  reinstall, the builder can supply the runner of its own exam — no out-of-scope file required. A
  project's install command must verify the frozen tools whatever is already present.
- **A green local run proves nothing**, as above. Scope governs what merges, not what the builder
  reports.

When something like this is found, it is a defect in the frozen harness and the commands, which are
the user's to change through the lock's own route — not the orchestrator's to patch.

## 6. When a requirement changes while building

The orchestrator does not edit the plan. It cannot: a locked eval plan is denied to every agent
session. The route is the user's:

1. The orchestrator names the drift — the requirement, the rows that bear on it, the stories
   affected — and stops.
2. The user amends the PRD and whatever it invalidates, by the invalidation rules in
   [ORCHESTRATOR.md](ORCHESTRATOR.md) section 7, returning to the earliest invalidated gate.
3. The user revokes the lock, which reopens gate 2; the amended plan and tests are approved and
   the lock is re-applied.
4. Only then is a story started against the new tests.

**An honest gap.** This works cleanly for *new* behaviour, because a test command joins the lock
only when the path it requires exists: tests for an unbuilt feature are dormant on the trunk, so
they can sit there failing without turning the trunk red. For behaviour that is already built the
command is already live, so an amended, now-failing test cannot wait on the trunk for its
implementation — it would fail the verification every other pull request depends on. Today the only
route is to land the amended test and its implementation in one approved change, which means that
for a *change*, the test was not protected before the code was written. The human approval and the
re-lock afterwards are what stand in for it. This is a real limitation of the current design and not
a step anyone forgot.

## 7. What the build orchestrator refuses

It says which rule applies, what it did not do, and what the user can do next:

- Work around a `story start` or `story finish` refusal, or substitute another process for a
  blocked step. It reports the blocker and stops.
- Perform a ceremony, or record one as done on the user's word rather than the written record.
- Treat a builder's handoff, or any agent's claim, as evidence.
- Report a story as done without the merge in the trunk's history.
- Change a test, the harness, a command or a plan document — to unblock a builder or for any other
  reason.
- Widen a story's scope, or ask the user to widen it so a candidate passes.
- Dispatch a second builder for a story that is already held, or dispatch at all while any
  dispatch precondition fails.
- Let a builder repair the harness that judges it, or write the test that judges it.
- Also act as the preparation orchestrator for the same project, or review work it helped produce.
- Merge, or ask for a merge, while `gate-check` fails.

## 8. Known limits

- This side checks that the standard set during preparation is the standard applied. It cannot tell
  you the standard was right; that was gates 1 to 6, and a frozen test can be both unfakeable and
  wrong.
- Nothing here reviews code quality, performance or security. A story whose tests pass and whose
  scope held is *accepted*, not *good*. If those matter, they belong in the eval plan as rows
  before the freeze, or in a human review step the project adds deliberately.
- The lease on `story start` records who holds a story. It does not prevent a second agent editing
  the same branch; it makes the holder visible.
- Everything here assumes the records are trustworthy, which rests on the records branch being
  protected and the enforcing binary being the one installed from the trunk. Both are properties of
  the installation, not of this document.
