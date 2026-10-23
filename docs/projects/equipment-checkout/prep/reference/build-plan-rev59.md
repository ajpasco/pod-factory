# Build Plan (rev 3): Shared Equipment Checkout (Trial)

This plan covers only technical artifact `1eabe483…d5ee` (decision authority: local-review-only). It grants no authority to implement, merge, deploy or accept. No code exists and nothing has been run. Every command and test below is **planned evidence**.

The PRD (rev 14) and mockup (rev 14) define behavior. Where the mockup's in-memory logic differs from the PRD, the PRD wins (F-003). This revision makes plan corrections for R2-001, R2-002 and R2-003. It does not mark them resolved; that is for the independent reviewer.

## Architecture (2 layers, one-way dependencies)
- `web/`: React 18 + Vite JavaScript SPA (`src/api`, `src/components`, `src/App.jsx`).
- `api/`: FastAPI, `app/routes.py` → `app/rules.py` → `app/db.py` → PostgreSQL 16.
- Direction: web → HTTP → routes → rules → db. `rules.py` must not import `routes` or `fastapi`. `db.py` must not import `rules` or `routes`.
- No third layer, router, global store or history table.

## Contract (fixed before dependent work)
Identity is the `X-User-Id` header. It is trial-only and spoofable by design (F-005). The server re-derives the role on every request.

| Call | Who | Result |
|---|---|---|
| `GET /api/users` | any | 3 seeded users |
| `GET /api/equipment` | any | list |
| `POST /api/equipment {name}` | admin | 200 + item |
| `POST /api/equipment/{id}/borrow {borrowerId?}` | member (self only); admin (a member as borrower) | 200 + item |
| `POST …/return` | borrower or admin | 200 + item |
| `POST …/out-of-service`, `…/restore` | admin | 200 + item |
| `DELETE /api/equipment/{id}` | admin, item not on loan | 200 |

Errors: 403, 404, 409, 422. The OpenAPI schema published by S2 is the contract. S3 and S4 mock `fetch` from this table until S2 lands. A contract change after S2 needs both owners and an amendment.

## Test database for S1 and S2 (R2-001)
S1 owns a db-only Compose file, `api/docker-compose.test.yml`. It defines one `postgres:16` service on host port 5433 with a healthcheck and no persistent volume.
- Start: `docker compose -f api/docker-compose.test.yml up -d --wait`.
- Stop: `docker compose -f api/docker-compose.test.yml down -v`.
- `api/tests/conftest.py` reads `TEST_DATABASE_URL` from the environment. It fails with a clear message that does not echo the value if the variable is missing. It never falls back to a hard-coded URL.
- S1 creates `.env.example` with placeholders only. These include `TEST_DATABASE_URL=postgresql+psycopg://CHANGE_ME_USER:CHANGE_ME@localhost:5433/CHANGE_ME_DB`. S5 extends the file sequentially.
- A local run with this test database is not container verification of the product stack. Only E-COMPOSE and E-JOURNEY establish that.

## Evaluations (established before stories)
Tests derive from the PRD acceptance criteria and mockup behavior, not from this plan. Each test name carries its REQ ID. Each eval is runnable by its owning story using only artifacts that story or its dependencies create.

| ID | Kind | Evidence | Owner |
|---|---|---|---|
| E-RULES | correctness | automated | S1 |
| E-DBSEED | correctness | automated | S1 |
| E-API | correctness | automated | S2 |
| E-SURFACE-API | restraint | automated | S2 |
| E-ARCH-API | restraint | automated | S2 |
| E-CONFIG-START | production | automated | S2 |
| E-UI-SHELL | correctness | automated | S3 |
| E-ROWH-STYLE | correctness | automated | S3 |
| E-VISUAL | correctness | review | S3, S5 |
| E-SURFACE-UI | restraint | automated | S3 |
| E-ARCH-WEB | restraint | automated | S3 |
| E-UI-MUT | correctness | automated | S4 |
| E-JOURNEY | correctness | automated | S5 |
| E-ROWH | correctness | automated | S5 |
| E-ARCH-COMBINED | restraint | automated | S5 |
| E-COMPOSE | production | automated | S5 |
| E-CONFIG-REPO | production | automated | S5 |
| E-PROD-NA | production | review | S5 |

The exact command, expected result and requirement IDs for each eval are in the structured `evals` field.

Notes:
- **E-UI-SHELL / E-UI-MUT (R2-003):** S3 renders the four state-demo controls at the top. The API failure and Access denied demos are inert stubs with correct `title` and `aria-label`. S4 connects them to the real modals. E-UI-MUT checks that the connected demo buttons open the Close/Retry modal and the Access denied modal.
- **E-ROWH-STYLE:** a style-contract check only. E-ROWH in S5 measures real layout.
- **E-VISUAL, simplicity and absence of real authentication:** reviewer judgment, not automated proof.

## Stories
The sequence is S1 and S3 (parallel, disjoint scope), then S2 and S4, then S5. S5 edits S3-owned files only after S3 has merged.

### S1 DB, rules, seed, test database
- Scope: `api/app/db.py`, `api/app/rules.py`, `api/requirements.txt`, `api/requirements-dev.txt`, `api/docker-compose.test.yml`, `.env.example`, `api/tests/conftest.py`, `api/tests/unit`, `api/tests/db`.
- Output: schema with the CHECK constraint, an idempotent seed, pure permission and state rules with typed errors, an atomic `UPDATE … WHERE status='available'` borrow, and the test-database Compose file.
- Acceptance: E-RULES and E-DBSEED.
- Integration point: S2 maps the typed errors to 403/404/409/422.

### S2 API routes and contract
- Scope: `api/app/main.py`, `api/app/routes.py`, `api/scripts/check-arch.sh`, `api/tests/api`, `api/tests/surface`, `api/tests/config`.
- Output: routes per the contract, header identity, Pydantic validation (the 100-character cap is the F-004 proposal), safe logging, CORS limited to the configured origin, startup config validation, and OpenAPI.
- Acceptance: E-API, E-SURFACE-API, E-ARCH-API, E-CONFIG-START. They use S1's test database.
- Depends on S1.

### S3 UI shell
- Scope: `web/package.json` (including the `@playwright/test` and `vitest` devDependencies and the `test` and `e2e` scripts, declared up front for R2-002), `web/package-lock.json`, `web/vite.config.js`, `web/index.html`, `web/scripts/check-arch.mjs`, `web/src/App.jsx`, `web/src/components`, `web/src/api`, `web/src/styles`, `web/src/shell`, `web/src/surface`.
- Output: switcher, state demos at the top (failure and denied demos stubbed), list with loading and empty states, uniform 48px rows, the Add field with Enter and inline validation, icon buttons with tooltip and label, and Apple styling.
- Acceptance: E-UI-SHELL, E-ROWH-STYLE, E-SURFACE-UI, E-ARCH-WEB, E-VISUAL.
- Rule: React escaping only. Do not copy the mockup's HTML-string rendering.
- No dependencies.

### S4 UI mutations and modals
- Scope: `web/src/App.jsx` (demo wiring only, sequential after S3), `web/src/components`, `web/src/api`, `web/src/mutations`.
- Output: borrower modal, confirm-delete modal, Close/Retry modal, Access-denied modal, row loaders, role- and status-based controls, list updates only after a 200, and the state-demo wiring.
- Acceptance: E-UI-MUT.
- Depends on S3.

### S5 Compose, journey, combined candidate
- Scope: `docker-compose.yml`, `api/Dockerfile`, `web/Dockerfile`, `web/nginx.conf`, `.env.example` (sequential extension), `.gitignore`, `web/playwright.config.js`, `web/e2e`, `scripts/check-layout.sh`, `scripts/check-config.sh`.
- `web/package.json` and `web/package-lock.json` are not edited, because S3 declared the dependencies. If a script change is unavoidable, it is a sequential edit after S3 and S4 and is reported at integration.
- Acceptance: E-JOURNEY, E-ROWH, E-VISUAL, E-ARCH-COMBINED, E-COMPOSE, E-CONFIG-REPO, E-PROD-NA.
- Depends on S2 and S4.

## Lifecycle and governance
- Before dispatch: an independent acceptance review of this plan. Blocking gaps must be resolved first.
- Per story: its own evals, architecture and security checks, and a behavior/simplicity review (reviewer judgment).
- **Combined candidate:** after S1–S5 are merged into one candidate, run E-JOURNEY, E-ROWH, E-COMPOSE, E-CONFIG-REPO and E-ARCH-COMBINED against that single build. Separate branch passes are insufficient. A non-Docker pass is not container verification.
- Acceptance is checked on complete product journeys against the approved PRD and mockup.
- Builders cannot weaken tests or rewrite acceptance to fit the implementation. Changes to behavior, stack, boundaries or acceptance need an amendment and the established approval.

## Configuration
- `.env.example` (committed, placeholders only): `POSTGRES_USER`, `POSTGRES_PASSWORD=CHANGE_ME`, `POSTGRES_DB`, `CORS_ORIGINS`, `VITE_API_BASE_URL=/api`, and `TEST_DATABASE_URL`. The real `.env` is git-ignored.
- **Single credential source for the stack:** Compose builds the api's `DATABASE_URL` by interpolation from `POSTGRES_*` (F-006). The api service in Compose also gets `TEST_DATABASE_URL` interpolated, for containerized tests. Passwords with URL-special characters must be percent-encoded.
- The API validates at startup (E-CONFIG-START). No secret goes in source, the browser bundle or logs. Native credential storage does not apply because there is no native app. Production secrets would come from the host's secret store if a deployment is approved.

## Docker decision
Docker Compose is used (`db`, `api`, `web`). It is justified by the need for a real Postgres and a restart-persistence check.
- `api/requirements.txt` holds runtime dependencies. `api/requirements-dev.txt` holds pytest and similar. The api Dockerfile has `ARG INSTALL_DEV=false`.
- Build and run: `docker compose up -d --build`.
- Containerized API tests: `docker compose build --build-arg INSTALL_DEV=true api && docker compose run --rm api python -m pytest -q`.
- Restart check: `docker compose down`, then `docker compose up -d`.

## Security
- Controls: server-side role derivation and 403 checks, validation, parameterized SQL, no `dangerouslySetInnerHTML`, CORS limited to the configured origin, and safe logging.
- The spoofable header is accepted for the trial by the scope.
- Current automated enforcement: none. All checks are planned. A passing scan does not prove security. The absence of real authentication is reviewer judgment.

## Structured planning evidence

```json
{
  "evals": [
    {
      "id": "E-RULES",
      "requirements": [
        "REQ-003",
        "REQ-005",
        "REQ-006",
        "REQ-007",
        "REQ-008",
        "REQ-010",
        "REQ-011"
      ],
      "kind": "correctness",
      "procedure": "Planned: cd api && python -m pytest -q tests/unit. Table-driven role x status x action cases on rules.py, derived from PRD acceptance, with no HTTP.",
      "expected": "Members borrow only for themselves; admin borrower rejected; return only for borrower or admin; member add/out-of-service/restore/delete gives a permission error; borrow of a non-available item and delete of a loaned item rejected. All pass.",
      "evidence": "automated"
    },
    {
      "id": "E-DBSEED",
      "requirements": [
        "REQ-008",
        "REQ-016"
      ],
      "kind": "correctness",
      "procedure": "Planned: docker compose -f api/docker-compose.test.yml up -d --wait && cd api && TEST_DATABASE_URL=<value from local .env> python -m pytest -q tests/db. Seed twice, then insert rows violating the CHECK constraint.",
      "expected": "Exactly 1 admin and 2 members after repeated seeding. CHECK rejects on_loan with null borrower and non-on_loan with a borrower. conftest fails clearly if TEST_DATABASE_URL is missing.",
      "evidence": "automated"
    },
    {
      "id": "E-API",
      "requirements": [
        "REQ-001",
        "REQ-005",
        "REQ-007",
        "REQ-008",
        "REQ-009",
        "REQ-010",
        "REQ-011",
        "REQ-012",
        "REQ-016"
      ],
      "kind": "correctness",
      "procedure": "Planned: docker compose -f api/docker-compose.test.yml up -d --wait && cd api && TEST_DATABASE_URL=<value from local .env> python -m pytest -q tests/api (TestClient + real Postgres). Cover GET users, forced member actions, admin borrower, unknown member and id, empty name, delete of a loaned item, two-thread concurrent borrow, data surviving a new engine.",
      "expected": "GET users returns 3 with roles; forced member actions 403 with no change; admin borrower 422; unknown id 404; empty name 422 with nothing created; delete of loaned item 409; of two concurrent borrows one 200 and one 409 leaving one active loan; successes 200 with item; failures non-200 with no change; client-sent role ignored; data persists across a new engine.",
      "evidence": "automated"
    },
    {
      "id": "E-SURFACE-API",
      "requirements": [
        "REQ-017"
      ],
      "kind": "restraint",
      "procedure": "Planned: cd api && TEST_DATABASE_URL=<value> python -m pytest -q tests/surface. Compare OpenAPI paths to the contract table; inspect schema tables; post duplicate names; borrow several items as one member.",
      "expected": "Paths equal the contract exactly; no detail, history, edit, search or login route; no history table; duplicate names accepted; one member can hold several items.",
      "evidence": "automated"
    },
    {
      "id": "E-ARCH-API",
      "requirements": [
        "REQ-017"
      ],
      "kind": "restraint",
      "procedure": "Planned: bash api/scripts/check-arch.sh. Grep imports in api/app and list directories.",
      "expected": "rules.py imports neither routes nor fastapi; db.py imports neither rules nor routes; no extra layer directories. Simplicity beyond this is reviewer judgment.",
      "evidence": "automated"
    },
    {
      "id": "E-CONFIG-START",
      "requirements": [
        "REQ-016"
      ],
      "kind": "production",
      "procedure": "Planned: cd api && python -m pytest -q tests/config. Start the app with DATABASE_URL missing, then malformed, capturing output. Needs no database.",
      "expected": "Process exits non-zero with a clear message that does not echo the value.",
      "evidence": "automated"
    },
    {
      "id": "E-UI-SHELL",
      "requirements": [
        "REQ-001",
        "REQ-002",
        "REQ-009",
        "REQ-013",
        "REQ-014"
      ],
      "kind": "correctness",
      "procedure": "Planned: cd web && npm test -- --run src/shell (Vitest + RTL, fetch mocked) covering switcher, rows, loading, empty state, state demos (stubbed failure/denied), Add field and button labels.",
      "expected": "Switcher shows exactly 3 users with roles and no password field; switching changes X-User-Id; rows show name and status with no Details control; loading indicator and 'No equipment yet' appear, with Add field above for admins; four state demos precede the list with title and aria-label; Enter or Add icon submits; empty name shows inline message and no request; members see no Add field; every button has title and aria-label.",
      "evidence": "automated"
    },
    {
      "id": "E-ROWH-STYLE",
      "requirements": [
        "REQ-015"
      ],
      "kind": "correctness",
      "procedure": "Planned: cd web && npm test -- --run src/shell/rowstyle. Render rows in every status and the loader state; read the stylesheet rule for the row class.",
      "expected": "All states use the same row class; the rule sets one fixed height with overflow hidden; no per-status height override. Layout measurement is left to E-ROWH.",
      "evidence": "automated"
    },
    {
      "id": "E-VISUAL",
      "requirements": [
        "REQ-015"
      ],
      "kind": "correctness",
      "procedure": "Reviewer compares screenshots (S3: manual or Vitest-rendered; S5: Playwright) with the approved mockup for system font, translucent top bar, rounded cards, subtle shadows, pill badges, round icon buttons.",
      "expected": "Reviewer records that each Apple-style attribute is present. This is judgment, not automated proof.",
      "evidence": "review"
    },
    {
      "id": "E-SURFACE-UI",
      "requirements": [
        "REQ-002",
        "REQ-017"
      ],
      "kind": "restraint",
      "procedure": "Planned: cd web && npm test -- --run src/surface. Query the rendered UI for non-goal controls.",
      "expected": "No Details, password, edit or search control exists and no detail screen is reachable.",
      "evidence": "automated"
    },
    {
      "id": "E-ARCH-WEB",
      "requirements": [
        "REQ-017"
      ],
      "kind": "restraint",
      "procedure": "Planned: cd web && node scripts/check-arch.mjs. Grep web/src for dangerouslySetInnerHTML; inspect package.json dependencies and src directories.",
      "expected": "No dangerouslySetInnerHTML; no router or state-library dependency; no unplanned directories. Playwright and Vitest as devDependencies are allowed.",
      "evidence": "automated"
    },
    {
      "id": "E-UI-MUT",
      "requirements": [
        "REQ-003",
        "REQ-004",
        "REQ-005",
        "REQ-006",
        "REQ-007",
        "REQ-010",
        "REQ-011",
        "REQ-012",
        "REQ-013",
        "REQ-014"
      ],
      "kind": "correctness",
      "procedure": "Planned: cd web && npm test -- --run src/mutations (Vitest + RTL, controllable fetch) per role and status, including the connected state-demo buttons.",
      "expected": "Member Borrow sends at once with no modal; admin Borrow modal lists Mia and Sam only, never Ada, Close sends nothing; row loader and list change only after 200, no banner; Return only for borrower and admin; out-of-service on Available only and Restore on out-of-service only, hidden from members; Delete hidden on loaned items, confirm modal names the item, Cancel sends nothing, Confirm shows loader then removal after 200; 403 gives Access denied modal with single OK; other failures give Close/Retry, Retry repeats the same request, nothing changes; the API failure and Access denied demo buttons open those modals; modals have role alertdialog and are keyboard-operable.",
      "evidence": "automated"
    },
    {
      "id": "E-JOURNEY",
      "requirements": [
        "REQ-001",
        "REQ-002",
        "REQ-003",
        "REQ-004",
        "REQ-005",
        "REQ-006",
        "REQ-007",
        "REQ-008",
        "REQ-009",
        "REQ-010",
        "REQ-011",
        "REQ-012",
        "REQ-013",
        "REQ-014",
        "REQ-016"
      ],
      "kind": "correctness",
      "procedure": "Planned, on the combined S1-S5 candidate: docker compose up -d --build && cd web && npx playwright test journey. Run PRD Journey steps 1-8 plus cancel-delete, forced 403, forced failure with Retry, forced borrow of a non-available item, keyboard operation of icon buttons.",
      "expected": "Each step matches the PRD wording; list changes only after 200; forced actions leave state unchanged and show the right modal; icon buttons are keyboard-reachable with tooltip and label; trace and screenshot per step saved.",
      "evidence": "automated"
    },
    {
      "id": "E-ROWH",
      "requirements": [
        "REQ-015"
      ],
      "kind": "correctness",
      "procedure": "Planned, on the combined candidate: cd web && npx playwright test rowheight. Compare bounding-box heights in Available, On loan, Out of service and loader states, as admin and member.",
      "expected": "All row heights identical (0 px difference).",
      "evidence": "automated"
    },
    {
      "id": "E-ARCH-COMBINED",
      "requirements": [
        "REQ-017"
      ],
      "kind": "restraint",
      "procedure": "Planned, on the combined candidate: bash api/scripts/check-arch.sh && (cd web && node scripts/check-arch.mjs) && bash scripts/check-layout.sh.",
      "expected": "Both layer checks pass; tracked top-level paths are only api, web, scripts, docker-compose.yml, .env.example, .gitignore. Simplicity is reviewer judgment.",
      "evidence": "automated"
    },
    {
      "id": "E-COMPOSE",
      "requirements": [
        "REQ-016"
      ],
      "kind": "production",
      "procedure": "Planned: docker compose up -d --build; create a borrow via UI or API; docker compose down (keep volume); docker compose up -d; reload.",
      "expected": "db, api, web healthy; loan, added items and statuses unchanged after restart; seed not duplicated.",
      "evidence": "automated"
    },
    {
      "id": "E-CONFIG-REPO",
      "requirements": [
        "REQ-016"
      ],
      "kind": "production",
      "procedure": "Planned: bash scripts/check-config.sh on the combined candidate. Inspect .env.example and .gitignore; grep the built web bundle and captured api logs for the password value.",
      "expected": ".env.example has placeholders only with the stack password only in POSTGRES_PASSWORD; .env is git-ignored; no password in bundle or logs.",
      "evidence": "automated"
    },
    {
      "id": "E-PROD-NA",
      "requirements": [
        "REQ-016"
      ],
      "kind": "production",
      "procedure": "Reviewer checks PRD wording ('Trial stays bounded', 'for user review before any build', sign-in and settings as non-goals) against absence of any deployment, user-count, availability, latency or backup figure.",
      "expected": "Reviewer records production thresholds as not applicable and that no numbers were invented; persistence across restart is covered by E-COMPOSE.",
      "evidence": "review"
    }
  ],
  "stories": [
    {
      "id": "S1",
      "title": "DB schema, rules, idempotent seed and test database",
      "requirements": [
        "REQ-003",
        "REQ-005",
        "REQ-006",
        "REQ-007",
        "REQ-008",
        "REQ-010",
        "REQ-011",
        "REQ-016"
      ],
      "evals": [
        "E-RULES",
        "E-DBSEED"
      ],
      "scope": [
        "api/app/db.py",
        "api/app/rules.py",
        "api/requirements.txt",
        "api/requirements-dev.txt",
        "api/docker-compose.test.yml",
        ".env.example",
        "api/tests/conftest.py",
        "api/tests/unit",
        "api/tests/db"
      ],
      "dependsOn": [],
      "parallelGroup": "g1"
    },
    {
      "id": "S2",
      "title": "API routes, validation and OpenAPI contract",
      "requirements": [
        "REQ-001",
        "REQ-005",
        "REQ-007",
        "REQ-008",
        "REQ-009",
        "REQ-010",
        "REQ-011",
        "REQ-012",
        "REQ-016",
        "REQ-017"
      ],
      "evals": [
        "E-API",
        "E-SURFACE-API",
        "E-ARCH-API",
        "E-CONFIG-START"
      ],
      "scope": [
        "api/app/main.py",
        "api/app/routes.py",
        "api/scripts/check-arch.sh",
        "api/tests/api",
        "api/tests/surface",
        "api/tests/config"
      ],
      "dependsOn": [
        "S1"
      ]
    },
    {
      "id": "S3",
      "title": "UI shell: switcher, list, states, Add field, styling",
      "requirements": [
        "REQ-001",
        "REQ-002",
        "REQ-009",
        "REQ-013",
        "REQ-014",
        "REQ-015",
        "REQ-017"
      ],
      "evals": [
        "E-UI-SHELL",
        "E-ROWH-STYLE",
        "E-VISUAL",
        "E-SURFACE-UI",
        "E-ARCH-WEB"
      ],
      "scope": [
        "web/package.json",
        "web/package-lock.json",
        "web/vite.config.js",
        "web/index.html",
        "web/scripts/check-arch.mjs",
        "web/src/App.jsx",
        "web/src/components",
        "web/src/api",
        "web/src/styles",
        "web/src/shell",
        "web/src/surface"
      ],
      "dependsOn": [],
      "parallelGroup": "g1"
    },
    {
      "id": "S4",
      "title": "UI mutations, modals, row loaders and demo wiring",
      "requirements": [
        "REQ-003",
        "REQ-004",
        "REQ-005",
        "REQ-006",
        "REQ-007",
        "REQ-010",
        "REQ-011",
        "REQ-012",
        "REQ-013",
        "REQ-014"
      ],
      "evals": [
        "E-UI-MUT"
      ],
      "scope": [
        "web/src/App.jsx",
        "web/src/components",
        "web/src/api",
        "web/src/mutations"
      ],
      "dependsOn": [
        "S3"
      ]
    },
    {
      "id": "S5",
      "title": "Compose stack, Playwright journey and combined-candidate verification",
      "requirements": [
        "REQ-001",
        "REQ-003",
        "REQ-004",
        "REQ-006",
        "REQ-007",
        "REQ-008",
        "REQ-011",
        "REQ-012",
        "REQ-015",
        "REQ-016",
        "REQ-017"
      ],
      "evals": [
        "E-JOURNEY",
        "E-ROWH",
        "E-VISUAL",
        "E-ARCH-COMBINED",
        "E-COMPOSE",
        "E-CONFIG-REPO",
        "E-PROD-NA"
      ],
      "scope": [
        "docker-compose.yml",
        "api/Dockerfile",
        "web/Dockerfile",
        "web/nginx.conf",
        ".env.example",
        ".gitignore",
        "web/playwright.config.js",
        "web/e2e",
        "scripts/check-layout.sh",
        "scripts/check-config.sh"
      ],
      "dependsOn": [
        "S2",
        "S4"
      ]
    }
  ],
  "coverage": [
    {
      "requirementId": "REQ-001",
      "status": "covered",
      "reason": "Seeded switcher: E-API, E-UI-SHELL, E-JOURNEY; stories S2, S3, S5."
    },
    {
      "requirementId": "REQ-002",
      "status": "covered",
      "reason": "Name and status with no Details: E-UI-SHELL, E-SURFACE-UI, E-JOURNEY; story S3."
    },
    {
      "requirementId": "REQ-003",
      "status": "covered",
      "reason": "Member immediate borrow with loader: E-RULES, E-UI-MUT, E-JOURNEY; stories S1, S4, S5."
    },
    {
      "requirementId": "REQ-004",
      "status": "covered",
      "reason": "Admin borrower modal, members only: E-UI-MUT, E-JOURNEY; stories S4, S5."
    },
    {
      "requirementId": "REQ-005",
      "status": "covered",
      "reason": "Admin cannot borrow, UI and API 422: E-RULES, E-API, E-UI-MUT; stories S1, S2, S4."
    },
    {
      "requirementId": "REQ-006",
      "status": "covered",
      "reason": "Return for borrower and admin: E-RULES, E-UI-MUT, E-JOURNEY; stories S1, S4, S5."
    },
    {
      "requirementId": "REQ-007",
      "status": "covered",
      "reason": "Access denied modal and server 403: E-RULES, E-API, E-UI-MUT, E-JOURNEY; stories S1, S2, S4, S5."
    },
    {
      "requirementId": "REQ-008",
      "status": "covered",
      "reason": "One active loan via CHECK, atomic update and concurrent test: E-RULES, E-DBSEED, E-API, E-JOURNEY; stories S1, S2, S5."
    },
    {
      "requirementId": "REQ-009",
      "status": "covered",
      "reason": "Add field, Enter, inline validation: E-API, E-UI-SHELL, E-JOURNEY; stories S2, S3."
    },
    {
      "requirementId": "REQ-010",
      "status": "covered",
      "reason": "Out-of-service and Restore admin-only, state-conditional: E-RULES, E-API, E-UI-MUT; stories S1, S2, S4."
    },
    {
      "requirementId": "REQ-011",
      "status": "covered",
      "reason": "Delete confirm, loader, 409 on loaned: E-RULES, E-API, E-UI-MUT, E-JOURNEY; stories S1, S2, S4, S5."
    },
    {
      "requirementId": "REQ-012",
      "status": "covered",
      "reason": "List changes only after 200; Close/Retry on failure: E-API, E-UI-MUT, E-JOURNEY; stories S2, S4, S5."
    },
    {
      "requirementId": "REQ-013",
      "status": "covered",
      "reason": "Loading, empty and state demos at top, with demo modal wiring in S4: E-UI-SHELL, E-UI-MUT, E-JOURNEY; stories S3, S4."
    },
    {
      "requirementId": "REQ-014",
      "status": "covered",
      "reason": "Icon tooltip/labels and alertdialog modals: E-UI-SHELL, E-UI-MUT, E-JOURNEY; stories S3, S4."
    },
    {
      "requirementId": "REQ-015",
      "status": "covered",
      "reason": "Row height: E-ROWH-STYLE (S3 style contract) and E-ROWH (S5 real layout); Apple look by reviewer judgment E-VISUAL."
    },
    {
      "requirementId": "REQ-016",
      "status": "covered",
      "reason": "Persistence and idempotent seed: E-DBSEED (S1 test DB), E-API, E-CONFIG-START, E-COMPOSE, E-CONFIG-REPO, E-PROD-NA; stories S1, S2, S5."
    },
    {
      "requirementId": "REQ-017",
      "status": "covered",
      "reason": "Non-goal restraint: E-SURFACE-API, E-SURFACE-UI, E-ARCH-API, E-ARCH-WEB, E-ARCH-COMBINED; stories S2, S3, S5."
    }
  ],
  "findings": [
    {
      "id": "F-001",
      "description": "Preference text mentions 'nextJS' with 'Single page application'. The plan follows the recorded technical decision: a plain React/Vite SPA. User confirmation is needed. Next.js would be a stack amendment.",
      "severity": "advisory",
      "basis": "Preferences string versus technical decision and Scope [Idea] 'React, FastAPI, PostgreSQL'."
    },
    {
      "id": "F-002",
      "description": "Earlier scope says members 'inspect detail'. The plan follows the later PRD (no Details button or screen); E-SURFACE-UI checks that none is built.",
      "severity": "advisory",
      "basis": "PRD Acceptance 'no Details button or screen'; Feedback 2."
    },
    {
      "id": "F-003",
      "description": "The mockup applies Add, out-of-service and restore client-side with success notes. The plan follows the PRD (no success banner, update after 200). The user should confirm the treatment of the non-loader actions.",
      "severity": "advisory",
      "basis": "Mockup act()/add() versus PRD 'no success banner'."
    },
    {
      "id": "F-004",
      "description": "The 100-character name cap and the 409 on deleting a loaned item are builder proposals needing confirmation. The cap is not asserted as acceptance.",
      "severity": "advisory",
      "basis": "The PRD gives no length limit or server status for these cases."
    },
    {
      "id": "F-005",
      "description": "The X-User-Id identity is spoofable and accepted for the trial only. The absence of real authentication is reviewer judgment.",
      "severity": "advisory",
      "basis": "Scope [Answer] 'pick one of the three seeded users … no password'."
    },
    {
      "id": "F-006",
      "description": "The plan has Compose interpolate DATABASE_URL from POSTGRES_* and omits DATABASE_URL from the committed .env.example. This narrows the technical config decision. TEST_DATABASE_URL (a placeholder, host-side test database) is added to .env.example, owned first by S1. The reviewer should confirm.",
      "severity": "advisory",
      "basis": "Technical configuration decision versus review items R-003 and R2-001."
    }
  ]
}
```
