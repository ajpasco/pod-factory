# Sol 6.1 High build package — preparation presentation

Read in order: [technical spec](THEME-TECH-SPEC.md), [evals](THEME-EVALS.md), [visual theme](THEME-SPEC.md), [workspace reference](mockups/workspace.html). The technical spec's explicit corrections govern conflicts; the mockup JavaScript is illustrative and must not replace the real workflow.

Requested model: `gpt-6.1-sol`, reasoning `high`. Do not silently substitute. This package prepares implementation; no builders have been started by writing it and it supplies no factory approval. Existing user/host permissions stay in place; no bypass-permission launch flags.

## Order and ownership

| Slice | Owner and allowed files, relative to orchestration/ | Deliverable | Depends on |
| --- | --- | --- | --- |
| 0 — Freeze acceptance | Coordinator/test author: design documents, new `test/theme-review.mjs`, baseline evidence/manifest | Inspect the harness, run the existing/new baselines, freeze input hashes and record genuine missing behavior | Nothing |
| 1 — Theme/layout CSS | Sol builder A: `public/style.css` only | Four palettes, header/rail/panel/drawer/tabs layout, responsive wrapping and visible focus | Slice 0; agreed DOM selectors below |
| 2 — View projection | Sol builder B: `public/index.html`, `public/app.js` only | Six views driven by saved state, preserved actions and selection, drawer/theme/tabs, failure/recovery access | Slice 0; same DOM contract |
| 3 — Integrate and verify | Sol test integrator: `test/browser-flow.mjs`; coordinator owns any integration fix in the three public files | Adapt only labels/navigation, run all suites, collect review evidence; original assertions remain | Slices 1 and 2 |
| 4 — One independent acceptance review | Sol reviewer, read-only except final evidence/report | Verify requirements, actual diff and protected hashes; reproduce blockers; disposition optional ideas | Slice 3 |

Slices 1 and 2 may run in parallel because their writable files do not overlap. Neither edits the other's files. If markup needs a class adjustment, agree it through the coordinator; do not create a separate styling framework. Slice 3 begins after both finish. Keep one reviewer pass, followed only by verification of concrete repairs; no review quota or repeated general redesign.

Shared presentation selectors: `data-step="1"`…`"6"` on panel wrappers; `nav[aria-label="Preparation steps"]` and its `[data-step-target]` buttons; `#session-toggle` controlling existing `#orca-connection`; `#theme`; artifact `tablist`/`tab`/`tabpanel` roles. Use these existing/new hooks for CSS and acceptance. Preserve all existing action/input IDs and the text/iframe safety boundaries. Names for incidental styling may be agreed once at dispatch, without changing these observable contracts.

## Builder instructions

Build only your slice from the frozen package. Reuse the current request functions, mutation guards and render data. Do not copy the mockup's `current = Math.max(current, n)` navigation or its pretend completion transitions. No backend, API, CLI, provider, package or factory change is needed.

Do not launch real model sessions, send Orca messages or use live preparation data to test CSS/navigation. Use fixture providers, fake Orca transport and temporary state. Preserve the running user demo; restart/update it only after implementation tests pass and the coordinator confirms it is idle.

A material ambiguity or failing acceptance assertion is a concrete report: requirement ID, reproduction, expected/actual and smallest proposed fix. Do not “solve” it with extra features, broader scope or weakened tests. Suggestions go in the handoff as deferred; do not implement them. There is no requirement to invent problems.

The existing application already has an interrupted-state recovery explanation. “No new interrupted banner” in the visual spec does not permit removing that explanation or its existing separate-preparation action. The new navigation-only continue control cannot write an acceptance record or automatically generate the technical spec.

## Verification commands

Run from `orchestration/` after the integrated candidate is ready:

```sh
npm test
npm run test:browser
npm run build
node test/theme-review.mjs
```

Use actual exit codes. A browser-launch/sandbox error is infrastructure failure; resolve it through the host's normal permission path, never by skipping checks or changing a result to pass. Test fixtures do not use paid model calls. The baseline can be red for missing UI, but the completed candidate cannot.

`design/THEME-BASELINE.json` records protected inputs and editable-file baselines. Verify protected entries by reading each path and recomputing SHA-256, not by trusting a builder's summary. Because this workspace contains untracked work, `git diff` alone is insufficient: compare filesystem paths/content with that inventory. Disclose any new file outside the allowed evidence directory before acceptance.

## Handoff format and stop condition

Each builder returns: changed files and purpose; eval IDs exercised with commands/results; remaining blockers with proof; deferred suggestions. The integrator records assertion-preserving browser-test edits separately. The reviewer reports TUI-M01–M03 and protected-hash checks, distinguishing local fixtures from live evidence.

Done means the agreed UI journey works, the explicit technical decision remains intact, failure/recovery work, no unauthorized effects were introduced, and the required tests/review pass. It does not mean the missing factory approval/dispatch capabilities were implemented. Do not commit, publish, merge, deploy or begin a React/FastAPI/Postgres app as part of this presentation slice.
