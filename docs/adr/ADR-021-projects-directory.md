# ADR-021: Application projects live at `projects/<name>/`

Date: 2026-10-20. Status: **accepted for layout only**. It adds no requirement, changes no
approval rule, binds no document and grants the factory no new capability. Decided by: the
approver, 2026-10-20.

## Context

The equipment-checkout blueprint and eval plan name their paths from a repository root:
`api/`, `web/`, `harness/`, `e2e/`. They were prepared for a repository holding one application,
and say nothing about where the project sits when the repository is the factory itself. ADR-017
records the matching gap in the shipped code: nothing reads a project name, and there is one lock,
one build plan and one story numbering for the whole repository.

The only prior example is the meeting-reminder application, which sits at
`docs/projects/meeting-reminder/`. That location was not a decision about layout. It followed
from the trial being written as documentation first, and it puts application source, a
`package.json` and a Playwright suite underneath `docs/`.

## Decision

**An application project lives at `projects/<name>/`**, with its own `api/`, `web/`, `harness/`
and `e2e/` beneath it. Equipment-checkout is `projects/equipment-checkout/`.

**The meeting-reminder application stays where it is.** Moving it would change
`docs/projects/meeting-reminder/web/test/**` and the six sibling entries in `LOCKED_PATTERNS`,
and those paths are bound by lock `0b0bc6b73309` and by the gate-2 approval and story approvals
that rest on it. The inconsistency between the two projects is therefore deliberate and recorded
here, not drift. It is resolved by moving meeting-reminder in a future change that revokes the
lock and re-approves gate 2, or not at all.

**The paths in the equipment preparation gain the prefix.** Every `api/…`, `harness/…`, `web/…`
and `e2e/…` path in `eval-plan.md` section 4 (the commands), section 7.4 (the frozen files) and
section 8.1 (the story scopes), and in `TECH-SPEC.md` section 9.1, becomes
`projects/equipment-checkout/…`. This is a mechanical prefix: it changes no command's meaning, no
file's ownership and no story's boundary. It must be applied to those artifacts before the freeze,
because the freeze binds the commands and the test paths by hash and they have to name files that
exist.

## What this does not do

- It does not give the factory a second project. One lock, one build plan and one story numbering
  still cover the whole repository, exactly as ADR-017 records. `projects/` is a filesystem
  convention and nothing in `packages/cli` reads it.
- It does not move meeting-reminder, and does not make the two projects consistent.
- It does not lock anything. Equipment's paths reach `LOCKED_PATTERNS` only through the approver's
  gate-2 ceremony.

## Consequences

- `projects/` is free at main's root, and the npm workspace list is `packages/cli` only, so a
  project's own `package.json` is not swept into the factory's build. Verified at `cb00c9d`.
- Equipment's eventual lock entries are `projects/equipment-checkout/api/tests/**`,
  `projects/equipment-checkout/harness/**` and the sibling frozen paths of eval-plan 7.4.
- A reader comparing the two applications will find them in different places. This ADR is the
  answer to why.
