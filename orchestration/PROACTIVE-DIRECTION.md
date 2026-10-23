# Proposed proactive direction

The preparation site should carry clear user intent through authorized next steps, save progress durably, and ask only for decisions that materially change scope or the result. Each action should remain visible in the saved preparation so the browser and CLI can explain what happened and resume consistently.

The CLI and Orca host can hand the user the same preparation page for visual review or input, then continue from saved status after the user's action. The implemented CLI `open` command requests the OS default browser; launching it is not evidence of viewing or approval. Users should not need terminal commands to participate. A native Orca embedded tab remains an optional host-specific integration and is not implemented here.

This is a proposed direction, not implemented behavior. The current workflow remains idea → scope answer → requested PRD/mockup draft → requested revision → draft-only packet. It provides no approvals or builder dispatch.

The first increment should connect a saved answer to drafting when the user has requested that continuation. Save the answer, confirm its resulting revision, then request the draft with a stable operation ID and reconcile its saved result. A timeout or lost response must lead to status reconciliation, not an automatic second model call.

Later increments can make interviewing and continuation more adaptive after the first increment is demonstrated. Pause at review, failed or interrupted tasks, unresolved work, and material decisions requiring the user's answer. Keep suggestions distinct from accepted scope and never fabricate answers or approvals. This direction calls for small changes to the existing preparation service and interface; it does not introduce an event bus, another orchestration engine, or factory execution.
