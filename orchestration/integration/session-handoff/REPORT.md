# Bounded session handoff candidate

Ready for parent review, not integrated. The disposable export is `/var/folders/x2/dxxzn0054dbcd2qzhxjwz_hc0000gn/T/session-handoff-63g7kfik/orchestration`. Shared writes are confined to `orchestration/integration/session-handoff/**`; the patch adds only `orchestration/src/session-handoff.ts`, `orchestration/test/session-handoff.test.ts` and `orchestration/SESSION-HANDOFF.md`. Existing source, tests, public assets (including fonts), package files, provider adapters, factory records and runtime configuration were not edited. BASELINE.json records all 43 copied inputs; BASELINE-VERIFICATION.json confirms none changed in the export.

The CLI is `node dist/src/session-handoff.js list --workspace /absolute/workspace` or `send --request /absolute/request.json --receipts /absolute/retained-receipts`. `list` is read-only; `send` requires an explicitly addressed, user-authorized action and a full exact recipient plus sender return address in the request. No live recipient or send request was selected.

## Chosen transport and limits

Uses the installed authenticated local Orca RuntimeClient with two guarded `terminal.send` RPC calls: text only, then Enter only. Both use `requireAgentStatus: sendable`, `requireWriteSettlement: true` and desktop client provenance. A complete runtime/handle/PTY/incarnation/workspace/local-host/provider verification occurs immediately before each guarded write; bounded idle checks precede text and Enter. Installed 1.4.224 app.asar source corroborates the current clone: guarded text-plus-Enter is deliberately refused. The unguarded CLI draft was replaced in the export and is absent from the final patch.

Only source-verified local runtime version **1.4.224** is enabled; missing/different versions fail closed. No remote, native-chat, mailbox, new owner, unguarded send, interrupt, clear-draft, retry or lifecycle fallback exists. In particular, native session inventory/restoration was not added.

Receipts record text and submit separately as not-attempted/accepted/refused/uncertain. Submitted means matching write-settlement acceptance of text and Enter, not a provider turn. Partial means text accepted and Enter not proven accepted. Turn start, read/reply and completion remain unknown, and humanApproval is always false. Two phases are not atomic; host guards verify sendability and PTY binding, not an expected provider field. A partial draft may remain. No clearing, Escape, replay or replacement follows a failed/uncertain second phase.

An exclusive per-message record is synced before effects and updated before both writes. Same ID/content reads existing evidence; ID/content conflict refuses. This provides local duplicate suppression within the retained receipt directory, not host idempotency or exactly-once delivery. There is no durable prompt request/turn-start receipt on this guarded two-phase path. Existing uncertain/partial/refused attempts do not resend; independent reconciliation is required before any fresh addressed action. Deleting/changing receipt directories or IDs defeats local suppression and is documented.

## Evidence

- `npm run build`: passed in disposable export.
- `node --test dist/test/session-handoff.test.js`: **32/32 passed**, labeled fake executor only; `handoff-tests.txt`.
- `node --test dist/test/*.test.js`: **98/98 passed** with approved loopback access; `full-tests-approved.txt`. Initial sandbox run had 13 HTTP listen EPERM failures; retained as `full-tests.txt` and superseded by the approved run.
- `git apply --check orchestration/integration/session-handoff/session-handoff.patch`: passed against current shared tree.
- Real read-only installed CLI list/show/1000ms tui-idle wait succeeded with normal approved local IPC access. Actual wrapper RuntimeClient list/status also succeeded; runtime IDs matched and appVersion was 1.4.224. No `terminal.send` CLI or RPC was invoked against Orca. `READONLY-EVIDENCE.json` records source hashes and observations.
- Tests cover absent/guessed/wrong/nonlocal/changed recipients, busy/closed/unreachable sessions, control characters, byte limit, exit/permission/incarnation/busy transitions after text, missing/refused/unverifiable settlements, runtime/version mismatch, persisted fences before each write, corrupt receipts, concurrent duplicate attempts, message ID/return-address propagation and no false approval/completion.

**Genuine addressed round trip: NOT RUN until the user explicitly chooses the target/action.** No live send occurred during development.

## Hashes

Patch SHA-256: `bf711d2b4c3494a177e52c329c4317bae515622dcf58e9edc4e02dd783fdb4be`. Source and compiled output hashes are also machine-readable in CHANGE-MANIFEST.json.

- `orchestration/src/session-handoff.ts`: `1cd19c4cc6aae614839bf760331f40d0768b3daa696f428ddb8b058e77264a9d`
- `orchestration/test/session-handoff.test.ts`: `4f93d4060693c3ecafae36f848ea426e4deaeca4bed1e323106bb68456d5ff39`
- `orchestration/SESSION-HANDOFF.md`: `d30a78f9b5df0428c77e3fd4f0d9d0de63545ce62980e409598de0beff521762`
- `/var/folders/x2/dxxzn0054dbcd2qzhxjwz_hc0000gn/T/session-handoff-63g7kfik/orchestration/dist/src/session-handoff.js`: `3a6d51b16c0a987168c0356a267fccebd7fb639fac8d87c8712b16b7fcedc18f`
- `/var/folders/x2/dxxzn0054dbcd2qzhxjwz_hc0000gn/T/session-handoff-63g7kfik/orchestration/dist/test/session-handoff.test.js`: `7366cea661e6b40b7bc7c222b6dc542876e4401395cd92bd9a0462ec037207d3`
