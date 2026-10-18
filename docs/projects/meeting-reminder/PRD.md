# Meeting modal browser trial PRD

Version 0.6 · Active trial scope · No factory approval record created

## 1. Purpose and authority

Let Jay test a small, complete UI built through pod-factory: Claude reads upcoming items from the Google Calendar named **Meetings** through its configured MCP connection; the local TypeScript page lists that snapshot; clicking an item opens its details in a modal.

Authority: Jay explicitly reduced the first test to that interaction and selected TypeScript/browser instead of Xcode on 2026-10-17. Jay subsequently confirmed the MCP connection is configured for Claude and explicitly selected the calendar named **Meetings**. This authorizes the agent-assisted snapshot demo, not autonomous calendar synchronization. This PRD and [TECH-SPEC.md](TECH-SPEC.md) cover the same trial. The larger Google Calendar/Mac reminder idea is preserved in [FUTURE-REMINDER-PRD.md](FUTURE-REMINDER-PRD.md); it is not additional scope for this builder.

## 2. User flow and requirements

For this trial, the snapshot covers events starting in the next seven days and displays the queried window. The page identifies the source as **Meetings** and shows when Claude fetched the snapshot. Each listed event shows its title and time. Clicking an item opens its title, start/end and calendar name in a modal with Close. The modal is initially hidden. Close returns to the list; nothing reopens automatically. Dates/times include the displayed timezone. There is no calendar selector or in-page Google sign-in.

| Requirement | Observable acceptance | Authority | Eval |
| --- | --- | --- | --- |
| TR-01 Open | Clicking a listed item opens exactly one visible modal with that item’s title, start/end, calendar name and Close button. No modal is visible initially. | Accepted MCP snapshot demo and modal interaction. | MOD-01 |
| TR-02 Close | Close hides the modal without navigating away or scheduling another appearance. The meeting list remains usable. | Explicit closing behavior. | MOD-02, MOD-05, RST-03 |
| TR-03 Reopen | Clicking an item again opens it once; clicking a different item shows that item’s details. | Explicit manually repeatable test. | MOD-03 |
| TR-04 Accessible interaction | Controls/dialog have meaningful names and visible focus. Keyboard operation opens/closes the modal, keeps focus inside while open and returns it to the originating item on closing. | Necessary usability dependency of the approved interaction and agreed blueprint rules. | MOD-04, MOD-06 |
| TR-05 Small, bounded build | One browser UI with a Claude-supplied, read-only snapshot; automated tests use synthetic content; implementation follows the agreed simple architecture and adds no extra product behavior. | Explicit simplification and TypeScript/browser choice. | MOD-05, RST-02, RST-03, RST-04 |
| TR-06 Working delivery | Typecheck/build and all required browser tests pass. Jay can open the local URL and try the actual built page; evidence names its revision. | Requested usable trial and pod-factory verification process. | MOD-06 |
| TR-07 Calendar source | Claude resolves the exact calendar name **Meetings** to its ID and reads only that calendar. Missing or ambiguous matches require clarification; never fall back to Primary or merge other calendars. Show source and fetched time; distinguish an empty result from unavailable data. | Jay’s configured MCP connection and explicit calendar choice. | CAL-01, CAL-02, CAL-03, RST-01 |

## 3. Scope boundary

In scope: one local TypeScript browser page, a read-only calendar snapshot supplied by Claude via MCP, and the build/test tooling required to verify it. The technical spec defines the small code structure and exact commands.

Out of scope: in-app Google authentication or direct MCP access, automatic calendar refresh, calendar writes, meeting timers, sounds, automatic reminders, Join/Skip controls, settings, application-managed persistent storage, accounts, analytics, native Mac interruption, desktop packaging and deployment. Xcode, an Apple developer account, Docker and `.env` are not required for this trial.

The previous full reminder mockup is historical design context, not the visual or feature acceptance baseline for this page. No reproduction of its setup, calendar or settings screens is required. Keep this modal legible and usable; do not add a new design system.

The app does not inherit Claude’s credentials or independently fetch events. Real meeting data stays local and out of Git, committed fixtures and shared CI evidence. A new snapshot requires Claude to read the calendar again; no reminder scheduling is implied.

## 4. Acceptance and process

[EVAL-PLAN.md](EVAL-PLAN.md) defines correctness checks (MOD/CAL behavior and data) and restraint checks (RST authority, access, feature and contract boundaries). Both dimensions must pass; success in one cannot compensate for failure in the other. Live MCP provenance is verified separately from synthetic browser tests. The spec/eval author prepares the baseline and tests; an independent reviewer checks them; the builder implements the single story within the approved scope. Tests and their runner must use the real supported factory protection/approval path before dispatch.

The application is accepted for this trial when every required eval has passing evidence, no blocking finding remains, and Jay can try the built page. Claim that pod-factory governed the build only if its actual authorization, protection and verification path was exercised. [FACTORY-READINESS.md](FACTORY-READINESS.md) records the remaining integration boundary.

What changed: added Claude-assisted read-only access to the exact Meetings calendar and replaced the sample button with snapshot items.
What was checked: every requirement maps to the current tech-spec behavior and eval IDs.
What remains uncertain: browser harness execution and factory binding. Jay confirmed that Claude successfully read Meetings through MCP; this is user-reported verification, not a tool run in this workspace.
What approval authorizes: this draft records Jay's scope/stack choices; it does not manufacture factory approval or dispatch records.
