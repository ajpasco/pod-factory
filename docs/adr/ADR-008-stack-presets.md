# ADR-008: Stack presets in version one

Date: 2026-10-12. Status: accepted. Decided by: the approver (asked; recommended option taken). PRD basis: REQ-01 (the start skill drafts project rules from a stack preset), open question 1, decision 3 (the first project is pod-factory itself), decision 21.

## Decision

Version one ships two presets and a custom path.

1. **web-default**: FastAPI backend, React with TypeScript front end (Vite), Postgres, Docker Compose for local, the layered structure from the approver's new-app skill: route, service, repository; no generic base repositories, no event buses, no speculative abstractions. Quality tooling: ruff and pytest for Python; strict TypeScript, ESLint, Prettier and Vitest for the front end; a pre-commit hook running them.
2. **node-tool**: TypeScript on Node for CLIs, libraries and services, strict TypeScript, ESLint, Prettier, Vitest, a single workspace layout. pod-factory itself uses this preset, so the first project exercises it.
3. **custom**: the start skill recommends a stack with a one-line reason, asks before using it, and generates the project rules on the fly. The custom path is reviewed at gate 2, not pre-tested.

Each preset provides: the project rules (CLAUDE.md) template, the folder structure, the test command the lock will pin, the security basics (input validation, parameterized queries, explicit CORS allowlist, password hashing where users exist, pinned dependencies, secrets from the environment only), the Docker files, and the CI template wiring from ADR-006.

## Why

The two presets are the two stacks the first two projects need: pod-factory itself (node-tool) and the approver's default for applications (web-default). Each preset gets locked tests of its own, so a project started from a preset begins with known-good rules.

## Alternatives rejected

- Web default only: pod-factory would run through the custom path, so the first project would not exercise a preset.
- Several presets from the start: each needs rules, templates and locked tests before milestone zero.
