# Backup branch — not a merge candidate

This branch exists so that work which lived on one laptop has a second copy. It is
**never** to be merged into `main`, and it carries no approval, no classification and no
claim to be correct. Read it as an archive.

It was cut from `main` at `621bfeb` and adds 139 files in a single commit.

## What is here, and why it was worth keeping

**`orchestration/` (117 files)** — a service and browser front end that runs the
preparation gates, plus its tests. It is the thing that served `127.0.0.1:4320`. Its own
README is explicit about its limits: it drafts and reviews, and it cannot approve a gate,
change a lock, dispatch a builder or merge anything. Answers, revisions and draft packets
survive a restart.

- `src/` (14 files): `server.ts`, `cli.ts`, `interview.ts`, `planning.ts`, `draft.ts`,
  `factory.ts`, `store.ts`, `workflow.ts`, `session-handoff.ts`, and provider adapters.
- `test/` (23 files): verified at `117 tests, 117 passing` on a clean `npm ci` on
  2026-10-23. The tests are overwhelmingly negative — refusals, authority limits, and
  durability across restart.
- `integration/` (45 files): integration evidence, including two short run logs.

Run it with `npm ci && npm test` from inside `orchestration/`.

**The phase-1b material (22 files)** — thirteen story files that exist nowhere else, a
transition package, and the specifications amended alongside them.

- `story-4` to `story-10`: factory features not yet built — the review bundle, the
  traceability check, authorized execution, the maintenance amendment, coordination
  without a human, the pre-build gap review, and CI-produced classification.
- `story-11` to `story-16`: an application built through the factory — tracker skeleton,
  sign-in with sessions and roles, list/detail/states, production checks, browser
  journeys, and mockup review evidence.
- `transition-1b/transition-package.md`: every human act in order — what to type, what it
  binds, what refuses if an act is skipped or taken out of order, and where that refusal
  was demonstrated.
- `docs/PRD.md`, `docs/TECH-SPEC.md` and two files under `docs/spec/` as amended at the
  time. **These shadow `main`'s current copies and are older than them.** `main` is the
  authority; these are kept only because the amendments are part of the same work.

## What was deliberately left out

- `orchestration/.preparation` and `orchestration/evidence` — 232 files of run output,
  regenerable, and the place where machine paths accumulated.
- The source branches' commit history. Both carried absolute paths from the machine they
  were written on, in every tree, which a push would have published. Rather than rewrite
  that history, this branch takes the file contents only, as one commit, scanned clean.

## What this is not

It is not reconciled against `main`. The phase-1b migration it belongs to was designed,
demonstrated in labs and then **deliberately parked**; its enforcement changes were
written against `main` at `6db310a`, two locks earlier, and some may now be superseded.
Resuming any of it needs the approver's decision first. Preserving it does not.

Verified before committing: no absolute home paths, no credentials, no email addresses,
no real calendar data, and no build output or dependencies.
