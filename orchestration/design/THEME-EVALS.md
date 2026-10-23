# Presentation update — correctness and restraint evals

Status: acceptance contract for [THEME-TECH-SPEC.md](THEME-TECH-SPEC.md). These are local checks, not factory approvals or proof of production readiness. Scope is the presentation update, not the separate React/FastAPI/Postgres trial application.

## Run and interpret

From `orchestration/`:

```sh
npm test
npm run test:browser
npm run build
node test/theme-review.mjs
```

The first two commands retain existing service/CLI/browser behavior. The last command exercises the new UI through the real HTTP service with synthetic providers, temporary saved state and fake Orca transport. It must never connect to live model sessions or use the user's `.preparation/` data. No new dependency or package script is required.

The new harness outputs JSON results and exits nonzero for any failure. Browser-launch, server-start, dependency or fixture errors are infrastructure failures, not evidence of missing product behavior. Capture stdout/stderr and exit code. Do not skip failing checks, auto-update expected output, invent a pass from code inspection or add an allowance to CI. Baseline failures before implementation are observations, not approved failing tests for a merge.

## Automated scenarios

Each scenario must assert the observable result, including a negative case where specified. Stable view attributes are defined in the tech spec; tests do not prescribe a component framework or implementation algorithm.

| ID | Requirements | Setup/action | Required evidence |
| --- | --- | --- | --- |
| TUI-C01 | UI-01, UI-02 | Start empty, save an idea, then save a scope answer; reload at each state | Active panels 1→2→3; exactly one panel visible; correct current rail item; future steps disabled. No draft runs just because the answer was saved. |
| TUI-C02 | UI-02, UI-03 | Generate product drafts, navigate to blueprint, generate it, then explicitly select it | Product artifacts unlock 4; technical generation alone does not unlock 5 or call plan. Selection posts the displayed artifact's exact digest, then starts plan once using refreshed revision. |
| TUI-C03 | UI-01, UI-09 | Produce a plan, inspect it and request planning review | Plan enables 6; before review no completed claim/handoff. Successful review yields the existing draft-only handoff with dispatch false and required reviews unperformed. |
| TUI-C04 | UI-02, UI-08 | Reach later steps, revisit 3 then 4, reload | Visible panel and `aria-current` match; completed output remains reachable; no revision, artifact, operation or request effect from navigation; reload derives progress from saved work. |
| TUI-C05 | UI-02, UI-03 | Produce a plan/handoff, revisit 3 and request product changes | Existing invalidation clears technical selection, plan, review and handoff; 5/6 relock; old completion cannot be restored by rail navigation or reload. |
| TUI-C06 | UI-07, UI-08 | Open/close Session by button/Escape and inspect all existing controls | Drawer state/ARIA/focus correct; model, effort, save/start, discover/pair, detach and pending receipt/resume affordances retain their existing conditions. Toggling the drawer has no mutation effect. |
| TUI-C07 | UI-06, UI-09 | Use Experience, PRD, Review packet by click and keyboard | One visible tabpanel, matching ARIA relationships, one tab stop; Left/Right/Home/End work. Real artifacts/packet shown; iframe and text boundaries retained; no generation from tab selection. |
| TUI-C08 | UI-01, UI-05, UI-06 | Inspect six panels at 390px in all four themes; keyboard through controls | No horizontal page overflow; focused controls have a visible indicator and can be reached. Screenshots supplement these checks; dimensions alone do not prove usability. |
| TUI-C09 | UI-04 | Use deterministic failing and timed-out fixture tasks; revisit panels/reload; exercise existing separate-preparation recovery | Actual failure/interruption and next action remain visible; unfinished work is not marked complete; no automatic retry; prior state retained. Missing planning capability does not imply a ready blueprint step. |
| TUI-R01 | UI-02, UI-05, UI-08 | Switch all themes, reload, block storage, navigate/toggle tabs and type without submitting | Only `preparation-theme` is added for presentation preference; valid theme persists; invalid/blocked storage falls back without crashing. No presentation-only POST, autosave, provider call or saved workflow mutation. |
| TUI-R02 | UI-08, UI-09 | Observe browser requests and draft authority through the journey | No added remote font/CDN/analytics request or approval/build action. Existing local CSP, draft-only authority and dispatch refusal remain. This runtime check is supplemented by the protected-source comparison below. |

`TUI-C02` captures the actual request and server state; it must not pass merely because the button says “Use this blueprint.” `TUI-R01` observes requests and provider counters around presentation interactions; the absence of a forbidden keyword in a control is not sufficient restraint evidence.

## Review checks

| ID | Scope | Pass condition and evidence |
| --- | --- | --- |
| TUI-M01 | Visual and accessible experience | Review desktop and 390px captures of all six panels in Graphite; check every theme's text/focus/notice treatment, narrow layout, long text and keyboard flow. Listed text pairs meet the theme spec's 4.5:1 requirement. Capture one keyboard walkthrough. Informational divider checks are not a blanket accessibility certification. |
| TUI-M02 | Change restraint and code simplicity | Compare file inventory/hashes against `THEME-BASELINE.json`. Backend, CLI, package/lockfiles and authoritative tests/spec inputs unchanged. Only approved runtime files and the explicitly adapted browser harness change. No new layers/framework, hidden features, test-environment branches, approval bypass or mockup data in real output. Explain each helper by the view behavior it serves. |
| TUI-M03 | Preservation and honest wording | Check baseline safety sentences, all existing session controls, scope/proposal separation, blocking findings and recovery access in their new locations. “These look right” is navigation, not approval. “Stay aligned for review” replaces the mockup's guarantee. Planned evals are not test results; navigation completion is not gate completion. |

Review findings require a reproduction or exact source location plus business consequence. An optional preference does not block acceptance. Record defer/reject decisions rather than creating another design round.

## Protection and test changes

The coordinator records SHA-256 hashes before builders begin. A local manifest detects changes; it is **not** a factory lock and does not prevent an agent with filesystem access from editing a file. The reviewer checks the manifest independently of builder claims. Do not describe these evals as factory-protected or CI-enforced.

Builders cannot modify `test/theme-review.mjs` or weaken an expected result. A demonstrated test defect goes to the author/reviewer: show it, correct the expectation to this contract, record the reason and update the manifest explicitly before continuing. Never quietly re-pin after a builder changes a test.

The old `test/browser-flow.mjs` necessarily needs approved label changes and panel navigation. Preserve its provider counts, exact-selection requirement, stale/invalidation behavior, packet authority, recovery semantics and assertion coverage. A separate integrator/reviewer owns those edits and reports them. All existing TypeScript test files remain byte-identical.

## Evidence and exit

Baseline on 2026-10-18: `npm test` passed 50/50; `npm run test:browser` passed all three existing journeys. The new harness returned 0 passes and 11 acceptance failures, with zero infrastructure failures, against the unchanged presentation. Its scenarios stop at missing UI controls/panels, so their later assertions remain unexercised until implementation. Logs are `evidence/theme-existing-unit-baseline.txt`, `evidence/theme-existing-browser-baseline.txt` and `evidence/theme-ui-baseline.json`. Local loopback/Chromium required normal host sandbox approval; an initial restricted unit run failed with `listen EPERM` and is not the product baseline.

- Before implementation: record actual existing suite results and new-harness results in `evidence/theme-ui-baseline.json` and this package's baseline notes. No new UI pass is claimed before it runs.
- After implementation: save aggregate results/exit codes, scoped diff summary and required screenshots under `evidence/theme-ui-final/`. Include each review-check disposition; no private product/calendar data.
- Acceptance: existing suites pass, all eleven new automated scenarios pass, and the three review checks have evidence with no unresolved blocker. A missing result stays missing; a passing fixture does not establish live model quality.
- Stop: this completes the local UI presentation slice only. No factory record, lock, workflow, model comparison, merge or deployment changes are included.
