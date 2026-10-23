# Claude assignment — one application factory handoff

Status: implementation assignment requested by Jay: “can we have claude work on that piece, while sol and team build”. This authorizes local development and isolated testing, not human gate approval, live lock revocation, protection changes, merge or deployment. Codex coordinates integration. Sol implements the presentation slice in parallel.

## Outcome

Connect one equipment-checkout preparation to the existing factory's real build process, returning observable progress and results to the shared orchestration workflow. The intended chain is reviewed content → direct user approval → executable acceptance tests protected by the factory → authorized bounded builder → verification result. No more manual transfer of artifacts between sessions.

Read the actual shipped implementation before claiming any link already exists. The current connection trial proves browser/CLI/service behavior but stops at a draft-only handoff. React/FastAPI/PostgreSQL appears only in synthetic planning output; no application integration has run.

## Inputs

- `orchestration/PREBUILD-STATUS.md`, `README.md`, `ORCA-INTEGRATION.md`, and the actual service/CLI/workflow code.
- `orchestration/evidence/equipment-connections/README.md` and `results.json` — seven passing local connection assertions, factory blocked, app not run.
- `docs/spec-drafts/orchestrator-approvals.md` — direct user action, exact-content binding, truthful outcome, no agent-submitted approval.
- `orchestration/design/CLAUDE-FULL-JOURNEY-QA-PROMPT.md` and the equipment-checkout QA package you are already preparing. Finish that bounded package; reuse it rather than inventing a different app.
- The current factory repository, installed CLI provenance, active records and contracts. Read-only inspection is allowed; historical reports are not a substitute for current state.

## Ownership and isolation

Ownership update: Jay transferred `orchestration/public/style.css`, `public/index.html` and presentation-only `public/app.js` to Claude for visual refinement. Sol and Codex leave those files alone during that refinement. The approved self-hosted-font exception also permits the narrow binary font route; factory work remains separate. Codex owns UI integration, browser-test navigation adaptations and acceptance review. Do not edit these files or the theme specs/evals/baseline. Do not alter the live preparation data or restart its server.

Develop the factory connection in a separate checkout or disposable source export that includes the current untracked orchestration source. A plain Git worktree will omit untracked files; verify your starting snapshot. Record its source hashes. Keep implementation and tests there, including any necessary existing-service changes. Return a patch/change manifest for Codex to integrate after the UI baseline passes. Do not edit shared `orchestration/src/**`, existing tests or package files while Sol runs. In this shared workspace you may write only `orchestration/integration/` for your handoff/report/patch and your assigned `docs/projects/equipment-checkout/qa/` package.

Do not use bypass-permission flags, remove agent markers, forge human records, temporarily loosen production protection or use the hook's shell-write gap. Source changes to factory enforcement belong in an isolated candidate and remain subject to its real approval rules before use. A local candidate cannot authorize itself.

## Bounded execution

1. Establish the current supported factory route for this one application. Name the exact inputs, commands, outputs and source locations. Reuse the existing records, gates and test runner. Do not add another authority store or generic orchestration engine.
2. Implement the smallest adapter and supporting changes that can submit the exact reviewed inputs through that route and read its authoritative results. Keep the saved draft intact. A model proposal, browser request token, environment flag or local blueprint choice is not human identity. Do not flip the existing `dispatchReady` flag to bypass its invariants.
3. Tie each execution attempt to the reviewed preparation/revision and actual factory references. Changed inputs must refuse stale authorization. Retrying an uncertain result must reconcile existing work, not silently launch another builder or create another record.
4. Establish the executable acceptance-test requirement honestly. Planned procedures do not count as runnable tests. The authored/reviewed harness, actual baseline, runner and protection must be present before dispatch; preserve their evidence and identify who can amend them. Use the smallest equipment-checkout scope; do not generalize onboarding for arbitrary products.
5. Expose supported status/action results through the existing service/CLI model. Defer the visual approval controls to Codex after the backend contract is reviewed. Give the UI a concrete contract with success, waiting-for-user, blocked, failed and uncertain outcomes where applicable; no separate event bus or polling platform.

If the factory lacks a legal onboarding/plan route or the required direct-user approval capability, that is a prerequisite—not an ordinary adapter error. Report one concrete blocker with code/evidence and the smallest proposed change. Continue independent adapter/validation work, but do not reopen a bootstrap window or build an identity platform on your own. No speculative sequence of new labs. Ask Codex for the scope decision before expanding into a new enforcement mechanism.

## Required evidence

Use disposable state and an explicitly labeled fake factory adapter for contract tests, then real supported commands in an isolated environment where permitted. Keep fixture and real evidence separate. Tests must demonstrate:

- Exact reviewed package exported without silently dropping its requirements, tests or story scope.
- Missing approval or missing protected harness refuses before any builder launch.
- Changed artifact/test/runner bytes invalidate the candidate or authorization.
- One authorized request corresponds to one observed execution; duplicate/uncertain requests do not duplicate it.
- Actual failure is reported as failure; success cites the factory result and candidate, not an agent's prose.
- Existing preparation, CLI, invalidation and notification behavior remains intact.
- The final end-to-end chain is either demonstrated using genuine supported authority or explicitly BLOCKED. Fake approval records prove no human ceremony. Do not call fixture dispatch a factory-built application.

Only a direct user action may satisfy a required real approval. Prepare concrete reviewable content before requesting it. No need for Jay to perform speculative setup while the candidate is still changing.

## Handoff and stopping rule

Write `orchestration/integration/CLAUDE-STATUS.md` at start and completion (and on a material blocker). Include baseline, owned files, exact implemented/not-implemented boundary, test commands/results, evidence links, the proposed API/CLI contract, patch location and any required user action. Keep the report concise. This file is an on-demand handoff, not a background watcher or transport guarantee.

Complete one bounded implementation and one proof-backed review. Fix concrete defects in the agreed chain. Defer optional enhancements. No architecture polishing, generalized onboarding, automatic merging, parallel builder scheduling or new approval ceremony for its own sake. Do not build the equipment app yet; first demonstrate that the connection can legally dispatch its approved work. Report readiness to Codex before any integration into the shared UI/backend.
