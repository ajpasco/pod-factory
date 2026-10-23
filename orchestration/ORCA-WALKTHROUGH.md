# How product preparation would work with Orca

You stay in your Orca conversation with Claude or Codex. The agent carries the drafting work forward and opens a shared browser review when you need to see the product, choose a direction, or request a change. You should make product decisions, without moving files between agents or confirming every routine step.

Open the [clickable walkthrough](examples/orca-prebuild-walkthrough.html) in a browser. It uses a tiny reading-list app to show the conversation beside the review workspace. It is an illustrative, self-contained mockup: its buttons change sample state in memory. It is not an Orca plugin, a connection to the live preparation, or an approval mechanism.

## One example, from idea to handoff

1. **Describe the outcome in Orca.** “I want a little reading list to help me choose my next book.” The agent asks one material scope question: who uses it and what must they accomplish first? You answer: one reader, browse a short list and inspect a book. Accounts, syncing and recommendations remain outside this example.
2. **Review the PRD and working mockup.** The agent drafts both from the saved answer. The browser lets you inspect the requirements and click from a book list to a detail view. Ask for a change such as “Call the heading ‘My next book’”; the actual preparation supports a requested revision of the artifacts. A suggestion is not silently accepted scope.
3. **Review the technical choices.** The local planning slice drafts the stack, folders, responsibility boundaries, configuration and test approach. For this sample: TypeScript, a browser UI, small local sample data, no accounts, database, secrets or Docker. You can request another approach. Selecting this draft locally records a preference for further planning; it does not approve a factory gate.
4. **Inspect eval coverage before a builder starts.** The draft plan should map requirements to correctness cases, restraint cases and applicable production checks. “A detail opens for the selected book” checks correctness; “opening a book makes no network request” checks restraint; keyboard and narrow-screen checks cover relevant product quality. Proposed cases are not executed tests or passing evidence.
5. **Review the stories and gaps.** Stories name their authority, acceptance cases, file ownership and dependencies. Shared data and interface decisions come first. Separate list and detail work can run in parallel only after those contracts are stable and ownership does not overlap. Integration follows both. A separate planning review looks for missing coverage and contradictions; an unresolved blocker remains visible.
6. **Receive a draft prebuild handoff.** The packet contains the exact draft revisions, choices, eval procedures, ordered stories and review findings. It stops before builder dispatch. Real gate reviews, trusted human approvals, acceptance execution, harness protection and factory readiness still need their implemented paths and evidence.

## What exists and what is still being built

| Status | Capability |
| --- | --- |
| Implemented before this change | One saved preparation; idea → scope question/answer → generated PRD and clickable mockup → requested revision; draft review packet; CLI and browser use the same running service. |
| Implemented locally in this change; verified with workflow and browser tests | Technical blueprint drafting, a local review selection, eval/story-plan drafting, a separate planning-gap review and draft handoff. None of these creates factory authority. |
| Orca connection slice | Open this same page in Orca’s existing workspace browser; choose Claude or Codex preferences and explicitly connect an owning session. See the integration document for supported session types and evidence limits. |
| Future integration | Adaptive continuation after material decisions; an isolated direct-user approval path; actual eval execution and protected harness; gate/lock records and authorized factory dispatch. |

The visual arrangement in the walkthrough is a proposed experience. The live page can open in Orca’s existing workspace browser tab; no custom IDE pane is needed. The [Orca integration](ORCA-INTEGRATION.md) describes the actual connection separately from this mockup. The local planning review does not substitute for the four required gate-1 review roles.

## Try the real local preparation

From `orchestration/`, start the service:

```sh
npm ci
npm run build
npm start
```

Then an Orca-hosted Claude or Codex session can run:

```sh
npm run --silent cli -- orca-open
npm run --silent cli -- status
```

`orca-open` requests an Orca workspace browser tab at `http://127.0.0.1:4317`; `open` still uses the default browser. The browser and CLI share one service and saved preparation. From another directory, use `node /absolute/path/to/orchestration/dist/src/cli.js orca-open`. See the [README](README.md) for drafting commands and the [integration guide](ORCA-INTEGRATION.md) for session pairing. Use the current ID/revision from `status` for mutations; browser launch is not evidence of review or approval.

The repository includes a [portable preparation skill](skills/pod-preparation/SKILL.md). Ask your Orca session to read that file by its absolute path if you want to use the host instructions. It is not globally installed and grants no approval powers. Both hosts currently draft through the Claude provider and its existing login.

## What you decide, and what the agent handles

You decide the first useful outcome, material scope changes, the experience, stack tradeoffs and requests for revision. Future real approvals must be direct user actions bound to the exact reviewed content. A browser click in this mockup, a local selection, Orca plugin consent or an agent's report cannot supply that authority.

The service handles draft task IDs, saved answers, revisions, artifacts and task status. The agent handles authorized drafting and prepares review material; it should reuse your answers instead of asking the same question again. The planned continuation pauses on a material choice, concrete blocker, failed task or uncertain outcome. Lost responses are reconciled against saved status, without silently repeating model calls.

## What must be true before a real builder handoff

- Required reviews and a trusted approval channel bind the current PRD, design, technical contract and plan.
- Acceptance procedures are implemented and actually run, with missing product behavior distinguished from broken infrastructure.
- Approved tests, fixtures and runner are protected through the real factory mechanism.
- Stories reference the current authorized contract; dependencies and overlapping scopes are checked.
- The existing factory readiness adapter observes valid gate/lock records before any authorized dispatch.

Until those paths exist and are exercised, the result is **a draft preparation packet**, not a production-ready application or permission to build. The [pre-build plan](../docs/spec-drafts/pre-build-orchestration-plan.md) and [blueprint proposal](../docs/spec-drafts/tech-spec-builder-blueprint.md) describe the intended completion evidence. [Proactive direction](PROACTIVE-DIRECTION.md) describes the proposed continuation, and [session communication options](SESSION-COMMUNICATION-OPTIONS.md) explains the separate Orca transport question.
