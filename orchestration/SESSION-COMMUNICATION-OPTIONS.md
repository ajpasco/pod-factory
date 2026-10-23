# Five options for on-demand session communication

Research only, 2026-10-18. No bridge, watcher, plugin, session, or messaging configuration was created. No message was sent. This compares communication between the existing Codex and Claude sessions, not factory authority or builder orchestration.

**Recommendation:** use Orca's existing direct prompt delivery for occasional handoffs now (option 1). If durable conversations become necessary, use Orca's existing mailbox and structured-session delivery (option 2). A new transport service is unnecessary for the current two-session workflow.

## What is actually available

- **Verified live:** installed Orca 1.4.224 is running. Read-only `orca status --json` advertises `terminal.prompt-delivery.v1`, `orchestration.contract.v1`, federation, and structured-session capabilities. `terminal list --worktree current --json` found local Codex and Claude PTYs in this workspace. CLI help confirms `terminal send`, `orchestration send`, `check`, and `reply`.
- **Verified source, not exercised delivery:** direct prompts have request IDs, input-acceptance and turn-start receipts. Mail is persisted before nudging. Managed PTY mail waits for an observed idle condition; native chat mail uses the session's own send/queue path. Unattached or uncertain delivery retains mail. The local clone and installed runtime are distinct evidence: capability advertisement does not prove every source behavior was exercised.
- **Important limit:** the PTY mailbox push path accepts `run:` and `dispatch:` destinations. An ordinary terminal-only peer mailbox is warned as non-durable after that terminal closes and must not be assumed to wake an idle agent. Native structured sessions have a separate direct-mail delivery path. Run delivery acknowledgment semantics do not apply indiscriminately to direct mail.
- **Actual tool surface:** shell execution and Orca CLI are available; no tool in this session's available tool inventory directly addresses an arbitrary Claude conversation. The collaboration tools address this Codex agent tree, not unrelated Claude or Codex platform sessions. A child agent inherits its parent terminal environment; that is not an independent Orca inbox.
- **Access observed:** the sandbox initially blocked the local Orca connection with `runtime_access_denied`/`EPERM`; the explicitly read-only inventory succeeded under approved escalation. This is a connection-permission constraint, not evidence Orca was down. Do not restart Orca to fix it.

## Comparison

Sizes below are engineering estimates for a bounded local integration, not delivery promises. They exclude cross-host support and extensive product UI.

| Option | What starts a receiving turn | Transport and targeting | Idle or absent recipient | Approximate work / coupling | Disposition |
|---|---|---|---|---|---|
| **1. Direct Orca prompt** | An explicit sender command submits a prompt through the existing agent terminal | Authenticated Orca local RPC → exact runtime terminal handle → PTY input | Works for an open, ready agent. Busy behavior depends on its TUI; closed or unreachable targets are not recreated | No new service; a short procedure now, roughly half a day for a small wrapper | **Use now** |
| **2. Orca durable mailbox** | Existing runtime nudge submits a mailbox pointer, or completes a pending `check --wait` | Existing database plus Orca RPC; `run:`, `dispatch:`, or supported `orca_session_id:` address | Managed PTYs need verified idle state; structured chats queue while busy. Offline/unattached mail remains pending | Roughly 1–3 days to bind identities and surface receipts using existing code; coupled to Orca session ownership | **Preferred durable path** |
| **3. Cooperative rendezvous tool** | Completion of a `receive` tool call that the receiving agent already made | Proposed two-recipient local service with `send`, bounded `receive`, and `ack`; shell or MCP facade | A waiting tool resumes the current turn. A truly idle/closed session does nothing until invoked | Roughly 1–3 days; portable tool interface, but another service and client timeout rules | **Reject for the primary requirement** |
| **4. Native channel into Claude, explicit return to Codex** | Claude's channel notification; return leg uses option 1 into Codex | Proposed local channel server → Claude MCP extension; reply tool → exact Codex Orca handle | Can wake an open opted-in Claude session. Closed session does not receive; Codex return retains PTY limits | Roughly 2–4 days; asymmetric, Claude preview restrictions, still Orca-dependent on return | **Defer** |
| **5. Orchestrator owns both session runtimes** | The host explicitly starts a provider turn when a message is ready | Codex app-server RPC and Claude Agent SDK streaming input; provider session IDs owned by the host | Host can resume its persisted sessions and start turns. Does not automatically attach to arbitrary existing desktop chats | Roughly 1–2 weeks for a bounded reliable host; greatest provider/lifecycle coupling | **Defer unless session hosting becomes product scope** |

## 1. Direct Orca prompt: smallest workable step

Use the existing command, not keystroke automation:

```text
orca terminal send --terminal <verified-recipient-handle> --text '<message>' --enter --wait-submit 10 --json
```

The sender first identifies the recipient by workspace, platform, terminal incarnation, and a bounded screen/transcript read. Never select whichever terminal happens to have focus. Send only to an open agent composer that is ready for ordinary task input; do not send through a permission dialog or a shell prompt. A busy TUI is not a provider-independent queue, so defer ordinary handoffs until ready instead of interrupting it.

Use a small envelope: message ID, `From Codex`/`From Claude`, one request, relevant artifact paths, and the exact return address. This identifies agent-origin content; it does not impersonate Jay. Full short messages can travel in the prompt; longer reports remain ordinary artifacts referenced by path. The receiver returns `received <id>` once, then `completed <id>` with the report or `blocked <id>` with evidence. Do not acknowledge acknowledgments.

`accepted: true` and `input_accepted` prove input acceptance only. A `turn_started` stage proves the runtime observed a turn start, not that the request was understood, completed, or approved. A ten-second observation timeout does not resend. After an ambiguous transport error, reuse the reported request ID with the **identical** command and `--retry-request <id>`; if no safe replay ID exists, inspect before acting. Application message IDs let the receiver avoid repeating work even after transport uncertainty. Re-list handles after an Orca restart; never dual-send to old and replacement handles.

Authentication is the existing Orca runtime token and local IPC access, not a new HTTP listener. Handles identify targets; they are not proof of human authorization. Orca's CLI supports local Unix sockets and Windows named pipes. The installed runtime's receipts must be checked on each execution host; remote reachability loss means unverifiable, not exited. No ability to wake a standalone ChatGPT/Claude desktop conversation outside Orca is established here.

## 2. Orca durable mailbox: reuse when the workflow needs it

Existing verbs provide `send`, `check`, and `reply`. Use canonical Run/Dispatch addresses when the sessions already have those roles, or a supported native-chat session address; do not create a task DAG merely to exchange two messages. For today's unbound PTYs, plain `send --to <terminal>` alone is insufficient evidence of idle wakeup. Adding a separate prompt just to tell that terminal to check its mailbox buys persistence but also adds another delivery step; option 1 is smaller for occasional handoffs.

For Run mail, `check` returns an oldest FIFO batch with a delivery ID and replays it until acknowledged. Process the whole batch before `--ack`; a separate reply signals business completion. Direct mailbox reads have different consuming behavior, so begin with non-consuming inspection when diagnosing delivery. Transport retries use the existing mutation receipt/request ID; deduplicate business work by message ID. `send` success proves enqueue, and a queued pointer proves neither a completed read nor completed work.

Structured-session mail has the cleanest behavior: it submits through the same host send path as the chat composer, queues behind an active turn, records source metadata, and retains uncertain deliveries for later session activity. This is verified in source, not end-to-end tested in this research. Keep the existing local authentication and role/host checks; never borrow another session's sender handle or infer identity from focus. The source explicitly says same-user session IDs identify callers rather than isolating mutually hostile processes.

This is the longer-term recommendation **within Orca**, especially if moving the two participants to native chats is otherwise desirable. Add only a small session-pairing view and truthful receipt states if the workflow needs them. Preserve existing remote host ownership and version negotiation rather than exporting local handles across machines.

## 3. Cooperative rendezvous tool: usable only while explicitly waiting

Propose a deliberately small service with exactly two registered destinations, bounded messages, message IDs, and a single outstanding receive per recipient. Each session obtains its own scoped credential and exact destination; a generic `to: "Claude"` is ambiguous. The sender performs a tool call. If the receiver is already blocked in a bounded `receive`, the server completes that call with the message. The model resumes because a pending tool returned, not because MCP independently awakened it.

Persist until an explicit acknowledgment; replay unacknowledged IDs after reconnect, with a fixed timeout and no automatic resubmission of business actions. HTTP/MCP success is storage acceptance, not model consumption. Use an OS-protected local socket or authenticated loopback endpoint, with platform adapters if needed.

This eliminates file polling during a scheduled rendezvous but requires the recipient to remain engaged in a wait. Client timeouts and session shutdown still need handling. A background shell can receive bytes after a turn ends without causing the model to run. Therefore this fails the main on-demand idle-session requirement and duplicates much of Orca's existing mailbox. MCP's host controls model integration; protocol notifications alone are not a universal wake API. [MCP architecture](https://modelcontextprotocol.io/specification/2026-07-28/architecture)

## 4. Claude native channel plus an explicit Codex return: real push, asymmetric

Claude Code documents an actual extension: an opted-in MCP server declares `claude/channel` and emits `notifications/claude/channel`; two-way channels expose a reply tool. It delivers into the open session, including when the user is away. Events only arrive while that session is open. This is a provider-specific push facility, not generic MCP behavior. Channels remain research preview, with authentication/provider and organization restrictions. [Claude channels](https://code.claude.com/docs/en/channels)

The proposed local server would authenticate the sending session, route only to the paired Claude process, retain message IDs until explicit acknowledgment, and have its reply tool submit to the verified Codex terminal through option 1. Notification emission alone would not count as read or completion. No equivalent compatible native channel is verified in this Codex session's tools, so do not describe this as a symmetric MCP bridge.

Custom channels currently require a development opt-in or approved distribution; no channel has been installed or enabled. Omit the `claude/channel/permission` capability entirely: approval relay is not part of agent communication. [Channels reference](https://code.claude.com/docs/en/channels-reference)

Defer: this introduces a new server, plugin configuration, two different delivery mechanisms, and preview dependencies while option 1 already works through the host both sessions use. It becomes interesting if Claude channels are independently adopted for another purpose.

## 5. Own both runtimes: reliable lifecycle, larger product decision

Codex app-server documents `thread/resume` and `turn/start`; starting a turn actually begins generation, whereas injecting history does not. Its documented stdio transport avoids introducing a network service. Claude Agent SDK supports persistent streaming input and sequential messages. These are explicit host interfaces, not an assumption that a tool notification wakes a GUI conversation. [Codex App Server](https://learn.chatgpt.com/docs/app-server), [Claude streaming input](https://code.claude.com/docs/en/agent-sdk/streaming-vs-single-mode)

The proposed orchestrator owns two provider processes, stores their returned IDs, serializes input per session, and resumes only sessions it owns. Each agent's send tool returns to that host, which routes one next input. Provider account authentication stays with the supported provider runtime; local routing credentials are separately scoped. Correlate accepted input, turn start, reply, and completion. On a crash or ambiguous result, reconcile persisted history/receipts before repeating a turn. Do not promise exactly-once business actions merely from a transport ID.

This can handle idle providers and deliberate restarts without a file watcher. It requires process ownership, cancellation, permission UI, transcript storage, budgeting, restart policy, and two provider adapters. Resuming an existing provider ID is not proof that another still-running owner can safely share it. Orca already contains Codex and Claude adapters, so extend its host if this becomes needed rather than silently creating competing owners. Defer for the present two-session handoff problem.

## Approval boundary and current observation

Every route carries agent requests and evidence only. No agent acknowledgment, transport receipt, mailbox `decision_gate`, or provider turn is a human approval. Do not grant agents the factory's human credentials, synthesize approval records, type confirmation into another terminal, or translate an agent's “approved” message into authority. Any required human action remains a concrete review in the existing human-only path. Communication can proceed without adding a new approval ceremony for every ordinary message.

At approximately 20:06:43Z, a read-only screen check identified the waiting comparison coordinator as the Claude terminal titled **orcha claude latest**. Its existing watcher had already delivered D6 at 20:06:21Z and Claude was actively reading the orchestration review handoff. **No duplicate notification was needed or sent.** Runtime handles are deliberately not presented as permanent configuration in this document.

## Local evidence

- [CLI prompt delivery and receipt rules](../orca/skill-guides/orca-cli.md) and [terminal send handler](../orca/src/cli/handlers/terminal-send.ts).
- [Mailbox enqueue, attention, and acknowledgment contract](../orca/skill-guides/orchestration/references/messaging-and-gates.md).
- [PTY mailbox delivery gate](../orca/src/main/runtime/orchestration/mailbox-pointer-delivery.ts) and [terminal-only recipient warning](../orca/src/main/runtime/rpc/methods/orchestration/messaging/recipient-routing.ts).
- [Structured mailbox delivery](../orca/src/main/runtime/orchestration/structured-mailbox-pointer-delivery.ts), [host adapter](../orca/src/main/runtime/orchestration/structured-mailbox-pointer-host.ts), and [shared agent-turn submission](../orca/src/main/runtime/orchestration/send-agent-turn.ts).
- [Direct mailbox consuming semantics](../orca/src/main/runtime/rpc/methods/orchestration/messaging/check-direct.ts), [caller identity rules](../orca/src/main/runtime/rpc/orchestration-session-caller.ts), and [CLI local transport metadata](../orca/src/cli/runtime/metadata.ts).

The next useful validation, only if the user chooses option 1, is one addressed, harmless round trip with unique message IDs and one reply in each direction. Confirm the specific request's receipt and observed reply, then stop. This research did not run that experiment.
