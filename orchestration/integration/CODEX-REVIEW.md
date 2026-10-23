# D7 integration review

Decision: retain the patch for revision; do not apply it to the shared service yet. Claude owns the separate UI refinement. No live approvals, locks, records, protection settings or application state changed during this review.

The work respected its write boundary and correctly left real submission unimplemented. The draft export and read-only endpoint are useful. This is a partial connection, not a completed dispatch chain.

## Independent checks

Applied `factory-connection.patch` to a disposable source export. Patch check and TypeScript build passed. All seven tests in `factory.test.ts` passed. The two HTTP tests and browser suites were not independently repeated during this review; Claude's results remain supplied evidence.

Two additional pure-function probes against the compiled patch returned incorrect readiness. They wrote no approval records and launched no builder:

| Probe | Expected | Actual |
| --- | --- | --- |
| Append `unapproved/**` to a sample exported story's scope while retaining its original manifest digest and matching request | blocked | ready |
| Supply a route with `outcome: blocked` and an empty prerequisite list | blocked | ready |

The first was checked by recomputing SHA-256 over the altered package without `manifestDigest`: it differs from the retained digest. `evaluateDispatch` compares two claimed digests without recomputing the package. The second falls through because only failed/uncertain route outcomes are explicitly preserved. Neither is a live dispatch exploit: the real adapter ultimately refuses submission unconditionally.

## One required correction: do not claim authority this adapter has not verified

The real inspector reports separate observations, not authorization of the exported application package:

- Its `inspect(story)` API receives no package. It cannot compare the reviewed application's contract, scope or harness to the factory approval. On `origin/main`, story-2 is explicitly **Meetings snapshot list and modal**, with scope limited to `docs/projects/meeting-reminder/web/src/main.ts`. That story's approval supplies no equipment-checkout authority.
- `records()` checks only schema version and three string fields. The shipped factory store additionally validates records, history and writer rules. The adapter also omits effective lock amendments and actual harness hash comparisons. Pattern/file existence is not proof of a protected, unchanged executable harness.
- `harness-authored` accepts a file under a test directory; `test-command-locked` checks a substring. These can be diagnostic observations but cannot substantiate the readiness guarantee currently stated.
- Normal service startup supplies no `factoryRoute`. Consequently the added CLI command reports an unconfigured adapter unless an embedding caller injects one. This is not yet a connected production entry point.

Keep the correction bounded: retain read-only diagnostics and the export, label the record observations as locally cached and unverified for this package, and keep dispatch readiness blocked until the factory's own validation and exact package binding are connected. Do not duplicate the authority engine to make an eight-item checklist green. Fix the two demonstrated pure-function refusals with regression cases if that evaluator remains. There is no need for another GitHub lab to establish these findings.

## Scope decision for the next application

Prefer the existing one-application harness pattern/runner approach for equipment-checkout over general project onboarding. This is a development direction, not a human approval or permission to revoke a lock.

Before an enforcement patch or user ceremony, establish the legal merge authority for its exact changes and the new plan. A locked-path amendment alone does not establish merge authority. Do not repeat the earlier assumption that preparation documents can land through an ordinary PR under an active lock. If the shipped route cannot admit those changes, report that prerequisite once; do not open a bootstrap window.

The equipment harness is not yet authored: the 49 QA cases are a plan. Authoring and reviewing the executable harness, legal onboarding, direct-user approval and real dispatch remain separate unmet portions of the chain. An existing meeting story must not be substituted for equipment authorization.

No terminal action is requested from Jay now. UI refinement may continue independently. Do not broaden it into this backend work.
