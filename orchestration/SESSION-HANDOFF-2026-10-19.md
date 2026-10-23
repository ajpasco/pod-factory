# Session handoff — Equipment Checkout preparation

Updated: 19 October 2026, America/New_York (20 October UTC).

## Current outcome

The Equipment Checkout preparation is **planning-complete at revision 62**. Claude generated the plan, corrected its defects, and performed a separate review invocation. That final review has **zero blocking findings and four advisories**. Codex implemented and tested the orchestration fixes that made this correction flow work. No Sol subagents were started for these latest fixes.

This is a completed preparation review, **not a built application, executed application eval suite, production-readiness certification, factory approval, or builder dispatch**. The service still labels its handoff draft-only. Native/CLI session access is only partially resolved.

The latest user request is this handoff. Preserve the working plan; do not start another design or correction loop merely to eliminate advisories.

## Where to resume

- Workspace: `<home>/orca/workspaces/orca-software-factory/scad`.
- Implementation: `orchestration/`.
- Equipment preparation: <http://127.0.0.1:4320>.
- Preparation ID: `prep-6d5b5ff8b0fc9079f93b50d7`.
- State directory: `orchestration/.preparation/equipment-workspace/`.
- Server process/log: `server.pid` and `server.log` in that directory. Read the PID and verify its command before stopping it. It runs detached as `node dist/src/server.js`; do not restart during a task or correction cycle.
- Named Orca worktree: `<home>/orca/workspaces/orca-software-factory/Equipment-Checkout`.
- The older service on port 4317 is separate; leave it alone.
- Changes are local and uncommitted. Much of orchestration is untracked. Do not use reset/clean or assume a clean tracked diff means there is no work.
- Existing [SESSION-HANDOFF.md](SESSION-HANDOFF.md) documents the messaging utility, not this session. It was intentionally preserved.

Read [live-result.json](evidence/planning-correction/live-result.json) for exact task, artifact paths, hashes, final findings and remaining factory blockers. It is a snapshot: inspect current state before any mutation.

```sh
cd <home>/orca/workspaces/orca-software-factory/scad/orchestration
node dist/src/cli.js status --url http://127.0.0.1:4320
node dist/src/cli.js orca-status --url http://127.0.0.1:4320
node dist/src/cli.js orca-targets --url http://127.0.0.1:4320
```

## Business flow and boundaries

Jay wants PRD interview → PRD and mockup → selected technical blueprint → linked evals and ordered/parallel stories → planning review → factory build. The model should correct concrete defects in its own plan, while product choices, scope changes and blueprint changes remain explicit user decisions. Keep code and process simple. Do not turn optional suggestions into blockers, add scope to satisfy a test, weaken tests, manufacture approvals, or substitute a local build while claiming factory execution.

The PRD has substantial user revisions: it is no longer the initial generic equipment description. Use the saved current PRD and mockup, not old prompts. The selected blueprint is also authoritative for this preparation until explicitly changed.

## What we did and what went wrong

| Area | What went wrong | Change and actual status |
| --- | --- | --- |
| Orca workspace | Preparation was not clearly represented as a named project with an accessible agent session. | Added named Equipment Checkout worktree and native session creation/reveal. Exact identities are saved; no builder or setup hook is started. Later navigation observations show reveal acknowledgments alone do not establish visibility. |
| PRD interview | Drafting could proceed without the expected interview. | Added adaptive interview, one material question at a time, saved answers and an explicit continue-to-drafts step. Existing drafts can be reviewed; new answers invalidate downstream artifacts. |
| Blueprint progress | Clicking Prepare blueprint appeared to do nothing during a long model call. | Added visible running/completed/failed progress and elapsed time. A real blueprint invocation completed. |
| Save availability | The local preparation server had died, making Save appear broken. | Restored it as a detached process. No answer was invented or submitted on the user's behalf. This is not an OS-managed startup service. |
| Evals after PRD edits | Generated stories did not link an eval for every requirement they claimed. The input was current; this was invalid generation, not reuse of a stale PRD. | Kept strict structural validation, improved diagnostics and generation instructions, and fed same-source failures into explicit retries. Upstream edits already invalidate planning artifacts. Live regeneration produced a valid plan at revision 46. |
| Review blockers | Review could flag fixable defects and leave Jay to coordinate the fix manually. | Added bounded automatic plan correction and independent re-review. See the two real cycles below. |
| Provider selection | Choosing a provider preference was confused with switching the connected session or generation engine. | Preferences, notification pairing and the document-generation provider are different controls today. Existing sessions are not replaced automatically. This remains a UX gap, not a completed provider-switch feature. |
| CLI access | The native session could own a conversation while its terminal showed a lock; terminal discovery used the original service workspace. | Added opening an explicitly selected existing session separately from pairing, and scoped discovery to the named project. Native ownership transfer is not implemented. Live navigation remains uncertain as described below. |

## Planning correction implementation

Relevant files: `src/workflow.ts`, `src/types.ts`, `src/store.ts`, `src/planning.ts`, `src/claude-planning-provider.ts`, `public/app.js`, `public/index.html`, `test/planning.test.ts`, `test/browser-flow.mjs`.

Every review finding can classify its resolution as:

- `plan-correction`: ownership, sequencing, procedures or traceability can be corrected inside the current contract.
- `user-decision`: a material product choice or preference conflict needs the user.
- `blueprint-change`: the selected blueprint itself needs revision.

Each review operation permits at most one automatic plan-only correction, followed by a separate review invocation. All unresolved blocking findings must qualify. Mixed, legacy or unclassified blockers do not grant correction authority. Failure, interruption or persistent blockers stop the cycle. No scope, PRD, mockup or selected blueprint is silently changed. The saved correction marker keeps polling active between tasks, prevents competing mutations, and exposes interruption. A later explicit review starts a fresh marker; a regression caught and fixed reuse of a prior stopped marker.

### Real cycle 1: revisions 48–55

The original blockers were evals owned by S3 that required later-story files, and combined verification scheduled before S5 supplied Compose and browser tests. The plan author corrected those. The separate reviewer then found that S1/S2 API tests needed real PostgreSQL, while database provisioning belonged to S5. The cycle stopped at its limit. It did not mark the remaining issue resolved.

Jay explicitly answered **“Fix test-database ordering and re-review.”**

### Real cycle 2: revisions 55–62

One further bounded cycle ran under that authorization. It supplied early test-database provisioning and corrected other concrete sequencing/ownership inconsistencies identified by the new review. The final review returned no blockers. The PRD, mockup and selected blueprint hashes remain unchanged. The generated build plan and its proposed eval procedures changed; no application tests were executed.

Final advisories, retained rather than triggering another loop:

1. Missing/malformed/unknown `X-User-Id` behavior and its API test are not explicit.
2. Test Postgres credentials, `.env` wiring and database-fixture scope need care so config-only tests do not require a database.
3. Concurrent delete/borrow and return/delete behavior deserves conditional writes and a concrete API case.
4. S5 traceability and execution details need clarification: forced 403/failure responses, browser installation and service health definitions.

These are model review findings, not demonstrated runtime defects. Review their concrete impact before builder handoff; do not promote preferences into new product requirements. Seeded identity is still a trial convention, not production authentication.

## Codex lock and Claude/CLI access

Observed directly in the existing Codex terminal:

> This conversation is open in another app. Close it there and press R to continue here.

Orca reports the paired Codex native conversation as `owner: native`, `phase: idle`. These observations are consistent with the native chat holding the conversation while the CLI is read-only. We did not terminate a process, delete a lock, close the native conversation, force ownership, or fork it. A fork would create a different conversation, not transfer the existing one.

Observed session identities (refresh before use):

| Session | Exact handle |
| --- | --- |
| Paired Codex native chat | `codex_7db3e601_d67d_4dc7_bfea_ac0e4edaea81` |
| Existing Codex CLI, displaying lock | `term_b9740593-9507-4e80-b941-06f6a49b4702` |
| Existing Claude CLI | `term_66074fbf-2e95-402e-aabd-31aa6aee8964` |

The service's saved notification owner remains Codex native. Its last inspected saved preference also remained Codex. The generation provider is Claude CLI/Sonnet; changing the notification-owner preference does not change the generation provider. The new UI must not imply otherwise.

New controls:

- Browser: session panel → Find sessions in this workspace → choose chat/CLI → Open selected session.
- CLI: `node dist/src/cli.js orca-reveal --terminal HANDLE --url http://127.0.0.1:4320`.

Opening sends no prompt, launches no agent and changes no pairing. It validates the exact runtime, workspace, provider, PTY and incarnation. Notification delivery to a terminal remains unsupported by this adapter; opening it is distinct from enabling automatic wake-up.

### Unresolved navigation discrepancy

`terminal.focus` returned `ok: true`, the correct handle/worktree and `navigated: true` for Claude. However, immediate `session.tabs.list` still reported Codex native as the active tab and the Claude terminal as inactive. Explicit `session.tabs.activate` showed the same discrepancy. Earlier statements that the CLI was opened relied on the acknowledgment and were too strong.

The implementation now reads back active-tab state and reports uncertainty when visibility is not confirmed, rather than returning success. Unit coverage includes this exact mismatch. This does not solve Orca's navigation/ownership behavior; it reports it honestly. Next step: one bounded investigation of the existing Orca UI/runtime activation path, not another session launcher or ownership system. Do not fight user focus, create duplicate sessions, or close the notification owner implicitly.

## Verification and evidence

- Latest unit suite: **117 passed, 0 failed**. Includes bounded correction, user/blueprint/unknown refusal, provider failure, explicit subsequent review, selected terminal identity and navigation mismatch.
- Browser suite: **3 journeys passed**. Includes a fixture review/correction/re-review and opening an existing CLI without changing pairing, sending prompts or launching another agent.
- Theme review: **11 passed**.
- Live planning: two bounded cycles, second explicitly authorized; final revision 62, planning-complete, four advisories, no blockers.
- Real CLI discovery: finds both existing terminals and the native chat in Equipment Checkout.
- Real terminal visibility: **not confirmed**, despite successful navigation acknowledgments.

Evidence: [planning-correction](evidence/planning-correction/README.md), [live result](evidence/planning-correction/live-result.json), [file hashes](evidence/planning-correction/manifest.json), [eval refresh](evidence/eval-refresh/README.md), [interview/progress](evidence/interview-progress/README.md), [Orca workspace](evidence/orca-workspace/README.md).

## Open issues and next steps, in order

1. **Resume from the completed planning result.** Refresh 4320 and confirm revision 62 or a later user change. Do not rerun review just because this handoff exists.
2. **Resolve user interaction with the existing agent.** Native/CLI ownership must be explicit; provider preference, generation provider and notification owner should not look like a single switch. Existing Claude CLI exists. Navigation acknowledgment/visibility mismatch and Codex ownership remain open.
3. **Review the four advisories before builder dispatch.** Resolve material contract/execution ambiguity in a bounded pass if needed; do not expand the product.
4. **Factory boundary is still open.** The handoff remains draft-only, with protected acceptance-test authoring, trusted approval/locking and supported dispatch still required. Read the live handoff/blockers and existing factory integration work before choosing the smallest supported route. Do not equate planning-complete with dispatchReady.
5. **Service lifecycle and local changes.** The service can still die or stop on reboot. Source and evidence remain local/uncommitted; preserve them. No automatic publishing or merging has been authorized by this session.

No factory approval, lock, record, branch protection or builder execution was changed by these fixes. No plan advisory is permission to build additional scope.
