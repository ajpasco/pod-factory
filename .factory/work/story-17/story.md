# story-17: equipment-checkout S1 — database, rules and seed

You are the builder for the first application story this factory has built through a real gate 7.
Write the database schema and the pure rules of the Shared Equipment Checkout trial so that the
seventeen frozen cases named below pass, and change nothing else.

This file is your brief. `story start` and `gate-check` read the three lists below exactly, so they
are kept as plain lists: one path per line, no globs in `Tests` or `Inputs`.

Tests:
- projects/equipment-checkout/api/tests/conftest.py
- projects/equipment-checkout/api/tests/db/conftest.py
- projects/equipment-checkout/api/tests/db/test_one_active_loan.py
- projects/equipment-checkout/api/tests/unit/test_borrowable.py
- projects/equipment-checkout/api/tests/unit/test_borrower.py
- projects/equipment-checkout/api/tests/unit/test_delete.py
- projects/equipment-checkout/api/tests/unit/test_identity.py
- projects/equipment-checkout/api/tests/unit/test_name.py
- projects/equipment-checkout/api/tests/unit/test_permissions.py
- projects/equipment-checkout/api/tests/unit/test_return.py
- projects/equipment-checkout/api/tests/unit/test_status_changes.py

Scope:
- projects/equipment-checkout/api/pyproject.toml
- projects/equipment-checkout/api/requirements.txt
- projects/equipment-checkout/api/app/__init__.py
- projects/equipment-checkout/api/app/db.py
- projects/equipment-checkout/api/app/rules.py

Inputs:
- docs/projects/equipment-checkout/prep/PRD.md
- docs/projects/equipment-checkout/prep/TECH-SPEC.md
- docs/projects/equipment-checkout/prep/eval-plan.md
- projects/equipment-checkout/harness/api/pytest.ini
- projects/equipment-checkout/harness/api/requirements-eval.txt
- projects/equipment-checkout/harness/api/run-eval.mjs

## What done means

The seventeen cases eval plan section 8.1 assigns to S1 pass, and every other locked command still
passes. Those cases are, by the plan's own row IDs: T-001 N6; T-003 P6 N3; T-004 P6 N6; T-005 N4;
T-006 P6 N2; T-007 N6; T-008 N4 N7; T-009 P7 N10; T-010 P8 N4; T-011 P6 N5. Each test function
carries its REQ ID in its name and a docstring stating what it checks and why. **Read the tests
first.** They are the specification that counts; where this brief and a frozen test disagree, the
test wins and you should say so in your handoff note.

The tests are frozen and locked. You cannot change them, you do not need to, and the in-session
hook and CI will both refuse it. The correct response to a case you cannot pass is to report it in
your handoff note, not to reach for the test.

## The surface the frozen tests require

These names are imported by the tests, so they are not suggestions. From `app.rules`:

- Types: `Actor`, `Item`.
- Errors: `Forbidden`, `Invalid`, `Conflict`, `IdentityError`.
- Functions: `parse_user_id`, `normalise_name`, `resolve_borrower`, `require_admin`,
  `check_borrowable`, `check_return`, `check_delete`, `check_mark_out_of_service`, `check_restore`.

From `app.db`, imported inside the database fixture: `make_engine(url)` and `initialise(engine)`.
`initialise` creates the schema on a database the fixture has just emptied.

`app.rules` holds pure logic with typed errors and touches no database. The one-active-loan
guarantee of `T-008-N7` is a property of the store, not of the rules: the database test writes to
the table directly, around your rules, and requires the store itself to refuse every contradictory
shape — on loan with nobody holding it, and held by somebody while not on loan, in both
directions. A constraint that forbids only one side lets a phantom loan through. Blueprint section
7 is the authority for that biconditional.

## Two cases assert slightly more than their criteria, deliberately left standing

The gate-7 record (`docs/projects/equipment-checkout/prep/GATE-7-RECORD.md`) names two cases whose
eval-plan rows assert more than the PRD criteria they bracket: `T-009-N10`, which requires a name
that is not text to be rejected, and `T-008-N7`, the biconditional above. Narrowing either is the
user's decision and has not been taken, so **both stand as written and you must pass them.** The
blueprint's typing and section 7 already require both, so an implementation built from the
blueprint passes them. Do not treat this note as licence to skip them.

## Where the code goes

Only the five files in `Scope` above. `gate-check` tests every changed file against this list as
the gate-3 approval bound it, and anything outside fails the pull request even when all tests
pass. Anything under `.factory/` other than this story's own folder also fails. If you conclude the
work genuinely cannot be done inside those five files, stop and say so in your handoff note rather
than widening the scope: the scope is a gate-3 decision and only a human can change it.

`api/requirements.txt` is yours and lists the whole API stack S2 will also use (FastAPI 0.115,
Uvicorn 0.32, SQLAlchemy 2.0, psycopg 3.2, per eval plan 8.1). It is installed into the same
interpreter that runs your exam, so put in it what your implementation needs and nothing else.

## Running your exam, and why you probably cannot run it here

The one locked command that judges this story is run from the repository root:

```sh
node projects/equipment-checkout/harness/api/run-eval.mjs
```

It requires **Python 3.12 exactly** — it refuses any other minor version, because the pinned test
tool hashes were resolved on `python:3.12-slim` — and a running Docker daemon for the PostgreSQL 16
container the database row needs. On the machine this story was written on, `python3` is 3.13 and
there is no 3.12 on PATH, so this command fails at its C1 precondition check locally the moment
`api/app` exists. **Until that is settled, CI's verify run is the only thing that can judge your
work.** Write for the tests, not for a green local run, and never delete `api/app` to get the
runner to report `skipped`: that deletes the deliverable with it.

Also run, from the repository root, before you finish: `npm ci`, then the factory's own locked
commands as `docs/eval-plan.md` section 4 lists them, so you can show you broke nothing.

## Before you finish

- Write your handoff note at `.factory/work/story-17/handoff.md`: what you did, what you left, open
  questions, and every case you could not pass with the reason. `story finish` refuses without it.
- Your prose is not evidence. The verify run's own bundle on your pull request is.
