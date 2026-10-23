# story-12: sign-in, sessions and roles

You are the builder for story twelve. Add sign-in, sessions and the two roles, and make every write
authorized on the server regardless of what a page offers. This file is your brief; `story start` and gate-check read the three lists below
exactly, so they are kept as plain lists with no blank line between a label and its entries.

**Authority:** approved requirements — REQ-27's permission cases and PRD section 3's two roles,
with the approved mockup for what each role sees. Password hashing, the session cookie and
server-side authorization are the technical dependencies those cannot work without. Nothing
outside that authority is in this story. If you find something worth adding, write it in
`.factory/work/backlog.md` with the date and do not build it; if you believe the story cannot be
finished without it, stop and ask the orchestrator rather than widening the work. An
implementation detail inside this story is yours to settle; new user-visible behavior, a new
integration or a material tradeoff is a decision for the approver.

Tests:
- packages/tracker/test/auth.test.ts

Scope:
- packages/tracker/src/**
- packages/tracker/test/auth.test.ts

Inputs:
- docs/PRD.md
- docs/TECH-SPEC.md

## What done means

T-27-P5, T-27-N6 and T-27-N7 in `packages/tracker/test/auth.test.ts` pass, and every other locked test still passes. The tests are locked by approved hash before they reach main: you bring your own test file
across with `git checkout pod-factory/frozen-tests -- <path>` — not with an editor, which the
hook refuses for a locked path — and you cannot change it. One byte of difference and
lock-guard refuses the pull request. Read them first; each one names the
eval-plan row it implements.

## What to build

1. Sign-in and sign-out, passwords hashed with `node:crypto` scrypt, never stored or logged in any
   other form.
2. A session cookie that is HttpOnly and SameSite=Lax, with an expiry, invalidated on sign-out.
3. Two roles, editor and viewer, and **server-side authorization on every write**: a viewer's attempt
   is refused by the server with the reason, whatever the page shows.
4. A failed sign-in that does not distinguish a wrong password from an unknown account.

## Constraints

No new dependency. No token or password in a log line. The permission cases are driven in a browser
later, in story 15; here they are tested at the server, which is where they are enforced.

## Before you finish

- Run the locked commands from the repository root. Every locked test passes, your own included.
  Nothing is allowed to fail, and gate-check refuses a candidate whose own test file is absent
  or differs by one byte from what was approved.
- `npm run lint` and `npm run typecheck` from the repository root. Prettier only through
  `npm run lint`, never from inside a package over other folders.
- Delete `.factory/work/reports/` before you commit. An agent's report must never land in the tree.
- Touch nothing outside the Scope list and your own story folder. The locked tests are not yours to
  change, and you should not need to.
- Write your handoff note at `.factory/work/story-12/handoff.md`: done, left, open questions, next
  step. `story finish` refuses without it.
- Your prose is not evidence. The verify job's run on the pull request is.
