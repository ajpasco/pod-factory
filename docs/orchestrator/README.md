# How this works, in plain English

You have an idea for an application. You want agents to build it properly. The problem is not that
agents can't write code — they can. The problem is that they will happily build the wrong thing
confidently, and tell you it went well.

This is the part that happens **before** anyone writes the application. It turns your idea into
three documents precise enough that a build team can work from them without guessing, and it
checks each step before moving on.

## The six steps

1. **Your idea.** You say what you want. The orchestrator says it back to you. If its version has
   anything in it you didn't say, you correct it before anything else happens.
2. **Clarify.** It asks you one question at a time — never a wall of them. Product questions it
   cannot answer for you. Technical questions come with a recommended default, and if you take the
   default, it's written down as a default rather than as your decision. Anything you'd rather
   decide later is recorded as an open question, not quietly settled.
3. **PRD and mockup.** You get a written requirements document and a clickable mockup. The
   requirements get numbers that never change, so everything afterwards can point at them. You
   change the mockup as many times as you like; each change updates the requirements too, so the
   two never drift apart.
4. **How it should be built.** You're shown real options and you pick. Then every requirement is
   placed in the design, and every single acceptance criterion gets matched to the thing that will
   prove it — a test, a check, a review. If a criterion has nothing that could prove it, that's
   caught here instead of after the build.
5. **Tests and stories.** Every requirement gets at least one test that proves it works and at
   least one that proves it fails properly. Every test points back at exactly one requirement, so
   nothing is untested and no test is testing something nobody asked for. Each test also records
   what it's supposed to do *before* the app is built — most should fail, and knowing which ones
   and why is what makes the next part safe. The work is split into stories that don't touch the
   same files.
6. **Review.** A different agent, in a fresh session that has never seen the earlier conversation,
   reviews the whole plan against a fixed checklist. It reports what's wrong. Things it can fix
   inside the plan, it fixes once, and then a *new* review runs. Things that need a decision from
   you come to you. Things that can't be fixed get written down as limitations rather than hidden.

7. **Ready to build.** An accepted plan still isn't something a team can start on: the tests it
   describes don't exist yet, nothing binds them, and nobody has granted permission. So the tests
   get written — by the orchestrator, never by the people who'll be judged by them — and checked by
   someone who didn't write them. They're run against the empty project to confirm each one fails
   the way the plan predicted, and against a throwaway answer to confirm each one *can* pass. The
   throwaway is destroyed. Then you run the approvals, and the orchestrator checks afterwards that
   each record says what it should.

Then — and only then — you freeze.

## What "freeze" means and why it's last

Freezing takes the fingerprint of the three documents, the test files, and the command that runs
the tests, and records them. From that moment, the builders can start, and no builder can change a
test, a document, or the command. If one tries, the change is detected and the work is rejected.

That's the whole trick: **the standard is set before the work starts, and the people doing the work
can't move it.** It's also why freezing has to come last. Freeze early and you lock in whatever
the plan still got wrong.

## Who the orchestrator works for

It works for you, and that is not a figure of speech. It is the manager of the other agents, not a
neutral party between you and them. In practice that means it checks their claims against the
actual files instead of believing their summaries; it sends sloppy work back to them rather than
bringing it to you; when something does need you, it arrives as a decision with the options, what
each costs and a recommendation, not as a pile of findings to sort through; and anything in a
document that you never asked for gets struck out or raised as a question.

It also means it will tell you when you are about to lock in something the evidence says is
wrong. Once, plainly, with the evidence — and then it does what you decide and records that you
decided it. An orchestrator that agrees with you against the evidence is not on your side.

## Who does what

- **You:** answer questions, choose between options, decide on findings, accept each step. You are
  the only one who can approve anything, and you're the one who freezes.
- **The orchestrator:** runs the process, asks you one thing at a time, keeps the state file,
  hands work to other agents. It writes none of the documents itself and approves nothing.
- **Drafters:** one agent per document, each working from a written standard.
- **Checkers:** separate agents in fresh sessions. A drafter never reviews its own work.

## What it will refuse to do

This matters more than what it does. It will not move past a step that isn't finished, invent an
answer to a product question, write or edit a document it also reviewed, let one session both
write and check the same thing, add scope because a review suggested something, drop or weaken a
test so a step passes, freeze anything by itself, or quietly switch to a different process when
it's stuck. When it's stuck it tells you what's blocking it and stops.

## What you end up with

A numbered requirements document, a technical design where every requirement has a home and every
criterion has something that proves it, a test plan where every requirement is covered both ways,
an ordered list of stories, a written list of the known gaps, and a state file that says exactly
where everything stands. That's the handoff a build team needs.

## Running it

It's plain markdown with no dependencies, so it runs three ways — Orca, Claude Code CLI on its
own, or Codex CLI. See [RUNTIMES.md](RUNTIMES.md). To use it on another project, copy
`docs/orchestrator/` and the `.claude/agents/prep-*.md` files into that repo.

## After it finishes

This is the part before anyone writes the application. What happens afterwards — dispatching a
builder for each story, checking candidates against the records rather than the builder's own
report, running the approvals and closing a story out — is [BUILD.md](BUILD.md). It is a
separate role and should be a separate session: the orchestrator that helped produce the tests
is not the one that decides whether work judged by them is done.

## Honest limits

- The checks catch missing structure, broken traceability and uncovered requirements. They cannot
  tell you the requirements are the *right* requirements. That judgment is yours, in steps 1 to 3,
  and it's the step that most decides whether the result is any good.
- A second agent reviewing a first agent is better than nothing and worse than a careful human. It
  catches different mistakes, not all mistakes.
- Freezing stops a builder cheating. It doesn't make a test correct.
- None of this checks the quality or security of the code that gets written. That happens after
  the freeze, on the build side.
