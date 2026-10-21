# Technical Blueprint: Shared Equipment Checkout (Trial)

This is a blueprint only. No code exists, and no command in it has been run. Every test and command below is **planned evidence**. This local technical selection does not authorize implementation, merge, deployment or acceptance.

## 1. Stack and fit
- **Front end:** React 18 SPA built with Vite, in JavaScript. It has no router and no global state library. Plain `useState` and `fetch` are enough for one screen.
- **Back end:** FastAPI on Python 3.12, with SQLAlchemy 2 and psycopg 3.
- **Database:** PostgreSQL 16.
- **Deployment (local):** Docker Compose with `db`, `api` and `web` (nginx serves the static build and proxies `/api`).
- **Conflict:** the preference text says "nextJS" and also "Single page application". The blueprint picks a plain React SPA (finding F-001). Please confirm.

## 2. Responsibility layers (2) and dependency direction
```
web/  src/api (fetch client) · src/components · src/App.jsx
  │ HTTP /api (JSON, X-User-Id header)
api/  app/routes.py → app/rules.py → app/db.py → PostgreSQL
```
- `routes.py`: HTTP, identity lookup, input validation, and mapping rule errors to 403/404/409/422.
- `rules.py`: who may do what, and which state transitions are allowed.
- `db.py`: models, session, atomic conditional updates, idempotent seed on startup.
- Dependencies point downward only. The UI never encodes a permission as its only protection. Hiding controls is a convenience and the server enforces the rules.

**Data:** the `users` table (id, name, role) and the `equipment` table (id, name, status, borrower_id). A CHECK constraint ties on_loan to a non-null borrower. There is no loan history (non-goal).

**API (contract owned by the api, published as the FastAPI OpenAPI schema):**

| Call | Who | Result |
|---|---|---|
| GET /api/users | any | the 3 seeded users |
| GET /api/equipment | any | the list |
| POST /api/equipment {name} | admin | 200 + item |
| POST /api/equipment/{id}/borrow {borrowerId?} | member (self only), admin (a member as borrower) | 200 + item |
| POST …/return | the borrower or an admin | 200 + item |
| POST …/out-of-service, …/restore | admin | 200 + item |
| DELETE /api/equipment/{id} | admin, item not on loan | 200 |

Errors: 403 permission, 404 unknown id, 409 wrong state (for example not available, or delete of a loaned item), 422 validation (empty name, admin as borrower, unknown member).

## 3. Requirements and traceability
The requirement list is in the structured `requirements` field (REQ-001..017), each with a PRD/mockup/scope citation. The PRD has no numbered acceptance IDs, so each REQ points to the PRD acceptance clause it comes from.

| Check | Level | REQs |
|---|---|---|
| Role/status rules table | pytest unit (rules.py) | 003–008, 010, 011 |
| Permission, validation, 409 and concurrent borrow | pytest + real Postgres | 005, 007–009, 011, 016 |
| Controls per role and status; modals; loader-then-200; inline validation; empty and loading states | Vitest + RTL, fetch mocked | 001–004, 006, 009, 011–014 |
| PRD Journey 1–8, forced 403, forced failure with Retry, restart persistence | Playwright on Compose | 001–016 |
| Row height identical (bounding boxes across statuses and loader) | Playwright | 015 |
| Apple-style look compared with the mockup | manual review, with screenshots | 015 |

Test names carry the REQ ID. Tests are derived from the PRD acceptance criteria and mockup behavior, not from this document. Where the mockup differs from the PRD, the PRD wins (F-003).

## 4. Commands and expected evidence (all planned)
- `cd api && python -m pytest -q`: all tests pass. Report saved.
- `cd web && npm test -- --run`: all tests pass.
- `docker compose up -d --build`: the three services are healthy.
- `cd web && npx playwright test`: the journey specs pass, with a trace and screenshot per step.
- Restart persistence: borrow an item, run `docker compose down` and then `docker compose up -d`, then reload. The loan is still shown.
- Manual: open http://localhost:8080 and walk PRD Journey steps 1–8. Check the tooltips and keyboard operation of every icon button. Compare with the mockup.

Still unproven until it is run: all of the above. A local pass without Compose does not count as container verification.

## 5. Security controls
Identity comes from the switcher and is sent as `X-User-Id`. It is **trial-only and spoofable** (F-005), which the confirmed scope accepts. Controls:
- The server derives the role from the users table on every request.
- A permission check for every mutation, returning 403.
- Pydantic validation: trimmed non-empty name with a length cap (100 proposed, F-004), the borrower must be an existing member, and unknown fields are rejected.
- Parameterized SQL only. React escaping only, so the mockup's HTML-string rendering is not copied.
- CORS restricted to the configured origin.
- Safe logging: method, path, status and user id. No bodies and no DATABASE_URL.
- The browser holds no secrets.

Currently enforced automatically: nothing yet. The planned pytest 403/422 tests and the planned review are the enforcement. A passing suite does not prove the app is secure.

## 6. Configuration
- `.env.example` (committed, placeholders only): POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, DATABASE_URL, CORS_ORIGINS, VITE_API_BASE_URL.
- `.env` (local, git-ignored) holds real local values. Secrets are not committed.
- The API validates configuration at startup and exits with a clear message that does not echo values.
- Native credential storage is not applicable (no native app).
- Production secrets would come from the host's secret store. No deployment is in scope.

## 7. Docker decision
Docker is used: Compose with `db` (named volume, healthcheck), `api` (non-root) and `web` (multi-stage node build, then nginx). It is needed for a reproducible Postgres and for a real restart-persistence check. Commands are in section 4.

## 8. Production
Not applicable as a gate. The scope is a bounded trial, and no thresholds (availability, latency, scale, backup) were supplied. None are invented. Real authentication, TLS and backups would need a scope amendment.

## 9. Stories, ownership and integration (for the later plan)
1. **S1 DB + rules + seed** (api owner). It has no dependencies. It delivers the schema, the idempotent seed, rules.py, and the unit tests.
2. **S2 API routes and contract** (api owner), after S1. It delivers the routes, the error mapping, the integration tests and the OpenAPI schema. The OpenAPI schema is the contract the web owner builds against.
3. **S3 UI shell** (web owner), which can start in parallel against the contract with mocked fetch. It delivers the switcher, the list, the loading and empty states, the state demos at the top, the row styling and the Add field.
4. **S4 UI mutations and modals** (web owner), after S3. It delivers the borrower modal, the confirm modal, the failure and access-denied modals, and the row loaders.
5. **S5 Compose + Playwright journey** (shared, last). It needs S2 and S4.

**Combined-candidate verification:** after S1–S4 are merged into one candidate, run Compose and the Playwright journey against that combined build. Per-story passes do not substitute for it. A contract change after S2 needs the web owner's agreement.

## 10. Builder discretion and amendments
The builder may choose file names, internal helper structure, CSS details, the icon set and the test fixtures, as long as the requirements and boundaries above hold. Changes to behavior, stack, layers, boundaries or acceptance criteria need an amendment and approval. Optional ideas stay in a backlog and are not built. Examples are history, attribution of admin returns, search and a real login.

## 11. Open points (advisory, see findings)
Confirm Next.js versus plain SPA (F-001). Confirm the treatment of the non-loader actions (F-003), and the name cap and the 409 on delete of a loaned item (F-004). The PRD's own open questions (attribution, multiple items per member, duplicate names) are kept at their stated assumptions.


## Structured planning evidence

```json
{
  "stack": "React 18 SPA (Vite, JavaScript) + FastAPI (Python 3.12) + SQLAlchemy 2 / psycopg 3 + PostgreSQL 16; Docker Compose (postgres, api, web served by nginx). Tests: pytest, Vitest + React Testing Library, Playwright.",
  "layers": 2,
  "requirements": [
    {
      "id": "REQ-001",
      "description": "The user switcher lists exactly three seeded users (Ada Admin, Mia Member, Sam Member), each with its role. No password or sign-in screen exists. Choosing a user changes the acting identity for all later requests.",
      "authority": "PRD Acceptance 'Switcher lists exactly three seeded users with role; no password'; Scope [Answer] identity; PRD Journey step 1"
    },
    {
      "id": "REQ-002",
      "description": "Every equipment row shows name and status (Available, On loan – <member name>, Out of service). There is no Details button or detail screen.",
      "authority": "PRD Acceptance 'Every row shows name and status; no Details button or screen'; Feedback 2; Non-goals 'detail screens'"
    },
    {
      "id": "REQ-003",
      "description": "A member's Borrow on an Available item sends the request immediately for themselves, with no borrower selection. A row loader shows until a 200, then the row reads On loan – that member.",
      "authority": "PRD Acceptance 'Member Borrow sends the request immediately'; Journey step 8; Feedback 3, 12"
    },
    {
      "id": "REQ-004",
      "description": "An admin's Borrow opens a borrower modal before any request. It lists members only and never the admin. Close cancels with no request and no change. Choosing a member starts the borrow, with a row loader until 200, then On loan – that member.",
      "authority": "PRD Acceptance 'Admin Borrow opens a borrower modal…', 'Choosing a member starts the borrow'; Journey steps 2–3; Feedback 11"
    },
    {
      "id": "REQ-005",
      "description": "Admins cannot borrow for themselves. The UI never offers the admin as a borrower, and the API rejects an admin as borrower.",
      "authority": "PRD Acceptance 'Admins cannot borrow for themselves'; Feedback 11, 12"
    },
    {
      "id": "REQ-006",
      "description": "Return is shown on a loaned item to its borrower and to any admin. Other members see no action. Return shows a row loader until 200, then the row is Available.",
      "authority": "PRD Acceptance 'On loan: Return icon for the borrower and for any admin'; Journey step 4; Feedback 9"
    },
    {
      "id": "REQ-007",
      "description": "A member who forces a return of another member's loan, or a delete, add, out-of-service or restore, gets the Access denied modal ('You do not have permission') with a single OK icon. Nothing changes. The server enforces this with 403.",
      "authority": "PRD Acceptance 'A forced member attempt…shows the Access denied modal', 'Access denied is a modal with a single OK icon'; Screen states"
    },
    {
      "id": "REQ-008",
      "description": "An item never has more than one active loan. Borrowing a non-available item is rejected and nothing changes, even for concurrent requests.",
      "authority": "PRD Acceptance 'An item never has more than one active loan'; Scope [Idea] exactly one active loan per item"
    },
    {
      "id": "REQ-009",
      "description": "An admin can add equipment from the Add field above the list. Enter submits like the Add icon, and the new item appears as Available. An empty or whitespace name shows an inline validation message and creates nothing. Members see no Add field.",
      "authority": "PRD Acceptance 'Enter in the Add field…', 'Admins see Add equipment (above the list)'; Journey step 5; Feedback 8"
    },
    {
      "id": "REQ-010",
      "description": "An admin can mark an Available item out of service (shown on Available items only) and restore an out-of-service item (shown on out-of-service items only). Members see neither action.",
      "authority": "PRD Acceptance 'Admins see…Mark out of service (Available only), Restore (out of service only)'; Journey step 6; Scope [Idea] admins mark out of service, restore"
    },
    {
      "id": "REQ-011",
      "description": "An admin's Delete x opens a confirm modal naming the item, before any request. Confirm sends the delete, shows a row loader until 200, then the item is gone. Cancel closes the modal with no request and no change. Delete is not offered on loaned items, and the server rejects a delete of a loaned item with 409.",
      "authority": "PRD Acceptance 'Admin Delete x opens a confirm modal…', 'Delete x (not on loaned items)'; Journey step 7; Feedback 6, 13"
    },
    {
      "id": "REQ-012",
      "description": "For Borrow, Return and Delete, the list changes only after a 200, with no success banner. On a non-200 response (other than the 403 case), nothing changes and a modal with Close and Retry icons appears. Retry repeats the same request.",
      "authority": "PRD Acceptance 'Borrow/Return/Delete show a row loader; the list changes only after a 200; no success banner', 'On a non-200 response nothing changes'; Journey step 8; Feedback 3, 5, 7"
    },
    {
      "id": "REQ-013",
      "description": "The Loading state shows a list indicator while equipment is fetched. The Empty state shows 'No equipment yet', with the Add field above it for admins. The state demos appear at the top of the page.",
      "authority": "PRD Screen states; Acceptance 'State demos appear at the top'; Feedback 3"
    },
    {
      "id": "REQ-014",
      "description": "Every button is an icon with a tooltip and an accessible label. Modals use role alertdialog and are keyboard-operable.",
      "authority": "PRD Acceptance 'Every button is an icon with tooltip and accessible label'; Feedback 6; mockup button title/aria-label attributes"
    },
    {
      "id": "REQ-015",
      "description": "All rows have identical, reduced height regardless of status, icons or loader. The look follows the Apple style: system font, translucent top bar, rounded cards, subtle shadows, pill badges, round icon buttons.",
      "authority": "PRD Acceptance 'All rows have identical, reduced height', 'Apple-style look'; Feedback 1, 4, 5; mockup .row height:48px"
    },
    {
      "id": "REQ-016",
      "description": "Committed changes (equipment, status and borrower) persist across restart of the API and database. First start seeds one admin and two members, and the seed is idempotent.",
      "authority": "PRD Acceptance 'Committed changes remain after restart'; Scope [Idea] seed one admin and two members, persistence"
    },
    {
      "id": "REQ-017",
      "description": "Restraint: nothing is built for the listed non-goals (passwords, accounts, history, due dates, notifications, detail screens, editing, restoring deleted items, reservations, search, themes and so on). Duplicate names are allowed and a member may hold multiple items, as assumed in the PRD.",
      "authority": "PRD Non-goals; PRD Unresolved product questions (assumptions)"
    }
  ],
  "decisions": [
    {
      "topic": "architecture",
      "decision": "Two layers. (1) web/: React 18 + Vite SPA in JavaScript, in src/api (fetch client), src/components, src/App.jsx. (2) api/: FastAPI in app/main.py + app/routes.py (HTTP, identity header, validation, status codes), app/rules.py (borrow/return/delete permission and state rules), app/db.py (SQLAlchemy models, session, atomic updates, idempotent seed). Dependencies point one way: web → HTTP → routes → rules → db, and nothing points back. Equipment is one table: id, name, status in ('available','on_loan','out_of_service'), borrower_id nullable, with a CHECK that (status='on_loan') = (borrower_id IS NOT NULL). A users table holds the three seeded users. There is no loan-history table because history is a non-goal. The API is a REST/JSON surface under /api: GET /users; GET/POST /equipment; POST /equipment/{id}/borrow {borrowerId?}; /return; /out-of-service; /restore; DELETE /equipment/{id}. All mutations return 200 with the updated item, which matches the PRD 'until 200' wording. Errors: 403, 404, 409, 422. The UI shows the Access denied modal for 403 and the Close/Retry modal for any other failure.",
      "rationale": "This is a small CRUD app with a handful of rules, so two layers are enough. The state rules need unit tests with no HTTP, which is why rules.py is separate from routes.py. The single-table design makes 'one active loan' structural. Borrow runs as UPDATE … WHERE status='available' and checks the affected row count, so concurrent borrows cannot both succeed (REQ-008)."
    },
    {
      "topic": "testability",
      "decision": "Planned evidence (nothing has been run). Unit, API: pytest on rules.py covering REQ-003..008, 010, 011. Integration, API: pytest with FastAPI TestClient against a real Postgres (a Compose service or CI service container) covering the REQ-007, 008, 009, 011, 012 and 016 server behavior, including a two-thread concurrent-borrow test and a restart-persistence test. Unit, UI: Vitest + React Testing Library with fetch mocked, covering REQ-001, 002, 004, 009, 011..014; the tests assert the controls shown per role/status and that the list changes only after a 200. Journey: Playwright against the Compose stack, running PRD Journey steps 1–8 plus the forced-403 and forced-failure paths. Row-height identity (REQ-015) is a Playwright assertion on bounding-box heights across statuses and loader. Visual Apple-style fidelity is manual review against the mockup. Planned commands: `cd api && python -m pytest -q`; `cd web && npm test -- --run`; `docker compose up -d --build && cd web && npx playwright test`. Expected evidence: pass reports plus a Playwright trace/screenshot per journey step. Tests must be written from the PRD acceptance criteria and mockup behavior, not from this blueprint, and each test name carries its REQ ID. The mockup is a behavior reference only; its in-memory logic is not a test oracle where it differs from the PRD (see findings).",
      "rationale": "Each rule can be checked at the lowest level that still shows it, and the external effects (HTTP, Postgres, browser) are covered by integration and journey checks. The REQ-to-AC traceability points at PRD clauses, so the spec is not its own proof."
    },
    {
      "topic": "security",
      "decision": "Identity in the trial is the seeded user id sent as an X-User-Id header from the switcher. This is spoofable by design and is not authentication; it matches the confirmed 'no password' scope and must be labelled as trial-only. Controls: (a) the server re-derives role from the users table on every request and never trusts a role sent by the client; (b) a permission check in rules.py for every mutation (403); (c) Pydantic validation: the name is trimmed, non-empty and capped at a length (proposed 100, see findings), the borrowerId must reference an existing member, and unknown fields are rejected; (d) SQLAlchemy parameterized queries only; (e) React's default escaping, with no dangerouslySetInnerHTML, whereas the mockup builds HTML strings and must not be copied; (f) CORS limited to the configured web origin (or same-origin through the nginx /api proxy); (g) logs record method, path, status and user id, never bodies or the DATABASE_URL; (h) no secret in the browser bundle. Current automated enforcement: none yet (planned pytest 403/422 tests). Reviewer judgment is needed for the absence of real authentication.",
      "rationale": "Real authentication is a non-goal, so the concrete risk is privilege and state abuse through direct API calls. Server-side checks and validation address that risk. The trial limitation is stated openly instead of being hidden."
    },
    {
      "topic": "configuration",
      "decision": "Committed .env.example holds placeholders: POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, DATABASE_URL=postgresql+psycopg://user:CHANGE_ME@db:5432/equipment, CORS_ORIGINS=http://localhost:5173, plus VITE_API_BASE_URL=/api (non-secret). The real .env is git-ignored and holds local values. The API validates at startup and exits with a clear message, without echoing values, if DATABASE_URL is missing or malformed. Compose reads .env. Only non-secret values go into the web build. Native credential storage is not applicable because there is no native app. Production secrets, when a deployment is approved, come from the host's secret store or environment, never from the repo.",
      "rationale": "The database credentials are the only secrets, and the API needs them to start. The browser holds none."
    },
    {
      "topic": "docker",
      "decision": "Use Docker Compose with three services: db (postgres:16, named volume for persistence, healthcheck), api (python:3.12-slim, uvicorn, depends_on db healthy, non-root user), web (multi-stage: node build, then nginx serving the static SPA and proxying /api to api). Planned commands: build/run `docker compose up -d --build`; test `docker compose run --rm api python -m pytest -q`; Playwright against http://localhost:8080; stop `docker compose down` (keep the volume), and `docker compose down` then `up` to verify restart persistence (REQ-016). Local non-container test runs do not establish container verification; that needs the Compose commands above.",
      "rationale": "The app needs a PostgreSQL service, an API and a static front end. Compose gives one-command reproducible local runs and a realistic restart-persistence check, so Docker is justified here."
    },
    {
      "topic": "production",
      "decision": "Not applicable as a gate. The scope is an explicitly bounded trial that is for review before any build, and no deployment target, user count, availability, latency, backup or retention thresholds are supplied or derivable. No numeric targets are invented. If production is later wanted, the necessary measurable decisions (real authentication, TLS, backups, thresholds) are gaps that need a scope amendment. Persistence across restart (REQ-016) is the only production-like constraint in scope.",
      "rationale": "The PRD says 'Trial stays bounded' and lists sign-in and settings as non-goals, so adding production criteria would silently expand the scope."
    }
  ],
  "findings": [
    {
      "id": "F-001",
      "description": "Stack-preference conflict. The preference text says 'React JS … Single page application nextJS'. Next.js is a server-rendering framework and does not fit a plain SPA served over a FastAPI API. This blueprint chooses a React SPA built with Vite and does not use Next.js. The user should confirm. If Next.js is required, that is a stack amendment (static export would be the nearest fit).",
      "severity": "advisory",
      "basis": "Preferences string versus Scope [Idea] 'React, FastAPI, PostgreSQL', which does not name Next.js."
    },
    {
      "id": "F-002",
      "description": "The second confirmed-scope entry says members 'inspect detail'. The PRD removes all Details buttons and screens (Feedback 2, Non-goals). The blueprint follows the later approved PRD and builds no detail view.",
      "severity": "advisory",
      "basis": "PRD Acceptance 'no Details button or screen' supersedes the earlier scope wording."
    },
    {
      "id": "F-003",
      "description": "The mockup differs from the PRD in places. Mark out of service, Restore and Add are instant client-side changes with success notes ('Added …', 'restored'), while the PRD requires no success banner for Borrow/Return/Delete and the user says nothing about loaders for the other actions. The blueprint applies the PRD: Borrow/Return/Delete wait for 200 with a row loader and show no banner. Add, out-of-service and restore also call the API and update after 200, and no success banner is shown. The user should confirm that treatment of the non-loader actions.",
      "severity": "advisory",
      "basis": "Mockup act()/add() functions versus PRD Acceptance 'no success banner'."
    },
    {
      "id": "F-004",
      "description": "The PRD does not specify a maximum equipment-name length or the server response for deleting a loaned item. The proposed 100-character cap and 409 on deleting a loaned item are builder proposals that need confirmation. They are not promoted to scope.",
      "severity": "advisory",
      "basis": "PRD Acceptance 'Empty name shows an inline validation message' and 'Delete x (not on loaned items)' give no limit or server behavior."
    },
    {
      "id": "F-005",
      "description": "The X-User-Id switcher identity is spoofable. This is accepted for the trial by the confirmed scope and does not protect against a real attacker.",
      "severity": "advisory",
      "basis": "Scope [Answer] 'pick one of the three seeded users … no password'."
    }
  ]
}
```
