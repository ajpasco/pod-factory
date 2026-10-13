# ADR-006: CI design, the authoritative layer

> Amended 2026-10-12 by ADR-011: two jobs added (artifact-check, classify); gate-check also requires the delegated-merge acknowledgment, compares every locked path explicitly and checks the dispatch record; doctor is a required check; release-gate has build and verify triggers; records-validate re-evaluates preconditions; pull-request classes defined.

Date: 2026-10-12. Status: accepted. Decided by: the approver (asked; recommended option taken). PRD basis: NFR-01 (CI and host rulesets are authoritative; hooks and pre-commit advisory), NFR-02 (hook and lock suite on three operating systems), decision 28 (records branch validated by CI), REQ-06, REQ-09, REQ-10, REQ-11, REQ-18, REQ-19 (`doctor`), REQ-24 (managed setup).

## Decision

The check runner is a plain command, `pod-factory ci <job>`, with no provider-specific code. Version one ships one GitHub Actions template for projects and uses GitHub Actions for pod-factory itself, on macOS, Windows and Linux. Other providers are bring-your-own until a thin template exists for them.

## Jobs in the project template

1. **records-validate**, on every push to `pod-factory/records`: record-only paths, schema per record type, legal status transition, writer identity per record type, no modified or deleted records, linear history. A failing push is rejected by the branch rule that requires this check; a passing run marks the pushed records validated.
2. **story-verify**, on every pull request to main: fail if the diff touches `.factory/` or files outside the story's declared file scope; run the locked test command exactly as locked; run restraint checks (traceability, inverted coverage, size and complexity tripwires, unused code, duplication); run secret and dependency scans; write check-result records; publish the evidence bundle bound to the branch head tree.
3. **gate-check**, required for merge: a CI-validated gate-4 record bound to the pull request head tree, with no newer content change; the locked suite green on the merge result when main has moved; active waivers listed in the check summary.
4. **release-gate**, on a release request: a CI-validated gate-5 record whose hashes match the built artifact digest, environment, configuration and migration set, runbook and rollback plan; the artifact is built in this job before gate 5 and its digest published for the checklist.
5. **doctor**, scheduled and on demand: branch protection on main and on the records branch, CODEOWNERS over the protected paths, required checks configured, plugin version pinned per project, active waivers.

## pod-factory's own CI

The same template plus the hook and lock test suite on all three operating systems, the plugin and skills install smoke tests, and the Orca plugin branch split verified against the folder at the released commit (ADR-002).

## Pre-commit hook

Installed by `doctor` or managed setup, runs `pod-factory ci precommit`: the fast subset of story-verify (locked and protected paths untouched, file scope respected, secrets scan on staged files). It can be bypassed and is never relied on alone.

## Why

A provider-agnostic runner keeps the authority in testable code rather than YAML. GitHub is where founders already are, GitHub Actions is free for public repositories, and managed setup (REQ-24) targets GitHub first.

## Alternatives rejected

- GitHub Actions and GitLab CI from the start: two templates kept in step before the first project exists.
- No templates: least work for pod-factory, most for every adopter; founders could not do it.
