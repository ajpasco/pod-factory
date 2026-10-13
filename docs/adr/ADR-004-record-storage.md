# ADR-004: Record storage defaults

Date: 2026-10-12. Status: accepted. Decided by: the approver (asked; recommended defaults taken). PRD basis: decision 28 (records branch validated by CI), REQ-19, REQ-20, the record and evidence definitions in the reference.

## Decision

- **Branch:** `pod-factory/records`, linear history, never force-pushed, every new commit validated by CI after it lands (ADR-010 item 11).
- **Format:** one human-readable JSON file per record, UTF-8, LF line endings, two-space indentation, keys in a fixed order so diffs are stable.
- **Naming:** `<timestamp>-<type>-<subject>.json`, timestamp in UTC compact ISO form, so concurrent writers never collide and `ls` reads as a timeline. Example: `20261012T211702Z-approval-gate-1.json`.
- **Hash:** SHA-256 over LF-normalized UTF-8 content, written as lowercase hex, named in every record as `hashAlgorithm` so a future change is per record, not global (REQ-20).
- **Common fields:** `schemaVersion`, `recordType`, `factoryVersion`, `hashAlgorithm`, `createdAt`, `actor` (name, email, kind: human or check-runner), `binds` (paths to hashes), `outcome`, and type-specific fields.
- **Writers:** human records through the approval path; check results, status transitions, delegated decisions and delegated gate-4 records through the check runner. CI flags, and never validates, a record that violates the writer rule for its type, changes an existing record, or touches anything outside the record paths (ADR-010 item 11).

## Why

One file per record is git-mergeable and auditable with ordinary tools. JSON validates strictly in CI with a schema. The naming avoids a sequence counter that concurrent writers would fight over. The algorithm matches the bootstrap gate-one record already written.

## Alternatives rejected

- Markdown with front matter: easier to read in a viewer, weaker validation and parsing.
- One append-only ledger file per type: compact, but every concurrent write touches the same file.

## Note

The bootstrap records 0001 to 0003 predate this naming; they are migrated to the records branch under the new names when the branch is created, with their content hashes recorded in the migration record (REQ-20; ADR-012 item 26).
