# Bounded D7 backend correction

Ready for parent integration review. Apply **only** `factory-connection-corrected.patch` from `orchestration/`; it replaces the archival factory patch, rather than layering onto it. `git apply --check integration/sol-review/factory-connection-corrected.patch` passed against the current shared tree. The original `integration/factory-connection.patch` is unchanged.

The disposable export is `/private/tmp/d7-sol-review-do6xb2jm/candidate`. Baseline hashes and changed-file hashes are in `CHANGE-MANIFEST.json` (exact-byte SHA-256). All 44 baseline paths still matched the shared tree at packaging. All 41 untouched baseline files match the candidate, including every UI/font asset, existing test, package file, design document and non-entrypoint source. The current binary font server route is retained and tested. Shared writes are confined to `integration/sol-review/`.

## Corrected behavior

- A new evaluator request recomputes the manifest digest from package content before comparing claims. Appending `unapproved/**` while retaining both matching digest claims is blocked and executes nothing.
- Every non-ready route outcome is preserved, including blocked/waiting routes with empty or fully satisfied prerequisite arrays. Existing replay decisions retain their earlier result and cannot execute again; unresolved attempts still prevent a second execution.
- Real diagnostics expose eight **locally cached observations**, with no approval commands or active-authority claims. Their source, timestamp, commit IDs, `authority: non-authoritative` and `packageBinding: unverified` are explicit. Factory record/history/writer validation, effective amendments, harness/runner hashes and exact application scope/contract binding remain unconnected.
- Real readiness remains blocked by `exact-package-authority` and `dispatch-supported`, even when every diagnostic observation matches. This includes an unrelated Meetings story with a matching cached hash. No new approval/dispatch endpoint or real submission path exists; `dispatchReady` remains unchanged.
- Normal startup accepts explicit `ORCH_FACTORY_REPO` and `ORCH_FACTORY_HARNESS_ROOT`. Optional settings are `ORCH_FACTORY_REMOTE` (documented default `origin`) and `ORCH_FACTORY_CLI_PACKAGE`. Default status is unconfigured. Partial/unsafe settings are invalid and select no route; missing cached refs report uncertain. No repo, harness or story is selected automatically. The CLI and README describe the same boundary.

## Evidence

`npm test`: **66/66 pass**, zero failures (50 existing tests plus 16 factory tests). See `evidence/unit-all.txt`. This includes the two false-ready regressions, exact export integrity/completeness, replay/uncertain behavior, all-indicators-match-but-no-authority fixture, absent/partial/unsafe configuration, HTTP/CLI status, actual normal server entrypoint with environment configuration, binary font delivery and absence of authority endpoints.

`npm run test:browser`: **3/3 existing journeys pass**, fixture-provider evidence only. See `evidence/browser.txt`.

Local read-only inspections: `story-2` and `story-4` both **blocked**, non-authoritative and unverified for the exported package. See `evidence/real-story-2.json` and `evidence/real-story-4.json`. Both read records `3d9c61cbbc476ec559e6b5bbe7c49c286249c36b` and trunk `a82a857346ce07b55faaa80fce4626c5406bd9d9`; these are cached refs, not freshness or approval claims. CLI version is honestly null because no installed package path was supplied.

The sandbox initially refused loopback listeners; the full suite and browser journeys then passed with approved local test-server access. All test data lived in disposable directories. No live process was restarted, no saved preparation was opened for mutation, no remote was fetched, no record/lock/settings changed, and no builder or equipment application ran. Factory onboarding, authored executable equipment harness, direct-user approval and genuine supported dispatch remain unmet and outside this correction.
