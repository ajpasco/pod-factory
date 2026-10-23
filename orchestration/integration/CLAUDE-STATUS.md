# Claude — factory integration status

Assignment: Codex directive **D7** / [FACTORY-INTEGRATION-HANDOFF.md](../FACTORY-INTEGRATION-HANDOFF.md). Owner: Claude. An on-demand handoff, not a watcher.

## Entry — 2026-10-19, start

**Acknowledged D7.** Read: the handoff, `PREBUILD-STATUS.md`, `README.md`, `IMPLEMENTATION.md`, the service/CLI/workflow source, `evidence/equipment-connections/`, `docs/spec-drafts/orchestrator-approvals.md`, the installed CLI, the factory's records branch and `main`. The equipment-checkout QA package was finished first, as D7 directs: `docs/projects/equipment-checkout/qa/`, 49 cases, written only.

## Entry — 2026-10-19, completion

One bounded implementation, in an isolated export, returned as a patch. **The end-to-end chain is BLOCKED**, with one concrete prerequisite and the smallest change named below. Nothing was approved, dispatched, merged, revoked or loosened.

### Baseline

Isolated source export of the current untracked `orchestration/` tree, hashes in [`evidence/baseline-inputs.json`](evidence/baseline-inputs.json) (sha256-lf, 54 files). It matched `evidence/equipment-connections/results.json`'s recorded `inputHashes` for `src/server.ts`, `src/workflow.ts`, `src/cli.ts`, `public/index.html` and `public/app.js` exactly, so the starting snapshot is the same tree that trial measured.

**The presentation slice landed while this was in progress.** `public/index.html`, `public/app.js`, `public/style.css` changed and `test/theme-layout.mjs` appeared. This patch touches none of them; the export was refreshed from the workspace copies and every suite re-run, so all results below are against the **current** UI. Recorded in [`CHANGE-MANIFEST.json`](CHANGE-MANIFEST.json) under `concurrentWorkObserved`.

### Files

Written in this workspace: `orchestration/integration/**` and `docs/projects/equipment-checkout/qa/**`. Nothing else.

Changed by the patch, both backend only: `src/server.ts`, `src/cli.ts`. Added: `src/factory.ts`, `test/factory.test.ts`, `test/factory-fake.ts`, `test/factory-http.test.ts`, `test/factory-real-route.mjs`.

Verified **unchanged by hash**, not by assertion: all three `public/` files, every other `src/**` module, `package.json`, `package-lock.json`, `tsconfig.json`, all five `design/THEME-*` documents and all eleven pre-existing test files — 32 paths, all identical (`CHANGE-MANIFEST.json` → `allNotTouchedIdentical: true`).

### The supported factory route, as shipped

Established from the installed CLI (`pod-factory@0.0.0-m0`) and the live records, not from a document.

| Step | Authority it produces | Command |
| --- | --- | --- |
| Design, eval plan and classification | gate-2 approval record | `approve 2 --classification records/bootstrap/NNNN-*.json` (human) |
| Protect the tests | lock record carrying `lock.patterns`, `lock.testCommands`, `binds.files` | `lock` (human) |
| Authorize execution | gate-3 approval binding `.factory/work/plan/build-plan.md` and each `.factory/work/story-<n>/story.md` by sha256-lf at a tree | `approve 3` (human) |
| Builder work | transition records | `story start story-<n> --holder <builder>` |
| Verify | check-result records | `ci lock-guard`, `ci verify`, `ci gate-check` |
| Accept a story | story approval, then merge | `story finish`, `approve story-<n> --pr <N>` (human) |

The live records show this route genuinely working for the factory's own stories: gate-2 approval `5ffb95c267fd`, lock `0b0bc6b73309` (51 files, refs that approval), gate-3 approval `457d804ac529`, all with `actor.kind: "human"`. There is no `approve 1` and no dispatch command: a builder is launched by a person.

### The blocker — needs Codex's scope decision

**The route exists, but it has no place for a second application's protected harness.** `docs/projects/meeting-reminder/` is the precedent: an application inside the factory repository whose tests are protected because its paths are in `LOCKED_PATTERNS` and its runner is in `LOCKED_COMMANDS`. Those are shipped constants in enforcement code (`dist/lock-policy.js:7–62`, "held as constants because this code is enforcement code"), and a locked test asserts they match `docs/eval-plan.md` §4 and §5.

So protecting an equipment-checkout harness needs, in order:

1. A human-written amendment to `docs/eval-plan.md` §4 and §5 — a locked path, so `approve amendment --pr <N> docs/eval-plan.md`.
2. A source change adding this application's patterns and runner command to `LOCKED_PATTERNS` / `LOCKED_COMMANDS`, landed through the factory's own rules.
3. A new classification report plus `approve 2 --classification …` and `lock`.
4. A build plan naming the application's story, then `approve 3`.

Steps 1 and 2 change enforcement code and a locked document. **That is a prerequisite, not an adapter error, and it is not mine to decide** — the handoff says to ask Codex before expanding into a new enforcement mechanism. I did not reopen a bootstrap window, forge a record, or add a second authority store. Smallest proposal, for Codex's call: treat equipment-checkout exactly as meeting-reminder is treated — one amendment adding `docs/projects/equipment-checkout/**` harness patterns and one locked runner command — rather than making the gate paths project-aware, which is a larger product change.

### What is implemented, and what is not

**Implemented.** `src/factory.ts`: the export package with a recomputable `manifestDigest`; `evaluateDispatch`, the whole authority decision as one pure function; `mayDispatch`, the single rule every adapter checks before acting; and `RealFactoryRoute`, which reads the records branch and the trunk with plain-reading git only — no fetch, no checkout, no write — and reports eight named prerequisites. Outcomes are `ready`, `waiting-for-user`, `blocked`, `failed`, `uncertain`. A missing ref is `uncertain`, never assumed.

**Deliberately not implemented.** No submission. The service gained exactly one read-only route; `requestDispatch` on the real adapter refuses even when every prerequisite passes, because the factory ships no dispatch command. `dispatchReady` is untouched and still `false`. No approval surface exists anywhere, and `CON-06` still passes unchanged. The visual controls are Codex's, after this contract is reviewed.

### Proposed contract

`GET /api/factory[?story=story-N]` → `{ story, package: { manifestDigest, stories, preparationRevision } | null, exportRefusal?, route: { outcome, summary, readOnly, source, factoryVersion, recordsCommit, trunkCommit, prerequisites: [{ id, satisfied, requirement, observed, humanAction? }] }, dispatch: { implemented: false, note } }`

`GET /api/factory?include=package` → the exact reviewed package, so a reviewer recomputes `manifestDigest` rather than trusting it.

CLI: `factory [--story story-N]`, `factory-package`. Both read-only.

For the UI: render `route.outcome`; list unsatisfied prerequisites with `observed`; show `humanAction` only where it exists — the three application-specific prerequisites have none, because no command creates a harness that was never written. Nothing here is a control that approves.

### Commands and results

Run from the export after `npm run build`:

| Command | Result |
| --- | --- |
| `npm test` | **59/59 pass**, 0 fail ([unit-all.txt](evidence/unit-all.txt)) |
| pre-existing suites only | **50/50 pass** ([unit-existing-only.txt](evidence/unit-existing-only.txt)) |
| new factory suites | **9/9 pass** ([unit-factory.txt](evidence/unit-factory.txt)) |
| `npm run test:browser` | **3/3 journeys pass** ([browser-journey.txt](evidence/browser-journey.txt)) |
| `node test/theme-review.mjs` | **11/11 pass** under this patch ([theme-suites.txt](evidence/theme-suites.txt)) |
| `node test/theme-layout.mjs` | exit 0 ([theme-suites.txt](evidence/theme-suites.txt)) |
| `node test/equipment-connections.mjs` | CON-01…CON-07 **PASS**, FACTORY-01 **BLOCKED**, APP-01 **NOT RUN**, exit 0 ([log](evidence/equipment-connections.log)) |
| `node test/factory-real-route.mjs <repo>` | real read-only inspection ([real-route.json](evidence/real-route.json)) |

The nine new tests demonstrate what the handoff requires: the export carries every requirement, eval, coverage row and scope entry and binds its own bytes; it refuses a story without scope, a requirement without coverage and an unresolved gap; a missing gate-3 approval or an unprotected harness refuses and launches nothing; a changed digest, revision or story refuses; one request yields exactly one execution, a replayed operation id yields none and reports the first result, and an unresolved attempt refuses a retry; a failure is reported as failure; a success cites the factory reference and candidate rather than prose.

**One defect found and fixed in my own code during this run:** a replayed operation returned `outcome: "ready"` while carrying the earlier attempt, and the fake adapter dispatched a second time. Fixed by `mayDispatch`, which requires `outcome === 'ready' && existing === undefined`; both adapters now go through it, and the test that caught it is `factory.test.ts` case 7.

### Real inspection, against the live factory

`story-2` (a real, authorized story) → **blocked**, with five of eight prerequisites satisfied from genuine human records, failing only on `harness-authored`, `harness-protected`, `test-command-locked`. `story-4` (the hypothetical equipment story) → **blocked** on those three plus `story-authorized` and `story-bytes-match`. Read at records `3d9c61cbbc47`, trunk `a82a857346ce`, factory `0.0.0-m0`. That the adapter confirms real authority where it exists, and refuses precisely where it does not, is the evidence that it is reading the factory rather than describing it.

### Patch

[`integration/factory-connection.patch`](factory-connection.patch), 813 lines. Apply from `orchestration/`:

```sh
git apply integration/factory-connection.patch
```

`git apply --check` passed against the workspace as it stands. Hashes before and after each file are in [`CHANGE-MANIFEST.json`](CHANGE-MANIFEST.json). One disclosure: `test/equipment-connections.mjs` records `inputHashes` for `src/server.ts` and `src/cli.ts`, so that trial re-records new hashes after the patch; its assertions and its BLOCKED verdict are unchanged.

### Required user action

**None right now, and none should be performed speculatively.** The scope decision at the blocker is Codex's, and until it is made there is nothing for a person to approve. When it is made, the four steps above are all human and all outside any agent session (`requireHuman`, `dist/commands/common.js:22–30`).

**Ready for Codex's review of the backend contract.** Not integrated into the shared tree; the patch waits.

---

## Entry — 2026-10-19, presentation refinement (separate from the factory integration above)

**Ownership changed by Jay:** Claude now owns `public/index.html`, `public/style.css` and presentation-only changes to `public/app.js`. Sol and Codex are leaving those three files alone during the refinement. This supersedes the ownership paragraph in `FACTORY-INTEGRATION-HANDOFF.md`.

**Keep this separate from the factory work.** The factory connection stays in its isolated export and its patch (`factory-connection.patch`); none of it is applied here, and nothing below touches `src/**`, the backend, the CLI or any test.

**Changed:** `public/index.html` (+15/−7), `public/style.css` (+66/−12), `public/app.js` (+31/−7). Presentation only — no route, request, state field, action ID, gate or safety sentence changed.

| Refinement | Detail |
| --- | --- |
| Session drawer | Card → full-bleed band flush under the header, with a lead column and a controls column, as the mockup draws it. Every control ID stays inside `#orca-connection`. |
| Boundary sentence | Moved from its stray mid-drawer position into the drawer's lead column, verbatim, with the walkthrough link beneath it |
| Header pill | Gains the mockup's warning glyph |
| Mockup frame | Three dot spans and a mono filename, replacing the `● ● ●` text |
| Planning lists | Coverage, checks, stories, decisions and findings render as bordered rows with a status pill, instead of run-on sentences |
| Plan counts | The mockup's three tiles, derived from the plan already listed below them |
| Measure | Logo radius 7px; tabs 11px/16px at 14.5px |
| Narrow widths | Pills move above the row title; tiles wrap two-up at 390px |

**Deliberately not matched.** The review-packet panel keeps the exact artifact bytes rather than the mockup's summary table — exact content is the safety property there. No Google Fonts link: the shell CSP forbids it and `THEME-TECH-SPEC.md` §2 requires the system fallback. Stack preferences stay required; the mockup's "(optional)" label is not a behaviour change (`THEME-TECH-SPEC.md` §3).

**Checks, all green and none weakened:** `npm test` 50/50 · `npm run test:browser` 3/3 · `node test/theme-review.mjs` 11/11 · `node test/theme-layout.mjs` VIS-01/02/03 PASS, geometry still within 1px of the reference mockup · `node test/equipment-connections.mjs` exit 0, CON-01…CON-07 PASS, FACTORY-01 still BLOCKED.

**Screenshots:** `evidence/theme-ui-refinement/` — desktop steps 3 to 6, the open drawer, mobile steps 3 and 5, the mobile drawer, and the three alternate themes at 390px.

### Follow-up — self-hosted typeface

The refined layout still did not read as the reference design, and the cause was the typeface, not the layout. `IBM Plex Sans`, `IBM Plex Mono` and `Geist` are **not installed on this machine**, and the shell CSP forbids fetching them, so every token fell through to `system-ui`. `theme-layout.mjs` passed throughout because it blocks `https://**` on *both* pages, so the reference rendered in the same fallback — it compares geometry, and geometry was never wrong.

Jay chose to self-host. Added `public/fonts/` with the latin subsets of IBM Plex Sans (variable, 400–600) and IBM Plex Mono (400, 500) — three woff2 files, 60 KB total, verified by `wOF2` magic bytes before use.

**This required one backend change, against the "no backend changes" instruction, because self-hosting is impossible without it.** `src/server.ts` served exactly three hard-coded paths and read them as UTF-8, so it could not return a binary `.woff2` at all. Added one route:

- `GET /fonts/<name>.woff2` → same-origin woff2, read as bytes.
- The name must match `^[A-Za-z0-9-]+\.woff2$`: no path segments, no traversal. `/fonts/../../package.json`, `/fonts/sub/dir.woff2` and a missing file all return 404.
- **No CSP change.** `default-src 'self'` already covers `font-src`, which is why self-hosting was chosen over embedding `data:` URIs — those would have needed the CSP loosened.
- One defect found and fixed during verification: a missing font first returned 500 with the filesystem path in the body. It now returns the same 404 as any other unknown route.

Verified on a throwaway instance: both families load, `document.fonts` reports them, **no CSP violation and no external request**.

**Consistency with the factory patch:** `src/server.ts` is touched by both this change and the factory work. The font route was applied to the workspace *and* to the isolated export, and `factory-connection.patch` was regenerated from the two — so it still carries only the factory delta, contains zero font lines, is still 813 lines, and `git apply --check` still passes. The export's suite is still 59/59.

**Re-run after the fonts, all green:** `npm test` 50/50 · `npm run test:browser` 3/3 · `theme-review.mjs` 11/11 · `theme-layout.mjs` VIS-01/02/03 PASS, geometry unchanged · export `npm test` 59/59.

**Action needed from Jay:** the service on 4317 is running the build from before the font route, so it returns 404 for `/fonts/*` until the process is restarted. Saved preparation survives a restart, but it is a live process, so I have not touched it.

Comparison evidence: `evidence/theme-ui-refinement/compare-before-fonts.png` and `compare-after-fonts.png`.
