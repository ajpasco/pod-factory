# Overnight handoff — 2026-10-19 UTC

## User trial entry point

**Eval refresh follow-up (2026-10-20):** user changed PRD and encountered missing story/eval links. Inputs matched the current PRD (artifact revision 14); no stale eval reuse. Generator instructions and specific diagnostics corrected; explicit retries carry validation feedback for the same source hashes. 112 unit tests pass, including completed-plan invalidation/regeneration after PRD change. One supported CLI regeneration completed at preparation revision 46: 17 requirements, 13 evals, 5 stories, full structural linkage, five advisory findings remain. Service 4320 detached PID 20974; current artifacts unchanged except new plan. Next: review plan and advisories. No builder or approval. [Evidence](evidence/eval-refresh/README.md).

**Interview/progress fix:** the equipment blueprint completed in ~65 seconds. Running status now appears inside the relevant panel. The production provider supports a short adaptive requirements interview; it is active at revision 8 awaiting the identity-method answer, with existing artifact hashes unchanged. Service on 4320 uses the same data (exec session 7718). Refresh the page to see step 2. 111 unit tests, four browser journeys and 11 theme checks pass. [Evidence](evidence/interview-progress/README.md). No build or approval.

**Chat visibility follow-up:** both provider launch paths now explicitly reveal their native chat. The Session drawer offers **Open connected chat**; CLI `orca-reveal` reopens the same session. Live reveal on 4320 succeeded for the existing Equipment Checkout Codex chat; 106 unit tests and three browser journeys passed. No prompt sent.

**Updated after the user's sidebar request:** Equipment Checkout now has a real Orca worktree at `<home>/orca/workspaces/orca-software-factory/Equipment-Checkout`, branch `ajpasco/Equipment-Checkout`, with native Codex chat `codex_7db3e601_d67d_4dc7_bfea_ac0e4edaea81`. The earlier scad chat is preserved and disconnected from this preparation. Service 4320 was restarted on the same data, preparation still revision 1, no task. The page is open in the new workspace. [Implementation and live evidence](evidence/orca-workspace/README.md). Next user action: answer the scope question on 4320; its live cross-workspace notification/response still needs checking.

**Initial setup (before the update above):** The equipment preparation was started separately at `http://127.0.0.1:4320`, using `.preparation/equipment-workspace/`. Preparation `prep-6d5b5ff8b0fc9079f93b50d7`, revision 1, contains the equipment idea and awaits the user's primary-journey answer. Orca confirmed opening its workspace browser tab. At that checkpoint the instance had no paired owner or notification receipts; start/delivery capability is reported available, but the live browser-to-owner loop remains to be tested after explicit session selection. The older to-do preparation on 4317 is preserved. The existing service refused a second project there with HTTP 409; no pointer or saved answers were overwritten. No model task, factory approval or builder was started.

## Parallel work completed after this checkpoint

- **Maintenance transition candidate built and reviewed:** extends existing amendments with explicit exact-PR/tree maintenance authority. Sol's full CLI suite passed 204 tests; the parent independently applied/hash-checked the patch and passed all 23 new regressions. Two review fixes preserve old amendment behavior and safe duplicate refusal. [Parent review](integration/maintenance-transition/PARENT-REVIEW.md). The patch remains isolated: current main cannot authorize its own replacement, and no transition was executed.
- **On-demand Claude/Codex handoff integrated locally:** standalone Orca helper, no watcher or daemon. Sol's full suite passed 98 tests; parent build and all 32 targeted tests passed. Existing UI/server/provider/factory files are unchanged. [Usage](SESSION-HANDOFF.md), [parent review](integration/session-handoff/PARENT-REVIEW.md). Supports the inspected local Orca 1.4.224. A selected live sender/recipient pair and harmless round trip remain untested; no live message was sent.
- Next factory decision is adoption of the concrete candidate through a reviewed legal transition, followed by the equipment application's actual protected harness and plan. No speculative approval commands are requested. The app remains unbuilt and unauthorized; the live preparation and port 4317 service remain untouched.

## Earlier checkpoint (retained for context)

The read-only factory connection is integrated and running on port 4317. The equipment app has not been built or authorized. Claude's UI and the saved preparation are unchanged.

## Completed

- Sol corrected both demonstrated false-ready cases, added regression coverage, and made repository/harness configuration explicit.
- Codex reviewed/applied the nine-file patch and independently ran 66 backend tests, three browser journeys and seven connection checks: all passed. The factory/app boundary remains BLOCKED/NOT RUN. [Integration evidence](integration/sol-review/INTEGRATED.md).
- The current service offers CLI `factory` diagnostics and `factory-package` draft export. It labels cached observations as non-authoritative and refuses real dispatch. No existing meeting-reminder approval is treated as equipment authorization.
- A second Sol agent authored and ran the isolated equipment **preparation** QA harness. Full-case results: 14 PASS, zero FAIL, five BLOCKED, 31 NOT RUN. Partial observations stay separate from completed cases. [Results](../docs/projects/equipment-checkout/qa/evidence/preparation/RESULTS.md). This harness tests the orchestration; it is not the equipment application's acceptance suite.
- A fresh isolated read of GitHub main and records confirmed the onboarding issue below. The new records only added a PR 24 verify result; approved scopes and lock did not change. [Mechanics evidence](integration/sol-review/EQUIPMENT-NEXT-STEP.md).

## The next actual dependency

The factory's current rules cannot admit the new equipment plan, test policy and harness through an ordinary PR: only the existing stories can authorize merges, and none may change those paths. A locked-path amendment is not merge authorization. Reapproving a plan does not get that plan onto main.

The next product work is a supported maintenance/plan transition, before equipment onboarding. It needs a concrete bounded design and reviewed implementation; it cannot be smuggled in as a UI or adapter change. Adopting that change under today's rules will require a separately reviewed human-authorized transition. No lock revocation or approval command is requested now, and no transition window was opened.

After that route exists: review the equipment PRD/mockup/blueprint, author and independently review the executable application tests/runner, protect those exact inputs and approve its bounded plan, then connect and demonstrate one actual builder run. The current preparation and QA fixtures do not replace any of those steps.

## Limits and deferred work

No real records, locks, protection settings, approvals, merges, deployments or builder launches changed. No PostgreSQL or equipment application was constructed. No paid model or live Orca calls were used for these checks. Optional UI polish, generalized onboarding, automatic merging and cross-session messaging implementation were not added.

Work is local and uncommitted. The presentation manifest remains historical; this backend integration's intentional CLI/server differences are tracked by its separate manifest. The collaboration-options document is [SESSION-COMMUNICATION-OPTIONS.md](SESSION-COMMUNICATION-OPTIONS.md).
