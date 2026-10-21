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

It assumes none of that on anyone's word — but `story start` does not check all of it, and an
orchestrator that believes it does will read a successful dispatch as proof the tests are sound.
What the tool actually checks is four things: that a valid, unrevoked gate-3 approval exists and
every file it bound still hashes the same on the trunk; that the story is in that bound set, carries
non-empty `Tests:`, `Scope:` and `Inputs:` lists, and is at stage `ready`; that every `Tests:` path
hashes on the trunk to the effective lock's hash for it; and that every `Inputs:` path exists on the
trunk. Gate 2 and the lock are implied rather than checked, since a lock record exists only after
`lock` checked a gate-2 approval.

`story start` is also not a dry run: it writes the transition when it passes, so there is no way to
rehearse a dispatch. The read-only pre-check of these same conditions belongs to gate 7 and to the
preparation orchestrator, which reads the records and hashes directly and writes nothing
([ORCHESTRATOR.md](ORCHESTRATOR.md) gate 7). The two are different acts on the same conditions: one
confirms the project is ready to dispatch, the other dispatches.

What it cannot check stays the orchestrator's to confirm from gate 7's own record: that the tests
fail for the reason the plan predicts, that they were shown satisfiable, that a session which did not
write them has reviewed them, and the classification. No tool can establish those. A clean
`story start` says nothing whatever about them.

## 2. The loop, once per story

Each step names who performs it. The steps marked **user** are refused to an agent session:
`approve`, `lock` and `revoke` classify the actor from the environment — any non-empty `CLAUDECODE`
or `AI_AGENT` marker makes it an agent, and only a marker-free session holding a TTY on both stdin
and stdout counts as human — and refuse anything that is not human. That is a refusal on a signal,
not a proof of humanity: a session that unset those markers and allocated a pty would be classified
human. It reliably stops an agent performing a ceremony out of convenience, which is what it is for.
It would not stop one built to evade it, and it is written here so nobody mistakes it for more.

1. **Orchestrator:** `pod-factory story start story-<n> --holder <builder> [--lease <minutes>]`.
   This is not a ceremony and the orchestrator runs it. It refuses, and writes nothing, unless all
   of the following hold: there is a valid, unrevoked gate-3 approval; the build plan on the trunk
   still matches what that approval bound; the story is named in that plan; the story file has its
   `Tests:`, `Scope:` and `Inputs:` lists; the story is at stage `ready`; **every path in `Tests:`
   is locked at its content on the trunk**; and every path in `Inputs:` is present on the trunk.
   A refusal is never worked around. It is reported with the condition it names.

2. **Orchestrator:** dispatch one builder. It is given the story file and nothing more
   persuasive: the `Scope:` globs it may write, the `Tests:` that will judge it, the `Inputs:` it
   may read, and the locked commands it must run — which are not in the story file and not printed
   by `story start`. They live in the lock record, as `lock.testCommands`, and are read from the
   records branch (section 10). They are the same commands CI will run, which is the whole point of
   handing them over verbatim rather than describing them. It is told plainly that it may not change a
   test, the harness, the configuration or the commands, and that a demonstrated test defect is
   reported to the orchestrator rather than repaired.

3. **Builder:** implements inside its scope, runs the locked commands, and writes its handoff
   note at `.factory/work/story-<n>/handoff.md` — that exact path, which `story finish` requires by
   name — then commits and pushes it with the rest of its work, **opens the pull request, and
   reports its number.** Nothing else in the loop produces that number, and no record will ever hold
   it, so this is where it enters the orchestrator's state (section 3). The orchestrator does not
   take the number on the builder's word alone: it fetches that pull request's head and confirms the
   head contains the handoff note at the expected path before using it. A number that does not
   resolve to a branch carrying this story's note is reported, not used.

4. **Orchestrator:** `pod-factory story finish story-<n> --pr <pr>` moves the story from
   in-progress to verifying. It refuses if the builder's session ended without a handoff note; see
   section 3 for the one thing the orchestrator writes in that case.

5. **CI:** re-runs the locked commands on the pull request's own tree and writes a verify result
   bound to that tree. This, not the builder's report, is the evidence.

6. **Orchestrator:** runs `pod-factory ci gate-check --pr <pr> --head <commit>` and reports to the
   user what it found — including a failure, in full, with the condition that failed. `gate-check`
   is a `ci` job, not a top-level command; it reads records only and requires no particular actor,
   so the orchestrator may run it. It needs the head commit as well as the number, which comes from
   `git fetch origin refs/pull/<pr>/head && git rev-parse FETCH_HEAD`; see section 10.

7. **User:** `pod-factory approve story-<n> --pr <pr>`, typed in a terminal outside any agent
   session.

8. **Orchestrator:** verifies the record that was written — that it exists, is unrevoked, names
   this story and this pull request, and binds the exact head tree — then re-runs
   `pod-factory ci gate-check --pr <pr> --head <commit>`. A ceremony is never recorded as done
   because the user said it was done. If the approval binds anything other than the current head,
   section 6.3 applies.

9. **User:** merge, once `gate-check` succeeds. Merge authority is the user's unless they have
   recorded otherwise for this project in the build state file; no document grants it to an agent by
   describing it, and an orchestrator that has not been given it in words does not have it.

10. **Orchestrator:** `pod-factory story finish story-<n> --pr <pr>` again, which moves verifying
    to done. Of its three waiting conditions only one is a refusal: a pull request that changed
    after its approval exits non-zero, while *no valid story approval yet* and *approved but not yet
    merged* each print what they are waiting on and **exit 0, writing nothing**. A story is done
    when the command says it is done, never because the command exited 0.

**Where the pull request number comes from: the orchestrator's own state, written at step 4 and
never re-derived.** Not from `pod-factory status`. A transition record cannot name a pull request —
the record format's transition block is exactly `story`, `from`, `to`, `lease` and `handoffNote`,
with no field for one — so nothing in the records ties a verifying story to the pull request being
verified. `status` fills that hole by inference: for a verifying story it takes the *latest* story
approval and prints that approval's pull request as the one to merge. Where a story has collected
more than one approval, the latest is not necessarily the one under test; in the L7 lab this named
the pull request carrying an unauthorized change as the one to merge, because that change had since
been approved against its own tree. `story finish` is stricter than `status` — it looks for an
approval naming this story *and* this pull request — so a number taken from `status` does not produce
a loud failure. It produces a quiet exit 0 saying there is no valid approval, for a story that is
approved on a different pull request. Read `status` for a story's stage. Never read it to decide what
to merge.

**When the verification comes back red.** The story stays in `verifying`. There is no transition back
to `in-progress` and none is needed: the builder pushes its fix to the same pull request, CI
re-verifies the new head, the user approves that head, and step 10 then finds an approval whose tree
matches and moves the story to done. Two consequences are worth stating plainly. The earlier verify
result and any earlier approval are void the moment the head moves, so every fix costs a fresh CI run
and a fresh ceremony from the user — which is the argument for the builder running the locked
commands itself before step 4, not after. And the orchestrator does not re-dispatch to retry, because
`story start` refuses any story that is not at stage `ready`. A builder that has gone silent is a
different problem; see sections 6.4 and 9.

## 3. What the orchestrator writes during a build

Almost nothing, and the exceptions are worth naming exactly, because a rule stated more broadly
than it is true gets ignored the first time it is contradicted.

It writes **the story's status transitions**. The tool's rule here is narrower than the
convention: it refuses only the CI check-runner, so any agent session — a builder, or one of its
subagents — could write a transition. That the orchestrator is the one who writes them is this
document's rule, not the tool's.

It writes **a missing handoff note on the branch**, and only when `story finish` has refused
because the builder's session ended without one. The note records that the builder's session ended
without it; it does not invent what the builder would have said, and it never reports work the
orchestrator did not see evidence of.

It has no `Write` or `Edit` tool, so this happens through `Bash`, on a checkout of the builder's
branch, and it needs push access to that branch:

```
git fetch origin refs/pull/<n>/head
git worktree add /tmp/story-<n> FETCH_HEAD
mkdir -p /tmp/story-<n>/.factory/work/story-<n>
cat > /tmp/story-<n>/.factory/work/story-<n>/handoff.md <<'NOTE'
# story-<n> handoff

The builder session (holder: <holder>) ended without writing this note. It was written by the
build orchestrator so that `story finish` could proceed.

What the orchestrator observed, and nothing more:
- the branch at <head>
- the locked commands it ran, and their results, or that it did not run them
- what it did not observe, named as not observed
NOTE
git -C /tmp/story-<n> add .factory/work/story-<n>/handoff.md
git -C /tmp/story-<n> commit -m "Add the missing handoff note for story-<n>"
git -C /tmp/story-<n> push origin HEAD:<branch>
```

The note is a record of absence. It states who held the story, that the session ended without the
note, and only what the orchestrator itself observed — never a summary of work it did not watch.
Pushing it moves the head, so it happens before the verification and the approval, never after.

It writes that note **before the verification and the approval, never after** — which is why the
order in section 2 is load-bearing rather than tidy. The verifying transition hashes the note's
content, and the verify result and the story approval each bind the branch's head tree. A note added
once either of those exists changes that tree and voids both: in the L7 lab, supplying a missing note
after the approval invalidated the approval and the verify result together, costing a fresh CI run
and a second ceremony from the user. `story finish` enforces half of this by refusing to move a story
to verifying without a note; nothing enforces the other half, so it is written down here.

It writes **its own state and findings**, in one file — `BUILD-STATE.md`, holding per story: the
pull request number, the holder, the head commit and tree at each verification, the record IDs of
every approval and verify result it read, each failure and re-dispatch, and the user's decisions with
who decided. Any session must be able to resume from it alone, which is not a nicety: no record holds
the pull request number, so this file is the only place it exists.

**It is kept outside the repository**, in the orchestrator's own working directory, and that is a
constraint rather than a preference. The path it would naturally want — beside the project's
`PREPARATION-STATE.md` — is outside every story's `Scope:`, so committing it on a story's branch
fails the scope check and takes the pull request down with it. Landing it separately is worse: while
a lock is in force `gate-check` counts only story approvals, so a pull request carrying nothing but
the state file cannot pass the gate at all. There is no route for it onto the trunk during a build,
and inventing one means a ceremony nobody planned. Anything that genuinely must travel with a story
goes in `.factory/work/story-<n>/`, which scope exempts in full; everything else stays local and is
handed to the next session as a file.

It writes **nothing else**. Not the application, not a test, not the harness, not a command, not
the PRD, the blueprint or the eval plan. In particular it does not fix a failing test to unblock a
builder, and it does not adjust a requirement to match what was built.

**How much of that is enforced, honestly: less than it looks.** The hook answers exactly four
tools — `Write`, `Edit`, `MultiEdit` and `NotebookEdit` — and allows every other tool without a
check. A shell command never reaches it, so a `sed -i`, a redirect or a `git checkout` over a locked
test is not seen at all, and this role needs `Bash` to run `pod-factory` and `git` in the first
place. The hook's own source calls it "the advisory layer; CI's lock-guard is the authority", and
that is the honest summary: the frozen tests are out of reach of a careless edit, not of a
determined one. What actually stops a locked-path change from landing is CI — lock-guard and
`gate-check` on the pull request — which is the deeper reason nothing in this document treats a
clean local run as evidence.

The hook also allows everything when there is no `.factory` directory and when no lock is in force,
and it reads the lock from the local copy of the records ref without fetching, so it can be deciding
from a stale lock.

The plan documents are a separate and worse gap. The locked set is a compile-time constant in the
CLI, not a project's choice: it covers `docs/eval-plan.md` but not `docs/PRD.md`, not the blueprint,
and not `.factory/work/plan/**` or the story files. A project therefore cannot lock its own plan
paths, and an orchestrator that edited the requirements the tests were frozen against would not be
stopped by anything — the tests would still pass, while measuring against a specification that had
moved. The build plan and the story files do have one real protection, and it is not the lock:
`story start` and `gate-check` both re-hash them against what gate 3 bound, so a change to either is
caught at the next dispatch or at the gate. For the PRD and the blueprint this section is discipline,
and making it anything more needs a change to the CLI's own constants.

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
(The lab runs referred to throughout as "the L7 lab" are recorded in
[L7-GOVERNED-BUILD-ROUTE.md](../projects/equipment-checkout/prep/L7-GOVERNED-BUILD-ROUTE.md); every
claim this document attributes to them is reproducible from there.)

Three edges are worth knowing exactly. The story's **own** work folder, `.factory/work/story-<n>/`,
is exempt in full — not merely its handoff note — so a builder may add arbitrary files there
unchecked. Every other path under `.factory/` is outside scope whatever the globs say, which is
stricter than a whitelist. And the scope check runs only when the approval being counted is a story
approval: before a lock exists bootstrap approvals count, and no scope check runs at all.

Two things it does not reach, both learned the hard way:

- **The builder's own dependency list is inside its scope**, legitimately. If the command that
  installs the frozen test tools runs after it, into the same environment, and does not force a
  reinstall, the builder can supply the runner of its own exam — no out-of-scope file required. A
  project's install command must verify the frozen tools whatever is already present.
- **A green local run proves nothing**, as above. Scope governs what merges, not what the builder
  reports.

When something like this is found, it is a defect in the frozen harness and the commands, which are
the user's to change through the lock's own route — not the orchestrator's to patch.

### 5.1 One story at a time, and how a builder may fan out

One story in flight, one builder per story, and that builder may use subagents inside its own scope.
This is a recommendation with evidence under it, not a preference.

The factory judges a story **at the pull-request boundary**. `gate-check` is where both the lock
rule and the scope check run, against the tree that would merge; `verify` does neither — it only
runs the locked commands on that head and records the result. A story's `Scope:` has no edit-time
enforcement at all: nothing stops an agent writing outside its scope, `gate-check` simply refuses the
result. So a story written by one agent and the same story written by one agent with five subagents
present the factory with the same thing: one diff, one approval, one verify result.

Fanning out does not weaken the edit-time guard either, for the blunt reason section 3 gives: that
guard is advisory and already bypassable from a shell, so it is not what this side's safety rests on.
What a subagent *cannot* do is the part that is enforced where it counts. Claude Code sets
`CLAUDECODE` in every shell it starts and an agent marker beats every other signal in the actor
check, so a subagent is an agent for every purpose the records care about: it cannot write a verify
result, which requires the CI check-runner, and it cannot perform a ceremony.

Fanning out inside a story therefore costs the enforcement side nothing and needs no change to the
tool. Step 2's "one builder" is a dispatch of one *accountable* session, not a claim about how many
processes it runs.

Running stories in parallel is a different question, and worse than it looks:

- **Nothing checks that two stories' scopes are disjoint.** Gate 3 reads every story file in the plan
  together and binds them all, and in the L7 lab it approved three stories claiming the identical
  `Scope:` glob without an objection; two builders then started concurrently. Two agents writing one
  file is the only failure on this side that destroys work rather than merely annoying, and the
  factory will not catch it.
- **Parallelism costs more of the user's ceremony, not less.** An approval binds a tree. When one
  story merges the trunk moves, every other in-flight branch rebases, and their approvals and verify
  results are void. Three stories in parallel cost roughly six approval ceremonies and six CI runs;
  the same three in sequence cost three of each. Merges serialize either way — parallel work only
  pays for the collisions.
- **`--holder` is an unverified label.** Any session can claim any holder string. One builder per
  story keeps it honest by construction.

Inside a story the cap that matters is not a number of subagents but **one concurrent writer per
scope**. Two subagents editing one file is the disjointness failure again, moved inside, and a parent
reviewing five overlapping diffs catches it no better than the factory did. So a builder fans out by
role rather than by parallel writing: one subagent implements against the frozen tests, one or two
review the result against those tests without the implementer's reasoning, and the parent arbitrates
and owns the single commit.

### 5.2 Three seats, and which rule each is under

"The orchestrator writes nothing during a build" — section 3 — governs the orchestrating seats. It
does not govern the builder, which must write to do its job, and which, when it fans out, is itself a
small orchestrator of its own subagents. Stated plainly:

- **The preparation orchestrator** produced the tests and is finished. It does not return for this
  project.
- **The build orchestrator** dispatches, reads records, reports, and writes only the three things in
  section 3.
- **The builder** writes inside its `Scope:` and nowhere else, and is answerable for everything its
  subagents write.

How much of the middle seat is enforced, honestly: almost none of it. Its agent definition grants
`Read`, `Bash`, `Glob`, `Grep`, `Agent` and `AskUserQuestion` — no `Write`, no `Edit` — which removes
the convenient path to editing a file. It does not remove `Bash`, which the role needs for
`pod-factory` and `git`, and which the hook does not answer at all, so a shell write by this seat is
checked by nothing until CI. That seat is kept by its definition plus section 3 and the fact that its
own output is the evidence a user reads — not by a sandbox.

## 6. When something goes wrong

Section 2 is the happy path, and most of this document is about staying on it. These are the
situations that actually arise. None of them is the orchestrator's to resolve alone: each ends either
in work going back to the builder or in a report to the user.

### 6.1 The locked commands fail on the builder's branch

This is before step 4, and it is the common case rather than an incident. The orchestrator reads the
command output rather than the builder's summary of it, and decides which of two things it is:

- **The implementation is wrong.** It goes back to the builder with the failing assertion quoted.
  No record changes, no ceremony is spent, and no new dispatch is needed: the story is still
  in-progress and the builder still holds it.
- **The test is wrong.** That is a claim to be demonstrated, not asserted. The orchestrator
  reproduces the failure from the locked command, shows what the test asserts and why no
  implementation inside the story's `Scope:` could satisfy it, and reports that to the user. It does
  not edit the test and it does not ask the builder to work around it. A defect in a locked test is a
  gate-7 failure arriving late, and the route back is section 7's.

Two passes at the same failure is the limit before it goes to the user. Past that the orchestrator is
guessing, and the user is cheaper than a third guess.

### 6.2 The verification fails after step 4

Section 2 covers the mechanics. What belongs here is the rule that follows from them: **the
orchestrator does not ask for the approval until the verification on that exact head is green.**
Asking earlier spends a ceremony that the next push will void, and the user's ceremonies are the
scarcest thing in this loop.

### 6.3 The approval does not match what is being verified

Step 8 exists for this, and it is not hypothetical: an approval can name the right story and the
right pull request and still bind an earlier head, if the branch moved between the user reading it
and the user typing. The orchestrator reports exactly that and changes nothing. The repair is the
user's, in this order — a fresh verification on the current head, then
`pod-factory revoke <record ID> --reason "<why>"` for the stale approval, then the ceremony again.

The revoke is not housekeeping. `gate-check` counts the latest approval whose bound tree matches the
head, so a stale approval left in place is a record asserting that a tree was approved when it was
not. Leaving it is the one thing here that corrupts the evidence rather than merely blocking it.

### 6.4 The builder goes silent

The signal is the absence of a handoff note, never the lease, which decides nothing (section 9). The
orchestrator waits the lease it set and then reports; it does not invent a longer timeout because
work might still be happening. What it reports depends on what the builder left behind:

- **A pull request with a handoff note.** Nothing needs the user. Continue from step 4.
- **A pull request without one.** The orchestrator writes the note (section 3) and continues. An
  expired lease is irrelevant here: `story finish` from in-progress never reads it.
- **No pull request at all.** This is the only truly wedged case. The story cannot advance and
  cannot be re-dispatched, because `story start` refuses any story not at stage `ready`. The
  orchestrator reports the in-progress transition record's ID and the one command that frees it,
  which is the user's: `pod-factory revoke <record ID> --reason "<why>"`. Revoking that transition
  drops it from the active set, the story falls back to `ready`, and it can be dispatched again.

### 6.5 Which story is next, and whether two may run at once

The build plan's order is the order. A story file declares only `Tests:`, `Scope:` and `Inputs:` —
there is no dependency field — so nothing in the records can express "story 5 needs story 4 first".
Where an order matters it is prose in the build plan, and the orchestrator follows it rather than
improving on it.

Before starting a story alongside one in flight, the orchestrator checks that their scopes do not
overlap, because nothing else will (section 5.1). This is not a string comparison. `Scope:` globs
compile with `**` meaning any characters at all and `*` meaning any characters except `/`, anchored
at both ends, so `api/app/**` and `api/app/models/*.py` overlap completely while sharing no text.
Expand both against the trunk and intersect:

```
git ls-tree -r --name-only origin/main | grep -E '^api/app/.*$'
git ls-tree -r --name-only origin/main | grep -E '^api/app/models/[^/]*\.py$'
```

A non-empty intersection means the stories are not independent, and the orchestrator reports that
rather than dispatching. The limit of the check, stated plainly: it sees only files that already
exist, and creating files is most of what a builder does. So where two scopes share a directory
prefix at all, treat them as overlapping whatever today's file list says.

### 6.6 A second project wants to build at the same time

Unconstrained, untested, and not endorsed here. Records, locks and story numbers are all
per-repository: story IDs are a single flat namespace, and `effectiveLock` resolves to one lock for
the whole repository. Two build orchestrators in one repository would contend for both. Nothing in
the tool prevents it and nothing here supports it — one build orchestrator per repository, and the
second project waits.

## 7. When a requirement changes while building

The orchestrator does not edit the plan. For the eval plan, the hook will refuse a `Write` or
`Edit` once the lock covers it, and CI's lock-guard will fail the pull request regardless of how the
change was made; for the PRD and the blueprint, which the locked set does not cover, this is a rule
rather than a refusal — see section 3. The route is the user's either way:

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

## 8. What the build orchestrator refuses

It says which rule applies, what it did not do, and what the user can do next:

- Work around a `story start` or `story finish` refusal, or substitute another process for a
  blocked step. It reports the blocker and stops.
- Perform a ceremony, or record one as done on the user's word rather than the written record.
- Treat a builder's handoff, or any agent's claim, as evidence.
- Report a story as done without the merge in the trunk's history. Note which test applies:
  `story finish` accepts either proof — the approved head being an ancestor of the trunk (a merge
  commit), or the trunk holding exactly the approved tree (a squash). An ancestor test alone reads a
  squashed merge as never merged, so the orchestrator takes `finish`'s own verdict rather than
  computing its own.
- Change a test, the harness, a command or a plan document — to unblock a builder or for any other
  reason.
- Widen a story's scope, or ask the user to widen it so a candidate passes.
- Dispatch a second builder for a story that is already held — the tool refuses this, and the
  orchestrator does not route around the refusal — or dispatch at all while any dispatch
  precondition fails.
- Start a second story alongside one in flight whose `Scope:` globs overlap it. Nothing in the tool
  checks this, so the orchestrator checks it before dispatching and reports the overlap instead.
- Let a builder repair the harness that judges it, or write the test that judges it.
- Also act as the preparation orchestrator for the same project, or review work it helped produce.
- Merge, or ask for a merge, while `gate-check` fails.

## 9. Known limits

- This side checks that the standard set during preparation is the standard applied. It cannot tell
  you the standard was right; that was gates 1 to 6, and a frozen test can be both unfakeable and
  wrong.
- Nothing here reviews code quality, performance or security. A story whose tests pass and whose
  scope held is *accepted*, not *good*. If those matter, they belong in the eval plan as rows
  before the freeze, or in a human review step the project adds deliberately.
- **The lease is a label, not a timer.** `expiresAt` is written into the transition and appears in
  three messages — two from `story start`, one from `status`, which compares it with the clock only to
  choose between "lease until" and "lease expired at". No decision anywhere reads it. A second
  `story start` on an in-progress story is turned away whether or not the lease has expired, and it is
  turned away by printing "Nothing was written" and **exiting 0**, so an orchestrator that checks only
  exit codes reads a refused dispatch as a successful one and must read the output instead. The lease
  makes the holder visible and blocks a takeover; it releases nothing, and it does not stop a second
  agent editing the same branch.
- A builder that dies mid-story is only half stuck, and only one of the three cases needs the user.
  Section 6.4 has them.
- Everything here assumes the records are trustworthy, which rests on the records branch being
  protected and the enforcing binary being the one installed from the trunk. Both are properties of
  the installation, not of this document.

## 10. The commands, exactly

Every command this role touches, with who may run it. None of them replaces reading the refusal: each
one names the condition it stopped on, and that text is what gets reported.

**The orchestrator's own. An agent session may run all of these:**

```
pod-factory story start story-<n> --holder <builder> [--lease <minutes>]
pod-factory story finish story-<n> --pr <pull request>
pod-factory status
pod-factory ci gate-check --pr <pull request> --head <commit>
pod-factory doctor
```

`status` reads and never writes, and exits 0 however blocked everything is. `ci gate-check` reads
records only and requires no particular actor, so the orchestrator may run it; it needs **both**
`--pr` and `--head`, and it exits non-zero when the gate fails. `doctor` reports which enforcement
layers are present.

**The user's, in a terminal with no agent session. Both refuse an agent by its marker:**

```
pod-factory approve story-<n> --pr <pull request>
pod-factory revoke <record ID> --reason "<why>" [--wait <seconds>]
```

The orchestrator prepares these and never types them: the exact command, the pull request, the head
tree it expects the approval to bind, and confirmation that the verification on that head is already
green. Running `revoke` again for an already-revoked record reports whether CI has enforced the
revocation.

**CI's. No session runs these by hand:**

```
pod-factory ci verify --pr <n> --head <commit> --subject <dir> --bundle <dir>
pod-factory ci verify-record --pr <n> --head <commit> --bundle <dir> --verify-result <conclusion> \
  --run-id <id> --run-url <url>
pod-factory ci lock-guard --pr <n> --head <commit>
pod-factory ci records-validate
```

`verify-record` requires the check-runner actor and refuses every agent session. That refusal is what
makes a verify result evidence rather than a claim, which is why the orchestrator never tries to
produce one. Note that `--verify-result` takes the verify job's **conclusion**, not a path: the job
treats anything other than `success` as a failure and says so in the record it writes.

**Git, for the facts the records are about:**

```
git fetch origin refs/pull/<n>/head                  # a pull request's head, as the tool fetches it
git rev-parse FETCH_HEAD                             # the head commit, for --head
git rev-parse FETCH_HEAD^{tree}                      # the head tree an approval must bind

git fetch origin pod-factory/records                 # before trusting any record read
git ls-tree -r --name-only origin/pod-factory/records records/   # every record, newest names last
git show origin/pod-factory/records:records/<file>   # one record, verbatim

git rev-parse origin/main^{tree}                     # the trunk's tree
git ls-tree -r --name-only origin/main               # the trunk's files, for a scope overlap check
```

`FETCH_HEAD` is overwritten by the next fetch, so both `rev-parse` calls run straight after the pull
request fetch and before the records fetch. The records branch is read from
`refs/remotes/origin/pod-factory/records`, and neither the hook nor a stale clone fetches it for you,
so any read a decision rests on is preceded by that fetch. In a shallow clone — the default in
GitHub Actions — pod-factory refuses to read the records at all and says so; the remedy it names is
`git fetch --unshallow`.

Record files live in `records/` on that branch and each name ends `-<recordId>.json`. Reading one,
what matters is: `binds.tree` (must equal the head tree), whether its ID appears in any revocation,
and for an approval `approval.kind`, `approval.story` and `approval.pullRequest`. A record whose
`binds.tree` is not the current head is the case section 6.3 covers, not a record to work around.
