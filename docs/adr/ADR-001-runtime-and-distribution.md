# ADR-001: Runtime and distribution for version one

Date: 2026-10-12. Status: accepted. Decided by: the approver (asked; recommended option taken). PRD basis: decision 21 (TypeScript on Node; pod-factory requires or bundles a supported runtime; packaging left to the tech spec), REQ-16, REQ-24.

## Decision

Version one ships as an npm package that requires a current Node LTS already installed. Installation is one npm command. Hooks, the check runner and the release executor invoke the same installed CLI. Self-contained binaries with Node bundled arrive with phase-two managed setup (REQ-24), which installs the runtime for founders.

## Consequence stated to the approver

Founders cannot install pod-factory alone before phase two. Engineers, the milestone-zero audience, can.

## Alternatives rejected

- Self-contained binaries from day one: best founder story immediately, but three-platform release engineering, code signing and larger downloads land in phase one and slow milestone zero.
- Both channels from day one: widest reach, double the packaging work before anything is proven.

## Notes

- Name availability checked 2026-10-12: the GitHub organization `pod-factory`, the npm package `pod-factory` and the scope `@pod-factory` were unregistered; no exact match on PyPI. Nothing is reserved yet.
- The supported Node version range and the Windows shim for hooks are decided with the hook design (open design question 5).
