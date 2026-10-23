# On-demand session handoff

`src/session-handoff.ts` sends one explicitly addressed agent message through the installed Orca local RuntimeClient. It adds no daemon, watcher, mailbox, session owner, provider adapter or factory action. Inventory is read-only. Execute `send` only for a user-authorized action addressed to the selected exact recipient; listing sessions does not authorize a send. No live recipient is preselected.

Build and list from this directory:

```sh
npm run build
node dist/src/session-handoff.js list --workspace /absolute/workspace
```

Choose the intended recipient and sender return address from fresh inventory. Use a bounded `orca terminal read --terminal <exact-handle> --screen --limit 2000 --json` inspection when needed to confirm the session, without sending input. Titles, focus and previews are not recipient selectors. Preserve every returned identity field; a replacement session requires a new explicit choice. This wrapper supports local Codex/Claude PTYs only.

Prepare a JSON request with this shape. The placeholder strings below deliberately do not identify a live session:

```json
{
  "schemaVersion": 1,
  "messageId": "handoff-unique-message-id",
  "from": "codex",
  "recipient": {
    "runtimeId": "from-fresh-inventory",
    "handle": "term_from-fresh-inventory",
    "ptyId": "from-fresh-inventory",
    "incarnationId": "from-fresh-inventory",
    "worktreeId": "from-fresh-inventory",
    "worktreePath": "/absolute/workspace",
    "executionHostId": "local",
    "agentIdentity": "claude"
  },
  "returnAddress": {
    "runtimeId": "from-fresh-inventory",
    "handle": "term_sender-from-fresh-inventory",
    "ptyId": "from-fresh-inventory",
    "incarnationId": "from-fresh-inventory",
    "worktreeId": "from-fresh-inventory",
    "worktreePath": "/absolute/workspace",
    "executionHostId": "local",
    "agentIdentity": "codex"
  },
  "text": "One request, evidence paths and the expected reply."
}
```

Only after the particular addressed action is authorized:

```sh
node dist/src/session-handoff.js send --request /absolute/request.json --receipts /absolute/retained-handoff-receipts
```

The message is limited to 8,000 UTF-8 bytes. Newline/tab are allowed as message data; terminal controls are rejected. The wire envelope is one JSON line, labels agent origin, carries the message ID and exact return address, and requests one `received <id>` reply followed by `completed <id>` with evidence or `blocked <id>` with a reason. An addressed reply needs authorization for that action. Do not acknowledge acknowledgments. Long reports remain ordinary artifacts referenced by path.

## Transport and receipts

The installed Orca 1.4.224 CLI supports durable direct prompts, but does not expose the agent-send guard. The installed runtime's guarded RPC intentionally refuses text-plus-Enter in one call. This wrapper therefore uses two separate existing RPC calls:

```text
terminal.send { terminal: exactHandle, text: envelope,
  requireAgentStatus: "sendable", requireWriteSettlement: true,
  client: { id: "session-handoff", type: "desktop" } }
terminal.send { terminal: exactHandle, enter: true,
  requireAgentStatus: "sendable", requireWriteSettlement: true,
  client: { id: "session-handoff", type: "desktop" } }
```

Before writing text, and again before Enter, it verifies runtime, handle, PTY, incarnation, workspace, local host and provider, plus connected/writable/non-orphaned state and `agentWait: null`. A bounded idle observation precedes text and Enter. Each write then uses Orca's host guard, which rechecks the live agent, permission state and PTY binding before writing. The source-verified local runtime version is pinned to 1.4.224; a missing/different version refuses sends until reviewed. There is no unguarded or native-chat fallback.

The two phases are **not atomic**. Readiness/provider identity may change between the read and host guard; the guard verifies sendability and PTY binding, not a caller-supplied expected provider. A partial message can remain as draft input. This wrapper does not own or clear the composer. It never presses Escape, interrupts, recreates or substitutes a terminal.

Receipts distinguish each phase as `not-attempted`, `accepted`, `refused` or `uncertain`. `delivery: submitted` means only that Orca returned matching whole-write settlement acceptance for text and Enter. `partial` means text was accepted and Enter was not proven accepted. `uncertain` includes transport loss, malformed/mismatched responses or missing settlement proof. A host refusal without settlement proof is conservatively uncertain. Turn start, read, reply and completion are always **unknown**: two-phase writes do not supply Orca's durable prompt/turn-start receipt. Agent messages and all receipt states are evidence only, never human approval or factory authority.

The per-message receipt is exclusively created, synced before external writes and updated before each phase. Reusing the same ID with identical normalized content reads the receipt without contacting Orca; different content conflicts. Existing partial/uncertain/refused attempts never retry. Keep one receipt directory and retain records. This is local duplicate suppression, **not host idempotency or exactly-once delivery**. A new message ID, another receipt directory or deleting records can bypass local duplicate suppression. After uncertainty, inspect the exact session and reconcile before any new addressed action. The wrapper offers no resend/retry switch. Orca CLI `--retry-request` applies to its durable combined prompt route, not these guarded writes.

If local IPC is sandbox-blocked, use the normal permission process for the required command. Do not restart Orca or use permission-bypass flags.

## Validation status

Fake-executor tests cover addressed identity, readiness, missing/wrong recipients, closed/unreachable sessions, permission/agent/identity changes after text, refusal/ambiguous/missing settlement, runtime/version mismatch, persistence fences, concurrent duplicate attempts and unchanged approval/completion semantics. Real read-only CLI inventory/show/wait and wrapper RuntimeClient inventory/status were verified against installed 1.4.224.

A genuine addressed round trip is **NOT RUN**. No target has been selected by the user and no live input has been sent. Once a particular recipient/action is authorized, a single harmless unique-ID request and one addressed reply can be checked against receipt and observed reply evidence; then stop.
