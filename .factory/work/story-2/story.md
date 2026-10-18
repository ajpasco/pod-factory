# story-2: Meetings snapshot list and modal

Authority: the approved `docs/spec/meeting-reminder-contract.md`, TR-01 through TR-07 and MOD/CAL/RST evals. This adds no reminder, synchronization, authentication or calendar-writing feature.

Tests:
- docs/projects/meeting-reminder/web/test/modal.spec.ts
- docs/projects/meeting-reminder/web/test/observer-probe.spec.ts

Scope:
- docs/projects/meeting-reminder/web/src/main.ts

Inputs:
- docs/spec/meeting-reminder-contract.md
- docs/projects/meeting-reminder/web/index.html
- docs/projects/meeting-reminder/web/src/style.css
- docs/projects/meeting-reminder/web/package.json
- docs/projects/meeting-reminder/web/package-lock.json
- docs/projects/meeting-reminder/web/tsconfig.json
- docs/projects/meeting-reminder/web/playwright.config.ts
- docs/projects/meeting-reminder/web/public/meetings.json
- docs/projects/meeting-reminder/web/test/modal.spec.ts
- docs/projects/meeting-reminder/web/test/observer-probe.spec.ts
- docs/projects/meeting-reminder/web/test/observers.ts

## Build

Implement the list and native dialog in the single scoped TypeScript file. Use the supplied HTML and CSS. No runtime dependencies, backend, timers, persistence, credentials or additional controls. Render calendar strings as text. Do not read the existing reference implementation or another builder's solution.

Run the locked application command as printed by the factory and preserve its test evidence. All 38 browser cases (30 acceptance + 8 observer probes) must execute and pass without skips or retries; all other locked commands must also pass. No changing tests/configuration/scripts or branching on the test environment. Report a demonstrated contract/test defect to the coordinator; do not repair the harness yourself.

Independent review supplies source restraint and visual findings; synthetic browser tests cannot prove live calendar provenance. A scope violation or protected-input change is a failed candidate even if tests pass. Human approval is required for the final candidate tree.

Write `.factory/work/story-2/handoff.md` with done, left, open questions and next step. The orchestrator owns story transitions; a handoff or green local report is not merge authority.
