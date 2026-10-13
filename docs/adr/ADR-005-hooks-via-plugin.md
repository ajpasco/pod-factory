# ADR-005: Hooks ship in the Claude Code plugin

Date: 2026-10-12. Status: accepted. Decided by: the approver (asked; recommended option taken). PRD basis: REQ-06 (agent edit to a locked path denied), REQ-07 (no dispatch without a gate-3 record), REQ-13 (no local question prompt during a dispatch), REQ-21 (declared secret paths unreadable), REQ-16 (the Claude Code plugin adds hooks and commands), NFR-01 (hooks are the advisory, fast layer; CI is authoritative), decision 25 (Claude Code only in version one).

## Decision

The hooks are delivered by the pod-factory Claude Code plugin, installed once per machine. They live in the plugin's own directory, outside any project, so an agent working in a repository cannot edit them with its file tools. A project's own Claude settings only enable the plugin and are covered by the enforcement-code lock. The hooks apply to every session; they look for a `.factory/` directory in the working tree and stay silent when there is none.

## What the hooks do

All run as `pod-factory hook <event>`, reading the event on standard input and answering with an allow or deny decision. Exact event and field names are confirmed against the current Claude Code hook documentation during implementation and pinned in the hook tests.

1. **Pre-tool-use on file edits** (edit, write, multi-edit, notebook edit): deny when the target path is locked, in the protected zone, or a declared secret path. Reason text names the lock or record that applies and the amendment path.
2. **Pre-tool-use on shell commands**: deny commands whose text plainly writes to a locked or protected path (redirection, in-place edit, move, delete, checkout of that path). This is a heuristic and is advisory by design; CI is the authority.
3. **Pre-tool-use on dispatch**: deny `orca orchestration worker-start` and `dispatch`, and the inline backend's start verb, when no CI-validated gate-3 record matches the current plan hash.
4. **Pre-tool-use on the question tool**: deny the local question tool while the session is a dispatched worker, with a reason pointing at the orchestrator's ask command.
5. **Pre-tool-use on reads**: deny reading declared secret paths (REQ-21).
6. **Session start**: print the project's stage, open gates and active waivers, so an agent session begins oriented.

## Consequence

Every machine that runs agents needs the plugin installed; `doctor` reports a missing plugin as a missing enforcement layer, and phase-two managed setup installs it for founders. Agents other than Claude Code get none of this and are held by pre-commit, CI and rulesets (decision 25).

## Alternatives rejected

- Committed hook configuration per project: travels with a clone, but sits where agents work and depends on the lock and CI alone for its own protection.
- Both with a fallback: more machines covered, two configurations to keep identical.
