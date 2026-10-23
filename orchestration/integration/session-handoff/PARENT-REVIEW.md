# Parent review — on-demand session handoff

Reviewed and integrated locally on 2026-10-19. Three new files only: the standalone wrapper, its tests, and `SESSION-HANDOFF.md`. All 43 existing baseline files matched before integration; all three resulting files match the candidate manifest. No existing UI, server, provider, factory or package input changed.

The parent read the implementation and independently built the integrated workspace and ran all 32 handoff tests: 32 passed, zero failed/skipped. Output: `parent-targeted-tests.txt`. Sol's full isolated orchestration run passed 98 tests; the parent did not repeat that unchanged full suite.

Accepted behavior: explicit full recipient identity, supported local Orca version check, guarded text then guarded Enter, identity/readiness rechecked before each write, durable local duplicate suppression, no resend on ambiguous or partial delivery. The envelope identifies agent origin and confers no human approval. There is no watcher, provider launch, session replacement or permission bypass.

Limits are part of the contract: the two writes are not atomic; the host does not compare a caller-supplied expected provider identity; an existing draft is not cleared or owned by this helper. `submitted` proves matching Orca write settlements, not that a turn started, a message was read, or work completed. The runtime is deliberately restricted to the inspected local Orca 1.4.224.

**Live addressed round trip: NOT RUN.** Select the actual sender/recipient pair and a harmless message before that check. No live message was sent during implementation or review. Use [the usage document](../../SESSION-HANDOFF.md); keep receipts across attempts. No service restart is required for this standalone command.
