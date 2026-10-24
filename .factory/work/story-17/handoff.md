# story-17 handoff — equipment-checkout S1: database, rules and seed

Builder: `claude-opus-5-5`, holder of record
`records/20261023T212607Z-transition-story-17-in-progress-d21c57363e34.json`.
Branch `story-17-equipment-s1`, cut from `origin/main` at `9906c7a` (tree `2ab88906775a`).
Bound by the gate-3 approval `38b90b679e28`; lock `365957024e4d` in force.

Nothing below is a verdict. Every number is read from a report the runner wrote, and the only
judgement that counts is CI's own run on this pull request's tree.

---

## 1. What I implemented, and where

Five files, all inside Scope, and nothing else. `git status --short` before the commit listed
exactly `api/app/`, `api/pyproject.toml` and `api/requirements.txt`; `git add -A --dry-run` listed
exactly the five paths below and no other.

| File | What is in it |
|---|---|
| `projects/equipment-checkout/api/app/__init__.py` | Package docstring, no imports. Deliberate: the unit tree imports `app.rules` with no database in reach, and anything imported here would come with it. |
| `projects/equipment-checkout/api/app/rules.py` | `NAME_MAX_LENGTH`, `USER_ID_PATTERN`, `Role`, `Status`, the frozen dataclasses `Actor` and `Item`, the error hierarchy `RuleError` / `IdentityError` / `Forbidden` / `NotFound` / `Conflict` / `Invalid`, the nine pure decisions of blueprint 12.5, and the nine operations of blueprint 12.5. |
| `projects/equipment-checkout/api/app/db.py` | The two tables of blueprint section 7 with their four check constraints and the foreign key, `make_engine`, `make_session_factory`, `create_schema`, `seed`, `initialise`, `SEED_USERS`, and the reads and writes the operations compose. |
| `projects/equipment-checkout/api/requirements.txt` | The whole API stack as a lockfile: the four lines blueprint 12.10 fixes plus their entire transitive closure, every distribution pinned to one version. |
| `projects/equipment-checkout/api/pyproject.toml` | Project metadata and the four major.minor dependency lines. No test configuration, since C2 passes `-c harness/api/pytest.ini`. |

### The one-active-loan biconditional (REQ-008.1, T-008-N7)

Blueprint section 7's table check, emitted verbatim:

```
CONSTRAINT equipment_one_active_loan_check CHECK ((status = 'on_loan') = (borrower_id IS NOT NULL))
```

It is a biconditional and not an implication, which is what the frozen case writes against: a
constraint forbidding only the borrower-less loan would still accept a borrower on an `available`
or an `out_of_service` row, which is the phantom loan. Both operands are total — `status` is
`NOT NULL`, so `status = 'on_loan'` is never unknown, and `IS NOT NULL` is always boolean — so the
check never evaluates to NULL and never passes a row by being unknown.

The DDL `create_schema` emits, compiled against the PostgreSQL dialect and printed in full:

```
CREATE TABLE users (
	id INTEGER NOT NULL,
	name TEXT NOT NULL,
	role TEXT NOT NULL,
	PRIMARY KEY (id),
	CONSTRAINT users_role_check CHECK (role IN ('admin', 'member')),
	UNIQUE (name)
)

CREATE TABLE equipment (
	id INTEGER GENERATED ALWAYS AS IDENTITY,
	name TEXT NOT NULL,
	status TEXT NOT NULL,
	borrower_id INTEGER,
	PRIMARY KEY (id),
	CONSTRAINT equipment_name_length_check CHECK (char_length(name) BETWEEN 1 AND 100),
	CONSTRAINT equipment_status_check CHECK (status IN ('available', 'on_loan', 'out_of_service')),
	CONSTRAINT equipment_one_active_loan_check CHECK ((status = 'on_loan') = (borrower_id IS NOT NULL)),
	FOREIGN KEY(borrower_id) REFERENCES users (id) ON DELETE RESTRICT
)
```

Against a live `postgres:16` the catalogue reports `is_identity = YES`,
`identity_generation = ALWAYS` for `equipment.id`, and the constraints
`equipment_borrower_id_fkey`, `equipment_name_length_check`,
`equipment_one_active_loan_check`, `equipment_pkey`, `equipment_status_check`.

### `create_schema` emits literal `CREATE TABLE IF NOT EXISTS`

Blueprint section 7 names `CREATE TABLE IF NOT EXISTS` in those words. I first wrote
`MetaData.create_all(engine, checkfirst=True)`, which has the same effect but asks the catalogue and
then creates, so two processes starting together can both see nothing and the second fails on a
duplicate table. It now emits `CreateTable(table, if_not_exists=True)` per table in
`metadata.sorted_tables`, so the server decides and start-up may be run any number of times from any
number of processes. Both forms passed the exam; the second is the blueprint's text.

Proved in a disposable lab against a throw-away `postgres:16`, calling `initialise` three times on
one database:

```
initialise run 1: users=3 equipment=0
initialise run 2: users=3 equipment=0
initialise run 3: users=3 equipment=0
users: [(1, 'Ada Admin', 'admin'), (2, 'Mia Member', 'member'), (3, 'Sam Member', 'member')]
```

REQ-016.1 and REQ-016.3 are S2's rows to turn green (blueprint 9.2); this is not their evidence,
only a check that what S1 delivers does not block them.

### `requirements.txt` has to install twice, and does

C2 installs it with a plain `pip install -r` into the interpreter that then runs the exam: Python
3.12 on macOS arm64 here, Linux x86_64 in CI. Every pin, transitive ones included, was checked to
have a wheel for **both** before it was committed —

```
pip download --only-binary=:all: --platform manylinux_2_17_x86_64 \
    --python-version 3.12 --implementation cp --abi cp312 ...
```

returned a `cp312 manylinux_2_17_x86_64` wheel for each of the fifteen, and the macOS arm64
install succeeded locally. Nothing in the list needs a compiler or a local `pg_config` on either
platform, which is why psycopg is taken with its `binary` extra as blueprint 12.10 names it.

Four lines (`anyio`, `h11`, `idna`, `typing-extensions`) are genuine transitive dependencies of
FastAPI and Uvicorn **and** are pinned in the frozen `harness/api/requirements-eval.txt`, because
the test tools share them. They appear in my list at exactly the versions that frozen file pins, so
the two lists cannot disagree, and C2 installs the frozen list afterwards with `--require-hashes
--force-reinstall`, which re-fetches and hash-verifies all four whatever my file said. No package
in my list supplies the runner of my own exam. I named no other package from that file — no
`pytest`, `pluggy`, `iniconfig`, `packaging`, `httpx`, `httpcore`, `certifi` or `sniffio` — and added
no package carrying a `pytest11` entry point.

---

## 2. Every case, and its result

All seventeen cases the eval plan's section 8.1 assigns to S1 passed. **There is no case I could not
pass.** From the runner's own report
`.factory/work/reports/equipment-api-eval-1792791594444-15698.json`, written on the committed tree:

```
"outcome": "pass",
"cases": { "total": 17, "passed": 17, "failed": 0, "errored": 0, "skipped": 0, "collectionErrors": 0 },
"notPassed": [],
"trees": [ { "tree": "unit", "cases": 16, "collectionErrors": 0, "collectionFailures": [], "reportMissing": false },
           { "tree": "db",   "cases": 1,  "collectionErrors": 0, "collectionFailures": [], "reportMissing": false } ]
```

`rowsPassed`, as the report sorts them:

```
T-001-N6  T-003-N3  T-003-P6  T-004-N6  T-004-P6  T-005-N4  T-006-N2  T-006-P6  T-007-N6
T-008-N4  T-008-N7  T-009-N10 T-009-P7  T-010-N4  T-010-P8  T-011-N5  T-011-P6
```

That is the plan's list for S1 exactly: T-001 N6; T-003 P6 N3; T-004 P6 N6; T-005 N4; T-006 P6 N2;
T-007 N6; T-008 N4 N7; T-009 P7 N10; T-010 P8 N4; T-011 P6 N5.

**The two cases that assert more than the criteria they bracket both pass as written.** `T-009-N10`
requires a name that is not text to be rejected: `normalise_name` raises `Invalid` on anything that
is not a `str`, which refuses `None` and `42` before any trimming or measuring. `T-008-N7` is the
biconditional above. Neither was narrowed and neither needed to be.

---

## 3. Where a frozen test and the brief disagreed

**Nowhere.** I read all eleven frozen files before writing a line, and found no case in which a test
required something the brief contradicted. Every assertion is satisfied by an implementation built
from the blueprint, as the brief predicted.

## 4. Defects in a frozen test

**None found.** I am not reporting one. Specifically, on the two cases the gate-7 record flags:

- `T-009-N10` asserts more than REQ-009.6 and REQ-009.10 state, but blueprint 12.5's
  `normalise_name(raw: object)` signature already requires the non-text rejection, so an
  implementation built from the blueprint satisfies it without strain.
- `T-008-N7` asserts more than REQ-008.1 states, but blueprint section 7's table check is exactly
  the biconditional it checks, and the case's three controls after the three refusals mean a store
  that refused every write could not pass it.

Both stand as written, both pass, and I changed nothing about them.

I also note, as a fact rather than a defect, that the db fixture never commits its outer
transaction: `write` opens a SAVEPOINT on a connection from `engine.connect()` and releases it, so
the rows live only for the length of the connection and are rolled back when it closes. The
fixture's own `DROP TABLE` at the next setup makes that harmless, and both `count()` assertions read
through the same connection and see the uncommitted rows. Nothing needs changing.

---

## 5. Where the brief and the blueprint disagreed

Two places. Neither affects any S1 case. Both are the orchestrator's to carry if they matter.

### 5.1 Whether `app.rules` touches the database

The brief says "`app.rules` holds pure logic with typed errors and touches no database", and its
"surface the frozen tests require" lists only the nine pure callables. The blueprint puts more
there: section 12.5 lists nine **operations** (`resolve_actor`, `list_users`, `list_equipment`,
`add_equipment`, `borrow`, `return_item`, `mark_out_of_service`, `restore_item`,
`delete_equipment`) under the heading "The rules layer: module `app.rules`", and section 9.1 says
S1 delivers "every function of `app.rules`".

S2 owns only `config.py`, `routes.py` and `main.py`, so if S1 does not deliver those nine they
exist in no story's files at the names the blueprint pins. I delivered them, and arranged the code
so both documents hold:

- The nine pure decisions are pure. They read no database, open no connection, and `app.rules`
  imports nothing at module level outside the standard library — `re`, `collections.abc`,
  `dataclasses`, `typing`. The `Session` annotation is under `TYPE_CHECKING`.
- The nine operations import `app.db` **inside their own bodies**. So importing `app.rules` pulls in
  neither SQLAlchemy nor a driver, and the unit tree stays the pure-Python tree C3 runs with no
  database setting in its environment. Verified: after `import app.rules`, `sys.modules` holds no
  `psycopg`.
- `app.db` imports nothing from `app.rules`. The reads return SQLAlchemy rows and `app.rules` turns
  them into `Actor` and `Item`, so the dependency runs one way and there is no import cycle.

**What the orchestrator should know:** those nine operations are **verified by nothing in S1**. No
frozen case in my eleven files calls any of them — T-008-N7 writes to the table directly, around
them, by design. Their first evidence is S2's I rows. I wrote them against blueprint 12.5, the
order of checks of 5.3 and the row lock of section 8, and I am not claiming they are correct, only
that they exist at their pinned names and that no S1 row touches them. If the user would rather S1
shipped only the pure half, deleting them costs nothing and changes no S1 result.

### 5.2 The brief says this exam cannot run here

The story file's "Running your exam, and why you probably cannot run it here" says `python3` is 3.13
and there is no 3.12 on PATH, so the fourth command fails at C1 locally. **That is out of date.**
`/Users/jay/.local/bin/python3.12` is CPython 3.12.13 and Docker server 28.1.1 is running, so C1
passed and the whole sequence ran, container and all. The brief's standing advice still holds and I
followed it: I wrote for the tests, not for a green local run, and a green local run is not
evidence. CI's run on this tree is.

---

## 6. Open questions

1. **Do the nine operations belong in `app.rules`?** Section 5.1 above. They are shipped there
   because blueprint 12.5 and 9.1 put them there, against the brief's description of the module.
   Only the user can settle which document governs. S2 cannot write them itself.
2. **`NAME_MAX_LENGTH` appears twice.** The constant is in `app.rules` (D-06, blueprint section 6)
   and the number 100 is also written as a literal in `db.py`'s
   `char_length(name) BETWEEN 1 AND 100`, because importing the constant would reverse the one-way
   dependency between the two modules. Both carry a comment naming REQ-009.10, REQ-009.12 and D-06.
   The frozen test writes the literal for the same reason. No test reads either.
3. **Transitive pins will age.** `requirements.txt` pins the full closure, which is what made the
   two-platform check possible, but it means a transitive security patch needs a deliberate bump
   rather than arriving on the next install. That is the trade the blueprint's "commits a lockfile
   with the exact patch" asks for; worth a second look if S2 or S4 needs a newer line.
4. **Constraint names are mine.** `users_role_check`, `equipment_name_length_check`,
   `equipment_status_check`, `equipment_one_active_loan_check`. Blueprint section 7 says no test
   verifies a constraint's name or text, and section 4.4 leaves them unverified, so these are a
   choice and not a contract. If S2's checks NA or KD read the catalogue by name, they will need
   these.

---

## 7. What I ran, and what each printed

All four commands of lock `365957024e4d`, from the repository root, in the lock's order. Reports the
runners wrote are under `.factory/work/reports/`, which is git-ignored, so they are not in this
pull request; CI writes its own.

### 1. `npm ci`

Exit 0.

```
added 136 packages, and audited 138 packages in 1s
found 0 vulnerabilities
```

### 2. `npm exec --workspace packages/cli -- vitest run --config vitest.config.ts`

Exit 0.

```
 Test Files  18 passed (18)
      Tests  183 passed (183)
```

### 3. `node docs/projects/meeting-reminder/web/scripts/run-browser-trial.mjs`

Exit 0.

```
38 passed (13.1s)
Protected trial passed: 38 tests.
```

### 4. `node projects/equipment-checkout/harness/api/run-eval.mjs`

Exit 0. `outcome: "pass"`. Every step C1 to C5 exited 0; C7 removed the container.

```
[C1 python] python3.12 --version
Python 3.12.13
[C1 docker] docker version --format {{.Server.Version}}
            exit 0   (the runner captures this one, so the version is not echoed; it is 28.1.1 here)
[C2 venv]         exit 0
[C2 app deps]     exit 0   (pip install -r api/requirements.txt)
[C2 frozen tools] exit 0   (--require-hashes --force-reinstall -r harness/api/requirements-eval.txt)
[C3 unit]   16 passed in 0.02s
[C4 database] docker run -d ... postgres:16     exit 0
[C4 port] / [C4 ready]                          exit 0
[C5 db]      1 passed in 2.52s

Equipment API eval passed: 17 cases, every frozen row green.
```

`cases: 17 total, 17 passed, 0 failed, 0 errored, 0 skipped, 0 collectionErrors`. `notPassed: []`.

Commands 1, 2 and 3 were run again after the last change to `db.py` (section 1, `create_schema`), so
every result above is from the tree this pull request carries. Command 4 was run twice in all, green
both times.

### Things I did not do

- I touched no frozen test, no file under `harness/`, no workflow and no locked command. I did not
  reach around the in-session hook with `sed`, a redirect or a `git checkout`.
- I wrote nothing outside Scope, and nothing under `.factory/` except this folder.
- I installed no fake `python3.12` and no shim; C1 found the real CPython 3.12.13 already on this
  machine. I did not delete `api/app` to reach the runner's `skipped` exit.
- I ran no `pod-factory approve`, `lock`, `revoke`, `story start` or `story finish`.
- I did not merge and I am not asking for a merge. The merge is the user's.

### Help I used

Two review subagents, dispatched read-only after I had written the code and run the exam: one
tracing every assertion of the eight unit files against `rules.py`, one tracing the nine writes of
`test_one_active_loan.py` and the savepoint mechanism against `db.py`. Both reported no finding. I
re-verified the decisive claim myself rather than taking it from them: I compiled the DDL against
the PostgreSQL dialect and read it back out of a live `postgres:16` catalogue, which is what section
1 above quotes. Neither subagent wrote a file, and I own every line in the commit.
