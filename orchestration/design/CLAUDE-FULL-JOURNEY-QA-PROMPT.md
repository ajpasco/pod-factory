# Prompt for Claude — full journey QA trial

Copy the prompt below into the coordinating Claude session. This is a separate application trial, not an addition to the orchestration presentation redesign.

---

Prepare a complete, executable-by-a-QA-agent end-to-end test plan for our orchestration and pod-factory workflow. The goal is to prove the business journey: a person describes an app, reviews its requirements and design, chooses its technical blueprint, gets a testable build plan, authorizes the supported build, and receives an application that meets the agreed requirements without extra features.

For this task, write the QA package only. Do not build the app, change factory enforcement, invent approvals, revoke locks, merge, deploy, or launch paid agents. Do not expand the orchestration implementation to make a test pass. Inspect what actually exists and distinguish implemented behavior from proposed behavior.

## Read first

Read the repository instructions and these sources:

- `orchestration/README.md`, `PREBUILD-STATUS.md`, `ORCA-INTEGRATION.md`, and current implementation/evidence documents.
- `orchestration/design/THEME-TECH-SPEC.md`, `THEME-EVALS.md`, `THEME-BUILD-PLAN.md`, and the actual UI. The theme package changes presentation, not approval authority.
- The applicable pod-factory PRD, technical spec, phase requirements and live enforcement code. Identify which revision is authoritative; an unapproved draft is not authority.

Reuse the existing test tooling where practical. Give file/line evidence for any claimed blocker. Do not start another exploratory lab or redesign round.

## Trial app: shared-equipment checkout

Use this bounded proposed brief as input to the preparation journey. Its scope becomes approved only through the actual user review; do not fabricate that review.

Build a small internal web app for a team borrowing shared equipment:

- **Stack:** React frontend, FastAPI backend, real PostgreSQL persistence. The technical blueprint must show the stack for explicit user review. Do not substitute SQLite, an in-memory database or mocked API calls for integration evidence.
- **Users:** seeded administrator and two seeded members. Sign in and sign out. No public signup, password-reset emails, SSO or account-management feature.
- **Equipment:** a list and detail view showing name, description and status: available, checked out or out of service. An administrator can add an item and mark an available item out of service or restore it. Required names and status transitions are validated by the API.
- **Checkout:** a signed-in member can borrow an available item. The item records its borrower and checkout time. Its borrower can return it. A different member cannot return that loan, including through a direct API request. Administrators have no special return-on-behalf action in this trial.
- **Conflict:** if two members request the same available item concurrently, exactly one checkout succeeds and the other receives an understandable conflict. PostgreSQL must contain exactly one active loan. The technical spec chooses the simplest sound transaction/constraint mechanism.
- **States:** loading, empty, validation error, API failure and access-denied states for the relevant screens. A failed request must not display a successful checkout. Reload and application restart retain committed data in PostgreSQL.
- **Usability:** usable on desktop and a narrow mobile viewport, keyboard-operable forms/actions, clear labels and focus. Match the approved mockup's journeys and states.
- **Scope exclusions:** reservations, due dates, reminders, notifications, search/filtering, reporting dashboards, uploads, payments, calendar integration, multi-tenant organizations and audit-history screens. Record suggestions separately; do not build them.

Keep the architecture easy to explain and test. Prefer a small React UI, a FastAPI application with clear route/business/persistence responsibilities, and PostgreSQL. Do not require a repository/service abstraction for every entity or mandate an arbitrary file-size limit. Evaluate the actual separation and need for each layer. Security requirements include server-side authorization, safe password/session handling, validated inputs, safe database queries, and no credentials in browser code or committed fixtures. Define concrete checks in the blueprint rather than calling the result “secure” without evidence.

Use `.env.example` with placeholders and ignored local `.env` configuration. Recommend Docker Compose for the repeatable app/database test environment. If Docker is unavailable, document a local FastAPI/React/PostgreSQL route using the same migrations and checks; missing PostgreSQL is a blocker, not permission to replace it. The QA agent uses an isolated test database and synthetic users/data only.

## Test two connected journeys

### A. Preparation and factory handoff

Start a fresh preparation in an isolated test workspace, leaving the user's existing preparation untouched. Exercise:

1. Enter the app idea and stack preference; answer scope questions. Separate confirmed requirements, necessary implementation choices and unaccepted suggestions.
2. Produce and review the PRD and mockup. Verify list/detail, roles, checkout/return, conflict and error states agree. Capture each unresolved decision instead of silently filling it with a feature.
3. Produce the technical blueprint: architecture, code organization, stack, configuration, security, testability and Docker decision. The user must be able to change the stack/preferences before explicitly selecting the current blueprint.
4. Produce correctness and restraint evals, requirement coverage, and bounded builder stories with dependencies and safe parallel work. Every requirement must have acceptance evidence assigned; a planned eval is not a passing test.
5. Review the package for gaps. Prove that a change to the upstream contract invalidates stale downstream selection/plan/handoff and cannot silently reuse old approval.
6. Resume through both the browser and supported CLI/Orca entry points, confirming they read the same preparation. Navigation, theme changes and a model suggestion must not approve or start work. Use fixture transport for routine automation; label live integration evidence separately.
7. At the actual authorization/handoff boundary, identify the reviewed content, direct user action, resulting record and success/failure response. An agent cannot supply a human approval. Local blueprint selection is not a factory gate approval.
8. If supported, dispatch builders under the approved scope and protected test contract, observe verification and review, and perform product acceptance through the implemented path. Test rejection of a controlled unauthorized file/test change in a disposable workspace, not in the real factory repository.

Check the current boundary before scheduling a run. At the time this prompt was prepared, the local preparation flow did not implement trusted factory approvals, a protected executable application harness or factory dispatch; its handoff was draft-only with `dispatchReady: false`. Re-check rather than assume this remains true. If still absent, mark the journey **BLOCKED at that step**. Keep later application cases ready but **NOT RUN**. Do not substitute a manually coordinated local build and call it a successful factory trial.

### B. The resulting application

Once an authorized build is available, test through a real browser against FastAPI and PostgreSQL:

- The complete happy path: admin adds equipment; member A signs in, finds and borrows it; member B sees it unavailable; A returns it; B can then borrow it.
- Anonymous, member and administrator permissions, including direct API attempts that bypass UI controls. Members cannot administer equipment or return another member's loan.
- Two genuinely concurrent checkout requests from separate members. Do not fake concurrency with sequential clicks. Assert both responses, final UI state and database invariant.
- Invalid inputs, unavailable/out-of-service equipment, repeated checkout/return requests, and API/network failure without false success or duplicate loans. Define repeat-request semantics in the approved contract before judging them.
- Reload/restart persistence, migrations against an empty test database, and reproducible seed/reset. An app restart must not erase or duplicate loans.
- Empty/loading/error states, keyboard flow, narrow-screen layout and mockup fidelity.
- Configuration and production criteria actually named in the approved contract: reproducible build/start, health/readiness behavior, useful errors/logs without secrets and dependency/security checks with stated thresholds. Do not invent a production platform or universal performance SLA for this trial.

Use direct API/database inspection to corroborate browser outcomes where needed. Do not accept a green UI notification as proof of a committed transaction. Browser happy-path tests alone cannot prove permissions or concurrency.

## Correctness and restraint

Keep these dimensions separate in the results:

- **Correctness:** all agreed journeys, permissions, integration, persistence and failure handling work.
- **Restraint:** no unaccepted behavior, unauthorized dependency/service, weakened test, expanded file scope, approval bypass, real data access or unnecessary architectural layer was added.

For mechanical restraint checks, demonstrate that the observer can detect the violation using a disposable negative fixture. For architecture/simplicity judgments, cite the actual diff and explain the business consequence; a preference is not a blocker. Scope checks cannot prove semantic restraint by themselves, and tests cannot promise zero bugs.

## Deliverables

Write a compact package under `docs/projects/equipment-checkout/qa/`:

1. `QA-PLAN.md`: scope, actual capabilities, prerequisites, run order, phase entry/exit conditions and the blocking handoff boundary if any.
2. `TEST-CASES.md`: stable case IDs with requirement/phase source, actor, setup, precise actions, expected UI/API/database outcomes as applicable, required evidence and cleanup. Include one full user journey plus focused negative and restraint cases. Each normative clause must map to a case or an explicitly identified review.
3. `RUNBOOK.md`: exact verified setup/run/reset commands where discoverable, required human checkpoints, synthetic fixture definitions, test database safeguards and evidence paths. Mark unknown commands as unresolved; do not invent working commands for unbuilt software.
4. `RESULTS-TEMPLATE.md`: case ID, revision/artifact, environment, PASS/FAIL/BLOCKED/NOT RUN, observed result, evidence link and defect ID. Include separate preparation, factory and application verdicts.

Provide a short coverage table and readiness summary. Keep this one bounded drafting/review pass. Fix demonstrated omissions or contradictions; defer optional improvements with a reason. Do not require extra approval ceremonies beyond the supported product flow.

Stop after producing the QA package. Report what a QA agent can run now, what needs an authorized app build or direct human action, and what is blocked. Do not claim execution evidence for a plan you have only written.
