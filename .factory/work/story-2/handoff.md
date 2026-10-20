# story-2 handoff: Meetings snapshot list and modal (candidate A)

Branch: `candidate-story-2`, uncommitted working tree on top of `a82a857`. Only `docs/projects/meeting-reminder/web/src/main.ts` changed (plus this note); `git status --porcelain --untracked-files=all` showed nothing else.

## Done

`src/main.ts` now holds the single UI layer, with no dependencies, timers, storage or extra controls:

- Fetches `/meetings.json` once and validates it before rendering. The calendar must have a non-empty string `id` and the name `Meetings`. `fetchedAt` and `window.from`/`to` must be timed values with an explicit offset or `Z`. `events` must be an array, and each event needs a non-empty `id`, a string/absent title, and a start/end that are both real date-only values or both real offset timestamps. Impossible days, months, hours and minutes are refused.
- Renders the heading, `Source: Meetings calendar`, `Fetched …` and `Window: … to …`, all in the browser's timezone with a short zone name. Then one `<button>` per event inside a `<ul>` (title plus time). Empty titles show "Untitled meeting". All-day items show "All day, <date>" in their own date with no timezone shift, using the inclusive last day because the snapshot's end dates are exclusive.
- A valid empty list shows "No upcoming meetings.". Missing, non-OK, non-JSON, wrongly shaped or wrong-calendar snapshots show `Meetings snapshot unavailable: <reason>.` (`role="alert"`) and never the empty state.
- Activating an item fills the supplied `<dialog>` (title in `#details-title`, Starts/Ends/Calendar in `#details-fields`) and calls `showModal()`. Close calls `close()`, and the `close` event returns focus to the item that opened the dialog. Escape uses the native dialog behaviour.
- All calendar text is set with `textContent`. No `innerHTML` is used anywhere.

## Locked command results (repair round 1, run in order from the repo root on this tree, 2026-10-18, macOS)

1. `npm ci`: **exit 0.** "added 136 packages, and audited 138 packages in 2s … found 0 vulnerabilities".
2. `npm exec --workspace packages/cli -- vitest run --config vitest.config.ts`: **exit 0.** `Test Files 18 passed (18)`, `Tests 181 passed (181)`. Its report is at `.factory/work/reports/cli.json`.
3. `node docs/projects/meeting-reminder/web/scripts/run-browser-trial.mjs`: **exit 0.** `38 passed (23.8s)`: 30 acceptance and 8 observer probes, 1 worker, no skips, no retries. The runner printed "Protected trial passed: 38 tests" and its fresh report is at `.factory/work/reports/browser-trial-1792352103845-90180.json`. The webServer step ran `npm run build` (`tsc --noEmit && vite build`), so typecheck and build also passed.

History: in the first round, `npm ci` was refused by the session's permission check and never ran, so the vitest command exited 1 with `Cannot find package 'vitest'`. The browser trial passed 38/38 in that round too. In round 1, `npm ci` was run alone, exactly as locked, and was permitted. No source change was needed or made between rounds.

## Left

- Commit the candidate so the evidence binds to a revision. Nothing is committed yet.
- Independent review: MOD-05/RST-04 source and scope, MOD-06 visual click-through and screenshot, RST-01/RST-03 review portions, and CAL-01 live provenance. None of these was done by the builder.

## Open questions

- All-day "Ends" in the modal shows the inclusive last day (for example 21 Oct for `2026-10-21`→`2026-10-22`), not the raw exclusive end date. The spec says "use the event's provided dates", and I read that as not timezone-shifting them. A reviewer should confirm this reading.
- Events render in snapshot order, with no sorting. The snapshot is expected to arrive ordered from the calendar read.
- No test or spec defect was found.

## Next step

The coordinator commits the candidate, or authorizes me to, and the locked sequence is re-run in CI on that committed tree. After that come independent review and human story approval. This handoff is not merge authority.
