# ADR-002: Repository layout

Date: 2026-10-12. Status: accepted. Decided by: the approver (asked; recommended option taken). PRD basis: REQ-16 (skills install with one command; Claude Code plugin adds hooks and commands; Orca marketplace entry; whole workflow runs with Claude Code alone), decision 21 (TypeScript on Node), decision 26 (name pod-factory).

## Decision

One repository, `pod-factory`, organized as a workspace:

- `packages/cli`: the `pod-factory` command, the approval path command family, `status`, `explain`, `doctor`, record reading and writing.
- `packages/hooks`: the Claude Code hook entry points (deny locked-path edits, deny the question tool during a dispatch, deny dispatch without a gate-3 record, deny writes to the protected zone and declared secret paths).
- `packages/check-runner`: restraint checks, record validation, status transitions, delegated-decision records, CI entry point.
- `packages/release-executor`: bound-input validation, credential injection from keychain or secret manager, step logging with redaction, retry and rollback.
- `skills/<name>/SKILL.md`: the stage skills, installable with `npx skills add`.
- `templates/`: CI workflows, the default-deny delegation policy, CLAUDE.md presets, the release runbook skeleton.
- `claude-plugin/`: the Claude Code plugin manifest, hooks configuration and commands.
- `orca-plugin/`: the Orca plugin (manifest, worker, status commands).
- `docs/`: PRD, reference, spec, ADRs, reviews.

The Orca plugin is published from a dedicated branch of the same repository: a release step splits `orca-plugin/` onto that branch so `orca-plugin.json` sits at its root, and the Orca marketplace entry points at that branch with a pinned ref.

## Why

Orca's marketplace installer clones the git source and requires `orca-plugin.json` at the clone's root; the marketplace entry has no subdirectory field (Orca 1.4.214, `src/main/plugins/plugin-install.ts`, `src/shared/plugins/plugin-marketplace.ts`). Everything else installs from a subdirectory. One repository gives one version number, one release pipeline and one place to file issues, which matters for a solo maintainer.

## Alternatives rejected

- A separate repository for the Orca plugin: no branch-splitting step, but two version numbers to keep aligned and two issue trackers.
- Several repositories by component: matches Orca's one-plugin-per-repository habit, at the cost of four release pipelines and version skew.

## Consequence

The release process owns one extra step, the branch split, and `doctor` for pod-factory's own repository checks that the published branch matches the folder at the released commit.
