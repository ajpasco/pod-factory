# ADR-009: Milestone zero and the bootstrap scaffold

> Amended 2026-10-12 by ADR-011: the scaffold's start verb creates a worktree and a dispatch file per builder in every mode; 'five layers' are renamed scaffold components.

Date: 2026-10-12. Status: accepted. Decided by: the approver (asked; recommended option taken). PRD basis: section 3 (milestone zero as phase one's exit), decision 23 (bootstrap exception), decision 24 (sequential first), REQ-19 (`status`).

## The bootstrap scaffold, written by hand first

Approved as records marked bootstrap, expiring when pod-factory 0.1 ships (decision 23):

1. `pod-factory approve` and `reject`: write a gate record (ADR-004) and push it to `pod-factory/records`.
2. `pod-factory lock`: write the lock record for the approved test paths, eval plan, runner configuration, test command and lockfiles.
3. The record store: records branch creation, record writing, hashing, reading.
4. The lock hook and the protected-zone hook (ADR-005, hooks 1 and 2).
5. CI (ADR-006): records-validate, story-verify in its minimal form (file scope, locked command run exactly as locked, evidence bundle bound to the branch head tree), and gate-check (validated gate-4 record bound to the head tree).
6. A minimal `doctor` that reports the five layers above as present or missing.

Everything else in the first phase is built through the loop.

## Story one: `pod-factory status`

REQ-19: prints every story, its stage, its owner and what it is waiting on, from the records branch and the story files. Full stack for one requirement, useful on day one, and its own gate-4 approval uses the real approve command.

## Exit test

Milestone zero passes when story one has gone through requirements, locked tests, implementation, evidence, a human-approved merge, and recovery after killing the session at any point, and when these three refusals have been exercised and observed:

1. **Changed locked test:** an agent edit to a locked test is denied by the hook, and a commit that changes it is rejected by CI.
2. **Stale approval:** a content change after the gate-4 record is refused at merge until re-review.
3. **Unsupported evidence:** a packet whose "tests passed" has no harness output bound to the tree is rejected.

## Consequence

The scaffold is deliberately smaller than the final commands; each later story replaces a hand-written piece with one built through the loop, and `doctor` reports which pieces are still bootstrap.
