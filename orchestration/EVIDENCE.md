# First preparation slice: evidence

Date: 2026-10-18. Local implementation and local verification only; no commit, CI deployment, factory gate or production claim.

## Demonstrated business journey

The real Claude CLI provider, with model tools and MCP disabled, generated a PRD and separate sample-data HTML mockup from a synthetic reading-list idea and saved answer. A requested change to use “My next book” updated both artifacts. The browser showed the revised pair after reload. The actual generated mockup's book-selection and back-to-list controls were exercised. Stopping and restarting the Node server preserved the entire preparation state and both recorded artifact digests, without another model call.

- Initial pair: [PRD](evidence/live-initial-prd.md), [mockup](evidence/live-initial-mockup.html), [state](evidence/live-initial-state.json), [screenshot](evidence/initial-drafts.png).
- Revised pair: [PRD](evidence/live-revised-prd.md), [mockup](evidence/live-revised-mockup.html), [state](evidence/live-revised-state.json), [screenshot](evidence/revised-drafts.png).
- Click-through: [real generated details screen](evidence/real-mockup-details.png).
- Exact-content packet: [JSON](evidence/live-review-packet.json). All four gate reviews remain explicitly not performed.
- Real process restart: [result](evidence/restart-result.json).

These outputs are synthetic demonstration artifacts, not approved requirements for a new application. A sample value or optional question in model prose does not become user authority.

## Repeatable checks

- `npm test`: 49 passing workflow/API/CLI/provider/Orca tests, zero failures or skips. Includes saved revisions, duplicate/stale refusal, provider failure, restart and timeout reconciliation, changed artifact refusal, absence of authority endpoints, concurrent-create refusal and explicit recovery into a separate preparation. CLI tests spawn the actual executable for browser/CLI continuation, invalid requests, persisted provider preferences and nonzero partial-launch reporting. Planning tests cover selection, source invalidation, complete coverage, eval references, dependency/parallel conflicts, independent findings and recovery; fake-provider process tests verify restricted transport and timeout classification. Orca tests cover exact targets, launch/settings receipts, uncertain outcomes, explicit provider switching, no shell fallback and notification loop prevention. These use explicit fixture providers/transports, not live Claude or Codex host sessions.
- `npm run test:browser`: three passing actual HTTP/UI journeys: intake through revised drafts and reload; technical preferences through local selection, eval/story plan, separate review, draft handoff and upstream invalidation; and timeout-to-separate-preparation recovery. Explicit fixture providers; these checks do not claim model quality.
- `npm run build`: TypeScript compilation passes.

The first sandboxed HTTP run could not bind localhost (`EPERM`); the same checks passed with permission to bind loopback. One initial test used Node fetch to spoof Host, which fetch normalized; the test was corrected to send the actual hostile header using node:http and then confirmed refusal. The first real-mockup probe used an ambiguous author locator matching the hidden list and visible details; scoping the assertion to details confirmed the journey without changing the mockup.

## What this does not establish

No independent gate review has been performed on the generated product contract. Model-output meaning and scope still require judgment. Implementation and planning reviews are separate from the required gate-role reviews. Technical-spec/eval/story preparation is now present; executable acceptance authoring/runs, a trusted approval channel, builder dispatch, managed setup, multi-user hosting and generic project onboarding remain absent. No factory records, comparison inputs, workflows, locks, protection settings or live calendar data changed.

Unknown interrupted model outcomes remain unresolved unless matching durable result evidence can be reconciled. The UI now offers a separate preparation explicitly, retaining the old files without silently retrying the old task. This is not a general recovery engine or exactly-once provider execution.

Claude independently reviewed the business journey and reproduced two defects. Both are fixed with focused regression evidence above; the six optional improvements are deferred. See [review dispositions](REVIEW-DISPOSITIONS.md). No second general review or new design mechanism was added.

## CLI/browser handoff addition

The updated service was restarted after confirming its current task was completed. The user's saved preparation remained at revision 6 in review, with both PRD and mockup digests unchanged. Running the actual `node dist/src/cli.js open` on macOS returned successfully from the OS browser launcher for http://127.0.0.1:4317. This proves launch was requested, not that a person viewed or approved the documents. The existing two browser journeys passed again. The portable host skill passed `quick_validate.py`; no global Claude/Codex settings were changed and no live Codex-provider or host-skill dispatch is claimed.

## Prebuild planning demonstration

`RUN_LIVE_PLANNING=1 node test/live-planning.mjs` used a synthetic fixture PRD/mockup, a scripted local technical choice, and **three real restricted Claude calls**: technical author, plan author, independent planning reviewer. It produced a blueprint, linked evals and ordered stories, and a draft-only handoff. The reviewer reported two advisory findings and no blocking findings. Both advisories remain in the evidence; they were not converted into another design round or marked resolved. This is review evidence, not proof that all product requirements were extracted correctly.

Artifacts are in [evidence/prebuild-live](evidence/prebuild-live/): source PRD/mockup, technical.md, build-plan.md, the three saved states, handoff.json and result.json. State survived re-instantiating the service unchanged. `dispatchReady` remains false and the handoff names remaining authoring/execution/authority blockers. This scenario does not mutate the user's to-do preparation or authorize factory execution. The fixture browser screenshot is [prebuild-browser-fixture.png](evidence/prebuild-browser-fixture.png); its contents are explicitly synthetic, distinct from these real-provider artifacts.

A separate Sol read-only integration review found no blocking issue. One optional improvement was deferred: a browser's unsent stack-preference text is retained when a CLI session updates preferences on the same preparation. The saved state is authoritative; stale mutations still refuse. Review was code inspection, not a second independent execution run. Root inspection found a provider-owned timeout could be labeled retryable if it expired before the workflow timer; that concrete failure was fixed and permanently tested as `DRAFT_TIMEOUT`/interrupted.

The Orca walkthrough is illustrative HTML, not a live Orca plugin. Its author exercised all six stages, product preview, local stack choice, eval tabs, keyboard navigation and blocked dispatch in Chromium; inspected desktop/mobile screenshots; reported no JavaScript errors, external requests or mobile overflow. No factory approval is created by its controls.

## Orca connection and provider preferences

The browser and CLI save Claude (`claude-opus-5-5`, medium) and Codex (`gpt-6.1-sol`, high) presets independently, with Claude preferred initially. Starting a native chat is explicit and sends no initial prompt. Setting acknowledgments establish the requested configuration, not the provider's active model before a turn. Existing chats are never silently reconfigured. All three browser journeys pass with added preference reload, explicit fixture-native creation, no-message-on-start, detach/pair and saved-answer notification checks. [Connection screenshot](evidence/orca-connection-fixture.png) uses fixture data. One new assertion initially failed on capitalization; it was corrected to match the actual sentence, without changing behavior.

Installed Orca 1.4.224 support and API shapes were inspected read-only. One real new Claude chat was created. The first attempt stopped unpaired because our check wrongly required exact provider-model confirmation before the first turn; Orca returned the idle alias `opus` and confirmed effort only. The implementation was corrected to distinguish exact accepted setting requests from pending provider confirmation, with regression coverage. The same test chat was explicitly inspected and paired; no second chat or option mutation was needed. A native mailbox message was durably enqueued, woke the agent and was read/reported. Its successful turn metadata reported `claude-opus-5-5`. The agent did not return the exact requested acknowledgment or acknowledge the mailbox: it treated the status message as agent-origin information, not user authority. It used three read-only mailbox/help commands to retrieve that information, so this is not evidence of a no-tools turn. See [live result](evidence/orca-native-live.json). No model reasoning is saved there.

This demonstrates native delivery, wakeup and reading, not automatic product continuation, factory authorization, live Codex delivery or a fully automatic create-to-continuation journey. Existing PTY notification stays disabled because it lacks the necessary agent/shell distinction. The bridge uses the installed macOS runtime client; compatibility with other Orca versions and installations is unproven.

The real preparation service was restarted only while idle. Its revision 6 and both artifact digests remained unchanged, and no session was paired to the user's preparation. `orca-open` successfully created workspace browser page `e5209e15-e73f-4d19-8592-12acedf0b2cc` at the same local address. The standalone test chat remains separate. [ORCA-INTEGRATION.md](ORCA-INTEGRATION.md) describes the connection and boundaries.
