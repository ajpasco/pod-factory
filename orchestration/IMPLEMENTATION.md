# Preparation workflow: first implementation

Update, 2026-10-18: the subsequent user-authorized slice now adds technical blueprint generation, a digest-bound local selection, eval/story planning, a separate model review and an exact-content draft handoff. See [PREBUILD-STATUS.md](PREBUILD-STATUS.md) for the current requirement map and remaining build blockers. The original first-slice scope below is retained as history. No trusted factory authority or builder dispatch has been added.

Authorized by Jay on 2026-10-18: start implementing the pre-build orchestration plan. This increment implements the plan's first useful milestone, A1–A3 and the smallest B1–B2 journey. It is separate from the frozen builder comparison and does not modify live factory authority.

## Delivery boundary

One local user can enter an idea, answer a material question, generate a PRD and separate clickable sample-data mockup, request a coordinated change, and return to the saved review packet after restart. Output is a draft for human review. Gate reviews, approvals, locking, planning authority and builder dispatch remain later slices.

The interface is a loopback browser app. Local source inspection found Orca's experimental panel API cannot call this workflow service: its exposed operations are workspace context, terminal text and notifications, and its panel CSP forbids connections. Extending Orca is outside this increment. Existing plugin consent is not proof of a trusted human approval boundary.

## Implementation decisions

- TypeScript workflow and Node HTTP adapter; plain HTML/CSS/browser JavaScript presentation. No runtime packages or new UI framework.
- A versioned preparation file and immutable artifact revisions under an ignored data directory. Preparation never grants factory authority.
- One injected drafting provider. The live provider calls the installed Claude CLI in text-only mode with tools and MCP disabled, a fixed prompt, output validation, deadline and spend cap. Existing CLI login is used; no credentials enter preparation state. Test providers are explicitly fixtures.
- Fixed HTTP routes, loopback binding, origin/host checks and an ephemeral same-origin request token for mutations. This protects the local preparation surface from incidental cross-origin requests; it is not a human approval credential.
- Generated mockups render only in a sandboxed frame; generated prose is displayed as text. Models cannot select filesystem output paths.
- No Docker or .env requirement: this local slice has no service dependency or new application secret. Optional process configuration belongs in documented environment variables.

## Ownership and order

1. Workflow owner: types, durable store, state transitions, drafting contracts and focused workflow tests.
2. Interface owner: the three public presentation files, against the agreed HTTP shape.
3. Coordinator: package/build configuration, local HTTP adapter, bounded CLI provider, integration tests and delivery documentation.
4. Independent reviewer: one completed-slice review against this boundary; concrete defects only. At most two focused repair passes before reporting an unresolved blocker.

## Acceptance

Correctness: a real model produces both artifacts from saved inputs; feedback is reflected in a new pair; question/answer and artifact revisions survive restart; actual failures are visible; interrupted work is unresolved rather than silently rerun; stale results cannot replace newer work; the review packet identifies exact content.

Restraint: no approval or dispatch endpoint, no records/lock/settings writes, no comparison changes, no application building, no generated suggestion promoted to confirmed scope, no builder tools granted to the drafting model. A successful draft is not a completed gate-1 review. Missing role reviews remain named.

Host evidence: `orca/src/shared/plugins/plugin-host-api.ts`, `plugin-panel-shell.ts`, `orca/src/main/plugins/plugin-enablement.ts`, `orca/src/main/ipc/plugins.ts`, and `orca/src/main/runtime/rpc/methods/plugins.ts`. Host support is read from source, not an integration/security demonstration.
